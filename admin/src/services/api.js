
const BASE = import.meta.env.VITE_ADMIN_API_BASE_URL || "http://localhost:8080/api/v1";

let accessToken = null;
let csrfToken = null;

const CSRF_STORAGE_KEY = "cv_csrf_fallback";

// Fired when the session ends for good, so AuthContext can drop the user at the
// login screen without every call site having to handle it.
let onSessionEnded = () => {};

export const setSessionEndedHandler = (handler) => {
  onSessionEnded = handler;
};

const setTokens = ({accessToken: access, csrfToken: csrf}) => {
  if (access !== undefined) accessToken = access;
  if (csrf !== undefined) {
    csrfToken = csrf;
    // Persist the CSRF token so restoreSession can find it even when the
    // cookie is invisible to document.cookie (WebKit cross-port). localStorage,
    // not sessionStorage: every tab shares one refresh cookie, so after one tab
    // rotates the session the others must be able to read the matching token.
    try { localStorage.setItem(CSRF_STORAGE_KEY, csrf); } catch { /* ignored */ }
  }
};

const clearTokens = () => {
  accessToken = null;
  csrfToken = null;
  try { localStorage.removeItem(CSRF_STORAGE_KEY); } catch { /* ignored */ }
};

export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields || {};
  }
}

const parse = async (response) => {
  // 204 and the CSV export are not JSON.
  if (response.status === 204) return null;

  const type = response.headers.get("content-type") || "";
  if (!type.includes("application/json")) return response;

  const body = await response.json();

  if (!response.ok || body.success === false) {
    const error = body.error || {};
    throw new ApiError(response.status, error.code, error.message || "Request failed", error.fields);
  }

  return body;
};


let refreshing = null;

const storedCsrf = () => {
  try { return localStorage.getItem(CSRF_STORAGE_KEY); } catch { return null; }
};

const doRefresh = () => {
  // Another tab may have rotated the session while this one waited for the
  // lock; its CSRF token is the one that matches the cookie now.
  const csrf = storedCsrf() || csrfToken;
  return fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: csrf ? {"X-CSRF-Token": csrf} : {},
  }).then(async (response) => {
    if (!response.ok) throw new ApiError(response.status, "REFRESH_FAILED", "Session expired");
    const body = await response.json();
    setTokens(body.data);
    return body.data;
  });
};

const refreshSession = async () => {
  if (!refreshing) {
    // `refreshing` dedupes within this tab; the Web Lock serialises across
    // tabs. The server treats a refresh token presented twice as theft and
    // ends every session, so two tabs refreshing at once must take turns.
    const run = typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request("cv-auth-refresh", doRefresh)
      : doRefresh();

    refreshing = run.finally(() => {
      refreshing = null;
    });
  }

  return refreshing;
};

const request = async (path, {method = "GET", body, query, retry = true, raw = false} = {}) => {
  const url = new URL(`${BASE}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    }
  }

  const headers = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let payload;
  if (body instanceof FormData) {
    // Do NOT set Content-Type for FormData — the browser has to add the
    // multipart boundary itself, and setting it by hand omits the boundary and
    // makes the server unable to parse the upload.
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, {method, headers, body: payload, credentials: "include"});
  } catch (failure) {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      `Could not reach the API at ${BASE}. Check that the backend is running, then try again.`,
      {cause: failure.message},
    );
  }

  // Access token expired. Refresh once, then replay the original request.
  // `retry` guards against a loop when the refresh itself is what 401s.
  if (response.status === 401 && retry && accessToken) {
    try {
      await refreshSession();
      return request(path, {method, body, query, retry: false, raw});
    } catch {
      clearTokens();
      onSessionEnded();
      throw new ApiError(401, "SESSION_EXPIRED", "Your session has ended. Please sign in again.");
    }
  }

  if (raw) return response;

  return parse(response);
};

export const api = {
  get: (path, query) => request(path, {query}),
  post: (path, body) => request(path, {method: "POST", body}),
  patch: (path, body) => request(path, {method: "PATCH", body}),
  delete: (path) => request(path, {method: "DELETE"}),
  raw: (path, options) => request(path, {...options, raw: true}),
};

// ── Auth ────────────────────────────────────────────────────────────────────

export const login = async (email, password) => {
  const body = await request("/auth/login", {method: "POST", body: {email, password}, retry: false});
  setTokens(body.data);
  return body.data.admin;
};

export const logout = async () => {
  try {
    await fetch(`${BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: csrfToken ? {"X-CSRF-Token": csrfToken} : {},
    });
  } finally {
    // Local state is cleared whether or not the server call succeeded — a user
    // who clicked "sign out" must end up signed out of this browser regardless.
    clearTokens();
  }
};

