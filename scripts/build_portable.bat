@echo off
setlocal
chcp 65001 > nul
set PROJECT_ROOT=%~dp0..
cd /d "%PROJECT_ROOT%"
if errorlevel 1 goto fail

set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
set "RUSTFLAGS=--remap-path-prefix=%CD%=. --remap-path-prefix=%USERPROFILE%=~ %RUSTFLAGS%"
set "WINDOWS_POWERSHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

if exist dist rmdir /s /q dist
if exist release rmdir /s /q release

"%WINDOWS_POWERSHELL%" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File scripts\setup_umi_ocr.ps1 -Force
if errorlevel 1 goto fail

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

"%WINDOWS_POWERSHELL%" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File scripts\make_release.ps1 -Version 0.2.3
if errorlevel 1 goto fail

"%WINDOWS_POWERSHELL%" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File scripts\audit_release.ps1 -Version 0.2.3
if errorlevel 1 goto fail

echo Tauri portable build completed.
exit /b 0

:fail
echo Tauri portable build failed.
pause
exit /b 1
