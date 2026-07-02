# Excel 单元格定向汇总工具

Excel 单元格定向汇总工具是一款面向审计、财务和办公自动化场景的 Windows 桌面软件。它可以批量读取指定文件夹下的 Excel 文件，根据用户配置的规则定位 Sheet 和单元格，并将结果汇总输出到一个 Excel 工作簿。

## 截图

首次发布后可在此补充主界面截图。

## 技术栈

- PySide6
- Qt Designer
- pyside6-uic
- pyside6-deploy / Nuitka
- Inno Setup

## 适用系统

Windows 10 / Windows 11。

## 下载方式

从 GitHub Releases 下载最新版 `setup.exe` 或 portable zip。

## 使用方法

安装版：运行 `ExcelCellSummaryTool-v0.1.0-win64-setup.exe`。

免安装版：解压 `ExcelCellSummaryTool-v0.1.0-win64-portable.zip`，双击 `ExcelCellSummaryTool.exe`。

日常使用流程：

1. 选择目标文件夹。
2. 选择输出 Excel 文件。
3. 设置文件名关键词和包含/排除模式。
4. 配置规则表格。
5. 点击“开始汇总”。

## 规则说明

- `exact`：Sheet 名精确匹配。
- `contains`：Sheet 名包含关键词，命中第一个符合条件的 Sheet。
- `index`：按 Sheet 顺序定位，`1` 表示第一个 Sheet。

单元格地址使用标准 Excel 地址，例如 `B7`、`C10`、`AA20`。

## 源码运行

```powershell
python scripts\compile_ui.py
python -m app.main
```

## 本地测试

```powershell
python -m pytest
```

## 本地打包

```powershell
build.bat
```

## 许可证

本项目使用 MIT License，版权主体为 `Yon9e`。

## 注意事项

- 当前版本执行非递归扫描。
- 请勿在 Excel 打开状态下覆盖输出文件。
- 请不要选择包含敏感数据的测试文件提交到仓库。
- 中文路径、中文文件名和中文 Sheet 名应正常支持。
- 公式单元格读取的是工作簿已保存的缓存值，本工具不负责重新计算公式。
