# CURRENT_STATE

读取顺序：先看本文，再看 `SCOPE.md`（范围，已冻结）、`PLAN.md`（任务）、`TEST.md`（验收）。
`docs/brainstorm/` 里的设计与技术文档是背景资料，已被 `.gitignore` 排除，冲突以 SCOPE 为准。

## 当前阶段

范围已冻结。阶段 0（骨架）已提交；冻结后的收缩改动与 SCOPE / PLAN / TEST 已由用户提交。
**T1、T2、纸张滤镜原型、T3（工作台核心）完成，均未提交。** 下一步：T4（首页视觉，用滤镜 v2）、T5（团队页）。
托管方式已定为 Vercel，**由用户负责配置和部署**（用户确认："我负责配置"）。我不做部署操作；部署前需把 `web/config/app.config.js` 的 `flags.debug` 改为 `false`，并删除或不发布 `web/proto/`。

## T3 完成情况（工作台核心）

做了：
- `chat`（3a）：用户消息、解读卡、3 个示例（自带语境，点击即提交）、下划线输入、朱砂发送图标；空输入 / 运行中 / 演示中禁用；失败后把文字放回输入框。
- `compare`（3b）+ `annotate`（3f）：原文 | 改写并排；标题行带延伸细线；第 8 级显示“原文（未改写）”；英文档主显；非末档英文折叠；`culture_note` 缺失即隐藏；`mock_placeholder` 显示“模拟数据”且不做标注；标注线型来自 `annotation-types.json`；注释卡（点击 / 回车打开，Esc 关闭）显示词 + 拼音 + 中文 + English；难词只取高于当前档的词（`minLevel`），有释义的词优先于超纲词，最多 3 个。
- `ladder-bar`（3c）：8 级纵向条，当前档朱砂，只展示不可点击。
- `bridge`（3d）：两块靛蓝撕纸（`tornPolygon`，固定 seed）、贯穿线、4 节点、5 种状态、喜鹊、小灯、“读懂了 · Understood”、“模拟回放”标注、读屏步骤列表；窄屏节点条内部横向滚动。
- `actions`（3e）：只有“没看懂 · Didn't understand”，英文档禁用。
- `demo`（3g）：经 `ports.clock` 调度，只调用 `commands`，从所选起点档一路降到英文再“看懂了”；演示中禁用输入和按钮；退出 / 离开页面自动重置。
- 数据：`glosses.json`、`hsk.json`（演示子集，约 31 个词，释义由开发者撰写，**需队友核对**，词表来源与授权未核实）。
- 核心改动：`flow` 增加 `demo` 标记和 `SET_DEMO`；`RESET` 保留 `reqSeq`（避免与被取消的旧请求撞号）；请求在途时 `traceSimulated=true`；`ladder.availability` 把演示中视为忙碌。

验证了（本次会话实际运行，无头 Edge，经 `localhost`）：
- `check-deps` 41 个文件通过；`node --test` 66 个全过。
- 浏览器探测（`web/proto/probe-*.mjs`）：chat 19 项、layout 18 项、compare 32 项、bridge 36 项、demo 22 项，各自最后一次全过。
- 演示：断网下从 HSK 3 跑到英文再“看懂了”，用时 18.8 s；档位依次 4→3→2→1；起点选 HSK 5 时依次 6→5→4→3→2→1；中途退出回到 idle 且 3.5 s 后无残留动作；演示中切走再回来已重置；断网期间没有任何新增网络请求。

没验证：
- 有头浏览器、Chrome；键盘操作与读屏的完整流程（只验证了注释卡的 Enter / Esc 和 `aria` 属性存在）。
- 目标笔记本上的演示观感与帧率（用户只测过滤镜原型，约 59 fps）。
- 演示控件位置：已移到顶栏 Logo 右侧并通过多宽度探测，但没有在你的笔记本上看过实际观感。
- `hsk.json` / `glosses.json` 的释义准确性。

