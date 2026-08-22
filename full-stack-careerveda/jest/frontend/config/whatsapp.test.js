// The WhatsApp floating-button configuration: the number, the per-page message
// table and the wa.me URL builder every route renders from.
//
// Two behaviours are load-bearing. First, the number must be digits only —
// wa.me rejects +, spaces and dashes, so a formatted number would make the
// button open an invalid chat. Second, every message is encodeURIComponent'd,
// because the copy contains newlines and "?" that would otherwise cut the text
// short or be read as another query parameter.

import {describe, it, expect} from "@jest/globals";

import {
  WHATSAPP_NUMBER,
  WHATSAPP_ENABLED,
  WHATSAPP_ARIA_LABEL,
  WHATSAPP_TOOLTIP,
  programMessage,
  pageMessages,
  defaultMessage,
  buildWhatsAppUrl,
} from "../../../src/config/whatsapp";

describe("button-level configuration", () => {
  it("keeps the number as digits only, in full international form", () => {
    expect(WHATSAPP_NUMBER).toMatch(/^[0-9]+$/);
    expect(WHATSAPP_NUMBER.startsWith("91")).toBe(true);
  });

  it("is enabled with an accessible label and a hover tooltip", () => {
    expect(WHATSAPP_ENABLED).toBe(true);
    expect(WHATSAPP_ARIA_LABEL).toMatch(/Chat with CareerVeda on WhatsApp/);
    expect(WHATSAPP_TOOLTIP).toBeTruthy();
  });
});

describe("programMessage — the one message that names the course", () => {
  it("names the program and its fee when both are known", () => {
    const message = programMessage({program: "PG Program in Product Management", fee: "1,45,000"});
    expect(message).toContain("PG Program in Product Management");
    expect(message).toContain("(1,45,000)");
  });

  it("omits the fee parenthetical when the program has no published fee", () => {
    const message = programMessage({program: "PG Program in Product Management", fee: ""});
    expect(message).toContain("PG Program in Product Management");
    expect(message).not.toContain("(");
  });
});

describe("buildWhatsAppUrl — the wa.me link", () => {
  it("always opens the configured number", () => {
    const url = buildWhatsAppUrl({pathname: "/"});
    expect(url.startsWith(`https://wa.me/${WHATSAPP_NUMBER}?text=`)).toBe(true);
  });

  it("uses the page-specific message for a known route", () => {
    const url = buildWhatsAppUrl({pathname: "/contact"});
    const text = decodeURIComponent(url.split("text=")[1]);
    expect(text).toContain("speak to someone from your team");
  });

  it("falls back to the generic message for a route with no entry", () => {
    const url = buildWhatsAppUrl({pathname: "/privacy-policy"});
    const text = decodeURIComponent(url.split("text=")[1]);
    expect(text).toBe(defaultMessage());
  });

  it("names the program, not the page, on a program's detail page", () => {
    const url = buildWhatsAppUrl({
      pathname: "/programs/data-analytics",
      program: {fullTitle: "PG Program in Data Analytics", fee: {amount: "1,35,000"}},
    });
    const text = decodeURIComponent(url.split("text=")[1]);
    expect(text).toContain("PG Program in Data Analytics");
    expect(text).toContain("(1,35,000)");
  });

  it("escapes the message so newlines and ? cannot cut it short", () => {
    const url = buildWhatsAppUrl({pathname: "/contact"});
    const raw = url.split("text=")[1];
    expect(raw).not.toContain("\n");
    expect(raw).not.toContain("?");
    expect(raw).toContain("%0A");
    expect(decodeURIComponent(raw)).toContain("\n");
  });
});

describe("pageMessages", () => {
  it("covers every route that wants bespoke wording", () => {
    for (const route of ["/", "/programs", "/enroll", "/faculty", "/alumni", "/about", "/contact", "/blog"]) {
      expect(pageMessages[route]).toBeInstanceOf(Function);
    }
  });

  it("produces a non-empty message for every entry", () => {
    for (const [_route, make] of Object.entries(pageMessages)) {
      expect(make().length).toBeGreaterThan(10);
    }
  });
});