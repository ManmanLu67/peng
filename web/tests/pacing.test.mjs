import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readTimeMs, rawReadMs, PACING } from '../src/core/pacing.js';

test('上下限是 5 s 和 10 s', () => {
  assert.equal(PACING.minMs, 5000);
  assert.equal(PACING.maxMs, 10000);
});

test('rawReadMs：汉字 6 字/秒，英文 4 词/秒，互不干扰', () => {
  assert.equal(rawReadMs('一'.repeat(12)), 2000);
  assert.equal(rawReadMs(Array(8).fill('word').join(' ')), 2000);
  assert.equal(rawReadMs('一'.repeat(6) + ' ' + Array(4).fill('word').join(' ')), 2000);
  assert.equal(rawReadMs(''), 0);
});

test('任何输入的停留时间都在 5–10 s 之内', () => {
  for (const text of ['', '水', '水很烫。', '一'.repeat(30), '一'.repeat(300), 'word '.repeat(500)]) {
    for (const o of [{}, { firstVisit: '一'.repeat(100) }]) {
      const ms = readTimeMs(text, o);
      assert.ok(ms >= 5000 && ms <= 10000, `${text.slice(0, 6)} → ${ms}`);
    }
  }
});

test('字多的一页比字少的一页停得久（在上下限之内单调不减）', () => {
  const short = readTimeMs('水很烫。');
  const long = readTimeMs('一'.repeat(24));
  assert.ok(long > short, `${short} -> ${long}`);
});

test('超长内容封顶 10 s，不会卡住演示', () => {
  assert.equal(readTimeMs('一'.repeat(2000)), 10000);
});

test('第一页（带首次内容）不短于同样内容的后续页', () => {
  const fresh = '一'.repeat(8);
  assert.ok(readTimeMs(fresh, { firstVisit: '一'.repeat(40) }) >= readTimeMs(fresh));
});

test('演示数据：四页停留都在 5–10 s，总时长约 25–40 秒', () => {
  const demo = JSON.parse(readFileSync(new URL('../data/demo.json', import.meta.url), 'utf8')).entries[0];
  const times = [4, 3, 2, 1].map((n, i) => {
    const first = i === 0 ? `${demo.rungs['8']} ${demo.english} ${demo.culture_note.zh} ${demo.culture_note.en}` : '';
    return readTimeMs(demo.rungs[n], { firstVisit: first });
  });
  for (const ms of times) assert.ok(ms >= 5000 && ms <= 10000, String(ms));
  const total = times.reduce((a, b) => a + b, 0);
  assert.ok(total >= 20000 && total <= 40000, `总时长 ${total} ms，各页 ${times}`);
});
