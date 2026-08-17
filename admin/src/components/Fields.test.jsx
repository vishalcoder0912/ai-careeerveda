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
const policySectionsField = {name: "sections", label: "Sections", kind: "policySections"};

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

  it("edits a policy section's sub-point groups", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        field={policySectionsField}
        initial={[
          {
            heading: "2. Refund eligibility",
            body: ["Eligibility depends on timing."],
            callout: "",
            list: [],
            groups: [{title: "2.1 Full refund (100%)", list: ["Cancellation within 7 days"]}],
            closing: "",
          },
        ]}
      />,
    );

    const subHeading = screen.getByLabelText("Section 1 sub-point 1 heading");
    expect(subHeading).toHaveValue("2.1 Full refund (100%)");
    await user.clear(subHeading);
    await user.type(subHeading, "2.1 Full refund");

    const subList = screen.getByLabelText("Section 1 sub-point 1 list");
    expect(subList).toHaveValue("Cancellation within 7 days");
    await user.click(subList);
    await user.keyboard("{End}{Enter}Cancellation before program start");
    expect(subList).toHaveValue("Cancellation within 7 days\nCancellation before program start");
  });

  it("adds and removes a policy sub-point group", async () => {
    const user = userEvent.setup();
    render(<Harness field={policySectionsField} initial={[{heading: "1. Overview", body: ["Intro"], groups: []}]} />);

    await user.click(screen.getByRole("button", {name: "Add sub-point"}));
    expect(screen.getByLabelText("Section 1 sub-point 1 heading")).toBeInTheDocument();

    await user.click(screen.getByRole("button", {name: "Remove sub-point"}));
    expect(screen.queryByLabelText("Section 1 sub-point 1 heading")).not.toBeInTheDocument();
  });

  it("edits a policy section's callout, list and closing lines", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        field={policySectionsField}
        initial={[{heading: "5. Deductions", body: ["Fees may apply."], callout: "", list: [], groups: [], closing: ""}]}
      />,
    );

    const callout = screen.getByLabelText("Section 1 callout");
    await user.type(callout, "Payment gateway charges apply");

    const list = screen.getByLabelText("Section 1 list");
    await user.click(list);
    await user.keyboard("2-3% of total{Enter}Administrative fee");

    const closing = screen.getByLabelText("Section 1 closing");
    await user.type(closing, "These ensure fair compensation.");

    expect(callout).toHaveValue("Payment gateway charges apply");
    expect(list).toHaveValue("2-3% of total\nAdministrative fee");
    expect(closing).toHaveValue("These ensure fair compensation.");
  });

  it("still adds a second module", async () => {
    const user = userEvent.setup();
    render(<Harness field={modulesField} initial={[{n: 1, title: "Basics", points: []}]} />);

    await user.click(screen.getByRole("button", {name: "Add module"}));

    expect(screen.getByLabelText("Module 2 title")).toBeInTheDocument();
  });
});
