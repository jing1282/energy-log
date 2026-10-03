import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "out");
const port = Number(process.env.PORT ?? 47231);
const host = process.env.HOST ?? "0.0.0.0";
const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function resolve(urlPath) {
  const clean = path.normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  const candidates = [clean, path.join(clean, "index.html"), `${clean}.html`];
  for (const c of candidates) {
    const file = path.join(root, c);
    if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

http
  .createServer((req, res) => {
    let urlPath = req.url ?? "/";
    if (base) {
      const pathOnly = urlPath.split("?")[0];
      if (pathOnly === base) {
        res.writeHead(301, { location: `${base}/${urlPath.slice(base.length)}` });
        res.end();
        return;
      }
      urlPath = pathOnly.startsWith(`${base}/`) ? urlPath.slice(base.length) : "/__outside_base__";
    }
    const file = resolve(urlPath);
    if (!file) {
      const notFound = path.join(root, "404.html");
      res.writeHead(404, { "content-type": types[".html"] });
      res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : "Not found");
      return;
    }
    const ext = path.extname(file);
    const immutable = file.includes(`${path.sep}_next${path.sep}static${path.sep}`);
    res.writeHead(200, {
      "content-type": types[ext] ?? "application/octet-stream",
      "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
      ...(path.basename(file) === "sw.js"
        ? { "service-worker-allowed": base ? `${base}/` : "/" }
        : {}),
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, host, () => {
    const url = base ? `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}${base}/` : `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}/`;
    console.log(`静态站点已启动: ${url}${base ? ` (子路径 ${base})` : ""}`);
  });
