// The navbar's high-level behaviour: what a visitor can open and close, and how
// the mobile drawer is wired.
//
// useLocation is provided by a real MemoryRouter so the active route marking is
// exercised. The dialog's showModal() is a real DOM method that jsdom does not
// implement, so the test stubs it and asserts the component calls it when the
// menu opens. MatchMedia is stubbed to report "no reduced motion", so the menu
// close runs its timed exit rather than the instant path.

import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {render, screen, cleanup, fireEvent, act, within} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";

const {default: SiteNavbar} = await import("./SiteNavbar");
const {externalLinks} = await import("../config/externalLinks");

const NAV_ITEMS = [
  ["/programs", "Programs"],
  ["/alumni", "Alumni"],
  ["/jobs", "Jobs"],
  ["/faculty", "Faculty"],
  ["/blog", "Blog"],
  ["/about", "About"],
];

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));

  // jsdom lacks HTMLDialogElement::showModal/close. Make them set and clear the
  // `open` attribute like the real browser does; a closed <dialog> is
  // display:none, so without this the drawer's contents are unqueryable.
  if (typeof HTMLDialogElement !== "undefined") {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

const renderNavbar = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SiteNavbar navItems={NAV_ITEMS} />
    </MemoryRouter>,
  );

const openMenu = () => fireEvent.click(screen.getByRole("button", {name: "Open menu"}));

const drawer = () => within(screen.getByRole("dialog"));

describe("SiteNavbar desktop rail", () => {
  it("renders a link for every nav item", () => {
    renderNavbar();

    for (const [, label] of NAV_ITEMS) {
      expect(screen.getByRole("link", {name: label})).toBeDefined();
    }
  });

  it("marks the link for the current route as active", () => {
    renderNavbar("/alumni");

    const alumni = screen.getByRole("link", {name: "Alumni"});
    expect(alumni.getAttribute("aria-current")).toBe("page");
    expect(alumni.className).toContain("is-active");

    const programs = screen.getByRole("link", {name: "Programs"});
    expect(programs.getAttribute("aria-current")).toBeNull();
  });

  it("exposes the brand lockup link to the home route", () => {
    renderNavbar();

    const brand = screen.getByRole("link", {name: "CareerVeda Home"});
    expect(brand.getAttribute("href")).toBe("/");
  });
});

describe("SiteNavbar mobile menu", () => {
  it("opens the drawer and calls showModal from the hamburger", () => {
    renderNavbar();

    expect(screen.queryByRole("dialog")).toBeNull();

    openMenu();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    expect(dialog.className).toContain("mobile-menu-overlay");
    expect(dialog.hasAttribute("open")).toBe(true);
  });

  it("lists every nav item plus each external link in the drawer", () => {
    renderNavbar();
    openMenu();

    for (const [, label] of NAV_ITEMS) {
      // There are two links per nav label (desktop rail + drawer), so scope to
      // the open drawer.
      expect(drawer().getAllByRole("link").some((n) => n.textContent.includes(label))).toBe(true);
    }
    for (const {label} of externalLinks) {
      expect(drawer().getByRole("link", {name: new RegExp(label)})).toBeDefined();
    }
  });

  it("closes the drawer when the dialog's cancel event fires (Escape)", async () => {
    renderNavbar();
    openMenu();

    const dialog = screen.getByRole("dialog");
    await act(async () => {
      fireEvent(dialog, new Event("cancel", {bubbles: true, cancelable: true}));
      // Let the EXIT_MS timer fire.
      await new Promise((resolve) => { setTimeout(resolve, 320); });
    });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the drawer when the close button is pressed", async () => {
    renderNavbar();
    openMenu();

    await act(async () => {
      fireEvent.click(drawer().getByRole("button", {name: "Close menu"}));
      await new Promise((resolve) => { setTimeout(resolve, 320); });
    });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("strips whitespace from the counsellor phone number", () => {
    renderNavbar();
    openMenu();

    const call = drawer().getByRole("link", {name: "Talk to a counsellor"});
    expect(call.getAttribute("href")).toBe("tel:+919217801191");
  });
});
