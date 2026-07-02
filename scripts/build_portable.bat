@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul
set PROJECT_ROOT=%~dp0..
cd /d "%PROJECT_ROOT%"
if errorlevel 1 goto fail

echo current directory: %CD%
if not "%CD%"=="D:\DevHub\repos\desktop-apps\ExcelCellSummaryTool" (
  echo wrong directory, stopped.
  goto fail
)

if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist release rmdir /s /q release

python -m pip install --disable-pip-version-check -r requirements.txt
if errorlevel 1 goto fail

python scripts\compile_ui.py
if errorlevel 1 goto fail

python -m pytest
if errorlevel 1 goto fail

set PYSIDE_DEPLOY=%APPDATA%\Python\Python314\Scripts\pyside6-deploy.exe
for /f %%V in ('python -c "import sys; print('direct-nuitka' if sys.version_info >= (3, 14) else 'try-deploy')"') do set BUILD_ROUTE=%%V
set NEED_NUITKA=0
if "%BUILD_ROUTE%"=="direct-nuitka" set NEED_NUITKA=1

if "%NEED_NUITKA%"=="0" if exist "%PYSIDE_DEPLOY%" (
  echo trying pyside6-deploy.
  "%PYSIDE_DEPLOY%" app\main.py --name ExcelCellSummaryTool --mode standalone --force
)

if not exist dist (
  mkdir dist
)

dir /s /b dist\ExcelCellSummaryTool.exe > nul 2> nul
if errorlevel 1 set NEED_NUITKA=1

if "%NEED_NUITKA%"=="1" (
  echo using Nuitka standalone build.
  python -m pip install --disable-pip-version-check "Nuitka>=4.1.3" ordered-set zstandard
  if errorlevel 1 goto fail
  python -m nuitka --standalone --assume-yes-for-downloads --enable-plugin=pyside6 --include-package-data=qt_material --windows-console-mode=disable --windows-icon-from-ico=app\resources\app.ico --output-dir=dist --output-filename=ExcelCellSummaryTool.exe app\main.py
  if errorlevel 1 goto fail
)

powershell -NoProfile -ExecutionPolicy Bypass -File scripts\make_release.ps1 -Version 0.1.0
if errorlevel 1 goto fail

echo portable build completed.
exit /b 0

:fail
echo portable build failed.
pause
exit /b 1
