// "Apply on CareerVeda" must send one request per submission. The button is
// disabled while sending, but a rapid second submit can reach the handler
// before React re-renders; the in-flight ref has to stop it, otherwise one
// click can create several applications.

import {describe, it, expect, beforeEach, afterEach, vi} from "vitest";
import {render, screen, fireEvent, cleanup, waitFor} from "@testing-library/react";

const submitJobApplication = vi.fn();

vi.mock("../lib/publicApi", () => ({
  submitJobApplication: (...args) => submitJobApplication(...args),
}));

const {default: JobApplyDialog} = await import("./JobApplyDialog");

const JOB = {
  slug: "data-analyst",
  title: "Data Analyst",
  company: "CareerVeda Partner",
  description: "Work with the analytics team.",
  skills: ["SQL", "Excel"],
};

const fill = (label, value) =>
  fireEvent.change(screen.getByLabelText(label, {exact: false}), {target: {value}});

beforeEach(() => {
  // jsdom has no top layer; flip `open` the way the browser does.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  submitJobApplication.mockReset();
});

afterEach(cleanup);

describe("JobApplyDialog", () => {
  it("opens with the job and submits a complete application once", async () => {
    submitJobApplication.mockResolvedValue({ok: true});
    render(<JobApplyDialog job={JOB} onClose={() => {}} />);

    expect(document.querySelector("dialog.job-apply").open).toBe(true);
    expect(screen.getByText("Data Analyst")).toBeTruthy();

    fill("Full name", "Asha Menon");
    fill("Mobile number", "9217801191");
    fill("LMS ID", "CV-2026-0042");
    fireEvent.click(screen.getByLabelText(/I agree to share these details/i));
    fireEvent.click(screen.getByRole("button", {name: /submit application/i}));

    await waitFor(() => expect(submitJobApplication).toHaveBeenCalledTimes(1));
    expect(submitJobApplication.mock.calls[0][0]).toMatchObject({
      job: "data-analyst",
      name: "Asha Menon",
      mobile: "9217801191",
      lmsId: "CV-2026-0042",
      consent: true,
    });
    expect(await screen.findByText(/application received/i)).toBeTruthy();
  });

  it("ignores a second submit while the first is still in flight", async () => {
    let resolveRequest;
    submitJobApplication.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    render(<JobApplyDialog job={JOB} onClose={() => {}} />);

    fill("Full name", "Asha Menon");
    fill("Mobile number", "9217801191");
    fill("LMS ID", "CV-2026-0042");
    fireEvent.click(screen.getByLabelText(/I agree to share these details/i));

    const form = document.querySelector("form.job-apply__form");
    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(submitJobApplication).toHaveBeenCalledTimes(1);

    resolveRequest({ok: true});
    expect(await screen.findByText(/application received/i)).toBeTruthy();
  });

  it("stays usable on phones: scrolls past Lenis and dodges contact autofill", () => {
    const {container} = render(<JobApplyDialog job={JOB} onClose={() => {}} />);
    expect(container.querySelector("dialog").hasAttribute("data-lenis-prevent")).toBe(true);
    // Autofill fills name="company"; the server then drops the application as a bot.
    expect(container.querySelector('input[name="company"]')).toBeNull();
  });
});
