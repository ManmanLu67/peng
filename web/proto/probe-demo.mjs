// 3g 演示模式：真实时钟跑完整流程，量时长；中途退出；离开页面自动退出；断网
import { session, settle } from './probe-lib.mjs';

const BASE = process.argv[2];
const SHOTS = process.argv[3];
const q = (s) => `document.querySelector(${JSON.stringify(s)})`;
const qa = (s) => `[...document.querySelectorAll(${JSON.stringify(s)})]`;
const states = () => `${qa('.brg__node')}.map(g=>g.dataset.state).join(',')`;
const st = (f) => `__peng.store.get().${f}`;

await session(9460, async ({ ev, send, check, view, go, shot, sleep }) => {
  await view(1440, 800);
  await go(`${BASE}/#/app`);

  check('演示控件在顶栏 left 槽，紧跟 Logo 之后', (await ev(`(()=>{const slot=document.querySelector('.topbar__slot--left'); const kids=[...slot.querySelectorAll('[data-feature]')].map(e=>e.dataset.feature); return kids.join(',')})()`)) === 'logo,demo');
  check('演示按钮在 Logo 右侧（同一行、x 更大）', await ev(`(()=>{const a=document.querySelector('.logo').getBoundingClientRect(), b=document.querySelector('.demo__start').getBoundingClientRect(); return b.left >= a.right - 1 && Math.abs((a.top+a.bottom)/2-(b.top+b.bottom)/2) < 20})()`));
  check('演示按钮不再出现在页面主体里', (await ev(`!!document.querySelector('#root > .feature--demo')`)) === false);
  check('演示按钮存在，横幅隐藏', (await ev(`!${q('.demo__start')}.hidden && ${q('.demo__banner')}.hidden`)) === true);

  // ---- 断网：走一遍完整流程并计时 ----
  await send('Network.enable');
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });

  await ev(`performance.clearResourceTimings()`);   // 之后出现的任何资源请求都是演示引起的
  const t0 = Date.now();
  await ev(`${q('.demo__start')}.click()`);
  await sleep(200);
  check('演示开始：横幅显示，开始按钮隐藏', (await ev(`!${q('.demo__banner')}.hidden && ${q('.demo__start')}.hidden`)) === true);
  const overlap = await ev(`(()=>{
    const els=[...document.querySelectorAll('.topbar .logo, .topbar .demo__banner, .topbar .hsk__btn, .topbar .api-badge, .topbar .icon-btn')];
    const rs=els.map(e=>({n:e.className,r:e.getBoundingClientRect()})); const bad=[];
    for(let i=0;i<rs.length;i++) for(let j=i+1;j<rs.length;j++){const a=rs[i].r,b=rs[j].r; if(a.left<b.right-0.5&&b.left<a.right-0.5&&a.top<b.bottom-0.5&&b.top<a.bottom-0.5) bad.push(rs[i].n+' × '+rs[j].n);}
    return JSON.stringify(bad);})()`);
  check('演示中倒计时横幅与顶栏其它元素不重叠', overlap === '[]', overlap);
  check('演示中倒计时有文字', (await ev(`document.querySelector('.demo__hint').textContent`)).includes('下一步'));
  check('演示中 store.demo=true', (await ev(st('demo'))) === true);
  check('演示中输入框、发送、示例按钮、反馈按钮全部禁用', await ev(`${q('.chat__input')}.readOnly && ${q('.chat__send')}.disabled && ${qa('.chat__example')}.every(b=>b.disabled) && ${q('.act__btn')}.disabled`));
  check('演示中 HSK 选档仍可见（不属于演示控制范围，只确认没被移除）', (await ev(`${qa('.hsk__btn')}.length`)) === 6);

  const rungs = [];
  let finished = false;
  const dwells = [];       // 每一页真实停留：结果出现（status 离开 running）→ 下一步开始（status 回到 running）
  let settledAt = null; let prevStatus = null;
  for (let i = 0; i < 900; i++) {
    const r = await ev(st('rung'));
    const status = await ev(st('status'));
    if (prevStatus === 'running' && status !== 'running') settledAt = Date.now();
    if (prevStatus !== 'running' && status === 'running' && settledAt) { dwells.push((Date.now() - settledAt) / 1000); settledAt = null; }
    prevStatus = status;
    if (r != null && rungs.at(-1) !== r) rungs.push(r);
    if ((await ev(st('understood'))) === true && (await ev(`${q('.demo__banner')}.hidden`)) === true) { finished = true; break; }
    await sleep(100);
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('      每页真实停留（秒）:', dwells.map((x) => x.toFixed(1)).join(' / '));
  check('每一页真实停留都在 5–10 s（允许 ±0.4 s 轮询误差）', dwells.length === 3 && dwells.every((x) => x >= 4.6 && x <= 10.4), dwells.join(','));
  check('C2 档位依次 4→3→2→1（HSK3→HSK2→HSK1→英文）', JSON.stringify(rungs) === '[4,3,2,1]', JSON.stringify(rungs));
  check(`C2 全程跑完（用时 ${secs}s，目标约 30–70 s）`, finished && Number(secs) > 28 && Number(secs) < 70, `${secs}s finished=${finished}`);
  check('C2 结束：小灯亮、读懂了', (await ev(`${q('.brg__lamp')}.classList.contains('is-lit')`)) === true && (await ev(`${q('.brg__result')}.textContent`)) === '读懂了 · Understood');
  check('C2 结束：节点 02 03 04 状态 done,done,skipped,done', (await ev(states())) === 'done,done,skipped,done', await ev(states()));
  check('C2 结束：演示标记收起，输入恢复可用', (await ev(st('demo'))) === false && (await ev(`${q('.chat__input')}.readOnly`)) === false);
  check('C2 结束：对比区停在英文档，英文主显', (await ev(`${q('.cmp__text--en')}.textContent`)).startsWith('The water is so hot'));
  check('C6 断网期间演示全程没有任何新的网络请求', (await ev(`performance.getEntriesByType('resource').length`)) === 0, JSON.stringify(await ev(`performance.getEntriesByType('resource').map(r => r.name)`)));
  await shot(`${SHOTS}/demo-done.png`);
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

  // ---- C4 中途退出 ----
  await ev(`${q('.demo__start')}.click()`);
  await sleep(3500);
  check('C4 演示进行中已有结果', (await ev(st('messages.length'))) >= 1);
  await ev(`${q('.demo__exit')}.click()`);
  await sleep(300);
  check('C4 退出后回到 idle，消息清空', (await ev(st('status'))) === 'idle' && (await ev(st('messages.length'))) === 0);
  check('C4 退出后节点全空、小灯熄灭', (await ev(states())) === 'idle,idle,idle,idle' && (await ev(`${q('.brg__lamp')}.classList.contains('is-lit')`)) === false);
  check('C4 退出后输入恢复、横幅隐藏、演示按钮回来', (await ev(`${q('.chat__input')}.readOnly`)) === false && (await ev(`${q('.demo__banner')}.hidden && !${q('.demo__start')}.hidden`)) === true);
  await sleep(3500);
  check('C4 退出后不再有残留动作（3.5 s 后仍是 idle）', (await ev(st('status'))) === 'idle' && (await ev(st('messages.length'))) === 0);

  // 再次运行能重新跑
  await ev(`${q('.demo__start')}.click()`);
  await sleep(4200);
  check('C4 退出后能重新开始演示', (await ev(st('messages.length'))) === 1);

  // ---- C5 演示中切页 ----
  await ev(`location.hash = '#/team'`);
  await sleep(600);
  await ev(`location.hash = '#/app'`);
  await sleep(800);
  check('C5 演示中切走再回来：已退出并重置', (await ev(st('demo'))) === false && (await ev(st('status'))) === 'idle' && (await ev(st('messages.length'))) === 0);
  await sleep(3500);
  check('C5 切页后无残留动作', (await ev(st('messages.length'))) === 0 && (await ev(st('status'))) === 'idle');

  // ---- 演示按所选起点档（HSK 5）一路降到英文 ----
  await ev(`${qa('.hsk__btn')}.find(b => b.getAttribute('aria-label') === 'HSK 5').click()`);
  await ev(`${q('.demo__start')}.click()`);
  const seen = [];
  for (let i = 0; i < 480; i++) {
    const r = await ev(st('rung'));
    if (r != null && seen.at(-1) !== r) seen.push(r);
    if ((await ev(st('understood'))) === true) break;
    await sleep(250);
  }
  check('起点 HSK 5 时演示依次 6→5→4→3→2→1', JSON.stringify(seen) === '[6,5,4,3,2,1]', JSON.stringify(seen));
});
