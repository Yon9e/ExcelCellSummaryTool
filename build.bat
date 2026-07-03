@echo off
setlocal
chcp 65001 > nul
cd /d "D:\DevHub\repos\desktop-apps\ExcelCellSummaryTool"
if errorlevel 1 goto fail

set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

if exist dist rmdir /s /q dist
if exist release rmdir /s /q release

call npm install
if errorlevel 1 goto fail

call npm run build
if errorlevel 1 goto fail

pushd src-tauri
cargo test
if errorlevel 1 (
  popd
  goto fail
)
popd

call npm run tauri:build
if errorlevel 1 goto fail

powershell -NoProfile -ExecutionPolicy Bypass -File scripts\make_release.ps1 -Version 0.1.0
if errorlevel 1 goto fail

echo Tauri build completed.
echo portable exe: release\portable\ExcelCellSummaryTool\ExcelCellSummaryTool.exe
echo portable zip: release\ExcelCellSummaryTool-v0.1.0-win64-portable.zip
echo setup exe: release\ExcelCellSummaryTool-v0.1.0-win64-setup.exe
exit /b 0

:fail
echo Tauri build failed.
pause
exit /b 1
