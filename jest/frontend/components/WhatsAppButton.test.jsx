// WhatsAppButton — the floating chat button that follows the visitor across every
// route.
//
// It reads the route rather than props, so the message it prefills depends on
// where the visitor is: a programme page names the programme, every other page
// uses its own wording or the generic fallback. The suite pins the accessible
// contract (the button is a link to a wa.me chat, labelled for screen readers)
// and the routing contract (a detail page's message names the course).

import {describe, it, expect} from "@jest/globals";
import {render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";

import WhatsAppButton from "../../../src/components/WhatsAppButton";
import {WHATSAPP_NUMBER, WHATSAPP_ARIA_LABEL, WHATSAPP_TOOLTIP} from "../../../src/config/whatsapp";

const renderAt = (pathname) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <WhatsAppButton />
    </MemoryRouter>,
  );

const linkHref = () => screen.getByRole("link", {name: WHATSAPP_ARIA_LABEL}).getAttribute("href");

describe("WhatsAppButton", () => {
  it("renders the floating button as a labelled link to the configured number", () => {
    renderAt("/");

    const link = screen.getByRole("link", {name: WHATSAPP_ARIA_LABEL});
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(linkHref()).toMatch(new RegExp(`^https://wa\\.me/${WHATSAPP_NUMBER}\\?text=`));
  });

  it("shows the hover tooltip for desktop visitors", () => {
    renderAt("/");

    expect(screen.getByText(WHATSAPP_TOOLTIP)).toBeInTheDocument();
  });

  it("prefills the page-specific message on a known route", () => {
    renderAt("/contact");

    const text = decodeURIComponent(linkHref().split("text=")[1]);
    expect(text).toContain("speak to someone from your team");
  });

  it("falls back to the generic message on a route with no entry", () => {
    renderAt("/privacy-policy");

    const text = decodeURIComponent(linkHref().split("text=")[1]);
    expect(text).toContain("career programs");
  });

  it("names the programme on its detail page, once the catalog chunk resolves", async () => {
    renderAt("/programs/product-management");

    await waitFor(() => {
      const text = decodeURIComponent(linkHref().split("text=")[1]);
      expect(text).toContain("PG Program in Product Management");
    });
  });

  it("keeps the generic message on the /programs list page, which is not a detail page", async () => {
    renderAt("/programs");

    const text = decodeURIComponent(linkHref().split("text=")[1]);
    expect(text).toContain("CareerVeda programs");
  });
});