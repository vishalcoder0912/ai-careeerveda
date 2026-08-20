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

require("./admin/helpers/jest-dom.cjs");