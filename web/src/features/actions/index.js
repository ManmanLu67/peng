// 反馈按钮。P0 只渲染“没看懂 · Didn't understand”（朱砂框）；可用性来自 ladder.availability，
// 到英文档禁用。
// P1 预留（命令已有，不接 UI，见 SCOPE）：更简单 → commands.stepDown，还原 → commands.stepUp，
//   看懂了 → commands.understood（Demo 会调用），错误重试 → commands.retry。
import { h, bilingual } from '../../ui/index.js';

export default {
  id: 'actions',
  mount(el, ctx) {
    const { store, commands, ladder } = ctx;

    const btn = h('button', {
      type: 'button',
      class: 'btn btn--accent act__btn',
      onclick: () => commands.notUnderstood(),
    }, bilingual('没看懂', "Didn't understand", { inline: true }));

    const render = () => {
      const can = ladder.availability(store.get()).notUnderstood;
      btn.disabled = !can;
      btn.title = can ? '' : '没有可降的档位，或还在处理中 · Nothing to step down to, or still working';
    };

    el.append(h('div', { class: 'act' }, btn));
    render();
    const off = store.subscribe((s) => ({ st: s.status, r: s.rung, m: s.messages.length, u: s.understood, d: s.demo }), render);
    return () => { off(); el.replaceChildren(); };
  },
};
