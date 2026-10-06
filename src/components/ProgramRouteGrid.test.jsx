import {cleanup, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {afterEach, describe, expect, it, vi} from "vitest";

import {programCatalog} from "../data/programCatalog";

afterEach(cleanup);

// The API's published list: two programs in admin order, one with a price
// that lacks the rupee sign and one that has a landing route.
const published = [
  {...programCatalog[2], startingPrice: "99,000"},
  {...programCatalog[0], landingPath: "/generative-ai"},
];

vi.mock("../hooks/useContent", () => ({
  useContentList: () => ({items: published}),
}));

const {default: ProgramRouteGrid} = await import("./ProgramRouteGrid");

const renderGrid = () =>
  render(
    <MemoryRouter>
      <ProgramRouteGrid />
    </MemoryRouter>,
  );

describe("ProgramRouteGrid", () => {
  it("lists published programs first, then the rest of the catalogue, without duplicates", () => {
    renderGrid();
    const titles = screen.getAllByRole("heading", {level: 3}).map((h) => h.textContent);
    expect(titles).toHaveLength(programCatalog.length);
    expect(new Set(titles).size).toBe(titles.length);
    expect(titles.slice(0, 2)).toEqual([published[0].title, published[1].title]);
  });

  it("numbers cards in order so they match the explorer rail", () => {
    const {container} = renderGrid();
    const numbers = Array.from(container.querySelectorAll(".route-tile-number"), (el) => el.textContent);
    expect(numbers.slice(0, 3)).toEqual(["01", "02", "03"]);
  });

  it("links to the landing route when one is declared, else the detail page", () => {
    renderGrid();
    const links = screen.getAllByRole("link");
    expect(links[0].getAttribute("href")).toBe(`/programs/${published[0].id}`);
    expect(links[1].getAttribute("href")).toBe("/generative-ai");
  });

  it("adds the rupee sign only when the price lacks one", () => {
    const {container} = renderGrid();
    const prices = Array.from(container.querySelectorAll(".route-tile-price strong"), (el) => el.textContent);
    expect(prices[0]).toBe("₹99,000");
    for (const price of prices) expect(price).not.toMatch(/₹\s*₹/);
  });
});
