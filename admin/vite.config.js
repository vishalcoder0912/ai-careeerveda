import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // strictPort: see the note in the root vite.config.js — 5174 is in the
  // backend's CORS allowlist, a drifted port is not.
  server: {
    port: 5174,
    strictPort: true,
    // The panel always calls the API same-origin ("/api/v1"); in dev this
    // proxy puts the backend behind the Vite server. That matches the nginx
    // arrangement in production, keeps the refresh cookie first-party, and
    // avoids the "localhost" trap: on a dual-stack machine localhost resolves
    // to ::1 first, so an absolute http://localhost:8080 URL can land on a
    // different app bound to IPv6 while the backend listens on IPv4.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // React and the router change far less often than the panel does, so
        // they get their own chunk and stay cached across deploys.
        manualChunks: {"vendor-react": ["react", "react-dom", "react-router-dom"]},
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test-setup.js"],
    // Same cap as the root config: CI (shared runners) flaked out with
    // "[vitest-pool]: Failed to start forks worker ... Timeout
    // waiting for worker to respond" when the forks pool spawned a worker per
    // core at once. Two at a time is plenty for this suite.
    maxWorkers: 2,
    minWorkers: 1,
    // The default 5s is measured against a warm module graph. The first case in
    // a file pays for transforming everything it imports — ResourceEditor pulls
    // in the whole field registry — and on a cold CI runner with the files
    // running in parallel that alone crossed 5s and failed a test that passes in
    // 468ms once warm. Matches backend/vitest.config.js, which raised it for the
    // same reason.
    testTimeout: 20_000,
  },
});
