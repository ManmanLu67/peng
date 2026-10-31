# CURRENT_STATE

读取顺序：先看本文，再看 `SCOPE.md`（范围，已冻结）、`PLAN.md`（任务）、`TEST.md`（验收）。
`docs/brainstorm/` 里的设计与技术文档是背景资料，已被 `.gitignore` 排除，冲突以 SCOPE 为准。

## 当前阶段

范围已冻结，阶段 0（骨架）完成并已提交（a59ec45）。冻结后的收缩改动和三份执行材料**尚未提交**。
下一步是 PLAN.md 的 T1（外壳与公共层）。界面还一行都没写，`app.js` 只往 `#root` 写一行字。

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

1. **部署目标**：PLAN / TEST 里有"公开 URL"。此前约定路演在这台笔记本上本地跑，公开部署是对外发布，未经同意我不会部署。需要定托管方式（GitHub Pages / Netlify / Vercel / 其他）和谁来操作。
2. `docs/brainstorm/` 被 `.gitignore` 排除，文档里的冻结说明不会进仓库。是否需要把设计与技术文档重新纳入版本管理，请定。
3. `.claude/settings.local.json` 有未提交改动，不是我改的，未处理。

## 注意

- git 里有你暂存的改动（`M `/`A `/`D `）和我之后的未暂存改动（` M`/`??`）混在一起。我没有暂存、提交或推送任何内容。
- 无头浏览器验证用过临时 Edge 进程与目录，已按命令行特征清理，未碰你自己的 Edge。

## 下一步（1–3 步）

1. 你确认"部署目标"后，开始 T1；T1 完成后立刻做首次预览部署前的本地冒烟。
2. T2 之后先做 15 分钟的纸张滤镜原型，实测性能，再进入 T3 / T4。
3. 每个任务结束按 PLAN.md 末尾三步更新本文件与 TEST.md 的结果记录。
