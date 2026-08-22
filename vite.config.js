import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// In production Vercel runs everything in api/ as a serverless function. Vite's
// dev server knows nothing about that, so `npm run dev` used to answer
// POST /api/enroll with index.html — the form then failed with "we couldn't save
// your application", which looked like a database fault but was a missing route.
//
// This runs the same handler files in-process, with the small slice of the Vercel
// req/res API they actually use (req.body, res.status().json()). It is dev-only;
// on Vercel the real runtime serves these and this plugin never loads.
const apiDevServer = (env) => ({
  name: "api-dev-server",
  apply: "serve",
  configureServer(server) {
    // The handlers read process.env.MONGODB_URI. Vite only exposes VITE_* to the
    // client and does not populate process.env for server code, so bridge the
    // non-public vars across explicitly.
    for (const key of ["MONGODB_URI", "MONGODB_DB", "IMAGEKIT_PRIVATE_KEY"]) {
      if (env[key] && !process.env[key]) process.env[key] = env[key];
    }

    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith("/api/")) return next();

      const route = req.url.split("?")[0].replace(/^\/api\//, "").replace(/\/$/, "");
      const file = path.resolve(__dirname, "api", `${route}.js`);

      try {
        const body = await new Promise((resolve, reject) => {
          const chunks = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf8");
            if (!raw) return resolve({});
            try {
              resolve(JSON.parse(raw));
            } catch {
              // Malformed JSON is the client's problem; hand the handler an empty
              // body and let its own validation reject it.
              resolve({});
            }
          });
          req.on("error", reject);
        });

        req.body = body;

        // Minimal Vercel-style response shim.
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (payload) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(payload));
          return res;
        };
        res.setHeader ??= () => res;

        // ssrLoadModule, not import(): it applies Vite's transforms, so the
        // handler's `import ... from "../src/data/programCatalog.js"` resolves.
        const module = await server.ssrLoadModule(file);
        await module.default(req, res);
      } catch (error) {
        server.config.logger.error(`[api] ${req.url} failed: ${error.message}`);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({error: "The local API route failed. See the terminal."}));
      }
    });
  },
});

export default defineConfig(({mode}) => {
  // "" loads every variable, not just the VITE_-prefixed ones.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss(), apiDevServer(env)],
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
            if (id.includes("src/data/jobsData.js")) {
              return "data-jobs";
            }
            if (id.includes("src/data/policies.js")) {
              return "data-policies";
            }
          },
        },
      },
    },
  };
});
