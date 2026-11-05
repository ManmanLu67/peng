// 八级阶梯：右缘纵向。没有刻度线。飞鸟在当前档左边，尖端朝右。
// 点某一档，或拖动飞鸟，就改写到那一档。
// 处理中、演示中，或还没有简化结果时，不能点也不能拖。
import { h, svg } from '../../ui/index.js';

export const DRAG_HINT = '拖动飞鸟，调整降维等级';
// 与首页飞鸟箭头同一条路径。尖端在路径上方，样式里转成朝右。
const BIRD_ARROW = 'M0 -22 L18 16 L0 6 L-18 16 Z';

/** 指针落在哪一档：取中心点最近的一档。没有档位时是 null。 */
export function nearestRung(points, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const p of points) {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bestD) { bestD = d; best = p.n; }
  }
  return best;
}

function birdArrow() {
  return svg('svg', {
    class: 'lad__bird', viewBox: '-20 -24 40 44', 'aria-hidden': 'true', focusable: 'false',
  }, svg('path', { d: BIRD_ARROW, fill: 'currentColor' }));
}

export default {
  id: 'ladder-bar',
  mount(el, ctx) {
    const { store, ladder, commands } = ctx;
    const items = [...ladder.list].sort((a, b) => b.n - a.n);   // 8 在上，1 在下
    const lis = new Map();

    const list = h('ol', { class: 'lad', 'aria-label': '译至的档位, Level of this sentence' });
    for (const r of items) {
      const btn = h('button', {
        type: 'button',
        class: 'lad__item',
        'data-rung': r.n,
        'aria-label': `${r.label.zh}, ${r.label.en}`,
        onclick: () => commands.setRung(r.n),
      },
      h('span', { class: 'lad__label' }, r.short));
      lis.set(r.n, btn);
      list.append(h('li', null, btn));
    }

    const handle = h('button', {
      type: 'button',
      class: 'lad__handle',
      role: 'slider',
      'aria-label': `${DRAG_HINT}, Drag the bird to change the level`,
      'aria-orientation': 'vertical',
      'aria-valuemin': String(ladder.min),
      'aria-valuemax': String(ladder.max),
    }, birdArrow());

    let dragN = null;

    function centers() {
      return [...lis].map(([n, btn]) => {
        const r = btn.getBoundingClientRect();
        return { n, x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
    }

    function place(n) {
      const btn = lis.get(n);
      if (!btn) return;
      btn.parentElement.insertBefore(handle, btn);
      const vertical = list.offsetHeight >= list.offsetWidth;
      handle.setAttribute('aria-orientation', vertical ? 'vertical' : 'horizontal');
    }

    const render = ({ rung, status, demo }) => {
      const open = (status === 'result' || status === 'english') && !demo && rung != null;
      for (const [n, li] of lis) {
        const on = status !== 'running' && n === rung;
        li.disabled = !open;
        li.classList.toggle('is-on', on);
        if (on) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      }
      handle.disabled = !open;
      if (open) handle.title = DRAG_HINT;
      else handle.removeAttribute('title');
      if (rung != null) {
        handle.hidden = false;
        handle.setAttribute('aria-valuenow', String(rung));
        handle.setAttribute('aria-valuetext', ladder.get(rung)?.label.zh ?? '');
      } else {
        handle.hidden = true;
        handle.remove();
        handle.removeAttribute('aria-valuenow');
        handle.removeAttribute('aria-valuetext');
      }
      if (dragN == null && rung != null) place(rung);
    };

    function onDown(e) {
      if (handle.disabled) return;
      dragN = store.get().rung;
      handle.classList.add('is-dragging');
      handle.setPointerCapture(e.pointerId);
    }
    function onMove(e) {
      if (dragN == null) return;
      const n = nearestRung(centers(), e.clientX, e.clientY);
      if (n == null) return;
      dragN = n;
      place(n);
    }
    function onUp() {
      if (dragN == null) return;
      const n = dragN;
      dragN = null;
      handle.classList.remove('is-dragging');
      if (n !== store.get().rung) commands.setRung(n);
      else place(store.get().rung);
    }
    function onKey(e) {
      if (handle.disabled) return;
      const order = items.map((r) => r.n);
      const i = order.indexOf(store.get().rung);
      const dir = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1
        : e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : 0;
      if (!dir || i < 0) return;
      const next = order[i + dir];
      if (next == null) return;
      e.preventDefault();
      commands.setRung(next);
    }

    handle.addEventListener('pointerdown', onDown);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
    handle.addEventListener('keydown', onKey);
    const onResize = () => { if (dragN == null && store.get().rung != null) place(store.get().rung); };
    window.addEventListener('resize', onResize);

    render(store.get());
    const off = store.subscribe((s) => ({ rung: s.rung, status: s.status, demo: s.demo }), render);
    el.append(h('div', { class: 'lad__wrap' },
      h('p', { class: 'lad__name' }, '译至'),
      list));
    if (store.get().rung != null) place(store.get().rung);
    return () => {
      off();
      window.removeEventListener('resize', onResize);
      el.replaceChildren();
    };
  },
};
