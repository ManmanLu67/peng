import test from 'node:test';
import assert from 'node:assert/strict';
import { resultCardText, chatModeShown } from '../src/features/chat/index.js';

test('正在看的结果卡不再写点击查看', () => {
  assert.equal(resultCardText(true, 'HSK 3'), '正在看 HSK 3');
  assert.equal(resultCardText(false, 'HSK 3'), '点击查看 HSK 3 简化结果');
});

test('聊天模式暂时不出现在工作台', () => {
  assert.equal(chatModeShown, false);
});
