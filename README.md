# Financial Tool 财务工具箱

面向财务、审计和办公自动化场景的 Windows 桌面工具。当前包含 Excel 单元格定向汇总、本地截图 OCR、图片文字识别，以及从 Excel 截图选择单元格生成取数规则。

仓库名继续使用 `ExcelCellSummaryTool`，用户方案目录保持不变，便于从旧版本平滑升级。

## 主要功能

- 批量读取目标文件夹中的 Excel 文件，按规则定位指定 Sheet 与单元格并输出汇总工作簿。
- 支持 `exact`、`contains`、`index` 三种 Sheet 定位模式和多 Sheet 命中时的人工选择。
- 支持规则编辑、拖动排序、方案保存、实时进度和日志。
- 集成 Umi-OCR Rapid v2.1.5，可一键截图识字并复制到剪贴板。
- 支持 PNG、JPG、BMP、WEBP、TIFF 图片 OCR。
- 支持识别截图中的可见 Excel 单元格，由用户点击或拖动选择输出列名和目标数据并生成候选规则。
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

- 安装版：`ExcelCellSummaryTool-v0.2.2-win64-setup.exe`
- 免安装版：`ExcelCellSummaryTool-v0.2.2-win64-portable.zip`

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

### 从 Excel 截图生成规则

1. 截取需要定位的 Excel 区域，并保留顶部列字母和左侧行号。
2. 在“规则配置”点击“图片生成规则”，可一次添加多张图片，也可继续读取剪贴板追加截图；点击缩略图可切换当前截图。
3. 每张图片只会加载预览，不会自动识别。选择当前截图后点击“识别图片”重建可选单元格表格；点击单元格可选择或取消，拖动可选择连续区域。
   识别表格会按截图中的列字母动态生成全部可见列，不限于示例中的前三列；列数较多时可横向滚动。
4. 每个 Excel 行只能选择一个输出列名单元格，但可以选择多个目标数据单元格。若同一行选择多个目标数据，请为不同数据列填写互不相同的后缀，再按行配对填充候选规则；列名和坐标也可单独填入。
5. 人工填写 Sheet 模式和 Sheet 值，核对候选规则后追加。

## 文件支持与限制

- 汇总支持 `.xlsx`、`.xlsm`、`.xltx`、`.xltm`。
- 只扫描目标目录本层，自动跳过 Excel 临时文件。
- 公式单元格读取工作簿已保存的缓存值，本工具不负责重新计算公式。
- 图片规则功能只定位输出列名和单元格坐标，不从截图推断 Sheet 名。
- 截图必须保留 Excel 行号和列字母，页面缩放过小时可能降低 OCR 识别率；导入前必须人工核对结果。

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
- `release\ExcelCellSummaryTool-v0.2.2-win64-portable.zip`
- `release\ExcelCellSummaryTool-v0.2.2-win64-setup.exe`
- `release\SHA256SUMS.txt`

打包结束会运行 `scripts\audit_release.ps1`，核对 portable 与压缩包文件白名单，并扫描令牌、私钥、本机路径、用户配置和日志。

## 开源许可

Copyright (C) 2026 Yon9e。本项目使用 GNU General Public License v3.0（GPL-3.0-only）。
Umi-OCR 及其组件的许可与来源见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
