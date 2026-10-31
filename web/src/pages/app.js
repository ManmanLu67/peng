// 工作台。T2 在最前面加入：{ id: 'topbar', slots: { left: ['logo'], center: ['hsk-select'], right: ['api-badge', 'theme-toggle'] } }
// chat / bridge / compare / ladder-bar / actions / demo 在 T3 逐个加入。
// T1 阶段还没有任何工作台功能，用一个最小占位让路由可验证。
export default {
  title: '朋 · 工作台',
  features: ['app-placeholder'],
};
