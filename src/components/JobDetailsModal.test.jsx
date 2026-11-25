import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, render, screen} from "@testing-library/react";

import JobDetailsModal from "./JobDetailsModal";

const baseJob = {
  slug: "product-management-intern-paytm",
  title: "Product Management Intern",
  company: "Paytm (One97 Communications)",
  skills: ["SQL"],
};

beforeEach(() => {
 
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("JobDetailsModal — required qualifications", () => {
  it("shows an admin-edited requirements list even when qualifications is empty", () => {
    render(<JobDetailsModal job={{...baseJob, requirements: ["hello world"], qualifications: []}} />);

    expect(screen.getByText("Required qualifications")).toBeTruthy();
    expect(screen.getByText("hello world")).toBeTruthy();
  });

  it("still shows qualifications on legacy records with no requirements", () => {
    render(<JobDetailsModal job={{...baseJob, qualifications: ["B.Tech", "MBA"]}} />);

    expect(screen.getByText("B.Tech")).toBeTruthy();
    expect(screen.getByText("MBA")).toBeTruthy();
  });

  it("shows both sources once each when a record carries the same item twice", () => {
    render(
      <JobDetailsModal
        job={{...baseJob, skills: ["React"], requirements: ["SQL", "A/B testing"], qualifications: ["SQL", "Degree"]}}
      />,
    );

    expect(screen.getAllByText("SQL")).toHaveLength(1);
    expect(screen.getByText("A/B testing")).toBeTruthy();
    expect(screen.getByText("Degree")).toBeTruthy();
  });
});

describe("JobDetailsModal — application CTA", () => {
  it("offers the CareerVeda form for every open listing", () => {
    render(<JobDetailsModal job={{...baseJob, acceptsApplications: true}} />);

    // The dialog is closed in jsdom, so its controls have no accessible role;
    // query the rendered text instead.
    expect(screen.getByText(/Apply with CareerVeda/i)).toBeTruthy();
  });

  it("offers the form even on legacy records with no applications flag", () => {
    render(<JobDetailsModal job={baseJob} />);

    expect(screen.getByText(/Apply with CareerVeda/i)).toBeTruthy();
    expect(screen.queryByText(/See latest openings/i)).toBeNull();
  });

  it("never falls back to a third-party apply link", () => {
    render(
      <JobDetailsModal
        job={{...baseJob, applyUrl: "https://www.linkedin.com/jobs/search/?keywords=x"}}
      />,
    );

    expect(screen.getByText(/Apply with CareerVeda/i)).toBeTruthy();
    expect(screen.queryByText(/See latest openings/i)).toBeNull();
    expect(screen.queryByText("Apply Now")).toBeNull();
  });

  it("closes applications once the deadline has passed", () => {
    render(<JobDetailsModal job={{...baseJob, applicationDeadline: "2020-01-01"}} />);

    expect(screen.queryByText(/Apply with CareerVeda/i)).toBeNull();
    expect(screen.getByText(/Applications for this role are closed/i)).toBeTruthy();
  });
});
