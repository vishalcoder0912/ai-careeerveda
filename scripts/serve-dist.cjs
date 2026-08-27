const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

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

// gzip like production does (nginx.conf: gzip on, same types). Without this the
// preview server ships every asset uncompressed, and a Lighthouse run against it
// models ~3x the wire bytes the real site sends — CSS "3.5s" on slow 4G that is
// actually ~600ms gzipped. Measuring against uncompressed local serving optimises
// for a server nobody runs.
const compressible = new Set([".html", ".js", ".css", ".json", ".svg"]);

function send(res, status, body, type = "text/plain; charset=utf-8", filePath, wantsGzip) {
  const headers = {
    "Content-Type": type,
    "Cache-Control": "no-store",
    Vary: "Accept-Encoding",
  };

  if (status === 200 && body && wantsGzip && compressible.has(path.extname(filePath ?? ""))) {
    headers["Content-Encoding"] = "gzip";
    res.writeHead(status, headers);
    res.end(zlib.gzipSync(body));
    return;
  }

  res.writeHead(status, headers);
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

    const wantsGzip = /\bgzip\b/.test(req.headers["accept-encoding"] ?? "");

    fs.readFile(filePath, (error, data) => {
      if (error) {
        fs.readFile(path.join(root, "index.html"), (fallbackError, fallback) => {
          if (fallbackError) {
            send(res, 404, "Not found");
            return;
          }
          send(res, 200, fallback, types[".html"], path.join(root, "index.html"), wantsGzip);
        });
        return;
      }

      send(
        res,
        200,
        data,
        types[path.extname(filePath)] || "application/octet-stream",
        filePath,
        wantsGzip,
      );
    });
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`Static preview running at http://127.0.0.1:${port}/`);
  });