踩过的坑（后来的人要知道）：
- `flags.debug` / `showApiBadge` 现在只在 `hostname === 'localhost'` 时为真（用户的 Vercel 提交）。探测脚本用 `127.0.0.1` 访问时 `__peng` 不存在，**必须用 `http://localhost:端口`**。
- `replaceChildren(null)` 会插入文字 "null"，传子节点前要 `filter(Boolean)`（注释卡曾因此显示 null）。
- 探测脚本偶发 `Runtime.evaluate` 超时（约 1/4，开和关都出现，无头 Edge 的问题，不是页面卡死）；重试即可。

## 用户反馈后的修订（流程线、演示节奏、演示控件）

- **流程线**：改成整条一种颜色（赭石 `--bridge-line`，3px、不透明），贯穿两块纸和中间的缝，两头伸出首尾节点；不再分段，也不再单独给缝里画桥板。进度只靠节点和喜鹊表达（用户选的方案 A）。依据：米白线在缝里（宣纸色）对比度 1.00 看不见，赭石在靛蓝上 3.58、在宣纸上 3.46。
- **演示节奏**：每页停留 5–10 s（`core/pacing.js`，按页面新内容的字数在区间内取值，`readTimeMs` 恒在 [5000, 10000]）。横幅里显示“下一步 N 秒后”。实测每页 9.9 / 9.2 / 6.7 s，全程约 48 s。
- **演示控件位置**：放进顶栏 left 槽、Logo 右侧（页面清单 `left: ['logo', 'demo']`），不再占对比区。反馈按钮“没看懂”独立成网格一行，不再盖住对比区文字。
- 顶栏网格改为 `auto minmax(0,1fr) auto`，左右槽按内容撑开；窄于 1180px 隐藏 API 标记，窄于 900px 隐藏 Logo 文字，窄于 720px 演示横幅只留“退出”。
- 清理：`web/proto/` 里现有 `paper.html`（滤镜原型）和 `probe-*.mjs`（浏览器探测，`probe-lib.mjs` 是公共库）。**部署前都要排除**；T4 完成后删掉 `paper.html`。

## 纸张滤镜原型结论（`web/proto/paper.html`、`web/styles/paper.css`、`web/src/core/geometry.js`）

- `core/geometry.js`：`mulberry32`、`tornPolygon`、`tornEdge`、`toClipPath`、`toPathD`，5 个单测（同 seed 同输出、点数、范围）。T3 的鹊桥节点条与 T4 的首页色块共用它。
- 滤镜 v2（`proto/paper.html` 里的 `#paper-fiber`）：低频浓淡转灰度（不偏色）+ 高频横向短纤维，`normal` 叠白。T4 直接搬这段，不要再用 v1。
- 观感调整的原因：v1 用 `soft-light` 把深色洗灰、米白块出现粉绿斑；`mix-blend-mode: multiply` 让深色互叠成近黑、窄缝变黑条，所以 `paper.css` 改为 `normal`，层叠靠 z-index 和错位。
- 坐标表 5.3 的左块 0–52% 与右块 50–100% 重叠，原型改为 0–48% / 50–100%，中间留银河窄缝。T4 沿用。
- 性能（无头 Edge，**不是目标笔记本**）：滤镜开 / 关在 1440×800、1920×1080 下均约 56–60 fps；叠加每帧改 opacity / transform 的覆盖层仍 60 fps；缩放后下一帧约 23–46 ms，开关无明显差别。结论：**当前没有证据需要启用 WebP 降级**，SCOPE 禁止项 8 不触发。
- 未解决的疑点：一次冷启动测到滤镜开 avg 71 ms、最差 6115 ms，之后 6 次冷启动未复现；另有约 3/10 次探测超时（开、关都出现）。我倾向认为是无头环境首次编译或探测脚本的问题，但没有证实。**需要在你的笔记本上用有头浏览器看一次**：打开 `http://127.0.0.1:5173/proto/paper.html`，右下角会显示 fps；再加 `?filter=off` 对比。
- `web/proto/` 是实测用的临时页，T4 完成后删除；不得进入部署。

## T2 完成情况

