// 导航链接。options.links 是要显示的路径，如 ['/', '/app']。
import { h, bilingual } from '../../ui/index.js';

const LABELS = {
  '/': ['首页', 'Home'],
  '/app': ['工作台', 'Workbench'],
  '/team': ['团队', 'Team'],
};

/** 四页名。文库与档案还没有页面，只作文字。 */
const BRAND = [
  { href: '#/app', zh: '工作台', en: 'Workbench' },
  { zh: '文库', en: 'Library' },
  { zh: '档案', en: 'Archive' },
  { href: '#/team', zh: '团队', en: 'Team' },
];

export default {
  id: 'nav',
  mount(el, ctx, options = {}) {
    if (options.brand) {
      const here = (location.hash.replace(/^#/, '') || '/');
      const items = BRAND.map((item) => (item.href
        ? h('a', {
          class: 'nav__link', href: item.href,
          'aria-label': `${item.zh}, ${item.en}`,
          'aria-current': item.href.replace(/^#/, '') === here ? 'page' : null,
        }, item.zh)
        : h('span', { class: 'nav__label', 'aria-label': `${item.zh}, ${item.en}` }, item.zh)));
      el.append(h('nav', { class: 'nav nav--brand', 'aria-label': '站点导航 · Site' }, ...items));
      return () => el.replaceChildren();
    }
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
