import {cleanup, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {afterEach, describe, expect, it, vi} from "vitest";

afterEach(cleanup);

// The footer is what is under test; the navbar, the animated background and the
// live policy list are stubbed so it renders without a network or a canvas.
vi.mock("./SiteNavbar", () => ({default: () => <nav />}));
vi.mock("./background/CareerVedaBackground", () => ({default: ({children}) => <div>{children}</div>}));
vi.mock("../hooks/useContent", () => ({
  useContentList: () => ({items: [{slug: "privacy-policy", title: "Privacy Policy"}], isLive: true}),
}));

const {default: Layout} = await import("./Layout");

const renderLayout = () =>
  render(
    <MemoryRouter>
      <Layout />
    </MemoryRouter>,
  );

describe("Layout footer", () => {
  it("shows the 2018 copyright line", () => {
    renderLayout();
    expect(screen.getByText("© 2018 CareerVeda. All rights reserved.")).toBeTruthy();
  });

  it("makes the phone number tappable and routes email enquiries to /contact", () => {
    renderLayout();
    expect(screen.getByRole("link", {name: "+91 9217801191"}).getAttribute("href")).toBe("tel:+919217801191");
    expect(screen.getByRole("link", {name: "Email us"}).getAttribute("href")).toBe("/contact");
  });

  it("links each published policy", () => {
    renderLayout();
    // The consent banner also links the policy, so look for the footer link
    // among all matches rather than assuming there is only one.
    const links = screen.getAllByRole("link", {name: "Privacy Policy"});
    expect(links.some((link) => link.getAttribute("href") === "/privacy-policy")).toBe(true);
  });
});
