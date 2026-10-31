// 占位：T4 替换为完整首页视觉。
import { h } from '../../ui/index.js';

export default {
  id: 'home-hero',
  mount(el) {
    el.append(h('section', { 'aria-labelledby': 'home-title', style: 'padding:var(--s5) var(--edge)' },
      h('h1', { id: 'home-title', style: 'font-family:var(--f-title);font-weight:400' }, '难懂的话，走成一座桥。'),
      h('p', { class: 'label' }, '首页视觉占位 · T4'),
      h('p', null, h('a', { href: '#/app' }, '开始 · Start'))));
    return () => el.replaceChildren();
  },
};
