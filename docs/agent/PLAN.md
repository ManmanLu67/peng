# PLAN：4 小时开发任务

范围见 `SCOPE.md`（已冻结，冲突以它为准）。测试见 `TEST.md`。
目标：一次 4 小时的冲刺，首页完整视觉与工作台核心演示都是 P0，所以按文件边界并行开发，提前部署，分阶段冻结。

## 现状（阶段 0 已完成，已提交 a59ec45）

已有且已验证：`core/`（store、bus、contract、ladder、flow、commands）、`ports/`、`adapters/`（chat/mock、clock、segmenter/intl）、`app.js`（只做启动与注入，**还没接路由**）、`scripts/serve.mjs`、`scripts/check-deps.mjs`、`data/`（rungs、nodes、annotation-types、demo）、37 个测试。

注意：`app.js` 目前只往 `#root` 写一行字。路由、页面、功能全部还不存在。

## 时间表

| 时间          | 开发                                               | 测试                  | 部署               |
| ------------- | -------------------------------------------------- | --------------------- | ------------------ |
| 0–20 min      | T1 外壳与公共层（见下）                            | 按 TEST.md 建验收清单 | 准备部署环境       |
| 20–50 min     | T2 页面与 Feature 骨架                             | 检查页面结构          | 首次预览部署       |
| 50–125 min    | T3 工作台核心（A 线）                              | 持续测已完成模块      | 监控构建           |
| 125–185 min   | T4 首页完整视觉（B 线）、T5 团队页                 | 视觉对照、功能回归    | 准备最终构建       |
| 185–215 min   | 只修阻断问题                                       | 完整浏览器测试        | 最终部署           |
| 215–240 min   | 冻结代码                                           | 线上验收              | 验证公开 URL       |

T3 和 T4 在人手允许时并行；一个人做就严格按顺序，**先 T3 后 T4**，并且 T4 的滤镜原型提前到 T2 之后用 15 分钟试一次，早暴露性能问题。

## 任务单元

每个任务只能改自己的"文件范围"。越界先停下问。"前置"没完成不得开始。

### T1　外壳与公共层（0–20 min）

- 前置：无。
- 文件范围：`web/styles/tokens.css`、`web/styles/base.css`、`web/src/shell/{router.js,mount.js}`、`web/src/ui/*`、`web/src/features/registry.js`、`web/src/pages/{home,app,team}.js`（先放占位）、`web/src/app.js`（接路由）、`web/index.html`（引入样式）。
- 内容：
  - tokens：颜色（含 `[data-theme="dark"]` 变量结构）、字体回退链（技术文档 3.3）、间距、断点变量。
  - base：reset、1 px 细线、直角按钮、`.sr-only`、焦点环 2 px 朱砂、`prefers-reduced-motion` 全局块（P1 预留入口，先留空规则位置）。
  - `ui/`：`h()` 建节点、`bilingual()` 双语标签、喜鹊 SVG symbol 注入函数。只 import core。
  - `mount.js`：按页面清单 `[{ id, options, slots }]` 挂功能，未知 id 启动即抛"未知功能：xxx"；返回卸载函数。
  - `router.js`：hash 路由、未知回首页、`unmount` 只拆 DOM、更新 `document.title`、切页焦点回 `#root`、`aria-live` 播报页面名。
  - `app.js`：注入 `ctx` 后调 `mountRouter`；全局 `error`/`unhandledrejection` 兜底（SCOPE 的"不白屏"）。
- 验收：三个占位页能互跳、刷新停留、后退可用；`check-deps` 与 `node --test` 通过。
- 产出可验证：浏览器打开 `/#/app` 刷新仍在 `/#/app`。

### T2　页面与 Feature 骨架（20–50 min）

- 前置：T1。
- 文件范围：`web/src/pages/*.js`、`web/src/features/{topbar,nav,logo,theme-toggle,hsk-select,api-badge}/`、`web/styles/app.css`（只放页面网格）。
- 内容：
  - `topbar`：left / center / right 三个槽位容器；`logo`（印章"朋" + peng，点击回 `#/`）；`nav`（按 options 生成链接）；`theme-toggle`（只有按钮 UI，点击无效果，`aria-disabled`，留 P1 注释）；`hsk-select`（分段控件 6→1，写 `commands.setHsk`，当前档朱砂短下划线）；`api-badge`（读 `ports.chat.kind`，显示 `API: MOCK`）。
  - 页面清单（`pages/*.js` 只导出 `{ title, features }`）：
    - `/`：topbar（right: nav→/team、theme-toggle）+ `home-hero`（先占位）
    - `/app`：topbar（left: logo、demo；center: hsk-select；right: api-badge、theme-toggle）+ chat、bridge、compare、ladder-bar、actions。demo 放在顶栏 Logo 右侧，显示倒计时时不遮挡主体文字。
    - `/team`：topbar（center: nav→/、/app；right: theme-toggle）+ `team-grid`（先占位）
  - `app.css`：工作台网格区域名与功能 id 对应（`grid-area: bridge` 等），左栏 25%（≥320 px）。
