# CURRENT_STATE

读取顺序：先看本文，再看 `SCOPE.md`（范围，已冻结）、`PLAN.md`（任务）、`TEST.md`（验收）。
`docs/brainstorm/` 里的设计与技术文档是背景资料，已被 `.gitignore` 排除，冲突以 SCOPE 为准。

## 当前阶段

范围已冻结。阶段 0（骨架）已提交；冻结后的收缩改动与 SCOPE / PLAN / TEST 已由用户提交。
**T1（外壳与公共层）完成，未提交。** 下一步是 T2（页面与 Feature 骨架）。
托管方式已定为 Vercel；**还没部署**，部署是对外发布且需要登录账号，T2 完成并本地验证后再单独确认。

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

1. 做 T2：topbar 三槽位、logo、nav、theme-toggle（只有 UI）、hsk-select、api-badge，页面清单加入 topbar，`app.css` 工作台网格。
2. T2 之后先做 15 分钟的纸张滤镜原型，实测性能，再进入 T3 / T4。
3. T2 本地验证通过后，向用户确认 Vercel 部署（需要登录与授权，不擅自执行）。
