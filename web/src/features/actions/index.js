// 操作区。可用性全部来自 ladder.availability，写状态只经 commands。
//   没看懂   降一档，并走完 02、03 节点
//   重试     只在失败后出现，重发上一次请求
import { h, bilingual } from '../../ui/index.js';

const BUTTONS = [
  { id: 'notUnderstood', zh: '没看懂', en: "Didn't understand", run: (c) => c.notUnderstood(), flag: 'notUnderstood', accent: true },
];

const WHY_DISABLED = '现在不能用：还在处理，或已经到头了';

export default {
  id: 'actions',
  mount(el, ctx) {
    const { store, commands, ladder } = ctx;

    const buttons = new Map();
    const row = h('div', { class: 'act' });

    // 重试放在最前面，只在失败时出现
    const retry = h('button', {
      type: 'button',
      class: 'btn btn--accent act__btn act__retry',
      hidden: true,
      onclick: () => commands.retry(),
    }, bilingual('重试', 'Retry', { inline: true }));
    row.append(retry);

    for (const b of BUTTONS) {
      const btn = h('button', {
        type: 'button',
        class: ['btn', 'act__btn', b.accent && 'btn--accent'],
        'data-action': b.id,
        onclick: () => b.run(commands),
      }, bilingual(b.zh, b.en, { inline: true }));
      buttons.set(b.id, btn);
      row.append(btn);
    }

    const render = () => {
      const a = ladder.availability(store.get());
      retry.hidden = !a.retry;
      for (const b of BUTTONS) {
        const btn = buttons.get(b.id);
        const can = a[b.flag];
        btn.disabled = !can;
        btn.title = can ? '' : WHY_DISABLED;
      }
    };

    el.append(row);
    render();
    const off = store.subscribe(
      (s) => ({ st: s.status, r: s.rung, m: s.messages.length, d: s.demo, c: !!s.lastCall }),
      render,
    );
    return () => { off(); el.replaceChildren(); };
  },
};
