// Environment schema. The server refuses to boot on an invalid config rather
// than failing later on the first request that happens to need the missing
// value — a backend that starts without JWT secrets is a backend that will
// happily issue unverifiable tokens.

import path from "node:path";
import {fileURLToPath} from "node:url";

import dotenv from "dotenv";
import {z} from "zod";

// Loaded here rather than in server.js because this module is imported by app.js
// too, and the test harness imports app.js directly without a server. `override:
// false` means a real environment variable (Cloud Run, CI) always beats the file.
dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env"),
  override: false,
});

const csv = (value) =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

// Secrets are rejected below a length that brute force makes trivial. 32 chars
// is the floor for an HMAC key we expect to survive being public-facing.
const secret = z.string().min(32, "must be at least 32 characters");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),

  // Database: MongoDB (Atlas) or Firestore (Native mode)
  // For Firestore: use format "firestore://projects/<project-id>/databases/(default)"
  // For MongoDB: standard mongodb:// or mongodb+srv:// URI
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().default("careerveda"),
  
  // Firestore-specific (optional, inferred from MONGODB_URI if it contains firestore.goog)
  FIRESTORE_PROJECT_ID: z.string().optional(),
  FIRESTORE_DATABASE: z.string().default("(default)"),
  
  // Emulator for local development
  FIRESTORE_EMULATOR_HOST: z.string().optional(),

  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  ADMIN_URL: z.string().url().default("http://localhost:5174"),
  CORS_ALLOWED_ORIGINS: z.string().default(""),

  JWT_ACCESS_SECRET: secret,
  JWT_REFRESH_SECRET: secret,
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  IMAGEKIT_PUBLIC_KEY: z.string().optional(),
  IMAGEKIT_PRIVATE_KEY: z.string().optional(),
  IMAGEKIT_URL_ENDPOINT: z.string().optional(),

  // Hiring-enquiry emails. Leave SMTP_HOST blank to skip sending entirely.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  // Where the admissions team is notified of each hiring enquiry.
  LEAD_NOTIFY_EMAIL: z.string().optional(),

  // Cloudflare Turnstile secret for the public forms. Blank skips the check
  // (dev, tests); an https deploy refuses to boot without it (see below).
  TURNSTILE_SECRET_KEY: z.string().optional(),
  // Deliberate opt-out of the boot check below, for a deploy that runs without
  // a CAPTCHA. The forms then rely on the API's rate limits alone.
  TURNSTILE_DISABLED: z.enum(["true", "false"]).default("false"),

  // A hop count ("1", "2") or an Express trust-proxy list ("loopback, 10.0.0.0/8").
  TRUST_PROXY: z.string().default("1"),

  // Every admin must have two-factor sign-in before the panel lets them touch
  // content, leads or settings. Unset means "on for any https deploy"
  // (COOKIE_SECURE=true), off for local dev and tests.
  REQUIRE_ADMIN_MFA: z.enum(["true", "false"]).optional(),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Print which variables are wrong, but never their values — this output can
  // end up in a Cloud Run log that more people can read than can read .env.
  const detail = parsed.error.issues
    .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  console.error(`Invalid environment configuration:\n${detail}`);
  process.exit(1);
}

const raw = parsed.data;

// The two app URLs are always allowed; CORS_ALLOWED_ORIGINS adds to them rather
// than replacing them, so a deploy can't lock out its own admin panel by
// setting the variable and forgetting an entry.
const allowedOrigins = Array.from(
  new Set([raw.FRONTEND_URL, raw.ADMIN_URL, ...csv(raw.CORS_ALLOWED_ORIGINS)]),
);

// Production with non-Secure cookies sends the refresh token over plain http.
// Warned, not refused: the local stack also runs NODE_ENV=production over http.
if (raw.NODE_ENV === "production" && !raw.COOKIE_SECURE) {
  console.warn("WARNING: NODE_ENV=production with COOKIE_SECURE=false - set COOKIE_SECURE=true on any https deploy.");
}

// Secure cookies mean a real HTTPS deploy, where cookies go out SameSite=None.
// A localhost or plain-http origin left in the allowlist (the defaults above are
// localhost) would let any dev server on a visitor's machine call the live API
// with their session. Refuse to boot instead; the local Docker stack runs with
// COOKIE_SECURE=false and is unaffected.
if (raw.COOKIE_SECURE) {
  const unsafe = allowedOrigins.filter(
    (origin) => !origin.startsWith("https://") || /^https:\/\/(localhost|127\.|\[::1\])/.test(origin),
  );
  if (unsafe.length) {
    console.error(
      `Invalid environment configuration:\n  COOKIE_SECURE=true but these allowed origins are not public https: ${unsafe.join(", ")}\n  Set FRONTEND_URL, ADMIN_URL and CORS_ALLOWED_ORIGINS to your https domains.`,
    );
    process.exit(1);
  }
  // An https deploy with no Turnstile secret would leave the public forms open to bots.
  if (!raw.TURNSTILE_SECRET_KEY && raw.TURNSTILE_DISABLED === "true") {
    console.warn("WARNING: TURNSTILE_DISABLED=true - the public forms have no CAPTCHA, only rate limits.");
  } else if (!raw.TURNSTILE_SECRET_KEY) {
    console.error(
      "Invalid environment configuration:\n  COOKIE_SECURE=true but TURNSTILE_SECRET_KEY is not set - the public forms would accept bot submissions.\n  Set it, or set TURNSTILE_DISABLED=true to run without a CAPTCHA.",
    );
    process.exit(1);
  }
}

export const env = {
  ...raw,
  allowedOrigins,
  isProduction: raw.NODE_ENV === "production",
  trustProxy: /^\d+$/.test(raw.TRUST_PROXY.trim()) ? Number(raw.TRUST_PROXY) : raw.TRUST_PROXY,
  isTest: raw.NODE_ENV === "test",
  requireAdminMfa: raw.REQUIRE_ADMIN_MFA ? raw.REQUIRE_ADMIN_MFA === "true" : raw.COOKIE_SECURE,
  // Firestore detection and config
  isFirestore: raw.MONGODB_URI.includes(".firestore.goog") || raw.MONGODB_URI.startsWith("firestore://"),
  firestoreProjectId: raw.FIRESTORE_PROJECT_ID,
  firestoreDatabase: raw.FIRESTORE_DATABASE,
  firestoreEmulatorHost: raw.FIRESTORE_EMULATOR_HOST,
  // Media endpoints are registered only when all three keys are present, so a
  // partially-configured deploy fails loudly at the route level instead of
  // throwing inside the ImageKit SDK on first upload.
  imagekitConfigured: Boolean(
    raw.IMAGEKIT_PUBLIC_KEY && raw.IMAGEKIT_PRIVATE_KEY && raw.IMAGEKIT_URL_ENDPOINT,
  ),
};
