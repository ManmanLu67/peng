// 组装清单：用哪个适配器、启动时加载哪些数据。换后端只改这里（技术文档 14.4）。
// 页面与功能的清单在阶段 1 加入。
export default {
  adapters: {
    chat:      { use: 'mock', options: { delayMs: [500, 900] } },
    // chat:   { use: 'coze-agent', options: { baseUrl: 'https://api.coze.cn', botId: '…', timeoutMs: 15000 } },  // P1
    speech:    { use: 'null' },            // P1 换成 'web-speech'
    segmenter: { use: 'intl' },
    storage:   { use: 'local', options: { prefix: 'peng-' } },
    clock:     { use: 'real' },
  },
  // 启动时一次性 fetch 的 data/*.json，切页不再有请求
  data: ['rungs', 'nodes', 'annotation-types', 'demo'],
  defaults: { hsk: 3 },
  flags: { demoMode: true, showApiBadge: true, debug: true },
};
