import {cleanup, render} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {CONSENT_KEY, GRANTED} from "../lib/consent";

const unit = async () => {
  vi.resetModules();
  const {default: AdUnit} = await import("./AdUnit");
  return render(<AdUnit />);
};

beforeEach(() => {
  window.localStorage.clear();
  window.adsbygoogle = [];
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("AdUnit", () => {
  it("renders nothing without a publisher ID and slot", async () => {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(GRANTED));
    const {container} = await unit();

    expect(container.querySelector(".cv-ad-unit")).toBeNull();
  });

  it("renders a responsive slot with the configured IDs after consent", async () => {
    vi.stubEnv("VITE_ADSENSE_CLIENT_ID", "pub-1234567890123456");
    vi.stubEnv("VITE_ADSENSE_AD_SLOT", "1234567890");
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(GRANTED));

    const {container} = await unit();
    const ins = container.querySelector("ins.adsbygoogle");

    expect(ins).not.toBeNull();
    expect(ins.getAttribute("data-ad-client")).toBe("pub-1234567890123456");
    expect(ins.getAttribute("data-ad-slot")).toBe("1234567890");
    expect(ins.getAttribute("data-full-width-responsive")).toBe("true");
    expect(window.adsbygoogle).toHaveLength(1);
  });

  it("stays invisible when advertising consent was refused", async () => {
    vi.stubEnv("VITE_ADSENSE_CLIENT_ID", "pub-1234567890123456");
    vi.stubEnv("VITE_ADSENSE_AD_SLOT", "1234567890");

    const {container} = await unit();

    expect(container.querySelector(".cv-ad-unit")).toBeNull();
    expect(window.adsbygoogle).toHaveLength(0);
  });
});
