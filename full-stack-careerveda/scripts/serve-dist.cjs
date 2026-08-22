const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "dist");
const port = Number(process.env.PORT || 5180);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    let filePath = path.resolve(root, `.${decodeURIComponent(requested)}`);

    // scripts/prerender.mjs writes each route as <route>/index.html, which is
    // what Vercel resolves for an extensionless URL. Without the same rule here
    // a local check of /programs/x reads a directory, fails, and falls through
    // to the SPA template — i.e. it would show exactly the bug being fixed and
    // report the fix as broken.
    try {
      if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
    } catch {
      // Missing path: fall through to the readFile below, which serves the SPA.
    }

    if (!filePath.startsWith(root)) {
      send(res, 403, "Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        fs.readFile(path.join(root, "index.html"), (fallbackError, fallback) => {
          if (fallbackError) {
            send(res, 404, "Not found");
            return;
          }
          send(res, 200, fallback, types[".html"]);
        });
        return;
      }

      send(res, 200, data, types[path.extname(filePath)] || "application/octet-stream");
    });
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`Static preview running at http://127.0.0.1:${port}/`);
  });
