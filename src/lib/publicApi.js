// The public site's one door to the backend.
//
// Everything the admin panel publishes reaches the browser through here:
// /api/v1/public/<resource> is the same registry (backend/src/config/resources.js)
// the admin CRUD routes are built from, so a resource that exists in the panel
// exists here without a second list to keep in step.
//
// No credentials, no tokens. These are cacheable GETs of published content —
// the one exception is submitLead, which is the API's only unauthenticated
// write and is rate-limited server-side.

// In dev the site calls the Vite server same-origin and Vite proxies /api to the
// backend (see vite.config.js). Production deployments are typically served
// behind the same-origin /api proxy too, so default to /api/v1 unless an
// explicit absolute API URL is provided.
const DEFAULT_BASE = "/api/v1";

// Trailing slashes are stripped so `${BASE}/public/programs` never doubles up.
export const API_BASE = String(import.meta.env.VITE_PUBLIC_API_BASE_URL || DEFAULT_BASE).replace(
  /\/+$/,
  "",
);

// Admin-managed content (policies, programs, etc.) is served by the backend.
// Keep this truthy with the default base so the site fetches live content instead
// of silently rendering bundled static copies that can drift from the admin panel.
export const isApiConfigured = Boolean(API_BASE);

// A slow API must never hold a page hostage — the static fallback is already on
// screen, so an unanswered request is simply abandoned.
const TIMEOUT_MS = 8000;

// Every read reports two different things, and conflating them is what makes a
// deleted record refuse to disappear:
//
//   reachable: false  the server did not answer (down, CORS, offline, timeout).
//                     We know nothing, so the caller keeps its static copy.
//   reachable: true   the server answered. Its answer is the truth — including
//                     "no such record" and "the list is empty", which is what an
//                     admin unpublishing or deleting something looks like from
//                     out here.
const UNREACHABLE = {reachable: false, data: null};

const requestJson = async (path, {params, signal} = {}) => {
  if (!isApiConfigured) return UNREACHABLE;

  // API_BASE may be relative ("/api/v1"), so resolve it against the page. An
  // absolute API_BASE ignores the base argument.
  const origin =
    typeof window !== "undefined" && window.location ? window.location.origin : "http://localhost";
  const url = new URL(`${API_BASE}${path}`, origin);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // An external abort (the component unmounted) has to reach our controller
  // too, or the fetch outlives the thing that wanted it.
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {Accept: "application/json"},
    });

    // A 404 is an answer, not a failure: the record is unpublished, deleted, or
    // never existed. Anything else in the 4xx/5xx range means the server could
    // not tell us, so it is treated as unreachable.
    if (response.status === 404) return {reachable: true, data: null};
    if (!response.ok) return UNREACHABLE;

    const body = await response.json();
    if (!body || body.success !== true) return UNREACHABLE;

    return {reachable: true, data: body.data, meta: body.meta};
  } catch {
    // Network down, CORS refused, backend asleep, request aborted — all the
    // same answer to the caller: we learned nothing, keep the fallback.
    return UNREACHABLE;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
};

// A published-content listing.
//
// {reachable, items}. An empty `items` from a reachable server is a real answer:
// the admin has unpublished or deleted everything of that type. Only
// `reachable: false` means "we don't know".
export const fetchList = async (resource, {params, signal} = {}) => {
  const body = await requestJson(`/public/${resource}`, {
    params: {limit: 100, ...params},
    signal,
  });

  if (!body.reachable) return {reachable: false, items: null};

  return {reachable: true, items: Array.isArray(body.data) ? body.data : []};
};

// One record by slug. {reachable, record}. A draft, a deleted record and a slug
// that never existed all arrive as reachable with a null record — the public
// endpoint refuses to distinguish them, so that nobody can enumerate unpublished
// content by guessing slugs.
export const fetchOne = async (resource, slug, {signal} = {}) => {
  if (!slug) return {reachable: true, record: null};

  const body = await requestJson(`/public/${resource}/${encodeURIComponent(slug)}`, {signal});

  if (!body.reachable) return {reachable: false, record: null};

  return {reachable: true, record: body.data ?? null};
};

// ── Leads ───────────────────────────────────────────────────────────────────
 
// The consultation and enrol forms both post here. The backend's Lead model
// replaces the `consultations` and `enrollments` collections, so the admin
// panel's Leads inbox sees every submission instead of only some of them.
//
// Returns {ok, errors, message}.
export const submitLead = (payload) => postForm("/public/leads", payload);

// The "Apply with CareerVeda" form on /jobs. Same shape and return as submitLead.
export const submitJobApplication = (payload) => postForm("/public/job-applications", payload);

// The backend accepts Idempotency-Key and stores it on the lead. Keep one key
// per attempt in sessionStorage: a retry after a timeout then replays the same
// key instead of creating a second lead, while a genuinely new enquiry gets a
// new key. Cleared on success so a later intentional submission is independent.
const submissionKeySlot = (path, payload) =>
  `cv-submit-${path.replace(/\W/g, "")}-${String(payload.mobile || payload.email || "anonymous").slice(-40)}`;

const newSubmissionKey = () =>
  window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const submissionKey = (path, payload) => {
  if (typeof window === "undefined") return newSubmissionKey();
  const slot = submissionKeySlot(path, payload);
  try {
    const existing = window.sessionStorage.getItem(slot);
    if (existing) return existing;
    const key = newSubmissionKey();
    window.sessionStorage.setItem(slot, key);
    return key;
  } catch {
    return newSubmissionKey();
  }
};

const clearSubmissionKey = (path, payload) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(submissionKeySlot(path, payload));
  } catch {
    // Storage disabled: the key was never persisted.
  }
};

const postForm = async (path, payload) => {
  if (!isApiConfigured) {
    return {ok: false, message: "Submissions aren't configured yet. Please try again later.", errors: {}};
  }

  // Same cap as the reads. Without it a stalled connection leaves the form on
  // "Sending…" until the browser gives up minutes later, which looks like a
  // dead button; the callers turn the abort into their visible network error.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const key = submissionKey(path, payload);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (response.status === 204) {
      clearSubmissionKey(path, payload);
      return {ok: true};
    }

    const body = await response.json().catch(() => null);

    if (response.ok && body?.success !== false) {
      clearSubmissionKey(path, payload);
      return {ok: true};
    }

    const error = body?.error || {};

    return {
      ok: false,
      status: response.status,
      message:
        error.message ||
        (typeof body?.error === "string" ? body.error : "") ||
        "We couldn't save your details. Please try again.",
      errors: error.fields || body?.errors || {},
    };
  } finally {
    clearTimeout(timer);
  }
};
