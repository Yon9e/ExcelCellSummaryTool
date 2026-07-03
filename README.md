# Excel 单元格定向汇总工具

一个面向审计、财务和办公自动化场景的 Windows 桌面工具。软件批量读取目标文件夹中的 Excel 文件，按规则定位指定 Sheet 与单元格，并输出汇总结果工作簿。

## 技术栈

- Tauri 2
- React 19
- TypeScript
- CSS / Tailwind CSS
- Rust
- calamine
- rust_xlsxwriter

界面设计采用深色生产力工具风格：左侧导航、内容窗格、清晰按钮层级、低干扰面板和 WebView 字体渲染，设计方向参考 Cockpit Tools 这类现代 Tauri 应用的共性思路，不复制其品牌元素。

## 下载

从 GitHub Releases 下载最新版：

- 安装版：`ExcelCellSummaryTool-v0.1.0-win64-setup.exe`
- 免安装版：`ExcelCellSummaryTool-v0.1.0-win64-portable.zip`

## 使用方法

1. 打开软件。
2. 在“数据源配置”选择目标文件夹。
3. 选择输出 `.xlsx` 文件。
4. 按需填写文件名关键词，并选择“包含关键词”或“排除关键词”。
5. 在“规则配置”维护输出列名、Sheet 模式、Sheet 值和单元格。
6. 在“执行与日志”点击“开始汇总”。

## 规则说明

每条规则包含：

- `输出列名`：写入结果表的列名。
- `Sheet 模式`：
  - `exact`：Sheet 名精确匹配。
  - `contains`：Sheet 名包含关键词。
  - `index`：按 Sheet 序号定位，`1` 表示第一个 Sheet。
- `Sheet 值`：Sheet 名、关键词或序号。
- `单元格`：例如 `B7`、`C12`、`AA20`。

## 支持文件

- `.xlsx`
- `.xlsm`
- `.xltx`
- `.xltm`

软件会跳过 Excel 临时文件。公式单元格读取的是工作簿已保存的缓存值，本工具不负责重新计算公式。

## 源码运行

```powershell
npm install
npm run tauri:dev
```

## 本地验证

```powershell
npm run build
cd src-tauri
cargo test
```

## 本地打包

```powershell
.\build.bat
```

打包产物：

- `release\portable\ExcelCellSummaryTool\ExcelCellSummaryTool.exe`
- `release\ExcelCellSummaryTool-v0.1.0-win64-portable.zip`
- `release\ExcelCellSummaryTool-v0.1.0-win64-setup.exe`
- `release\SHA256SUMS.txt`
