// 浏览器原生分词。没有 Intl.Segmenter 时退化为逐字。
// 注意："香炉""紫烟"这类词可能被拆成单字，所以标注先用预置短语做最长匹配（见 annotate）。
export function create() {
  const seg = typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter('zh', { granularity: 'word' })
    : null;

  return {
    words(text) {
      if (!seg) return [...text].filter((c) => /\p{L}|\p{N}/u.test(c));
      return [...seg.segment(text)].filter((s) => s.isWordLike).map((s) => s.segment);
    },
  };
}
