import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme, THEME_KEY } from '../src/adapters/theme/pref.js';

test('已保存的浅色或深色优先于系统偏好', () => {
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('light', true), 'light');
});

test('没有保存时跟随系统', () => {
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme('', false), 'light');
  assert.equal(resolveTheme('other', false), 'light');
});

test('存储键固定，避免和页面脚本不一致', () => {
  assert.equal(THEME_KEY, 'peng-theme');
});
