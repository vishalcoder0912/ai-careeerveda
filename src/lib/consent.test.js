import {beforeEach, describe, expect, it, vi} from "vitest";

import {
  CONSENT_EVENT,
  CONSENT_KEY,
  DENIED,
  GRANTED,
  OPEN_CONSENT_EVENT,
  openConsentSettings,
  readConsent,
  saveConsent,
} from "./consent";

beforeEach(() => {
  window.localStorage.clear();
  window.gtag = vi.fn();
});

describe("consent state", () => {
  it("treats missing or malformed storage as no choice yet", () => {
    expect(readConsent()).toBeNull();
    window.localStorage.setItem(CONSENT_KEY, "{not json");
    expect(readConsent()).toBeNull();
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ad_storage: "yes"}));
    expect(readConsent()).toBeNull();
  });

  it("sends all four Consent Mode v2 signals on accept and on reject", () => {
    expect(saveConsent("all")).toEqual(GRANTED);
    expect(window.gtag).toHaveBeenCalledWith("consent", "update", GRANTED);
    expect(readConsent()).toEqual(GRANTED);

    expect(saveConsent("optional")).toEqual(DENIED);
    expect(window.gtag).toHaveBeenLastCalledWith("consent", "update", DENIED);
  });

  it("notifies the banner so a later choice updates an already-open dialog", () => {
    const listener = vi.fn();
    window.addEventListener(CONSENT_EVENT, listener);
    saveConsent("all");
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(CONSENT_EVENT, listener);
  });

  it("reopens the banner from the footer link", () => {
    const listener = vi.fn();
    window.addEventListener(OPEN_CONSENT_EVENT, listener);
    openConsentSettings();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(OPEN_CONSENT_EVENT, listener);
  });
});
