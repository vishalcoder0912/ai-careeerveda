import {describe, it, expect} from "vitest";
import express from "express";
import request from "supertest";

import {createApp} from "../src/app.js";
import {authenticate} from "../src/middleware/authenticate.js";
import {requirePermission, requireSuperAdmin} from "../src/middleware/authorize.js";
import {adminLimiter} from "../src/middleware/rateLimit.js";
import {
  PERMISSIONS,
  ROLES,
  permissionsForRole,
  roleHasPermission,
  outranks,
} from "../src/config/permissions.js";
import {AuditLog, AUDIT_ACTIONS} from "../src/models/AuditLog.js";
import {createAdmin, login} from "./helpers/auth.js";

const app = createApp();

// A throwaway app that mounts the real middleware on a probe route, so the
// authorization logic is tested directly rather than through whichever content
// route happens to exist today.
const guardedApp = () => {
  const router = express.Router();

  // adminLimiter is on every probe so the chain matches what a real admin route
  // looks like. It is a no-op under test (rateLimit.js skips when env.isTest),
  // so it changes nothing these cases assert — it stops the probes being read as
  // four unthrottled authenticated endpoints, which is what they would be if
  // anyone ever copied this block as the template for a real route.
  router.get(
    "/needs-publish",
    adminLimiter,
    authenticate,
    requirePermission(PERMISSIONS.PROGRAMS_UPDATE),
    (req, res) => res.json({success: true, data: {reached: true}, meta: {}}),
  );
  router.delete(
    "/needs-delete",
    adminLimiter,
    authenticate,
    requirePermission(PERMISSIONS.PROGRAMS_DELETE),
    (req, res) => res.json({success: true, data: {reached: true}, meta: {}}),
  );
  router.get(
    "/needs-both",
    adminLimiter,
    authenticate,
    requirePermission(PERMISSIONS.FORMS_READ, PERMISSIONS.FORMS_EXPORT),
    (req, res) => res.json({success: true, data: {reached: true}, meta: {}}),
  );
  router.post("/needs-super", adminLimiter, authenticate, requireSuperAdmin, (req, res) =>
    res.json({success: true, data: {reached: true}, meta: {}}),
  );

  return createApp({extraRouters: [{path: "/probe", router}]});
};

describe("permission registry", () => {
  it("gives super-admin every permission", () => {
    const all = Object.values(PERMISSIONS);
    expect(permissionsForRole(ROLES.SUPER_ADMIN)).toEqual(expect.arrayContaining(all));
  });

  it("does not let an editor manage users, roles or settings", () => {
    expect(roleHasPermission(ROLES.EDITOR, PERMISSIONS.USERS_MANAGE)).toBe(false);
    expect(roleHasPermission(ROLES.EDITOR, PERMISSIONS.ROLES_MANAGE)).toBe(false);
    expect(roleHasPermission(ROLES.EDITOR, PERMISSIONS.SETTINGS_MANAGE)).toBe(false);
  });

  it("does not let an admin manage users or roles", () => {
    // Deliberate: promoting accounts stays with super-admin so a compromised
    // admin cannot mint itself a second super-admin for persistence.
    expect(roleHasPermission(ROLES.ADMIN, PERMISSIONS.USERS_MANAGE)).toBe(false);
    expect(roleHasPermission(ROLES.ADMIN, PERMISSIONS.ROLES_MANAGE)).toBe(false);
  });

  it("gives a viewer no write permission at all", () => {
    const viewer = permissionsForRole(ROLES.VIEWER);
    const writes = viewer.filter((permission) => /\.(create|update|delete|manage|purge)$/.test(permission));

    expect(writes).toEqual([]);
  });

  it("fails closed on an unknown role", () => {
    expect(permissionsForRole("not-a-role")).toEqual([]);
    expect(roleHasPermission(undefined, PERMISSIONS.PROGRAMS_READ)).toBe(false);
  });

  it("ranks roles so lateral and upward edits can be refused", () => {
    expect(outranks(ROLES.SUPER_ADMIN, ROLES.ADMIN)).toBe(true);
    expect(outranks(ROLES.ADMIN, ROLES.ADMIN)).toBe(false);
    expect(outranks(ROLES.EDITOR, ROLES.ADMIN)).toBe(false);
  });
});

