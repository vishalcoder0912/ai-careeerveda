// The "Hire From Us" popup: any link to #hire-from-us opens it, an incomplete
// form never reaches submitLead, and a complete one posts as a hiring lead.

import {describe, it, expect, beforeEach, afterEach, vi} from "vitest";
import {render, screen, fireEvent, cleanup, waitFor} from "@testing-library/react";

const submitLead = vi.fn();

vi.mock("../lib/publicApi", () => ({submitLead: (...args) => submitLead(...args)}));
vi.mock("../lib/smoothScroll", () => ({useLockSmoothScroll: () => {}}));
vi.mock("../hooks/useContent", () => ({
  useContentList: () => ({items: [{id: "p1", title: "Data Analytics"}]}),
}));

const {default: HireFromUsDialog} = await import("./HireFromUsDialog");

const fill = (label, value) =>
  fireEvent.change(screen.getByLabelText(label, {exact: false}), {target: {value}});

beforeEach(() => {
  // jsdom has no top layer; flip `open` the way the browser does.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
  submitLead.mockReset();
  submitLead.mockResolvedValue({ok: true});
  render(
    <>
      <a href="#hire-from-us">Hire From Us</a>
      <HireFromUsDialog />
    </>,
  );
});

afterEach(cleanup);

describe("Hire From Us dialog", () => {
  it("opens from a link, refuses an empty form, and posts a complete one", async () => {
    const dialog = document.querySelector("dialog.hire-dialog");
    expect(dialog.open).toBe(false);

    fireEvent.click(screen.getByText("Hire From Us", {selector: "a"}));
    expect(dialog.open).toBe(true);

    fireEvent.click(screen.getByRole("button", {name: /submit enquiry/i}));
    expect(await screen.findByText("Please enter your organization name.")).toBeTruthy();
    expect(submitLead).not.toHaveBeenCalled();

    fill("Organization Name", "Acme Corp");
    fill("Contact Person Name", "Ravi Kumar");
    fill("Email Address", "ravi@acme.com");
    fill("Phone Number", "9876543210");
    fill("Which program", "Data Analytics");
    fireEvent.click(screen.getByLabelText("6-15"));
    fireEvent.click(screen.getByLabelText("Direct Hire"));
    fireEvent.click(screen.getByRole("button", {name: /submit enquiry/i}));

    await waitFor(() => expect(submitLead).toHaveBeenCalledTimes(1));
    expect(submitLead.mock.calls[0][0]).toMatchObject({
      type: "hiring",
      organization: "Acme Corp",
      name: "Ravi Kumar",
      program: "Data Analytics",
      positions: "6-15",
      recruitmentMode: "Direct Hire",
      consent: true,
    });
    expect(await screen.findByText(/placement team will contact you/i)).toBeTruthy();
    const gmail = screen.getByRole("link", {name: "Gmail"}).getAttribute("href");
    expect(gmail).toMatch(/^https:\/\/mail\.google\.com\/mail\/\?view=cm/);
    expect(decodeURIComponent(gmail)).toContain("Organization: Acme Corp");
    expect(screen.getByRole("link", {name: "Outlook"}).getAttribute("href")).toContain("outlook.office.com");
    expect(screen.getByRole("link", {name: "Mail app"}).getAttribute("href")).toMatch(/^mailto:Info@careerveda\.in\?/);
  });
});
