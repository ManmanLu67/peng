// 页面只描述“用哪些功能、放哪个槽位”，不含业务逻辑。
export default {
  title: '朋 · 首页',
  features: [
    { id: 'topbar', slots: { left: ['logo'], center: [{ id: 'nav', options: { brand: true } }], right: ['api-badge', 'theme-toggle'] } },
    'home-hero',
  ],
};
