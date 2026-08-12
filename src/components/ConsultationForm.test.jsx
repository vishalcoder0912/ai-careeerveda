// The lead form's client-side gate.
//
// validate() is module-private, so these drive it the way a visitor does —
// through the form — which is also the only way to catch the part that matters
// more than the regexes: that a rejected submission never reaches submitLead,
// and that a failed one never shows a success message. A lead that silently
// goes nowhere is the expensive bug here, not a lenient pattern.

import {describe, it, expect, beforeEach, afterEach, vi} from "vitest";
import {render, screen, fireEvent, cleanup, waitFor} from "@testing-library/react";

const submitLead = vi.fn();

vi.mock("../lib/publicApi", () => ({submitLead: (...args) => submitLead(...args)}));

// The real hook fetches. The picker's contents are not what these tests are
// about, so pin one program and let the form be the thing under test.
vi.mock("../hooks/useContent", () => ({
  useContentList: () => ({items: [{id: "p1", title: "Data Analytics"}]}),
}));

const {default: ConsultationForm} = await import("./ConsultationForm");

const fill = (label, value) =>
  fireEvent.change(screen.getByLabelText(label, {exact: false}), {target: {value}});

// Every field valid. Individual tests spoil one at a time so a failure names the
// field it is about rather than "the form was empty".
const fillValid = () => {
  fill("Name", "Asha Menon");
  fill("Email", "asha@example.com");
  fill("Mobile", "9876543210");
  fill("Select Program", "Data Analytics");
};

const submit = () => fireEvent.click(screen.getByRole("button", {name: /submit/i}));

beforeEach(() => {
  submitLead.mockReset();
  submitLead.mockResolvedValue({ok: true});
  render(<ConsultationForm />);
});

afterEach(cleanup);

describe("consultation form validation", () => {
  it("refuses an empty form and names every missing field", async () => {
    submit();

    expect(await screen.findByText("Please enter your name.")).toBeTruthy();
    expect(screen.getByText("Please enter your email.")).toBeTruthy();
    expect(screen.getByText("Please enter your mobile number.")).toBeTruthy();
    expect(screen.getByText("Please choose a program.")).toBeTruthy();
  });

  // The one that actually protects anything: a rejected form must not post.
  it("does not send a rejected submission to the server", async () => {
    submit();

    await screen.findByText("Please fix the highlighted fields.");
    expect(submitLead).not.toHaveBeenCalled();
  });

  it("rejects an address with no domain dot", async () => {
    fillValid();
    fill("Email", "asha@example");
    submit();

    expect(await screen.findByText("That email doesn't look right.")).toBeTruthy();
    expect(submitLead).not.toHaveBeenCalled();
  });

  // The Indian mobile rule the server also applies: 10 digits opening 6-9, with
  // an optional +91. Separators are stripped before the test, so a number typed
  // the way people write it is accepted rather than nagged at.
  it.each([
    ["+91 98765 43210", true],
    ["98765-43210", true],
    ["9876543210", true],
    ["5876543210", false], // opens with 5
    ["98765", false], // too short
  ])("mobile %s is accepted: %s", async (mobile, valid) => {
    fillValid();
    fill("Mobile", mobile);
    submit();

    if (valid) {
      await waitFor(() => expect(submitLead).toHaveBeenCalled());
    } else {
      expect(await screen.findByText("That mobile number doesn't look right.")).toBeTruthy();
      expect(submitLead).not.toHaveBeenCalled();
    }
  });

  it("clears a field's error as soon as it is edited", async () => {
    submit();
    await screen.findByText("Please enter your name.");

    fill("Name", "Asha");

    expect(screen.queryByText("Please enter your name.")).toBeNull();
  });
});

describe("consultation form submission", () => {
  it("sends the lead with its source once the fields are valid", async () => {
    fillValid();
    submit();

    await waitFor(() => expect(submitLead).toHaveBeenCalled());

    const [payload] = submitLead.mock.calls[0];
    expect(payload).toMatchObject({
      name: "Asha Menon",
      email: "asha@example.com",
      type: "consultation",
      source: "home-consultation-form",
    });
  });

  it("empties the form after a success so the next visitor starts clean", async () => {
    fillValid();
    submit();

    expect(await screen.findByText(/admissions team will reach out/i)).toBeTruthy();
    expect(screen.getByLabelText("Name*").value).toBe("");
  });

  it("shows the server's own message when it rejects the lead", async () => {
    submitLead.mockResolvedValue({ok: false, message: "That program is full."});

    fillValid();
    submit();

    expect(await screen.findByText("That program is full.")).toBeTruthy();
  });

  it("surfaces the server's field errors alongside its message", async () => {
    submitLead.mockResolvedValue({
      ok: false,
      message: "Check your details.",
      errors: {email: "We already have that address."},
    });

    fillValid();
    submit();

    expect(await screen.findByText("We already have that address.")).toBeTruthy();
  });

  // The failure mode worth a test of its own: a thrown request must not be
  // mistaken for a delivered lead.
  it("reports a network failure rather than claiming success", async () => {
    submitLead.mockRejectedValue(new Error("offline"));

    fillValid();
    submit();

    expect(await screen.findByText(/couldn't reach the server/i)).toBeTruthy();
    expect(screen.queryByText(/admissions team will reach out/i)).toBeNull();
  });

  it("disables the button while the request is in flight", async () => {
    let release;
    submitLead.mockReturnValue(new Promise((resolve) => {
      release = () => resolve({ok: true});
    }));

    fillValid();
    submit();

    const button = screen.getByRole("button", {name: /submitting/i});
    expect(button.disabled).toBe(true);

    release();
    await screen.findByText(/admissions team will reach out/i);
  });
});
