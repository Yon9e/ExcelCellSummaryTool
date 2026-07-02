@echo off
setlocal
chcp 65001 > nul
cd /d "D:\DevHub\repos\desktop-apps\ExcelCellSummaryTool"
if errorlevel 1 goto fail

echo 当前目录：%CD%
if not "%CD%"=="D:\DevHub\repos\desktop-apps\ExcelCellSummaryTool" (
  echo 目录错误，已停止。
  goto fail
)

if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist release rmdir /s /q release

python -m pip install -U -r requirements.txt
if errorlevel 1 goto fail

python scripts\compile_ui.py
if errorlevel 1 goto fail

python -m pytest
if errorlevel 1 goto fail

call scripts\build_portable.bat
if errorlevel 1 goto fail

call scripts\build_installer.bat
if errorlevel 1 echo 安装包构建失败或缺少 Inno Setup，已保留 portable 产物。

echo 构建流程结束。
echo portable exe: release\portable\ExcelCellSummaryTool\ExcelCellSummaryTool.exe
echo portable zip: release\ExcelCellSummaryTool-v0.1.0-win64-portable.zip
echo setup exe: release\ExcelCellSummaryTool-v0.1.0-win64-setup.exe
exit /b 0

:fail
echo 构建失败。
pause
exit /b 1
