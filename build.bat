@echo off
setlocal
chcp 65001 > nul
cd /d "%~dp0"
if errorlevel 1 goto fail

set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
set "RUSTFLAGS=--remap-path-prefix=%CD%=. --remap-path-prefix=%USERPROFILE%=~ %RUSTFLAGS%"
set "WINDOWS_POWERSHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

if exist dist rmdir /s /q dist
if exist release rmdir /s /q release

"%WINDOWS_POWERSHELL%" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File scripts\setup_umi_ocr.ps1 -Force
if errorlevel 1 goto fail

call npm ci
if errorlevel 1 goto fail

call npm run build
if errorlevel 1 goto fail

pushd src-tauri
cargo test --locked
if errorlevel 1 (
  popd
  goto fail
)
popd

call npm run tauri:build
if errorlevel 1 goto fail

"%WINDOWS_POWERSHELL%" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File scripts\make_release.ps1 -Version 0.2.8
if errorlevel 1 goto fail

"%WINDOWS_POWERSHELL%" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File scripts\audit_release.ps1 -Version 0.2.8
if errorlevel 1 goto fail

echo Tauri build completed.
echo portable exe: release\portable\FADT\FADT.exe
echo portable zip: release\FADT-v0.2.8-win64-portable.zip
echo setup exe: release\FADT-v0.2.8-win64-setup.exe
exit /b 0

:fail
echo Tauri build failed.
pause
exit /b 1
