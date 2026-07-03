@echo off
setlocal
chcp 65001 > nul
set PROJECT_ROOT=%~dp0..
cd /d "%PROJECT_ROOT%"
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

echo Tauri portable build completed.
exit /b 0

:fail
echo Tauri portable build failed.
pause
exit /b 1
