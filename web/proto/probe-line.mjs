// 流程线：整条一种颜色、贯穿缝、不被其它元素遮住
import { session, settle } from './probe-lib.mjs';
const BASE = process.argv[2];
const SHOTS = process.argv[3];
const q = (s) => `document.querySelector(${JSON.stringify(s)})`;
const qa = (s) => `[...document.querySelectorAll(${JSON.stringify(s)})]`;

await session(9480, async ({ ev, check, view, go, shot, sleep }) => {
  await view(1440, 800);
  await go(`${BASE}/#/app`);

  check('只有一条弧线，没有分段或桥板', (await ev(`${qa('.brg__arc')}.length`)) === 1 && (await ev(`${qa('.brg__seg, .brg__plank, .brg__paper')}.length`)) === 0);
  check('整条线一种颜色：赭石 rgb(169, 118, 61)', (await ev(`getComputedStyle(${q('.brg__arc')}).stroke`)) === 'rgb(169, 118, 61)');
  check('线宽 1.5px，不透明', (await ev(`getComputedStyle(${q('.brg__arc')}).strokeWidth`)) === '1.5px' && (await ev(`getComputedStyle(${q('.brg__arc')}).opacity`)) === '1');

  const geo = JSON.parse(await ev(`(()=>{
    const arc=${q('.brg__arc')};
    const len=arc.getTotalLength();
    const a=arc.getPointAtLength(0), b=arc.getPointAtLength(len);
    const xs=${qa('.brg__node')}.map(g=>{const m=g.transform.baseVal.consolidate().matrix; return m.e});
    return JSON.stringify({L:a.x,R:b.x,first:xs[0],last:xs.at(-1)});})()`));
  check('弧线两头伸出首尾月相之外', geo.L < geo.first && geo.R > geo.last, JSON.stringify(geo));
  await shot(`${SHOTS}/line-idle.png`);

  // 提交、没看懂：线颜色全程不变（进度只靠节点）
  const lineColor = () => ev(`getComputedStyle(${q('.brg__arc')}).stroke`);
  await ev(`(()=>{const i=${q('.chat__input')}; i.value='日照香炉生紫烟'; i.dispatchEvent(new Event('input')); ${q('.chat__form')}.requestSubmit()})()`);
  await sleep(250);
  const c1 = await lineColor();
  await settle(ev);
  await ev(`${q('.act__btn')}.click()`); await sleep(300);
  const c2 = await lineColor();
  await settle(ev);
  await ev('__peng.commands.understood()'); await sleep(1800);
  const c3 = await lineColor();
  check('运行中 / 没看懂 / 看懂后，线颜色始终一致', c1 === c2 && c2 === c3 && c3 === 'rgb(169, 118, 61)', `${c1} ${c2} ${c3}`);
  check('线上没有任何朱砂段（进度不再画在线上）', (await ev(`getComputedStyle(${q('.brg__arc')}).stroke`)) !== 'rgb(200, 65, 43)');
  await shot(`${SHOTS}/line-done.png`);
});
