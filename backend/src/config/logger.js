import pino from "pino";

import {env} from "./env.js";

// Structured JSON in production because Cloud Run parses it into real log
// fields; pretty single lines nowhere else, since pino-pretty is a dev-only
// dependency we do not want in the runtime image.
export const logger = pino({
  level: env.isTest ? "silent" : env.LOG_LEVEL,
  // Anything named below is stripped before a line is written. This is the last
  // line of defence, not the first — code should not be handing secrets to the
  // logger at all — but a stray `logger.info({body})` should not leak a password.
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "password",
      "currentPassword",
      "newPassword",
      "token",
      "refreshToken",
      "accessToken",
      "*.password",
      "*.token",
    ],
    censor: "[redacted]",
  },
  base: undefined,
});
