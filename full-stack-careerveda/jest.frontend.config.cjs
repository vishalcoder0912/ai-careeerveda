
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