- 验收：三页顶栏各自正确；HSK 选档能改 `store.hskStart`（控制台 `__peng.store.get().hskStart`）；从 `/app` 清单删掉任意功能，页面仍启动。
- 产出可验证：首次预览部署。

### T3　工作台核心（50–125 min，A 线）

- 前置：T2。
- 文件范围：`web/src/features/{chat,bridge,compare,ladder-bar,actions,demo}/`、`web/src/core/annotate.js`、`web/data/{hsk,glosses}.json`、`web/styles/app.css`（工作台部分）、`web/tests/annotate.test.mjs`、`web/config/app.config.js`（`data` 数组加条目）。
- 子任务按顺序，每个都能在浏览器验证：

| 序 | 内容                                                                                                                         | 可验证成果                                                         |
| -- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 3a | `chat`：用户消息、解读卡、3 个示例按钮（带语境）、下划线输入框、朱砂发送图标；空输入禁用；运行中禁用                          | 点示例 → 提交 → store 进入 running → result                        |
| 3b | `compare`：原文 \| 改写并排；第 8 级显示"原文（未改写）"；英文档主显；非末档英文折叠；`culture_note` 缺失则隐藏；`mock_placeholder` 时显示"模拟数据" | 水杯例句 HSK 3 结果与逻辑文档第 2 节一致                           |
| 3c | `ladder-bar`：8 级纵向条，当前档朱砂；**只展示，不绑点击**；档位来自 `rungs.json`                                              | 提交后当前档高亮，降档后移动                                       |
| 3d | `bridge`：SVG 两块靛蓝多边形（`tornEdge` 固定 seed，放 `core/geometry.js`）、贯穿线、4 节点、5 状态；节点序号与标签读 `nodes.json`；小灯；第 4 只喜鹊 | 提交时 01 亮；没看懂时 01→02→03；看懂后 03 虚线、04 亮、小灯亮     |
| 3e | `actions`：**只渲染"没看懂 · Didn't understand"**（朱砂框），按 `ladder.availability` 启用/禁用；到英文档禁用                  | 连点三次到英文后按钮禁用                                           |
| 3f | `annotate` + 词表：`core/annotate.js`（分词器由 `segmenter` 端口注入）、预置短语最长匹配（`glosses.json`）、HSK 词表匹配（`hsk.json`）、取等级最高前 3、超纲词优先；`compare` 渲染三种线型 `<mark>` 与注释卡（拼音、中文释义、English gloss）。`hsk.json` 先覆盖演示句所需词，词表来源待队友核实，**页脚注明"词表为演示子集"** | `node --test` 里 annotate 单测通过；浏览器里"香炉""紫烟"被整体标注 |
| 3g | `demo`：脚本经 `ports.clock` 调度：输入"日照香炉生紫烟" → 提交 → 没看懂 ×3（HSK 3→2→1→英文）→ 看懂了 → 小灯亮；演示中禁用输入与按钮，显示"演示中 · Demo"与退出；退出清定时器并 `reset`；离开 `#/app` 自动退出 | 断网跑完约 15 s；中途退出回 idle                                    |

- 约束：Feature 之间不 import；写状态只经 `ctx.commands`；`compare` 只用 `textContent`；`Mock 数据标识` 来自响应的 `mock_placeholder` 与 `api-badge`，不在组件里硬编码。
- P1 预留（只留注释位置，不建空文件）：`bridge` 的节点详情、`compare` 的连线、`annotate` 的 `grammar` 参数位。

### T4　首页完整视觉（125–185 min，B 线，独立任务）

