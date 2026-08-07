import {useState} from "react";
import {afterEach, describe, expect, it} from "vitest";
import {cleanup, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {Field} from "./Fields.jsx";

// Controlled wrapper: the bug only shows up when the value round-trips through a
// parent, which is how the editor actually drives these fields.
const Harness = ({field, initial}) => {
  const [value, setValue] = useState(initial);
  return <Field field={field} value={value} onChange={setValue} />;
};

const modulesField = {name: "modules", label: "Curriculum modules", kind: "modules"};
const sectionsField = {name: "sections", label: "Sections", kind: "sections"};

describe("multi-line repeater fields", () => {
  afterEach(cleanup);

  it("lets a module hold more than one topic line", async () => {
    const user = userEvent.setup();
    render(<Harness field={modulesField} initial={[{n: 1, title: "Basics", points: ["Intro"]}]} />);

    const points = screen.getByLabelText("Module 1 points");
    await user.click(points);
    await user.keyboard("{End}{Enter}Second topic{Enter}Third topic");

    expect(points).toHaveValue("Intro\nSecond topic\nThird topic");
  });

  it("drops blank and padded lines once the module topics lose focus", async () => {
    const user = userEvent.setup();
    render(<Harness field={modulesField} initial={[{n: 1, title: "Basics", points: ["Intro"]}]} />);

    const points = screen.getByLabelText("Module 1 points");
    await user.click(points);
    await user.keyboard("{End}{Enter}  Padded  {Enter}{Enter}");
    await user.tab();

    expect(points).toHaveValue("Intro\nPadded");
  });

  it("lets a section hold more than one paragraph", async () => {
    const user = userEvent.setup();
    render(<Harness field={sectionsField} initial={[{heading: "Why", body: ["First"]}]} />);

    const body = screen.getByLabelText("Section 1 paragraphs");
    await user.click(body);
    await user.keyboard("{End}{Enter}Second");

    expect(body).toHaveValue("First\nSecond");
  });

  it("still adds a second module", async () => {
    const user = userEvent.setup();
    render(<Harness field={modulesField} initial={[{n: 1, title: "Basics", points: []}]} />);

    await user.click(screen.getByRole("button", {name: "Add module"}));

    expect(screen.getByLabelText("Module 2 title")).toBeInTheDocument();
  });
});
