import {describe, expect, it} from "@jest/globals";
import {
  PERMISSIONS,
  ROLES,
  ROLE_NAMES,
  outranks,
  permissionsForRole,
  rankOf,
  roleHasPermission,
} from "../../src/config/permissions.js";

// This table is the authorization vocabulary. The tests that matter here are the
// ones that would catch a privilege being widened by accident — an editor
// gaining users.manage, a viewer gaining a write — so each is written as the
// escalation it prevents, not as a copy of the list.

describe("permissionsForRole", () => {
  it("fails closed on an unknown role", () => {
    // A typo in the database must not become a permissive default.
    expect(permissionsForRole("editorr")).toEqual([]);
    expect(permissionsForRole(undefined)).toEqual([]);
    expect(permissionsForRole(null)).toEqual([]);
    expect(permissionsForRole("")).toEqual([]);
  });

  it("fails closed on inherited object keys, not just unknown words", () => {
    // A bare `map[role] || []` hands back Object.prototype for these, which is
    // truthy — so the fallback never fires and roleHasPermission throws on
    // .includes() instead of denying.
    for (const key of ["__proto__", "constructor", "toString", "hasOwnProperty", "valueOf"]) {
      expect(permissionsForRole(key)).toEqual([]);
      expect(Array.isArray(permissionsForRole(key))).toBe(true);
      expect(roleHasPermission(key, PERMISSIONS.PROGRAMS_READ)).toBe(false);
      expect(rankOf(key)).toBe(0);
    }
  });

  it("gives super-admin every permission defined", () => {
    // Copy before sorting — the returned list is frozen, and sort mutates.
    expect([...permissionsForRole(ROLES.SUPER_ADMIN)].sort()).toEqual(
      [...Object.values(PERMISSIONS)].sort(),
    );
  });

  it("nests the roles: viewer ⊂ editor ⊂ admin ⊂ super-admin", () => {
    const viewer = permissionsForRole(ROLES.VIEWER);
    const editor = permissionsForRole(ROLES.EDITOR);
    const admin = permissionsForRole(ROLES.ADMIN);
    const superAdmin = permissionsForRole(ROLES.SUPER_ADMIN);

    for (const p of viewer) expect(editor).toContain(p);
    for (const p of editor) expect(admin).toContain(p);
    for (const p of admin) expect(superAdmin).toContain(p);
  });

  it("returns a frozen list, so a caller cannot grant itself a permission", () => {
    const editor = permissionsForRole(ROLES.EDITOR);

    expect(Object.isFrozen(editor)).toBe(true);
    expect(() => {
      "use strict";
      editor.push(PERMISSIONS.USERS_MANAGE);
    }).toThrow();
  });
});

