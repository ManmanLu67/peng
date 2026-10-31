// 主题按钮：P0 只保留 UI 与 CSS 变量结构，点击不切换。
// P1 接入位置：在这里调用 ThemePort（见 src/ports/index.js），并去掉 aria-disabled。
import { h, svg } from '../../ui/index.js';

export default {
  id: 'theme-toggle',
  mount(el) {
    const icon = svg('svg', { viewBox: '0 0 20 20', width: 18, height: 18, 'aria-hidden': 'true', focusable: 'false' },
      svg('path', { d: 'M15.5 12.2A6.5 6.5 0 0 1 7.8 4.5a6.5 6.5 0 1 0 7.7 7.7Z', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.2, 'stroke-linejoin': 'round' }));

    const btn = h('button', {
      type: 'button',
      class: 'icon-btn',
      'aria-disabled': 'true',
      'aria-label': '切换主题（暂未开放） · Toggle theme (not available yet)',
      title: '深浅色切换暂未开放 · Theme switching is not available yet',
      onclick: (e) => e.preventDefault(),
    }, icon);

    el.append(btn);
    return () => el.replaceChildren();
  },
};
