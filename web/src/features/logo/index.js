// 印章 Logo“朋” + 细体 peng，点击回首页。
import { h } from '../../ui/index.js';

export default {
  id: 'logo',
  mount(el) {
    el.append(h('a', { class: 'logo', href: '#/', 'aria-label': '朋 peng，回到首页 · Home' },
      h('span', { class: 'logo__stamp', 'aria-hidden': 'true' }, '朋'),
      h('span', { class: 'logo__word', 'aria-hidden': 'true' }, 'peng')));
    return () => el.replaceChildren();
  },
};
