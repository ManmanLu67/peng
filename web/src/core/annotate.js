// 难词标注：纯函数，分词器由外部注入（SegmenterPort），词表由外部传入（data/hsk.json、glosses.json）。
// 流程：
//   1. 预置短语（glosses）最长匹配 —— "香炉""紫烟"等被 Segmenter 拆开的词靠它整体命中；
//   2. 剩余片段交给分词器，逐词查 HSK 词表；
//   3. 词表里没有的多字词（如 Segmenter 粘出的“他的”“是在”），尝试拆成单字，全部命中就当已知词；
//   4. 仍查不到的视为超纲词（level 7），不带释义；
//   5. 取等级最高的前 N 个（超纲词天然排最前）。
// P1 预留：语法标注（grammar.json）在这里加一个 grammar 参数，本次不实现。

export const OOV_LEVEL = 7;

const CJK = /[㐀-鿿]/;

/**
 * minLevel：只标注等级高于它的词（默认 0 = 全部）。超纲词（词表查不到）不受它限制。
 * 用来避免把“这”“是”这类 HSK 1 的词当难词凑数。
 * @param {string} text
 * @param {{ segmenter: { words(t: string): string[] },
 *           hsk: Record<string, {level:number, py:string, zh:string, en:string}>,
 *           glosses: Record<string, {type:string, level:number, py:string, zh:string, en:string}>,
 *           limit?: number, minLevel?: number }} deps
 * @returns {{ spans: Span[], words: Hit[] }}
 *   spans: 覆盖整段文本的片段（供渲染：命中的带 hit，其余纯文本），words: 取前 N 个的标注
 */
export function annotate(text, { segmenter, hsk, glosses, limit = 3, minLevel = 0 }) {
  const phraseKeys = Object.keys(glosses).sort((a, b) => b.length - a.length);   // 最长优先
  const tokens = [];       // { text, hit? }

  // 1) 预置短语最长匹配，切成 [已命中短语 | 待分词片段]
  let rest = '';
  const flush = () => {
    if (!rest) return;
    for (const piece of splitByWords(rest, segmenter)) tokens.push(lookup(piece, hsk));
    rest = '';
  };
  for (let i = 0; i < text.length;) {
    const key = phraseKeys.find((k) => text.startsWith(k, i));
    if (key) {
      flush();
      tokens.push({ text: key, hit: { word: key, source: 'gloss', ...glosses[key] } });
      i += key.length;
    } else {
      rest += text[i];
      i += 1;
    }
  }
  flush();

  // 5) 取前 N 个“不同的词”：等级高优先，同级保持出现顺序。
  //    优先级：有释义的词 > 无释义的超纲词。否则一个词表漏掉的单字（杯、和）会占满名额，
  //    把真正需要解释的“紫烟”挤掉；超纲词没有释义可展示，只有名额富余时才补上。
  const seen = new Set();
  const candidates = tokens
    .map((t, idx) => ({ t, idx }))
    .filter(({ t }) => t.hit && CJK.test(t.text))
    .filter(({ t }) => t.hit.oov || t.hit.level > minLevel)
    .filter(({ t }) => (seen.has(t.text) ? false : (seen.add(t.text), true)));
  const rank = (c) => (c.t.hit.oov ? 0 : 1);
  candidates.sort((a, b) => rank(b) - rank(a) || b.t.hit.level - a.t.hit.level || a.idx - b.idx);
  const chosen = new Set(candidates.slice(0, limit).map(({ t }) => t.text));

  // 同一个词出现多次时，每一处都保留下划线（渲染一致），但 words 里只列一次
  const spans = tokens.map((t) => (t.hit && chosen.has(t.text) ? { text: t.text, hit: t.hit } : { text: t.text }));
  const words = candidates.filter(({ t }) => chosen.has(t.text)).map(({ t }) => t.hit);
  return { spans, words };
}

/** 分词；分词器丢掉的非词字符（标点、空白）要原样保留，否则渲染时文本会少字 */
function splitByWords(s, segmenter) {
  const words = segmenter.words(s);
  const out = [];
  let pos = 0;
  for (const w of words) {
    const at = s.indexOf(w, pos);
    if (at < 0) continue;
    if (at > pos) out.push(s.slice(pos, at));       // 词之间的标点 / 空白
    out.push(w);
    pos = at + w.length;
  }
  if (pos < s.length) out.push(s.slice(pos));
  return out;
}

function lookup(piece, hsk) {
  if (!CJK.test(piece)) return { text: piece };                       // 标点、数字、拉丁字母不标
  const e = hsk[piece];
  if (e) return { text: piece, hit: { word: piece, source: 'hsk', type: levelType(e.level), ...e } };

  // 3) 多字词拆成单字：全部在词表里 → 已知词，不标
  const chars = [...piece];
  if (chars.length > 1 && chars.every((c) => hsk[c])) return { text: piece };

  // 4) 超纲词：不带释义
  return { text: piece, hit: { word: piece, source: 'oov', type: 'written', level: OOV_LEVEL, oov: true } };
}

/** HSK 词表里的普通词没有“类型”，按等级归到“书面”线型；等级低的词不会进前 N，几乎不会被渲染 */
function levelType(level) {
  return level >= 5 ? 'written' : 'written';
}
