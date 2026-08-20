// Jest for the public-site suites in jest/frontend — the Vitest suite keeps
// owning src/**/*.test.{js,jsx} (vite.config.js) and this config is scoped to
// its own directory, so the two runners never collect the same file.
//
// transform: babel-jest because the frontend is JSX + ESM and Jest runs CJS.
// See babel.config.cjs — Vite never reads it, only this pipeline does.
//
// import.meta.env (used by src/data/alumniSpotlight.js, src/data/partnerLogos.js,
// src/lib/publicApi.js) has no Jest equivalent, so suites here do not import
// those three modules; Vitest already covers publicApi.js.
module.exports = {
  rootDir: ".",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/jest/frontend"],
  transform: {
    "^.+\\.(js|jsx)$": ["babel-jest", {configFile: "./babel.config.cjs"}],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|scss|less)$": "<rootDir>/jest/style-mock.cjs",
    "\\.(png|jpe?g|gif|webp|svg|woff2?|ttf|eot)$": "<rootDir>/jest/file-mock.cjs",
  },
  setupFilesAfterEnv: ["<rootDir>/jest/setup.cjs"],
  clearMocks: true,
  restoreMocks: true,
  testMatch: ["**/jest/frontend/**/*.test.{js,jsx}"],
};