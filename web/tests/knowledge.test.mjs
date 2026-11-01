import test from 'node:test';
import assert from 'node:assert/strict';
import { knowledgePoints, sentencePinyin } from '../src/core/knowledge.js';
import { create as createSegmenter } from '../src/adapters/segmenter/intl.js';
import { readData } from './helpers.mjs';

const hsk = readData('hsk').entries;
const glosses = readData('glosses').entries;
const grammar = readData('grammar').entries;
const segmenter = createSegmenter();
const points = (text, minLevel = 3) => knowledgePoints(text, { segmenter, hsk, glosses, grammar, minLevel });

test('整句典故作为知识点，并带上中文解释', () => {
  const list = points('日照香炉生紫烟');
  const hit = list.find((p) => p.title === '日照香炉生紫烟');
  assert.equal(hit.kind, 'allusion');
  assert.match(hit.zh, /香炉峰/);
  assert.ok(list.findIndex((p) => p.kind === 'allusion') < list.findIndex((p) => p.title === '香炉'));
  assert.ok(list.some((p) => p.title === '香炉' && p.kind === 'word'));
  assert.ok(list.some((p) => p.title === '紫烟'));
  assert.ok(list.some((p) => p.title === '日照'));
});

test('整句拼音：示例用词表，模型给的优先，汉字不算拼音', () => {
  assert.equal(sentencePinyin('日照香炉生紫烟', { glosses, hsk }), glosses['日照香炉生紫烟'].py);
  const line = sentencePinyin('落霞与孤鹜齐飞，秋水共长天一色。', { glosses, hsk });
  assert.match(line, /luò xiá yǔ gū wù qí fēi，/);
  assert.match(line, /qiū shuǐ gòng cháng tiān yí sè。/);
  assert.equal(sentencePinyin('水', { glosses, hsk, modelPinyin: 'shuǐ hěn tàng' }), 'shuǐ hěn tàng');
  assert.equal(sentencePinyin('日照香炉生紫烟', { glosses, hsk, modelPinyin: '这不是拼音' }), glosses['日照香炉生紫烟'].py);
});

test('原句里的文言格式抽成语法', () => {
  const flying = points('落霞与孤鹜齐飞，秋水共长天一色。');
  assert.ok(flying.some((p) => p.kind === 'grammar' && p.title === '与……齐……'));
  assert.ok(flying.some((p) => p.kind === 'grammar' && p.title === '共……一色'));
  assert.ok(flying.some((p) => p.kind === 'allusion' && p.title === '落霞与孤鹜齐飞'));

  const dawn = points('朝辞白帝彩云间');
  assert.ok(dawn.some((p) => p.title === '朝辞'));
  assert.ok(dawn.some((p) => p.title === '……间'));
});

test('低于学习者等级的词和语法不列入', () => {
  const list = points('水很烫，太烫了。', 3);
  assert.equal(list.some((p) => p.title === '水'), false);
  assert.equal(list.some((p) => p.title === '太……了'), false);
  assert.ok(list.some((p) => p.title === '烫'));
});

test('模型拆出的语法点并入列表：同名不重复，低于等级的不列', () => {
  const extraGrammar = [
    { title: '虽然……但是……', zh: '表示转折。', en: 'although... but', level: 4 },
    { title: '太……了', zh: '重复的', level: 4 },
    { title: '把字句', zh: '太简单', level: 2 },
    { title: '被字句', zh: '没写等级' },
  ];
  const list = knowledgePoints('虽然水太烫了，但是他把杯子拿起来了', {
    segmenter, hsk, glosses, grammar, extraGrammar, minLevel: 3,
  });
  const grams = list.filter((p) => p.kind === 'grammar');
  assert.deepEqual(grams.map((p) => p.title), ['虽然……但是……', '被字句']);
  assert.equal(grams[0].zh, '表示转折。');
  assert.equal(grams.filter((p) => p.title === '太……了').length, 0);

  // 本地词表命中的同名语法优先，模型的不再重复
  const dup = knowledgePoints('这水太烫了', {
    segmenter, hsk, glosses, grammar, minLevel: 0,
    extraGrammar: [{ title: '太……了', zh: '模型版', level: 2 }],
  });
  const tai = dup.filter((p) => p.title === '太……了');
  assert.equal(tai.length, 1);
  assert.match(tai[0].zh, /程度很高/);
});

test('句中没有的语法不出现；房间里的间不当成文言间', () => {
  assert.equal(points('水很烫。').some((p) => p.kind === 'grammar'), false);
  assert.equal(points('房间里有水。', 0).some((p) => p.title === '……间'), false);
  assert.ok(points('杯子在桌子里。', 0).some((p) => p.title === '在……里'));
});
