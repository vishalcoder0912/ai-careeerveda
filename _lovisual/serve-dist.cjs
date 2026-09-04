const http = require("http");
const fs = require("fs");
const path = require("path");
const root = path.join(process.cwd(), "dist");
const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".txt": "text/plain",
  ".ico": "image/x-icon",
};
http
  .createServer((req, res) => {
    try {
      let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
      if (p.endsWith(path.sep) || !path.extname(p)) p = path.join(p, "index.html");
      if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) {
        p = path.join(root, "404.html");
      }
      if (!fs.existsSync(p)) {
        res.writeHead(404);
        return res.end("not found");
      }
      res.writeHead(200, {"Content-Type": MIME[path.extname(p)] || "application/octet-stream"});
      res.end(fs.readFileSync(p));
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  })
  .listen(5199, () => console.log("serving dist on 5199"));