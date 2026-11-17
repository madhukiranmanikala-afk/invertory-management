/**
 * Static file server for the Inventory Management frontend.
 *
 * Serves the `public/` folder as-is. There is no API layer here: the frontend
 * keeps using its in-memory mock data, so no frontend file needs to change.
 *
 * Usage:
 *   node server.js            # http://localhost:3000
 *   PORT=8080 node server.js  # custom port
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('./public', import.meta.url)));
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function resolveRequestPath(url) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  } catch {
    return null;
  }

  // Map "/" to index.html, and resolve everything inside rootDir.
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = resolve(rootDir, normalize(relative));

  // Reject path traversal attempts (e.g. /../../etc/passwd).
  if (filePath !== rootDir && !filePath.startsWith(rootDir + sep)) return null;
  return filePath;
}

async function handleRequest(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
    return;
  }

  let filePath = resolveRequestPath(req.url);
  if (!filePath) {
    send(res, 400, 'Bad Request');
    return;
  }

  let info;
  try {
    info = await stat(filePath);
    // Directories fall back to their index.html (e.g. /css/ -> /css/index.html).
    if (info.isDirectory()) {
      filePath = join(filePath, 'index.html');
      info = await stat(filePath);
    }
  } catch {
    send(res, 404, 'Not Found');
    return;
  }

  const headers = {
    'Content-Type': MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': 'no-cache',
  };

  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const stream = createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) send(res, 500, 'Internal Server Error');
    else res.destroy();
  });
  stream.pipe(res);
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error(error);
    if (!res.headersSent) send(res, 500, 'Internal Server Error');
    else res.destroy();
  });
});

server.listen(port, host, () => {
  console.log(`Inventory Management frontend running at http://localhost:${port}/`);
});
