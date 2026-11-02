// 功能注册表：id → 加载函数。页面组合在 src/pages/*.js。
// 新增功能：建 features/<id>/index.js，在这里登记一行。
// 用 import() 而不是顶层 import，这样首页不会带上工作台和团队页的代码。
const loaders = {
  actions: () => import('./actions/index.js'),
  'api-badge': () => import('./api-badge/index.js'),
  bridge: () => import('./bridge/index.js'),
  chat: () => import('./chat/index.js'),
  compare: () => import('./compare/index.js'),
  demo: () => import('./demo/index.js'),
  'home-hero': () => import('./home-hero/index.js'),
  'ladder-bar': () => import('./ladder-bar/index.js'),
  logo: () => import('./logo/index.js'),
  nav: () => import('./nav/index.js'),
  'team-grid': () => import('./team-grid/index.js'),
  'theme-toggle': () => import('./theme-toggle/index.js'),
  topbar: () => import('./topbar/index.js'),
};

/** 只加载这一页用到的功能。未知 id 直接抛。 */
export async function loadRegistry(ids) {
  const entries = await Promise.all([...new Set(ids)].map(async (id) => {
    const load = loaders[id];
    if (!load) throw new Error(`未知功能：${id}`);
    const mod = await load();
    return [id, mod.default];
  }));
  return Object.fromEntries(entries);
}
