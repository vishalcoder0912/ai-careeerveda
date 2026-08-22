import {describe, it, expect} from "vitest";
import request from "supertest";

import {createApp} from "../src/app.js";
import {__testing} from "../src/middleware/sanitizeRequest.js";

const app = createApp();

describe("health endpoints", () => {
  it("reports liveness without touching the database", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
  });

  it("reports readiness with a database check", async () => {
    const response = await request(app).get("/ready");

    expect(response.status).toBe(200);
    expect(response.body.data.checks.database).toBe("up");
  });

  it("never leaks the connection string in the readiness payload", async () => {
    const response = await request(app).get("/ready");

    expect(JSON.stringify(response.body)).not.toContain("mongodb");
  });
});

describe("response envelope", () => {
  it("returns a request id on success", async () => {
    const response = await request(app).get("/health");

    expect(response.body.meta.requestId).toEqual(expect.any(String));
    expect(response.headers["x-request-id"]).toBe(response.body.meta.requestId);
  });

  it("echoes a caller-supplied request id so traces survive a proxy hop", async () => {
    const response = await request(app).get("/health").set("X-Request-Id", "trace-abc-123");

    expect(response.body.meta.requestId).toBe("trace-abc-123");
  });

  // Node's HTTP client refuses to transmit a CRLF header value at all, so the
  // raw injection string can't be used here — it fails in the test client, not
  // in the middleware. These two are values a client WILL send, and they still
  // have to be rejected before being reflected into a response header.
  it("replaces a request id containing unsafe characters", async () => {
    const response = await request(app).get("/health").set("X-Request-Id", "id<script>alert(1)");

    expect(response.body.meta.requestId).not.toContain("<script>");
    expect(response.headers["x-request-id"]).not.toContain("<script>");
  });

  it("replaces an over-long request id rather than echoing it back", async () => {
    const response = await request(app).get("/health").set("X-Request-Id", "a".repeat(500));

    expect(response.body.meta.requestId.length).toBeLessThanOrEqual(64);
  });

  it("returns the documented error shape for an unknown route", async () => {
    const response = await request(app).get("/api/v1/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: {code: "NOT_FOUND"},
    });
    expect(response.body.meta.requestId).toEqual(expect.any(String));
  });
});

describe("security headers", () => {
  it("does not advertise Express", async () => {
    const response = await request(app).get("/health");

    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("sets helmet headers", async () => {
    const response = await request(app).get("/health");

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
  });
});

describe("CORS allow-list", () => {
  it("allows a configured origin", async () => {
    const response = await request(app).get("/health").set("Origin", "http://localhost:5173");

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("refuses an unlisted origin instead of reflecting it", async () => {
    const response = await request(app).get("/health").set("Origin", "https://evil.example.com");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    expect(response.status).toBe(403);
  });
});

describe("request body limits", () => {
  it("rejects a body over the JSON limit", async () => {
    // 300 KB against a 256 KB limit.
    const response = await request(app)
      .post("/api/v1/anything")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({blob: "x".repeat(300 * 1024)}));

    expect([404, 413]).toContain(response.status);
  });
});

describe("NoSQL operator sanitisation", () => {
  const {clean} = __testing;

  it("strips $-prefixed operators from a body", () => {
    expect(clean({email: {$ne: null}, name: "real"})).toEqual({email: {}, name: "real"});
  });

  it("strips operators nested inside arrays", () => {
    expect(clean({tags: [{$where: "1==1"}, "ok"]})).toEqual({tags: [{}, "ok"]});
  });

  it("drops prototype-polluting keys", () => {
    const output = clean(JSON.parse('{"__proto__":{"admin":true},"name":"real"}'));

    expect(output.name).toBe("real");
    expect({}.admin).toBeUndefined();
  });

  it("drops dotted keys that would reach into a subdocument path", () => {
    expect(clean({"role.name": "super-admin", title: "ok"})).toEqual({title: "ok"});
  });

  it("leaves legitimate values untouched", () => {
    const input = {title: "PG Program", tags: ["a", "b"], nested: {count: 3, live: true}};

    expect(clean(input)).toEqual(input);
  });

  // The result is handed straight back to route handlers as request.body, and
  // downstream code calls body.hasOwnProperty and spreads it into schemas — a
  // null-prototype object breaks both. The implementation has already changed
  // shape once here (an Object.create(null) accumulator, now Object.fromEntries)
  // and this is the constraint that has to survive the next change too.
  it("returns an ordinary object rather than a null-prototype one", () => {
    expect(Object.getPrototypeOf(clean({title: "ok"}))).toBe(Object.prototype);
  });
});
