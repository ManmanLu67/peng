# CURRENT_STATE

更新：本次为"项目盘点 + P0 范围划定"，未写任何代码。

## 现状（已核实）

- 仓库只有 `docs/`（6 份文档）、`reference/主页面.png`、`.claude/settings.local.json`。没有 `web/`、没有 `package.json`、没有 `.gitignore`。
- 技术栈（文档定）：原生 HTML / CSS / ES Modules，零构建，零依赖。
- 环境：Node v24.18.0（文档要求 18+）。`python` 是 2.7.18，`py` 启动器是 3.13.2，所以文档"python 没有 http.server"只对 `python` 成立，`py -m http.server` 可用。
- 文档里的启动/检查命令全部指向尚不存在的文件：`node scripts/serve.mjs`、`node scripts/check-deps.mjs`、`node --test tests/`。
- `Intl.Segmenter('zh')` 在 Node 24（ICU 78.3）实测："日照香炉生紫烟" → 日照 | 香炉 | 生 | 紫 | 烟。"紫烟"被拆开，预置短语（glosses.json）仍然必要。Chrome 里未验证。

## 文档内部矛盾（开工前要定）

1. 技术文档 1 节写"双击即开 / `file://` 可用"，同节注意事项又说 ES Modules 在 `file://` 被拦。结论：必须走本地服务，hash 路由本身与此无关。
2. `clock` 端口在 14.3 定义，但 `adapters/` 目录和 `app.config.js` 都没有 clock；`demo` 和 trace 回放依赖它。
3. 页面清单里有 `home-hero`、`team-grid`，但 `features/` 目录没有这两个。
4. `topbar` 要容纳 `hsk-select`、`theme-toggle`、`api-badge`，而 features 之间禁止互相 import。需要定：拆成独立功能并在页面里排槽位，或 topbar 只是容器。
5. 各页顶栏内容不同（页 2 是 HSK 选档，其余是导航），但配置里功能 id 是纯字符串，无法传页面参数。需要支持 `{ id, options }`。
6. `api-badge` 要显示"模拟/真实"，但 `ChatPort` 没有 `kind` 字段可读。
7. 多个功能要共用的 DOM 小工具（建节点、双语标签、喜鹊 SVG symbol）没有归属层。建议加 `src/ui/`，允许 features import，并写进 check-deps。
8. 第 12 节各步骤合计 8.25 h，已超过 7 h，还没算调参。
9. 参考图与文档的文案差异：图里节点 02 是 CLARITY、按钮是"不懂"；文档是 NOT CLEAR、"没看懂"。按文档为准。

## P0 / P1 / 暂舍

P0（主流程：水杯例句 HSK3 → 连点没看懂 → 英文 → 看懂了，且三页可跳转）
- 路由：`#/`、`#/app`、`#/team`，未知回首页。
- core：contract(validate、PengError)、ladder、flow、store、commands（含 reqId 防乱序）、annotate。
- adapters：chat/mock、segmenter/intl、clock/real。
- features：topbar(含 hsk-select、api-badge)、chat(消息、解读卡、3 个示例、输入、发送)、bridge(4 节点、5 种状态、模拟回放)、compare(原文/改写并排、难词标注、注释卡、英文档主显)、ladder-bar、actions(更简单/还原/没看懂/看懂了)、home-hero(静态色块 + 桥 + 入口)、team-grid。
- data：rungs、nodes、annotation-types、demo、team、glosses(覆盖演示例句)、hsk(小子集)。
- 错误态 + 重试 + 输入保留；空输入禁发送；档位两端禁用。
- 校验：`serve.mjs`、`check-deps.mjs`、`node --test`（flow、ladder、annotate）。
- 工程：`.gitignore`（含 `config/config.local.js`）。
- 真实后端：coze-agent 适配器在 mock 流程跑通后接入，也算 P0 末尾。

P1（P0 完成后按序做）
1. 演示模式（demo）
2. 播报（playback，speechSynthesis 本地可用）
3. 语音输入（voice，Chrome 依赖联网，国内网络下可能不可用，必须可隐藏）
4. 深浅色切换与持久化（storage/local）
5. 纸质感：feTurbulence 滤镜、tornEdge 生成、墨渍动画、reduced-motion
6. 语法标注、对应连线、文化语境条、非末档的"View in English"折叠
7. 手动语境输入框、节点详情卡、适配器契约测试

