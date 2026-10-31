// 工作台。网格区域名与功能 id 对应（styles/app.css 的 grid-area）。
export default {
  title: '朋 · 工作台',
  features: [
    // demo 放在顶栏 left 槽、Logo 右侧：显示倒计时时不会遮挡对比区或节点条的文字
    { id: 'topbar', slots: { left: ['logo', 'demo'], center: ['hsk-select'], right: ['api-badge', 'theme-toggle'] } },
    'chat',
    'bridge',
    'compare',
    'ladder-bar',
    'actions',
  ],
};
