import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CARDS, ARROWS, POEM, COPY, FOLLOW, GAIN, NARROW_MAX,
  HOVER_TURN, HOVER_SCALE, FLOCK_AIM, clampBird, mirrorThroughCenter,
} from '../src/features/home-hero/composition.js';

test('两张近正方形色纸：左卡逆时针 3°，右卡顺时针 3°', () => {
  assert.equal(CARDS.length, 2);
  assert.equal(new Set(CARDS.map((c) => c.id)).size, 2);
  assert.equal(new Set(CARDS.map((c) => c.seed)).size, 2);
  assert.equal(CARDS[0].tone, 'var(--card-amber)');
  assert.equal(CARDS[1].tone, 'var(--card-pumpkin)');
  assert.equal(CARDS[0].turn, -3);
  assert.equal(CARDS[1].turn, 3);
});

test('对角线上七只鸟从英语到 HSK 6，静止鸟朝上，右卡的鸟都不可拖', () => {
  const flock = ARROWS.filter((a) => a.id !== 'mark');
  const still = ARROWS.filter((a) => a.id === 'mark');
  assert.equal(flock.length, 7);
  assert.deepEqual(flock.map((a) => a.id), ['en', 'hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6']);
  assert.deepEqual(flock.map((a) => a.label), ['英语', 'HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6']);
  for (let i = 1; i < flock.length; i++) {
    assert.ok(flock[i].fx > flock[i - 1].fx, 'fx 应递增');
    assert.ok(flock[i].fy < flock[i - 1].fy, 'fy 应递减');
    assert.ok(flock[i].s >= flock[i - 1].s, '应由小到大');
  }
  for (const a of flock) {
    assert.equal(a.rot, FLOCK_AIM);
    assert.equal(a.text, undefined);
    assert.ok(a.fx > 0.08 && a.fx < 0.92 && a.fy > 0.08 && a.fy < 0.96);
  }
  assert.equal(flock.filter((a) => a.tone === 'paper').length, 4);
  assert.equal(flock.filter((a) => a.tone === 'navy').length, 3);
  assert.equal(still.length, 1);
  assert.equal(still[0].rot, 0);
  assert.equal(still[0].label, '飞鸟');
  assert.equal(still[0].text, undefined);
  assert.ok(ARROWS.every((a) => a.drag === false));
  assert.ok(still[0].fx > 0.8, '静止鸟占位在右侧');
  assert.ok(still[0].fy > 0.7, '静止鸟占位在右下，飞完后的位置是 A 的对称点');
});

test('静止鸟的对称点：左下的 A 映到右上', () => {
  assert.deepEqual(mirrorThroughCenter(20, 80, 100, 100), { x: 80, y: 20 });
  assert.deepEqual(mirrorThroughCenter(50, 50, 100, 100), { x: 50, y: 50 });
});

test('拖动边界：卡内不动，出界被拉回，半宽过大时落到中心', () => {
  const stay = clampBird(50, 40, 10, 12, 100, 80);
  assert.deepEqual(stay, { x: 50, y: 40 });
  const pulled = clampBird(-20, 200, 10, 8, 100, 80);
  assert.equal(pulled.x, 10);
  assert.equal(pulled.y, 72);
  assert.ok(pulled.x - 10 >= 0 && pulled.x + 10 <= 100);
  assert.ok(pulled.y - 8 >= 0 && pulled.y + 8 <= 80);
  const huge = clampBird(5, 5, 60, 50, 100, 80);
  assert.deepEqual(huge, { x: 50, y: 40 });
});

test('悬停放大并逆时针转 90°', () => {
  assert.equal(HOVER_TURN, -90);
  assert.ok(HOVER_SCALE > 1);
});

test('左卡一行两句，角标和页脚按说明正文', () => {
  assert.equal(POEM.columns.length, 8);
  assert.equal(POEM.columns[0][0], '行行重行行');
  assert.equal(POEM.columns[0][1], '与君生别离');
  assert.equal(POEM.columns.at(-1).at(-1), '努力加餐饭');
  assert.ok(POEM.columns.every((col) => col.length === 2 && col.every((line) => line.length === 5)));
  const flat = POEM.columns.flat().join('');
  assert.equal(flat.length, 80);
  assert.equal(COPY.tag.left, 'Original Text');
  assert.equal(COPY.tag.right, 'Adapted Text');
  assert.equal(COPY.footer.left, 'Meet the language halfway.');
  assert.equal(COPY.footer.left.includes('*'), false);
  assert.equal(COPY.footer.left.includes('\n'), false);
  assert.equal(COPY.footer.right, 'Ctrl+Alt+Culture — PENG STUDIOS');
  assert.equal(COPY.enter, '进入');
  assert.ok(FOLLOW >= 0.08 && FOLLOW <= 0.15);
  assert.equal(GAIN, 0.35);
  assert.equal(NARROW_MAX, 720);
});

test('首页降维静态稿与阶梯 1–7 档对齐', () => {
  const rungs = JSON.parse(readFileSync(new URL('../data/rungs.json', import.meta.url), 'utf8'));
  const poem = JSON.parse(readFileSync(new URL('../data/home-poem.json', import.meta.url), 'utf8'));
  for (const id of ['en', 'hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6']) {
    const rung = rungs.find((r) => r.id === id);
    const entry = poem.rungs[String(rung.n)];
    assert.equal(typeof entry.text, 'string');
    assert.ok(entry.text.trim().length > 0);
    assert.equal(entry.lang, rung.lang === 'en' ? 'en' : 'zh');
  }
  assert.equal(poem.rungs['8'], undefined);
});

test('页脚标语整句输出，不再把后半句拆开', () => {
  const src = readFileSync(new URL('../src/features/home-hero/index.js', import.meta.url), 'utf8');
  assert.match(src, /COPY\.footer\.left/);
  assert.equal(src.includes('halfway'), false);
});
