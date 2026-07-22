param(
    [string]$Version = "0.2.6",
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

Copy-Item -LiteralPath $PortableExe -Destination (Join-Path $PortableStage "Financial Tool.exe") -Force
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
    "# Financial Tool 财务工具箱 v$Version",
    "",
    "## 本版更新",
    "- 桌面端启动首帧改为深色品牌底色，并在前端加载期间显示启动提示，避免白屏。",
    "- 按钮、菜单、表格、输入框、提示、弹窗和正文统一为 14px 内容字号；标题保留层级。",
    "- 免安装版主程序重命名为 Financial Tool.exe。",
    "- 数据源配置改为统一文件浏览页面，在同一列表中显示文件夹与 Excel 文件，支持混合多选和跨目录累计选择。",
    "- 新增 Windows 快速访问、常用位置和磁盘目录树；支持逐级展开、拖动连续选择、全选当前和反选当前。",
    "- 所选文件夹会递归扫描全部子文件夹；混合数据源自动去重并阻止源文件被覆盖为输出文件。",
    "- 规则排序由原生 HTML5 拖拽改为 Pointer Events，提高 Tauri WebView 与浏览器兼容性。",
    "- 修复拖动手柄出现禁止符号、拖动无反应和松手后顺序不变的问题。",
    "- 保留半透明玻璃浮动行、随鼠标移动及相邻行平滑让位效果。",
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

$PortableExeTarget = Join-Path $PortableStage 'Financial Tool.exe'
Write-Host "portable exe: $PortableExeTarget"
Write-Host "portable zip: $PortableZip"
Write-Host "setup exe: $SetupTarget"
Write-Host "release notes: $NotesPath"
Write-Host "sha256: $HashPath"
