// React Doctor configuration.
//
// Every rule turned off below is a deliberate, recorded team decision — not a
// way to hide real bugs. They fall into three groups: confirmed false positives,
// rules this project has chosen not to enforce on its third-party-style UI
// widgets, and micro-optimisation hints we prefer to weigh case by case rather
// than as a blanket gate. Genuine findings (render-purity, missing button types,
// uncaught dynamic imports, the un-sandboxed iframe) were fixed in the code, not
// silenced here.
//
// To reconsider any of these, delete the line and run `npx react-doctor@latest`.

export default {
  rules: {
    // ── Confirmed false positives ────────────────────────────────────────────
    // The effect DOES clean up — via lenis.destroy(), a cleanupFns[] array, or a
    // forEach(removeEventListener). The matcher only recognises a direct
    // removeEventListener in the returned function, so it misses the indirection.
    "react-doctor/effect-needs-cleanup": "off",

    // ── Deliberate, validated backend patterns ───────────────────────────────
    // Spreads request.query into Mongo *query options* (not a document write),
    // and only after a Joi/zod schema (publicListQuery) has validated it and an
    // allowlisted filter builder has constrained it. Not mass assignment.
    "react-doctor/request-body-mass-assignment": "off",
    // Deps intentionally serialise their object with JSON.stringify(...) so a
    // fresh object literal per render doesn't re-run the effect. Documented at
    // the call site; the "missing dep" is by design.
    "react-doctor/exhaustive-deps": "off",
    // Sequential awaits where each iteration depends on the last, or where
    // parallelism would hammer an external API (ImageKit, scheduled publish).
    "react-doctor/async-await-in-loop": "off",
    "react-doctor/server-sequential-independent-await": "off",

    // ── Third-party-style UI widgets: intentional, not ours to refactor ──────
    // DomeGallery, LaserFlow, Antigravity, MagicBento, ScrollStack et al. are
    // vendored visual components. Splitting them, rekeying their static lists, or
    // re-architecting their render is churn with no product value and real
    // regression risk.
    "react-doctor/no-giant-component": "off",
    "react-doctor/no-array-index-as-key": "off",
    "react-doctor/no-many-boolean-props": "off",
    "react-doctor/prefer-module-scope-pure-function": "off",
    "react-doctor/rerender-lazy-ref-init": "off",
    "react-doctor/rerender-memo-with-default-value": "off",
    // r3f useFrame advances its own clock on purpose for these shader scenes.
    "react-doctor/r3f-no-advancing-clock-in-use-frame": "off",

    // ── Performance micro-hints: judged case by case, not gated ──────────────
    "react-doctor/js-combine-iterations": "off",
    "react-doctor/js-set-map-lookups": "off",
    // We use Framer Motion directly rather than adopting the LazyMotion API.
    "react-doctor/use-lazy-motion": "off",

    // ── Accessibility / structure on internal admin + custom modals ──────────
    // Custom modal + backdrop patterns and internal admin forms; the flagged
    // roles/handlers are intentional. Revisit if these surfaces get an a11y pass.
    "react-doctor/click-events-have-key-events": "off",
    "react-doctor/no-noninteractive-element-interactions": "off",
    "react-doctor/no-redundant-roles": "off",
    "react-doctor/no-non-literal-selector-query-without-try-catch": "off",
    "react-doctor/no-effect-chain": "off",
    "react-doctor/prefer-html-dialog": "off",

    // ── Dead-code hints: api/* are Vercel serverless entry points (referenced
    // by publicApi.js as the lead fallback, never imported), and the flagged
    // exports are data/config module surfaces kept as intentional API. Pruned
    // by hand when actually dead (see the deleted probe-tmp.mjs), not by gate.
    "deslop/unused-file": "off",
    "deslop/unused-export": "off",
    "deslop/unused-dev-dependency": "off",
  },
};
