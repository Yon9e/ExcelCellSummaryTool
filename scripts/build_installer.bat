@echo off
setlocal
chcp 65001 > nul
set PROJECT_ROOT=%~dp0..
cd /d "%PROJECT_ROOT%"
if errorlevel 1 goto fail

if not exist release\portable\ExcelCellSummaryTool\ExcelCellSummaryTool.exe (
  echo 未找到 portable 产物，请先运行 scripts\build_portable.bat。
  goto fail
)

set ISCC_EXE=
for %%P in (ISCC.exe) do set ISCC_EXE=%%~$PATH:P
if "%ISCC_EXE%"=="" if exist "%ProgramFiles(x86)%\Inno Setup 7\ISCC.exe" set ISCC_EXE=%ProgramFiles(x86)%\Inno Setup 7\ISCC.exe
if "%ISCC_EXE%"=="" if exist "%ProgramFiles%\Inno Setup 7\ISCC.exe" set ISCC_EXE=%ProgramFiles%\Inno Setup 7\ISCC.exe

if "%ISCC_EXE%"=="" (
  echo 未找到 ISCC.exe。请安装 Inno Setup：
  echo winget install --id JRSoftware.InnoSetup.7 -e -s winget -i
  goto fail
)

"%ISCC_EXE%" installer\ExcelCellSummaryTool.iss
if errorlevel 1 goto fail

powershell -NoProfile -ExecutionPolicy Bypass -File scripts\make_release.ps1 -Version 0.1.0
if errorlevel 1 goto fail

echo installer 构建完成：release\ExcelCellSummaryTool-v0.1.0-win64-setup.exe
exit /b 0

:fail
echo installer 构建失败。
pause
exit /b 1
