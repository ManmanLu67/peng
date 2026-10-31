// 工作台。网格区域名与功能 id 对应（styles/app.css 的 grid-area）。
export default {
  title: '朋 · 工作台',
  features: [
    { id: 'topbar', slots: { left: ['logo'], center: ['hsk-select'], right: ['api-badge', 'theme-toggle'] } },
    'chat',
    'bridge',
    'compare',
    'ladder-bar',
    'actions',
    'demo',
  ],
};
