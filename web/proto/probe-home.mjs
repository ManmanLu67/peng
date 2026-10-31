// T4 首页：构图、固定 seed、喜鹊数量、朱砂面积、标题对比度、入口、桥点击、窄屏
import { session } from './probe-lib.mjs';

const BASE = process.argv[2];
const SHOTS = process.argv[3];
const q = (s) => `document.querySelector(${JSON.stringify(s)})`;
const qa = (s) => `[...document.querySelectorAll(${JSON.stringify(s)})]`;

await session(9510, async ({ ev, check, view, go, shot, sleep, send }) => {
  await view(1440, 800);
  await go(`${BASE}/#/`, 1800);

  check('5 块纸：靛蓝左右、青蓝、米白、赭石', (await ev(`${qa('.hero__paper')}.map(e=>e.dataset.block).join()`)) === 'indigo-left,indigo-right,teal,cream,ochre');
  check('桥上喜鹊 12–16 只', await ev(`(()=>{const n=${qa('.hero__bird')}.length; return n>=12&&n<=16})()`));
  check('每只喜鹊有序号 data-i 且 symbol 可解析', await ev(`${qa('.hero__bird')}.every((b,i)=>b.dataset.i==String(i) && !!document.querySelector(b.querySelector('use').getAttribute('href')))`));
  check('喜鹊真实有渲染尺寸', await ev(`${qa('.hero__bird use')}.every(u=>{const b=u.getBBox(); return b.width>10&&b.height>5})`));
  check('纸张滤镜 #paper-fiber 存在，含低频与高频两个 feTurbulence', (await ev(`document.querySelectorAll('#paper-fiber feTurbulence').length`)) === 2);
  check('大块纸吃滤镜，小赭石条不吃', await ev(`(()=>{const t=${qa('.hero__paper')}; return t.slice(0,4).every(e=>getComputedStyle(e).filter.includes('url')) && !getComputedStyle(t[4]).filter.includes('url')})()`));
  check('微场景：人物、水杯、石头、喜鹊都存在', await ev(`!!${q('.hero__person')} && !!${q('.hero__cup')} && !!${q('.hero__stone')} && !!${q('.hero__scene-bird')}`));
  check('小灯存在（朱砂）', (await ev(`getComputedStyle(${q('.hero__lamp-core')}).fill`)) === 'rgb(200, 65, 43)');
  check('主标题两行 + 英文副标', (await ev(`${q('.hero__title')}.textContent`)) === '难懂的话，走成一座桥。' && (await ev(`${q('.hero__sub')}.textContent`)) === 'Meet the language halfway.');
  check('01–04 序号齐全', (await ev(`${qa('.hero__no')}.map(e=>e.textContent).join()`)) === '01,02,03,04');
  check('竖排标签“鹊桥 · Queqiao”', (await ev(`${q('.hero__side')}.textContent`)) === '鹊桥 · Queqiao' && (await ev(`getComputedStyle(${q('.hero__side')}).writingMode`)) === 'vertical-rl');
  check('底部小字', (await ev(`${q('.hero__foot')}.textContent`)).includes('7 小时'));

  // ---- 固定 seed：刷新三次，色块轮廓完全一致 ----
  const sig = () => ev(`${qa('.hero__paper')}.map(e=>e.getAttribute('d')).join('|').length + ':' + ${qa('.hero__paper')}.map(e=>e.getAttribute('d')).join('|').slice(0,200)`);
  const s1 = await sig(); await send('Page.reload'); await sleep(1500); const s2 = await sig(); await send('Page.reload'); await sleep(1500); const s3 = await sig();
  check('D2 刷新三次，构图完全一致', s1 === s2 && s2 === s3);

  // ---- 朱砂面积：用截图像素统计 ----
  const px = await ev(`(()=>{
    // 用 canvas 无法直接读取页面像素；改为统计 DOM 里朱砂元素的实际渲染面积 / 视口面积
    const vw=innerWidth, vh=innerHeight; const area=(r)=>Math.max(0,r.width)*Math.max(0,r.height);
    const red=(c)=>c==='rgb(200, 65, 43)';
    let sum=0; const parts=[];
    for (const e of document.querySelectorAll('.hero *, .topbar *')) {
      const cs=getComputedStyle(e);
      const isRed = red(cs.backgroundColor) || red(cs.fill);
      if (!isRed) continue;
      const r=e.getBoundingClientRect(); if (r.width===0) continue;
      let a = area(r);
      if (e.tagName==='circle') a = Math.PI*(r.width/2)*(r.height/2);   // 圆按圆面积
      sum+=a; parts.push((e.className.baseVal||e.className||e.tagName).toString().split(' ')[0]+':'+Math.round(a));
    }
    return JSON.stringify({ratio:+(sum/(vw*vh)*100).toFixed(2), parts});
  })()`);
  const red = JSON.parse(px);
  check(`D7 朱砂面积占视口 ${red.ratio}%（目标 1%–3%）`, red.ratio >= 1 && red.ratio <= 3, JSON.stringify(red));

  // ---- 标题对比度（纸色字 on 靛蓝）----
  const cr = await ev(`(()=>{
    const lum=(c)=>{const v=c.match(/\\d+/g).slice(0,3).map(Number).map(x=>x/255).map(x=>x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4));return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]};
    const fg=getComputedStyle(${q('.hero__title')}).color; const bg=getComputedStyle(${q('.hero__paper')}).fill;
    const L1=lum(fg),L2=lum(bg); return JSON.stringify({fg,bg,ratio:+((Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05)).toFixed(2)});})()`);
  const c = JSON.parse(cr);
  check(`D9 标题对比度 ${c.ratio}:1（≥ 4.5）`, c.ratio >= 4.5, JSON.stringify(c));
  const cr2 = await ev(`(()=>{const lum=(c)=>{const v=c.match(/\\d+/g).slice(0,3).map(Number).map(x=>x/255).map(x=>x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4));return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]};
    const fg=getComputedStyle(${q('.hero__start')}).color, bg=getComputedStyle(${q('.hero__start')}).backgroundColor; const L1=lum(fg),L2=lum(bg); return +((Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05)).toFixed(2)})()`);
  check(`“开始”按钮文字对比度 ${cr2}:1（大字号，≥ 3）`, cr2 >= 3);

  // ---- 文字不压在微场景上 ----
  check('文字层不压在微场景上', await ev(`(()=>{
    const sc=${q('.hero__scene')}.getBoundingClientRect();
    return ${qa('.hero__title, .hero__sub, .hero__entry, .hero__foot, .hero__side')}.every(e=>{const r=e.getBoundingClientRect(); return r.right<sc.left||r.left>sc.right||r.bottom<sc.top||r.top>sc.bottom})})()`));
  check('序号不压在标题上', await ev(`(()=>{
    const t=${q('.hero__title')}.getBoundingClientRect(); const s=${q('.hero__sub')}.getBoundingClientRect();
    return ${qa('.hero__no')}.every(e=>{const r=e.getBoundingClientRect(); return [t,s].every(b=>r.right<b.left||r.left>b.right||r.bottom<b.top||r.top>b.bottom)})})()`));

  // ---- 入口 ----
  check('“开始”是指向 #/app 的链接', (await ev(`${q('.hero__start')}.getAttribute('href')`)) === '#/app');
  await ev(`${q('.hero__start')}.click()`); await sleep(500);
  check('D10 点“开始”进入 #/app', (await ev('location.hash')) === '#/app');
  await go(`${BASE}/#/`, 1500);
  // 点桥：用真实鼠标事件点在一只喜鹊的屏幕坐标上
  const mid = JSON.parse(await ev(`(()=>{const b=${qa('.hero__bird')}[6].getBoundingClientRect(); return JSON.stringify({x:b.left+b.width/2,y:b.top+b.height/2})})()`));
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: mid.x, y: mid.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: mid.x, y: mid.y, button: 'left', clickCount: 1 });
  await sleep(600);
  check('D10 点桥进入 #/app', (await ev('location.hash')) === '#/app');

  // ---- 悬停“开始”：小灯变亮 ----
  await go(`${BASE}/#/`, 1500);
  const before = await ev(`getComputedStyle(${q('.hero__lamp-glow')}).opacity`);
  const sb = JSON.parse(await ev(`(()=>{const b=${q('.hero__start')}.getBoundingClientRect(); return JSON.stringify({x:b.left+b.width/2,y:b.top+b.height/2})})()`));
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: sb.x, y: sb.y });
  await sleep(600);
  const after = await ev(`getComputedStyle(${q('.hero__lamp-glow')}).opacity`);
  check(`悬停“开始”小灯光晕变亮（${before} → ${after}）`, Number(after) > Number(before));

  await shot(`${SHOTS}/home-final-1440.png`);

  // ---- 窄屏 ----
  for (const [w, h] of [[400, 800], [400, 250], [360, 640], [720, 900]]) {
    await view(w, h);
    await go(`${BASE}/#/`, 1500);
    check(`${w}×${h} 首页不横向溢出`, await ev('document.documentElement.scrollWidth <= document.documentElement.clientWidth'));
    check(`${w}×${h} “开始”按钮完整在视口内`, await ev(`(()=>{const r=${q('.hero__start')}.getBoundingClientRect(); return r.left>=0&&r.right<=innerWidth+0.5&&r.top>=0&&r.bottom<=innerHeight+0.5})()`));
    check(`${w}×${h} 桥上所有喜鹊都在视口内`, await ev(`${qa('.hero__bird')}.every(b=>{const r=b.getBoundingClientRect(); return r.left>=0&&r.right<=innerWidth+0.5})`));
    if (h > 400) check(`${w}×${h} 01–04 序号都在视口内`, await ev(`${qa('.hero__no')}.every(b=>{const r=b.getBoundingClientRect(); return r.left>=0&&r.right<=innerWidth+0.5})`));
    // 标题 / 副标的右缘必须在米白缝（x=778–808）左侧，浅色字才不会落在浅色底上
    check(`${w}×${h} 标题和副标不压到中间的米白缝`, await ev(`(()=>{
      const art=${q('.hero__art')}; const m=art.getScreenCTM(); const gapLeftX=m.a*778+m.e;
      return ${qa('.hero__title, .hero__sub')}.filter(e=>e.offsetParent!==null).every(e=>{const r=e.getBoundingClientRect(); const range=document.createRange(); range.selectNodeContents(e); const t=range.getBoundingClientRect(); return t.right<=gapLeftX+1})})()`));
    if (w === 400 && h === 800) await shot(`${SHOTS}/home-final-400.png`);
    if (w === 400 && h === 250) await shot(`${SHOTS}/home-final-400x250.png`);
  }
});
