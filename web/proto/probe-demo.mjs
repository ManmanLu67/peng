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

  check('演示按钮存在，横幅隐藏', (await ev(`!${q('.demo__start')}.hidden && ${q('.demo__banner')}.hidden`)) === true);

  // ---- 断网：走一遍完整流程并计时 ----
  await send('Network.enable');
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });

  await ev(`performance.clearResourceTimings()`);   // 之后出现的任何资源请求都是演示引起的
  const t0 = Date.now();
  await ev(`${q('.demo__start')}.click()`);
  await sleep(200);
  check('演示开始：横幅显示，开始按钮隐藏', (await ev(`!${q('.demo__banner')}.hidden && ${q('.demo__start')}.hidden`)) === true);
  check('演示中 store.demo=true', (await ev(st('demo'))) === true);
  check('演示中输入框、发送、示例按钮、反馈按钮全部禁用', await ev(`${q('.chat__input')}.readOnly && ${q('.chat__send')}.disabled && ${qa('.chat__example')}.every(b=>b.disabled) && ${q('.act__btn')}.disabled`));
  check('演示中 HSK 选档仍可见（不属于演示控制范围，只确认没被移除）', (await ev(`${qa('.hsk__btn')}.length`)) === 6);

  const rungs = [];
  let finished = false;
  for (let i = 0; i < 160; i++) {
    const r = await ev(st('rung'));
    if (r != null && rungs.at(-1) !== r) rungs.push(r);
    if ((await ev(st('understood'))) === true && (await ev(`${q('.demo__banner')}.hidden`)) === true) { finished = true; break; }
    await sleep(250);
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  check('C2 档位依次 4→3→2→1（HSK3→HSK2→HSK1→英文）', JSON.stringify(rungs) === '[4,3,2,1]', JSON.stringify(rungs));
  check(`C2 全程跑完（用时 ${secs}s，目标约 15–30 s）`, finished && Number(secs) > 8 && Number(secs) < 40, `${secs}s finished=${finished}`);
  check('C2 结束：小灯亮、读懂了', (await ev(`${q('.brg__lamp')}.classList.contains('is-lit')`)) === true && (await ev(`${q('.brg__result')}.textContent`)) === '读懂了 · Understood');
  check('C2 结束：节点 02 03 04 状态 done,done,skipped,done', (await ev(states())) === 'done,done,skipped,done', await ev(states()));
  check('C2 结束：演示标记收起，输入恢复可用', (await ev(st('demo'))) === false && (await ev(`${q('.chat__input')}.readOnly`)) === false);
  check('C2 结束：对比区停在英文档，英文主显', (await ev(`${q('.cmp__text--en')}.textContent`)).startsWith('The water is so hot'));
  check('C6 断网期间演示全程没有任何新的网络请求', (await ev(`performance.getEntriesByType('resource').length`)) === 0, JSON.stringify(await ev(`performance.getEntriesByType('resource').map(r => r.name)`)));
  await shot(`${SHOTS}/demo-done.png`);
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

  // ---- C4 中途退出 ----
  await ev(`${q('.demo__start')}.click()`);
  await sleep(3200);
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
  await sleep(2500);
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
  for (let i = 0; i < 160; i++) {
    const r = await ev(st('rung'));
    if (r != null && seen.at(-1) !== r) seen.push(r);
    if ((await ev(st('understood'))) === true) break;
    await sleep(250);
  }
  check('起点 HSK 5 时演示依次 6→5→4→3→2→1', JSON.stringify(seen) === '[6,5,4,3,2,1]', JSON.stringify(seen));
});
