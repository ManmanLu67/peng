import test from 'node:test';
import assert from 'node:assert/strict';
import { createLadder } from '../src/core/ladder.js';
import { readData } from './helpers.mjs';

const ladder = createLadder(readData('rungs'));

test('档位共 8 级，1=英文，8=原文', () => {
  assert.equal(ladder.list.length, 8);
  assert.equal(ladder.min, 1);
  assert.equal(ladder.max, 8);
  assert.equal(ladder.isEnglish(1), true);
  assert.equal(ladder.isOriginal(8), true);
});

test('HSK n 对应第 n+1 级，并可反查', () => {
  for (let h = 1; h <= 6; h++) {
    assert.equal(ladder.hskToRung(h), h + 1);
    assert.equal(ladder.rungToHsk(h + 1), h);
  }
  assert.equal(ladder.rungToHsk(1), null);
  assert.equal(ladder.rungToHsk(8), null);
});

test('HSK 选档顺序为 6→1', () => {
  assert.deepEqual(ladder.hskRungs().map((r) => r.hsk), [6, 5, 4, 3, 2, 1]);
});

test('两端不可再移动', () => {
  assert.equal(ladder.canStepDown(1), false);
  assert.equal(ladder.canStepDown(2), true);
  assert.equal(ladder.canStepUp(8), false);
  assert.equal(ladder.canStepUp(7), true);
});

test('availability：英文档“更简单”和“没看懂”禁用，“更接近原文”可用', () => {
  const st = { status: 'english', rung: 1, messages: [{}], understood: false };
  const a = ladder.availability(st);
  assert.equal(a.simpler, false);
  assert.equal(a.notUnderstood, false);
  assert.equal(a.closer, true);
});

test('availability：原文档“更接近原文”禁用', () => {
  const a = ladder.availability({ status: 'result', rung: 8, messages: [{}], understood: false });
  assert.equal(a.closer, false);
  assert.equal(a.simpler, true);
});

test('availability：运行中全部禁用；没有结果时也禁用', () => {
  const running = ladder.availability({ status: 'running', rung: 4, messages: [{}], understood: false });
  assert.equal(running.simpler || running.closer || running.notUnderstood || running.gotIt, false);
  assert.equal(running.send, false);
  const idle = ladder.availability({ status: 'idle', rung: null, messages: [], understood: false });
  assert.equal(idle.simpler || idle.closer || idle.notUnderstood || idle.gotIt, false);
  assert.equal(idle.send, true);
});

test('availability：看懂后“看懂了”禁用', () => {
  const a = ladder.availability({ status: 'result', rung: 4, messages: [{}], understood: true });
  assert.equal(a.gotIt, false);
});
