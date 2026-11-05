import test from 'node:test';
import assert from 'node:assert/strict';
import { nearestRung, DRAG_HINT } from '../src/features/ladder-bar/index.js';

test('拖动时落在离指针最近的档', () => {
  const points = [
    { n: 8, x: 0, y: 0 },
    { n: 4, x: 0, y: 40 },
    { n: 1, x: 0, y: 80 },
  ];
  assert.equal(nearestRung(points, 2, 36), 4);
  assert.equal(nearestRung(points, 0, 0), 8);
  assert.equal(nearestRung([], 0, 0), null);
});

test('悬停提示按拖动飞鸟来写', () => {
  assert.equal(DRAG_HINT, '拖动飞鸟，调整降维等级');
});
