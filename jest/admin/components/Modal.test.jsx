import {describe, expect, it, jest, beforeEach} from "@jest/globals";
// The admin components resolve React from admin/node_modules, so the renderer
// must come from the same copy — RTL at the root would pair root's react-dom
// with admin's React and every hook call would fail.
import {render, screen, fireEvent} from "../../../admin/node_modules/@testing-library/react/dist/index.js";
import "../helpers/jest-dom.cjs";

import {Modal} from "../../../admin/src/components/Modal.jsx";

// jsdom implements <dialog> as inert markup: showModal/close are real browser
// APIs it does not ship. The effect calls them on mount/unmount, so the suite
// stands in for the browser and asserts the component drives the native dialog
// through them. A real showModal also sets the `open` attribute, which is what
// makes the dialog "open" to the accessibility tree — without it the role
// "dialog" is never computed.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = jest.fn(function () {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = jest.fn(function () {
    this.removeAttribute("open");
  });
});

const renderModal = (props = {}) => {
  const onClose = jest.fn();
  const view = render(
    <Modal label="Confirm deletion" onClose={onClose} {...props}>
      <p>Delete this record?</p>
    </Modal>,
  );
  return {onClose, view};
};

describe("Modal", () => {
  it("opens as a native dialog the moment it mounts, and closes when it unmounts", () => {
    const {view} = renderModal();

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
    expect(HTMLDialogElement.prototype.close).not.toHaveBeenCalled();

    view.unmount();
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1);
  });

  it("exposes the dialog role with an accessible name", () => {
    renderModal({label: "Confirm deletion"});

    const dialog = screen.getByRole("dialog", {name: "Confirm deletion"});
    expect(dialog).toHaveAttribute("aria-label", "Confirm deletion");
  });

  it("accepts labelledby and describedby so a heading can name it instead of a label", () => {
    render(
      <div>
        <h2 id="head">Move to archive</h2>
        <p id="desc">Archived records are hidden from the public site.</p>
        <Modal labelledBy="head" describedBy="desc" onClose={jest.fn()}>
          <p>Body</p>
        </Modal>
      </div>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "head");
    expect(dialog).toHaveAttribute("aria-describedby", "desc");
  });

  it("renders its children inside the dialog", () => {
    renderModal();

    expect(screen.getByText("Delete this record?")).toBeInTheDocument();
  });

  it("renders in place rather than through a portal", () => {
    const {view} = renderModal();

    expect(view.container.contains(screen.getByRole("dialog"))).toBe(true);
  });

  it("merges a custom class onto the dialog class", () => {
    renderModal({className: "dialog--wide"});

    expect(screen.getByRole("dialog")).toHaveClass("dialog dialog--wide");
  });

  it("routes the native cancel (Escape) event through onClose so the parent's state stays in sync", () => {
    const {onClose} = renderModal();
    const dialog = screen.getByRole("dialog");

    fireEvent(dialog, new Event("cancel", {cancelable: true}));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("swallows Escape entirely while work is in flight", () => {
    const {onClose} = renderModal({busy: true});
    const dialog = screen.getByRole("dialog");

    fireEvent(dialog, new Event("cancel", {cancelable: true}));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("treats a click on the backdrop as a request to close", () => {
    const {onClose} = renderModal();
    const dialog = screen.getByRole("dialog");

    // jsdom's getBoundingClientRect is all zeros, so a click away from the
    // origin lands outside the panel — exactly the backdrop case.
    fireEvent.click(dialog, {clientX: 400, clientY: 300});

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores a click on the panel itself or its padding", () => {
    const {onClose} = renderModal();
    const dialog = screen.getByRole("dialog");

    fireEvent.click(dialog, {clientX: 0, clientY: 0});

    expect(onClose).not.toHaveBeenCalled();
  });

  it("ignores a click that lands on a child, which is inside the panel", () => {
    const {onClose} = renderModal();
    const panel = screen.getByText("Delete this record?");

    fireEvent.click(panel, {clientX: 400, clientY: 300});

    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps the backdrop click from closing while work is in flight", () => {
    const {onClose} = renderModal({busy: true});
    const dialog = screen.getByRole("dialog");

    fireEvent.click(dialog, {clientX: 400, clientY: 300});

    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes via the explicit onClose handler when the caller's close button fires it", () => {
    const {onClose} = renderModal();
    const dialog = screen.getByRole("dialog");

    fireEvent(dialog, new Event("cancel", {cancelable: true}));
    onClose.mockClear();

    const explicitClose = jest.fn();
    render(
      <Modal label="x" onClose={explicitClose}>
        <button type="button" onClick={explicitClose}>
          Done
        </button>
      </Modal>,
    );

    fireEvent.click(screen.getByRole("button", {name: "Done"}));
    expect(explicitClose).toHaveBeenCalledTimes(1);
  });
});
