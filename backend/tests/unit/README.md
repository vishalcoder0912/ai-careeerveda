# Jest unit suites

`npm run test:unit` — Jest, this directory only.
`npm test` — Vitest, the route-level integration suites in `tests/*.test.js`.

## Why two runners

The integration suites here predate these unit suites and import from `vitest`.
Jest is scoped to `tests/unit` (`jest.config.js` → `roots`) and Vitest excludes it
(`vitest.config.js` → `exclude`), so neither runner collects the other's files.

That split is a deliberate cost, not a design: two runners means two configs, two
sets of mocking APIs and two things to upgrade. If you want one, converting the
eight Vitest files to Jest is mostly mechanical — the assertion API is the same,
`vi.fn()` → `jest.fn()`, `vi.mock()` → `jest.unstable_mockModule()` (which is
noticeably more awkward under ESM). Do it in one pass, not gradually.

## ESM

The backend is `"type": "module"`, so Jest runs the source as native ESM with
`--experimental-vm-modules` (in the npm script, not `NODE_OPTIONS`, so it behaves
the same on Windows and CI). `transform: {}` disables Babel — there is no JSX
here and nothing to compile.

The consequence worth knowing: `jest.mock()` does not work under native ESM. Use
`jest.unstable_mockModule()` plus a dynamic `await import()` *after* the mock is
registered, or prefer dependency injection and plain stub objects, which is what
these suites do.

## Conventions

- One suite per source module, named after it.
- Each `it` states the behaviour it protects, not the line it covers. A test whose
  name restates the implementation tells you nothing when it fails.
- Argon2 hashing costs ~19 MiB and two passes per call, so the suites that hash
  for real are few and carry an explicit timeout. Everything cheap is tested
  against the pure validators instead.