describe("roleHasPermission", () => {
  it("keeps a viewer read-only", () => {
    expect(roleHasPermission(ROLES.VIEWER, PERMISSIONS.PROGRAMS_READ)).toBe(true);
    expect(roleHasPermission(ROLES.VIEWER, PERMISSIONS.DASHBOARD_READ)).toBe(true);
    expect(roleHasPermission(ROLES.VIEWER, PERMISSIONS.FORMS_READ)).toBe(true);

    expect(roleHasPermission(ROLES.VIEWER, PERMISSIONS.PROGRAMS_CREATE)).toBe(false);
    expect(roleHasPermission(ROLES.VIEWER, PERMISSIONS.PROGRAMS_UPDATE)).toBe(false);
    expect(roleHasPermission(ROLES.VIEWER, PERMISSIONS.MEDIA_MANAGE)).toBe(false);
  });

  it("stops a phished editor from escalating or covering their tracks", () => {
    // The whole point of the editor role: content yes, accounts and audit no.
    expect(roleHasPermission(ROLES.EDITOR, PERMISSIONS.BLOGS_MANAGE)).toBe(true);
    expect(roleHasPermission(ROLES.EDITOR, PERMISSIONS.PROGRAMS_UPDATE)).toBe(true);

    expect(roleHasPermission(ROLES.EDITOR, PERMISSIONS.USERS_MANAGE)).toBe(false);
    expect(roleHasPermission(ROLES.EDITOR, PERMISSIONS.ROLES_MANAGE)).toBe(false);
    expect(roleHasPermission(ROLES.EDITOR, PERMISSIONS.AUDIT_READ)).toBe(false);
    expect(roleHasPermission(ROLES.EDITOR, PERMISSIONS.SETTINGS_MANAGE)).toBe(false);
    expect(roleHasPermission(ROLES.EDITOR, PERMISSIONS.PROGRAMS_DELETE)).toBe(false);
  });

  it("stops a compromised admin from minting a second super-admin", () => {
    expect(roleHasPermission(ROLES.ADMIN, PERMISSIONS.USERS_MANAGE)).toBe(false);
    expect(roleHasPermission(ROLES.ADMIN, PERMISSIONS.ROLES_MANAGE)).toBe(false);
  });

  it("gives admin the operational grants an editor lacks", () => {
    expect(roleHasPermission(ROLES.ADMIN, PERMISSIONS.PROGRAMS_DELETE)).toBe(true);
    expect(roleHasPermission(ROLES.ADMIN, PERMISSIONS.FORMS_EXPORT)).toBe(true);
    expect(roleHasPermission(ROLES.ADMIN, PERMISSIONS.AUDIT_READ)).toBe(true);
    expect(roleHasPermission(ROLES.ADMIN, PERMISSIONS.POLICIES_MANAGE)).toBe(true);
  });

  it("reserves irreversible purge for super-admin alone", () => {
    // Soft-delete and erase-from-the-database are deliberately different grants.
    expect(roleHasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.CONTENT_PURGE)).toBe(true);
    expect(roleHasPermission(ROLES.ADMIN, PERMISSIONS.CONTENT_PURGE)).toBe(false);
    expect(roleHasPermission(ROLES.EDITOR, PERMISSIONS.CONTENT_PURGE)).toBe(false);
    expect(roleHasPermission(ROLES.VIEWER, PERMISSIONS.CONTENT_PURGE)).toBe(false);
  });

  it("returns false for an unknown role or an unknown permission", () => {
    expect(roleHasPermission("ghost", PERMISSIONS.PROGRAMS_READ)).toBe(false);
    expect(roleHasPermission(ROLES.SUPER_ADMIN, "not.a.permission")).toBe(false);
  });
});

describe("rankOf / outranks", () => {
  it("ranks the roles in order", () => {
    expect(rankOf(ROLES.VIEWER)).toBe(1);
    expect(rankOf(ROLES.EDITOR)).toBe(2);
    expect(rankOf(ROLES.ADMIN)).toBe(3);
    expect(rankOf(ROLES.SUPER_ADMIN)).toBe(4);
  });

  it("ranks an unknown role 0, below everything", () => {
    expect(rankOf("ghost")).toBe(0);
    expect(rankOf(undefined)).toBe(0);
    expect(outranks("ghost", ROLES.VIEWER)).toBe(false);
  });

  it("refuses lateral edits — you cannot act on your own level", () => {
    for (const role of ROLE_NAMES) {
      expect(outranks(role, role)).toBe(false);
    }
  });

  it("refuses upward edits", () => {
    expect(outranks(ROLES.EDITOR, ROLES.ADMIN)).toBe(false);
    expect(outranks(ROLES.ADMIN, ROLES.SUPER_ADMIN)).toBe(false);
    expect(outranks(ROLES.VIEWER, ROLES.SUPER_ADMIN)).toBe(false);
  });

  it("permits downward edits", () => {
    expect(outranks(ROLES.SUPER_ADMIN, ROLES.ADMIN)).toBe(true);
    expect(outranks(ROLES.ADMIN, ROLES.EDITOR)).toBe(true);
    expect(outranks(ROLES.EDITOR, ROLES.VIEWER)).toBe(true);
  });
});

describe("the vocabulary itself", () => {
  it("freezes PERMISSIONS and ROLES against mutation at runtime", () => {
    expect(Object.isFrozen(PERMISSIONS)).toBe(true);
    expect(Object.isFrozen(ROLES)).toBe(true);
  });

  it("lists exactly the four known roles", () => {
    expect([...ROLE_NAMES].sort()).toEqual(["admin", "editor", "super-admin", "viewer"]);
  });

  it("has no duplicate permission strings", () => {
    const all = Object.values(PERMISSIONS);

    expect(new Set(all).size).toBe(all.length);
  });

  it("grants every declared permission to at least one role", () => {
    // A permission no role holds is dead code guarding a live endpoint.
    for (const permission of Object.values(PERMISSIONS)) {
      const holders = ROLE_NAMES.filter((role) => roleHasPermission(role, permission));
      expect(holders.length).toBeGreaterThan(0);
    }
  });
});
