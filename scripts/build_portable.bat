@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul
set PROJECT_ROOT=%~dp0..
cd /d "%PROJECT_ROOT%"
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

set PYSIDE_DEPLOY=%APPDATA%\Python\Python314\Scripts\pyside6-deploy.exe
if exist "%PYSIDE_DEPLOY%" (
  echo 尝试使用 pyside6-deploy 构建。
  "%PYSIDE_DEPLOY%" app\main.py --name ExcelCellSummaryTool --force
)

if not exist dist (
  mkdir dist
)

dir /s /b dist\ExcelCellSummaryTool.exe > nul 2> nul
if errorlevel 1 (
  echo pyside6-deploy 未生成目标 exe，转入 Nuitka fallback。
  python -m pip install -U "Nuitka>=4.1.3" ordered-set zstandard
  if errorlevel 1 goto fail
  python -m nuitka --standalone --assume-yes-for-downloads --enable-plugin=pyside6 --windows-console-mode=disable --windows-icon-from-ico=app\resources\app.ico --output-dir=dist --output-filename=ExcelCellSummaryTool.exe app\main.py
  if errorlevel 1 goto fail
)

powershell -NoProfile -ExecutionPolicy Bypass -File scripts\make_release.ps1 -Version 0.1.0
if errorlevel 1 goto fail

echo portable 构建完成。
exit /b 0

:fail
echo portable 构建失败。
pause
exit /b 1
