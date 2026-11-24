// index.html is the template for the SPA and for every prerendered route, so a
// single GTM tag there covers the whole site. These guards stop a future edit
// from duplicating the tag, reintroducing a second dataLayer stub, or loading
// GA4 twice (directly and from the container).

import {readFileSync} from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";

const html = readFileSync(path.resolve(process.cwd(), "index.html"), "utf8");
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];

describe("Google Tag Manager installation", () => {
  it("loads the container exactly once, ahead of the other tags in head", () => {
    const tags = head.match(/https:\/\/www\.googletagmanager\.com\/gtm\.js\?id=GTM-KMLHFSW4/g) || [];
    expect(tags).toHaveLength(1);
    expect(head).toContain(
      '<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-KMLHFSW4"></script>',
    );
    expect(head.indexOf("GTM-KMLHFSW4")).toBeLessThan(head.indexOf("<meta charset"));
  });

  it("shares one dataLayer and one gtag stub with GA4", () => {
    expect(html.match(/window\.dataLayer = window\.dataLayer \|\| \[\]/g)).toHaveLength(1);
    expect(html.match(/function gtag\(\)/g)).toHaveLength(1);
    expect(html.match(/window\.dataLayer\.push\(\{"gtm\.start"/g)).toHaveLength(1);
  });

  it("sets Consent Mode v2 defaults before GTM can fire", () => {
    const defaults = head.indexOf('gtag("consent", "default"');
    expect(head.match(/gtag\("consent", "default"/g)).toHaveLength(1);
    expect(defaults).toBeGreaterThan(-1);
    expect(defaults).toBeLessThan(head.indexOf("gtm.start"));

    for (const signal of ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"]) {
      expect(head).toContain(`${signal}: "denied"`);
    }
    expect(head).toContain('window.localStorage.getItem("cv-cookie-consent-v1")');
  });

  it("loads GA4 once, after GTM, with manual SPA page views", () => {
    expect(head).toContain('gtag("config", "G-1P67KR40MJ", {send_page_view: false})');
    expect(head.match(/gtag\/js\?id=G-1P67KR40MJ/g)).toHaveLength(1);
    expect(head.indexOf("GTM-KMLHFSW4")).toBeLessThan(head.indexOf("gtag/js?id=G-"));
    // If someone adds a GA4 tag to the container, this guard prevents the
    // direct loader from firing a second copy of gtag.js.
    expect(head).toContain('script[src*="gtag/js?id=G-"]');
  });

  it("loads GA4 for every visitor, not only after an interaction", () => {
    expect(head).toContain('document.addEventListener("DOMContentLoaded", boot, {once: true})');
    // Waiting for a click/key press or a 30-second timer silently dropped
    // everyone who bounced without touching the page.
    expect(head).not.toContain("pointerdown");
    expect(head).not.toContain("setTimeout(boot, 30000)");
  });

  it("puts the GTM noscript iframe first in body", () => {
    expect(body).toContain(
      'src="https://www.googletagmanager.com/ns.html?id=GTM-KMLHFSW4"',
    );
    expect(body.indexOf("<noscript>")).toBeLessThan(body.indexOf('<div id="root"'));
  });
});
