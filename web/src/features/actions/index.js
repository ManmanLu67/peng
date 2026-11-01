// 操作区。可用性全部来自 ladder.availability，写状态只经 commands。
//   没看懂   降一档，并走完 02、03 节点
//   更简单   降一档，只走改写
//   还原     升一档，更接近原文
//   看懂了   结束这一次（只在前端点亮节点，不调接口）
//   重试     只在失败后出现，重发上一次请求
import { h, bilingual } from '../../ui/index.js';

const BUTTONS = [
  { id: 'simpler', zh: '更简单', en: 'Simpler', run: (c) => c.stepDown(), flag: 'simpler' },
  { id: 'closer', zh: '还原', en: 'Closer to original', run: (c) => c.stepUp(), flag: 'closer' },
  { id: 'gotIt', zh: '看懂了', en: 'Got it', run: (c) => c.understood(), flag: 'gotIt' },
  { id: 'notUnderstood', zh: '没看懂', en: "Didn't understand", run: (c) => c.notUnderstood(), flag: 'notUnderstood', accent: true },
];

const WHY_DISABLED = '现在不能用：还在处理，或已经到头了 · Not available right now';

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
      (s) => ({ st: s.status, r: s.rung, m: s.messages.length, u: s.understood, d: s.demo, c: !!s.lastCall }),
      render,
    );
    return () => { off(); el.replaceChildren(); };
  },
};
