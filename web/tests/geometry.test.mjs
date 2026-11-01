import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, tornPolygon, toPathD, scalePoints, quadCurvePoints, quadCurveAt, moonPhasePath, catmullRom, resample, ribbon } from '../src/core/geometry.js';

test('mulberry32：同 seed 同序列，不同 seed 不同', () => {
  const a = mulberry32(7); const b = mulberry32(7); const c = mulberry32(8);
  const sa = [a(), a(), a()]; const sb = [b(), b(), b()]; const sc = [c(), c(), c()];
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  assert.ok(sa.every((x) => x >= 0 && x < 1));
});

test('tornPolygon：同 seed 同输出（刷新构图不变）', () => {
  const box = [[0, 0], [400, 0], [400, 300], [0, 300]];
  const a = tornPolygon(box, { seed: 3 });
  assert.deepEqual(a, tornPolygon(box, { seed: 3 }));
  assert.notDeepEqual(a, tornPolygon(box, { seed: 4 }));
});

test('tornPolygon：顶点不足时报错；输出为 [x,y] 点列', () => {
  assert.throws(() => tornPolygon([[0, 0], [1, 1]]), /至少需要 3 个顶点/);
  const pts = tornPolygon([[0, 0], [100, 0], [50, 80]], { step: 25, seed: 2 });
  assert.ok(pts.length >= 6);
  assert.ok(pts.every((p) => p.length === 2 && p.every(Number.isFinite)));
});

test('toPathD', () => {
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

test('quadCurveAt：端点、中点与 quadCurvePoints 同一条曲线', () => {
  const p0 = [0, 100]; const c = [500, 250]; const p1 = [1000, 100];
  const start = quadCurveAt(p0, c, p1, 0);
  const mid = quadCurveAt(p0, c, p1, 0.5);
  const end = quadCurveAt(p0, c, p1, 1);
  assert.deepEqual([start.x, start.y], [0, 100]);
  assert.deepEqual([end.x, end.y], [1000, 100]);
  const sampled = quadCurvePoints(p0, c, p1, 3);
  assert.ok(Math.abs(mid.x - sampled[1].x) < 1e-9 && Math.abs(mid.y - sampled[1].y) < 1e-9);
  assert.ok(Math.abs(mid.angle) < 1e-6, '正中水平');
  assert.ok(start.angle > 5 && end.angle < -5);
  assert.throws(() => quadCurveAt(p0, c, p1, 1.1), /0–1/);
});

test('moonPhasePath：同参同路径；满月闭合整圆，上弦是半圆，蛾眉比凸月窄', () => {
  assert.equal(moonPhasePath(20, 1), moonPhasePath(20, 1));
  const full = moonPhasePath(20, 1);
  assert.match(full, /^M/);
  assert.match(full, /Z$/);
  assert.ok(full.includes('-20') && full.includes('20'), '满月盖住左右两端');
  const quarter = moonPhasePath(20, 0.5);
  assert.match(quarter, /A0 /, '上弦的明暗分界是直线');
  const crescent = moonPhasePath(20, 0.2);
  const gibbous = moonPhasePath(20, 0.72);
  const terminator = (d) => [...d.matchAll(/A([\d.]+) 20 0 0 (\d)/g)].at(-1);
  const c = terminator(crescent);
  const g = terminator(gibbous);
  assert.ok(Number(c[1]) > Number(g[1]), '蛾眉的分界更靠外，亮面更窄');
  assert.notEqual(c[2], g[2], '蛾眉与凸月的扫掠方向不同');
  assert.throws(() => moonPhasePath(0, 0.5), /r>0/);
  assert.throws(() => moonPhasePath(10, 1.2), /0–1/);
});

const ARC = [[0, 400], [200, 200], [400, 120], [600, 200], [800, 400]];

test('catmullRom：经过每个控制点；控制点不足报错', () => {
  const pts = catmullRom(ARC, 8);
  assert.deepEqual(pts[0], ARC[0]);
  assert.deepEqual(pts.at(-1), ARC.at(-1));
  assert.ok(pts.some(([x, y]) => Math.abs(x - 400) < 1e-9 && Math.abs(y - 120) < 1e-9), '中间控制点在曲线上');
  assert.throws(() => catmullRom([[0, 0]]), /至少需要 2/);
});

test('resample：相邻点间距约等于 step（末段除外），首尾保留', () => {
  const out = resample([[0, 0], [100, 0]], 10);
  assert.deepEqual(out[0], [0, 0]);
  assert.deepEqual(out.at(-1), [100, 0]);
  const gaps = out.slice(1, -1).map((p, i) => Math.hypot(p[0] - out[i][0], p[1] - out[i][1]));
  assert.ok(gaps.every((g) => Math.abs(g - 10) < 1e-6), gaps.join(','));
  assert.throws(() => resample([[0, 0], [1, 1]], 0), /step/);
});

test('ribbon：同 seed 同输出（刷新构图不变），不同 seed 不同', () => {
  const o = { a: [0, 0], b: [60, 60], wob: 10, seed: 5, gap: 40 };
  assert.deepEqual(ribbon(ARC, o), ribbon(ARC, o));
  assert.notDeepEqual(ribbon(ARC, o), ribbon(ARC, { ...o, seed: 6 }));
});

test('ribbon：输出是闭合点列，全部是有限数', () => {
  const pts = ribbon(ARC, { a: [0, 0], b: [60, 60], gap: 40 });
  assert.ok(pts.length >= 6);
  assert.ok(pts.every((p) => p.length === 2 && p.every(Number.isFinite)));
});

test('ribbon：收尖端比中段窄，且不会收成零宽或交叉', () => {
  const pts = ribbon(ARC, { a: [0, 0], b: [80, 80], pinch: [true, true], wob: 0, gap: 30 });
  const n = pts.length / 2;
  const width = (i) => Math.hypot(pts[i][0] - pts[2 * n - 1 - i][0], pts[i][1] - pts[2 * n - 1 - i][1]);
  assert.ok(width(0) > 0, '端点仍有宽度');
  assert.ok(width(0) < width(Math.floor(n / 2)) * 0.3, '端点明显窄于中段');
  assert.ok(width(n - 1) < width(Math.floor(n / 2)) * 0.3);
});

test('ribbon：t0 / t1 截取路径的一段', () => {
  const full = ribbon(ARC, { a: [0, 0], b: [40, 40], wob: 0, gap: 30 });
  const part = ribbon(ARC, { a: [0, 0], b: [40, 40], wob: 0, gap: 30, t0: 0.3, t1: 0.6 });
  assert.ok(part.length < full.length);
});

test('ribbon：参数不合法时报错', () => {
  assert.throws(() => ribbon(ARC, { b: [1, 1] }), /需要 a 和 b/);
  assert.throws(() => ribbon(ARC, { a: [0, 0], b: [1, 1], t0: 0.6, t1: 0.5 }), /t0 < t1/);
});