describe("permission enforcement over HTTP", () => {
  const probe = guardedApp();

  it("allows a role that holds the permission", async () => {
    await createAdmin({email: "editor@careerveda.test", role: ROLES.EDITOR});
    const {accessToken} = await login(probe, {email: "editor@careerveda.test"});

    const response = await request(probe)
      .get("/probe/needs-publish")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.reached).toBe(true);
  });

  it("refuses a role that lacks the permission", async () => {
    await createAdmin({email: "viewer@careerveda.test", role: ROLES.VIEWER});
    const {accessToken} = await login(probe, {email: "viewer@careerveda.test"});

    const response = await request(probe)
      .get("/probe/needs-publish")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("refuses an editor the delete permission an admin holds", async () => {
    await createAdmin({email: "editor@careerveda.test", role: ROLES.EDITOR});
    const editor = await login(probe, {email: "editor@careerveda.test"});

    const denied = await request(probe)
      .delete("/probe/needs-delete")
      .set("Authorization", `Bearer ${editor.accessToken}`);
    expect(denied.status).toBe(403);

    await createAdmin({email: "admin@careerveda.test", role: ROLES.ADMIN});
    const admin = await login(probe, {email: "admin@careerveda.test"});

    const allowed = await request(probe)
      .delete("/probe/needs-delete")
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(allowed.status).toBe(200);
  });

  it("requires all named permissions, not any of them", async () => {
    // A viewer holds forms.read but not forms.export.
    await createAdmin({email: "viewer@careerveda.test", role: ROLES.VIEWER});
    const {accessToken} = await login(probe, {email: "viewer@careerveda.test"});

    const response = await request(probe)
      .get("/probe/needs-both")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
  });

  it("refuses an unauthenticated request before checking permissions", async () => {
    const response = await request(probe).get("/probe/needs-publish");

    expect(response.status).toBe(401);
  });

  it("restricts super-admin-only routes", async () => {
    await createAdmin({email: "admin@careerveda.test", role: ROLES.ADMIN});
    const admin = await login(probe, {email: "admin@careerveda.test"});

    const denied = await request(probe)
      .post("/probe/needs-super")
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(denied.status).toBe(403);

    await createAdmin({email: "super@careerveda.test", role: ROLES.SUPER_ADMIN});
    const superAdmin = await login(probe, {email: "super@careerveda.test"});

    const allowed = await request(probe)
      .post("/probe/needs-super")
      .set("Authorization", `Bearer ${superAdmin.accessToken}`);
    expect(allowed.status).toBe(200);
  });

  it("applies a role change on the very next request, without waiting for the token to expire", async () => {
    const admin = await createAdmin({email: "editor@careerveda.test", role: ROLES.EDITOR});
    const {accessToken} = await login(probe, {email: "editor@careerveda.test"});

    const before = await request(probe)
      .get("/probe/needs-publish")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(before.status).toBe(200);

    admin.role = ROLES.VIEWER;
    await admin.save();

    // Same token, now demoted. Permissions are resolved from the database on
    // every request rather than read from the token's claims.
    const after = await request(probe)
      .get("/probe/needs-publish")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(after.status).toBe(403);
  });

  it("audits a permission denial", async () => {
    await createAdmin({email: "viewer@careerveda.test", role: ROLES.VIEWER});
    const {accessToken} = await login(probe, {email: "viewer@careerveda.test"});

    await request(probe)
      .get("/probe/needs-publish")
      .set("Authorization", `Bearer ${accessToken}`);

    const entry = await AuditLog.findOne({action: AUDIT_ACTIONS.PERMISSION_DENIED});
    expect(entry).not.toBeNull();
    expect(entry.outcome).toBe("failure");
    expect(entry.metadata.required).toContain(PERMISSIONS.PROGRAMS_UPDATE);
  });
});

describe("privilege escalation via the login payload", () => {
  it("ignores a role supplied in the request body", async () => {
    await createAdmin({email: "viewer@careerveda.test", role: ROLES.VIEWER});

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "viewer@careerveda.test",
        password: "correct-horse-battery-7",
        role: "super-admin",
        permissions: ["users.manage"],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.admin.role).toBe(ROLES.VIEWER);
    expect(response.body.data.admin.permissions).not.toContain("users.manage");
  });
});
