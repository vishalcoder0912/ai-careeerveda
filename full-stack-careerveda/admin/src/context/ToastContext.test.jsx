// Toast rules that are policy rather than presentation.
//
// Three of them carry a real consequence and are pinned here: an error must not
// disappear on a timer (it is the only place a failed save explains itself), a
// repeated identical message must not stack (retrying a failing action used to
// bury the form), and useToast outside the provider must throw rather than
// silently no-op a message the user was meant to read.

import {describe, it, expect, beforeEach, afterEach, vi} from "vitest";
import {render, screen, fireEvent, cleanup, act} from "@testing-library/react";

import {ToastProvider, useToast} from "./ToastContext";

// One button per tone, so a test says what it wants without a bespoke harness.
const Harness = ({message = "Saved"}) => {
  const {success, error, toast} = useToast();

  return (
    <>
      <button type="button" onClick={() => success(message)}>fire success</button>
      <button type="button" onClick={() => error(message)}>fire error</button>
      <button type="button" onClick={() => toast(message)}>fire info</button>
    </>
  );
};

const mount = (props) =>
  render(
    <ToastProvider>
      <Harness {...props} />
    </ToastProvider>,
  );

const fire = (tone) => fireEvent.click(screen.getByText(`fire ${tone}`));
const toasts = () => document.querySelectorAll(".toast");

beforeEach(() => vi.useFakeTimers({shouldAdvanceTime: true}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("toast dismissal", () => {
  it("clears a success on its own after four seconds", () => {
    mount();
    fire("success");
    expect(toasts()).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(toasts()).toHaveLength(0);
  });

  // The one that matters: an error the user never read is a failed save with no
  // explanation anywhere in the UI.
  it("keeps an error on screen indefinitely", () => {
    mount();
    fire("error");

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(toasts()).toHaveLength(1);
    expect(screen.getByText("Saved")).toBeTruthy();
  });

  it("removes an error when it is dismissed by hand", () => {
    mount();
    fire("error");

    fireEvent.click(screen.getByLabelText("Dismiss"));

    expect(toasts()).toHaveLength(0);
  });
});

describe("toast de-duplication", () => {
  it("does not stack a repeat of the same message and tone", () => {
    mount();
    fire("error");
    fire("error");
    fire("error");

    expect(toasts()).toHaveLength(1);
  });

  it("still shows the same text under a different tone", () => {
    mount();
    fire("error");
    fire("success");

    expect(toasts()).toHaveLength(2);
  });

  it("shows a repeat again once the first has been dismissed", () => {
    mount();
    fire("success");

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(toasts()).toHaveLength(0);

    fire("success");
    expect(toasts()).toHaveLength(1);
  });
});

describe("toast accessibility and misuse", () => {
  it("announces politely rather than interrupting a screen reader", () => {
    mount();
    const stack = document.querySelector(".toast-stack");

    expect(stack.getAttribute("role")).toBe("status");
    expect(stack.getAttribute("aria-live")).toBe("polite");
  });

  it("throws when useToast is called outside the provider", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Harness />)).toThrow(/inside ToastProvider/);

    error.mockRestore();
  });
});
