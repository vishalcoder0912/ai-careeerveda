import {afterEach, describe, expect, it, vi} from "vitest";
import {cleanup, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {EmptyState, ErrorState, Skeleton, StatusBadge} from "./States";

afterEach(cleanup);

describe("Skeleton", () => {
  // role="status" rather than a bare div with aria-label: aria-label is
  // prohibited on a generic role, so it is dropped from the accessibility tree
  // and axe flags it. e2e/accessibility.spec.js catches the regression in the
  // browser; this catches it here.
  it("announces itself as a busy status region", () => {
    render(<Skeleton />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveAccessibleName("Loading");
  });

  it("draws five rows by default", () => {
    const {container} = render(<Skeleton />);

    expect(container.querySelectorAll(".skeleton-row")).toHaveLength(5);
  });

  it("draws the number of rows asked for", () => {
    const {container} = render(<Skeleton rows={2} />);

    expect(container.querySelectorAll(".skeleton-row")).toHaveLength(2);
  });
});

describe("EmptyState", () => {
  it("shows the title on its own", () => {
    render(<EmptyState title="No programs yet" />);

    expect(screen.getByRole("heading", {name: "No programs yet"})).toBeInTheDocument();
  });

  it("shows the body and action when given them", () => {
    render(
      <EmptyState
        title="No programs yet"
        body="Create one to get started."
        action={<button type="button">Create program</button>}
      />,
    );

    expect(screen.getByText("Create one to get started.")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Create program"})).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("is an alert carrying the API's own message", () => {
    render(<ErrorState error={new Error("Programs could not be loaded.")} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Programs could not be loaded.");
  });

  it("falls back to a generic message when the error carries none", () => {
    render(<ErrorState error={{}} />);

    expect(screen.getByRole("alert")).toHaveTextContent("The request failed.");
  });

  it("survives being handed no error at all", () => {
    render(<ErrorState />);

    expect(screen.getByRole("alert")).toHaveTextContent("The request failed.");
  });

  it("shows the error code alongside the message so support can quote it", () => {
    render(<ErrorState error={{message: "Forbidden", code: "FORBIDDEN"}} />);

    expect(screen.getByText("FORBIDDEN")).toBeInTheDocument();
  });

  it("offers no retry button unless a handler is given", () => {
    render(<ErrorState error={new Error("nope")} />);

    expect(screen.queryByRole("button", {name: /try again/i})).not.toBeInTheDocument();
  });

  it("calls the retry handler when the button is used", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorState error={new Error("nope")} onRetry={onRetry} />);

    await user.click(screen.getByRole("button", {name: /try again/i}));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("StatusBadge", () => {
  // The raw values are database enums. Showing "in-review" next to a filter
  // that offers "In review" reads as two different states.
  it.each([
    ["draft", "Draft"],
    ["in-review", "In review"],
    ["scheduled", "Scheduled"],
    ["published", "Published"],
    ["archived", "Archived"],
  ])("writes %s as %s", (status, label) => {
    render(<StatusBadge status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("shows an unmapped status as-is rather than rendering blank", () => {
    render(<StatusBadge status="quarantined" />);

    expect(screen.getByText("quarantined")).toBeInTheDocument();
  });

  it("carries the status in its class so the colour follows the state", () => {
    const {container} = render(<StatusBadge status="published" />);

    expect(container.querySelector(".badge")).toHaveClass("badge--published");
  });
});
