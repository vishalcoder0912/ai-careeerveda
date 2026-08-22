// Bootstraps the first super-admin — and, with --reset, recovers a locked-out
// one.
//
//   npm run seed:admin
//   npm run seed:admin -- --reset
//
// Credentials come from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD, or are typed in
// when the terminal is interactive. There is deliberately NO fallback default:
// a shipped default password is a backdoor that survives every later hardening
// effort, because nobody remembers it exists until it is found.
//
// --reset exists because there is no self-service password reset and no
// user-management API: without it, a sole super-admin who forgets their
// password has no way back in short of editing the database by hand. It
// requires shell access to a machine with MONGODB_URI, which is a strictly
// higher bar than any HTTP endpoint would be.

import readline from "node:readline/promises";
import {argv, stdin, stdout} from "node:process";

import {connectDatabase, disconnectDatabase} from "../src/config/database.js";
import {Admin} from "../src/models/Admin.js";
import {ROLES} from "../src/config/permissions.js";
import {hashPassword, validatePasswordStrength, pushPasswordHistory} from "../src/services/password.service.js";
import {revokeAllForAdmin} from "../src/services/token.service.js";

const ask = async (question, {mask = false} = {}) => {
  const rl = readline.createInterface({input: stdin, output: stdout, terminal: true});

  if (!mask) {
    const answer = await rl.question(question);
    rl.close();
    return answer.trim();
  }

  // Suppress echo so the password does not sit in the terminal scrollback, or
  // in a screen recording, or over someone's shoulder.
  const onData = (char) => {
    if (["\n", "\r", ""].includes(char.toString())) return;
    stdout.write("[2K[200D" + question + "*".repeat(rl.line.length));
  };
  stdin.on("data", onData);

  const answer = await rl.question(question);
  stdin.off("data", onData);
  rl.close();
  stdout.write("\n");
  return answer.trim();
};

const fail = (message) => {
  console.error(`\n  ${message}\n`);
  process.exitCode = 1;
};

const run = async () => {
  await connectDatabase();

  let email = (process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
  let password = process.env.SEED_ADMIN_PASSWORD || "";
  let name = (process.env.SEED_ADMIN_NAME || "").trim();

  const interactive = stdin.isTTY && stdout.isTTY;

  if (!email) {
    if (!interactive) return fail("SEED_ADMIN_EMAIL is required when not running interactively.");
    email = (await ask("  Super-admin email: ")).toLowerCase();
  }

  if (!name) {
    name = interactive ? await ask("  Display name: ") : email.split("@")[0];
  }

  if (!password) {
    if (!interactive) {
      return fail("SEED_ADMIN_PASSWORD is required when not running interactively.");
    }
    password = await ask("  Password: ", {mask: true});
    const confirm = await ask("  Confirm password: ", {mask: true});
    if (password !== confirm) return fail("Passwords did not match.");
  }

  const weakness = validatePasswordStrength(password, {email});
  if (weakness) return fail(weakness);

  const existing = await Admin.findOne({email}).select("+passwordHash +passwordHistory");

  // Re-running must not *silently* reset the password of a live account — that
  // would turn a convenience script into a privilege-escalation tool for anyone
  // who can run it. --reset makes it deliberate rather than accidental.
  if (existing) {
    if (!argv.includes("--reset")) {
      return fail(
        `An account already exists for ${email}. ` +
          `Re-run with --reset to set a new password for it.`,
      );
    }

    existing.passwordHistory = pushPasswordHistory(existing.passwordHistory, existing.passwordHash);
    existing.passwordHash = await hashPassword(password);
    existing.passwordChangedAt = new Date();
    // Invalidates every access token already issued to this account.
    existing.tokenVersion = (existing.tokenVersion || 0) + 1;
    // This is the recovery path after a lockout, so it clears the lockout too.
    existing.failedLoginAttempts = 0;
    existing.lockedUntil = null;
    existing.status = "active";
    await existing.save();

    // Anyone holding a refresh token for this account loses it — the password
    // was reset precisely because it may be in the wrong hands.
    await revokeAllForAdmin(existing._id, "password-changed");

    console.log(`\n  Reset password for ${existing.email} (${existing._id})\n`);
    return undefined;
  }

  const admin = await Admin.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: ROLES.SUPER_ADMIN,
    status: "active",
  });

  console.log(`\n  Created super-admin ${admin.email} (${admin._id})\n`);
};

run()
  .catch((error) => {
    console.error("\n  Seed failed:", error.message, "\n");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
