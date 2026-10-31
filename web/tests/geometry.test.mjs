import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, tornPolygon, tornEdge, toClipPath, toPathD } from '../src/core/geometry.js';

test('mulberry32：同 seed 同序列，不同 seed 不同', () => {
  const a = mulberry32(7); const b = mulberry32(7); const c = mulberry32(8);
  const sa = [a(), a(), a()]; const sb = [b(), b(), b()]; const sc = [c(), c(), c()];
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  assert.ok(sa.every((x) => x >= 0 && x < 1));
});

test('tornEdge：同 seed 同输出（刷新构图不变）', () => {
  assert.equal(tornEdge(400, 300, { seed: 3 }), tornEdge(400, 300, { seed: 3 }));
  assert.notEqual(tornEdge(400, 300, { seed: 3 }), tornEdge(400, 300, { seed: 4 }));
});

test('tornEdge：是 polygon(...)，点数随边长增加，坐标在合理范围', () => {
  const css = tornEdge(400, 300, { step: 20, amp: 6, seed: 1 });
  assert.match(css, /^polygon\(.+\)$/);
  const nums = [...css.matchAll(/(-?\d+(?:\.\d+)?)%/g)].map((m) => Number(m[1]));
  assert.ok(nums.length / 2 >= 4 * 2, '每条边至少 2 个点');
  // 扰动幅度 6px 相对 300px 高 = 2%，允许少量出界
  assert.ok(nums.every((n) => n > -5 && n < 105), '坐标应在 0–100% 附近');
  const bigger = tornEdge(800, 600, { step: 20, amp: 6, seed: 1 });
  assert.ok(bigger.split(',').length > css.split(',').length);
});

test('tornPolygon：顶点不足时报错；输出为 [x,y] 点列', () => {
  assert.throws(() => tornPolygon([[0, 0], [1, 1]]), /至少需要 3 个顶点/);
  const pts = tornPolygon([[0, 0], [100, 0], [50, 80]], { step: 25, seed: 2 });
  assert.ok(pts.length >= 6);
  assert.ok(pts.every((p) => p.length === 2 && p.every(Number.isFinite)));
});

test('toClipPath / toPathD', () => {
  assert.equal(toClipPath([[0, 0], [50, 100]], 100, 100), 'polygon(0.00% 0.00%,50.00% 100.00%)');
  assert.equal(toPathD([[0, 0], [10.55, 5]]), 'M0.0 0.0L10.6 5.0Z');
});
