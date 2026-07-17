# Financial Tool 财务工具箱

面向财务、审计和办公自动化场景的 Windows 桌面工具。当前包含 Excel 单元格定向汇总、本地截图 OCR、图片文字识别，以及从红蓝框标注的 Excel 截图生成取数规则。

仓库名继续使用 `ExcelCellSummaryTool`，用户方案目录保持不变，便于从旧版本平滑升级。

## 主要功能

- 批量读取目标文件夹中的 Excel 文件，按规则定位指定 Sheet 与单元格并输出汇总工作簿。
- 支持 `exact`、`contains`、`index` 三种 Sheet 定位模式和多 Sheet 命中时的人工选择。
- 支持规则编辑、拖动排序、方案保存、实时进度和日志。
- 集成 Umi-OCR Rapid v2.1.5，可一键截图识字并复制到剪贴板。
- 支持 PNG、JPG、BMP、WEBP、TIFF 图片 OCR。
- 支持红框标注输出列名、蓝框标注数据单元格，自动定位 Excel 行列坐标并生成候选规则。
- 图片规则在追加前可以编辑；Sheet 模式和 Sheet 值由用户人工填写。

## 技术栈

- Tauri 2
- React 19 + TypeScript
- Rust
- calamine + rust_xlsxwriter
- Umi-OCR Rapid 2.1.5
- NSIS（由 Tauri bundler 生成安装包）

## 下载与使用

从 GitHub Releases 下载最新版：

- 安装版：`ExcelCellSummaryTool-v0.2.0-win64-setup.exe`
- 免安装版：`ExcelCellSummaryTool-v0.2.0-win64-portable.zip`

安装版直接运行安装程序。免安装版必须先完整解压，再运行 `ExcelCellSummaryTool.exe`；不要只从压缩包中单独取出 exe，因为 OCR 需要同目录的 `umi-ocr` 运行文件。

### Excel 汇总

1. 在“数据源配置”选择目标文件夹和输出 `.xlsx` 文件。
2. 按需填写文件名关键词和包含/排除模式。
3. 在“规则配置”填写输出列名、Sheet 模式、Sheet 值和单元格。
4. 在“执行与日志”点击“开始汇总”。

### 截图识字

1. 进入“截图识字”。
2. 点击“截图并复制”，框选屏幕区域。
3. 识别完成后直接在目标软件中粘贴文字。

### 从标注截图生成规则

1. 对 Excel 截图使用红色矩形框标注需要作为输出列名的表头或项目名称。
2. 使用蓝色矩形框标注同一行需要读取的数据单元格；截图必须保留 Excel 行号和列字母。
3. 在“规则配置”点击“图片生成规则”，选择截图。
4. 人工填写 Sheet 模式和 Sheet 值，核对候选输出列名与单元格坐标后追加。

## 文件支持与限制

- 汇总支持 `.xlsx`、`.xlsm`、`.xltx`、`.xltm`。
- 只扫描目标目录本层，自动跳过 Excel 临时文件。
- 公式单元格读取工作簿已保存的缓存值，本工具不负责重新计算公式。
- 图片规则功能只定位输出列名和单元格坐标，不从截图推断 Sheet 名。
- 红蓝框识别依赖清晰、近似纯色的矩形边框；导入后必须人工核对结果。

## 用户数据

- 汇总方案：`%APPDATA%\ExcelCellSummaryTool\schemes.json`
- OCR 运行设置：`%LOCALAPPDATA%\ExcelCellSummaryTool\ocr-runtime\UmiOCR-data`

安装版和 portable 版共用上述用户目录。更新或替换 portable 主程序不会删除历史方案和 OCR 设置。

OCR 服务只监听 `127.0.0.1`，图片识别请求不会发送到外部服务器。发布包不会包含开发机方案、OCR 设置、日志或测试工作簿。

## 源码运行

```powershell
npm install
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup_umi_ocr.ps1
npm run tauri:dev
```

`setup_umi_ocr.ps1` 会下载官方 Umi-OCR Rapid 包并验证固定 SHA-256，然后把运行时放入被 Git 忽略的 `third_party\umi-ocr\runtime`。

## 本地验证

```powershell
npm test -- --run
npm run build
Set-Location .\src-tauri
& "$env:USERPROFILE\.cargo\bin\cargo.exe" test
```

## 本地打包

```powershell
.\build.bat
```

产物：

- `release\portable\ExcelCellSummaryTool\ExcelCellSummaryTool.exe`
- `release\portable\ExcelCellSummaryTool\umi-ocr\Umi-OCR.exe`
- `release\ExcelCellSummaryTool-v0.2.0-win64-portable.zip`
- `release\ExcelCellSummaryTool-v0.2.0-win64-setup.exe`
- `release\SHA256SUMS.txt`

打包结束会运行 `scripts\audit_release.ps1`，核对 portable 与压缩包文件白名单，并扫描令牌、私钥、本机路径、用户配置和日志。

## 开源许可

本项目使用 MIT License。Umi-OCR 及其组件的许可与来源见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
