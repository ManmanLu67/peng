// 工作台。chat / bridge / compare / ladder-bar / actions / demo 在 T3 逐个加入，
// 网格区域名与功能 id 对应（styles/app.css 的 grid-area）。
// 目前没有任何工作台功能，用一个最小占位让页面可验证；T3 第一个功能加入后删除。
export default {
  title: '朋 · 工作台',
  features: [
    { id: 'topbar', slots: { left: ['logo'], center: ['hsk-select'], right: ['api-badge', 'theme-toggle'] } },
    'app-placeholder',
  ],
};
