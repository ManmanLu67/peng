import { h } from './h.js';

/**
 * 版面只显示中文。英文放在 aria-label。
 * showEn 时中英都显示（团队页暂不改）。
 */
export function bilingual(zh, en, { showEn = false, tag = 'span' } = {}) {
  if (showEn) {
    return h(tag, { class: 'bi bi--inline' },
      h('span', { class: 'bi__zh' }, zh),
      h('span', { class: 'bi__sep', 'aria-hidden': 'true' }, ' · '),
      h('span', { class: 'bi__en', lang: 'en' }, en));
  }
  return h(tag, { class: 'bi', lang: 'zh', 'aria-label': `${zh}, ${en}` }, zh);
}
