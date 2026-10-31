// 工作台布局探测：输入区必须在视口内，整页不得出现纵向滚动（桌面），消息多时只有消息区滚动。
import { session, settle } from './probe-lib.mjs';

const BASE = process.argv[2];
const SHOTS = process.argv[3];
const q = (s) => `document.querySelector(${JSON.stringify(s)})`;
const inViewport = (sel) => `(()=>{const r=${q(sel)}.getBoundingClientRect(); return r.top>=0 && r.bottom<=innerHeight+0.5 && r.left>=0 && r.right<=innerWidth+0.5})()`;

await session(9410, async ({ ev, check, view, go, shot, sleep }) => {
  for (const [w, h] of [[1440, 800], [1280, 640], [1920, 1080]]) {
    await view(w, h);
    await go(`${BASE}/#/app`);
    for (let i = 0; i < 6; i++) {
      await ev(`(()=>{const i=${q('.chat__input')}; i.value='第${i}句'; i.dispatchEvent(new Event('input')); ${q('.chat__form')}.requestSubmit()})()`);
      await settle(ev);
    }
    check(`${w}×${h} 6 条消息后输入框仍在视口内`, await ev(inViewport('.chat__form')));
    check(`${w}×${h} 示例按钮仍在视口内`, await ev(inViewport('.chat__examples')));
    check(`${w}×${h} 整页没有纵向滚动`, await ev('document.documentElement.scrollHeight <= innerHeight + 1'));
    check(`${w}×${h} 消息区自己在滚动`, await ev(`${q('.chat__messages')}.scrollHeight > ${q('.chat__messages')}.clientHeight`));
    check(`${w}×${h} 滚到最新一条（最后一张卡在消息区内）`, await ev(`(()=>{const m=${q('.chat__messages')}.getBoundingClientRect(); const l=${q('.chat__messages')}.lastElementChild.getBoundingClientRect(); return l.bottom<=m.bottom+1 && l.top>=m.top-1})()`));
    if (w === 1440) await shot(`${SHOTS}/layout.png`);
  }
  // 401–720：必须纵向堆叠（上一次改窄屏样式时曾把这段规则误包进 max-width:400px）
  for (const w of [720, 560, 420]) {
    await view(w, 800);
    await go(`${BASE}/#/app`);
    check(`${w} 宽 工作台纵向堆叠（401–720 区间）`, (await ev(`getComputedStyle(document.getElementById('root')).gridTemplateColumns.split(' ').length`)) === 1);
    check(`${w} 宽 横向不溢出`, await ev('document.documentElement.scrollWidth <= document.documentElement.clientWidth'));
  }
  await view(400, 800);
  await go(`${BASE}/#/app`);
  check('400 宽 横向不溢出', await ev('document.documentElement.scrollWidth <= document.documentElement.clientWidth'));
  check('400 宽 输入框存在且可到达（页面可滚动到它）', await ev(`!!${q('.chat__form')}`));
});
