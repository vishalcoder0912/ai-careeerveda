// The Spline scene embed, used by SplineHeroScene. One constant: the URL must
// stay a remote https scene — a relative path would make the browser request a
// Spline viewer from the site's own origin.

import {describe, it, expect} from "@jest/globals";

import {SPLINE_SCENE_URL} from "../../../src/config/spline";

describe("SPLINE_SCENE_URL", () => {
  it("points at a hosted Spline scene over https", () => {
    expect(SPLINE_SCENE_URL).toMatch(/^https:\/\//);
    expect(SPLINE_SCENE_URL).toContain("spline.design");
  });

  it("is not a local asset", () => {
    expect(SPLINE_SCENE_URL.startsWith("/")).toBe(false);
    expect(SPLINE_SCENE_URL).not.toContain("http://");
  });
});