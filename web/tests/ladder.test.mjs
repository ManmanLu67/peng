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

test('英文档不能再降', () => {
  assert.equal(ladder.canStepDown(1), false);
  assert.equal(ladder.canStepDown(2), true);
});

test('availability：英文档“没看懂”禁用，“看懂了”仍可用', () => {
  const a = ladder.availability({ status: 'english', rung: 1, messages: [{}], understood: false });
  assert.equal(a.notUnderstood, false);
  assert.equal(a.gotIt, true);
});

test('availability：原文档可以继续降，也可以点看懂了', () => {
  const a = ladder.availability({ status: 'result', rung: 8, messages: [{}], understood: false });
  assert.equal(a.notUnderstood, true);
  assert.equal(a.gotIt, true);
});

test('availability：运行中全部禁用；没有结果时也禁用', () => {
  const running = ladder.availability({ status: 'running', rung: 4, messages: [{}], understood: false });
  assert.equal(running.gotIt || running.notUnderstood, false);
  assert.equal(running.send, false);
  const idle = ladder.availability({ status: 'idle', rung: null, messages: [], understood: false });
  assert.equal(idle.gotIt || idle.notUnderstood, false);
  assert.equal(idle.send, true);
});

test('availability：看懂后“看懂了”禁用，“没看懂”仍可用', () => {
  const a = ladder.availability({ status: 'result', rung: 4, messages: [{}], understood: true });
  assert.equal(a.gotIt, false);
  assert.equal(a.notUnderstood, true);
});

test('availability：失败后只有“重试”可用，其他按钮都不亮', () => {
  const failed = ladder.availability({
    status: 'error', rung: 4, messages: [{}], understood: false, lastCall: { action: 'submit', req: {} },
  });
  assert.equal(failed.retry, true);
  assert.equal(failed.gotIt || failed.notUnderstood, false);
  assert.equal(failed.send, true);
  // 没有上一次请求、演示中、或不是失败态时，不出现重试
  assert.equal(ladder.availability({ status: 'error', rung: null, messages: [] }).retry, false);
  assert.equal(ladder.availability({ status: 'error', messages: [], demo: true, lastCall: {} }).retry, false);
  assert.equal(ladder.availability({ status: 'result', rung: 4, messages: [{}], lastCall: {} }).retry, false);
  assert.equal(ladder.availability({ status: 'running', rung: 4, messages: [{}], lastCall: {} }).retry, false);
});

test('“还原”“更简单”已删除：availability 不再给出这两项', () => {
  const a = ladder.availability({ status: 'result', rung: 4, messages: [{}], understood: false });
  assert.equal('closer' in a, false);
  assert.equal('simpler' in a, false);
  assert.equal(ladder.canStepUp, undefined);
});
