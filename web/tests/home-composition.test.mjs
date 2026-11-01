import test from 'node:test';
import assert from 'node:assert/strict';
import { VIEW, NARROW, LAYERS, FLOCK, SPECKS, STARS, SCENE, TEXT, WIDE_MIN_ASPECT } from '../src/features/home-hero/composition.js';

const blocks = Object.values(LAYERS).flat();

test('构图：每块纸的 id 唯一，顶点都是有限数，且至少 3 个点', () => {
  const ids = blocks.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length, '重复的 id');
  for (const b of blocks) {
    assert.ok(b.pts.length >= 3, `${b.id} 顶点不足`);
    assert.ok(b.pts.every((p) => p.length === 2 && p.every(Number.isFinite)), `${b.id} 有非有限数`);
  }
});

test('构图：纸块的 seed 唯一（同 seed 会让两块纸的撕边一模一样）', () => {
  const seeds = blocks.map((b) => b.seed);
  assert.equal(new Set(seeds).size, seeds.length);
});

test('构图：只用 composition 里允许的色 token', () => {
  const ok = /^var\(--(paper|ochre|indigo|teal|rust|charcoal|soot|soot-deep|graphite|sand|tan|slate)\)$/;
  for (const b of blocks) assert.match(b.tone, ok, `${b.id} 用了未声明的色 ${b.tone}`);
});

test('鸟群：约 50 只，三种形态，相向而飞（左右都有）', () => {
  assert.ok(FLOCK.length >= 45 && FLOCK.length <= 55, `共 ${FLOCK.length} 只`);
  assert.deepEqual([...new Set(FLOCK.map((f) => f[0]))].sort(), ['far', 'glide', 'spread']);
  const r = FLOCK.filter((f) => f[1] === 'r').length;
  const l = FLOCK.filter((f) => f[1] === 'l').length;
  assert.equal(r + l, FLOCK.length, '朝向只能是 r / l');
  assert.ok(r >= 15 && l >= 15, `朝右 ${r}，朝左 ${l}：两边都要有足够多`);
});

test('鸟群：朝右的鸟在拱顶左侧为主，朝左的鸟在拱顶右侧为主（相会而非穿越）', () => {
  const crest = 1260;
  const rightFacing = FLOCK.filter((f) => f[1] === 'r');
  const leftFacing = FLOCK.filter((f) => f[1] === 'l');
  const inside = (arr, pred) => arr.filter((f) => pred(f[2])).length / arr.length;
  assert.ok(inside(rightFacing, (x) => x < crest) >= 0.9, '朝右的鸟应几乎都在拱顶左侧');
  assert.ok(inside(leftFacing, (x) => x > crest) >= 0.9, '朝左的鸟应几乎都在拱顶右侧');
});

test('鸟群：拱顶中缝没有鸟互相压住（x 1225–1310 之间、y 480–560 内不放鸟）', () => {
  const inGap = FLOCK.filter(([, , x, y]) => x > 1225 && x < 1310 && y > 480 && y < 560);
  assert.equal(inGap.length, 0, JSON.stringify(inGap));
});

test('鸟群：所有鸟都在画内，缩放与不透明度合法', () => {
  for (const [kind, dir, x, y, climb, s, o] of FLOCK) {
    assert.ok(x > 0 && x < VIEW.w && y > 0 && y < VIEW.h, `${kind} ${x},${y} 出界`);
    assert.ok(Number.isFinite(climb) && s > 0, `${kind} 参数不合法`);
    assert.ok(o === undefined || (o > 0 && o <= 1));
    assert.ok(dir === 'r' || dir === 'l');
  }
});

test('点缀：小黑点只落在右上象限，星 3 颗', () => {
  assert.ok(SPECKS.every(([cx, cy]) => cx >= 1250 && cy <= 480), '黑点跑出了右上象限');
  assert.equal(STARS.length, 3);
  assert.equal(new Set(STARS.map((s) => s[3])).size, 3, '三颗星的延迟要错开');
});

test('行人在左下暗坡上，约 x 185–235', () => {
  assert.ok(SCENE.x >= 185 && SCENE.x <= 235);
  assert.ok(SCENE.y > VIEW.h * 0.7);
});

test('文字框：右缘留余量仍在画内；竖屏阈值与它一致', () => {
  assert.ok(TEXT.x + TEXT.w + 40 <= WIDE_MIN_ASPECT * VIEW.h + 1e-6);
  assert.ok(TEXT.bottom < VIEW.h, '底边留在画内');
  assert.ok(WIDE_MIN_ASPECT > 1 && WIDE_MIN_ASPECT < 2);
});

test('竖屏：取景宽度能装下行人与拱的左半', () => {
  assert.ok(NARROW.w > SCENE.x + 100);
  assert.ok(NARROW.w < VIEW.w);
});
