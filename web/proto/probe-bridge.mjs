// 3d 鹊桥节点条 / 3e 反馈按钮
import { session, settle } from './probe-lib.mjs';

const BASE = process.argv[2];
const SHOTS = process.argv[3];
const q = (s) => `document.querySelector(${JSON.stringify(s)})`;
const qa = (s) => `[...document.querySelectorAll(${JSON.stringify(s)})]`;
const submit = (text) => `(()=>{const i=${q('.chat__input')}; i.value=${JSON.stringify(text)}; i.dispatchEvent(new Event('input')); ${q('.chat__form')}.requestSubmit()})()`;
const states = () => `${qa('.brg__node')}.map(g=>g.dataset.state).join(',')`;

await session(9430, async ({ ev, check, view, go, shot, sleep }) => {
  await view(1440, 800);
  await go(`${BASE}/#/app`);

  check('4 个节点，序号 01–04', (await ev(`${qa('.brg__no')}.map(e=>e.textContent).join(',')`)) === '01,02,03,04');
  check('英文标签 REWRITE / NOT CLEAR / STEP DOWN / BRIDGE', (await ev(`${qa('.brg__label')}.map(e=>e.textContent).join(',')`)) === 'REWRITE,NOT CLEAR,STEP DOWN,BRIDGE');
  check('初始 4 个节点全为 idle', (await ev(states())) === 'idle,idle,idle,idle');
  check('一条弧线，没有靛蓝纸，没有小灯', (await ev(`${qa('.brg__arc')}.length`)) === 1
    && (await ev(`${qa('.brg__paper,.brg__lamp')}.length`)) === 0);
  check('4 个月相由缺到圆', (await ev(`${qa('.brg__node')}.map(g=>g.dataset.f).join(',')`)) === '0.2,0.46,0.72,1');
  check('恰好 4 只共用喜鹊，没有月间鸟群', (await ev(`${qa('.brg__bird use')}.length`)) === 4
    && (await ev(`${qa('.brg__bird use')}.every(u => u.getAttribute('href') === '#magpie')`)) === true
    && (await ev(`${qa('.brg__flock')}.length`)) === 0
    && (await ev(`!!document.getElementById('magpie')`)) === true);
  check('第 4 只喜鹊镜像仰头', (await ev(`!!${qa('.brg__bird')}[3].querySelector('g[transform]')`)) === true);
  check('反馈按钮：只有“没看懂”一个，且初始禁用', (await ev(`${qa('.act__btn')}.length`)) === 1 && (await ev(`${q('.act__btn')}.disabled`)) === true);
  check('反馈按钮文字', (await ev(`${q('.act__btn')}.textContent`)) === "没看懂 · Didn't understand");
  check('没有“看懂了/更简单/还原”按钮（P1 不展示）', !(await ev('document.body.innerText')).match(/看懂了|更简单|Simpler|Closer to original/));

  // 提交：01 先亮
  await ev(submit('日照香炉生紫烟'));
  await sleep(250);
  check('B2 提交后 01 执行中', (await ev(states())) === 'running,idle,idle,idle');
  check('执行中节点带 aria-current=step', (await ev(`${q('.brg__node[data-state="running"]')}.getAttribute('aria-current')`)) === 'step');
  check('读屏列表：“步骤 1：改写，执行中”', (await ev(`${q('.sr-only li')}.textContent`)) === '步骤 1：改写，执行中');
  check('标注“模拟回放”', (await ev(`${q('.brg__tag')}.textContent`)).includes('模拟回放'));
  await settle(ev);
  check('B2 出结果后 01 完成，其余仍空', (await ev(states())) === 'done,idle,idle,idle');
  check('反馈按钮出结果后启用', (await ev(`${q('.act__btn')}.disabled`)) === false);

  // 没看懂：01→02→03 依次点亮
  await ev(`${q('.act__btn')}.click()`);
  const seen = new Set();
  for (let i = 0; i < 40; i++) { seen.add(await ev(states())); if ((await ev('__peng.store.get().status')) !== 'running') break; await sleep(100); }
  const seq = [...seen].join(' → ');
  check('B6 没看懂：节点依次 01→02→03（出现过 running 在 02、03 的瞬间）',
    [...seen].some((s) => s.startsWith('done,running')) && [...seen].some((s) => s.startsWith('done,done,running')), seq);
  await settle(ev);
  check('B6 没看懂完成后 01、02、03 全亮，04 空', (await ev(states())) === 'done,done,done,idle');
  check('B6 降到 HSK 2', (await ev('__peng.store.get().rung')) === 3);

  // 更简单（命令，无 UI）：只经过 01，节点从头重跑
  await ev('__peng.commands.stepDown()');
  await sleep(250);
  check('B13 手动降档：只点亮 01，02、03 复位', (await ev(states())) === 'running,idle,idle,idle');
  await settle(ev);

  // 继续没看懂到英文
  await ev(`${q('.act__btn')}.click()`); await settle(ev);
  check('降到英文档', (await ev('__peng.store.get().rung')) === 1);
  check('B8 英文档“没看懂”禁用', (await ev(`${q('.act__btn')}.disabled`)) === true);

  // 看懂了（命令，无 UI）
  await ev('__peng.commands.understood()');
  await sleep(1800);
  check('B14 看懂后 03 虚线（skipped）、04 亮、02 亮', (await ev(states())) === 'done,done,skipped,done', await ev(states()));
  check('B14 末节点完成，没有小灯', (await ev(`${qa('.brg__node')}.at(-1).dataset.state`)) === 'done' && (await ev(`${q('.brg__lamp')}`)) === null);
  check('B14 显示“读懂了 · Understood”', (await ev(`${q('.brg__result')}.textContent`)) === '读懂了 · Understood');
  check('B14 读屏列表同步', (await ev(`${qa('.sr-only li')}.map(l=>l.textContent).join('|')`)).includes('步骤 3：降档，已跳过'));
  await shot(`${SHOTS}/bridge-done.png`);

  // 重新提交后复位
  await ev(submit('随便一句话'));
  await sleep(250);
  check('重新提交后节点复位，没有小灯', (await ev(`${q('.brg__lamp')}`)) === null && (await ev(states())) === 'running,idle,idle,idle');
  await settle(ev);

  // 出错态
  await ev(`__peng.commands.dispatch({type:'SUBMIT',text:'x',context:''}); 0`);
  await ev(`(()=>{const s=__peng.store.get(); __peng.commands.dispatch({type:'FAIL',reqId:s.reqId,code:'network'}); return 0})()`);
  await sleep(100);
  check('B13 出错：节点画叉', (await ev(states())) === 'error,idle,idle,idle');
  check('B13 出错：叉可见', (await ev(`getComputedStyle(${q('.brg__node[data-state="error"] .brg__cross')}).opacity`)) === '1');
  check('出错后页面没有白屏，对话区提示输入已保留', (await ev(`${q('.chat__status')}.textContent`)).includes('输入已保留'));
  check('出错后失败的文字真的回到了输入框', (await ev(`${q('.chat__input')}.value`)) === 'x');
  check('出错后再次发送能直接重试（输入框非空、按钮可用）', (await ev(`${q('.chat__send')}.disabled`)) === false);
  await shot(`${SHOTS}/bridge-error.png`);

  // 窄屏
  await view(400, 800);
  await go(`${BASE}/#/app`);
  check('窄屏不横向溢出（节点条内部横向滚动）', await ev('document.documentElement.scrollWidth <= document.documentElement.clientWidth'));
  check('窄屏节点条容器可横向滚动', (await ev(`getComputedStyle(${q('.brg__scroll')}).overflowX`)) === 'auto');
});
