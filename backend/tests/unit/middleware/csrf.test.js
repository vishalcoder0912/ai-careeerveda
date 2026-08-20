import {describe, expect, it, jest} from "@jest/globals";

import {
  CSRF_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  createCsrfToken,
  csrfGuard,
  requireCsrf,
  setAuthCookies,
} from "../../../src/middleware/csrf.js";
import {env} from "../../../src/config/env.js";
import {ApiError} from "../../../src/utils/apiError.js";

// The double-submit pair is the whole design: one httpOnly credential cookie
// the browser sends on its own, one script-readable cookie the SPA must copy
// into a header. The stand-ins only need the cookie API the module touches.

const makeResponse = () => ({cookie: jest.fn(), clearCookie: jest.fn()});

const runRequireCsrf = ({cookie, header}) => {
  const request = {cookies: cookie === undefined ? {} : {cv_csrf: cookie}, get: jest.fn(() => header)};
  const next = jest.fn();
  requireCsrf(request, {}, next);
  return next;
};

const runGuard = ({method, path, cookies, header}) => {
  const request = {method, path, cookies, get: jest.fn(() => header)};
  const next = jest.fn();
  csrfGuard(request, {}, next);
  return next;
};

const forbiddenError = (next) => {
  expect(next).toHaveBeenCalledTimes(1);
  const error = next.mock.calls[0][0];
  expect(error).toBeInstanceOf(ApiError);
  expect(error.status).toBe(403);
  expect(error.code).toBe("FORBIDDEN");
  return error;
};

describe("createCsrfToken", () => {
  it("produces a 32-byte base64url value, the shape the cookie and header share", () => {
    const token = createCsrfToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("mints a fresh value every call", () => {
    expect(createCsrfToken()).not.toBe(createCsrfToken());
  });
});

describe("setAuthCookies", () => {
  it("writes the refresh token httpOnly and scoped to the auth routes", () => {
    const response = makeResponse();

    setAuthCookies(response, {refreshToken: "rt-1", csrfToken: "ct-1"});

    expect(response.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      "rt-1",
      expect.objectContaining({
        sameSite: "lax",
        secure: false,
        httpOnly: true,
        maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
        path: "/api/v1/auth",
      }),
    );
  });

  it("writes the CSRF token readable by script, on the whole site", () => {
    const response = makeResponse();

    setAuthCookies(response, {refreshToken: "rt-1", csrfToken: "ct-1"});

    expect(response.cookie).toHaveBeenCalledWith(
      CSRF_COOKIE,
      "ct-1",
      expect.objectContaining({
        sameSite: "lax",
        secure: false,
        httpOnly: false,
        maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
        path: "/",
      }),
    );
  });

  it("adds the configured domain to both cookies when one is set", () => {
    const original = env.COOKIE_DOMAIN;
    env.COOKIE_DOMAIN = "api.careerveda.in";
    try {
      const response = makeResponse();

      setAuthCookies(response, {refreshToken: "rt-1", csrfToken: "ct-1"});

      for (const [, , options] of response.cookie.mock.calls) {
        expect(options.domain).toBe("api.careerveda.in");
      }
    } finally {
      env.COOKIE_DOMAIN = original;
    }
  });

  it("gives both cookies the same lifetime", () => {
    const response = makeResponse();

    setAuthCookies(response, {refreshToken: "rt-1", csrfToken: "ct-1"});

    const [refresh, csrf] = response.cookie.mock.calls.map((call) => call[2]);
    expect(csrf.maxAge).toBe(refresh.maxAge);
  });

  it("uses None + Secure together when COOKIE_SECURE is on", () => {
    const original = env.COOKIE_SECURE;
    env.COOKIE_SECURE = true;
    try {
      const response = makeResponse();

      setAuthCookies(response, {refreshToken: "rt-1", csrfToken: "ct-1"});

      for (const [, , options] of response.cookie.mock.calls) {
        expect(options.sameSite).toBe("none");
        expect(options.secure).toBe(true);
      }
    } finally {
      env.COOKIE_SECURE = original;
    }
  });
});

describe("clearAuthCookies", () => {
  it("clears both cookies with the paths they were set on", () => {
    const response = makeResponse();

    clearAuthCookies(response);

    expect(response.clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE, expect.objectContaining({path: "/api/v1/auth"}));
    expect(response.clearCookie).toHaveBeenCalledWith(CSRF_COOKIE, expect.objectContaining({path: "/"}));
  });
});

describe("requireCsrf", () => {
  it("lets a request through when the header matches the cookie", () => {
    const next = runRequireCsrf({cookie: "tok-123", header: "tok-123"});

    expect(next).toHaveBeenCalledWith();
  });

  it("refuses when the cookie is missing, however valid the header looks", () => {
    forbiddenError(runRequireCsrf({cookie: undefined, header: "tok-123"}));
  });

  it("refuses when the header is missing", () => {
    forbiddenError(runRequireCsrf({cookie: "tok-123", header: undefined}));
  });

  it("refuses when the two values differ", () => {
    forbiddenError(runRequireCsrf({cookie: "tok-123", header: "tok-124"}));
  });

  it("refuses a non-string cookie instead of crashing on the comparison", () => {
    forbiddenError(runRequireCsrf({cookie: {toString: () => "tok-123"}, header: "tok-123"}));
  });
});

describe("csrfGuard", () => {
  it("never blocks a read-only method, even with cookies present", () => {
    const next = runGuard({
      method: "GET",
      path: "/api/v1/admin/programs",
      cookies: {[REFRESH_COOKIE]: "rt-1", [CSRF_COOKIE]: "t"},
    });

    expect(next).toHaveBeenCalledWith();
  });

  it("lets the first login through, where no cookie exists yet", () => {
    const next = runGuard({method: "POST", path: "/api/v1/auth/login", cookies: {}});

    expect(next).toHaveBeenCalledWith();
  });

  it("passes bearer-authenticated requests that carry no refresh cookie", () => {
    const next = runGuard({method: "POST", path: "/api/v1/admin/programs", cookies: {}});

    expect(next).toHaveBeenCalledWith();
  });

  it("demands the CSRF header once the refresh cookie is in play", () => {
    const next = runGuard({
      method: "POST",
      path: "/api/v1/auth/refresh",
      cookies: {[REFRESH_COOKIE]: "rt-1"},
      header: "wrong",
    });

    forbiddenError(next);
  });

  it("accepts the request when the cookie-carrying client echoes the CSRF token back", () => {
    const next = runGuard({
      method: "POST",
      path: "/api/v1/auth/refresh",
      cookies: {[REFRESH_COOKIE]: "rt-1", [CSRF_COOKIE]: "tok-123"},
      header: "tok-123",
    });

    expect(next).toHaveBeenCalledWith();
  });
});