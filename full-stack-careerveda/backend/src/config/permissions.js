// The authorization vocabulary, in one place.
//
// Roles do not carry permissions in the token. A request resolves them from
// this table on every call, so demoting someone takes effect on their next
// request rather than whenever their current access token happens to expire.

export const PERMISSIONS = Object.freeze({
  DASHBOARD_READ: "dashboard.read",

  PROGRAMS_READ: "programs.read",
  PROGRAMS_CREATE: "programs.create",
  PROGRAMS_UPDATE: "programs.update",
  PROGRAMS_DELETE: "programs.delete",

  FACULTY_MANAGE: "faculty.manage",
  ALUMNI_MANAGE: "alumni.manage",
  BLOGS_MANAGE: "blogs.manage",
  JOBS_MANAGE: "jobs.manage",
  PAGES_MANAGE: "pages.manage",
  POLICIES_MANAGE: "policies.manage",
  MEDIA_MANAGE: "media.manage",

  FORMS_READ: "forms.read",
  FORMS_UPDATE: "forms.update",
  FORMS_EXPORT: "forms.export",

  USERS_MANAGE: "users.manage",
  ROLES_MANAGE: "roles.manage",
  SETTINGS_MANAGE: "settings.manage",
  AUDIT_READ: "audit.read",

  // Irreversible destruction, kept separate from every *.delete permission so
  // that soft-deleting content and erasing it from the database are different
  // grants. Only super-admin holds this.
  CONTENT_PURGE: "content.purge",
});

const ALL = Object.values(PERMISSIONS);

export const ROLES = Object.freeze({
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  EDITOR: "editor",
  VIEWER: "viewer",
});

// Read-only across the board. A viewer can see the admin panel and nothing else.
const VIEWER_PERMISSIONS = [
  PERMISSIONS.DASHBOARD_READ,
  PERMISSIONS.PROGRAMS_READ,
  PERMISSIONS.FORMS_READ,
];

// Content people. They can write and publish content, but cannot touch other
// accounts, roles, site settings or the audit trail — an editor who is phished
// must not be able to escalate or cover their tracks.
const EDITOR_PERMISSIONS = [
  ...VIEWER_PERMISSIONS,
  PERMISSIONS.PROGRAMS_CREATE,
  PERMISSIONS.PROGRAMS_UPDATE,
  PERMISSIONS.FACULTY_MANAGE,
  PERMISSIONS.ALUMNI_MANAGE,
  PERMISSIONS.BLOGS_MANAGE,
  PERMISSIONS.JOBS_MANAGE,
  PERMISSIONS.PAGES_MANAGE,
  PERMISSIONS.MEDIA_MANAGE,
];

// Everything operational: content, deletion, leads, settings, audit review.
// Still not users/roles — promoting an account stays with super-admin, so a
// compromised admin cannot mint a second super-admin for persistence.
const ADMIN_PERMISSIONS = [
  ...EDITOR_PERMISSIONS,
  PERMISSIONS.PROGRAMS_DELETE,
  PERMISSIONS.POLICIES_MANAGE,
  PERMISSIONS.FORMS_UPDATE,
  PERMISSIONS.FORMS_EXPORT,
  PERMISSIONS.SETTINGS_MANAGE,
  PERMISSIONS.AUDIT_READ,
];

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.VIEWER]: Object.freeze(VIEWER_PERMISSIONS),
  [ROLES.EDITOR]: Object.freeze(EDITOR_PERMISSIONS),
  [ROLES.ADMIN]: Object.freeze(ADMIN_PERMISSIONS),
  [ROLES.SUPER_ADMIN]: Object.freeze(ALL),
});

export const ROLE_NAMES = Object.values(ROLES);

// Unknown role returns an empty list, never a permissive default: a typo in the
// database must fail closed.
//
// hasOwn, not a bare lookup: `ROLE_PERMISSIONS["__proto__"]` reads the inherited
// accessor and hands back Object.prototype, which is truthy, so `|| []` never
// fires and the caller gets an object where it expects an array. "constructor"
// and "toString" do the same. roleHasPermission would then call .includes() on a
// non-array and throw a 500 instead of denying — failing open at the boundary
// this line exists to close.
export const permissionsForRole = (role) =>
  (Object.hasOwn(ROLE_PERMISSIONS, role) ? ROLE_PERMISSIONS[role] : null) || [];

export const roleHasPermission = (role, permission) =>
  permissionsForRole(role).includes(permission);

// Ranking exists only to stop lateral and upward privilege edits: you may not
// create, promote or delete an account at or above your own level.
const RANK = {[ROLES.VIEWER]: 1, [ROLES.EDITOR]: 2, [ROLES.ADMIN]: 3, [ROLES.SUPER_ADMIN]: 4};

// Same inherited-key hazard as permissionsForRole: an unranked name must be 0,
// not Object.prototype, or `outranks` compares an object against a number.
export const rankOf = (role) => (Object.hasOwn(RANK, role) ? RANK[role] : 0) || 0;

export const outranks = (actorRole, targetRole) => rankOf(actorRole) > rankOf(targetRole);
