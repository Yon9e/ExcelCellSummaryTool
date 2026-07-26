param(
    [string]$Version = "0.2.8",
    [ValidatePattern('^[A-Za-z0-9._-]+$')]
    [string]$PortableDirectoryName = "portable"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ReleaseDir = Join-Path $ProjectRoot "release"
$PortableStage = Join-Path $ReleaseDir "$PortableDirectoryName\FADT"
$PortableExe = Join-Path $ProjectRoot "src-tauri\target\release\fadt.exe"
$SetupSource = Join-Path $ProjectRoot "src-tauri\target\release\bundle\nsis\FADT_$($Version)_x64-setup.exe"
$PortableZip = Join-Path $ReleaseDir "FADT-v$Version-win64-portable.zip"
$SetupTarget = Join-Path $ReleaseDir "FADT-v$Version-win64-setup.exe"
$NotesPath = Join-Path $ReleaseDir "RELEASE_NOTES.md"
$HashPath = Join-Path $ReleaseDir "SHA256SUMS.txt"
$OcrRuntimeSource = Join-Path $ProjectRoot "third_party\umi-ocr\runtime"
$LicenseSource = Join-Path $ProjectRoot "LICENSE"
$ThirdPartyNoticeSource = Join-Path $ProjectRoot "THIRD_PARTY_NOTICES.md"
$ThirdPartyLicensesSource = Join-Path $ProjectRoot "THIRD_PARTY_LICENSES"
$QuickAccessScriptSource = Join-Path $ProjectRoot "src-tauri\resources\list_quick_access.ps1"

function Get-Sha256Hex {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )
    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $sha256 = [System.Security.Cryptography.SHA256]::Create()
        try {
            $hashBytes = $sha256.ComputeHash($stream)
            return -join ($hashBytes | ForEach-Object { $_.ToString("x2") })
        } finally {
            $sha256.Dispose()
        }
    } finally {
        $stream.Dispose()
    }
}

if (-not (Test-Path -LiteralPath $PortableExe)) {
    throw "Tauri exe not found: $PortableExe"
}
if (-not (Test-Path -LiteralPath $SetupSource)) {
    throw "Tauri NSIS setup not found: $SetupSource"
}
if (-not (Test-Path -LiteralPath (Join-Path $OcrRuntimeSource "Umi-OCR.exe"))) {
    throw "Umi-OCR runtime not found. Run scripts\setup_umi_ocr.ps1 first."
}
foreach ($RequiredDocument in @($LicenseSource, $ThirdPartyNoticeSource)) {
    if (-not (Test-Path -LiteralPath $RequiredDocument -PathType Leaf)) {
        throw "Release document not found: $RequiredDocument"
    }
}
if (-not (Test-Path -LiteralPath $QuickAccessScriptSource -PathType Leaf)) {
    throw "Quick Access helper script not found: $QuickAccessScriptSource"
}
if (-not (Test-Path -LiteralPath $ThirdPartyLicensesSource -PathType Container)) {
    throw "Third-party license directory not found: $ThirdPartyLicensesSource"
}
$ForbiddenRuntimeState = @(
    (Join-Path $OcrRuntimeSource "UmiOCR-data\.settings"),
    (Join-Path $OcrRuntimeSource "UmiOCR-data\.pre_settings"),
    (Join-Path $OcrRuntimeSource "UmiOCR-data\logs")
)
foreach ($ForbiddenPath in $ForbiddenRuntimeState) {
    if (Test-Path -LiteralPath $ForbiddenPath) {
        throw "Umi-OCR runtime contains local state and cannot be released: $ForbiddenPath"
    }
}

