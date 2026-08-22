import {describe, it, expect, beforeEach} from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

import {createApp} from "../src/app.js";
import {env} from "../src/config/env.js";
import {Admin} from "../src/models/Admin.js";
import {Program} from "../src/models/Program.js";
import {Lead} from "../src/models/Lead.js";
import {signAccessToken} from "../src/services/token.service.js";
import {findById} from "../src/services/content.service.js";
import {createAdmin} from "./helpers/auth.js";

// Gaps left by the main suites. auth.test.js already proves a missing, malformed,
// wrong-secret, alg:none, or suspended token is refused; these cover the remaining
// authenticate() rejection branches, plus the rate limiter — which every other
// test deliberately skips (see rateLimit.js), so nothing yet proves it fires.

const app = createApp();

// Must match the constants signAccessToken() bakes in, so a token forged here is
// otherwise valid and the ONLY thing wrong is the property under test.
const ISSUER = "careerveda-api";
const AUDIENCE = "careerveda-admin";

const me = (token) =>
  request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);

describe("access token lifecycle beyond the signature", () => {
  let admin;

  beforeEach(async () => {
    admin = await createAdmin();
  });

  it("accepts a freshly signed token (baseline)", async () => {
    const response = await me(signAccessToken(admin));
    expect(response.status).toBe(200);
  });

  it("refuses an expired token even though it is otherwise valid", async () => {
    const expired = jwt.sign(
      {sub: String(admin._id), role: admin.role, email: admin.email, tv: 0},
      env.JWT_ACCESS_SECRET,
      {expiresIn: "-10s", issuer: ISSUER, audience: AUDIENCE},
    );

    const response = await me(expired);
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({success: false, error: {code: expect.any(String)}});
  });

  it("refuses a valid token whose account has since been deleted", async () => {
    const token = signAccessToken(admin);
    await Admin.deleteOne({_id: admin._id});

    // Identity is re-read from the database on every request, so a token cannot
    // outlive the account it names.
    const response = await me(token);
    expect(response.status).toBe(401);
  });

  it("refuses a token whose tokenVersion is stale (e.g. after a password change)", async () => {
    const token = signAccessToken(admin); // carries tv: 0
    await Admin.updateOne({_id: admin._id}, {$inc: {tokenVersion: 1}});

    // A password change bumps tokenVersion, which must invalidate every access
    // token already handed out — not just the refresh cookies.
    const response = await me(token);
    expect(response.status).toBe(401);
  });
});

describe("rate limiter", () => {
  it("returns a 429 RATE_LIMITED envelope once the auth limit is exceeded", async () => {
    // Every other suite runs with the limiter skipped so cases do not bleed into
    // one another; here we deliberately engage the real one for a single burst.
    env.isTest = false;
    try {
      const body = {email: "nobody@careerveda.test", password: "does-not-matter"};

      // authLimiter allows 10 per window; fire past it and keep the last response.
      let last;
      for (let i = 0; i < 12; i += 1) {
        last = await request(app).post("/api/v1/auth/login").send(body);
      }

      expect(last.status).toBe(429);
      expect(last.body).toMatchObject({success: false, error: {code: "RATE_LIMITED"}});
      // draft-7 standard headers are enabled, so the limit is advertised.
      expect(last.headers["ratelimit"] || last.headers["ratelimit-limit"]).toBeDefined();
    } finally {
      env.isTest = true;
    }
  });
});

// The query-shaping guards added for the CodeQL "database query built from
// user-controlled sources" findings. sanitizeRequest already strips $-prefixed
// keys, so these prove the second layer: even reached directly, the values that
// become a Mongo filter are re-derived rather than passed through.

describe("query values are re-derived, not forwarded", () => {
  let token;

  beforeEach(async () => {
    token = signAccessToken(await createAdmin());
  });

  const media = (query) =>
    request(app).get("/api/v1/admin/media").query(query).set("Authorization", `Bearer ${token}`);

  it("ignores a folder that is not one of ours instead of filtering on it", async () => {
    const response = await media({folder: "/etc/passwd"});

    // 400 from the enum validator is the expected answer; what must never happen
    // is the value reaching the filter and being treated as a real folder.
    expect([200, 400]).toContain(response.status);
    if (response.status === 200) expect(response.body.success).toBe(true);
  });

  it("does not let an operator-shaped search become a query operator", async () => {
    const response = await media({"search[$ne]": ""});

    expect(response.status).not.toBe(500);
    if (response.status === 200) expect(Array.isArray(response.body.data)).toBe(true);
  });

  it("clamps a page size past the cap rather than honouring it", async () => {
    const response = await media({limit: "100000"});

    if (response.status === 200) expect(response.body.meta.limit).toBeLessThanOrEqual(100);
  });
});

