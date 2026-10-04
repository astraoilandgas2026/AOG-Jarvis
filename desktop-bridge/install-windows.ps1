$ErrorActionPreference="Stop"
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
if(-not (Get-Command node -ErrorAction SilentlyContinue)){Write-Host "Node.js 20+ is required.";exit 1}
Set-Location $root
npm install
npx playwright install chromium

$startup=[Environment]::GetFolderPath("Startup")
$launcher=Join-Path $root "start-windows.cmd"
@"
@echo off
cd /d "$root"
npm.cmd start
"@ | Set-Content -Encoding ASCII $launcher

$shortcut=Join-Path $startup "Emma Local Bridge.lnk"
$ws=New-Object -ComObject WScript.Shell
$sc=$ws.CreateShortcut($shortcut)
$sc.TargetPath=$launcher
$sc.WorkingDirectory=$root
$sc.WindowStyle=1
$sc.Save()

Write-Host ""
Write-Host "Emma Local Bridge installed."
Write-Host "It will start automatically when Windows logs in."
Write-Host "Manual start: $launcher"
