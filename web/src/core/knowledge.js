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
export function knowledgePoints(text, { segmenter, hsk, glosses, grammar = [], minLevel = 0 }) {
  const source = String(text ?? '');
  const { spans } = annotate(source, { segmenter, hsk, glosses, minLevel, limit: 20 });
  const points = [];
  const seen = new Set();
  for (const span of spans) {
    const hit = span.hit;
    if (!hit || hit.oov || !hit.zh || seen.has(hit.word)) continue;
    seen.add(hit.word);
    points.push({
      kind: hit.type === 'allusion' ? 'allusion' : hit.type === 'classical' ? 'classical' : 'word',
      title: hit.word,
      py: hit.py ?? '',
      level: hit.level,
      zh: hit.zh,
      en: hit.en ?? '',
    });
  }
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
