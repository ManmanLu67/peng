import { session } from './probe-lib.mjs';
const BASE = process.argv[2];
await session(9492, async ({ ev, view, go, sleep }) => {
  await view(1280, 800);
  await go(`${BASE}/#/app`);
  await ev(`document.querySelector('.demo__start').click()`);
  await sleep(1500);
  console.log(await ev(`(()=>{
    const w=(s)=>{const e=document.querySelector(s); return e? Math.round(e.getBoundingClientRect().width):null};
    const tb=document.querySelector('.topbar');
    const natural=(s)=>{const e=document.querySelector(s); const o=e.style.cssText; e.style.cssText='width:max-content;flex:none'; const r=Math.round(e.getBoundingClientRect().width); e.style.cssText=o; return r};
    return JSON.stringify({
      viewport: innerWidth,
      gridCols: getComputedStyle(tb).gridTemplateColumns,
      leftSlot: w('.topbar__slot--left'), centerSlot: w('.topbar__slot--center'), rightSlot: w('.topbar__slot--right'),
      logo: w('.logo'), banner: w('.demo__banner'), hint: w('.demo__hint'), exit: w('.demo__exit'),
      leftNeeds: Math.round(document.querySelector('.logo').getBoundingClientRect().width + 16 + natural('.demo__banner')),
      hsk: w('.hsk')
    });})()`));
});
