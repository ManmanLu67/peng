# AGENTS.md

产品怎么用见 `README.md`（`README.en.md` 与它对齐，不一致时以中文为准）。现在有什么、不做见 `docs/agent/SCOPE.md`。进度见 `docs/agent/CURRENT_STATE.md`。

`docs/brainstorm/`、`docs/archive/`、`reference/`、`.impeccable/` 不在版本库里，不作为需求。

## 改代码

- 页面在 `web/src/pages/`，只组合功能、放槽位。功能在 `web/src/features/`，彼此不引用。
- 改状态只经 `web/src/core/commands.js`。外部能力只经 `web/src/ports/`，实现放在 `web/src/adapters/`。
- 模拟数据放在 `web/data/`，不写进界面组件。
- 页面运行时不引入依赖。`npm start` 直接提供 `web/src`，不打包。
- 接口返回的文字用 `textContent`，不用 `innerHTML` 拼接。
- 不提交密钥。`web/config/config.local.js` 保持在 `.gitignore`。不要读取或写回这个文件里的密钥。
- 首页纸张滤镜在实测卡顿之前不改成预渲染图。

## 界面

- Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining.

- **每一个设计与技术决策，都应该同时提升用户体验（UX）、开发者体验（DX）和 AI Agent 体验（AX），并且不能破坏任何现有功能。**

## 改完

行为或用法变了，同时改 `README.md` 和 `README.en.md`。范围变了改 `docs/agent/SCOPE.md`。进度变了改 `docs/agent/CURRENT_STATE.md`，写清做了什么、没验证什么。

在 `web/` 下执行 `npm test`。完整检查用 `npm run verify`。
