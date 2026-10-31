// hash 路由。页面 = { title, features }（来自 src/pages/*.js 的清单）。
// unmount 只拆 DOM 与监听，不清 store，所以切页后回来状态仍在（SCOPE：页面生命周期）。

import { mountEntries, validateEntries } from './mount.js';

const DEFAULT_PATH = '/';

export function pathFromHash(hash) {
  const path = (hash || '').replace(/^#/, '') || DEFAULT_PATH;
  return path;
}

/**
 * @param {Record<string, {title: string, features: any[]}>} pages
 * @param {Record<string, any>} registry
 * @param {object} ctx
 * @param {{ root: HTMLElement, live?: HTMLElement|null }} dom
 */
export function mountRouter(pages, registry, ctx, { root, live = null }) {
  // 启动即校验所有页面，未知功能在这里就报错，而不是等用户切到那一页
  for (const [path, page] of Object.entries(pages)) {
    try {
      validateEntries(registry, ctx.ports, page.features);
    } catch (err) {
      throw new Error(`页面 ${path}：${err.message}`);
    }
  }

  let current = null;     // { path, unmount }
  let renderSeq = 0;

  function render() {
    const requested = pathFromHash(location.hash);
    const path = pages[requested] ? requested : DEFAULT_PATH;
    const page = pages[path];

    // 未知路由回首页：用 replace，不污染后退历史
    if (path !== requested) {
      history.replaceState(null, '', `#${path}`);
    }

    current?.unmount?.();
    root.replaceChildren();
    root.dataset.page = path;     // 页面网格（styles/app.css）按它分页布局
    const seq = ++renderSeq;

    const unmount = mountEntries(root, page.features, ctx, registry);
    if (seq !== renderSeq) return;      // 理论上同步渲染不会发生，保险
    current = { path, unmount };

    document.title = page.title;
    if (live) live.textContent = page.title;   // aria-live 播报页面名
    root.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    ctx.bus.emit('route:changed', { path });
  }

  window.addEventListener('hashchange', render);
  render();

  return {
    navigate(path) { location.hash = `#${path}`; },
    current: () => current?.path ?? null,
    destroy() {
      window.removeEventListener('hashchange', render);
      current?.unmount?.();
      current = null;
    },
  };
}
