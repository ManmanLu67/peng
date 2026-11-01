// 接口标记：区分模拟数据与真实数据（SCOPE：Mock 数据标识）。读 ports.chat.kind。
import { h } from '../../ui/index.js';

const TEXT = {
  mock: { badge: '本机', hint: '示例句会简化。其他话需要接上模型才能对话' },
  live: { badge: '已连接', hint: '文字会发送到你配置的模型' },
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