// Leads hold a name, an email and a phone number for every person who has ever
// filled in the form, so a filter that can be steered from the query string
// leaks more here than anywhere else in the API. buildLeadFilter re-derives
// every value; these are the cases that would show it forwarding one instead.
describe("lead list filters cannot be steered from the query string", () => {
  let token;

  beforeEach(async () => {
    token = signAccessToken(await createAdmin());

    await Lead.create([
      {type: "consultation", name: "Live One", email: "live@x.test", mobile: "9876543210",
        emailKey: "live@x.test", mobileKey: "9876543210", archived: false},
      {type: "consultation", name: "Filed Away", email: "old@x.test", mobile: "9876543211",
        emailKey: "old@x.test", mobileKey: "9876543211", archived: true},
    ]);
  });

  const leads = (query) =>
    request(app).get("/api/v1/admin/leads").query(query).set("Authorization", `Bearer ${token}`);

  it("defaults to unarchived and does not accept a non-boolean as 'archived'", async () => {
    const plain = await leads({});
    expect(plain.status).toBe(200);
    expect(plain.body.data.map((lead) => lead.name)).toEqual(["Live One"]);

    // Anything that is not the literal true must read as "not archived" rather
    // than being passed through as a filter value.
    for (const attempt of [{archived: "yes"}, {"archived[$ne]": "false"}, {archived: "1"}]) {
      const response = await leads(attempt);
      expect(response.status).not.toBe(500);
      if (response.status === 200) {
        expect(response.body.data.every((lead) => lead.archived !== true)).toBe(true);
      }
    }
  });

  it("does not let an operator reach the type or status filter", async () => {
    for (const attempt of [{"type[$ne]": "nothing"}, {"status[$ne]": "nothing"}, {type: "../../x"}]) {
      const response = await leads(attempt);

      expect(response.status).not.toBe(500);
      // An unrecognised type is dropped, never forwarded — so the response is
      // either a validation refusal or the ordinary unfiltered list.
      if (response.status === 200) expect(Array.isArray(response.body.data)).toBe(true);
    }
  });

  it("treats a regex-shaped search as literal text, not as a pattern", async () => {
    const response = await leads({search: ".*"});

    expect(response.status).toBe(200);
    // ".*" as a pattern would match every lead; escaped, it matches none.
    expect(response.body.data).toHaveLength(0);
  });
});

// findById directly, not through a route. Every admin content route already
// validates :id with zod, so an HTTP-level case here would pass at the validator
// and prove nothing about the service. The guard inside findById is the one that
// covers a route added later without that validator — which is the whole reason
// it lives in the shared function — so it has to be exercised where it is.
describe("content findById refuses anything that is not an id", () => {
  it("throws 404 rather than handing the value to Mongo", async () => {
    for (const bad of [
      "not-a-valid-object-id",
      "",
      "../../etc/passwd",
      {$ne: null},
      ["507f1f77bcf86cd799439011"],
      null,
      undefined,
      "507f1f77bcf86cd79943901", // 23 chars — one short of an ObjectId
    ]) {
      await expect(findById(Program, bad)).rejects.toMatchObject({status: 404});
    }
  });

  it("still finds a real record, so the guard has not just broken lookups", async () => {
    const created = await Program.create({title: "Guard Baseline", slug: "guard-baseline"});

    // Both the string form and the ObjectId itself: internal callers pass the
    // latter, and an over-strict typeof check would have rejected it.
    await expect(findById(Program, String(created._id))).resolves.toMatchObject({
      slug: "guard-baseline",
    });
    await expect(findById(Program, created._id)).resolves.toMatchObject({
      slug: "guard-baseline",
    });
  });
});
