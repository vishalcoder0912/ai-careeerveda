// Jest for the unit suites under tests/unit.
//
// Scoped to that directory on purpose. tests/*.test.js are the existing
// route-level integration suites, and they import from "vitest" — pointing Jest
// at them would fail on the import, not on the code under test. Two runners is
// not the end state you want; see the note in tests/unit/README.md.
//
// No transform: the backend is `"type": "module"` with no JSX, so Jest runs the
// source as native ESM and there is no Babel step to configure or keep in step
// with Node. That needs --experimental-vm-modules, which the npm script passes.
export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests/unit"],
  transform: {},
  // Seeds throwaway env vars before any import (see tests/jest.setup.js) so the
  // unit suites run on a machine without backend/.env — i.e. CI.
  setupFiles: ["<rootDir>/tests/jest.setup.js"],
  clearMocks: true,
  restoreMocks: true,
};
