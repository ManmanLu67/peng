// 发布包的缓存和压缩协商。开发时的源码文件名不带哈希，继续 no-cache。
import { basename } from 'node:path';

const HASHED = /-[0-9A-Za-z_-]{8}\.(?:js|mjs|css)$/;

export function cacheControl(filePath) {
  return HASHED.test(basename(filePath))
    ? 'public, max-age=31536000, immutable'
    : 'no-cache';
}

function allowed(header, coding) {
  for (const part of header.toLowerCase().split(',')) {
    const [name, ...params] = part.trim().split(';').map((s) => s.trim());
    if (name !== coding) continue;
    const q = params.find((p) => p.startsWith('q='));
    if (q && Number(q.slice(2)) === 0) return false;
    return true;
  }
  return false;
}

/** @returns {'br'|'gzip'|null} */
export function encodingFor(accept) {
  const h = accept ?? '';
  if (allowed(h, 'br')) return 'br';
  if (allowed(h, 'gzip')) return 'gzip';
  return null;
}
