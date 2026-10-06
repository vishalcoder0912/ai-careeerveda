import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {certificates, credentialRoadmap, proofPillars} from "../data";
import {CertificationSection} from "./Certifications";

/* The crash this file exists for: CertificationSection holds the selected
   certificate in state, starts it as null, and renders the studio unconditionally.
   The studio read `cert.mark` before its own null guard, so mounting this section
   threw on page load. Rendering the section is therefore the regression test —
   testing the studio alone with a valid cert never would have caught it. */

beforeEach(() => {
  if (typeof HTMLDialogElement !== "undefined") {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
  // The cinematic reveal/tilt hooks are pointer- and motion-gated; the studio
  // must not depend on either being available.
  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    });
  }
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class {
      observe() {}

      unobserve() {}

      disconnect() {}
    };
  }
});

afterEach(cleanup);

const section = () => render(<CertificationSection />);

describe("CertificationSection", () => {
  it("mounts with no certificate selected", () => {
    expect(() => section()).not.toThrow();
  });

  it("renders all three programme cards", () => {
    section();
    certificates.forEach((cert) => {
      expect(
        screen.getByRole("button", {name: new RegExp(cert.title, "u")}),
      ).toBeTruthy();
    });
  });

  it("renders the three proof pillars and the full roadmap", () => {
    section();
    proofPillars.forEach((pillar) => {
      expect(screen.getByText(pillar.title)).toBeTruthy();
    });
    credentialRoadmap.forEach((row) => {
      expect(screen.getByText(row.credential)).toBeTruthy();
    });
  });

  it("opens the studio with the matching programme when a card is clicked", () => {
    section();
    fireEvent.click(screen.getByRole("button", {name: new RegExp(certificates[1].title, "u")}));

    const dialog = document.querySelector(".ga-cert-studio");
    expect(dialog).not.toBeNull();
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(dialog.textContent).toContain(certificates[1].mark);
  });

  /* Closing clears the parent's selection, so the dialog unmounts rather than
     sitting closed in the DOM. What matters is that reopening mounts exactly one
     fresh dialog — two stacked modals is the failure mode worth guarding. */
  it("keeps a single dialog open when switching programmes", () => {
    section();
    fireEvent.click(screen.getByRole("button", {name: new RegExp(certificates[0].title, "u")}));
    expect(document.querySelectorAll(".ga-cert-studio")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", {name: /close certificate generator/i}));
    expect(document.querySelector(".ga-cert-studio")).toBeNull();

    fireEvent.click(screen.getByRole("button", {name: new RegExp(certificates[2].title, "u")}));
    expect(document.querySelectorAll(".ga-cert-studio")).toHaveLength(1);
    expect(document.querySelector(".ga-cert-studio").textContent).toContain(certificates[2].mark);
  });

  it("clears the typed name when the studio is reopened", () => {
    section();
    const openFirst = () =>
      fireEvent.click(screen.getByRole("button", {name: new RegExp(certificates[0].title, "u")}));

    openFirst();
    fireEvent.change(screen.getByLabelText("Full name"), {target: {value: "Ananya Sharma"}});
    expect(document.querySelector(".ga-cert-studio-preview .ga-cert-art").textContent).toContain(
      "Ananya Sharma",
    );

    fireEvent.click(screen.getByRole("button", {name: /close certificate generator/i}));
    openFirst();

    // A stale name from a previous visit reads as a real recipient and then gets
    // downloaded by accident.
    expect(screen.getByLabelText("Full name").value).toBe("");
    expect(document.querySelector(".ga-cert-studio-preview .ga-cert-art").textContent).toContain(
      "YOUR NAME HERE",
    );
  });

  it("closes the studio from the close button", () => {
    section();
    fireEvent.click(screen.getByRole("button", {name: new RegExp(certificates[0].title, "u")}));
    expect(document.querySelector(".ga-cert-studio")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", {name: /close certificate generator/i}));
    expect(document.querySelector(".ga-cert-studio")).toBeNull();
  });
});
