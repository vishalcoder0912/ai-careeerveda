// Common jest setup for the frontend suites (jest/frontend).
// @testing-library/jest-dom is installed under admin/node_modules, not the root,
// so the package name is not resolvable from here. As with jest/admin/helpers/
// jest-dom.cjs, load jest-dom's own jest entry point (dist/jest-globals.js)
// directly instead.
//
// jsdom's window has no TextEncoder/TextDecoder, and react-router's development
// build (which Jest resolves) calls TextEncoder at module load. Every suite that
// touches a router depends on this file running first, so the polyfill lives
// here rather than in each suite.
const {TextEncoder, TextDecoder} = require("node:util");
if (typeof globalThis.TextEncoder === "undefined") globalThis.TextEncoder = TextEncoder;
if (typeof globalThis.TextDecoder === "undefined") globalThis.TextDecoder = TextDecoder;

// jsdom has no matchMedia. Components use it to honour prefers-reduced-motion,
// so without this stub any suite mounting one of them crashes before its first
// assertion. Vitest gets the equivalent stub from src/test-setup.js; keep the
// two in sync. Default to "no match" so the normal animated path is tested.
const matchMediaStub = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
});
if (typeof globalThis.matchMedia !== "function") globalThis.matchMedia = matchMediaStub;
// Jest's jsdom exposes a separate `window` object from `globalThis`; components
// read window.matchMedia, so stub that one too. Reached via globalThis so this
// CommonJS setup file does not need a browser ESLint env.
if (typeof globalThis.window?.matchMedia !== "function") {
  globalThis.window.matchMedia = matchMediaStub;
}

require("./admin/helpers/jest-dom.cjs");