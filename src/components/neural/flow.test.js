import {afterEach, describe, expect, it, vi} from "vitest";
import {HANDOFF, composeLook, createFlowState, createLook, hasWebGL, whenLoadedAndIdle} from "./flow";

describe("composeLook", () => {
  it("shows the hero frame whenever the story is not under way, whatever the story object holds", () => {
    const state = createFlowState();
    state.story.camZ = 4.8; // a story still easing after a quick scroll back up
    const look = createLook();
    composeLook(look, state);
    expect(look).toEqual(createLook());
  });

  it("takes the story's camera and framing, but keeps the hero's lighting, once the story owns the scene", () => {
    const state = createFlowState();
    Object.assign(state.hero, HANDOFF);
    state.storyActive = true;
    state.story.camZ = 4.8;
    const look = createLook();
    composeLook(look, state);
    expect(look.camZ).toBe(4.8);
    expect(look.light).toBe(HANDOFF.light);
    expect(look.core).toBe(HANDOFF.core);
  });
});

describe("whenLoadedAndIdle", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete window.requestIdleCallback;
    delete window.cancelIdleCallback;
  });

  it("waits for load, then for idle, before running", () => {
    vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
    let idle = null;
    window.requestIdleCallback = vi.fn((cb) => ((idle = cb), 1));
    window.cancelIdleCallback = vi.fn();
    const run = vi.fn();

    whenLoadedAndIdle(run);
    expect(window.requestIdleCallback).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("load"));
    expect(run).not.toHaveBeenCalled();
    idle();
    expect(run).toHaveBeenCalledOnce();
  });

  it("falls back to a timer without requestIdleCallback (Safari) and can be cancelled", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", undefined);
    const run = vi.fn();
    const cancel = whenLoadedAndIdle(run); // jsdom: readyState is already "complete"
    cancel();
    vi.runAllTimers();
    expect(run).not.toHaveBeenCalled();

    whenLoadedAndIdle(run);
    vi.runAllTimers();
    expect(run).toHaveBeenCalledOnce();
  });
});

describe("hasWebGL", () => {
  const fakeGl = (renderer) => {
    const loseContext = vi.fn();
    const gl = {
      RENDERER: 0x1f01,
      getParameter: () => renderer,
      getExtension: (name) =>
        name === "WEBGL_debug_renderer_info" ? {UNMASKED_RENDERER_WEBGL: 0x9246} : name === "WEBGL_lose_context" ? {loseContext} : null,
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(gl);
    return loseContext;
  };

  afterEach(() => vi.restoreAllMocks());

  it("accepts a real GPU and releases the probe context", () => {
    const loseContext = fakeGl("ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)");
    expect(hasWebGL()).toBe(true);
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it.each([
    "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)",
    "llvmpipe (LLVM 15.0.7, 256 bits)",
    "ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0)",
  ])("rejects software rendering: %s", (renderer) => {
    fakeGl(renderer);
    expect(hasWebGL()).toBe(false);
  });

  it("rejects when the browser refuses a performant context", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(hasWebGL()).toBe(false);
  });
});
