@echo off
setlocal
chcp 65001 > nul
set PROJECT_ROOT=%~dp0..
cd /d "%PROJECT_ROOT%"
if errorlevel 1 goto fail

if not exist release\portable\ExcelCellSummaryTool\ExcelCellSummaryTool.exe (
  echo portable build not found. Run scripts\build_portable.bat first.
  goto fail
)

set ISCC_EXE=
for %%P in (ISCC.exe) do set ISCC_EXE=%%~$PATH:P
if "%ISCC_EXE%"=="" if exist "%ProgramFiles(x86)%\Inno Setup 7\ISCC.exe" set ISCC_EXE=%ProgramFiles(x86)%\Inno Setup 7\ISCC.exe
if "%ISCC_EXE%"=="" if exist "%ProgramFiles%\Inno Setup 7\ISCC.exe" set ISCC_EXE=%ProgramFiles%\Inno Setup 7\ISCC.exe
if "%ISCC_EXE%"=="" if exist "%LOCALAPPDATA%\Programs\Inno Setup 7\ISCC.exe" set ISCC_EXE=%LOCALAPPDATA%\Programs\Inno Setup 7\ISCC.exe

if "%ISCC_EXE%"=="" (
  echo ISCC.exe not found. Install Inno Setup first:
  echo winget install --id JRSoftware.InnoSetup.7 -e -s winget -i
  goto fail
)

"%ISCC_EXE%" installer\ExcelCellSummaryTool.iss
if errorlevel 1 goto fail

powershell -NoProfile -ExecutionPolicy Bypass -File scripts\make_release.ps1 -Version 0.1.0
if errorlevel 1 goto fail

echo installer build completed: release\ExcelCellSummaryTool-v0.1.0-win64-setup.exe
exit /b 0

:fail
echo installer build failed.
pause
exit /b 1
