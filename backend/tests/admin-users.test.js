import {describe, it, expect} from "vitest";
import request from "supertest";

import {createApp} from "../src/app.js";
import {Admin} from "../src/models/Admin.js";
import {RefreshToken} from "../src/models/RefreshToken.js";
import {AuditLog, AUDIT_ACTIONS} from "../src/models/AuditLog.js";
import {ROLES} from "../src/config/permissions.js";
import {createAdmin, login, TEST_PASSWORD} from "./helpers/auth.js";

const app = createApp();

const NEW_PASSWORD = "A-new-passphrase-42!";

describe("admin account management", () => {
  it("lists panel accounts for a super-admin without exposing credentials", async () => {
    await createAdmin({email: "super@careerveda.test"});
    await createAdmin({
      email: "target@careerveda.test",
      name: "Target Admin",
      role: ROLES.EDITOR,
    });

    const {accessToken} = await login(app, {email: "super@careerveda.test"});

    const response = await request(app)
      .get("/api/v1/admin/admins")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);

    const target = response.body.data.find(
      (account) => account.email === "target@careerveda.test",
    );
    expect(target).toMatchObject({
      name: "Target Admin",
      role: ROLES.EDITOR,
      status: "active",
      mfaEnabled: false,
      isSelf: false,
    });

    // The hash and its history must never cross this boundary.
    expect(JSON.stringify(response.body)).not.toContain("argon2");
    expect(target.passwordHash).toBeUndefined();
    expect(target.passwordHistory).toBeUndefined();
  });

  it("refuses the account list to a non-super-admin", async () => {
    await createAdmin({email: "admin@careerveda.test", role: ROLES.ADMIN});
    const {accessToken} = await login(app, {email: "admin@careerveda.test"});

    const response = await request(app)
      .get("/api/v1/admin/admins")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("resets a password, clears the lockout and revokes every session", async () => {
    const target = await createAdmin({email: "target@careerveda.test"});
    const targetSession = await login(app, {email: "target@careerveda.test"});

    // Put the account in the state an operator reset exists to recover from.
    await Admin.updateOne(
      {_id: target._id},
      {
        $set: {
          failedLoginAttempts: 5,
          lockedUntil: new Date(Date.now() + 60 * 60 * 1000),
        },
      },
    );

    await createAdmin({email: "super@careerveda.test"});
    const {accessToken} = await login(app, {email: "super@careerveda.test"});

    const response = await request(app)
      .post(`/api/v1/admin/admins/${target._id}/reset-password`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({newPassword: NEW_PASSWORD});

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      reset: true,
      email: "target@careerveda.test",
    });

    // Every session that existed before the reset is gone. Checked before the
    // successful login below, which legitimately creates a new one.
    const liveSessions = await RefreshToken.countDocuments({
      admin: target._id,
      revokedAt: null,
    });
    expect(liveSessions).toBe(0);

    // The access token minted before the reset was invalidated by tokenVersion.
    const staleToken = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${targetSession.accessToken}`);
    expect(staleToken.status).toBe(401);

    // The old password is gone; the new one works, and the lockout no longer
    // blocks the account.
    const oldPassword = await login(app, {
      email: "target@careerveda.test",
      password: TEST_PASSWORD,
    });
    expect(oldPassword.status).toBe(401);

    const newPassword = await login(app, {
      email: "target@careerveda.test",
      password: NEW_PASSWORD,
    });
    expect(newPassword.status).toBe(200);

    const audit = await AuditLog.findOne({
      action: AUDIT_ACTIONS.USER_PASSWORD_RESET,
    });
    expect(audit).not.toBeNull();
    expect(audit.actorEmail).toBe("super@careerveda.test");
    expect(audit.metadata.email).toBe("target@careerveda.test");
  });

  it("refuses to reset the caller's own password through this screen", async () => {
    const self = await createAdmin({email: "super@careerveda.test"});
    const {accessToken} = await login(app, {email: "super@careerveda.test"});

    const response = await request(app)
      .post(`/api/v1/admin/admins/${self._id}/reset-password`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({newPassword: NEW_PASSWORD});

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain("Profile & security");
  });

  it("applies the same password policy as a self-service change", async () => {
    const target = await createAdmin({email: "target@careerveda.test"});
    await createAdmin({email: "super@careerveda.test"});
    const {accessToken} = await login(app, {email: "super@careerveda.test"});

    const response = await request(app)
      .post(`/api/v1/admin/admins/${target._id}/reset-password`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({newPassword: "short"});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
