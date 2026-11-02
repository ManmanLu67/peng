import test from 'node:test';
import assert from 'node:assert/strict';
import { cacheControl, encodingFor } from '../scripts/static.mjs';

test('带哈希的脚本和样式长期缓存，页面和数据不缓存', () => {
  assert.equal(cacheControl('assets/app-AB12CD34.js'), 'public, max-age=31536000, immutable');
  assert.equal(cacheControl('assets/app-ab12cd34.css'), 'public, max-age=31536000, immutable');
  assert.equal(cacheControl('index.html'), 'no-cache');
  assert.equal(cacheControl('src/app.js'), 'no-cache');
  assert.equal(cacheControl('data/rungs.json'), 'no-cache');
  assert.equal(cacheControl('styles/app.css'), 'no-cache');
});

test('压缩编码优先 brotli，其次 gzip', () => {
  assert.equal(encodingFor('gzip, deflate, br'), 'br');
  assert.equal(encodingFor('gzip'), 'gzip');
  assert.equal(encodingFor('br;q=0, gzip'), 'gzip');
  assert.equal(encodingFor(''), null);
});