做了：
- `features/topbar`（left / center / right 三个槽位，子功能经 shell 传入的 `mountEntries` 挂载，不 import 其他功能）、`logo`、`nav`（按 `options.links` 生成，窄屏隐藏英文副标）、`theme-toggle`（只有 UI，`aria-disabled`，点击不切换）、`hsk-select`（6→1，写 `commands.setHsk`，窄屏只显示数字，`aria-label` 仍是 "HSK n"）、`api-badge`（读 `ports.chat.kind`，显示 `API: MOCK`）。
- 三个页面清单加入 topbar；`styles/app.css`：顶栏样式、工作台两列网格（左 25% 且 ≥320px，区域名与功能 id 对应）、窄屏规则；路由把当前路径写在 `#root[data-page]`。

验证了（本次会话实际运行）：
- `check-deps` 34 个文件通过；`node --test` 45 个全过。
- 无头 Edge 实测：A5（三页顶栏内容）、A6（主题按钮点击后 `data-theme` 不变且 `aria-disabled=true`）、A7（点 Logo 回 `#/`）、选档写入 `hskStart`（HSK 5 = 第 6 级）且不改 status / rung、切页回来高亮保持、工作台根节点是两列网格、导航点击能跳转。
- 顶栏元素两两不重叠且不出界：桌面 1440、720、400、360 宽，三页，全部通过；顶栏无带文字的伪元素；控制台无错误。截图人工看过 1440 / 400 / 360。
- 过程中发现并修复：400px 下 "HSK" 前缀与 Logo / API 标记重叠（第一版探测只查横向溢出，漏了重叠，之后改为查元素相交）。

没验证：
- 工作台网格里的真实功能：目前只有占位，两列比例和 `grid-area` 摆放要等 T3 加入功能后才能看。
- A9（从 `/app` 清单删功能）在 T2 没单独重测；T1 已验证单个功能抛错与未知 id 的行为。
- 有头浏览器、Chrome；键盘操作与读屏；`nav` 的 `aria-current`（当前配置下导航里从不包含当前页，所以实际不会出现）。

与设计的偏差（需知悉）：
- 窄屏（<720px）HSK 选档只显示数字，不显示 "HSK" 字样（空间不够，已用 `aria-label` 保留完整名称）。
- 窄屏隐藏 Logo 的 "peng" 文字和导航的英文副标。

## T1 完成情况

做了：
- `styles/tokens.css`（颜色含 dark 变量结构、字体回退链、字号、间距、时长；另加 `--muted`、`--cinnabar-text` 两个文字用色，因为 `--line` 与 `--cinnabar` 在宣纸上对比度不足 4.5:1）、`styles/base.css`（reset、细线、直角按钮、焦点环、`.sr-only`、`.feature-error`、`.toast`、`prefers-reduced-motion` 全局归零块）。
- `ui/`：`h()` / `svg()`（禁止 innerHTML 与 `javascript:` 链接）、`bilingual()`、喜鹊 symbol（`ensureSymbols()` / `magpie()`）。
- `shell/mount.js`：条目 `'id'` 或 `{id, options, slots}`；启动先整张清单校验（未知功能、缺端口）；单个功能 mount 抛错只在其容器显示错误，其余照常。
- `shell/router.js`：hash 路由、未知路由 `replaceState` 回首页、卸载只拆 DOM、更新 title、`aria-live` 播报、焦点回 `#root`、发 `route:changed` 事件。
- `pages/{home,app,team,index}.js`、`features/registry.js`，三个临时占位功能（`home-hero`、`team-grid`、`app-placeholder`）。
- `app.js` 接入路由；`error` / `unhandledrejection` 只弹一行 toast，不拆页面；启动失败整页显示错误。
- `check-deps.mjs`：放行 `registry.js` 单向 import 各功能，功能反向 import registry 仍报错；新增 `tests/check-deps.test.mjs`，8 条反向用例（兑现了之前"没有反向测试"的欠账）。

验证了（本次会话实际运行）：
- `check-deps` 28 个文件通过；`node --test` 45 个全过。
- 无头 Edge：三页渲染与标题、aria-live、焦点回 `#root`、刷新停留、后退、未知路由回首页且不污染历史、切页后 store 保留（`hskStart`）、卸载无残留、控制台无错误。
- 临时副本里：一个功能 mount 抛错只在其容器显示"功能 boom 加载失败"，另一个功能照常；清单含未注册 id 时整页显示"启动失败：页面 /app：未知功能：nope"。

