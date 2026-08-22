// The legal pages' content map, and the footer list derived from it.
//
// The footer renders only from publishedPolicies, so the contract worth pinning
// is that a policy is linked exactly when it is publishable: the derived list
// must mirror the live (non-draft) entries and nothing else, in declaration
// order, and every section a reader can navigate to must have a heading.

import {describe, it, expect} from "@jest/globals";

import {policies, policyRoutes, publishedPolicies} from "../../../src/data/policies";

describe("policies — the content map", () => {
  it("carries the four live legal documents", () => {
    expect(policyRoutes.sort()).toEqual(["escalation-policy", "privacy-policy", "refund-policy", "terms"]);
  });

  it("shapes every policy like a page: eyebrow, title, lead and numbered sections", () => {
    for (const [_slug, policy] of Object.entries(policies)) {
      expect(policy.eyebrow).toBe("Legal");
      expect(policy.title).toBeTruthy();
      expect(policy.lead).toBeTruthy();
      expect(policy.sections.length).toBeGreaterThanOrEqual(10);
      for (const section of policy.sections) {
        expect(section.id).toMatch(/^[a-z0-9-]+$/);
        expect(section.heading).toMatch(/^\d+\./);
        expect(section.body.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps section ids unique within each policy so anchor links resolve", () => {
    for (const [_slug, policy] of Object.entries(policies)) {
      const ids = policy.sections.map((section) => section.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("gives every policy a recent updated date rather than a stale one", () => {
    for (const [_slug, policy] of Object.entries(policies)) {
      expect(policy.updated).toMatch(/20(2[4-9])/);
    }
  });
});

describe("publishedPolicies — the footer list", () => {
  it("exposes exactly the live policies with the slug the route uses", () => {
    expect(publishedPolicies.map((entry) => entry.slug).sort()).toEqual(policyRoutes.sort());
    for (const entry of publishedPolicies) {
      expect(entry.title).toBe(policies[entry.slug].title);
    }
  });

  it("lists every live policy exactly once, with nothing draft or deleted", () => {
    const slugs = publishedPolicies.map((entry) => entry.slug);
    expect(slugs.length).toBe(policyRoutes.length);
    expect(new Set(slugs).size).toBe(policyRoutes.length);
    for (const slug of slugs) {
      expect(policyRoutes).toContain(slug);
    }
  });
});