// Called once on boot. The access token is gone after a page refresh, but the
// httpOnly refresh cookie is not, so this is what makes a reload keep you
// signed in. The CSRF token is read from its (deliberately readable) cookie,
// falling back to localStorage for WebKit which may hide cross-port cookies
// from document.cookie.
export const restoreSession = async () => {
  const cookieCsrf = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("cv_csrf="))
    ?.split("=")[1];

  const csrf = cookieCsrf || storedCsrf();
  if (!csrf) return null;

  csrfToken = csrf;

  try {
    const session = await refreshSession();
    return session.admin;
  } catch {
    clearTokens();
    return null;
  }
};

export const changePassword = (currentPassword, newPassword) =>
  request("/auth/change-password", {method: "POST", body: {currentPassword, newPassword}});

// forgotPassword and resetPassword were here. Self-serve reset is gone from the
// panel and from the API — /auth/forgot-password and /auth/reset-password no
// longer exist, so these wrappers would 404 even if something called them.

export const listSessions = () => api.get("/auth/sessions");
export const revokeSession = (id) => api.delete(`/auth/sessions/${id}`);

// ── Content ─────────────────────────────────────────────────────────────────

export const contentApi = (resource) => ({
  list: (query) => api.get(`/admin/${resource}`, query),
  get: (id) => api.get(`/admin/${resource}/${id}`),
  create: (body) => api.post(`/admin/${resource}`, body),
  update: (id, body) => api.patch(`/admin/${resource}/${id}`, body),
  publish: (id, scheduledAt) => api.post(`/admin/${resource}/${id}/publish`, scheduledAt ? {scheduledAt} : {}),
  unpublish: (id) => api.post(`/admin/${resource}/${id}/unpublish`, {}),
  submitForReview: (id) => api.post(`/admin/${resource}/${id}/submit-review`, {}),
  // Reject is archive with a reason — one transition, one endpoint.
  archive: (id, reason) => api.post(`/admin/${resource}/${id}/archive`, reason ? {reason} : {}),
  remove: (id) => api.delete(`/admin/${resource}/${id}`),
  restore: (id) => api.post(`/admin/${resource}/${id}/restore`, {}),
  purge: (id) => api.delete(`/admin/${resource}/${id}/permanent`),
  duplicate: (id) => api.post(`/admin/${resource}/${id}/duplicate`, {}),
  revisions: (id) => api.get(`/admin/${resource}/${id}/revisions`),
  rollback: (id, revision) => api.post(`/admin/${resource}/${id}/rollback/${revision}`, {}),
  reorder: (items) => api.post(`/admin/${resource}/reorder`, {items}),
  bulkStatus: (ids, status) => api.post(`/admin/${resource}/bulk/status`, {ids, status}),
  bulkDelete: (ids) => api.post(`/admin/${resource}/bulk/delete`, {ids}),
  bulkRestore: (ids) => api.post(`/admin/${resource}/bulk/restore`, {ids}),
});

// ── Media ───────────────────────────────────────────────────────────────────

export const mediaApi = {
  list: (query) => api.get("/admin/media", query),
  upload: (file, {folder, alt} = {}) => {
    const form = new FormData();
    form.append("file", file);
    if (folder) form.append("folder", folder);
    if (alt) form.append("alt", alt);
    return request("/admin/media/upload", {method: "POST", body: form});
  },
  addFromUrl: (url, {folder, alt} = {}) =>
    request("/admin/media/from-url", {method: "POST", body: {url, folder, alt}}),
  update: (id, body) => api.patch(`/admin/media/${id}`, body),
  references: (id) => api.get(`/admin/media/${id}/references`),
  remove: (id) => api.delete(`/admin/media/${id}`),
};

export const leadsApi = {
  list: (query) => api.get("/admin/leads", query),
  update: (id, body) => api.patch(`/admin/leads/${id}`, body),
  remove: (id) => api.delete(`/admin/leads/${id}`),
  addNote: (id, note) => api.post(`/admin/leads/${id}/notes`, {body: note}),
  stats: () => api.get("/admin/leads/stats"),
  // The export is a file download, so it cannot be a plain <a href> — that
  // would be an unauthenticated request with no Bearer header. Fetched with
  // credentials, then handed to the browser as a blob.
  exportCsv: async (query) => {
    const response = await request("/admin/leads/export", {query, raw: true});
    if (!response.ok) throw new ApiError(response.status, "EXPORT_FAILED", "Export failed");
    return response.blob();
  },
};
