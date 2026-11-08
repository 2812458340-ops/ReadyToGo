<#
Register a Windows scheduled task that refreshes ReadyToGo risk data every day
at 00:00 local time.

Usage (normal PowerShell, no admin needed for the current user):
    powershell -ExecutionPolicy Bypass -File scripts\install_daily_task.ps1

Optional:
    -Python C:\path\to\python.exe
    -Time 00:00
    -TaskName ReadyToGo-DailyRiskUpdate
    -BuildHap          also rebuild the signed HarmonyOS HAP after syncing

After registration:
    schtasks /Query /TN ReadyToGo-DailyRiskUpdate
    schtasks /Run   /TN ReadyToGo-DailyRiskUpdate
#>
param(
    [string]$Python = "",
    [string]$Time = "00:00",
    [string]$TaskName = "ReadyToGo-DailyRiskUpdate",
    [switch]$BuildHap
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

if (-not $Python) {
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd) { $Python = $cmd.Source }
}
$pyArgs = ""
if (-not $Python) {
    $cmd = Get-Command py -ErrorAction SilentlyContinue
    if ($cmd) {
        $Python = $cmd.Source
        $pyArgs = "-3"
    }
}
if (-not $Python) {
    throw "Python not found. Re-run with: -Python C:\path\to\python.exe"
}

$runner = Join-Path $root "scripts\run_daily_update.cmd"
$hapArg = if ($BuildHap) { " --build-hap" } else { "" }
$content = "@echo off`r`n`"$Python`" $pyArgs `"$root\scripts\daily_update.py`"$hapArg`r`n"
Set-Content -LiteralPath $runner -Value $content -Encoding ASCII

Write-Host "Python : $Python"
Write-Host "Script : $root\scripts\daily_update.py"
Write-Host "Runner : $runner"
Write-Host "Time   : $Time daily"

$registered = $false
try {
    $action = New-ScheduledTaskAction -Execute $runner -WorkingDirectory $root
    $trigger = New-ScheduledTaskTrigger -Daily -At $Time
    $settings = New-ScheduledTaskSettingsSet `
        -StartWhenAvailable `
        -ExecutionTimeLimit (New-TimeSpan -Hours 2)
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Description "ReadyToGo: refresh official travel-risk data every day at $Time" `
        -Force | Out-Null
    $registered = $true
} catch {
    Write-Warning "Register-ScheduledTask failed: $($_.Exception.Message)"
}

if (-not $registered) {
    $tr = '"' + $runner + '"'
    schtasks /Create /F /SC DAILY /ST $Time /TN $TaskName /TR $tr | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Could not register scheduled task."
    }
}

Write-Host ""
Write-Host "Registered task '$TaskName' at $Time every day."
Write-Host "Check : schtasks /Query /TN `"$TaskName`""
Write-Host "Run   : schtasks /Run   /TN `"$TaskName`""
Write-Host "Log   : $root\logs\daily_update.log"
