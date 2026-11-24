

import {CONSENT_EVENT, readConsent} from "./consent";

export const ADSENSE_CLIENT_ID = (import.meta.env.VITE_ADSENSE_CLIENT_ID || "").trim();
export const ADSENSE_SLOT_ID = (import.meta.env.VITE_ADSENSE_AD_SLOT || "").trim();

const SCRIPT_ID = "cv-adsense-loader";

export const adsAllowed = () => readConsent()?.ad_storage === "granted";

export const loadAdsense = () => {
  if (!ADSENSE_CLIENT_ID) return false;
  if (typeof document === "undefined" || !adsAllowed()) return false;
  if (document.getElementById(SCRIPT_ID)) return true;

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT_ID)}`;
  document.head.appendChild(script);
  return true;
};

// Installed once for the whole SPA so every route is covered, including pages
// created in the admin after the last build. Returns a cleanup for tests.
export const initAdsense = () => {
  loadAdsense();
  if (typeof window === "undefined") return () => {};

  const onChange = () => loadAdsense();
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_EVENT, onChange);
};
