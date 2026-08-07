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
    },

    build: {
      // Everything used to land in one ~540 KB entry chunk, so shipping a copy
      // fix invalidated React and the animation libraries along with it. Split by
      // how often each part changes: the vendors are stable and stay cached
      // across deploys, and the browser downloads them in parallel rather than
      // parsing one long file.
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-motion": ["framer-motion"],
            "vendor-gsap": ["gsap", "gsap/ScrollTrigger"],
          },
        },
      },
    },
  };
});
