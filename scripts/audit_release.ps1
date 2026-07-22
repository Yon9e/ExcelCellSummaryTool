[CmdletBinding()]
param(
    [string]$Version = "0.2.7",
    [ValidatePattern('^[A-Za-z0-9._-]+$')]
    [string]$PortableDirectoryName = "portable",
    [switch]$StructureOnly
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ReleaseDir = Join-Path $ProjectRoot "release"
$PortableRoot = Join-Path $ReleaseDir "$PortableDirectoryName\FADT"
$PortableExe = Join-Path $PortableRoot "FADT.exe"
$PortableOcrRoot = Join-Path $PortableRoot "umi-ocr"
$PortableZip = Join-Path $ReleaseDir "FADT-v$Version-win64-portable.zip"
$SetupExe = Join-Path $ReleaseDir "FADT-v$Version-win64-setup.exe"
$ReleaseNotes = Join-Path $ReleaseDir "RELEASE_NOTES.md"
$HashFile = Join-Path $ReleaseDir "SHA256SUMS.txt"
$LicenseFile = Join-Path $ProjectRoot "LICENSE"
$ThirdPartyNotice = Join-Path $ProjectRoot "THIRD_PARTY_NOTICES.md"
$ThirdPartyLicensesRoot = Join-Path $ProjectRoot "THIRD_PARTY_LICENSES"
$PortableThirdPartyLicensesRoot = Join-Path $PortableRoot "THIRD_PARTY_LICENSES"
$QuickAccessScript = Join-Path $ProjectRoot "src-tauri\resources\list_quick_access.ps1"
$PortableQuickAccessScript = Join-Path $PortableRoot "list_quick_access.ps1"
$RuntimeSource = Join-Path $ProjectRoot "third_party\umi-ocr\runtime"
$RuntimeManifest = Join-Path $ProjectRoot "third_party\umi-ocr\manifest.json"

if (-not (Test-Path -LiteralPath $ThirdPartyLicensesRoot -PathType Container)) {
    throw "发布审计失败：缺少第三方许可目录 $ThirdPartyLicensesRoot"
}
$ThirdPartyLicenseFiles = @(Get-ChildItem -LiteralPath $ThirdPartyLicensesRoot -File -Force)
if ($ThirdPartyLicenseFiles.Count -eq 0) {
    throw "发布审计失败：第三方许可目录为空。"
}

$RequiredFiles = @(
    $PortableExe,
    (Join-Path $PortableOcrRoot "Umi-OCR.exe"),
    (Join-Path $PortableRoot "LICENSE"),
    (Join-Path $PortableRoot "THIRD_PARTY_NOTICES.md"),
    $PortableZip,
    $SetupExe,
    $ReleaseNotes,
    $HashFile,
    $LicenseFile,
    $ThirdPartyNotice,
    $QuickAccessScript,
    $PortableQuickAccessScript,
    $RuntimeManifest
)
$RequiredFiles += @($ThirdPartyLicenseFiles | Select-Object -ExpandProperty FullName)
$RequiredFiles += @(
    $ThirdPartyLicenseFiles |
        ForEach-Object { Join-Path $PortableThirdPartyLicensesRoot $_.Name }
)
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

$Manifest = Get-Content -LiteralPath $RuntimeManifest -Raw | ConvertFrom-Json
$RuntimePackage = Join-Path $ProjectRoot "third_party\umi-ocr\downloads\Umi-OCR_Rapid_v$($Manifest.version).7z.exe"
if (-not (Test-Path -LiteralPath $RuntimePackage -PathType Leaf)) {
    throw "发布审计失败：缺少已校验的 Umi-OCR 原始包。"
}
$RuntimePackageHash = Get-FileSha256Hex -Path $RuntimePackage
if ($RuntimePackageHash -ne ([string]$Manifest.sha256).ToLowerInvariant()) {
    throw "发布审计失败：Umi-OCR 原始包 SHA-256 与清单不一致。"
}

function Get-RelativePathText {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BasePath,
        [Parameter(Mandatory = $true)]
        [string]$FullPath
    )

    return $FullPath.Substring($BasePath.Length).TrimStart("\", "/")
}

$ForbiddenState = @(
    "umi-ocr\UmiOCR-data\.settings",
    "umi-ocr\UmiOCR-data\.pre_settings"
)
foreach ($RelativePath in $ForbiddenState) {
    if (Test-Path -LiteralPath (Join-Path $PortableRoot $RelativePath)) {
        throw "发布审计失败：便携包包含 OCR 用户设置 $RelativePath"
    }
}
if (Test-Path -LiteralPath (Join-Path $PortableOcrRoot "UmiOCR-data\logs")) {
    throw "发布审计失败：便携包包含 OCR 日志目录。"
}

$ForbiddenUserFiles = @(
    Get-ChildItem -LiteralPath $PortableRoot -File -Recurse -Force |
        Where-Object {
            $_.Name -in @("schemes.json", ".settings", ".pre_settings") -or
            $_.Extension -in @(".log", ".tmp", ".bak", ".xlsx", ".xlsm", ".xltx", ".xltm")
        }
)
if ($ForbiddenUserFiles.Count -gt 0) {
    $Names = ($ForbiddenUserFiles | Select-Object -First 10 -ExpandProperty FullName) -join [Environment]::NewLine
    throw "发布审计失败：便携包包含用户配置、日志或业务文件：$Names"
}

$RuntimeSourceFiles = @(Get-ChildItem -LiteralPath $RuntimeSource -File -Recurse -Force)
$ExpectedPortableFiles = @(
    "FADT.exe",
    "LICENSE",
    "THIRD_PARTY_NOTICES.md",
    "list_quick_access.ps1"
)
$ExpectedPortableFiles += @(
    $ThirdPartyLicenseFiles | ForEach-Object { "THIRD_PARTY_LICENSES\$($_.Name)" }
)
$ExpectedPortableFiles += @(
    $RuntimeSourceFiles | ForEach-Object {
        $Relative = Get-RelativePathText -BasePath $RuntimeSource -FullPath $_.FullName
        "umi-ocr\$Relative"
    }
)
$ExpectedPortableFiles = @($ExpectedPortableFiles | Sort-Object -Unique)
$ActualPortableFiles = @(
    Get-ChildItem -LiteralPath $PortableRoot -File -Recurse -Force |
        ForEach-Object { Get-RelativePathText -BasePath $PortableRoot -FullPath $_.FullName } |
        Sort-Object -Unique
)
$PortableDifference = @(Compare-Object -ReferenceObject $ExpectedPortableFiles -DifferenceObject $ActualPortableFiles)
if ($PortableDifference.Count -gt 0) {
    $Preview = ($PortableDifference | Select-Object -First 20 | Format-Table -AutoSize | Out-String).Trim()
    throw "发布审计失败：便携目录文件清单与白名单不一致。`n$Preview"
}

foreach ($SourceFile in $RuntimeSourceFiles) {
    $Relative = Get-RelativePathText -BasePath $RuntimeSource -FullPath $SourceFile.FullName
    $PortableFile = Join-Path $PortableOcrRoot $Relative
    if ((Get-Item -LiteralPath $PortableFile).Length -ne $SourceFile.Length) {
        throw "发布审计失败：OCR 文件大小不一致：$Relative"
    }
}

$CriticalPairs = @(
    @((Join-Path $RuntimeSource "Umi-OCR.exe"), (Join-Path $PortableOcrRoot "Umi-OCR.exe")),
    @($LicenseFile, (Join-Path $PortableRoot "LICENSE")),
    @($ThirdPartyNotice, (Join-Path $PortableRoot "THIRD_PARTY_NOTICES.md")),
    @($QuickAccessScript, $PortableQuickAccessScript)
)
foreach ($ThirdPartyLicenseFile in $ThirdPartyLicenseFiles) {
    $CriticalPairs += ,@(
        $ThirdPartyLicenseFile.FullName,
        (Join-Path $PortableThirdPartyLicensesRoot $ThirdPartyLicenseFile.Name)
    )
}
foreach ($Pair in $CriticalPairs) {
    if ((Get-FileSha256Hex -Path $Pair[0]) -ne (Get-FileSha256Hex -Path $Pair[1])) {
        throw "发布审计失败：关键文件哈希不一致：$($Pair[1])"
    }
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$Archive = [System.IO.Compression.ZipFile]::OpenRead($PortableZip)
try {
    $ArchiveFileEntries = @($Archive.Entries | Where-Object { -not [string]::IsNullOrEmpty($_.Name) })
    $ExpectedArchiveNames = @(
        $ExpectedPortableFiles | ForEach-Object { "FADT/$($_.Replace('\', '/'))" }
    )
    $ActualArchiveNames = @(
        $ArchiveFileEntries.FullName |
            ForEach-Object { $_.Replace("\", "/") } |
            Sort-Object -Unique
    )
    $ArchiveDifference = @(Compare-Object -ReferenceObject $ExpectedArchiveNames -DifferenceObject $ActualArchiveNames)
    if ($ArchiveDifference.Count -gt 0) {
        $Preview = ($ArchiveDifference | Select-Object -First 20 | Format-Table -AutoSize | Out-String).Trim()
        throw "发布审计失败：便携压缩包条目与白名单不一致。`n$Preview"
    }

    foreach ($Entry in $ArchiveFileEntries) {
        $NormalizedEntryName = $Entry.FullName.Replace("\", "/")
        $Relative = $NormalizedEntryName.Substring("FADT/".Length).Replace("/", "\")
        $StageFile = Join-Path $PortableRoot $Relative
        if ($Entry.Length -ne (Get-Item -LiteralPath $StageFile).Length) {
            throw "发布审计失败：压缩包条目大小不一致：$($Entry.FullName)"
        }
    }
} finally {
    $Archive.Dispose()
}

$ExpectedHashes = [ordered]@{
    "FADT-v$Version-win64-portable.zip" = Get-FileSha256Hex -Path $PortableZip
    "FADT-v$Version-win64-setup.exe" = Get-FileSha256Hex -Path $SetupExe
}
$HashText = Get-Content -LiteralPath $HashFile -Raw
foreach ($Item in $ExpectedHashes.GetEnumerator()) {
    if ($HashText -notmatch "(?im)^$([regex]::Escape($Item.Value))\s+$([regex]::Escape($Item.Key))\r?$") {
        throw "发布审计失败：SHA256SUMS.txt 缺少或写错 $($Item.Key)"
    }
}
if ($StructureOnly) {
    Write-Host "发布结构审计通过：$($ActualPortableFiles.Count) 个便携文件全部在白名单内，压缩包条目和 SHA-256 清单一致。"
    return
}

$UserProfilePattern = [regex]::Escape([System.IO.Path]::GetFullPath($env:USERPROFILE))
$ProjectRootPattern = [regex]::Escape([System.IO.Path]::GetFullPath($ProjectRoot))
$SensitivePatterns = [ordered]@{
    "云服务访问密钥" = "AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}"
    "GitHub或平台令牌" = "gh[pousr]_[0-9A-Za-z]{30,}|github_pat_[0-9A-Za-z_]{20,}|xox[baprs]-[0-9A-Za-z-]{20,}"
    "API密钥" = "sk-(?:proj-)?[0-9A-Za-z_-]{20,}"
    "私钥内容" = "BEGIN [A-Z ]*PRIVATE KEY"
    "明文凭据赋值" = "(?i)(?:api[_-]?key|secret|password|passwd|access[_-]?token|refresh[_-]?token)\s*[:=]\s*[`"'][^`"'\r\n]{8,}[`"']"
    "Windows用户绝对路径" = "(?i)[A-Z]:\\Users\\[^\\/\x00\r\n]+"
    "本机用户目录" = "(?i)$UserProfilePattern"
    "本机项目目录" = "(?i)$ProjectRootPattern"
}

$TrackedPaths = @(git -c core.quotepath=false -C $ProjectRoot ls-files --cached --others --exclude-standard)
if ($LASTEXITCODE -ne 0) {
    throw "发布审计失败：无法读取 Git 跟踪文件清单。"
}
$TrackedFiles = @(
    $TrackedPaths |
        ForEach-Object { Join-Path $ProjectRoot $_ } |
        Where-Object { Test-Path -LiteralPath $_ -PathType Leaf }
)
$ReleaseScanFiles = @(
    $PortableExe,
    $SetupExe,
    $ReleaseNotes,
    $HashFile,
    (Join-Path $PortableRoot "LICENSE"),
    (Join-Path $PortableRoot "THIRD_PARTY_NOTICES.md")
)
$ScanFiles = @($TrackedFiles + $ReleaseScanFiles | Sort-Object -Unique)
$Findings = @()

foreach ($File in $ScanFiles) {
    $Bytes = [System.IO.File]::ReadAllBytes($File)
    $Texts = @(
        [System.Text.Encoding]::ASCII.GetString($Bytes),
        # 规则仅匹配 ASCII 字符；UTF-8 对这些规则与 ASCII 扫描重复。
        [System.Text.Encoding]::Unicode.GetString($Bytes)
    )
    foreach ($Pattern in $SensitivePatterns.GetEnumerator()) {
        foreach ($Text in $Texts) {
            if ([regex]::IsMatch($Text, $Pattern.Value)) {
                $Findings += [pscustomobject]@{ Rule = $Pattern.Key; File = $File }
                break
            }
        }
    }
}

$RuntimePathPatterns = [ordered]@{
    "OCR运行时包含本机用户目录" = "(?i)$UserProfilePattern"
    "OCR运行时包含本机项目目录" = "(?i)$ProjectRootPattern"
}
$RuntimeFiles = @(
    Get-ChildItem -LiteralPath $PortableOcrRoot -File -Recurse -Force |
        Select-Object -ExpandProperty FullName
)
foreach ($File in $RuntimeFiles) {
    $Bytes = [System.IO.File]::ReadAllBytes($File)
    $Texts = @(
        [System.Text.Encoding]::ASCII.GetString($Bytes),
        # OCR 运行时路径规则仅含 ASCII 字符；无需重复 UTF-8 解码。
        [System.Text.Encoding]::Unicode.GetString($Bytes)
    )
    foreach ($Pattern in $RuntimePathPatterns.GetEnumerator()) {
        foreach ($Text in $Texts) {
            if ([regex]::IsMatch($Text, $Pattern.Value)) {
                $Findings += [pscustomobject]@{ Rule = $Pattern.Key; File = $File }
                break
            }
        }
    }
}

$AllFindings = @($Findings | Sort-Object Rule, File -Unique)
if ($AllFindings.Count -gt 0) {
    foreach ($Finding in $AllFindings) {
        $RelativePath = if ($Finding.File.StartsWith($ProjectRoot)) {
            Get-RelativePathText -BasePath $ProjectRoot -FullPath $Finding.File
        } else {
            $Finding.File
        }
        Write-Host "敏感模式命中：$($Finding.Rule) | 文件：$RelativePath"
    }
    throw "发布审计失败：检测到敏感数据或本机路径。"
}

Write-Host "发布审计通过：$($ActualPortableFiles.Count) 个便携文件全部在白名单内，压缩包条目一致，敏感模式命中 0。"
