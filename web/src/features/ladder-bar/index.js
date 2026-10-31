// 八级阶梯条：右缘纵向，当前档朱砂粗竖条。P0 只展示，不可点击（点击跳档是 P1，
// 接入位置：给每个 <li> 加按钮并调用 commands.stepDown / stepUp）。
// 档位与短标签来自 data/rungs.json。
import { h } from '../../ui/index.js';

export default {
  id: 'ladder-bar',
  mount(el, ctx) {
    const { store, ladder } = ctx;
    const items = [...ladder.list].sort((a, b) => b.n - a.n);   // 8 在上，1 在下
    const lis = new Map();

    const list = h('ol', { class: 'lad', 'aria-label': '档位阶梯 · Level ladder' });
    for (const r of items) {
      const li = h('li', { class: 'lad__item', 'data-rung': r.n },
        h('span', { class: 'lad__label' }, r.short),
        h('span', { class: 'lad__bar', 'aria-hidden': 'true' }),
        h('span', { class: 'sr-only' }, `${r.label.zh} ${r.label.en}`));
      lis.set(r.n, li);
      list.append(li);
    }

    const render = ({ rung, status }) => {
      for (const [n, li] of lis) {
        const on = status !== 'running' && n === rung;
        li.classList.toggle('is-on', on);
        if (on) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      }
    };

    render(store.get());
    const off = store.subscribe((s) => ({ rung: s.rung, status: s.status }), render);
    el.append(list);
    return () => { off(); el.replaceChildren(); };
  },
};
