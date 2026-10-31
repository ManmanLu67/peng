// 流程线：整条一种颜色、贯穿缝、不被其它元素遮住
import { session, settle } from './probe-lib.mjs';
const BASE = process.argv[2];
const SHOTS = process.argv[3];
const q = (s) => `document.querySelector(${JSON.stringify(s)})`;
const qa = (s) => `[...document.querySelectorAll(${JSON.stringify(s)})]`;

await session(9480, async ({ ev, check, view, go, shot, sleep }) => {
  await view(1440, 800);
  await go(`${BASE}/#/app`);

  check('只有一条流程线，没有分段或桥板', (await ev(`${qa('.brg__line')}.length`)) === 1 && (await ev(`${qa('.brg__seg, .brg__plank')}.length`)) === 0);
  check('整条线一种颜色：赭石 rgb(169, 118, 61)', (await ev(`getComputedStyle(${q('.brg__line')}).stroke`)) === 'rgb(169, 118, 61)');
  check('线宽 3px，不透明', (await ev(`getComputedStyle(${q('.brg__line')}).strokeWidth`)) === '3px' && (await ev(`getComputedStyle(${q('.brg__line')}).opacity`)) === '1');

  const geo = JSON.parse(await ev(`(()=>{
    const svg=${q('.brg__svg')}; const line=${q('.brg__line')};
    const papers=${qa('.brg__paper')}.map(p=>p.getBBox());
    const L=line.x1.baseVal.value, R=line.x2.baseVal.value;
    const dots=${qa('.brg__dot')}.map(d=>d.cx.baseVal.value);
    const gapL=Math.max(...papers.map(p=>p.x+p.width).filter(x=>x<600)), gapR=Math.min(...papers.map(p=>p.x).filter(x=>x>450));
    return JSON.stringify({L,R,first:dots[0],last:dots.at(-1),gapL,gapR});})()`));
  check('线两头伸出首尾节点之外', geo.L < geo.first && geo.R > geo.last, JSON.stringify(geo));
  check('线贯穿两块纸之间的缝（缝在线的范围内）', geo.L < geo.gapL && geo.R > geo.gapR, JSON.stringify(geo));

  // 取缝正中一个像素的真实颜色：用截图像素验证“缝里能看见线”
  const px = JSON.parse(await ev(`(()=>{
    const svg=${q('.brg__svg')}; const r=svg.getBoundingClientRect(); const vb=svg.viewBox.baseVal;
    const sx=r.width/vb.width, sy=r.height/vb.height; const ox=r.left+(r.width-vb.width*Math.min(sx,sy))/2, oy=r.top+(r.height-vb.height*Math.min(sx,sy))/2; const s=Math.min(sx,sy);
    const papers=${qa('.brg__paper')}.map(p=>p.getBBox());
    const gapL=Math.max(...papers.map(p=>p.x+p.width).filter(x=>x<600)), gapR=Math.min(...papers.map(p=>p.x).filter(x=>x>450));
    return JSON.stringify({x:Math.round(ox+((gapL+gapR)/2)*s), y:Math.round(oy+100*s)});})()`));
  const { send } = { send: null };
  check('缝中心的屏幕坐标可算', Number.isFinite(px.x) && Number.isFinite(px.y), JSON.stringify(px));
  await shot(`${SHOTS}/line-idle.png`);

  // 提交、没看懂：线颜色全程不变（进度只靠节点）
  const lineColor = () => ev(`getComputedStyle(${q('.brg__line')}).stroke`);
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
  check('线上没有任何朱砂段（进度不再画在线上）', (await ev(`${qa('.brg__line, .brg__lines *')}.every(e => getComputedStyle(e).stroke !== 'rgb(200, 65, 43)')`)) === true);
  await shot(`${SHOTS}/line-done.png`);
});
