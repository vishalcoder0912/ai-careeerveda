import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {
  leadTrackingPayload,
  trackApplyNow,
  trackFormStart,
  trackWhatsAppClick,
} from "./analytics";

const setSearch = (search = "") => window.history.replaceState({}, "", `/${search}`);

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  setSearch();
  window.gtag = vi.fn();
  window.dataLayer = [];
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("leadTrackingPayload", () => {
  it("attaches first-touch attribution to the lead POST body", () => {
    setSearch("?utm_source=google&gclid=abc123");

    expect(leadTrackingPayload()).toMatchObject({
      utm: {source: "google"},
      clickIds: {gclid: "abc123"},
      attribution: {clientId: expect.any(String)},
    });
  });
});

describe("trackAdsConversion", () => {
  it("stays silent when no Google Ads conversion action is configured", async () => {
    const {trackAdsConversion} = await import("./analytics");
    trackAdsConversion({type: "consultation", source: "home-consultation-form"});
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it("reports a conversion with click IDs when Ads variables are set", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_GOOGLE_ADS_CONVERSION_ID", "AW-123456789");
    vi.stubEnv("VITE_GOOGLE_ADS_CONVERSION_LABEL", "leadLabel");
    setSearch("?gclid=abc123");
    const {trackAdsConversion} = await import("./analytics");

    trackAdsConversion({type: "enrollment", source: "enroll-page-form"});

    expect(window.gtag).toHaveBeenCalledWith(
      "event",
      "conversion",
      expect.objectContaining({
        send_to: "AW-123456789/leadLabel",
        lead_type: "enrollment",
        gclid: "abc123",
      }),
    );
  });
});

describe("micro-conversion events", () => {
  it("reports form_start without sending any contact details", () => {
    trackFormStart({formType: "enrollment", source: "enroll-page-form", program: "Product Management"});

    expect(window.gtag).toHaveBeenCalledWith("event", "form_start", {
      form_type: "enrollment",
      form_source: "enroll-page-form",
      program: "Product Management",
    });
  });

  it("pushes a GTM-consumable custom event without contact details", () => {
    trackFormStart({formType: "enrollment", source: "enroll-page-form"});

    expect(window.dataLayer).toContainEqual({
      event: "cv_form_start",
      form_type: "enrollment",
      form_source: "enroll-page-form",
    });
  });

  it("reports apply_now with the CTA source and destination", () => {
    trackApplyNow({source: "navbar-cta", destination: "/enroll"});

    expect(window.gtag).toHaveBeenCalledWith("event", "apply_now", {
      apply_source: "navbar-cta",
      destination: "/enroll",
    });
  });

  it("reports whatsapp_click with the page path", () => {
    trackWhatsAppClick({source: "floating-button", pathname: "/programs/product-management"});

    expect(window.gtag).toHaveBeenCalledWith("event", "whatsapp_click", {
      chat_source: "floating-button",
      page_path: "/programs/product-management",
    });
  });
});
