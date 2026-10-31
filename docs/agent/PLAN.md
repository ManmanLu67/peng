# 分阶段计划

优先级：1 页面完整　2 静态演示可跑　3 切页与演示流畅。
前提：路演在本机笔记本（Chrome / Edge），可能断网；中文字体用系统宋体；全程 mock，不接扣子。
设计依据：`docs/朋 Peng 网页逻辑设计 v0.2.md`（做什么）、`docs/朋 Peng 网页技术文档 v0.2.md`（怎么做，含 14.10b 已定决定）。
总工时约 7 h。每个阶段结束都必须是"能打开、能点、不报错"的状态，后面阶段出问题可以在这里止损。

## 阶段 0　骨架（0.75 h）

做：
- `web/index.html`、`scripts/serve.mjs`（`node:http`，127.0.0.1:5173，只读 `web/`，防路径穿越）。
- `src/core/`：`contract.js`（validate、PengError）、`ladder.js`、`store.js`、`bus.js`、`flow.js`、`commands.js`（含 reqId 防乱序）。
- `src/ports/index.js`，`adapters/chat/mock.js`（带 `kind:'mock'`、`?mock=fail`）、`adapters/clock/{real,fake}.js`、`adapters/segmenter/intl.js`、`adapters/storage/{local,memory}.js`、`adapters/speech/null.js`。
- `src/app.js`：`Promise.all` 读取 `data/*.json`，创建 ports，组装 ctx。
- `data/`：`rungs.json`、`nodes.json`、`demo.json`（水杯 8 级）、`annotation-types.json`。
- `scripts/check-deps.mjs`（含 `ui` 层规则）、`.gitignore`（含 `config/config.local.js`）。
- `tests/`：`flow`、`ladder` 的 `node:test`。

验收：
- `node scripts/serve.mjs` 起得来，浏览器打开 `http://127.0.0.1:5173` 无控制台报错。
- `node --test` 与 `node scripts/check-deps.mjs` 通过（在 `web/` 下执行）。

状态：**已完成**（见 CURRENT_STATE.md「阶段 0 完成」）。

## 阶段 1　路由与外壳（0.5 h）

做：
- `shell/router.js`（读 `config.pages`，未知路由回首页，切页 `unmount` 只拆 DOM，`document.title`，焦点回主体）。
- `shell/mount.js`：支持 `{ id, options, slots }`，未知功能 id 启动即报错。
- `styles/tokens.css`、`base.css`（变量、字体回退链、1 px 细线、直角按钮、reduced-motion 全局规则）。
- features：`topbar`（三槽位）、`nav`、`logo`（印章"朋" + peng）、`theme-toggle`（先只做手动切换，持久化放 P1）、`hsk-select`、`api-badge`。
- 三个页面先放占位内容。

验收：
- 三页互跳、刷新停留、后退可用。
- 三页顶栏内容各自正确。
- 从 `/app` 配置里删一个功能，页面仍启动。

## 阶段 2　页面二静态版面（2 h）

做：
- `app.css` 网格：左栏 25%（≥320 px）、右栏上节点区、下对比区、右缘阶梯条、右下按钮组。
- `chat`：用户消息、解读卡（点击切换右侧内容）、3 个示例按钮（带语境）、下划线输入框、朱砂发送图标；空输入禁发送。
- `actions`：更简单 / 还原 / 没看懂 / 看懂了，两端禁用。
- `ladder-bar`：8 级，当前档朱砂，点击相邻档等同升降。
- `compare`：原文 | 改写并排，英文档主显，第 8 级显示"原文（未改写）"，非末档的"View in English"折叠，`culture_note` 缺失则隐藏。
- 基础标注：预置短语最长匹配 + HSK 小词表，取等级最高的前 3 个，四种线型，注释卡。
- 加载一次后 `?mock=fail` 能进入 error 并保留输入。

验收：
- 水杯例句从 HSK 3 提交，用按钮下到英文，每一级内容与逻辑文档第 2 节一致。
- 英文档"更简单"禁用；原文档"更接近原文"禁用。
- 连点按钮不出现旧响应覆盖。

## 阶段 3　鹊桥节点条与状态机（1.25 h）

