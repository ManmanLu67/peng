// 本机静态文件服务。只监听 127.0.0.1，不暴露到局域网；只读 web/ 目录。
// 用法：node scripts/serve.mjs [端口]    默认 5173
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 5173);
const HOST = '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

// 只拦路径穿越和以点开头的文件/目录（.git 等）
function resolvePath(urlPath) {
  let p;
  try {
    p = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }
  if (p.includes('\0')) return null;
  if (p.endsWith('/')) p += 'index.html';
  const full = normalize(join(ROOT, p));
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null;
  const rel = full.slice(ROOT.length);
  if (rel.split(sep).some((seg) => seg.startsWith('.'))) return null;
  return full;
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const file = resolvePath(req.url ?? '/');
  if (!file) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`端口 ${PORT} 已被占用。换一个：node scripts/serve.mjs 5174`);
  else console.error(err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`朋 peng 本机预览：http://${HOST}:${PORT}/   （Ctrl+C 退出）`);
});
