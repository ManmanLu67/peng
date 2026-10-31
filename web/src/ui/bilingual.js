import { h } from './h.js';

/**
 * 双语标签：中文主、英文副（小一号、灰色）。
 * 默认上下两行；inline 时写成“更简单 · Simpler”。
 */
export function bilingual(zh, en, { inline = false, tag = 'span' } = {}) {
  return h(tag, { class: inline ? 'bi bi--inline' : 'bi' },
    h('span', { class: 'bi__zh' }, zh),
    inline ? h('span', { class: 'bi__sep', 'aria-hidden': 'true' }, ' · ') : null,
    h('span', { class: 'bi__en', lang: 'en' }, en));
}
