// 复制本文件为 config.local.js 再填写。config.local.js 已在 .gitignore，不会提交。
// baseUrl 用到 /v1 为止，末尾不要再加 /chat/completions。
// 接口必须给当前页面的源站返回 CORS 头，否则浏览器里请求会失败。
export default {
  chat: {
    baseUrl: 'https://api.example.com/v1',
    apiKey: '',
    model: '',
    timeoutMs: 25000,
  },
};
