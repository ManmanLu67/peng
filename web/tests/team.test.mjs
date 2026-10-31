import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describeMember, stampChar, safeHttps } from '../src/core/team.js';

test('stampChar：取姓名首字，没有姓名用“朋”，按码点不拆字', () => {
  assert.equal(stampChar('张三'), '张');
  assert.equal(stampChar('  李四 '), '李');
  assert.equal(stampChar(''), '朋');
  assert.equal(stampChar(undefined), '朋');
  assert.equal(stampChar('𠮷野'), '𠮷');
});

test('describeMember：字段缺失一律是 null，绝不出现 "undefined"', () => {
  const d = describeMember({}, 0);
  assert.deepEqual(d, { no: '01', stamp: '朋', name: null, roleZh: null, roleEn: null, bio: null, link: null });
  assert.ok(!JSON.stringify(describeMember(undefined, 3)).includes('undefined'));
  assert.ok(!JSON.stringify(describeMember(null, 3)).includes('undefined'));
});

test('describeMember：空白字符串当作缺失', () => {
  const d = describeMember({ name: '   ', role_zh: ' ', bio: '\n' }, 1);
  assert.equal(d.name, null);
  assert.equal(d.roleZh, null);
  assert.equal(d.bio, null);
  assert.equal(d.no, '02');
});

test('describeMember：非字符串字段（数字、对象）不崩，当作缺失', () => {
  const d = describeMember({ name: 123, role_zh: {}, bio: [] }, 0);
  assert.equal(d.name, null);
  assert.equal(d.roleZh, null);
  assert.equal(d.bio, null);
});

test('safeHttps：只放行 https://', () => {
  assert.equal(safeHttps('https://example.com/a'), 'https://example.com/a');
  assert.equal(safeHttps('HTTPS://Example.com'), 'https://example.com/');
  for (const bad of ['http://example.com', 'javascript:alert(1)', '//example.com', '/a/b', 'ftp://x', 'https:/x', '', '   ', null, undefined, 42]) {
    assert.equal(safeHttps(bad), null, String(bad));
  }
});

test('team.json：4 位成员，序号 01–04，职责中英齐全，姓名待填', () => {
  const team = JSON.parse(readFileSync(new URL('../data/team.json', import.meta.url), 'utf8'));
  assert.equal(team.members.length, 4);
  const ds = team.members.map(describeMember);
  assert.deepEqual(ds.map((d) => d.no), ['01', '02', '03', '04']);
  assert.ok(ds.every((d) => d.roleZh && d.roleEn));
  assert.ok(ds.every((d) => d.name === null && d.stamp === '朋'));
});
