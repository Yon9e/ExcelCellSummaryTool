[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$shell = New-Object -ComObject Shell.Application
$quickAccess = $shell.Namespace('shell:::{679f85cb-0220-4080-b29b-5540cc05aab6}')
if ($null -eq $quickAccess) { return }

$seen = @{}
foreach ($item in $quickAccess.Items()) {
    $path = [string]$item.Path
    if ($item.IsFolder -and $path -match '^[A-Za-z]:\\|^\\\\' -and (Test-Path -LiteralPath $path -PathType Container) -and -not $seen.ContainsKey($path)) {
        $seen[$path] = $true
        [PSCustomObject]@{ name = [string]$item.Name; path = $path } | ConvertTo-Json -Compress
    }
}
