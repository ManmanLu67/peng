import test from 'node:test';
import assert from 'node:assert/strict';
import { moreBelow } from '../src/features/compare/index.js';

test('对比区还有内容在下面时才提示', () => {
  assert.equal(moreBelow({ scrollHeight: 400, scrollTop: 0, clientHeight: 200 }), true);
  assert.equal(moreBelow({ scrollHeight: 200, scrollTop: 0, clientHeight: 200 }), false);
  assert.equal(moreBelow({ scrollHeight: 400, scrollTop: 200, clientHeight: 200 }), false);
});
