// 演示节奏：按“这一页要读多少字”估算停留时间。纯函数。
// 汉字约 4 字/秒、英文约 3 词/秒（路演观众第一次看，比平时慢），再加缓冲；有上下限。

export const PACING = Object.freeze({
  minMs: 6000,
  maxMs: 20000,
  bufferMs: 1500,
  zhCharsPerSec: 4,
  enWordsPerSec: 3,
});

export function readTimeMs(text, p = PACING) {
  const zh = (text.match(/[㐀-鿿]/g) ?? []).length;
  const en = (text.replace(/[㐀-鿿]/g, ' ').match(/[A-Za-z][A-Za-z'’-]*/g) ?? []).length;
  const ms = (zh / p.zhCharsPerSec + en / p.enWordsPerSec) * 1000 + p.bufferMs;
  return Math.min(p.maxMs, Math.max(p.minMs, Math.round(ms)));
}
