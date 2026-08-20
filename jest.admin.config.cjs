// Jest for the admin-panel suites in jest/admin. Same reasoning as
// jest.frontend.config.cjs: the admin's Vitest suite (admin/vite.config.js)
// keeps src/**/*.test.{js,jsx}, this config owns only jest/admin.
module.exports = {
  rootDir: ".",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/jest/admin"],
  transform: {
    "^.+\\.(js|jsx)$": ["babel-jest", {configFile: "./babel.config.cjs"}],
  },
  moduleNameMapper: {
    "\\.(css|scss|less)$": "<rootDir>/jest/style-mock.cjs",
    "\\.(png|jpe?g|gif|webp|svg|woff2?|ttf|eot)$": "<rootDir>/jest/file-mock.cjs",
  },
  clearMocks: true,
  restoreMocks: true,
  testMatch: ["**/jest/admin/**/*.test.{js,jsx}"],
};