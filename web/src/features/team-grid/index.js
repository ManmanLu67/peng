// 占位：T5 替换为四张成员卡。
import { h } from '../../ui/index.js';

export default {
  id: 'team-grid',
  mount(el) {
    el.append(h('section', { 'aria-labelledby': 'team-title', style: 'padding:var(--s5) var(--edge)' },
      h('h1', { id: 'team-title', style: 'font-family:var(--f-title);font-weight:400' }, '参与人员'),
      h('p', { class: 'label' }, '团队页占位 · T5')));
    return () => el.replaceChildren();
  },
};
