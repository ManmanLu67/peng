// 接口标记：区分模拟数据与真实数据（SCOPE：Mock 数据标识）。读 ports.chat.kind。
import { h } from '../../ui/index.js';

const TEXT = {
  mock: { badge: 'API: MOCK', hint: '当前使用模拟数据 · Using mock data' },
  live: { badge: 'API: LIVE', hint: '当前连接真实接口 · Connected to the live API' },
};

export default {
  id: 'api-badge',
  needs: ['chat'],
  mount(el, ctx) {
    if (ctx.flags.showApiBadge === false) return undefined;
    const kind = ctx.ports.chat.kind;
    const t = TEXT[kind];
    if (!t) throw new Error(`api-badge：未知的 chat.kind "${kind}"`);

    el.append(h('span', {
      class: ['api-badge', `api-badge--${kind}`],
      role: 'status',
      title: t.hint,
      'aria-label': t.hint,
    }, t.badge));
    return () => el.replaceChildren();
  },
};
