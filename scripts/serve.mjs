// Tiny static server with Netlify-style pretty URLs (/about -> about.html)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] || process.cwd();
const port = Number(process.argv[3] || 5173);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.avif':'image/avif', '.json':'application/json', '.ico':'image/x-icon', '.txt':'text/plain', '.xml':'application/xml', '.woff2':'font/woff2' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  let file = path.join(root, p);
  if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found: ' + p); }
  res.writeHead(200, { 'content-type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log('serving', root, 'on http://localhost:' + port));
