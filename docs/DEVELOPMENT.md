# FADT 开发与接手指南

本文是 FADT 的持续开发入口，供维护者和编码代理使用。用户功能和安装说明见仓库根目录的 `README.md`，领域术语见 `CONTEXT.md`，代理约束见 `AGENTS.md`。

## 1. 项目定位

FADT 是面向财务与审计人员的 Windows 桌面数据处理工具。应用在本机读取 Excel、调用本地 Umi-OCR、访问剪贴板和文件系统，不上传工作簿或图片。

当前发布版本为 `0.3.0`。产品名、仓库名和主程序均已统一为 FADT；旧名 `ExcelCellSummaryTool` 仍用于兼容旧版用户数据和安装升级。

## 2. 技术与目录

| 区域 | 技术/职责 | 主要入口 |
| --- | --- | --- |
| 前端 | Vue 3、TypeScript、Pinia、Element Plus、Vite | `src/main.ts`、`src/App.vue` |
| 桌面桥接 | Tauri 2 command 与窗口生命周期 | `src-tauri/src/lib.rs` |
| Excel | calamine 读取、rust_xlsxwriter 写入 | `src-tauri/src/excel_summary.rs` |
| 数据源 | 文件/文件夹混选、递归扫描、去重预检 | `src/SourcePickerModal.vue`、`src-tauri/src/source_picker.rs`、`src-tauri/src/file_filter.rs` |
| OCR | 截图、图片识别、本地服务与设置 | `src/OcrPage.vue`、`src/RuleImageImporter.vue`、`src-tauri/src/ocr.rs` |
| 方案 | 方案 JSON 保存和旧版迁移 | `src-tauri/src/scheme_store.rs`、`src-tauri/src/data_migration.rs` |
| 发布 | runtime 准备、portable/NSIS、审计 | `build.bat`、`scripts/` |

### 关键前端模块

- `App.vue`：页面导航、汇总方案、数据源、规则和执行日志。
- `SourcePickerModal.vue`：内置资源管理器式混合选择器。双击文件夹负责导航，勾选/单击/拖动负责选择。
- `RuleImageImporter.vue`：截图预览缩放和平移、OCR 表格选择、候选规则编辑。
- `SettingsPage.vue`、`stores/motion.ts`：界面动效偏好、系统减少动态效果与会话级性能降级。
- `components/AppSidebar.vue`、`components/HighDensityShell.vue`：A 型主工作台与 C 型高密度工作区外壳。
- `types.ts`：前后端共享数据形状的 TypeScript 定义。
- 与组件并列的 `*.test.ts`：交互状态和纯逻辑单元测试。

### 关键 Rust 模块

- `lib.rs`：所有 `#[tauri::command]` 注册。新增命令必须同时更新 `generate_handler!`。
- `models.rs`：请求、规则、进度和结果模型。
- `file_filter.rs`：支持的扩展名、递归展开、重复预检。
- `source_picker.rs`：目录列举、快速访问、常用位置和磁盘。
- `excel_summary.rs`：Sheet 匹配、单元格读取、冲突处理和输出工作簿。
- `ocr.rs`：Umi-OCR runtime、设置、服务、截图与图片载荷。

## 3. 环境要求

- Windows 10/11 x64。
- Node.js：`package.json` 要求 `20.19+` 或 `22.12+`，CI 使用已验证的 Node 24。
- npm：使用仓库中的 `package-lock.json`，干净环境优先 `npm ci`。
- Rust：根目录 `rust-toolchain.toml` 固定 `1.96.1`；`Cargo.toml` 的 `rust-version` 记录 crate 最低语义要求。
- Tauri Windows 前置条件：Microsoft C++ Build Tools、Windows SDK、WebView2 Runtime。
- OCR：由 `scripts/setup_umi_ocr.ps1` 下载固定版本并验证 SHA-256。

`.github/workflows/ci.yml` 在 Windows runner 上执行依赖安装、类型检查、全部 Vitest、前端构建、Rust 格式检查、Clippy 严格检查和锁定依赖的 Cargo 测试。CI 不代替 Tauri 桌面交互、真实 Excel、OCR 和发布包人工复验。

### Oh My Pi 接手

从 FADT 仓库根目录启动 Oh My Pi。根目录的 `AGENTS.md` 是项目级代理规则，`CONTEXT.md` 提供领域词汇。

仓库暂不提交 `.omp/config.yml`：当前没有必须共享的模型、provider 或审批策略，这些应由接手机器的全局配置决定。未来若确需项目级 Oh My Pi 配置，只保存可公开的行为设置，不得写入 API key、MCP key、token 或本机凭据；并确保 Oh My Pi 的进程工作目录就是仓库根目录。

Oh My Pi 能读取现有 Codex/AGENTS 格式，不需要把规则转换成另一套私有格式。

## 4. 初始化与运行

```powershell
Set-Location -LiteralPath '<FADT 仓库路径>'
npm ci
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup_umi_ocr.ps1
npm run tauri:dev
```

仓库路径只是本机示例，代码和脚本不得硬编码该路径。

