// SocialLinks — the footer's social icon row.
//
// The row is filtered twice: once by the config module (empty hrefs are dropped)
// and once here (an id without an icon is skipped). The contract worth pinning
// is the accessible one — every rendered link carries a readable name, opens in
// a new tab safely, and points at an https profile — and that a platform with no
// URL can never produce a dead <a>.

import {describe, it, expect} from "@jest/globals";
import {render, screen, within} from "@testing-library/react";

import SocialLinks from "../../../src/components/SocialLinks";
import {socialLinks} from "../../../src/config/externalLinks";

describe("SocialLinks", () => {
  it("renders one anchor per configured profile, with the icon drawn for it", () => {
    render(<SocialLinks />);

    const list = screen.getByRole("list");
    const anchors = within(list).getAllByRole("link");
    expect(anchors).toHaveLength(socialLinks.length);
    for (const link of anchors) {
      expect(link.querySelector("svg")).not.toBeNull();
    }
  });

  it("gives every link the label the icon alone cannot announce", () => {
    render(<SocialLinks />);

    for (const profile of socialLinks) {
      const link = screen.getByRole("link", {name: profile.label});
      expect(link).toHaveAttribute("aria-label", profile.label);
      expect(link).toHaveAttribute("title", profile.label);
    }
  });

  it("opens every profile in a new tab with the noopener/noreferrer guard", () => {
    render(<SocialLinks />);

    for (const profile of socialLinks) {
      const link = screen.getByRole("link", {name: profile.label});
      expect(link).toHaveAttribute("href", profile.href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("hides the decorative icon markup from screen readers", () => {
    render(<SocialLinks />);

    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("never ships a plain-http profile link", () => {
    render(<SocialLinks />);

    const links = screen.getAllByRole("link");
    for (const link of links) {
      expect(link.getAttribute("href")).not.toContain("http://");
    }
  });
});