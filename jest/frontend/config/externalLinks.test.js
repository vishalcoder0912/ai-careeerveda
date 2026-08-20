// The two hand-edited link collections: the footer/drawer external links and
// the social profile row.
//
// The contract this file promises is that a link with an empty href is *absent*:
// the arrays are filtered at module load, so a dead URL can never render as a
// dead <a>. The tests pin that filtering, the uniqueness of the ids the icons
// are keyed by, and the https-ness of every href that does ship.

import {describe, it, expect} from "@jest/globals";

import {LMS_URL, HIRE_FROM_US_URL, externalLinks, socialLinks} from "../../../src/config/externalLinks";

describe("the two hand-edited destinations", () => {
  it("points the LMS and the hiring form at https URLs", () => {
    expect(LMS_URL).toMatch(/^https:\/\//);
    expect(HIRE_FROM_US_URL).toMatch(/^https:\/\//);
    expect(LMS_URL).not.toContain("http://");
    expect(HIRE_FROM_US_URL).not.toContain("http://");
  });
});

describe("externalLinks — footer and mobile drawer", () => {
  it("exposes exactly the two links whose hrefs are set", () => {
    expect(externalLinks).toHaveLength(2);
    expect(externalLinks.map((link) => link.label)).toEqual(
      expect.arrayContaining(["Access Your LMS", "Hire From Us"]),
    );
  });

  it("gives every link the label, href and description a footer row needs", () => {
    for (const link of externalLinks) {
      expect(link.label).toBeTruthy();
      expect(link.href).toMatch(/^https:\/\//);
      expect(link.description).toBeTruthy();
    }
  });
});

describe("socialLinks — the profile row", () => {
  it("drops platforms whose profile URL has not been pasted in yet", () => {
    // youtube, x and whatsapp are all "" in the source.
    const ids = socialLinks.map((link) => link.id);
    expect(ids).toEqual(expect.arrayContaining(["linkedin", "instagram", "facebook"]));
    expect(ids).not.toContain("youtube");
    expect(ids).not.toContain("x");
    expect(ids).not.toContain("whatsapp");
  });

  it("keeps every shipped link on https with a readable label", () => {
    for (const link of socialLinks) {
      expect(link.href).toMatch(/^https:\/\//);
      expect(link.href).not.toContain("http://");
      expect(link.label).toMatch(/^CareerVeda on /);
    }
  });

  it("uses distinct ids, since the icon is keyed by them", () => {
    const ids = socialLinks.map((link) => link.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});