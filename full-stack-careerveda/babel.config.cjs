// Used only by babel-jest for the Jest suites that cover the Vite apps
// (jest/frontend, jest/admin). Vite itself never sees this file — it transforms
// source with esbuild, so this config is inert for `npm run dev`/`build`.
//
// The apps are `"type": "module"` ESM; Jest runs CJS, so babel-jest compiles
// the imported source down. The backend deliberately has NO babel
// (transform: {} in backend/jest.config.js) — do not point this at it.
module.exports = {
  presets: [
    ["@babel/preset-env", {targets: {node: "current"}}],
    ["@babel/preset-react", {runtime: "automatic"}],
  ],
};