只检查页面布局时可运行 `npm run dev`。浏览器预览无法验证 Tauri 文件系统、Windows 快速访问、剪贴板、截图、OCR 或 Excel 汇总；涉及这些功能必须运行 `npm run tauri:dev`。

## 5. 开发门禁

### 前端

```powershell
npm run typecheck
npm test -- --run
npm run build
```

开发时可以限定测试文件，例如：

```powershell
npm test -- --run src\SourcePickerModal.test.ts
```

### Rust

```powershell
& "$env:USERPROFILE\.cargo\bin\cargo.exe" fmt --manifest-path .\src-tauri\Cargo.toml -- --check
& "$env:USERPROFILE\.cargo\bin\cargo.exe" clippy --manifest-path .\src-tauri\Cargo.toml --locked --all-targets -- -D warnings
& "$env:USERPROFILE\.cargo\bin\cargo.exe" test --manifest-path .\src-tauri\Cargo.toml --locked
```

若修改文件递归、Excel、OCR、剪贴板或窗口行为，除自动化测试外还要在 Tauri 桌面应用中用最小样本复验。真实 Excel 最终复验应确认输出可正常打开且不会触发 Excel 修复提示。

### UI 回归

至少检查：

- 1280×820 默认窗口；
- 900×620 最小窗口；
- 页面滚动、弹窗可用区域和焦点；
- 规则拖动和多选互不冲突；
- 输入框、下拉框和复选框不会误触发行选择；
- 自定义数据源选择器中双击文件夹只导航，选择状态由勾选/单击/拖动控制。

## 6. 主要数据流

### Excel 汇总

1. 前端混合选择 Excel 文件和文件夹。
2. Rust 对文件夹递归展开，过滤支持的扩展名和临时文件。
3. 应用选择前预检规范化后的重复文件和不可访问源。
4. 用户确认去重策略后生成汇总请求。
5. Rust 匹配 Sheet、读取缓存值并生成输出工作簿。
6. 前端接收进度事件，显示预计时间、日志和结果。

### 截图生成规则

1. 添加图片或读取剪贴板。
2. 本地 OCR 识别截图，前端重建只读坐标表格。
3. 用户选择输出列名和目标数据；拖选对既有选择执行切换。
4. 只有输出列名文本允许在确认后修正，坐标和目标数据不可修改。
5. 用户补充 Sheet 模式和值，再追加到主规则列表。

## 7. 用户数据和兼容标识

当前数据目录：

- `%APPDATA%\FADT\schemes.json`
- `%LOCALAPPDATA%\FADT\ocr-runtime\UmiOCR-data`

首次启动在新目录不存在时，会从旧版 `ExcelCellSummaryTool` 目录复制历史方案和 OCR 设置。旧目录必须保留，已有 FADT 设置不得覆盖。

以下旧名引用通常是有意兼容，不应机械替换：

- `src-tauri/src/app_identity.rs` 中的旧数据目录常量；
- `scheme_store.rs`、`ocr.rs` 的迁移路径；
- `tauri.conf.json` 的已发布 identifier；
- 验证上述契约的测试；
- README 中明确标注的旧版发布文件名。

`design-qa.md` 中的旧截图文件名属于历史设计记录，可在后续整理素材时迁移，但不影响运行时身份。

## 8. 打包与发布

完整本地打包：

```powershell
.\build.bat
```

该脚本会删除并重建 `dist` 和 `release`，下载/准备 OCR runtime，运行前端构建、Cargo 测试、Tauri NSIS 构建、portable 组装和发布审计。不要把它当作普通编译命令。

主要产物：

- `release\portable\FADT\FADT.exe`
- `release\FADT-v<版本>-win64-portable.zip`
- `release\FADT-v<版本>-win64-setup.exe`
- `release\SHA256SUMS.txt`

结构快速检查可使用 `scripts/audit_release.ps1 -StructureOnly`；正式交付必须执行完整审计。发布版本号目前有多个维护点，详见 `AGENTS.md` 的发布清单。

## 9. 文档优先级

遇到冲突时按以下顺序判断：

1. 用户当前明确批准的需求；
2. 当前源码和通过的测试；
3. `AGENTS.md`、`CONTEXT.md`、本文；
4. `README.md`；
5. `docs/superpowers` 和 `design-qa.md` 等历史记录。

历史文档用于解释决策过程，不是自动恢复旧实现的依据。特别是 2026-07-23 的“原生数据源选择”方案已经被后续需求替代；当前实现是 FADT 内置的混合数据源选择器。

## 10. 接手检查清单

开始：

- 确认在仓库根目录启动代理；
- 阅读 `git status --short`，不要覆盖现有修改；
- 核对 Node、npm、rustc、cargo 版本；
- 确认 OCR runtime 是否已准备；
- 先运行现有测试建立基线。

完成：

- 只改需求范围内的文件；
- 更新相关测试和领域词汇；
- 运行前端、Rust 和必要的桌面复验；
- 记录未验证项目；
- 未经授权不打包、不提交、不推送、不发布。
