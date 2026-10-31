import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, tornPolygon, tornEdge, toClipPath, toPathD, scalePoints, quadCurvePoints } from '../src/core/geometry.js';

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

test('scalePoints：百分比 → viewBox 坐标', () => {
  assert.deepEqual(scalePoints([[0, 0], [50, 25], [100, 100]], 1600, 1000), [[0, 0], [800, 250], [1600, 1000]]);
});

test('quadCurvePoints：n 个点，首尾落在端点上', () => {
  const pts = quadCurvePoints([0, 100], [500, 250], [1000, 100], 14);
  assert.equal(pts.length, 14);
  assert.deepEqual([pts[0].x, pts[0].y], [0, 100]);
  assert.ok(Math.abs(pts.at(-1).x - 1000) < 1e-9 && Math.abs(pts.at(-1).y - 100) < 1e-9);
});

test('quadCurvePoints：下垂曲线 —— 最低点在中间，起点俯、终点仰，对称', () => {
  const pts = quadCurvePoints([0, 100], [500, 250], [1000, 100], 15);   // 奇数个点，正中一个
  const mid = pts[7];
  assert.ok(Math.abs(mid.angle) < 1e-6, '正中水平');
  assert.ok(pts.every((p) => p.y <= mid.y + 1e-9), '中点最低（svg 里 y 越大越靠下）');
  assert.ok(pts[0].angle > 5, '起点向下倾');
  assert.ok(pts.at(-1).angle < -5, '终点向上翘');
  assert.ok(Math.abs(pts[0].angle + pts.at(-1).angle) < 1e-6, '左右对称');
});

test('quadCurvePoints：相邻点间距均匀到足以让喜鹊首尾相接（最大 / 最小 < 1.6）', () => {
  const pts = quadCurvePoints([20, 110], [500, 250], [980, 110], 14);
  const gaps = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  assert.ok(Math.max(...gaps) / Math.min(...gaps) < 1.6, gaps.join(','));
});

test('quadCurvePoints：n 太小报错', () => {
  assert.throws(() => quadCurvePoints([0, 0], [1, 1], [2, 0], 1), /至少为 2/);
});
