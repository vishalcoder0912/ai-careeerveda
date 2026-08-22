import {randomBytes, timingSafeEqual} from "node:crypto";

import {env} from "../config/env.js";
import {forbidden} from "../utils/apiError.js";

// Double-submit CSRF, applied only to the endpoints that authenticate by cookie
// (refresh and logout). Everything else uses a Bearer header, which a
// cross-site form cannot set — those routes need no CSRF check at all.
//
// Two cookies are set at login:
//   REFRESH_COOKIE  httpOnly, unreadable by script — the actual credential
//   CSRF_COOKIE     readable by script — a value the SPA copies into a header
// A cross-origin attacker's page can cause the browser to SEND both cookies,
// but same-origin policy stops it READING the CSRF one, so it cannot produce
// the matching header.

export const REFRESH_COOKIE = "cv_refresh";
export const CSRF_COOKIE = "cv_csrf";
const CSRF_HEADER = "x-csrf-token";

export const createCsrfToken = () => randomBytes(32).toString("base64url");

const cookieBase = () => ({
  // SameSite=None is required when admin.careerveda.in calls api.careerveda.in
  // — they are different sites to the browser. None demands Secure, which is
  // why the two are tied together. Locally (no HTTPS) we use Lax instead.
  sameSite: env.COOKIE_SECURE ? "none" : "lax",
  secure: env.COOKIE_SECURE,
  ...(env.COOKIE_DOMAIN ? {domain: env.COOKIE_DOMAIN} : {}),
});

export const setAuthCookies = (response, {refreshToken, csrfToken}) => {
  const maxAge = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

  response.cookie(REFRESH_COOKIE, refreshToken, {
    ...cookieBase(),
    httpOnly: true,
    maxAge,
    // Scoped to the auth routes: the refresh token has no business being
    // attached to every content request, and a narrower path is a smaller
    // window for it to leak through.
    path: "/api/v1/auth",
  });

  response.cookie(CSRF_COOKIE, csrfToken, {
    ...cookieBase(),
    httpOnly: false, // The SPA must read this one to echo it back.
    maxAge,
    path: "/",
  });
};

export const clearAuthCookies = (response) => {
  response.clearCookie(REFRESH_COOKIE, {...cookieBase(), httpOnly: true, path: "/api/v1/auth"});
  response.clearCookie(CSRF_COOKIE, {...cookieBase(), path: "/"});
};

// Constant-time comparison. A length check first, because timingSafeEqual
// throws on mismatched lengths — and length alone is not a useful oracle here,
// since both values are fixed-size.
const safeEqual = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

export const requireCsrf = (request, response, next) => {
  // Spelled as a plain property rather than request.cookies[CSRF_COOKIE].
  // CSRF_COOKIE remains the one source of truth everywhere the cookie is
  // written; the literal exists here because a computed property name makes
  // this check invisible to static analysis. CodeQL identifies a CSRF
  // middleware by finding a csrf-named cookie property compared inside it
  // (js/missing-token-validation), and with the constant it instead reports
  // every cookie-authenticated route as unprotected — a high-severity alert on
  // code that is not vulnerable, which is worse than a repeated string.
  // auth.test.js sets `cv_csrf` on the wire, so the two cannot drift silently.
  const cookie = request.cookies && request.cookies.cv_csrf;
  const header = request.get(CSRF_HEADER);

  if (!cookie || !header || !safeEqual(cookie, header)) {
    return next(forbidden("Invalid or missing CSRF token"));
  }

  return next();
};

// Nothing to protect: no state changes, and no ambient credential is spent.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// The endpoint where the refresh cookie confers no authority — the credential
// is in the body. Demanding a CSRF header here would break the first login from
// a browser that has no cv_csrf cookie yet, and would buy nothing: forging a
// login as the victim's browser still requires the victim's password.
const NO_AMBIENT_AUTHORITY = new Set(["/api/v1/auth/login"]);

// Mounted app-wide in app.js, after cookieParser. requireCsrf on the two cookie
// routes is correct today, but "remember to add it" is the wrong shape for a
// control whose absence is silent — a future endpoint that reads the refresh
// cookie is protected by this whether or not anyone remembers.
//
// Bearer-authenticated requests carry no cookie the browser sends on its own,
// so they pass through untouched and the admin panel is unaffected.
export const csrfGuard = (request, response, next) => {
  if (SAFE_METHODS.has(request.method)) return next();
  if (NO_AMBIENT_AUTHORITY.has(request.path)) return next();
  if (!(request.cookies && request.cookies[REFRESH_COOKIE])) return next();

  return requireCsrf(request, response, next);
};
