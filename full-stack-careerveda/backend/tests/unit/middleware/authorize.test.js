import {beforeEach, describe, expect, it, jest} from "@jest/globals";

import {AuditLog, AUDIT_ACTIONS} from "../../../src/models/AuditLog.js";
import {ROLES} from "../../../src/config/permissions.js";
import {requirePermission, requireSuperAdmin} from "../../../src/middleware/authorize.js";
import {ApiError} from "../../../src/utils/apiError.js";

// The audit write goes through the real audit.service, so the AuditLog model is
// stubbed at its create() seam — denial behaviour and the audit trail it leaves
// are then both observable without a database.

const requestOf = (overrides = {}) => ({
  admin: null,
  permissions: [],
  method: "POST",
  originalUrl: "/api/v1/admin/programs",
  ip: "203.0.113.7",
  id: "req-1",
  get: jest.fn(() => undefined),
  ...overrides,
});

const adminOf = (role, overrides = {}) => ({
  _id: "64b7f9d2e4b0a1b2c3d4e5f6",
  role,
  email: "admin@careerveda.in",
  ...overrides,
});

const run = async (middleware, request) => {
  const next = jest.fn();
  await middleware(request, {}, next);
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

beforeEach(() => {
  jest.spyOn(AuditLog, "create").mockResolvedValue({});
});

describe("requirePermission", () => {
  it("refuses an unauthenticated request without writing an audit row", async () => {
    const next = await run(requirePermission("programs.create"), requestOf());

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED");
    expect(AuditLog.create).not.toHaveBeenCalled();
  });

  it("lets a request through when every named permission is held", async () => {
    const next = await run(
      requirePermission("programs.create", "programs.update"),
      requestOf({admin: adminOf(ROLES.EDITOR), permissions: ["programs.create", "programs.update"]}),
    );

    expect(next).toHaveBeenCalledWith();
    expect(AuditLog.create).not.toHaveBeenCalled();
  });

  it("requires ALL named permissions, not any one of them", async () => {
    const next = await run(
      requirePermission("forms.read", "forms.export"),
      requestOf({admin: adminOf(ROLES.EDITOR), permissions: ["forms.read"]}),
    );

    forbiddenError(next);
  });

  it("denies a missing permission and records the denial in the audit trail", async () => {
    const next = await run(
      requirePermission("settings.manage"),
      requestOf({admin: adminOf(ROLES.EDITOR), permissions: ["blogs.manage"]}),
    );

    forbiddenError(next);
    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_ACTIONS.PERMISSION_DENIED,
        actor: adminOf(ROLES.EDITOR)._id,
        actorRole: ROLES.EDITOR,
        metadata: {required: ["settings.manage"], path: "/api/v1/admin/programs", method: "POST"},
        outcome: "failure",
      }),
    );
  });

  it("never lets the audit write failure turn a denial into a 500", async () => {
    AuditLog.create.mockRejectedValue(new Error("audit collection down"));
    const next = await run(
      requirePermission("settings.manage"),
      requestOf({admin: adminOf(ROLES.EDITOR), permissions: []}),
    );

    forbiddenError(next);
  });
});

describe("requireSuperAdmin", () => {
  it("refuses an unauthenticated request", async () => {
    const next = await run(requireSuperAdmin, requestOf());

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(AuditLog.create).not.toHaveBeenCalled();
  });

  it("lets a super-admin through", async () => {
    const next = await run(
      requireSuperAdmin,
      requestOf({admin: adminOf(ROLES.SUPER_ADMIN), permissions: []}),
    );

    expect(next).toHaveBeenCalledWith();
    expect(AuditLog.create).not.toHaveBeenCalled();
  });

  it("denies every other role, even one that holds every content grant", async () => {
    const next = await run(
      requireSuperAdmin,
      requestOf({admin: adminOf(ROLES.ADMIN), permissions: ["users.manage"]}),
    );

    expect(forbiddenError(next).message).toMatch(/super-admin/);
    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_ACTIONS.PERMISSION_DENIED,
        metadata: {required: "super-admin", path: "/api/v1/admin/programs", method: "POST"},
        outcome: "failure",
      }),
    );
  });
});