// 顶栏深浅色按钮。只经 ports.theme 读写，不直接碰 localStorage。
import { h, svg } from '../../ui/index.js';

const MOON = 'M15.5 12.2A6.5 6.5 0 0 1 7.8 4.5a6.5 6.5 0 1 0 7.7 7.7Z';
const SUN = 'M10 2.8v1.8M10 15.4v1.8M2.8 10h1.8M15.4 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M15.3 4.7 14 6M6 14l-1.3 1.3M10 6.3a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4Z';

function icon(dark) {
  return svg('svg', { viewBox: '0 0 20 20', width: 18, height: 18, 'aria-hidden': 'true', focusable: 'false' },
    svg('path', {
      d: dark ? SUN : MOON,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.2,
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
    }));
}

export default {
  id: 'theme-toggle',
  needs: ['theme'],
  mount(el, ctx) {
    const theme = ctx.ports.theme;
    const btn = h('button', { type: 'button', class: 'icon-btn' });

    const paint = () => {
      const dark = theme.get() === 'dark';
      const label = dark ? '切换为浅色 · Switch to light' : '切换为深色 · Switch to dark';
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', label);
      btn.title = label;
      btn.replaceChildren(icon(dark));
    };

    btn.addEventListener('click', () => {
      theme.set(theme.get() === 'dark' ? 'light' : 'dark');
      paint();
    });
    paint();
    el.append(btn);
    return () => el.replaceChildren();
  },
};
