// 按页面清单挂载功能。清单条目：'id' 或 { id, options, slots }。
// 功能契约（技术文档 14.6）：{ id, needs?, mount(el, ctx, options) → unmount? }。
//   - el 是该功能的独占容器；返回的函数在卸载时调用。
//   - needs 声明依赖的端口，缺了启动时报错，而不是运行时崩。
//   - slots：{ left: [条目…], center: […], right: […] }。功能自己决定放哪些槽位容器，
//     shell 只负责把 slots 传进 options.slots，并提供 mountEntries 给功能里的槽位容器使用。

import { h } from '../ui/index.js';

function normalize(entry) {
  return typeof entry === 'string' ? { id: entry } : entry;
}

/** 页面清单里出现的功能 id，含槽位。供按页加载，不在这里执行功能。 */
export function collectIds(entries, out = []) {
  for (const entry of entries ?? []) {
    const item = normalize(entry);
    out.push(item.id);
    if (item.slots) {
      for (const list of Object.values(item.slots)) collectIds(list, out);
    }
  }
  return out;
}

function resolve(registry, ports, entry) {
  const { id } = normalize(entry);
  const feature = registry[id];
  if (!feature) throw new Error(`未知功能：${id}`);
  for (const need of feature.needs ?? []) {
    if (!ports[need]) throw new Error(`功能 ${id} 需要端口 ${need}，但配置里没有`);
  }
  return feature;
}

/**
 * 先把整张清单校验一遍（未知功能 / 缺端口），再挂载。
 * 校验失败直接抛，由调用方显示错误，不静默跳过。
 */
export function validateEntries(registry, ports, entries) {
  for (const entry of entries) {
    resolve(registry, ports, entry);
    const slots = normalize(entry).slots;
    if (slots) for (const list of Object.values(slots)) validateEntries(registry, ports, list);
  }
}

/**
 * 把 entries 依次挂进 parent，返回统一的卸载函数。
 * 单个功能挂载时抛出异常：只在它的容器里显示错误，其余功能照常（SCOPE：不白屏）。
 */
export function mountEntries(parent, entries, ctx, registry) {
  const offs = [];
  for (const entry of entries) {
    const { id, options, slots } = normalize(entry);
    const feature = resolve(registry, ctx.ports, entry);
    const el = h('div', { class: `feature feature--${id}`, 'data-feature': id });
    parent.append(el);
    try {
      const off = feature.mount(el, ctx, {
        ...options,
        slots,
        mountEntries: (container, list) => mountEntries(container, list, ctx, registry),
      });
      if (typeof off === 'function') offs.push(off);
    } catch (err) {
      console.error(`[feature:${id}] 挂载失败`, err);
      el.replaceChildren(h('div', {
        class: 'feature-error', role: 'alert',
        'aria-label': '这一部分没能显示，请刷新再试, This part could not load. Please refresh.',
      }, '这一部分没能显示，请刷新再试'));
    }
  }
  return () => {
    for (const off of offs.reverse()) {
      try { off(); } catch (err) { console.error('[unmount]', err); }
    }
    parent.replaceChildren();
  };
}
