$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
if (!(Test-Path -LiteralPath 'node_modules/express')) { npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' } }
& (Join-Path $PSScriptRoot 'start-local.ps1')
node --env-file=.env scripts/prepare-local.js
if ($LASTEXITCODE -ne 0) { throw 'Local preparation failed.' }
try {
    $health=Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 3
    if ($health.app -eq 'awllahza-orders') { Write-Output 'Awl Lahza is already running: http://127.0.0.1:3000'; return }
} catch { }
$nodeExecutable=(Get-Command node).Source
$appProcess=Start-Process -FilePath $nodeExecutable -ArgumentList @('--env-file=.env','server/index.js') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput '.runtime/app.stdout.log' -RedirectStandardError '.runtime/app.stderr.log'
[IO.File]::WriteAllText((Join-Path $projectRoot '.runtime/app.pid'),[string]$appProcess.Id)
$appReady=$false
for ($attempt=0; $attempt -lt 30; $attempt++) {
    if ($appProcess.HasExited) { throw 'Application exited during startup; check .runtime/app.stderr.log.' }
    try {
        $health=Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2
        if ($health.app -eq 'awllahza-orders') { $appReady=$true; break }
    } catch { }
    Start-Sleep -Milliseconds 500
}
if (!$appReady) { throw 'Application did not become ready on port 3000; check .runtime/app.stderr.log.' }
Write-Output 'Awl Lahza: http://127.0.0.1:3000'
Write-Output 'Admin: http://127.0.0.1:3000/admin'
Write-Output 'Local credentials: .runtime/admin-access.txt'
