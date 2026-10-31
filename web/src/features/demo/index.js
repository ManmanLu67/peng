// 演示模式：一键自动播放水杯示例全流程，不调用真实接口，断网可跑。
// 只调用 ctx.commands，定时全部经 ctx.ports.clock；不直接碰别的功能的 DOM。
// 脚本（data/demo.json 的 demoScript 之外，步骤本身是固定的主线）：
//   输入“日照香炉生紫烟” → 提交 → 没看懂 ×3（HSK 3→2→1→英文）→ 看懂了 → 小灯亮
// 每一步等上一步的结果出来（status 离开 running）再延迟，避免画面与状态错位。
// 离开 #/app（卸载）时自动退出并重置。
import { h, bilingual } from '../../ui/index.js';
import { readTimeMs } from '../../core/pacing.js';

// 停留时间按“这一页要读多少字”算（core/pacing.js），而不是固定值。
const START_GAP_MS = 1500;       // 点开始后先让人看清空白页和输入
const END_DWELL_MS = 6000;       // 看懂后停留，让人看清小灯和“读懂了”


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
      h('span', { class: 'demo__hint label' }),
      h('button', { type: 'button', class: 'btn demo__exit' }, bilingual('退出演示', 'Exit demo', { inline: true })));
    el.append(h('div', { class: 'demo' }, start, banner));

    let running = false;
    let cancels = [];             // 当前所有待执行的定时器取消函数
    let unsub = null;

    const later = (ms, fn) => { cancels.push(ports.clock.after(ms, fn)); };
    const clearTimers = () => { cancels.forEach((off) => off()); cancels = []; unsub?.(); unsub = null; };

    // 横幅里的倒计时提示：告诉观众“这一页还停留多久”，不会误以为卡住了
    const hint = banner.querySelector('.demo__hint');
    function caption(ms) {
      const left = Math.ceil(ms / 1000);
      hint.textContent = `下一步 ${left} 秒后 · Next in ${left}s`;
    }

    function setUi(on) {
      running = on;
      start.hidden = on;
      banner.hidden = !on;
      commands.setDemo(on);
    }

    /** 当前对比区里能读到的全部文字（原文、改写、释义、英文、文化条） */
    const pageText = () => document.querySelector('.cmp')?.textContent ?? '';

    /** 等当前请求结束后再继续：status 不再是 running 才推进；停留时间取决于这一页的字数 */
    function afterSettled(next) {
      const go = () => {
        const ms = readTimeMs(pageText());
        caption(ms);
        later(ms, next);
      };
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
        later(END_DWELL_MS, () => { setUi(false); });   // 小灯亮着，演示标记收起；结果保留在页面上
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

      caption(START_GAP_MS);
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
