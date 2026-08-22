import request from "supertest";

import {Admin} from "../../src/models/Admin.js";
import {hashPassword} from "../../src/services/password.service.js";
import {ROLES} from "../../src/config/permissions.js";

// Long enough to clear the 12-character policy, and not one of the deny-listed
// obvious ones.
export const TEST_PASSWORD = "correct-horse-battery-7";

export const createAdmin = async ({
  email = "super@careerveda.test",
  name = "Test Super",
  role = ROLES.SUPER_ADMIN,
  password = TEST_PASSWORD,
  status = "active",
} = {}) =>
  Admin.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role,
    status,
  });

// Supertest does not keep a cookie jar between calls, so tests that need the
// refresh cookie have to carry it themselves. This returns everything a
// follow-up request might need.
export const login = async (app, {email = "super@careerveda.test", password = TEST_PASSWORD} = {}) => {
  const response = await request(app).post("/api/v1/auth/login").send({email, password});

  const cookies = response.headers["set-cookie"] || [];

  return {
    response,
    status: response.status,
    accessToken: response.body.data && response.body.data.accessToken,
    csrfToken: response.body.data && response.body.data.csrfToken,
    cookies,
    // Just the name=value pairs, which is what a Cookie header needs.
    cookieHeader: cookies.map((cookie) => cookie.split(";")[0]).join("; "),
  };
};

export const refreshCookieValue = (cookies) => {
  const found = (cookies || []).find((cookie) => cookie.startsWith("cv_refresh="));
  return found ? found.split(";")[0].split("=")[1] : null;
};
