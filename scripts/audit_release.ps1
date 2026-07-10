[CmdletBinding()]
param(
    [string]$Version = "0.1.0"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ReleaseDir = Join-Path $ProjectRoot "release"
$PortableExe = Join-Path $ReleaseDir "portable\ExcelCellSummaryTool\ExcelCellSummaryTool.exe"
$PortableZip = Join-Path $ReleaseDir "ExcelCellSummaryTool-v$Version-win64-portable.zip"
$SetupExe = Join-Path $ReleaseDir "ExcelCellSummaryTool-v$Version-win64-setup.exe"
$ReleaseNotes = Join-Path $ReleaseDir "RELEASE_NOTES.md"
$HashFile = Join-Path $ReleaseDir "SHA256SUMS.txt"
$LicenseFile = Join-Path $ProjectRoot "LICENSE"

$RequiredFiles = @($PortableExe, $PortableZip, $SetupExe, $ReleaseNotes, $HashFile, $LicenseFile)
foreach ($Path in $RequiredFiles) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "发布审计失败：缺少文件 $Path"
    }
}

function Get-Sha256Hex {
    param(
        [Parameter(Mandatory = $true)]
        [System.IO.Stream]$Stream
    )

    $Sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $HashBytes = $Sha256.ComputeHash($Stream)
        return -join ($HashBytes | ForEach-Object { $_.ToString("x2") })
    } finally {
        $Sha256.Dispose()
    }
}

function Get-FileSha256Hex {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $Stream = [System.IO.File]::OpenRead($Path)
    try {
        return Get-Sha256Hex -Stream $Stream
    } finally {
        $Stream.Dispose()
    }
}

$PortableFiles = @(Get-ChildItem -LiteralPath (Join-Path $ReleaseDir "portable") -File -Recurse)
if ($PortableFiles.Count -ne 1 -or $PortableFiles[0].FullName -ne $PortableExe) {
    throw "发布审计失败：便携目录只能包含 ExcelCellSummaryTool.exe。"
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$Archive = [System.IO.Compression.ZipFile]::OpenRead($PortableZip)
try {
    $ArchiveEntries = @($Archive.Entries)
    if (
        $ArchiveEntries.Count -ne 1 -or
        $ArchiveEntries[0].FullName -ne "ExcelCellSummaryTool/ExcelCellSummaryTool.exe"
    ) {
        throw "发布审计失败：便携压缩包包含非预期文件。"
    }

    $EntryStream = $ArchiveEntries[0].Open()
    try {
        $ArchiveExeHash = Get-Sha256Hex -Stream $EntryStream
    } finally {
        $EntryStream.Dispose()
    }
} finally {
    $Archive.Dispose()
}

if ($ArchiveExeHash -ne (Get-FileSha256Hex -Path $PortableExe)) {
    throw "发布审计失败：便携压缩包内程序与构建产物不一致。"
}

$SensitivePatterns = [ordered]@{
    "云服务访问密钥" = "AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}"
    "GitHub或平台令牌" = "gh[pousr]_[0-9A-Za-z]{30,}|github_pat_[0-9A-Za-z_]{20,}|xox[baprs]-[0-9A-Za-z-]{20,}"
    "API密钥" = "sk-(?:proj-)?[0-9A-Za-z_-]{20,}"
    "私钥内容" = "BEGIN [A-Z ]*PRIVATE KEY"
    "明文凭据赋值" = "(?i)(?:api[_-]?key|secret|password|passwd|access[_-]?token|refresh[_-]?token)\s*[:=]\s*[`"'][^`"'\r\n]{8,}[`"']"
    "Windows用户目录" = "(?i)[A-Z]:\\Users\\[^\\\x00\r\n]{1,80}"
    "本机项目目录" = "(?i)D:\\DevHub"
}

$TrackedPaths = @(git -C $ProjectRoot ls-files)
if ($LASTEXITCODE -ne 0) {
    throw "发布审计失败：无法读取 Git 跟踪文件清单。"
}

$TrackedFiles = @(
    $TrackedPaths |
        ForEach-Object { Join-Path $ProjectRoot $_ } |
        Where-Object { Test-Path -LiteralPath $_ -PathType Leaf }
)
$ReleaseScanFiles = @($PortableExe, $SetupExe, $ReleaseNotes, $HashFile, $LicenseFile)
$ScanFiles = @($TrackedFiles + $ReleaseScanFiles | Sort-Object -Unique)
$Findings = @()
$EmailFindings = @()

foreach ($File in $ScanFiles) {
    $Bytes = [System.IO.File]::ReadAllBytes($File)
    $Texts = @(
        [System.Text.Encoding]::ASCII.GetString($Bytes),
        [System.Text.Encoding]::Unicode.GetString($Bytes)
    )

    foreach ($Pattern in $SensitivePatterns.GetEnumerator()) {
        foreach ($Text in $Texts) {
            if ([regex]::IsMatch($Text, $Pattern.Value)) {
                $Findings += [pscustomobject]@{
                    Rule = $Pattern.Key
                    File = $File
                }
                break
            }
        }
    }

    if ($File -ne $SetupExe) {
        foreach ($Text in $Texts) {
            $EmailMatches = @(
                [regex]::Matches(
                    $Text,
                    "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
                ) | ForEach-Object { $_.Value } | Sort-Object -Unique
            )
            foreach ($Email in $EmailMatches) {
                if ($Email -notmatch "^\d+x\d+@\d+x\.png$") {
                    $EmailFindings += [pscustomobject]@{
                        Rule = "电子邮箱"
                        File = $File
                    }
                }
            }
        }
    }
}

$AllFindings = @($Findings + $EmailFindings | Sort-Object Rule, File -Unique)
if ($AllFindings.Count -gt 0) {
    foreach ($Finding in $AllFindings) {
        $RelativePath = $Finding.File.Substring($ProjectRoot.Length).TrimStart("\")
        Write-Host "敏感模式命中：$($Finding.Rule) | 文件：$RelativePath"
    }
    throw "发布审计失败：检测到敏感数据或本机路径。"
}

Write-Host "发布审计通过：便携包仅包含主程序，敏感模式命中 0。"
