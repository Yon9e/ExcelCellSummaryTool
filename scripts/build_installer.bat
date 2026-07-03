@echo off
setlocal
chcp 65001 > nul
set PROJECT_ROOT=%~dp0..
cd /d "%PROJECT_ROOT%"
if errorlevel 1 goto fail

set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

call npm run tauri:build
if errorlevel 1 goto fail

powershell -NoProfile -ExecutionPolicy Bypass -File scripts\make_release.ps1 -Version 0.1.0
if errorlevel 1 goto fail

echo Tauri NSIS installer build completed: release\ExcelCellSummaryTool-v0.1.0-win64-setup.exe
exit /b 0

:fail
echo Tauri installer build failed.
pause
exit /b 1
