$ErrorActionPreference="Stop"
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
if(-not (Get-Command node -ErrorAction SilentlyContinue)){Write-Host "Node.js 20+ is required.";exit 1}
Set-Location $root
npm install
npx playwright install chromium
Write-Host ""
Write-Host "Emma Local Bridge installed."
Write-Host "Start with: npm start"
Write-Host "Keep this window running while Emma needs local computer access."
