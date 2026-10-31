// 组装清单：用哪个适配器、启动时加载哪些数据、功能开关。换后端只改这里。
// 页面与功能的组合在 src/pages/*.js，不在这里（范围冻结后的约定，见 docs/agent/SCOPE.md）。
export default {
  adapters: {
    chat:      { use: 'mock', options: { delayMs: [500, 900] } },
    segmenter: { use: 'intl' },
    clock:     { use: 'real' },
    // 真实聊天不写在这里。有 config/config.local.js 且含 apiKey、baseUrl 时，app.js 改用 chat.live。
    // P1 接入位置（本次不实现，见 src/ports/index.js）：
    //   speech；theme
    //   Mock 故障注入入口：chat.options.fail = () => true（mock 适配器已支持，本次不接 URL 或界面）
  },
  // 启动时一次性 fetch 的 data/*.json，切页不再有请求。新增数据文件时在这里登记。
  data: ['rungs', 'nodes', 'annotation-types', 'demo', 'hsk', 'glosses', 'team'],
  defaults: { hsk: 3 },
  // debug: 暴露 globalThis.__peng 供浏览器控制台检查；公开部署前改为 false
  flags: {
    demoMode: true,
    showApiBadge: typeof window !== 'undefined' ? new URL(window.location.href).hostname === 'localhost' : true,
    debug: typeof window !== 'undefined' ? new URL(window.location.href).hostname === 'localhost' : true
  },
};
