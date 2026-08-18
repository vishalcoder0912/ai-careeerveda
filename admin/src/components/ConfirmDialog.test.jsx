import {useState} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {ConfirmDialog} from "./ConfirmDialog.jsx";

// jsdom does not implement the native <dialog> API, and Modal calls showModal()
// on mount and close() on unmount. The stubs must also flip the `open` property
// — a <dialog> without it is excluded from the accessibility tree, so a no-op
// mock renders a dialog that getByRole can never see.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

afterEach(cleanup);

const baseProps = {
  open: true,
  title: "Delete program?",
  body: "This cannot be undone.",
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe("ConfirmDialog", () => {
  it("renders nothing when closed", () => {
    render(<ConfirmDialog open={false} title="Delete" body="Really?" />);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("shows the title and body in an alertdialog", () => {
    render(<ConfirmDialog {...baseProps} />);

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAccessibleName("Delete program?");
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
    expect(screen.getByText("Delete program?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });

  it("uses default button labels", () => {
    render(<ConfirmDialog {...baseProps} />);

    expect(screen.getByRole("button", {name: "Cancel"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Confirm"})).toBeInTheDocument();
  });

  it("honours custom button labels", () => {
    render(<ConfirmDialog {...baseProps} confirmLabel="Yes, delete" cancelLabel="Keep it" />);

    expect(screen.getByRole("button", {name: "Keep it"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Yes, delete"})).toBeInTheDocument();
  });

  it("applies the danger style when tone is danger", () => {
    render(<ConfirmDialog {...baseProps} tone="danger" />);

    expect(screen.getByRole("button", {name: "Confirm"})).toHaveClass("btn--danger");
  });

  it("applies the primary style by default", () => {
    render(<ConfirmDialog {...baseProps} />);

    expect(screen.getByRole("button", {name: "Confirm"})).toHaveClass("btn--primary");
  });

  it("calls onCancel when the cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog {...baseProps} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", {name: "Cancel"}));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("clears the prompt value when closed via the cancel button", async () => {
    const user = userEvent.setup();
    const ReopenHarness = () => {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Reopen
          </button>
          <ConfirmDialog
            open={open}
            title="Delete"
            body="Really?"
            onCancel={() => setOpen(false)}
            onConfirm={vi.fn()}
            prompt={{label: "Reason", placeholder: "Type a reason"}}
          />
        </>
      );
    };
    render(<ReopenHarness />);

    const input = screen.getByLabelText("Reason");
    await user.type(input, "Test reason");
    await user.click(screen.getByRole("button", {name: "Cancel"}));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", {name: "Reopen"}));
    expect(screen.getByLabelText("Reason")).toHaveValue("");
  });

  it("confirms with an empty value when there is no prompt", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...baseProps} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", {name: "Confirm"}));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith("");
  });

  it("passes the typed text through to onConfirm and resets it", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        {...baseProps}
        onConfirm={onConfirm}
        prompt={{label: "Reason", placeholder: "Type a reason"}}
      />,
    );

    const input = screen.getByLabelText("Reason");
    await user.type(input, "Test reason");
    await user.click(screen.getByRole("button", {name: "Confirm"}));

    expect(onConfirm).toHaveBeenCalledWith("Test reason");
  });

  it("clears the prompt value after confirming", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        {...baseProps}
        onConfirm={onConfirm}
        prompt={{label: "Reason", placeholder: "Type a reason"}}
      />,
    );

    const input = screen.getByLabelText("Reason");
    await user.type(input, "Test reason");
    await user.click(screen.getByRole("button", {name: "Confirm"}));

    expect(input).toHaveValue("");
  });

  it("disables the confirm button until a required prompt is filled", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        {...baseProps}
        prompt={{label: "Reason", required: true, placeholder: "Type a reason"}}
      />,
    );

    const confirm = screen.getByRole("button", {name: "Confirm"});
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText("Reason"), "Reason given");
    expect(confirm).toBeEnabled();
  });

  it("allows confirming an empty optional prompt", () => {
    render(
      <ConfirmDialog {...baseProps} prompt={{label: "Reason", placeholder: "Optional"}} />,
    );

    expect(screen.getByRole("button", {name: "Confirm"})).toBeEnabled();
  });

  it("renders prompt options as a select with a placeholder", () => {
    render(
      <ConfirmDialog
        {...baseProps}
        prompt={{label: "Reason", options: ["Duplicate", "Spam", "Outdated"]}}
      />,
    );

    const select = screen.getByLabelText("Reason");
    expect(select.tagName).toBe("SELECT");

    const options = screen.getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Choose a reason…",
      "Duplicate",
      "Spam",
      "Outdated",
    ]);
  });

  it("passes the chosen option to onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        {...baseProps}
        onConfirm={onConfirm}
        prompt={{label: "Reason", options: ["Duplicate", "Spam"]}}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Reason"), "Spam");
    await user.click(screen.getByRole("button", {name: "Confirm"}));

    expect(onConfirm).toHaveBeenCalledWith("Spam");
  });

  it("shows Working… and disables everything while busy", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        {...baseProps}
        busy
        onCancel={onCancel}
        onConfirm={onConfirm}
        prompt={{label: "Reason", placeholder: "Type a reason"}}
      />,
    );

    expect(screen.getByRole("button", {name: "Working…"})).toBeDisabled();
    expect(screen.getByRole("button", {name: "Cancel"})).toBeDisabled();
    expect(screen.getByLabelText("Reason")).toBeDisabled();

    await user.click(screen.getByRole("button", {name: "Cancel"}));
    await user.click(screen.getByRole("button", {name: "Working…"}));

    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
