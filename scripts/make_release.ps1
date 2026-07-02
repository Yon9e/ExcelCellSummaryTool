param(
    [string]$Version = "0.1.0"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ReleaseDir = Join-Path $ProjectRoot "release"
$PortableStage = Join-Path $ReleaseDir "portable\ExcelCellSummaryTool"
$ZipPath = Join-Path $ReleaseDir "ExcelCellSummaryTool-v$Version-win64-portable.zip"
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

New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null
if (Test-Path -LiteralPath (Join-Path $ReleaseDir "portable")) {
    Remove-Item -LiteralPath (Join-Path $ReleaseDir "portable") -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $PortableStage | Out-Null

$Exe = Get-ChildItem -Path (Join-Path $ProjectRoot "dist") -Recurse -Filter "ExcelCellSummaryTool.exe" | Select-Object -First 1
if (-not $Exe) {
    throw "ExcelCellSummaryTool.exe not found under dist."
}

Copy-Item -Path (Join-Path $Exe.DirectoryName "*") -Destination $PortableStage -Recurse -Force
if (Test-Path -LiteralPath $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
}
Compress-Archive -Path $PortableStage -DestinationPath $ZipPath -Force

$SetupPath = Join-Path $ReleaseDir "ExcelCellSummaryTool-v$Version-win64-setup.exe"
$ReleaseNotesWithSetupBase64 = "IyBFeGNlbCDljZXlhYPmoLzlrprlkJHmsYfmgLvlt6XlhbcgdjAuMS4wCgojIyDmlrDlop4KLSDkvb/nlKggUHlTaWRlNiArIFF0IERlc2lnbmVyIOW8gOWPkeeOsOS7oyBXaW5kb3dzIOahjOmdoueVjOmdouOAggotIOS9v+eUqCAudWkg5paH5Lu257u05oqk55WM6Z2i6K6+6K6h44CCCi0g5L2/55SoIHB5c2lkZTYtdWljIOe8luivkeeVjOmdouaWh+S7tuOAggotIOaUr+aMgeaJuemHj+ivu+WPliBFeGNlbCDmlofku7bmjIflrpogU2hlZXQg5ZKM5Y2V5YWD5qC844CCCi0g5pSv5oyB6KeE5YiZ6YWN572u44CB5pa55qGI5L+d5a2Y44CB5pa55qGI6L295YWl44CB5pa55qGI5Yig6Zmk44CCCi0g5pSv5oyB5ZCO5Y+w57q/56iL5omn6KGM77yM6YG/5YWN55WM6Z2i5Y2h5q2744CCCi0g5pSv5oyB6L+b5bqm5p2h44CB5b2T5YmN5paH5Lu254q25oCB44CB5pel5b+X5Yy644CCCi0g5pSv5oyBIHBvcnRhYmxlIHppcCDlkowgSW5ubyBTZXR1cCDlronoo4XljIXjgIIKLSDmlK/mjIEgR2l0SHViIFJlbGVhc2Ug5Y+R5biD5Lqn54mp44CCCgojIyDlip/og70KLSDmlK/mjIEgLnhsc3ggLyAueGxzbSAvIC54bHR4IC8gLnhsdG0g5paH5Lu244CCCi0g6Ieq5Yqo6Lez6L+HIH4kIOS4tOaXtuaWh+S7tuOAggotIOaUr+aMgeS4reaWh+i3r+W+hOOAgeS4reaWh+aWh+S7tuWQjeOAgeS4reaWhyBTaGVldCDlkI3jgIIKLSDmlK/mjIHovpPlh7rnu5PmnpzliLAgRXhjZWwg5paH5Lu244CCCgojIyDkuIvovb0K5pmu6YCa55So5oi35bu66K6u5LiL6L2977yaCkV4Y2VsQ2VsbFN1bW1hcnlUb29sLXYwLjEuMC13aW42NC1zZXR1cC5leGUKCuWFjeWuieijheeUqOaIt+S4i+i9ve+8mgpFeGNlbENlbGxTdW1tYXJ5VG9vbC12MC4xLjAtd2luNjQtcG9ydGFibGUuemlwCgojIyDmoKHpqowK5LiL6L295ZCO5Y+v5L2/55SoIFNIQTI1NlNVTVMudHh0IOagoemqjOaWh+S7tuWujOaVtOaAp+OAggo="
$ReleaseNotesPortableOnlyBase64 = "IyBFeGNlbCDljZXlhYPmoLzlrprlkJHmsYfmgLvlt6XlhbcgdjAuMS4wCgojIyDmlrDlop4KLSDkvb/nlKggUHlTaWRlNiArIFF0IERlc2lnbmVyIOW8gOWPkeeOsOS7oyBXaW5kb3dzIOahjOmdoueVjOmdouOAggotIOS9v+eUqCAudWkg5paH5Lu257u05oqk55WM6Z2i6K6+6K6h44CCCi0g5L2/55SoIHB5c2lkZTYtdWljIOe8luivkeeVjOmdouaWh+S7tuOAggotIOaUr+aMgeaJuemHj+ivu+WPliBFeGNlbCDmlofku7bmjIflrpogU2hlZXQg5ZKM5Y2V5YWD5qC844CCCi0g5pSv5oyB6KeE5YiZ6YWN572u44CB5pa55qGI5L+d5a2Y44CB5pa55qGI6L295YWl44CB5pa55qGI5Yig6Zmk44CCCi0g5pSv5oyB5ZCO5Y+w57q/56iL5omn6KGM77yM6YG/5YWN55WM6Z2i5Y2h5q2744CCCi0g5pSv5oyB6L+b5bqm5p2h44CB5b2T5YmN5paH5Lu254q25oCB44CB5pel5b+X5Yy644CCCi0g5pSv5oyBIHBvcnRhYmxlIHppcCDlkowgSW5ubyBTZXR1cCDlronoo4XljIXjgIIKLSDmlK/mjIEgR2l0SHViIFJlbGVhc2Ug5Y+R5biD5Lqn54mp44CCCgojIyDlip/og70KLSDmlK/mjIEgLnhsc3ggLyAueGxzbSAvIC54bHR4IC8gLnhsdG0g5paH5Lu244CCCi0g6Ieq5Yqo6Lez6L+HIH4kIOS4tOaXtuaWh+S7tuOAggotIOaUr+aMgeS4reaWh+i3r+W+hOOAgeS4reaWh+aWh+S7tuWQjeOAgeS4reaWhyBTaGVldCDlkI3jgIIKLSDmlK/mjIHovpPlh7rnu5PmnpzliLAgRXhjZWwg5paH5Lu244CCCgojIyDkuIvovb0K5b2T5YmN54mI5pys5bey5o+Q5L6b5YWN5a6J6KOF5YyF77yaCkV4Y2VsQ2VsbFN1bW1hcnlUb29sLXYwLjEuMC13aW42NC1wb3J0YWJsZS56aXAKCuWuieijheWMhSBFeGNlbENlbGxTdW1tYXJ5VG9vbC12MC4xLjAtd2luNjQtc2V0dXAuZXhlIOWwhuWcqOacrOacuuWuieijhSBJbm5vIFNldHVwIOWQjuihpeWFheOAggoKIyMg5qCh6aqMCuS4i+i9veWQjuWPr+S9v+eUqCBTSEEyNTZTVU1TLnR4dCDmoKHpqozmlofku7blrozmlbTmgKfjgIIK"
if (Test-Path -LiteralPath $SetupPath) {
    $ReleaseNotesBase64 = $ReleaseNotesWithSetupBase64
} else {
    $ReleaseNotesBase64 = $ReleaseNotesPortableOnlyBase64
}
[System.IO.File]::WriteAllBytes($NotesPath, [System.Convert]::FromBase64String($ReleaseNotesBase64))

$hashLines = @()
$zipHash = Get-Sha256Hex -Path $ZipPath
$hashLines += "$zipHash  ExcelCellSummaryTool-v$Version-win64-portable.zip"
if (Test-Path -LiteralPath $SetupPath) {
    $setupHash = Get-Sha256Hex -Path $SetupPath
    $hashLines += "$setupHash  ExcelCellSummaryTool-v$Version-win64-setup.exe"
}
$hashLines | Set-Content -LiteralPath $HashPath -Encoding ASCII

Write-Host "portable exe: $($Exe.FullName)"
Write-Host "portable zip: $ZipPath"
Write-Host "release notes: $NotesPath"
Write-Host "sha256: $HashPath"
