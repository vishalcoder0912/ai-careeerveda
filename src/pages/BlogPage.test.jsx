import {describe, it, expect, afterEach} from "vitest";
import {render, screen, fireEvent, cleanup} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";

import BlogPage from "./BlogPage";

afterEach(() => {
  cleanup();
});

describe("BlogPage filter", () => {
  it("shows every card under All", () => {
    render(
      <MemoryRouter>
        <BlogPage />
      </MemoryRouter>,
    );
    expect(document.querySelectorAll(".blog-card")).toHaveLength(38);
  });

  it("keeps cards after clicking a category chip", () => {
    render(
      <MemoryRouter>
        <BlogPage />
      </MemoryRouter>,
    );
    const chip = screen.getByRole("button", {name: "Data Science"});
    fireEvent.click(chip);
    expect(document.querySelectorAll(".blog-card")).toHaveLength(5);
  });

  it("restores all cards when clicking All again", () => {
    render(
      <MemoryRouter>
        <BlogPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", {name: "Cybersecurity"}));
    expect(document.querySelectorAll(".blog-card")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", {name: "All"}));
    expect(document.querySelectorAll(".blog-card")).toHaveLength(38);
  });
});
