import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

// One config at the root lints all three applications. They are separate npm
// packages with separate lockfiles, but they are one codebase and there is no
// reason for a rule to be on in admin/ and off in src/.
//
// Correctness rules only — no stylistic ones. This repo has no Prettier and a
// consistent hand-written style already; turning on formatting rules now would
// produce a thousand-line diff that hides every real finding in the noise. Add
// Prettier separately if you want formatting enforced, and let it own that job.
export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "test-results/**",
      "playwright-report/**",
      "graphify-out/**",
      "coverage/**",
      // Agent and tool scratch directories. They are gitignored, they are not
      // this project's code, and linting them buried the real findings under
      // 127 no-undef errors from CommonJS helper scripts.
      ".codex/**",
      ".claude/**",
      ".agents/**",
    ],
  },

  js.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      parserOptions: {ecmaFeatures: {jsx: true}},
    },
    rules: {
      // An unused variable is usually a rename that missed a spot. Allow the
      // leading-underscore convention for the ones that are deliberate, such as
      // an Express error handler that must keep its four-argument shape.
      // `const {status, includeDeleted, ...safe} = options` is how this codebase
      // drops keys a caller must not control (content.service.js:108). The two
      // named bindings are meant to be unused — that IS the omission — so
      // ignoreRestSiblings keeps the rule from arguing with the pattern.
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
          ignoreRestSiblings: true,
        },
      ],
      // `==` against null is the idiomatic null-or-undefined check; everywhere
      // else the coercion is a bug waiting to happen.
      eqeqeq: ["error", "always", {null: "ignore"}],
      "no-var": "error",
      "prefer-const": ["error", {destructuring: "all"}],
      // await inside a loop is often intended (sequential seeding, migrations),
      // but a floating promise never is.
      "require-atomic-updates": "off",
      "no-promise-executor-return": "error",
      "no-unmodified-loop-condition": "error",
      "no-unreachable-loop": "error",
      "no-constant-binary-expression": "error",
      "no-self-compare": "error",
      "no-template-curly-in-string": "warn",
      // The CSV export in lead.controller.js prepends a real U+FEFF byte-order
      // mark inside a template literal so Excel opens the file as UTF-8. That is
      // deliberate and correct; a stray non-breaking space in ordinary code is
      // still worth catching, so the rule stays on everywhere else.
      "no-irregular-whitespace": ["error", {skipTemplates: true}],
    },
  },

  // ── Browser code ────────────────────────────────────────────────────────────
  {
    files: ["src/**/*.{js,jsx}", "admin/src/**/*.{js,jsx}"],
    languageOptions: {globals: globals.browser},
    plugins: {"react-hooks": reactHooks},
    rules: {
      // The rule set that actually catches bugs in this codebase: a hook called
      // conditionally, or an effect whose dependency list has drifted from what
      // it reads. Both fail at runtime in ways a unit test rarely reproduces.
      ...reactHooks.configs["recommended-latest"].rules,

      // Warn, not error — and this is a decision worth understanding rather than
      // flipping back.
      //
      // These two rules find 20 pre-existing sites in code that demonstrably
      // works (283 unit tests and 20 end-to-end tests pass against it). Every one
      // of them needs a human judgement about intended behaviour, not a
      // mechanical fix: useContent.js:127 resets item state when the route
      // changes, which is exactly the "cascading render" the rule objects to and
      // also exactly what stops the previous program's copy showing on the next
      // program's page.
      //
      // Left as errors they would make `npm run lint` red from the first commit,
      // and a gate that is red on arrival is a gate everybody learns to pass with
      // --no-verify. As warnings they stay visible in every run and every PR
      // while the gate still catches anything NEW. Promote them to "error" as the
      // existing sites are worked through.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },

  // ── Node code ───────────────────────────────────────────────────────────────
  {
    files: [
      "backend/**/*.js",
      "api/**/*.js",
      "scripts/**/*.{js,mjs,cjs}",
      "*.config.js",
      "*.js",
      // Root .cjs files (babel.config.cjs, the two jest configs) and the jest/
      // directory's CommonJS helpers (style/file mocks, setup) run in Node.
      "*.cjs",
      "jest/**/*.cjs",
    ],
    languageOptions: {globals: globals.node},
  },

  // ── Test code ───────────────────────────────────────────────────────────────
  {
    files: ["**/*.test.{js,jsx}", "**/*.spec.js", "**/tests/**", "e2e/**", "**/test-setup.js"],
    languageOptions: {globals: {...globals.node, ...globals.browser}},
    rules: {
      // A test that builds a fixture it never asserts on is noise, not an error.
      "no-unused-vars": "warn",
    },
  },

  // k6 runs its own runtime, not Node: __ENV and the k6/* module specifiers are
  // resolved by the k6 binary and are not npm packages.
  {
    files: ["tests/load/**/*.js"],
    languageOptions: {globals: {__ENV: "readonly"}},
  },
];
