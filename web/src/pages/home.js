// 页面只描述“用哪些功能、放哪个槽位”，不含业务逻辑。
// T2 在最前面加入：{ id: 'topbar', slots: { left: ['logo'], center: [], right: [{ id: 'nav', options: { links: ['/team'] } }, 'theme-toggle'] } }
export default {
  title: '朋 · 首页',
  features: ['home-hero'],
};
