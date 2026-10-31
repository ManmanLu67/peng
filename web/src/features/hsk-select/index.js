// HSK 选档：分段控件，顺序 6→1。只设置“起点”，不改变当前已出的结果。
import { h } from '../../ui/index.js';

export default {
  id: 'hsk-select',
  mount(el, ctx) {
    const { ladder, commands, store } = ctx;
    const buttons = new Map();

    for (const r of ladder.hskRungs()) {
      const btn = h('button', {
        type: 'button',
        class: 'hsk__btn',
        'data-rung': r.n,
        'aria-label': r.label.en,
        onclick: () => commands.setHsk(r.n),
      }, h('span', { class: 'hsk__prefix', 'aria-hidden': 'true' }, 'HSK '), h('span', { 'aria-hidden': 'true' }, String(r.hsk)));
      buttons.set(r.n, btn);
    }

    const group = h('div', { class: 'hsk', role: 'group', 'aria-label': '起点档位 · Starting level' }, ...buttons.values());

    const render = (hskStart) => {
      for (const [n, btn] of buttons) {
        const on = n === hskStart;
        btn.setAttribute('aria-pressed', String(on));
        btn.classList.toggle('is-on', on);
      }
    };

    render(store.get().hskStart);
    const off = store.subscribe((s) => s.hskStart, render);

    el.append(group);
    return () => { off(); el.replaceChildren(); };
  },
};
