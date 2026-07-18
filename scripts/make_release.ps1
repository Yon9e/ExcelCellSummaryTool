param(
    [string]$Version = "0.2.2",
    [ValidatePattern('^[A-Za-z0-9._-]+$')]
    [string]$PortableDirectoryName = "portable"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ReleaseDir = Join-Path $ProjectRoot "release"
$PortableStage = Join-Path $ReleaseDir "$PortableDirectoryName\ExcelCellSummaryTool"
$PortableExe = Join-Path $ProjectRoot "src-tauri\target\release\excel-cell-summary-tool.exe"
$SetupSource = Join-Path $ProjectRoot "src-tauri\target\release\bundle\nsis\Financial Tool_$($Version)_x64-setup.exe"
$PortableZip = Join-Path $ReleaseDir "ExcelCellSummaryTool-v$Version-win64-portable.zip"
$SetupTarget = Join-Path $ReleaseDir "ExcelCellSummaryTool-v$Version-win64-setup.exe"
$NotesPath = Join-Path $ReleaseDir "RELEASE_NOTES.md"
$HashPath = Join-Path $ReleaseDir "SHA256SUMS.txt"
$OcrRuntimeSource = Join-Path $ProjectRoot "third_party\umi-ocr\runtime"
$LicenseSource = Join-Path $ProjectRoot "LICENSE"
$ThirdPartyNoticeSource = Join-Path $ProjectRoot "THIRD_PARTY_NOTICES.md"
$ThirdPartyLicensesSource = Join-Path $ProjectRoot "THIRD_PARTY_LICENSES"

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

Copy-Item -LiteralPath $PortableExe -Destination (Join-Path $PortableStage "ExcelCellSummaryTool.exe") -Force
Copy-Item -LiteralPath $OcrRuntimeSource -Destination (Join-Path $PortableStage "umi-ocr") -Recurse -Force
Copy-Item -LiteralPath $LicenseSource -Destination (Join-Path $PortableStage "LICENSE") -Force
Copy-Item -LiteralPath $ThirdPartyNoticeSource -Destination (Join-Path $PortableStage "THIRD_PARTY_NOTICES.md") -Force
Copy-Item -LiteralPath $ThirdPartyLicensesSource -Destination (Join-Path $PortableStage "THIRD_PARTY_LICENSES") -Recurse -Force
Copy-Item -LiteralPath $SetupSource -Destination $SetupTarget -Force

if (Test-Path -LiteralPath $PortableZip) {
    Remove-Item -LiteralPath $PortableZip -Force
}
Compress-Archive -Path $PortableStage -DestinationPath $PortableZip -Force

$notes = @(
    "# Financial Tool 财务工具箱 v$Version",
    "",
    "## 新增",
    "- 集成 Umi-OCR Rapid v2.1.5，本地完成图片文字识别。",
    "- 新增一键截图 OCR，识别文字自动写入剪贴板。",
    "- 新增红框表头、蓝框数据的 Excel 截图规则定位。",
    "- 图片生成的输出列名和单元格先进入可编辑预览，确认后追加到规则配置。",
    "- OCR 设置与插件入口独立保留，为后续财务工具插件扩展预留空间。",
    "",
    "## 修复",
    "- 修复剪贴板中的图片格式延迟就绪时，图片规则自动识别会跳过该截图的问题。",
    "- 修复 Excel 浅青填充和边缘蓝色噪声导致标注蓝框漏检的问题。",
    "",
    "## 既有功能",
    "- 支持 .xlsx / .xlsm / .xltx / .xltm 文件定向汇总。",
    "- 支持 exact / contains / index Sheet 定位、冲突选择和规则拖动排序。",
    "- 方案与 OCR 用户设置存放在用户数据目录，更新 portable 主程序不会覆盖。",
    "- 发布产物执行文件清单和敏感数据审计。",
    "",
    "## 下载",
    "普通用户建议下载：",
    "ExcelCellSummaryTool-v$Version-win64-setup.exe",
    "",
    "免安装用户下载：",
    "ExcelCellSummaryTool-v$Version-win64-portable.zip",
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
$hashLines += "$(Get-Sha256Hex -Path $PortableZip)  ExcelCellSummaryTool-v$Version-win64-portable.zip"
$hashLines += "$(Get-Sha256Hex -Path $SetupTarget)  ExcelCellSummaryTool-v$Version-win64-setup.exe"
$hashLines | Set-Content -LiteralPath $HashPath -Encoding ASCII

$PortableExeTarget = Join-Path $PortableStage 'ExcelCellSummaryTool.exe'
Write-Host "portable exe: $PortableExeTarget"
Write-Host "portable zip: $PortableZip"
Write-Host "setup exe: $SetupTarget"
Write-Host "release notes: $NotesPath"
Write-Host "sha256: $HashPath"
