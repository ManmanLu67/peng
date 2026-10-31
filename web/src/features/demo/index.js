// 演示模式：一键自动播放水杯示例全流程，不调用真实接口，断网可跑。
// 只调用 ctx.commands，定时全部经 ctx.ports.clock；不直接碰别的功能的 DOM。
// 脚本（data/demo.json 的 demoScript 之外，步骤本身是固定的主线）：
//   输入“日照香炉生紫烟” → 提交 → 没看懂 ×3（HSK 3→2→1→英文）→ 看懂了 → 小灯亮
// 每一步等上一步的结果出来（status 离开 running）再延迟，避免画面与状态错位。
// 离开 #/app（卸载）时自动退出并重置。
import { h, bilingual } from '../../ui/index.js';

const STEP_GAP_MS = 2200;      // 每步停留，逻辑文档 5.8：约 2–3 s
const START_GAP_MS = 600;

export default {
  id: 'demo',
  mount(el, ctx) {
    const { store, commands, ports, data, flags, ladder } = ctx;
    if (flags.demoMode === false) return undefined;

    const sample = (data.demo.samples ?? [])[0];
    if (!sample) throw new Error('demo：data/demo.json 缺少 samples[0]');

    const start = h('button', { type: 'button', class: 'btn demo__start' }, bilingual('演示', 'Demo', { inline: true }));
    const banner = h('div', { class: 'demo__banner', role: 'status', 'aria-live': 'polite', hidden: true },
      h('span', null, bilingual('演示中', 'Demo', { inline: true })),
      h('button', { type: 'button', class: 'btn demo__exit' }, bilingual('退出演示', 'Exit demo', { inline: true })));
    el.append(h('div', { class: 'demo' }, start, banner));

    let running = false;
    let cancels = [];             // 当前所有待执行的定时器取消函数
    let unsub = null;

    const later = (ms, fn) => { cancels.push(ports.clock.after(ms, fn)); };
    const clearTimers = () => { cancels.forEach((off) => off()); cancels = []; unsub?.(); unsub = null; };

    function setUi(on) {
      running = on;
      start.hidden = on;
      banner.hidden = !on;
      commands.setDemo(on);
    }

    /** 等当前请求结束后再继续：status 不再是 running 才推进 */
    function afterSettled(next) {
      const go = () => later(STEP_GAP_MS, next);
      if (store.get().status !== 'running') { go(); return; }
      unsub = store.subscribe((s) => s.status, (status) => {
        if (status === 'running') return;
        unsub?.(); unsub = null;
        go();
      });
    }

    function exit() {
      if (!running) return;
      clearTimers();
      commands.reset();           // 取消在途请求与节点定时器，回到 idle
      setUi(false);
    }

    function run() {
      if (running) return;
      commands.reset();
      setUi(true);

      const stepsToEnglish = store.get().hskStart - ladder.min;   // 从所选档一路降到英文需要的次数
      let remaining = stepsToEnglish;

      const finish = () => {
        commands.understood();
        later(STEP_GAP_MS, () => { setUi(false); });   // 小灯亮着，演示标记收起；结果保留在页面上
      };
      const down = () => {
        const s = store.get();
        if (ladder.canStepDown(s.rung) && remaining > 0) {
          remaining -= 1;
          commands.notUnderstood();
          afterSettled(down);
        } else {
          finish();
        }
      };

      later(START_GAP_MS, () => {
        commands.submit(sample.text, sample.context ?? '');
        afterSettled(down);
      });
    }

    start.addEventListener('click', run);
    banner.querySelector('.demo__exit').addEventListener('click', exit);

    return () => {
      // 离开页面：自动退出并重置，不留残留定时器
      if (running) { clearTimers(); commands.reset(); commands.setDemo(false); }
      el.replaceChildren();
    };
  },
};
