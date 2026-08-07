import {describe, expect, it} from "vitest";

import {loaderForPath, loadBlogDetailPage, loadBlogPage} from "./routeChunks";

describe("blog route chunks", () => {
  it("keeps the blog index and every article permalink on their own route loaders", () => {
    expect(loaderForPath("/blog")).toBe(loadBlogPage);
    expect(loaderForPath("/blog/admin-managed-post")).toBe(loadBlogDetailPage);
    expect(loaderForPath("/blog/admin-managed-post/")).toBe(loadBlogDetailPage);
  });
});
