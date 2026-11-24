// The program-page showcase is a terminal, not a laptop mockup. These tests
// lock in the eight source projects, the command/log/status structure and the
// accessibility label, so a future redesign cannot silently drop a section.

import {afterEach, describe, expect, it} from "vitest";
import {cleanup, render, screen, within} from "@testing-library/react";

import {projectsData} from "../data";
import ProjectTerminal from "./ProjectTerminal";

const categories = [
  "Enterprise AI",
  "Business Intelligence",
  "Enterprise AI",
  "Research Platform",
  "Agent Protocols",
  "Data Intelligence",
  "Evaluation",
  "Security",
];

afterEach(cleanup);

describe("ProjectTerminal", () => {
  it("presents every source project as a terminal with its original content", () => {
    const {container} = render(
      <div>
        {projectsData.map((project, i) => (
          <ProjectTerminal key={project.id} project={project} index={i} category={categories[i]} />
        ))}
      </div>,
    );

    const terminals = container.querySelectorAll(".ga-term");
    expect(terminals).toHaveLength(8);

    projectsData.forEach((project, i) => {
      const id = `P${String(i + 1).padStart(2, "0")}`;
      const slug = `p${String(i + 1).padStart(2, "0")}`;
      const term = terminals[i];

      expect(term.querySelector(".ga-term-id").textContent).toBe(id);
      expect(term.querySelector(".ga-term-category").textContent).toBe(categories[i]);
      expect(term.querySelector(".ga-term-arg").textContent).toBe(slug);
      expect(term.querySelector(".ga-term-line--lead").textContent).toBe(project.name);
      expect(term.querySelector(".ga-term-line--note").textContent).toBe(project.description);
      expect(term.querySelector(".ga-term-value").textContent).toBe(project.stack.join(" · "));
    });
  });

  it("renders window dots, a run command, log lines and build statuses", () => {
    const {container} = render(
      <ProjectTerminal project={projectsData[0]} index={0} category={categories[0]} />,
    );
    const term = container.querySelector(".ga-term");

    expect(term.querySelectorAll(".ga-term-dots i")).toHaveLength(3);
    expect(within(term).getByText("$")).toBeTruthy();
    expect(within(term).getByText("run")).toBeTruthy();
    expect(within(term).getByText("--project")).toBeTruthy();
    expect(term.querySelectorAll(".ga-term-line")).toHaveLength(5);
    expect(within(term).getByText("RUNNING")).toBeTruthy();
    expect(within(term).getByText("VERIFIED")).toBeTruthy();
    expect(within(term).getByText("COMPLETE")).toBeTruthy();
  });

  it("exposes the project as one labelled image and uses no hardware markup", () => {
    const {container} = render(
      <ProjectTerminal project={projectsData[2]} index={2} category={categories[2]} />,
    );

    expect(
      screen.getByRole("img", {
        name: "P03 · Enterprise AI. Enterprise Knowledge Copilot. Grounded answers over private corpora with evaluation and feedback.",
      }),
    ).toBeTruthy();
    expect(container.querySelector(".ga-gallery-laptop, .ga-gallery-lid, .ga-gallery-laptop-base")).toBeNull();
  });
});
