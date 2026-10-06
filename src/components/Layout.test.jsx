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

  it("makes the phone number and email tappable", () => {
    renderLayout();
    expect(screen.getByRole("link", {name: "+91 9217801191"}).getAttribute("href")).toBe("tel:+919217801191");
    expect(screen.getByRole("link", {name: "Info@careerveda.in"}).getAttribute("href")).toBe(
      "mailto:Info@careerveda.in",
    );
  });

  it("links each published policy", () => {
    renderLayout();
    expect(screen.getByRole("link", {name: "Privacy Policy"}).getAttribute("href")).toBe("/privacy-policy");
  });
});
