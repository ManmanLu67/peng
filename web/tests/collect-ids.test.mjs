import test from 'node:test';
import assert from 'node:assert/strict';
import { collectIds } from '../src/shell/mount.js';

test('收集页面清单里的功能，含槽位', () => {
  const ids = collectIds([
    { id: 'topbar', slots: { left: ['logo'], center: [{ id: 'nav', options: { brand: true } }] } },
    'home-hero',
  ]);
  assert.deepEqual(ids, ['topbar', 'logo', 'nav', 'home-hero']);
});
