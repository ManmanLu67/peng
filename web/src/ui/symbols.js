// 共用 SVG symbol。首页的桥与工作台的鹊桥节点条共用同一只喜鹊剪影。
import { svg } from './h.js';

const HOST_ID = 'peng-symbols';

// 单色剪影，朝右，viewBox 48×28：尾（左下）、背、头、喙（右）、腹。
const MAGPIE_PATH =
  'M1 23 L13 15 C14 11 19 9 24 10 C26 7 29 5 33 6 C35 6 36 7.5 36.5 9 ' +
  'L45 11.5 L37 13 C36.5 15 35 17 33 18 C31 22 26 23 22 21.5 C19 21 16 19.5 14.5 18.5 L3 25 Z';

/** 把共用 symbol 注入页面（只注入一次）。使用 symbol 的功能在 mount 时调用。 */
export function ensureSymbols() {
  if (document.getElementById(HOST_ID)) return;
  const host = svg('svg', {
    id: HOST_ID, width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false',
    style: 'position:absolute;width:0;height:0;overflow:hidden',
  },
  svg('defs', null,
    svg('symbol', { id: 'magpie', viewBox: '0 0 48 28' },
      svg('path', { d: MAGPIE_PATH, fill: 'currentColor' }))));
  document.body.prepend(host);
}

/** 一只喜鹊。颜色跟随 currentColor；props 里可传 class / width / height / style。 */
export function magpie(props = {}) {
  ensureSymbols();
  return svg('svg', { viewBox: '0 0 48 28', 'aria-hidden': 'true', focusable: 'false', ...props },
    svg('use', { href: '#magpie' }));
}
