import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "./components/mobile-navbar-premium.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}
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
