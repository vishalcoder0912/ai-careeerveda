// Conversion reporting helpers.
//
// The authoritative lead event is sent by the backend after the Mongo write:
// ad blockers never see it, and it cannot fire for a submission that failed.
// This module does two smaller jobs: attach first-touch attribution to the lead
// payload, and (only when a Google Ads conversion ID is configured) report a
// browser-side Ads conversion so conversion diagnostics have a tag to inspect.
// Leaving the Ads variables blank avoids double counting with the GA4 event.

import {getAttribution} from "./attribution";

const ADS_CONVERSION_ID = import.meta.env.VITE_GOOGLE_ADS_CONVERSION_ID || "";
const ADS_CONVERSION_LABEL = import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL || "";

// Included in the POST body. The backend already has a `utm` field, so the
// five standard parameters stay there; click IDs and session context are new
// nested fields. Sending them together keeps one source of truth in the browser.
export const leadTrackingPayload = () => {
  const attribution = getAttribution();
  if (!attribution) return {};

  return {
    utm: attribution.utm,
    clickIds: attribution.clickIds,
    attribution: {
      referrer: attribution.referrer,
      landingPage: attribution.landingPage,
      clientId: attribution.clientId,
      capturedAt: attribution.capturedAt,
    },
  };
};

export const trackAdsConversion = ({type, source}) => {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  if (!ADS_CONVERSION_ID || !ADS_CONVERSION_LABEL) return;

  const attribution = getAttribution();
  const clickIds = attribution?.clickIds || {};

  window.gtag("event", "conversion", {
    send_to: `${ADS_CONVERSION_ID}/${ADS_CONVERSION_LABEL}`,
    currency: "INR",
    value: 1,
    lead_type: type,
    lead_source: source,
    ...(clickIds.gclid && {gclid: clickIds.gclid}),
    ...(clickIds.gbraid && {gbraid: clickIds.gbraid}),
    ...(clickIds.wbraid && {wbraid: clickIds.wbraid}),
  });
};

// Micro-conversions for GTM/GA4. They are deliberately NOT Ads conversions —
// only the server-sent generate_lead (after the Mongo write) counts as a lead.
// These events exist to show intent before a form is finished, so the params
// stay non-identifying: no name, email or phone ever reaches dataLayer here.
const trackEvent = (name, params) => {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);

  // A proper dataLayer object (gtag pushes `arguments`, which GTM triggers
  // cannot match). Publish a Custom Event trigger on `cv_<name>` in GTM to use
  // these; keep GA4 out of it while index.html loads GA4 directly.
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({event: `cv_${name}`, ...params});
  }
};

export const trackFormStart = ({formType, source, program}) => {
  trackEvent("form_start", {
    form_type: formType,
    form_source: source,
    ...(program && {program}),
  });
};

export const trackApplyNow = ({source, program, destination}) => {
  trackEvent("apply_now", {
    apply_source: source,
    ...(program && {program}),
    ...(destination && {destination}),
  });
};

export const trackWhatsAppClick = ({source, program, pathname}) => {
  trackEvent("whatsapp_click", {
    chat_source: source,
    ...(program && {program}),
    ...(pathname && {page_path: pathname}),
  });
};
