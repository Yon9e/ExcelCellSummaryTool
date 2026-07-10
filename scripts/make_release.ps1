param(
    [string]$Version = "0.1.0"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ReleaseDir = Join-Path $ProjectRoot "release"
$PortableStage = Join-Path $ReleaseDir "portable\ExcelCellSummaryTool"
$PortableExe = Join-Path $ProjectRoot "src-tauri\target\release\excel-cell-summary-tool.exe"
$SetupSource = Join-Path $ProjectRoot "src-tauri\target\release\bundle\nsis\ExcelCellSummaryTool_$($Version)_x64-setup.exe"
$PortableZip = Join-Path $ReleaseDir "ExcelCellSummaryTool-v$Version-win64-portable.zip"
$SetupTarget = Join-Path $ReleaseDir "ExcelCellSummaryTool-v$Version-win64-setup.exe"
$NotesPath = Join-Path $ReleaseDir "RELEASE_NOTES.md"
$HashPath = Join-Path $ReleaseDir "SHA256SUMS.txt"

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

New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null
if (Test-Path -LiteralPath (Join-Path $ReleaseDir "portable")) {
    Remove-Item -LiteralPath (Join-Path $ReleaseDir "portable") -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $PortableStage | Out-Null

Copy-Item -LiteralPath $PortableExe -Destination (Join-Path $PortableStage "ExcelCellSummaryTool.exe") -Force
Copy-Item -LiteralPath $SetupSource -Destination $SetupTarget -Force

if (Test-Path -LiteralPath $PortableZip) {
    Remove-Item -LiteralPath $PortableZip -Force
}
Compress-Archive -Path $PortableStage -DestinationPath $PortableZip -Force

$notes = @(
    "# Excel Cell Summary Tool v$Version",
    "",
    "## Added",
    "- Migrated to a Tauri + React + TypeScript + CSS/Tailwind desktop architecture.",
    "- Uses WebView rendering for clearer small text on the dark UI.",
    "- Uses a Cockpit Tools inspired productivity layout with left navigation and focused content panes.",
    "- Uses a Rust backend for schemes, file filtering, Excel reading, and summary export.",
    "- Provides portable zip and Tauri NSIS setup outputs.",
    "",
    "## Features",
    "- Supports .xlsx / .xlsm / .xltx / .xltm files.",
    "- Skips Excel temporary files.",
    "- Supports Chinese paths, filenames, and sheet names.",
    "- Supports exact / contains / index sheet matching.",
    "- Supports schemes, rule editing, progress events, and logs.",
    "- Supports drag-and-drop rule ordering from the rule table handle.",
    "- Audits release packages for credentials, private paths, and unexpected portable files.",
    "",
    "## Download",
    "Recommended setup package:",
    "ExcelCellSummaryTool-v$Version-win64-setup.exe",
    "",
    "Portable package:",
    "ExcelCellSummaryTool-v$Version-win64-portable.zip",
    "",
    "## Verify",
    "Use SHA256SUMS.txt to verify downloaded files."
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
