import {describe, it, expect} from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

import {createApp} from "../src/app.js";
import {env} from "../src/config/env.js";

const app = createApp();

// Every route the API registers, from the dev route map — so a route added
// tomorrow without authenticate() fails here without anyone listing it.
const protectedRoutes = async () => {
  const {body} = await request(app).get("/routes");
  return body.data.routes.filter(
    ({path}) =>
      path.startsWith("/api/v1/admin") ||
      ["/api/v1/auth/me", "/api/v1/auth/sessions", "/api/v1/auth/change-password"].some((p) => path.startsWith(p)),
  );
};

const fill = (path) => path.replace(/:id\b/g, "0123456789abcdef01234567").replace(/:\w+/g, "probe");

const claims = {sub: "0123456789abcdef01234567", role: "super-admin", tv: 0};
const options = {issuer: "careerveda-api", audience: "careerveda-admin", expiresIn: "5m"};

const ATTACKS = {
  "no token": null,
  "token signed with a guessed secret": jwt.sign(claims, "x".repeat(32), options),
  "alg:none token": jwt.sign(claims, null, {...options, algorithm: "none"}),
  "valid signature, admin that does not exist": jwt.sign(claims, env.JWT_ACCESS_SECRET, options),
};

describe("only a signed-in admin reaches the admin API", () => {
  it("finds the admin routes to test", async () => {
    expect((await protectedRoutes()).length).toBeGreaterThan(30);
  });

  for (const [attack, token] of Object.entries(ATTACKS)) {
    it(`refuses every admin route with: ${attack}`, async () => {
      const leaks = [];
      for (const {methods, path} of await protectedRoutes()) {
        for (const method of methods.filter((m) => m !== "HEAD" && m !== "OPTIONS")) {
          let call = request(app)[method.toLowerCase()](fill(path));
          if (token) call = call.set("Authorization", `Bearer ${token}`);
          const {status} = await call;
          if (status !== 401) leaks.push(`${method} ${path} -> ${status}`);
        }
      }
      expect(leaks).toEqual([]);
    });
  }
});
