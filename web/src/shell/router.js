// hash 路由。pages 的值是加载函数，解析后得到 { title, features }。
// unmount 只拆 DOM 与监听，不清 store，所以切页后回来状态仍在（SCOPE：页面生命周期）。

import { collectIds, mountEntries, validateEntries } from './mount.js';

const DEFAULT_PATH = '/';

export function pathFromHash(hash) {
  const path = (hash || '').replace(/^#/, '') || DEFAULT_PATH;
  return path;
}

/**
 * @param {Record<string, () => Promise<{title: string, features: any[]}>>} pages
 * @param {(ids: string[]) => Promise<Record<string, any>>} loadRegistry
 * @param {object} ctx
 * @param {{ root: HTMLElement, live?: HTMLElement|null }} dom
 */
export function mountRouter(pages, loadRegistry, ctx, { root, live = null }) {
  let current = null;     // { path, unmount }
  let renderSeq = 0;

  function showRouteError() {
    current?.unmount?.();
    current = null;
    root.replaceChildren();
    const box = document.createElement('div');
    box.className = 'feature-error';
    box.setAttribute('role', 'alert');
    box.textContent = '页面没能打开，请刷新再试 · The page could not load. Please refresh.';
    root.append(box);
  }

  async function render() {
    const requested = pathFromHash(location.hash);
    const path = pages[requested] ? requested : DEFAULT_PATH;
    const seq = ++renderSeq;

    // 未知路由回首页：用 replace，不污染后退历史
    if (path !== requested) {
      history.replaceState(null, '', `#${path}`);
    }

    try {
      const page = await pages[path]();
      if (seq !== renderSeq) return;
      const registry = await loadRegistry(collectIds(page.features));
      if (seq !== renderSeq) return;
      validateEntries(registry, ctx.ports, page.features);

      current?.unmount?.();
      current = null;
      root.replaceChildren();
      root.dataset.page = path;     // 页面网格（styles/app.css）按它分页布局
      const unmount = mountEntries(root, page.features, ctx, registry);
      if (seq !== renderSeq) {
        unmount?.();
        return;
      }
      current = { path, unmount };

      document.title = page.title;
      if (live) live.textContent = page.title;   // aria-live 播报页面名
      root.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      ctx.bus.emit('route:changed', { path });
    } catch (err) {
      if (seq !== renderSeq) return;
      console.error(err);
      showRouteError();
    }
  }

  const onHash = () => { void render(); };
  window.addEventListener('hashchange', onHash);
  void render();

  return {
    navigate(path) { location.hash = `#${path}`; },
    current: () => current?.path ?? null,
    destroy() {
      window.removeEventListener('hashchange', onHash);
      current?.unmount?.();
      current = null;
    },
  };
}
