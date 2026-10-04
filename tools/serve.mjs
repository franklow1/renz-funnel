#!/usr/bin/env node
/* A preview server that supports HTTP Range.
   Python's http.server does not, and without Range a browser cannot seek a video:
   the scan scrubs to zero and stays there, which looks exactly like a broken page.
   GitHub Pages serves Range, so this is the server that tells the truth.
     node tools/serve.mjs [port] [dir] */
import { createServer } from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const PORT = +(process.argv[2] || 8744);
const ROOT = process.argv[3] || 'preview';
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json', '.mp4':'video/mp4',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp',
  '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2' };

createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (!existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('not found');
  }
  const size = statSync(file).size;
  const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m[1] ? +m[1] : 0;
    let end = m[2] ? +m[2] : size - 1;
    if (isNaN(start) || isNaN(end) || start > end || end >= size) {
      res.writeHead(416, { 'content-range': `bytes */${size}` }); return res.end();
    }
    res.writeHead(206, { 'content-type': type, 'content-length': end - start + 1,
      'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes' });
    return createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`preview on http://127.0.0.1:${PORT}  (Range supported)`));
