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

  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().default("careerveda"),

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

export const env = {
  ...raw,
  allowedOrigins,
  isProduction: raw.NODE_ENV === "production",
  isTest: raw.NODE_ENV === "test",
  // Media endpoints are registered only when all three keys are present, so a
  // partially-configured deploy fails loudly at the route level instead of
  // throwing inside the ImageKit SDK on first upload.
  imagekitConfigured: Boolean(
    raw.IMAGEKIT_PUBLIC_KEY && raw.IMAGEKIT_PRIVATE_KEY && raw.IMAGEKIT_URL_ENDPOINT,
  ),
};
