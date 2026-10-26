import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

const isAnalyze = process.env.ANALYZE === "true";

export default defineConfig(({mode}) => {
  // "" loads every variable, not just the VITE_-prefixed ones.
  const env = loadEnv(mode, process.cwd(), "");

  // A production bundle without an API base silently refuses every lead form
  // submission. CI builds blank on purpose (static prerender), so warn, not fail.
  if (mode === "production" && !env.VITE_PUBLIC_API_BASE_URL) {
    console.warn(
      "\n⚠  VITE_PUBLIC_API_BASE_URL is empty: this build serves static data only and its forms will refuse submissions. Do not deploy it.\n",
    );
  }

  return {
    plugins: [react(), tailwindcss(), isAnalyze && visualizer({
      open: true,
      filename: "stats.html",
      gzipSize: true,
      brotliSize: true,
    })].filter(Boolean),
    // strictPort, because the backend's CORS_ALLOWED_ORIGINS names 5173 and
    // 5174 exactly. Vite's default is to slide to the next free port on a
    // collision, and the site then loads on 5175 with every API call refused by
    // the browser — a CORS error that looks like a backend fault. Better to
    // refuse to start and say the port is taken.
    server: {port: 5173, strictPort: true},
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // The public site's own tests. They cover the layer that carries an admin
    // edit to a visitor — publicApi, the content hooks and the adapters — which
    // had no automated coverage at all: the backend proved it served the right
    // JSON and the admin proved it sent the right request, and nothing proved
    // the frontend did the right thing with the answer.
    test: {
      environment: "jsdom",
      globals: false,
      include: ["src/**/*.test.{js,jsx}"],
      setupFiles: ["./src/test-setup.js"],
      // CI runs this suite on shared runners where the forks pool default
      // (cores - 1 = 11 worker processes) repeatedly failed to boot:
      // "[vitest-pool]: Failed to start forks worker ... Timeout waiting for
      // worker to respond" → exit 1, on a machine where the same 216 tests pass
      // in under a minute. Two workers cap the concurrent node processes so a
      // loaded box stays green; the suite is small enough that the slower
      // serialisation is invisible in the wall clock.
      maxWorkers: 2,
      minWorkers: 1,
    },

    build: {
      // Emits dist/.vite/manifest.json: the exact hashed asset names per module,
      // including every lazy route chunk and its CSS. scripts/preload-routes.mjs
      // reads it after the build to give each prerendered route a modulepreload
      // of its own chunk — without the manifest those names are unknowable.
      manifest: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router-dom/")) {
              return "vendor-react";
            }
            if (id.includes("node_modules/framer-motion/")) {
              return "vendor-motion";
            }
            if (id.includes("node_modules/gsap/")) {
              return "vendor-gsap";
            }
            if (id.includes("src/data/blogPosts.js")) {
              return "data-blog";
            }
            if (id.includes("src/data/programCatalog.js")) {
              return "data-programs";
            }
            // No manual chunk for jobsData. Rollup also pulls a manual chunk's
            // otherwise-unassigned dependencies into it, so "data-jobs" swallowed
            // the shared contentAdapters, the mentors data and Rollup's own
            // runtime helpers — and every page, the home page included, then had
            // to download the jobs listing to get them. Left alone, jobsData
            // lands only in the routes that import it.
            if (id.includes("src/data/policies.js")) {
              return "data-policies";
            }
          },
        },
      },
    },
  };
});