- 前置：T2（需要路由与 topbar）。**不依赖 T3**，可与 T3 并行。
- 文件范围：`web/src/features/home-hero/`、`web/styles/paper.css`、`web/src/core/geometry.js`（如 T3 已建则只引用，不改）、`web/assets/svg/*`。
- 禁止修改：`core/flow.js`、`core/commands.js`、任何工作台 feature。
- 内容（按 4.2–4.4 的设计简报）：
  1. 色块与层次：靛蓝左右块 + 窄缝、青蓝块、米白穿插块、赭石压角，按技术文档 5.3 的坐标表（起点值，调到 400 px 宽仍可辨）。
  2. `tornEdge` 生成 `clip-path`，固定 seed。
  3. **纸张 SVG 滤镜**：`feTurbulence` 低频（大尺度浓淡）+ 高频（横向纤维），按技术文档 5.1 的参数起步；哑光、不加投影；撕纸边外扩 3–6 px 浅色纤维带。
  4. 鹊桥：12–16 只喜鹊剪纸沿下垂曲线排列，`data-i` 序号。
  5. 微场景：人物（侧身仰头约 25°）、水杯、小石头、喜鹊，占画面 2%–5%。
  6. 朱砂：桥中央小灯、印章 Logo、"开始"印章按钮，总面积 1%–3%。
  7. 文字：主标题（系统宋体，加大字号行距）、英文副标、`01–04` 序号、竖排 `鹊桥 · Queqiao`、底部小字；靛蓝块上文字对比度 ≥ 4.5:1。
  8. 入口：点击"开始"或桥 → `#/app`。
  9. P1 预留：墨渍入场动画只留样式入口类与一个启动函数位置，**不做动画**，元素静态全显。
- 降级预案：若在目标笔记本实测卡顿，把纸块预渲染为 WebP（`assets/paper/*.webp`）。**只有实测出现明显性能问题才启用**，启用前记录实测帧率或观感问题。
- 验收：视口缩到 400×250 截图，靛蓝大形可辨；朱砂面积目测 ≤ 3%；点击入口进入工作台。

### T5　团队页（与 T4 并行或紧随，约 15 min）

- 前置：T2。
- 文件范围：`web/src/features/team-grid/`、`web/data/team.json`、`web/config/app.config.js`（`data` 加 `team`）。
- 内容：读 `team.json`；4 张卡错位排布（第 n 张 `margin-top: (n%2)*56px`）；大号序号、印章头像（姓氏单字）、姓名、职责（中英）、一句话；空字段不渲染；`name` 为空显示"姓名待填 · Name TBD"；外链只在卡片里留扩展位置，不渲染。
- 验收：字段缺失不出现 `undefined`；窄屏单列。

### T6　收尾（185–240 min）

- 185–215：只修阻断问题（页面白屏、主流程走不通、控制台报错、部署失败）。不加功能，不调视觉细节。
- 215–240：冻结代码；`flags.debug` 改 `false`；最终部署；线上验收；更新 `CURRENT_STATE.md`。

## 依赖关系

```
T1 ──► T2 ──┬──► T3 (a→b→c→d→e→f→g) ──┐
            ├──► T4 ───────────────────┼──► T6
            └──► T5 ───────────────────┘
```

可并行：T3 ∥ T4 ∥ T5（文件范围互不重叠，唯一共享点是 `app.config.js` 的 `data` 数组和 `app.css`，各自只追加自己的部分）。
必须等待：T2 之前不开工 T3/T4/T5；3a 之前不做 3b–3g；3d 与 3g 都依赖 `commands` 已有的状态，**不得为了它们修改 `core/flow.js`**，需要时先问。

## 冲突检查

- `web/styles/app.css`：T2 建网格，T3 追加工作台样式。T4 只改 `paper.css`。
- `web/config/app.config.js`：T3、T5 只往 `data` 数组各加一项，合并时注意不要互相覆盖。
- `web/src/core/geometry.js`：由先用到的人创建（3d 或 T4），另一方只 import。
- `web/src/features/registry.js`：每建一个 feature 就登记一行，T1 建空表。

## 风险

| 风险                                   | 应对                                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 纸张滤镜成为时间瓶颈 / 掉帧            | T2 后先做 15 min 滤镜原型实测；有问题再启用 WebP 降级；仍需在 SCOPE 禁止项下保持视觉要求                    |
| T3 超时                                | 保 3a–3e 与 3g（演示必须能跑），3f 的标注再做不完就只保短语匹配 + 注释卡，等级识别补到后面                  |
| HSK 词表来源 / 授权未核实              | 先用演示子集，页脚注明；队友核实后替换 `hsk.json`，代码不动                                                |
| `Intl.Segmenter` 在浏览器与 Node 切分不同 | 演示句靠预置短语匹配，不依赖分词结果；3f 在浏览器里实际看一次                                              |
| 系统宋体观感偏弱                       | 加大字号与行距，不换字体                                                                                    |
| 部署：路径或 MIME 问题                 | 零构建静态站，托管 `web/` 目录即可；`hash` 路由不需要服务端配置。首次预览部署在 T2 后就做，不等到最后       |
| 并行时文件冲突                         | 严格按"文件范围"开发；越界先问                                                                              |

## 每个任务结束时必须做

1. `cd web && node scripts/check-deps.mjs && node --test`
2. 浏览器里按该任务的"可验证成果"实际点一遍，记录结果
3. 更新 `docs/agent/CURRENT_STATE.md`：改了什么、验证了什么、没验证什么、下一步
