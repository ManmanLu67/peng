// 从原句里抽出知识库已有的知识点和语法。只认 hsk / glosses / grammar 里写明的条目，不编造。
import { annotate } from './annotate.js';

/**
 * @param {string} text 要解释的原句
 * @param {{ segmenter: { words(t: string): string[] },
 *           hsk: Record<string, {level:number, py:string, zh:string, en:string}>,
 *           glosses: Record<string, {type:string, level:number, py:string, zh:string, en:string}>,
 *           grammar?: { match:string, level:number, title:string, zh:string, en:string }[],
 *           minLevel?: number }} deps
 * @returns {{ kind:string, title:string, py:string, level:number, zh:string, en:string }[]}
 */
function kindOf(type) {
  if (type === 'allusion') return 'allusion';
  if (type === 'classical') return 'classical';
  return 'word';
}

function pointFrom(title, entry, kind) {
  return {
    kind,
    title,
    py: entry.py ?? '',
    level: entry.level,
    zh: entry.zh,
    en: entry.en ?? '',
  };
}

export function knowledgePoints(text, { segmenter, hsk, glosses, grammar = [], minLevel = 0 }) {
  const source = String(text ?? '');
  const { spans } = annotate(source, { segmenter, hsk, glosses, minLevel, limit: 20 });
  const allusions = [];
  const words = [];
  const seen = new Set();
  const keep = (title, entry, kind) => {
    if (!entry?.zh || seen.has(title)) return;
    if (Number.isInteger(entry.level) && entry.level <= minLevel) return;
    if (!source.includes(title)) return;
    seen.add(title);
    const bucket = kind === 'allusion' ? allusions : words;
    bucket.push(pointFrom(title, entry, kind));
  };
  for (const span of spans) {
    const hit = span.hit;
    if (!hit || hit.oov) continue;
    keep(hit.word, hit, kindOf(hit.type));
  }
  // 整句典故命中后，其中的难词仍要单列
  const glossKeys = Object.keys(glosses).sort((a, b) => source.indexOf(a) - source.indexOf(b) || b.length - a.length);
  for (const key of glossKeys) keep(key, glosses[key], kindOf(glosses[key].type));
  const byPlace = (a, b) => source.indexOf(a.title) - source.indexOf(b.title);
  allusions.sort(byPlace);
  words.sort(byPlace);
  const points = [...allusions, ...words];
  for (const item of grammar) {
    if (!item?.match || !item.zh || !item.title) continue;
    if (Number.isInteger(item.level) && item.level <= minLevel) continue;
    let matched = false;
    try {
      matched = new RegExp(item.match).test(source);
    } catch {
      matched = false;
    }
    if (!matched || seen.has(item.title)) continue;
    seen.add(item.title);
    points.push({
      kind: 'grammar',
      title: item.title,
      py: '',
      level: item.level ?? 0,
      zh: item.zh,
      en: item.en ?? '',
    });
  }
  return points;
}

const HAS_PINYIN = /[a-zāáǎàēéěèīíǐìōóǒòūúǔùüǖǘǚǜ]/i;

/** 模型给的整句拼音优先。否则按词表从左到右拼，对不上的字空着。 */
export function sentencePinyin(text, { glosses = {}, hsk = {}, modelPinyin } = {}) {
  const given = String(modelPinyin ?? '').trim();
  if (given && HAS_PINYIN.test(given) && !/[㐀-鿿]/.test(given)) return given;
  const source = String(text ?? '');
  const keys = [...Object.keys(glosses), ...Object.keys(hsk)]
    .filter((k) => glosses[k]?.py || hsk[k]?.py)
    .sort((a, b) => b.length - a.length);
  const parts = [];
  for (let i = 0; i < source.length;) {
    const key = keys.find((k) => source.startsWith(k, i));
    if (key) {
      parts.push(glosses[key]?.py || hsk[key]?.py);
      i += key.length;
      continue;
    }
    if (/[，。！？、：；]/.test(source[i])) parts.push(source[i]);
    i += 1;
  }
  return parts.join(' ').replace(/ ([，。！？、：；])/g, '$1').trim();
}
