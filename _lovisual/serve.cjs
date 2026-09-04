const http = require("http");
const fs = require("fs");
const path = require("path");
const root = path.join(process.cwd(), "_lovisual", "dist");
http
  .createServer((req, res) => {
    const urlPath = req.url === "/" ? "index.html" : req.url.split("?")[0];
    let p = path.join(root, urlPath);
    if (!fs.existsSync(p)) {
      res.writeHead(404);
      return res.end("not found");
    }
    const ext = path.extname(p);
    const type = ext === ".js" ? "application/javascript" : ext === ".css" ? "text/css" : "text/html";
    res.writeHead(200, {"Content-Type": type});
    res.end(fs.readFileSync(p));
  })
  .listen(5199, () => console.log("serving on 5199"));