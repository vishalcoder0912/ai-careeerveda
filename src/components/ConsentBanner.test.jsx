import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import ConsentBanner from "./ConsentBanner";
import {CONSENT_KEY, DENIED, GRANTED, readConsent} from "../lib/consent";

const renderBanner = () =>
  render(
    <MemoryRouter>
      <ConsentBanner />
    </MemoryRouter>,
  );

beforeEach(() => {
  window.localStorage.clear();
  window.gtag = vi.fn();
});

afterEach(cleanup);

describe("ConsentBanner", () => {
  it("asks a first-time visitor to choose", () => {
    renderBanner();
    expect(screen.getByText("Your privacy, your choice")).toBeTruthy();
    expect(screen.getByRole("button", {name: "Accept all"})).toBeTruthy();
    expect(screen.getByRole("button", {name: "Reject optional"})).toBeTruthy();
  });

  it("sends granted consent to Google and remembers the choice", () => {
    renderBanner();
    fireEvent.click(screen.getByRole("button", {name: "Accept all"}));

    expect(window.gtag).toHaveBeenCalledWith("consent", "update", GRANTED);
    expect(readConsent()).toEqual(GRANTED);
    expect(screen.queryByText("Your privacy, your choice")).toBeNull();
  });

  it("denies all optional signals when the visitor rejects", () => {
    renderBanner();
    fireEvent.click(screen.getByRole("button", {name: "Reject optional"}));

    expect(window.gtag).toHaveBeenCalledWith("consent", "update", DENIED);
    expect(JSON.parse(window.localStorage.getItem(CONSENT_KEY))).toEqual(DENIED);
  });
});
