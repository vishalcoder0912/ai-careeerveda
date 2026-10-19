import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "./components/mobile-navbar-premium.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

// Yield to the browser before the first React render.
//
// Every route ships as prerendered HTML (scripts/prerender.mjs +
// scripts/snapshot.mjs), so meaningful content exists in the document long
// before this module finishes evaluating. But createRoot().render() called
// synchronously at the end of script evaluation starts the whole app's boot
// work inside the same task sequence the parser just handed over — and on a
// throttled phone that held the first paint hostage until React had committed
// the entire tree (~2s of extra FCP/LCP for markup that was already on screen).
//
// Handing the render to an idle callback puts a frame boundary between
// "document parsed" and "app booted": the browser paints the static page, then
// React mounts and replaces it with the identical tree in one atomic task —
// visually seamless, because what replaces the static markup is the same
// markup. The timeout caps how long boot can be deferred on a busy device.
// ── Keeping the reader in place across the handover ─────────────────────────
//
// "Visually seamless" above holds at the top of the page, not further down. A
// phone visitor scrolls the static page while the JS loads; the app's tree then
// renders below-the-fold sections as fixed-height placeholders until they load,
// so everything under them moves, and the section the visitor was reading
// jumps hundreds of pixels or off screen. The browser's own scroll anchoring
// cannot help: the node it anchors to is replaced, not resized.
//
// So the element in the middle of the screen is recorded by its position in
// the tree (both trees share their structure) and scrolled back to the same
// offset once the app has rendered it. Ancestors are recorded too, nearest
// first, for when the exact element sits inside a section not yet loaded.

const pathFromRoot = (el) => {
  const steps = [];
  for (let node = el; node && node !== rootElement; node = node.parentElement) {
    steps.unshift(Array.prototype.indexOf.call(node.parentElement.children, node) + 1);
  }
  return `:scope > ${steps.map((index) => `:nth-child(${index})`).join(" > ")}`;
};

const captureAnchor = () => {
  if (window.scrollY === 0) return null;
  const hit = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
  if (!hit || !rootElement.contains(hit)) return null;

  const candidates = [];
  for (let node = hit; node && node !== rootElement; node = node.parentElement) {
    candidates.push({path: pathFromRoot(node), tag: node.tagName, top: node.getBoundingClientRect().top});
  }
  return candidates;
};

const restoreAnchor = (candidates) => {
  let userScrolled = false;
  const stop = () => {
    userScrolled = true;
  };
  // A visitor who scrolls after boot has taken over; never fight them.
  window.addEventListener("wheel", stop, {once: true, passive: true});
  window.addEventListener("touchstart", stop, {once: true, passive: true});
  window.addEventListener("keydown", stop, {once: true});

  // Lazy routes render after the mount signal, so give the anchor ~2s to appear.
  let frames = 120;
  const attempt = () => {
    if (userScrolled) return;
    for (const {path, tag, top} of candidates) {
      const el = rootElement.querySelector(path);
      // Same position AND same tag, or it is not the same thing. Not class:
      // Reveal toggles is-in-view across the handover.
      if (el && el.tagName === tag) {
        const shift = el.getBoundingClientRect().top - top;
        if (Math.abs(shift) > 1) window.scrollBy({top: shift, behavior: "instant"});
        return;
      }
    }
    if (--frames > 0) requestAnimationFrame(attempt);
  };
  attempt();
};

const mount = () => {
  const anchor = captureAnchor();

  if (anchor) {
    const watcher = new MutationObserver(() => {
      if (!rootElement.hasAttribute("data-app-mounted")) return;
      watcher.disconnect();
      restoreAnchor(anchor);
    });
    watcher.observe(rootElement, {attributes: true, attributeFilter: ["data-app-mounted"]});
  }

  // The data-app-mounted handover signal is set by <App/> itself, in an effect
  // — i.e., strictly AFTER the tree has committed. Setting it here, right
  // after render() schedules the work, would race the concurrent renderer:
  // tooling (scripts/snapshot.mjs) would start interacting with a document
  // whose interactive tree does not exist yet.
  createRoot(rootElement).render(<App />);
};

if (window.requestIdleCallback) {
  window.requestIdleCallback(mount, {timeout: 400});
} else {
  window.setTimeout(mount, 50);
}
