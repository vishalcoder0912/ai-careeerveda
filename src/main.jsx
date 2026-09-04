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
const mount = () => {
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