没验证：
- A5–A7、A9：顶栏还没做（T2）。
- 有头浏览器、Chrome；键盘操作。
- `magpie()` / `bilingual()` 目前没有使用者，渲染效果未看。

与 PLAN 的偏差（需知悉）：
- PLAN 的 T1 写"页面先放占位"，我为让三页可验证加了三个临时占位功能；`app-placeholder` 在 T3 第一个工作台功能加入后删除，`home-hero` / `team-grid` 在 T4 / T5 替换。
- 页面清单里的 topbar 条目在 T1 未加入（它属于 T2），已在各页面文件顶部注释里写明 T2 要加的内容。

## 范围冻结（用户确认）

- P0：首页完整视觉（含 `feTurbulence` 纸张滤镜）、工作台核心演示、团队页、HSK 难词标注与短语匹配。
- P1：只留接入位置，不展示 UI，不建空壳。
- P2：不做。
- 反馈按钮：工作台只显示"没看懂"，不显示"看懂了"（用户明确选择）。`commands.understood` 保留，Demo 调用它点亮小灯。
- 时间：4 小时版本，见 PLAN.md。

## 本次按冻结范围做的代码改动

- 删除 `adapters/storage/*`、`adapters/speech/null.js`（P0 没有使用者）。`ports/index.js` 里 SpeechPort、ThemePort 只留 JSDoc 契约。
- `index.html` 去掉主题检测脚本，固定 `data-theme="light"`，头部注释标出 P1 接入位置。
- `config/app.config.js` 精简为 chat(mock) / segmenter / clock；去掉 `?mock=fail` 的 URL 入口（`app.js` 同步），mock 适配器的 `fail` 选项保留作故障注入入口。
- `data/annotation-types.json` 去掉 `grammar`（语法标注是 P1）。
- 新增 `tests/config.test.mjs`：config 里的适配器和 data 文件必须存在。
- 技术文档顶部加了冻结说明，第 12 节标为废弃。

## 验证（本次会话实际运行）

- `node scripts/check-deps.mjs`：14 个文件通过。
- `node --test`：37 个测试全过。
- 阶段 0 时在无头 Edge 里跑通过水杯主流程（HSK 3 → 三次没看懂 → 英文 → 看懂了，节点 `done,done,skipped,done`）。**这次收缩改动后没有在浏览器里复测。**

## 没验证

- 所有界面：尚不存在。
- 删除 storage / 主题脚本、去掉 URL 故障入口之后，浏览器里的启动是否仍正常。
- `Intl.Segmenter` 在 Edge / Chrome 里的切分结果；Edge 以外的浏览器。
- `check-deps.mjs` 没有反向测试（造违规文件确认会报错）。
- HSK 词表来源与授权未核实；`hsk.json` 只会是演示子集。

## 待用户决定

1. **Vercel 部署的具体操作**：托管方式已定，但部署会对外公开并需要账号授权。到 T2 完成后我再来确认：用哪个 Vercel 项目 / 团队、根目录设为 `web/`、是否用 CLI 还是 Git 集成。
2. `docs/brainstorm/` 被 `.gitignore` 排除，文档里的冻结说明不会进仓库。是否需要把设计与技术文档重新纳入版本管理，请定。
3. `.claude/settings.local.json` 有未提交改动，不是我改的，未处理。

## 注意

- git 里有你暂存的改动（`M `/`A `/`D `）和我之后的未暂存改动（` M`/`??`）混在一起。我没有暂存、提交或推送任何内容。
- 无头浏览器验证用过临时 Edge 进程与目录，已按命令行特征清理，未碰你自己的 Edge。

## 下一步（1–3 步）

1. T4 首页视觉（独立任务，不碰工作台状态机）：搬滤镜 v2 与 48/50 坐标，鹊桥 12–16 只喜鹊、微场景、朱砂小灯 / 印章 / 入口、文字层；完成后删除 `web/proto/`。
2. T5 团队页：`team-grid` + `data/team.json`（要在 `config.data` 里登记 `team`），空字段不渲染。
3. 用户在笔记本有头浏览器里点一遍工作台 Demo，反馈观感（尤其是演示按钮位置和注释卡位置）。
