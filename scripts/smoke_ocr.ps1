[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ImagePath,
    [int]$Port = 12240
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$RuntimeSource = Join-Path $ProjectRoot "third_party\umi-ocr\runtime"
$RuntimeExe = Join-Path $RuntimeSource "Umi-OCR.exe"
$ResolvedImage = (Resolve-Path -LiteralPath $ImagePath).Path
$TempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$SmokeRoot = Join-Path $TempRoot "ExcelCellSummaryTool-ocr-smoke-$PID"
$StartedProcess = $null

if (-not (Test-Path -LiteralPath $RuntimeExe -PathType Leaf)) {
    throw "缺少 Umi-OCR 运行时，请先执行 scripts\setup_umi_ocr.ps1。"
}
if (-not $SmokeRoot.StartsWith($TempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "OCR 冒烟测试目录不在系统临时目录内。"
}

try {
    Copy-Item -LiteralPath $RuntimeSource -Destination $SmokeRoot -Recurse -Force
    $DataDir = Join-Path $SmokeRoot "UmiOCR-data"
    $SettingsPath = Join-Path $DataDir ".settings"
    $PreSettingsPath = Join-Path $DataDir ".pre_settings"
    $Settings = @(
        "[Global]",
        "configs_advanced=true",
        "ui.theme=Default Dark",
        "ui.fontFamily=Microsoft YaHei UI",
        "window.startupInvisible=true",
        "window.closeWin2Hide=true",
        "window.hideTrayIcon=true",
        "screenshot.hideWindow=true",
        "server.enable=true",
        "server.host=127.0.0.1",
        "server.port=$Port",
        "logs.saveLogLevel=ERROR",
        "ocr.api=win7_x64_RapidOCR-json"
    ) -join "`n"
    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($SettingsPath, $Settings, $Utf8NoBom)
    $PreSettings = @{
        i18n = "zh_CN"
        opengl = "AA_UseOpenGLES"
        server_port = $Port
        last_pid = 0
        last_ptime = "0"
    } | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText($PreSettingsPath, $PreSettings, $Utf8NoBom)

    $StartedProcess = Start-Process -FilePath (Join-Path $SmokeRoot "Umi-OCR.exe") -ArgumentList "--hide" -WorkingDirectory $SmokeRoot -WindowStyle Hidden -PassThru
    $OptionsUri = "http://127.0.0.1:$Port/api/ocr/get_options"
    $Ready = $false
    for ($Attempt = 0; $Attempt -lt 80; $Attempt++) {
        try {
            $null = Invoke-RestMethod -Uri $OptionsUri -Method Get -TimeoutSec 2
            $Ready = $true
            break
        } catch {
            Start-Sleep -Milliseconds 250
        }
    }
    if (-not $Ready) {
        throw "Umi-OCR 服务未在 20 秒内启动。"
    }

    $ImageBytes = [System.IO.File]::ReadAllBytes($ResolvedImage)
    $Payload = @{
        base64 = [Convert]::ToBase64String($ImageBytes)
        options = @{
            "data.format" = "dict"
            "tbpu.parser" = "multi_none"
            "ocr.limit_side_len" = 4320
        }
    } | ConvertTo-Json -Depth 5 -Compress
    $Response = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/ocr" -Method Post -Body $Payload -ContentType "application/json" -TimeoutSec 90
    if ([int]$Response.code -ne 100) {
        throw "Umi-OCR 返回异常状态码：$($Response.code)"
    }
    $Items = @($Response.data)
    [pscustomobject]@{
        Code = [int]$Response.code
        Items = $Items.Count
        Seconds = [double]$Response.time
        FirstText = if ($Items.Count -gt 0) { [string]$Items[0].text } else { "" }
    }
} finally {
    for ($CleanupAttempt = 0; $CleanupAttempt -lt 20; $CleanupAttempt++) {
        $SmokeProcesses = @(
            Get-Process -ErrorAction SilentlyContinue |
                Where-Object {
                    $_.Path -and $_.Path.StartsWith($SmokeRoot, [System.StringComparison]::OrdinalIgnoreCase)
                }
        )
        foreach ($Process in $SmokeProcesses) {
            Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
        }

        if (-not (Test-Path -LiteralPath $SmokeRoot)) {
            break
        }
        $ResolvedSmokeRoot = (Resolve-Path -LiteralPath $SmokeRoot).Path
        if (-not $ResolvedSmokeRoot.StartsWith($TempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "拒绝清理临时目录之外的路径：$ResolvedSmokeRoot"
        }
        try {
            Remove-Item -LiteralPath $ResolvedSmokeRoot -Recurse -Force
            break
        } catch {
            if ($CleanupAttempt -eq 19) {
                throw "OCR 冒烟测试临时目录清理失败：$($_.Exception.Message)"
            }
            Start-Sleep -Milliseconds 250
        }
    }
}
