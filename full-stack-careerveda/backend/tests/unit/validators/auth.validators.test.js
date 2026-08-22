import {describe, expect, it} from "@jest/globals";

import {
  changePasswordSchema,
  loginSchema,
  revokeSessionSchema,
} from "../../../src/validators/auth.validators.js";

const parse = (schema, value) => schema.parse(value);

describe("loginSchema", () => {
  it("accepts a valid email and password", () => {
    expect(() => parse(loginSchema, {email: "admin@careerveda.in", password: "s3cret-password"})).not.toThrow();
  });

  it("trims and lowercases the email, the shape the model stores", () => {
    expect(parse(loginSchema, {email: "  User@Careerveda.IN ", password: "x"})).toEqual({
      email: "user@careerveda.in",
      password: "x",
    });
  });

  it("rejects a missing password", () => {
    expect(() => parse(loginSchema, {email: "admin@careerveda.in"})).toThrow();
  });

  it("rejects an email that is not text, the NoSQL-operator shape", () => {
    expect(() => parse(loginSchema, {email: {$ne: null}, password: "x"})).toThrow();
  });

  it("rejects an email that is not an address", () => {
    expect(() => parse(loginSchema, {email: "not-an-email", password: "x"})).toThrow();
  });

  it("rejects an email shorter than 3 characters", () => {
    expect(() => parse(loginSchema, {email: "ab", password: "x"})).toThrow();
  });

  it("rejects an email past 254 characters", () => {
    expect(() => parse(loginSchema, {email: `${"a".repeat(250)}@x.io`, password: "x"})).toThrow();
  });

  it("rejects an empty password", () => {
    expect(() => parse(loginSchema, {email: "admin@careerveda.in", password: ""})).toThrow();
  });

  it("rejects a password past the 200-character cap", () => {
    expect(() => parse(loginSchema, {email: "admin@careerveda.in", password: "a".repeat(201)})).toThrow();
  });
});

describe("changePasswordSchema", () => {
  it("accepts both password fields", () => {
    expect(() =>
      parse(changePasswordSchema, {currentPassword: "old-pass", newPassword: "new-pass"}),
    ).not.toThrow();
  });

  it("rejects when either field is missing", () => {
    expect(() => parse(changePasswordSchema, {currentPassword: "old-pass"})).toThrow();
    expect(() => parse(changePasswordSchema, {newPassword: "new-pass"})).toThrow();
  });

  it("rejects non-text fields, which is what stops operator smuggling", () => {
    expect(() =>
      parse(changePasswordSchema, {currentPassword: {$ne: null}, newPassword: "new-pass"}),
    ).toThrow();
  });
});

describe("revokeSessionSchema", () => {
  it("accepts a 24-character hex id, case-insensitively", () => {
    expect(() => parse(revokeSessionSchema, {id: "64b7f9d2e4b0a1b2c3d4e5f6"})).not.toThrow();
    expect(() => parse(revokeSessionSchema, {id: "64B7F9D2E4B0A1B2C3D4E5F6"})).not.toThrow();
  });

  it("rejects an id of the wrong length or characters", () => {
    expect(() => parse(revokeSessionSchema, {id: "64b7f9d2e4b0a1b2c3d4e5f"})).toThrow();
    expect(() => parse(revokeSessionSchema, {id: "zzzzzzzzzzzzzzzzzzzzzzzz"})).toThrow();
    expect(() => parse(revokeSessionSchema, {id: ""})).toThrow();
  });
});