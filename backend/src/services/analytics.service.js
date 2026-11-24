import {createHash} from "node:crypto";

import {env} from "../config/env.js";
import {logger} from "../config/logger.js";

// Server-side GA4 events. A browser can be ad-blocked, closed before its beacon
// flushes, or simply refuse cookies; a confirmed Mongo write cannot. Sending
// from here makes `generate_lead` mean "we actually stored a lead", not "someone
// clicked a button". Google's Measurement Protocol has no failure status for a
// malformed event, so the URL/body below follow the documented field names.

const ENDPOINT = "https://www.google-analytics.com/mp/collect";

// Google requires lowercased, whitespace-free email and E.164 phone numbers
// before hashing. Gmail's dot-insignificant addresses also drop dots before
// the domain so user.name@gmail.com and username@gmail.com match.
const normalizeEmail = (value) => {
  const email = String(value || "").trim().toLowerCase();
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email.replace(/\s/g, "");
  const canonicalDomain = domain === "googlemail.com" ? "gmail.com" : domain;
  const canonicalLocal = canonicalDomain === "gmail.com" ? local.replace(/\./g, "") : local;
  return `${canonicalLocal}@${canonicalDomain}`;
};

const normalizePhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `+91${digits}`; // all public forms are Indian
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return `+${digits}`;
};

export const sha256 = (value) =>
  value ? createHash("sha256").update(value).digest("hex") : undefined;

const userData = (lead) => {
  const email = sha256(normalizeEmail(lead.email));
  const phone = sha256(normalizePhone(lead.mobile));
  if (!email && !phone) return undefined;

  // The singular form is accepted by the API and is easier to read; both are
  // normalised first, so the hash matches Google Ads Enhanced Conversions.
  return {
    ...(email && {sha256_email_address: email}),
    ...(phone && {sha256_phone_number: phone}),
  };
};

const campaignParams = (lead) => {
  const utm = lead.utm || {};
  const attribution = lead.attribution || {};
  const clicks = lead.clickIds || {};
  return {
    ...(utm.source && {utm_source: utm.source}),
    ...(utm.medium && {utm_medium: utm.medium}),
    ...(utm.campaign && {utm_campaign: utm.campaign}),
    ...(utm.term && {utm_term: utm.term}),
    ...(utm.content && {utm_content: utm.content}),
    ...(clicks.gclid && {gclid: clicks.gclid}),
    ...(clicks.gbraid && {gbraid: clicks.gbraid}),
    ...(clicks.wbraid && {wbraid: clicks.wbraid}),
    ...(attribution.landingPage && {page_location: attribution.landingPage}),
    ...(attribution.referrer && {page_referrer: attribution.referrer}),
  };
};

export const analyticsEnabled = () => Boolean(env.GA4_MEASUREMENT_ID && env.GA4_API_SECRET);

// `eventName` is a GA4 key event name to mark in the GA4 UI (generate_lead,
// qualified_lead, admission_confirmed). The function never throws: telemetry
// must never turn a saved lead into a 500 or block an admin status change.
export const sendGa4Event = async (eventName, lead, extraParams = {}) => {
  if (!analyticsEnabled()) return false;

  const attribution = lead.attribution || {};
  const clientId = attribution.clientId || "0000000000.0000000000";
  const data = userData(lead);

  try {
    const url = `${ENDPOINT}?measurement_id=${encodeURIComponent(env.GA4_MEASUREMENT_ID)}&api_secret=${encodeURIComponent(env.GA4_API_SECRET)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
      body: JSON.stringify({
        client_id: clientId,
        // Pairing user-provided data with a stable User-ID improves matching.
        user_id: String(lead._id || lead.id),
        timestamp_micros: Number(new Date(lead.createdAt || Date.now()).getTime()) * 1000,
        events: [
          {
            name: eventName,
            params: {
              currency: "INR",
              value: 1,
              lead_type: lead.type,
              lead_source: lead.source,
              ...campaignParams(lead),
              ...extraParams,
            },
          },
        ],
        ...(data && {user_data: data}),
      }),
    });
    return response.ok;
  } catch (error) {
    logger.warn({err: error}, "GA4 Measurement Protocol event failed");
    return false;
  }
};

// Fire-and-forget wrapper for request handlers. The caller has already written
// to Mongo; a slow Google endpoint must not hold the HTTP response open.
export const reportLeadEvent = (eventName, lead, extraParams) => {
  void sendGa4Event(eventName, lead, extraParams);
};
