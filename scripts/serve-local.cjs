const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};

function isFile(file) {
  try {
    return fs.statSync(file).isFile();
  } catch (_) {
    return false;
  }
}

function resolveRequestPath(root, requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch (_) {
    return null;
  }

  const relative = decoded.replace(/^[/\\]+/, "");
  const candidate = path.resolve(root, relative);
  const rootPrefix = path.resolve(root) + path.sep;
  if (candidate !== path.resolve(root) && !candidate.startsWith(rootPrefix)) return null;

  const options = [];
  if (decoded.endsWith("/")) options.push(path.join(candidate, "index.html"));
  else {
    options.push(candidate);
    if (!path.extname(candidate)) {
      options.push(`${candidate}.html`);
      options.push(path.join(candidate, "index.html"));
    }
  }

  return options.find(isFile) || null;
}

function createServer(root) {
  return http.createServer((request, response) => {
    const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
    const file = resolveRequestPath(root, requestUrl.pathname);
    if (!file) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("404 Not Found");
      return;
    }

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": MIME_TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
    });
    if (request.method === "HEAD") response.end();
    else fs.createReadStream(file).pipe(response);
  });
}

if (require.main === module) {
  const root = path.resolve(__dirname, "..");
  const port = Number(process.env.PORT || 4176);
  const server = createServer(root);
  server.listen(port, "127.0.0.1", () => {
    console.log(`The Ranchers Guide preview: http://127.0.0.1:${port}`);
  });
}

module.exports = { createServer, resolveRequestPath };
