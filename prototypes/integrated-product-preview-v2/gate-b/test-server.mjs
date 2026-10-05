import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
export async function serve(root, port = 0) {
  root = resolve(root);
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
  };
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const path = resolve(
        root,
        "." + pathname + (pathname.endsWith("/") ? "index.html" : ""),
      );
      if (!path.startsWith(root + sep)) {
        res.writeHead(403).end();
        return;
      }
      const body = await readFile(path);
      res
        .writeHead(200, {
          "Content-Type": types[extname(path)] || "application/octet-stream",
          "Cache-Control": "no-store",
        })
        .end(body);
    } catch {
      res.writeHead(404).end("Not found");
    }
  });
  await new Promise((r) => server.listen(port, "127.0.0.1", r));
  return {
    server,
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((r) => server.close(r)),
  };
}
