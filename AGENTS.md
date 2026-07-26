# FADT 项目代理说明

本文件适用于在仓库根目录工作的 Oh My Pi、Codex 及其他编码代理。开始修改前，先阅读 [README.md](README.md)、[CONTEXT.md](CONTEXT.md) 和 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。

## 项目身份

- 项目名：FADT（Financial Audit Data Toolkit）。
- 仓库：`Yon9e/FADT`。
- 产品名和主程序：`FADT`、`FADT.exe`。
- 当前架构：Windows 桌面应用，Tauri 2 + Vue 3 + TypeScript + Rust。
- 不要把项目改回 React，也不要把它当成纯浏览器应用。
- `ExcelCellSummaryTool` 只允许出现在旧版用户数据迁移、旧安装升级、兼容性测试和明确标注的历史资料中；不要据此恢复旧产品名。
- `com.yon9e.excel-cell-summary-tool` 是已发布应用的兼容标识。没有迁移方案和用户批准，不得修改。

## 开始工作前

1. 确认当前目录是 FADT 仓库根目录。不要继续使用旧的 `ExcelCellSummaryTool` 本地路径。
2. 运行 `git status --short`，保留用户已有的未提交修改；禁止使用 `git reset --hard`、`git checkout --` 或覆盖无关文件。
3. 先搜索再修改。优先使用 `rg`，并排除 `node_modules`、`dist`、`release`、`src-tauri/target`、OCR runtime 和下载缓存。
4. `docs/superpowers` 是设计和实施过程记录，可能包含已被替代的方案。当前行为以源码、测试、`CONTEXT.md` 和本文件为准。

## 架构边界

- `src/`：Vue 3 前端、交互逻辑和 Vitest 测试。
- `src/App.vue`：主窗口和汇总工作流编排。
- `src/SourcePickerModal.vue`：混合数据源选择器。
- `src/RuleImageImporter.vue`：截图 OCR、表格重建和规则生成交互。
- `src-tauri/src/`：Tauri 命令、文件扫描、Excel 汇总、OCR、方案存储和数据迁移。
- `src-tauri/src/lib.rs`：Tauri 命令注册与前后端边界。
- `scripts/`：OCR 准备、portable/安装包生成和发布审计。
- `third_party/umi-ocr/runtime/`：本地 OCR 运行时，由脚本准备，不提交到 Git。

前端不得绕过 Tauri 命令直接假设本机文件系统可用。耗时文件扫描、Excel 和 OCR 操作应留在 Rust 后端或 Worker 中，避免阻塞 Vue 主线程。

## 必须保持的产品语义

- 数据源使用“混合数据源选择器”：同一窗口可勾选多个 Excel 文件和文件夹。
- 单击或拖动用于选择；双击文件夹必须进入文件夹内部，不能等同于勾选。
- 已选文件夹在汇总时递归扫描全部子文件夹；支持 `.xlsx`、`.xlsm`、`.xltx`、`.xltm`，跳过 Excel 临时文件。
- 应用数据源前必须预检重复源文件，并由用户决定去重、保留重复或返回修改。
- OCR 识别表格的坐标和“目标数据”只读；只有“输出列名”文本可以在用户确认后修改。
- 浏览器预览只用于界面和纯前端逻辑检查。本机文件选择、Excel 汇总、剪贴板、截图和 OCR 必须在 Tauri 桌面应用中复验。
- 用户数据目录和旧版迁移规则见 `README.md`；不得删除旧目录或覆盖已有 FADT 设置。

领域词汇以 `CONTEXT.md` 为准。新增需求改变这些语义时，应先同步更新词汇表、测试和开发说明。

## 开发命令

PowerShell 中从仓库根目录执行：

```powershell
npm ci
npm run typecheck
npm test -- --run
npm run build
& "$env:USERPROFILE\.cargo\bin\cargo.exe" fmt --manifest-path .\src-tauri\Cargo.toml -- --check
& "$env:USERPROFILE\.cargo\bin\cargo.exe" clippy --manifest-path .\src-tauri\Cargo.toml --locked --all-targets -- -D warnings
& "$env:USERPROFILE\.cargo\bin\cargo.exe" test --manifest-path .\src-tauri\Cargo.toml --locked
```

首次运行 OCR 或 runtime 缺失时才执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup_umi_ocr.ps1
```

桌面联调：

```powershell
npm run tauri:dev
```

若 Cargo 已在 `PATH` 中，可以使用 `cargo`；否则使用上述用户目录中的明确路径。不要因为本机 `PATH` 未配置而改写项目脚本或降低验证范围。

Rust 工具链由根目录 `rust-toolchain.toml` 锁定；升级前先在本地完成全部前端、Rust 和桌面验证，再同步 CI。

## 修改与测试要求

- Bug 修复先添加或收紧能复现问题的测试，再修改实现。
- Vue/TypeScript 变更至少运行 `npm run typecheck` 和相关 Vitest；跨模块或交付前运行全部 `npm test -- --run` 与 `npm run build`。
- Rust 变更至少运行目标模块测试；跨前后端契约、文件扫描、Excel、OCR 或发布变更时运行完整 Cargo 测试。
- Tauri command 的参数名和前端 `invoke` 参数必须同步修改。
- 文件扫描、路径规范化和去重必须覆盖 Windows 大小写、分隔符、不可访问路径及临时文件。
- UI 变更要检查 1280×820 默认窗口和 900×620 最小窗口；不得以放大字体或固定宽度造成挤压、重叠。
- 修复完成前不要声称已发布；未经用户明确要求不得创建 GitHub Release。

## 打包与发布

`build.bat` 会清理 `dist` 和 `release`、准备 OCR runtime、构建、测试并重新生成发布产物。它是有副作用且耗时的命令，只在用户明确要求重新打包或发布时执行。

版本号目前分布在以下位置，发布升级时必须同步：

- `package.json` 和 `package-lock.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `build.bat`
- `scripts/make_release.ps1`、`scripts/audit_release.ps1` 的默认版本
- `README.md` 的示例产物名

发布前必须核对：

1. 前端类型检查、全部 Vitest、前端构建和 Cargo 测试通过。
2. portable 中存在 `FADT.exe`、完整 `umi-ocr`、许可文件和第三方声明。
3. `scripts/audit_release.ps1` 通过，SHA-256 与实际产物一致。
4. 产物不包含用户方案、OCR 设置、日志、测试工作簿、本机绝对路径、令牌或私钥。
5. 只有用户明确批准后才提交、推送或更新 GitHub Release。

## 数据、安全和仓库卫生

- 不得提交真实审计底稿、Excel 数据、截图、用户目录、日志、OCR runtime、构建产物或下载缓存。
- 不得在仓库、交接文档、终端记录或提交信息中写入 MCP key、访问令牌、密码或私钥。
- 发布物和日志必须继续接受 `scripts/audit_release.ps1` 的敏感信息扫描。
- 不要批量重命名或删除 `ExcelCellSummaryTool` 兼容引用；逐项判断其是否属于旧版迁移契约。
- 不要修改 `release/` 作为源代码修复方式；先改源码并验证，再按授权重新打包。

## 完成交付

最终说明应包含：

- 修改的文件和行为；
- 实际执行的验证命令及结果；
- 未执行的桌面、OCR、Excel 或发布验证；
- 仍存在的风险和建议下一步。

不提交、不推送、不发布，除非用户在当前任务中明确授权。
