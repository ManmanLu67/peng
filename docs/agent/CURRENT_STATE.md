# CURRENT_STATE

读取顺序：先看本文，再看 `SCOPE.md`（范围，已冻结）、`PLAN.md`（任务）、`TEST.md`（验收）。
`docs/brainstorm/` 里的设计与技术文档是背景资料，已被 `.gitignore` 排除，冲突以 SCOPE 为准。

本文描述仓库里的代码，不描述尚未落地的方案。

## 当前阶段

`main`，最新提交 `0a2200c`。工作区干净。P0 的页面都在：首页、工作台、团队页。T1–T5 已提交。T6（只修阻断问题、部署前收尾）没做。

默认改写后端仍是 mock：`web/config/app.config.js` 里 `chat.use` 为 `'mock'`。非示例句返回带 `mock_placeholder` 的占位改写。另有 `adapters/chat/live.js`（OpenAI 兼容，浏览器直连）。`web/config/config.local.js` 里同时写了 `apiKey` 和 `baseUrl` 时，`app.js` 才改用它；该文件已忽略，仓库里只有 `config.local.example.js`。首次提交的目标档是 `min(顶栏档, 模型判断的句子难度)`，且不低于中文档。之后「没看懂」仍按状态机逐级下降。演示请求带 `client: 'demo'`，继续走 mock。

托管不在仓库里跟踪。`vercel.json` 已从 git 删除并写进 `.gitignore`；工作区根目录若还有一份，那是本地文件，`outputDirectory` 为 `web`。部署由用户自己做。

## 现在有什么

全局：`#/`、`#/app`、`#/team`。顶栏槽位、切页后工作台状态保留、设计令牌、窄屏。主题按钮只显示，`aria-disabled`，点击不改 `data-theme`。`flags.debug` 与 `showApiBadge` 仅在 `hostname === 'localhost'` 时为真；`127.0.0.1` 下没有 `__peng`，顶栏也不显示 API 标记。

首页（`features/home-hero/`、`styles/paper.css`）：5 块纸、固定 seed 的撕纸边、滤镜 v2、14 只喜鹊、微场景、朱砂小灯和「开始」印章。标题「难懂的话，走成一座桥。」，英文副标 `Meet the language halfway.`。竖排「鹊桥 · Queqiao」和页脚「黑客松 · 7 小时 · 4 人」已去掉。墨渍入场只留注释，元素静态全显。

工作台：

- `chat`：示例句点击即提交，空输入 / 运行中 / 演示中禁用，失败后把文字放回输入框。底部说明随 `ports.chat.kind` 变化：mock 写「不会离开本机」，live 写「将发送到你配置的模型接口」。
- `compare` + `annotate`：原文与改写并排。第 8 级显示「原文（未改写）」；英文档主显英文；文化注释缺失就隐藏；`mock_placeholder` 显示「模拟数据」且不做标注。注释卡显示词、拼音、中文、English。难词只取高于当前档的，有释义的优先于超纲词，最多 3 个。词表是 `hsk.json` 的 31 个词加 `glosses.json`，释义未核对，界面上没有「词表为演示子集」的页脚。
- `ladder-bar`：8 级，只展示，不能点。
- `bridge`：宣纸底上一条下垂赭石弧线，4 个固定月相（相位 0.2、0.46、0.72、1），每颗月相上方一只喜鹊，末只镜像仰头。序号和标签读 `nodes.json`。五种状态只改颜色，不改月相形状。读屏步骤列表仍在。
- `actions`：只有「没看懂 · Didn't understand」。英文档禁用。「看懂了」没有按钮；`commands.understood` 还在，演示会调用它点亮结束步。
- `demo`：从所选起点一路降到英文再「看懂了」。停留 5–10 秒（`core/pacing.js`）。控件在顶栏 Logo 右侧。演示中禁用输入；退出或离开 `#/app` 会重置。演示走 mock，不联网。

团队页：4 张错位卡，读 `team.json`。姓名已填：刘冠华、路曼曼、西西（Kelvin）、阳君。一句话和链接是空的，对应行不渲染。外链校验 `safeHttps` 有单测，卡片上不渲染链接。页底有致谢「扣子 Coze、小智 Xiaozhi」。

数据：`rungs`、`nodes`、`annotation-types`、`demo`、`hsk`、`glosses`、`team`。语法标注不在 `annotation-types.json` 里。

P1 只留入口，没有界面对应功能：深浅色切换、语音、手动升档和还原、「看懂了」按钮、语法标注、双栏连线、节点详情、错误详情与重试、团队外链、墨渍动画。P2（学习记录、扣子后端、自由聊天）没有建。

## 本次核对（2026-11-01）

在 `web/` 下实际跑过：

- `node scripts/check-deps.mjs`：44 个文件通过。
- `node --test`：87 个全过。

没有在这次打开浏览器。下面这些仍是更早会话的记录，不是这次复测：无头 Edge 上的顶栏、聊天、对比、鹊桥、演示探测；断网演示从 HSK 3 跑到英文。那些探测脚本还在 `web/proto/probe-*.mjs`。滤镜原型 `web/proto/paper.html` 已经不在。

## 仍未验证

- 有头浏览器和 Chrome 里的完整体验；键盘和读屏只核过注释卡的 Enter / Esc 以及 `aria` 属性在。
- 正式首页在目标笔记本上的帧率。原型页已删除，要看就开站点根路径的首页。
- `hsk.json` / `glosses.json` 的释义是否准确，词表授权未核实。
- `Intl.Segmenter` 在 Edge / Chrome 里的切分是否与单测环境一致。

## 后来的人要知道的坑

- 探测和 `__peng` 必须用 `http://localhost:端口`。`127.0.0.1` 时 `flags.debug` 为假。
- `replaceChildren(null)` 会插入文字 "null"。传子节点前要 `filter(Boolean)`。
- 无头 Edge 的探测脚本偶发 `Runtime.evaluate` 超时，重试即可，不一定是页面卡死。
- 工作台节点条已改成弧线与月相。旧说明里「两块靛蓝撕纸、缝里贯穿一条线」对不上现在的 `features/bridge/`。

## 部署前仍开放

1. 若把 `web/` 整目录公开，`web/proto/`、`web/tests/`、`web/scripts/`、`web/package.json` 会一起出去。仓库里没有 `.vercelignore`。
2. 线上主机名不是 `localhost` 时，API 标记隐藏，`__peng` 也不暴露。模拟句本身仍带「模拟数据」字样。
3. 页脚没有「词表为演示子集」。说明只写在两个 JSON 的 `_note` 里。
4. 公开前把 `flags.debug` 固定为 `false` 的注释还在；现在的值由主机名决定，不是手写的 `false`。

## 下一步

1. 要使用真实降级：把 `web/config/config.local.example.js` 复制为 `config.local.js`，填入允许浏览器跨域的接口。没配密钥时页面仍是 mock。
2. 部署前处理上面四条里要公开的部分。
3. 在目标笔记本上看一次正式首页的帧率，再决定滤镜要不要降级。当前没有实测卡顿，不启用 WebP。
