// Used only by babel-jest for the Jest suites that cover the Vite apps
// (jest/frontend, jest/admin). Vite itself never sees this file — it transforms
// source with esbuild, so this config is inert for `npm run dev`/`build`.
//
// The apps are `"type": "module"` ESM; Jest runs CJS, so babel-jest compiles
// the imported source down. The backend deliberately has NO babel
// (transform: {} in backend/jest.config.js) — do not point this at it.
const {types: t} = require("@babel/core");

// Vite exposes build-time values as import.meta.env.X. Jest runs the same source
// through Babel in CommonJS, where import.meta is a syntax error. Map it to
// process.env for the Jest suites; Vite never reads this config, so the browser
// build keeps using its own env replacement.
const viteMetaEnv = () => ({
  name: "vite-import-meta-env-for-jest",
  visitor: {
    MemberExpression(path) {
      const object = path.node.object;
      if (
        t.isMetaProperty(object) &&
        object.meta.name === "import" &&
        object.property.name === "meta" &&
        t.isIdentifier(path.node.property, {name: "env"})
      ) {
        path.replaceWith(t.memberExpression(t.identifier("process"), t.identifier("env")));
      }
    },
    MetaProperty(path) {
      const {meta, property} = path.node;
      if (meta.name === "import" && property.name === "meta") {
        path.replaceWith(t.objectExpression([]));
      }
    },
  },
});

module.exports = {
  presets: [
    ["@babel/preset-env", {targets: {node: "current"}}],
    ["@babel/preset-react", {runtime: "automatic"}],
  ],
  plugins: [viteMetaEnv],
};