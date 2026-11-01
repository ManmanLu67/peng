// 八级阶梯：右缘纵向，当前档朱砂粗竖条。点某一档就改写到那一档。
// 处理中、演示中，或还没有简化结果时，不能点。
import { h } from '../../ui/index.js';

export default {
  id: 'ladder-bar',
  mount(el, ctx) {
    const { store, ladder, commands } = ctx;
    const items = [...ladder.list].sort((a, b) => b.n - a.n);   // 8 在上，1 在下
    const lis = new Map();

    const list = h('ol', { class: 'lad', 'aria-label': '档位阶梯 · Level ladder' });
    for (const r of items) {
      const btn = h('button', {
        type: 'button',
        class: 'lad__item',
        'data-rung': r.n,
        onclick: () => commands.setRung(r.n),
      },
        h('span', { class: 'lad__label' }, r.short),
        h('span', { class: 'lad__bar', 'aria-hidden': 'true' }),
        h('span', { class: 'sr-only' }, `${r.label.zh} ${r.label.en}`));
      lis.set(r.n, btn);
      list.append(h('li', null, btn));
    }

    const render = ({ rung, status, demo }) => {
      // 与 flow 一致：只有停在结果上才能换档，失败态下点了也没反应
      const open = (status === 'result' || status === 'english') && !demo && rung != null;
      for (const [n, li] of lis) {
        const on = status !== 'running' && n === rung;
        li.disabled = !open;
        li.classList.toggle('is-on', on);
        if (on) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      }
    };

    render(store.get());
    const off = store.subscribe((s) => ({ rung: s.rung, status: s.status, demo: s.demo }), render);
    el.append(list);
    return () => { off(); el.replaceChildren(); };
  },
};
