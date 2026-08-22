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

const DEFAULT_BASE = import.meta.env.DEV ? "http://localhost:8080/api/v1" : "";

// Trailing slashes are stripped so `${BASE}/public/programs` never doubles up.
export const API_BASE = String(import.meta.env.VITE_PUBLIC_API_BASE_URL || DEFAULT_BASE).replace(
  /\/+$/,
  "",
);

// With no base URL the site runs entirely off its static data files. That is
// the deliberate fallback, not a failure: a deploy that has not been pointed at
// a backend yet still renders every page.
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

  const url = new URL(`${API_BASE}${path}`);
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
// replaces the `consultations` and `enrollments` collections the serverless
// functions in api/ used to write, so the admin panel's Leads inbox sees every
// submission instead of only some of them.
//
// With no backend configured the submission goes to the Vercel serverless
// function it always went to (api/consultation.js, api/enroll.js), which writes
// to MongoDB directly. That path predates the backend and stays as the floor,
// so a deploy that has not been pointed at the API yet still captures leads
// rather than dropping them — a silently lost lead is the worst outcome here.
//
// Returns {ok, errors, message} either way, so the two endpoints are
// interchangeable at the call site.
export const submitLead = async (payload, {legacyEndpoint} = {}) => {
  const url = isApiConfigured ? `${API_BASE}/public/leads` : legacyEndpoint;

  if (!url) {
    return {ok: false, message: "Submissions aren't configured yet. Please try again later.", errors: {}};
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload),
  });

  if (response.status === 204) return {ok: true};

  const body = await response.json().catch(() => null);

  if (response.ok && body?.success !== false) return {ok: true};

  const error = body?.error || {};

  return {
    ok: false,
    status: response.status,
    // `error.message` is the backend's envelope; `body.error` as a bare string
    // is the serverless function's. Both are read so either endpoint's message
    // reaches the visitor.
    message:
      error.message ||
      (typeof body?.error === "string" ? body.error : "") ||
      "We couldn't save your details. Please try again.",
    // The API reports per-field problems as {fields: {email: "..."}}; the
    // serverless function as {errors: {...}}. The forms expect `errors`.
    errors: error.fields || body?.errors || {},
  };
};
