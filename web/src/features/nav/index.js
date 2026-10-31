// 导航链接。options.links 是要显示的路径，如 ['/', '/app']。
import { h, bilingual } from '../../ui/index.js';

const LABELS = {
  '/': ['首页', 'Home'],
  '/app': ['工作台', 'Workbench'],
  '/team': ['团队', 'Team'],
};

export default {
  id: 'nav',
  mount(el, ctx, options = {}) {
    const links = options.links ?? [];
    const here = (location.hash.replace(/^#/, '') || '/');

    const items = links.map((path) => {
      const label = LABELS[path];
      if (!label) throw new Error(`nav：未知路径 ${path}`);
      return h('a', { class: 'nav__link', href: `#${path}`, 'aria-current': path === here ? 'page' : null },
        bilingual(label[0], label[1], { inline: true }));
    });

    el.append(h('nav', { class: 'nav', 'aria-label': '站点导航 · Site' }, ...items));
    return () => el.replaceChildren();
  },
};
