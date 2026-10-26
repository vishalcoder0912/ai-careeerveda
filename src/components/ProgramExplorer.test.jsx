import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {afterEach, describe, expect, it, vi} from "vitest";

import {programCatalog} from "../data/programCatalog";
import ProgramExplorer from "./ProgramExplorer";

// The static catalogue stands in for the API list.
vi.mock("../hooks/useContent", () => ({
  useContentList: (_name, {fallback}) => ({items: fallback}),
}));

// jsdom has no layout: no scrollIntoView, and nothing for useScroll to track.
vi.mock("framer-motion", async (importOriginal) => {
  const motion = await importOriginal();
  return {...motion, useScroll: () => ({scrollYProgress: motion.motionValue(0)})};
});
Element.prototype.scrollIntoView ??= () => {};

afterEach(cleanup);

const renderExplorer = () =>
  render(
    <MemoryRouter>
      <ProgramExplorer />
    </MemoryRouter>,
  );

const tabNames = () =>
  screen.getAllByRole("tab").filter((tab) => tab.classList.contains("tab-pill")).map((tab) => tab.textContent);

describe("ProgramExplorer", () => {
  it("opens on the first program with one rail button per program", () => {
    renderExplorer();
    expect(screen.getAllByRole("tab").filter((tab) => tab.dataset.programId)).toHaveLength(programCatalog.length);
    expect(screen.getByText(programCatalog[0].subtitle)).toBeTruthy();
    expect(tabNames().slice(0, 3)).toEqual(["Overview", "Curriculum", "Outcomes"]);
    expect(tabNames().at(-1)).toBe("FAQs");
  });

  it("switches program from the rail and tab from the pills", async () => {
    renderExplorer();
    const second = programCatalog[1];
    await act(async () => fireEvent.click(document.querySelector(`[data-program-id="${second.id}"]`)));
    expect(document.querySelector(`[data-program-id="${second.id}"]`).getAttribute("aria-selected")).toBe("true");
    expect(await screen.findByText(second.subtitle)).toBeTruthy();

    await act(async () => fireEvent.click(screen.getByRole("tab", {name: "FAQs"})));
    await waitFor(() => expect(document.querySelector(".program-faq-mini")).toBeTruthy());
  });

  it("shows the fee tab and highlight only for a program with a published fee", async () => {
    renderExplorer();
    const priced = programCatalog.find((program) => program.fee || program.startingPrice);
    if (!priced) return;
    await act(async () => fireEvent.click(document.querySelector(`[data-program-id="${priced.id}"]`)));
    expect(tabNames()).toContain("Fees");
    expect(document.querySelector(".program-highlight-fee")).toBeTruthy();

    await act(async () => fireEvent.click(screen.getByRole("tab", {name: "Fees"})));
    await waitFor(() => expect(document.querySelector(".program-fees-tab__amount").textContent).toMatch(/^₹ \S/));
  });
});
