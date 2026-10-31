import test from 'node:test';
import assert from 'node:assert/strict';
import { annotate, OOV_LEVEL } from '../src/core/annotate.js';
import { create as createSegmenter } from '../src/adapters/segmenter/intl.js';
import { readData } from './helpers.mjs';

const hsk = readData('hsk').entries;
const glosses = readData('glosses').entries;
const segmenter = createSegmenter();
const run = (text, extra = {}) => annotate(text, { segmenter, hsk, glosses, ...extra });
const hitWords = (r) => r.words.map((w) => w.word);

test('文本不丢字：spans 拼起来等于原文（含标点）', () => {
  for (const t of ['日照香炉生紫烟', '落霞与孤鹜齐飞，秋水共长天一色。', '这是一句古诗。他的意思是：水很烫，有热气。', '', 'a b，c']) {
    assert.equal(run(t).spans.map((s) => s.text).join(''), t, t);
  }
});

test('预置短语最长匹配：整句命中，不被拆成“香炉”“紫烟”', () => {
  const r = run('日照香炉生紫烟');
  assert.deepEqual(hitWords(r), ['日照香炉生紫烟']);
  assert.equal(r.words[0].type, 'allusion');
  assert.equal(r.words[0].source, 'gloss');
});

test('短语不在上下文中完整出现时，退回到更短的短语', () => {
  const r = run('杯里升起香炉和紫烟');
  assert.ok(hitWords(r).includes('香炉'));
  assert.ok(hitWords(r).includes('紫烟'));
});

test('释义字段完整：拼音、中文、英文', () => {
  const w = run('他用一句古诗开玩笑').words.find((x) => x.word === '开玩笑');
  assert.ok(w);
  assert.equal(w.py, 'kāi wán xiào');
  assert.ok(w.zh.length > 0 && w.en.length > 0);
});

test('取等级最高的前 3 个，超纲词排最前', () => {
  const r = run('落霞与孤鹜齐飞，秋水共长天一色。');
  assert.ok(r.words.length <= 3);
  assert.ok(r.words.length > 0);
  for (let i = 1; i < r.words.length; i++) assert.ok(r.words[i - 1].level >= r.words[i].level);
});

test('limit 可调', () => {
  assert.equal(run('他用一句古诗开玩笑', { limit: 1 }).words.length, 1);
});

test('分词器粘出的多字词（他的、是在）不被当成超纲词', () => {
  const r = run('这是在用一句诗形容水杯里升起了热气');
  assert.equal(r.words.some((w) => w.oov && ['是在', '他的', '的是'].includes(w.word)), false);
});

test('真正查不到的词标为超纲词：level 7，不带释义', () => {
  const r = run('饕餮');
  const w = r.words[0];
  assert.equal(w.oov, true);
  assert.equal(w.level, OOV_LEVEL);
  assert.equal(w.zh, undefined);
  assert.equal(w.en, undefined);
});

test('标点、数字、拉丁字母不会被标注', () => {
  const r = run('水，123 abc。');
  assert.equal(r.words.every((w) => /[㐀-鿿]/.test(w.word)), true);
});

test('minLevel：只标高于它的词，低等级词不凑数', () => {
  const text = '这是一句古诗。他的意思是：水很烫，有热气。';
  assert.ok(hitWords(run(text)).length === 3);
  const r = run(text, { minLevel: 3 });
  assert.deepEqual(hitWords(r).sort(), ['古诗', '热气', '烫'].sort());
  assert.ok(r.words.every((w) => w.level > 3));
  assert.deepEqual(hitWords(run('这是我的水', { minLevel: 3 })), []);
});

test('minLevel 不影响超纲词：词表查不到的词始终标出', () => {
  assert.deepEqual(hitWords(run('饕餮', { minLevel: 6 })), ['饕餮']);
});

test('minLevel 高于所有词时，预置典故（level 7）仍能标出', () => {
  assert.deepEqual(hitWords(run('日照香炉生紫烟', { minLevel: 6 })), ['日照香炉生紫烟']);
  assert.deepEqual(hitWords(run('日照香炉生紫烟', { minLevel: 7 })), []);
});

test('同一个词出现多次只标一次', () => {
  const r = run('古诗，古诗，古诗');
  assert.equal(r.words.filter((w) => w.word === '古诗').length, 1);
});

test('分词器是被注入的：换一个分词器结果随之改变', () => {
  const chars = { words: (t) => [...t].filter((c) => /[㐀-鿿]/.test(c)) };
  const r = annotate('香炉', { segmenter: chars, hsk, glosses });
  assert.deepEqual(r.words.map((w) => w.word), ['香炉']);   // 短语匹配不依赖分词器
  const r2 = annotate('水很烫', { segmenter: chars, hsk, glosses });
  assert.ok(r2.words.some((w) => w.word === '烫'));
});

test('演示数据里所有档位的文本都能标注且不丢字', () => {
  const demo = readData('demo').entries[0].rungs;
  for (const [n, text] of Object.entries(demo)) {
    if (n === '1') continue;   // 英文档不标注
    const r = run(text);
    assert.equal(r.spans.map((s) => s.text).join(''), text, `rung ${n}`);
  }
});
