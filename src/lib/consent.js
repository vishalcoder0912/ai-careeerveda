// Google Consent Mode v2 state. index.html sets the same four defaults before
// GTM loads; this module stores the visitor's choice and sends the update call
// immediately, both on first choice and whenever they change it later.

export const CONSENT_KEY = "cv-cookie-consent-v1";

export const DENIED = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
};

export const GRANTED = {
  ad_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "granted",
  analytics_storage: "granted",
};

export const CONSENT_EVENT = "cv:consent-changed";
export const OPEN_CONSENT_EVENT = "cv:open-consent";

const keys = Object.keys(DENIED);

export const readConsent = () => {
  try {
    const value = JSON.parse(window.localStorage.getItem(CONSENT_KEY));
    if (!value || typeof value !== "object") return null;
    // Any shape we did not write is treated as "no choice yet", so a corrupt
    // or hand-edited value can never silently grant consent.
    return keys.every((key) => value[key] === "granted" || value[key] === "denied") ? value : null;
  } catch {
    return null;
  }
};

export const saveConsent = (choice) => {
  const state = choice === "all" ? {...GRANTED} : {...DENIED};
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
  } catch {
    // Storage disabled: the choice still applies to this page view.
  }
  if (typeof window.gtag === "function") window.gtag("consent", "update", state);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, {detail: state}));
  return state;
};

export const openConsentSettings = () => window.dispatchEvent(new CustomEvent(OPEN_CONSENT_EVENT));
