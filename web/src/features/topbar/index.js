// 顶栏：只提供 left / center / right 三个槽位容器。
// 槽位里放什么由页面清单决定（options.slots），shell 的 mountEntries 负责挂载，
// 所以 topbar 不 import 任何其他功能。
import { h } from '../../ui/index.js';

const SLOTS = ['left', 'center', 'right'];

export default {
  id: 'topbar',
  mount(el, ctx, options = {}) {
    const { slots = {}, mountEntries } = options;
    const header = h('header', { class: 'topbar' });
    const offs = [];

    for (const name of SLOTS) {
      const slot = h('div', { class: `topbar__slot topbar__slot--${name}`, 'data-slot': name });
      header.append(slot);
      const list = slots[name] ?? [];
      if (list.length) offs.push(mountEntries(slot, list));
    }

    el.append(header);
    return () => {
      offs.reverse().forEach((off) => off());
      el.replaceChildren();
    };
  },
};