做：
- `bridge`：SVG 两块靛蓝多边形（`tornEdge` 固定 seed，提到 `core/geometry.js`）、贯穿线、4 个节点、5 种状态、喜鹊 symbol（放 `ui/`）。
- 按 `nodes.json` 的 `paths` 点亮：没看懂 = 01→02→03→01；更简单 / 还原 = 只 01；看懂了 = 02、04 亮，03 虚线。
- mock 无 `trace` 时模拟回放，每节点 400–800 ms，显示"模拟回放"。
- 点击节点弹详情卡（`Esc` 关闭），P1 若时间紧可以只做图不做卡。
- 动画只用 `opacity` / `transform`。

验收：
- 逻辑文档 5.5 的四条规则逐条能看到。
- 看懂后桥上小灯亮起，显示"读懂了 · Understood"。
- error 时节点停在出错处画红叉，重试可用。

## 阶段 4　演示模式（0.5 h）

做：
- `features/demo`：只调 `commands`，经 `ports.clock` 调度；脚本按逻辑文档 5.8。
- 演示中禁用输入与按钮，顶部"演示中 · Demo"与退出按钮；退出清全部定时器并重置 store。
- 离开 `#/app` 自动退出。

验收：
- 断开网络，一键跑完整流程到小灯亮起，用时约 15 s。
- 中途退出回到 idle，无残留定时器。

## 阶段 5　首页视觉（1.25 h）

做：
- `home-hero`：靛蓝左右块 + 窄缝、青蓝块、米白穿插块、赭石压角、桥（12–16 只喜鹊）、朱砂小灯、微场景（人、杯、石头、喜鹊）、主标题、英文副标、`01–04` 序号、竖排标签、"开始"印章按钮、底部小字。
- 色块用 `clip-path` + 小块平铺噪点底图，不用 `feTurbulence`。
- 入场：靛蓝块先出，喜鹊 `opacity` + `transform` 依次出现，最后灯亮；reduced-motion 直接全显。
- 点击"开始"或桥进入 `#/app`。
- 窄屏保证不崩即可，不做精排。

验收：
- 视口缩到 400×250，靛蓝大形仍可辨。
- 朱砂面积目测不超过 3%。
- 标题对比度 ≥ 4.5:1（用工具复核）。

## 阶段 6　参与人员（0.25 h）

做：
- `team-grid` 读 `team.json`，错位排布，印章头像，空字段不渲染，`name` 为空显示"姓名待填 · Name TBD"，`link` 仅允许 `https://`。

验收：
- 字段缺失不出现 `undefined`。

## 阶段 7　收尾验收（0.5 h）

- 过技术文档第 11 节清单，其中本期不适用的项标明（令牌、`coze-agent` 切换、语音）。
- 在笔记本上实测首页滤镜外的性能：三页切换、演示全程无明显掉帧。
- 更新 `CURRENT_STATE.md`：改了什么、验证了什么、没验证什么、下一步。

## 之后（P1，不占 7 h，按序）

1. 播报 `playback` + `speech/web-speech`
2. 语音输入 `voice`（Chrome 依赖联网，断网要自动隐藏）
3. 深浅色持久化（`storage/local`）
4. 纸面 `feTurbulence` 滤镜、`mask` 墨渍动画（先实测性能）
5. 语法标注、对应连线、文化语境条
6. `coze-agent` 适配器（接口字段需队友核对官方文档，令牌不入库，只在本机演示）

## 暂舍

`relay`、`simple` 分词、jieba wasm、扣子独立语音、WebP 预渲染、窄屏精排、"我没懂"意图识别、语速 UI、流式、自动重试、历史、账号、CSP、隐私提示。

## 风险与止损

| 风险 | 止损 |
| ---- | ---- |
| 阶段 2 超时 | 先砍标注的线型与注释卡，保并排对比与 8 级内容 |
| 首页构图反复调不好 | 阶段 5 封顶 1.25 h；不满意就用 viewBox 坐标表（技术文档 5.3）的初值交付 |
| 解耦样板拖慢进度 | 只先做 `chat`、`bridge`、`compare` 三个功能走完整契约，其余功能可以薄实现，但仍必须过 `check-deps` |
| 系统宋体观感偏弱 | 加大字号与行距，不换字体 |
| Chrome 里 `Intl.Segmenter` 切分与 Node 不同 | 演示句靠预置短语匹配，不依赖分词结果 |
