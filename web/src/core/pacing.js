// 演示节奏：每页停留 5–10 秒。纯函数。
// 按“这一页新出现的文字”在 [minMs, maxMs] 之间线性取值，不按全文累加（否则每页都会顶到上限）。
// 字数少的页面停得短，字数多的页面停得长，但永远不超过 maxMs，也不低于 minMs。
// 第一页还要读原文和文化条，所以给它一个固定的加成，但同样被 maxMs 封顶。

export const PACING = Object.freeze({
  minMs: 5000,
  maxMs: 10000,
  zhCharsPerSec: 6,      // 5–10 s 的窗口里按“扫读”速度估：约 6 字/秒
  enWordsPerSec: 4,
  baseMs: 3500,          // 看节点动画、阶梯条、结果出现的固定时间
  firstVisitBonusMs: 2500,
});

/** 一段文字的阅读毫秒数（不含固定时间、不含上下限） */
export function rawReadMs(text, p = PACING) {
  const zh = (text.match(/[㐀-鿿]/g) ?? []).length;
  const en = (text.replace(/[㐀-鿿]/g, ' ').match(/[A-Za-z][A-Za-z'’-]*/g) ?? []).length;
  return (zh / p.zhCharsPerSec + en / p.enWordsPerSec) * 1000;
}

/**
 * 一页的停留时间，范围恒为 [minMs, maxMs]。
 * @param {string} fresh   这一页新出现的文字（右栏改写 + 它的释义 / 英文）
 * @param {{ firstVisit?: string }} [o]  第一次出现才需要读的内容（原文释义、文化条）；之后的页面不传
 */
export function readTimeMs(fresh, o = {}, p = PACING) {
  const { firstVisit = '' } = o;
  const bonus = firstVisit ? p.firstVisitBonusMs : 0;
  const ms = p.baseMs + rawReadMs(fresh, p) + bonus;
  return Math.min(p.maxMs, Math.max(p.minMs, Math.round(ms)));
}