暂舍
- relay 适配器、simple 分词器、jieba wasm、扣子独立语音、html2canvas / WebP 预渲染。
- 窄屏（<720 px）排版（演示环境已定为 Chrome/Edge 笔记本）。
- 对话里说"我没懂"的意图识别（需要 Coze 返回 intent，按钮已覆盖）。
- 语速调节与自动播报 UI、流式回复、自动重试、历史持久化、账号、CSP、隐私提示（部署前再做）。

## 未验证

- 从未运行过任何代码；本文所有"可用"结论仅限 Node 与 Intl.Segmenter 的实测。
- 扣子接口字段、HSK 词表来源与授权、纸块滤镜性能，文档已标未核实，仍未核实。

## 已定决定（已写入技术文档 1、3.3、2、12、14.3、14.4、14.10b）

- 路演在本机笔记本，统一 `node scripts/serve.mjs`；不再宣称"双击即开"或 `file://` 可用。
- 中文标题字体接受系统宋体回退；英文字体拉丁子集自托管。
- 演示模式升到 P0；真实扣子适配器、语音、播报、`feTurbulence` 滤镜降到 P1。
- 矛盾 2–7 采用推荐方案：补 clock 适配器、补 `home-hero` / `team-grid`、topbar 槽位、功能条目支持 `{id, options, slots}`、`ChatPort.kind`、新增 `ui/` 层。矛盾 1 靠启动时 `fetch` 全部 JSON。
- 工时重排为约 7 h，见 `docs/agent/PLAN.md`。
- 文档已改，代码一行未写。

## 阶段 0 完成（骨架）

代码在 `web/`，工作目录里，**尚未提交**。

做了：
- `core/`：store、bus、contract、ladder、flow（纯 reducer）、commands（reqId 防乱序、节点定时器、abort）。
- `adapters/`：chat/mock、clock/{real,fake}、segmenter/intl、storage/{local,memory}、speech/null，登记在 `adapters/index.js`。
- `app.js` 组装根：启动时 `Promise.all` 读 `data/*.json`，创建 ports，`globalThis.__peng`（debug 标志下）暴露 ctx。
- `scripts/serve.mjs`（127.0.0.1，拦路径穿越与点开头文件）、`scripts/check-deps.mjs`。
- `data/`：rungs、nodes（含 `skip` 字段）、annotation-types、demo（水杯 8 级 + 3 个示例）。
- 与文档不同的点：`flow` 里"看懂了"把 03 标为跳过的规则放进了 `nodes.json` 的 `skip.understood`，不写死在代码里；`package.json` 的 test 用 `node --test`（不带目录，Windows 上带 `tests/` 会被当成模块路径）。技术文档里写的 `node --test tests/` 需要同步改。

验证了（本次会话实际运行）：
- `node scripts/check-deps.mjs`：17 个文件通过。
- `node --test`：34 个测试全过（flow、ladder、commands 链路含失败重试、乱序、无残留定时器）。
- `serve.mjs`：`/`、JS、JSON 返回 200 和正确 MIME；`../` 穿越与 `.git` 返回 403。
- 无头 Edge 经 DevTools 协议在真实浏览器里跑了水杯主流程：HSK 3 → 3 次没看懂到英文 → 看懂了，节点状态 `done,done,skipped,done`，控制台无错误（除 favicon 404，已加内联 favicon，未复测）。

没验证：
- `?mock=fail` 在浏览器里的表现（逻辑层测试已覆盖，浏览器未跑）。
- 页面渲染（还没有任何界面，只有一行文字）。
- Edge 以外的浏览器；`Intl.Segmenter` 在 Chrome/Edge 里的切分结果。
- `check-deps.mjs` 对动态 `import()` 无能为力，只验证了常见违规能被发现这一点的代码路径，没有专门造违规文件做反向测试。

注意：
- `.claude/settings.local.json` 有未提交改动，不是我改的，未处理。
- 无头浏览器验证时我曾留下 12 个 Edge 子进程和临时目录，已只按命令行特征清理，未碰其他 Edge 进程。

## 下一步

1. 阶段 1：路由与外壳（`shell/router.js`、`mount.js`、tokens.css、base.css、topbar 槽位、nav、logo、theme-toggle、hsk-select、api-badge），三页能互跳。
2. 给 `check-deps.mjs` 补一个反向测试（故意造违规文件，确认能报错）。
3. （已完成）技术文档里的 `node --test tests/` 已改成 `node --test`。
4. 阶段 2 起按 `docs/agent/PLAN.md` 推进，每阶段结束更新本文件。
