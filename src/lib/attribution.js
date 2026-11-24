// Campaign attribution that survives an SPA navigation.
//
// A visitor can land on /?utm_source=...&gclid=..., read three pages, then fill
// in the form on /enroll. By then the query string is gone, so reading it at
// submit time credits nothing. The first touch is captured once per session and
// carried with the lead. Click IDs are first-touch (the click that brought the
// visitor is the one to credit); UTMs are last non-empty value so a later
// campaign click in the same session can refine the label.

const STORAGE_KEY = "cv-attribution-v1";
const CLIENT_KEY = "cv-client-id";

const UTM_KEYS = ["source", "medium", "campaign", "term", "content"];
// gclid / gbraid / wbraid are Google Ads click IDs. fbclid, dclid and msclkid
// are kept alongside them so a non-Go Ads campaign is not silently discarded.
const CLICK_KEYS = ["gclid", "gbraid", "wbraid", "fbclid", "dclid", "msclkid"];

const clip = (value, max = 200) => String(value || "").trim().slice(0, max);

const readStored = () => {
  try {
    return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

// GA4's _ga cookie is "GA1.1.<client_id>.<timestamp>". Reusing it means a
// server-sent event belongs to the same GA4 client as the visitor's page views;
// without it the event is counted but cannot be joined to the session. When
// analytics_storage is denied the cookie is absent, so fall back to a stable
// local id — Enhanced Conversions still stitches the lead via hashed email.
const clientId = () => {
  const match = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/);
  if (match) {
    const parts = decodeURIComponent(match[1]).split(".");
    const id = parts.slice(2).join(".");
    if (/^\d+\.\d+$/.test(id)) return id;
  }
  try {
    let id = window.localStorage.getItem(CLIENT_KEY);
    if (!id) {
      id = window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `${Date.now()}.${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(CLIENT_KEY, id);
    }
    return id;
  } catch {
    return `${Date.now()}.${Math.random().toString(36).slice(2)}`;
  }
};

// Called at submit time; the write-back is what makes the snapshot cumulative.
export const getAttribution = () => {
  if (typeof window === "undefined") return null;

  const stored = readStored();
  const params = new URLSearchParams(window.location.search);

  const utm = {...(stored.utm || {})};
  for (const key of UTM_KEYS) {
    const value = clip(params.get(`utm_${key}`));
    if (value) utm[key] = value;
  }

  const clickIds = {...(stored.clickIds || {})};
  for (const key of CLICK_KEYS) {
    const value = clip(params.get(key));
    if (value && !clickIds[key]) clickIds[key] = value;
  }

  const attribution = {
    utm,
    clickIds,
    referrer: clip(stored.referrer || document.referrer, 500),
    landingPage: clip(stored.landingPage || `${window.location.pathname}${window.location.search}`, 500),
    capturedAt: stored.capturedAt || new Date().toISOString(),
    clientId: stored.clientId || clientId(),
  };

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Private browsing with storage disabled: the in-memory value still goes
    // with this submission.
  }
  return attribution;
};
