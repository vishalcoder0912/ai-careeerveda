import {describe, it, expect} from "vitest";
import request from "supertest";

import {createApp} from "../src/app.js";

const app = createApp();

describe("wrong method on a real route", () => {
  it("answers 405 with an Allow header, not 404", async () => {
    const response = await request(app).get("/api/v1/auth/login");

    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe("POST");
    expect(response.body.error.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("still 404s a path that does not exist", async () => {
    const response = await request(app).get("/api/v1/auth/nope");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
