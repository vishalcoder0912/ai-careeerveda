import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {CONSENT_EVENT, CONSENT_KEY, GRANTED} from "./consent";

// The client ID is read at module load, like the real browser bundle, so each
// case re-imports the module after setting the environment.
const load = async () => {
  vi.resetModules();
  return import("./adsense");
};

const grantAds = () => window.localStorage.setItem(CONSENT_KEY, JSON.stringify(GRANTED));

beforeEach(() => {
  window.localStorage.clear();
  document.getElementById("cv-adsense-loader")?.remove();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AdSense loader", () => {
  it("injects nothing when no publisher ID is configured", async () => {
    grantAds();
    const {loadAdsense} = await load();

    expect(loadAdsense()).toBe(false);
    expect(document.getElementById("cv-adsense-loader")).toBeNull();
  });

  it("waits for ad consent before loading the script", async () => {
    vi.stubEnv("VITE_ADSENSE_CLIENT_ID", "pub-1234567890123456");
    const {loadAdsense} = await load();

    expect(loadAdsense()).toBe(false);
    expect(document.getElementById("cv-adsense-loader")).toBeNull();

    grantAds();
    expect(loadAdsense()).toBe(true);

    const script = document.getElementById("cv-adsense-loader");
    expect(script.src).toBe(
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=pub-1234567890123456",
    );
    expect(script.crossOrigin).toBe("anonymous");
  });

  it("never injects the script twice", async () => {
    vi.stubEnv("VITE_ADSENSE_CLIENT_ID", "pub-1234567890123456");
    grantAds();
    const {loadAdsense} = await load();

    expect(loadAdsense()).toBe(true);
    expect(loadAdsense()).toBe(true);
    expect(document.querySelectorAll("#cv-adsense-loader")).toHaveLength(1);
  });

  it("loads when consent is granted later in the session", async () => {
    vi.stubEnv("VITE_ADSENSE_CLIENT_ID", "pub-1234567890123456");
    const {initAdsense} = await load();
    const stop = initAdsense();

    expect(document.getElementById("cv-adsense-loader")).toBeNull();

    grantAds();
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, {detail: GRANTED}));

    expect(document.getElementById("cv-adsense-loader")).not.toBeNull();
    stop();
  });
});
