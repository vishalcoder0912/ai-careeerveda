// jest.admin.config.cjs wires no setupFilesAfterEnv, and @testing-library/jest-dom
// is installed under admin/node_modules, not the root — so the package name is not
// resolvable from here. The admin app's Vitest suite gets these matchers via
// admin/src/test-setup.js; this file gives the Jest suites the same ones by
// loading jest-dom's own jest entry point (dist/jest-globals.js) directly.
//
// jsdom's window has no TextEncoder/TextDecoder, and react-router's development
// build (which Jest resolves) calls TextEncoder at module load. Every suite that
// touches a router depends on this file running first, so the polyfill lives here
// rather than in each suite.
const {TextEncoder, TextDecoder} = require("node:util");
if (typeof globalThis.TextEncoder === "undefined") globalThis.TextEncoder = TextEncoder;
if (typeof globalThis.TextDecoder === "undefined") globalThis.TextDecoder = TextDecoder;

module.exports = require("../../../admin/node_modules/@testing-library/jest-dom/dist/jest-globals.js");
