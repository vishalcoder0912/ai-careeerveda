// Cloudflare Turnstile on the public form endpoints (leads, job applications).
//
// The browser widget hands the form a one-time token; we redeem it with
// Cloudflare before the request reaches validation or the database. Fails
// closed: no token, a bad token, or Cloudflare not answering all refuse the
// submission. Runs before validate(), whose schema then strips the token.
//
// With no TURNSTILE_SECRET_KEY (local dev, tests) the check is skipped. env.js
// refuses to boot an https deploy without one, so production cannot skip it.

import {env} from "../config/env.js";
import {ApiError} from "../utils/apiError.js";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const failed = () =>
  new ApiError(400, "CAPTCHA_FAILED", "Please complete the verification and try again.", {
    fields: {turnstileToken: "Verification failed."},
  });

export const verifyTurnstile = async (request, response, next) => {
  if (!env.TURNSTILE_SECRET_KEY) return next();

  const token = request.body?.turnstileToken;
  // Cloudflare caps tokens at 2048 characters.
  if (typeof token !== "string" || !token || token.length > 2048) return next(failed());

  try {
    const result = await fetch(VERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: request.ip || ""}),
      signal: AbortSignal.timeout(5000),
    }).then((reply) => reply.json());

    if (!result.success) {
      request.log?.warn?.({codes: result["error-codes"]}, "turnstile rejected");
      return next(failed());
    }
    return next();
  } catch (error) {
    request.log?.error?.({err: error}, "turnstile siteverify unreachable");
    return next(new ApiError(503, "SERVICE_UNAVAILABLE", "Verification is unavailable right now. Please try again."));
  }
};
