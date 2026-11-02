// Regression: iOS Safari has no requestIdleCallback. FilmGrain used to read the
// bare global inside its effect, which threw a ReferenceError there and
// unmounted the whole cinematic tree — the program pages (Product Management
// included) rendered blank on iPhones while the rest of the site loaded.

import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {cleanup, render, waitFor} from "@testing-library/react";

const {FilmGrain} = await import("./Atmosphere");

const hadIdle = "requestIdleCallback" in window;
const idleOriginal = window.requestIdleCallback;

beforeEach(() => {
  // jsdom does not implement it either; delete explicitly so the bare
  // identifier would be unresolvable if the component regressed.
  delete window.requestIdleCallback;
});

afterEach(() => {
  cleanup();
  if (hadIdle) window.requestIdleCallback = idleOriginal;
});

describe("FilmGrain", () => {
  it("still reveals the grain when requestIdleCallback is missing (Safari/iOS)", async () => {
    const {container} = render(<FilmGrain />);

    await waitFor(() => expect(container.querySelector(".ga-grain")).not.toBeNull());
  });
});
