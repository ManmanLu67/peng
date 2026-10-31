// T1 临时占位，T3 的第一个工作台功能加入后删除。
import { h } from '../../ui/index.js';

export default {
  id: 'app-placeholder',
  mount(el) {
    el.append(h('section', { style: 'padding:var(--s5) var(--edge)' },
      h('h1', { style: 'font-family:var(--f-title);font-weight:400' }, '工作台'),
      h('p', { class: 'label' }, '工作台占位 · T3')));
    return () => el.replaceChildren();
  },
};
