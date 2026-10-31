import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readTimeMs, PACING } from '../src/core/pacing.js';

test('空内容取下限', () => assert.equal(readTimeMs(''), PACING.minMs));

test('字少的页面取下限，不会一闪而过', () => {
  assert.equal(readTimeMs('水很烫。'), PACING.minMs);
});

test('字多的页面停得更久，且单调不减', () => {
  const a = readTimeMs('一'.repeat(40));
  const b = readTimeMs('一'.repeat(80));
  assert.ok(b > a);
  assert.ok(a >= PACING.minMs);
});

test('超长内容封顶，不会卡住演示', () => {
  assert.equal(readTimeMs('一'.repeat(2000)), PACING.maxMs);
});

test('汉字与英文分别计量：40 汉字 = 10 s + 缓冲；30 英文词 = 10 s + 缓冲', () => {
  assert.equal(readTimeMs('一'.repeat(40)), 10000 + PACING.bufferMs);
  assert.equal(readTimeMs(Array(30).fill('word').join(' ')), 10000 + PACING.bufferMs);
});

test('中英混排时两部分相加', () => {
  const mixed = '一'.repeat(40) + ' ' + Array(30).fill('word').join(' ');
  assert.equal(readTimeMs(mixed), 10000 + 10000 + PACING.bufferMs);
});

test('演示数据：每一档加上文化条的停留都在上下限内，总时长约 0.5–2 分钟', () => {
  const demo = JSON.parse(readFileSync(new URL('../data/demo.json', import.meta.url), 'utf8')).entries[0];
  const note = demo.culture_note.zh + ' ' + demo.culture_note.en;
  let total = 0;
  for (const n of [4, 3, 2, 1]) {
    const page = demo.rungs['8'] + ' ' + demo.rungs[n] + ' ' + (n === 1 ? '' : demo.english) + ' ' + note;
    const ms = readTimeMs(page);
    assert.ok(ms >= PACING.minMs && ms <= PACING.maxMs, `rung ${n}: ${ms}`);
    total += ms;
  }
  assert.ok(total >= 30000 && total <= 120000, `总时长 ${total} ms`);
});
