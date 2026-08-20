// TrustedCompanies — the two-row, pure-CSS company-logo marquee.
//
// The file's own comment is the contract: motion is CSS, React only pauses.
// The suite checks the accessible structure first (the real cards are focusable
// and labelled, the duplicated marquee copy is aria-hidden and un-focusable so
// tab order never walks into an invisible subtree) and the pause/resume dance
// second (a tap holds a row, a 4s timeout or a tap outside a card releases it).

import {describe, it, expect, jest, afterEach} from "@jest/globals";
import {render, screen, fireEvent, act} from "@testing-library/react";

import TrustedCompanies from "../../../src/components/TrustedCompanies";
import {logoRows, LOGO_EXTENSIONS} from "../../../src/data/companyLogos";

const section = () => screen.getByRole("region", {name: "Companies that trust CareerVeda"});
const firstRow = (container) => container.querySelector(".tc-row");
const cards = (row) => row.querySelectorAll(".tc-card");

afterEach(() => {
  jest.useRealTimers();
});

describe("TrustedCompanies", () => {
  it("renders the marquee section with an accessible name and its own heading", () => {
    const {container} = render(<TrustedCompanies />);

    expect(section()).toBeInTheDocument();
    expect(container.querySelector(".tc-title").textContent).toMatch(/Trusted by 900\+/);
  });

  it("hides its own heading when the host section already provides one", () => {
    render(<TrustedCompanies showHeading={false} />);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("renders one row per logo row, alternating the scroll direction", () => {
    const {container} = render(<TrustedCompanies />);

    const rows = container.querySelectorAll(".tc-row");
    expect(rows).toHaveLength(logoRows.length);
    expect(rows[0].querySelector(".tc-track")).toHaveClass("tc-track--ltr");
    expect(rows[1].querySelector(".tc-track")).toHaveClass("tc-track--rtl");
  });

  it("renders the real logo sequence as focusable, labelled cards", () => {
    const {container} = render(<TrustedCompanies />);

    const row = firstRow(container);
    const firstCopy = cards(row)[0];
    expect(firstCopy).toHaveAttribute("tabindex", "0");
    expect(firstCopy).toHaveAttribute("aria-label", logoRows[0][0].name);
    expect(row.querySelector("img")).toHaveAttribute("alt", logoRows[0][0].alt);
  });

  it("marks the duplicated marquee copy decorative and un-focusable", () => {
    const {container} = render(<TrustedCompanies />);

    const groups = firstRow(container).querySelectorAll(".tc-group");
    expect(groups).toHaveLength(2);
    expect(groups[1]).toHaveAttribute("aria-hidden", "true");
    expect(groups[1].querySelector(".tc-card")).toHaveAttribute("tabindex", "-1");
  });

  it("starts every card at the first logo format and walks the chain on error", () => {
    const {container} = render(<TrustedCompanies />);

    const logo = firstRow(container).querySelector("img");
    expect(logo.src.endsWith(`.${LOGO_EXTENSIONS[0]}`)).toBe(true);

    fireEvent.error(logo);
    expect(logo.src.endsWith(`.${LOGO_EXTENSIONS[1]}`)).toBe(true);

    fireEvent.error(logo);
    expect(logo.src.endsWith(`.${LOGO_EXTENSIONS[2]}`)).toBe(true);
  });

  it("falls back to the company name as text once every format has failed", () => {
    const {container} = render(<TrustedCompanies />);

    const card = cards(firstRow(container))[0];
    const logo = card.querySelector("img");
    for (let attempt = 0; attempt < LOGO_EXTENSIONS.length; attempt += 1) {
      fireEvent.error(logo);
    }

    expect(card.querySelector(".tc-card__fallback")).toHaveTextContent(logoRows[0][0].name);
    expect(card.querySelector("img")).toBeNull();
  });

  it("touch-pauses the tapped row and auto-resumes it after 4 seconds", () => {
    jest.useFakeTimers();
    const {container} = render(<TrustedCompanies />);

    const row = firstRow(container);
    fireEvent.touchStart(cards(row)[0]);
    expect(row).toHaveClass("is-paused");

    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(row).not.toHaveClass("is-paused");
  });

  it("resumes a paused row on a tap outside any card", () => {
    jest.useFakeTimers();
    const {container} = render(<TrustedCompanies />);

    const row = firstRow(container);
    fireEvent.touchStart(cards(row)[0]);
    expect(row).toHaveClass("is-paused");

    fireEvent.touchStart(document.body);
    expect(row).not.toHaveClass("is-paused");
  });

  it("applies the embedded modifier when the marquee sits inside another section", () => {
    render(<TrustedCompanies embedded />);

    expect(section()).toHaveClass("trusted-companies--embedded");
  });
});