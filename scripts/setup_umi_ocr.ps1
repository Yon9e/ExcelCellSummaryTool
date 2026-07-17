[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ManifestPath = Join-Path $ProjectRoot "third_party\umi-ocr\manifest.json"
$VendorRoot = Join-Path $ProjectRoot "third_party\umi-ocr"
$RuntimeDir = Join-Path $VendorRoot "runtime"
$DownloadDir = Join-Path $VendorRoot "downloads"
$WorkDir = Join-Path $DownloadDir "extract"

function Get-FileSha256Hex {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $Stream = [System.IO.File]::OpenRead($Path)
    try {
        $Sha256 = [System.Security.Cryptography.SHA256]::Create()
        try {
            $HashBytes = $Sha256.ComputeHash($Stream)
            return -join ($HashBytes | ForEach-Object { $_.ToString("x2") })
        } finally {
            $Sha256.Dispose()
        }
    } finally {
        $Stream.Dispose()
    }
}

if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
    throw "缺少 Umi-OCR 清单：$ManifestPath"
}

$Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
$RuntimeExe = Join-Path $RuntimeDir "Umi-OCR.exe"
$VersionMarker = Join-Path $RuntimeDir ".financial-tool-runtime-version"

if (-not $Force -and (Test-Path -LiteralPath $RuntimeExe -PathType Leaf)) {
    $InstalledVersion = if (Test-Path -LiteralPath $VersionMarker) {
        (Get-Content -LiteralPath $VersionMarker -Raw).Trim()
    } else {
        ""
    }
    if ($InstalledVersion -eq [string]$Manifest.version) {
        Write-Host "Umi-OCR $InstalledVersion 已准备，无需重复下载。"
        exit 0
    }
}

New-Item -ItemType Directory -Force -Path $DownloadDir | Out-Null
$PackagePath = Join-Path $DownloadDir "Umi-OCR_Rapid_v$($Manifest.version).7z.exe"
$ArchivePath = Join-Path $DownloadDir "Umi-OCR_Rapid_v$($Manifest.version).7z"

if (-not (Test-Path -LiteralPath $PackagePath -PathType Leaf)) {
    Write-Host "下载 Umi-OCR Rapid $($Manifest.version)..."
    & curl.exe --fail --location --output $PackagePath ([string]$Manifest.url)
    if ($LASTEXITCODE -ne 0) {
        throw "Umi-OCR 下载失败，curl 退出码：$LASTEXITCODE"
    }
}

$ActualHash = Get-FileSha256Hex -Path $PackagePath
if ($ActualHash -ne ([string]$Manifest.sha256).ToLowerInvariant()) {
    throw "Umi-OCR SHA-256 校验失败。实际：$ActualHash"
}

Write-Host "SHA-256 校验通过。"
$PackageBytes = [System.IO.File]::ReadAllBytes($PackagePath)
$Signature = [byte[]](0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C)
$ArchiveOffset = -1
for ($Index = 0; $Index -le $PackageBytes.Length - $Signature.Length; $Index++) {
    $Matched = $true
    for ($SignatureIndex = 0; $SignatureIndex -lt $Signature.Length; $SignatureIndex++) {
        if ($PackageBytes[$Index + $SignatureIndex] -ne $Signature[$SignatureIndex]) {
            $Matched = $false
            break
        }
    }
    if ($Matched) {
        $ArchiveOffset = $Index
        break
    }
}

if ($ArchiveOffset -lt 0) {
    throw "Umi-OCR 自解压包中未找到 7z 数据。"
}

$ArchiveLength = $PackageBytes.Length - $ArchiveOffset
$ArchiveBytes = New-Object byte[] $ArchiveLength
[System.Array]::Copy($PackageBytes, $ArchiveOffset, $ArchiveBytes, 0, $ArchiveLength)
[System.IO.File]::WriteAllBytes($ArchivePath, $ArchiveBytes)

$ResolvedVendorRoot = (Resolve-Path -LiteralPath $VendorRoot).Path
if (-not $WorkDir.StartsWith($ResolvedVendorRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "解压目录不在第三方组件目录内。"
}
if (Test-Path -LiteralPath $WorkDir) {
    Remove-Item -LiteralPath $WorkDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null

& tar.exe -xf $ArchivePath -C $WorkDir
if ($LASTEXITCODE -ne 0) {
    throw "Umi-OCR 解压失败，tar 退出码：$LASTEXITCODE"
}

$ExtractedRoot = Join-Path $WorkDir ([string]$Manifest.archiveRoot)
if (-not (Test-Path -LiteralPath (Join-Path $ExtractedRoot "Umi-OCR.exe") -PathType Leaf)) {
    throw "解压结果缺少 Umi-OCR.exe。"
}

if (Test-Path -LiteralPath $RuntimeDir) {
    $ResolvedRuntimeDir = (Resolve-Path -LiteralPath $RuntimeDir).Path
    if (-not $ResolvedRuntimeDir.StartsWith($ResolvedVendorRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "运行时目录不在第三方组件目录内。"
    }
    Remove-Item -LiteralPath $RuntimeDir -Recurse -Force
}
Move-Item -LiteralPath $ExtractedRoot -Destination $RuntimeDir

$SettingsPath = Join-Path $RuntimeDir "UmiOCR-data\.settings"
$PreSettingsPath = Join-Path $RuntimeDir "UmiOCR-data\.pre_settings"
$LogsPath = Join-Path $RuntimeDir "UmiOCR-data\logs"
if (Test-Path -LiteralPath $SettingsPath) {
    Remove-Item -LiteralPath $SettingsPath -Force
}
if (Test-Path -LiteralPath $PreSettingsPath) {
    Remove-Item -LiteralPath $PreSettingsPath -Force
}
if (Test-Path -LiteralPath $LogsPath) {
    Remove-Item -LiteralPath $LogsPath -Recurse -Force
}

$PythonCacheDirs = @(
    Get-ChildItem -LiteralPath $RuntimeDir -Directory -Recurse -Force |
        Where-Object { $_.Name -eq "__pycache__" } |
        Sort-Object { $_.FullName.Length } -Descending
)
foreach ($CacheDir in $PythonCacheDirs) {
    Remove-Item -LiteralPath $CacheDir.FullName -Recurse -Force
}
$PythonBytecodeFiles = @(Get-ChildItem -LiteralPath $RuntimeDir -File -Recurse -Force -Filter "*.pyc")
foreach ($BytecodeFile in $PythonBytecodeFiles) {
    Remove-Item -LiteralPath $BytecodeFile.FullName -Force
}

([string]$Manifest.version) | Set-Content -LiteralPath $VersionMarker -Encoding ASCII
Remove-Item -LiteralPath $WorkDir -Recurse -Force

$RuntimeBytes = (Get-ChildItem -LiteralPath $RuntimeDir -File -Recurse | Measure-Object -Property Length -Sum).Sum
$RuntimeFiles = @(Get-ChildItem -LiteralPath $RuntimeDir -File -Recurse).Count
Write-Host "Umi-OCR 运行时已准备：$RuntimeDir"
Write-Host "文件数量：$RuntimeFiles"
Write-Host "总字节数：$RuntimeBytes"
