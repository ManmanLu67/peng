// 参与人员：读 data/team.json 渲染 4 张错位的成员卡。静态页，无请求。
// 字段缺失就不渲染对应节点（不显示 undefined 或空占位线）；name 为空时显示“姓名待填 · Name TBD”便于发现遗漏。
// 有句子才显示句子。有链接才显示“联系方式”。https 新窗口打开，mailto 交给邮件软件。
import { h, bilingual } from '../../ui/index.js';
import { describeMember } from '../../core/team.js';

const text = (v) => (typeof v === 'string' ? v.trim() : '');

export default {
  id: 'team-grid',
  mount(el, ctx) {
    const team = ctx.data.team ?? {};
    const members = Array.isArray(team.members) ? team.members : [];

    const card = (m, i) => {
      const d = describeMember(m, i);
      return h('li', { class: 'team__card' },
        h('div', { class: 'team__top' },
          h('span', { class: 'team__no', 'aria-hidden': 'true' }, d.no),
          h('span', { class: 'team__stamp', 'aria-hidden': 'true' }, d.stamp)),
        h('span', { class: 'team__tick', 'aria-hidden': 'true' }),
        d.name ? h('h2', { class: 'team__name' }, d.name) : h('h2', { class: 'team__name team__name--tbd' }, bilingual('姓名待填', 'Name TBD', { showEn: true })),
        d.roleZh ? h('p', { class: 'team__role' }, d.roleZh, d.roleEn ? h('span', { class: 'team__role-en', lang: 'en' }, d.roleEn) : null) : null,
        d.bio ? h('p', { class: 'team__bio' }, d.bio) : null,
        d.link ? h('p', { class: 'team__contact' },
          '联系方式：',
          h('a', {
            class: 'team__link',
            href: d.link,
            target: d.link.startsWith('mailto:') ? null : '_blank',
            rel: d.link.startsWith('mailto:') ? null : 'noopener noreferrer',
          }, d.link.replace(/^mailto:/i, ''))) : null);
    };

    el.append(h('section', { class: 'team', 'aria-labelledby': 'team-title' },
      h('h1', { id: 'team-title', class: 'team__title' }, h('span', null, '参与人员'), h('span', { class: 'team__title-en', lang: 'en' }, 'The team')),
      h('ol', { class: 'team__grid' }, ...members.map(card)),
      text(team.thanks) ? h('p', { class: 'team__thanks label' }, text(team.thanks)) : null));
    return () => el.replaceChildren();
  },
};