New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null
if (Test-Path -LiteralPath (Join-Path $ReleaseDir $PortableDirectoryName)) {
    Remove-Item -LiteralPath (Join-Path $ReleaseDir $PortableDirectoryName) -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $PortableStage | Out-Null

Copy-Item -LiteralPath $PortableExe -Destination (Join-Path $PortableStage "FADT.exe") -Force
Copy-Item -LiteralPath $OcrRuntimeSource -Destination (Join-Path $PortableStage "umi-ocr") -Recurse -Force
Copy-Item -LiteralPath $LicenseSource -Destination (Join-Path $PortableStage "LICENSE") -Force
Copy-Item -LiteralPath $ThirdPartyNoticeSource -Destination (Join-Path $PortableStage "THIRD_PARTY_NOTICES.md") -Force
Copy-Item -LiteralPath $ThirdPartyLicensesSource -Destination (Join-Path $PortableStage "THIRD_PARTY_LICENSES") -Recurse -Force
Copy-Item -LiteralPath $QuickAccessScriptSource -Destination (Join-Path $PortableStage "list_quick_access.ps1") -Force
Copy-Item -LiteralPath $SetupSource -Destination $SetupTarget -Force

if (Test-Path -LiteralPath $PortableZip) {
    Remove-Item -LiteralPath $PortableZip -Force
}
Compress-Archive -Path $PortableStage -DestinationPath $PortableZip -Force

$notes = @(
    "# FADT · Financial Audit Data Toolkit v$Version",
    "",
    "## 本版更新",
    "- 截图预览支持滚轮以鼠标位置为中心缩放、中键向任意方向平移，并保留水平和垂直滚动条。",
    "- OCR 重建表格默认按 0.5 倍密度显示，支持拖动切换选择、边缘自动滚动和连续选取。",
    "- 修复【工资】等截图文字未映射到识别表格单元格的问题。",
    "- 双击识别表格时仅允许经确认修正【输出列名】文本；目标坐标和目标数据保持只读。",
    "- 规则表格新增行内复选框、全选、连续拖选、反选、批量复制和批量删除；排序仅从六点手柄启动。",
    "- 修复混合数据源选择器中双击文件夹无法进入、选择事件冲突及文件夹导航误选问题。",
    "- 数据源应用前按当前关键词和筛选模式预检；不可访问路径不再进入任务，重复 Excel 文件仍由用户决定是否去重。",
    "- 方案规则 ID 现在会稳定保存，避免载入方案后多选、排序或批量操作定位漂移。",
    "- 新增 Windows CI、固定 Rust 工具链、rustfmt、Clippy、前端测试和锁定依赖的 Cargo 测试门禁。",
    "",
    "## 既有功能",
    "- 支持 .xlsx / .xlsm / .xltx / .xltm 文件定向汇总。",
    "- 支持 exact / contains / index Sheet 定位、冲突选择和规则拖动排序。",
    "- 方案与 OCR 用户设置存放在用户数据目录，更新 portable 主程序不会覆盖。",
    "- 发布产物执行文件清单和敏感数据审计。",
    "",
    "## 下载",
    "普通用户建议下载：",
    "FADT-v$Version-win64-setup.exe",
    "",
    "免安装用户下载：",
    "FADT-v$Version-win64-portable.zip",
    "",
    "## 隐私与许可",
    "- OCR 请求只发送到本机 127.0.0.1，不上传图片。",
    "- Umi-OCR 及相关第三方许可见 THIRD_PARTY_NOTICES.md。",
    "",
    "## 校验",
    "使用 SHA256SUMS.txt 校验下载文件完整性。"
) -join [Environment]::NewLine
$notes | Set-Content -LiteralPath $NotesPath -Encoding UTF8

$hashLines = @()
$hashLines += "$(Get-Sha256Hex -Path $PortableZip)  FADT-v$Version-win64-portable.zip"
$hashLines += "$(Get-Sha256Hex -Path $SetupTarget)  FADT-v$Version-win64-setup.exe"
$hashLines | Set-Content -LiteralPath $HashPath -Encoding ASCII

$PortableExeTarget = Join-Path $PortableStage 'FADT.exe'
Write-Host "portable exe: $PortableExeTarget"
Write-Host "portable zip: $PortableZip"
Write-Host "setup exe: $SetupTarget"
Write-Host "release notes: $NotesPath"
Write-Host "sha256: $HashPath"
