import {describe, expect, it} from "vitest";

import {programCatalog} from "../data/programCatalog";
import {
  loadAlumniPage,
  loadAboutPage,
  loadBlogDetailPage,
  loadBlogPage,
  loadContactPage,
  loadEnrollPage,
  loadFacultyPage,
  loadGenerativeAIPage,
  loadJobsPage,
  loadPolicyPage,
  loadProgramDetailPage,
  loadProgramsPage,
  loaderForPath,
} from "./routeChunks";

describe("program route chunks — one chunk per course surface, shared the same way", () => {
  it("keeps every advertised course on the program detail loader, exactly like the blog index keeps its permalinks", () => {
    for (const program of programCatalog) {
      const slugPath = `/programs/${program.id}`;
      // The Gen AI & Agentic AI flagship shares the cinematic landing with
      // /generative-ai, so its /programs/ URL keeps the cinematic chunk.
      if (program.id === "gen-ai-agentic-ai") {
        expect(loaderForPath(slugPath)).toBe(loadGenerativeAIPage);
        expect(loaderForPath(`${slugPath}/`)).toBe(loadGenerativeAIPage);
        return;
      }
      expect(loaderForPath(slugPath)).toBe(loadProgramDetailPage);
      expect(loaderForPath(`${slugPath}/`)).toBe(loadProgramDetailPage);
      expect(loaderForPath(`${slugPath}?fee=1&emi=12`)).toBe(loadProgramDetailPage);
      expect(loaderForPath(`${slugPath}#fee`)).toBe(loadProgramDetailPage);
    }
  });

  it("gives the programs index its own loader rather than sharing the detail chunk", () => {
    expect(loaderForPath("/programs")).toBe(loadProgramsPage);
    expect(loaderForPath("/programs/")).toBe(loadProgramsPage);
  });
});

describe("the catalogue-driven route table — every page the navbar and footer link to", () => {
  it("keeps every exact route on its own loader", () => {
    expect(loaderForPath("/jobs")).toBe(loadJobsPage);
    expect(loaderForPath("/faculty")).toBe(loadFacultyPage);
    expect(loaderForPath("/about")).toBe(loadAboutPage);
    expect(loaderForPath("/contact")).toBe(loadContactPage);
    expect(loaderForPath("/alumni")).toBe(loadAlumniPage);
    expect(loaderForPath("/enroll")).toBe(loadEnrollPage);
    expect(loaderForPath("/generative-ai")).toBe(loadGenerativeAIPage);
    expect(loaderForPath("/programs/gen-ai-agentic-ai")).toBe(loadGenerativeAIPage);
  });

  it("warms the landing page /jobs redirects to, not the redirect itself", () => {
    expect(loaderForPath("/achievers")).toBe(loadJobsPage);
  });

  it("keeps the policy pages on one shared chunk", () => {
    for (const route of ["/privacy-policy", "/refund-policy", "/terms", "/escalation-policy"]) {
      expect(loaderForPath(route)).toBe(loadPolicyPage);
    }
  });
});

describe("blog route chunks", () => {
  it("keeps the blog index and every article permalink on their own route loaders", () => {
    expect(loaderForPath("/blog")).toBe(loadBlogPage);
    expect(loaderForPath("/blog/admin-managed-post")).toBe(loadBlogDetailPage);
    expect(loaderForPath("/blog/admin-managed-post/")).toBe(loadBlogDetailPage);
  });
});
