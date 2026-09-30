$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$mysqlDirectory = Join-Path $projectRoot '.runtime/mysql/mysql-8.4.8-winx64'
$mysqlExecutable = Join-Path $mysqlDirectory 'bin/mysqld.exe'
$dataDirectory = Join-Path $projectRoot '.runtime/mysql-data'
if (!(Test-Path -LiteralPath $mysqlExecutable)) { throw 'Extract the official MySQL 8.4.8 Windows ZIP into .runtime/mysql first; see README.md.' }
if (Test-Path -LiteralPath '.runtime/mysql.pid') {
    $savedProcessId=[int](Get-Content -Raw -LiteralPath '.runtime/mysql.pid')
    $existingProcess=Get-Process -Id $savedProcessId -ErrorAction SilentlyContinue
    if ($existingProcess -and $existingProcess.Path -eq $mysqlExecutable) { Write-Output 'Project-local MySQL is already running.'; return }
}
if (!(Test-Path -LiteralPath '.env')) {
    $appPassword = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
    $rootPassword = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    $envText = @"
HOST=127.0.0.1
PORT=3000
APP_ORIGIN=http://127.0.0.1:3000
NODE_ENV=development
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3307
MYSQL_DATABASE=awllahza
MYSQL_USER=awllahza
MYSQL_PASSWORD=$appPassword
ORDERING_ENABLED=true
TEST_MODE=true
"@
    [IO.File]::WriteAllText((Join-Path $projectRoot '.env'), $envText)
    $bootstrap = "ALTER USER 'root'@'localhost' IDENTIFIED BY '$rootPassword';`nCREATE DATABASE IF NOT EXISTS awllahza CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`nCREATE USER IF NOT EXISTS 'awllahza'@'127.0.0.1' IDENTIFIED BY '$appPassword';`nGRANT ALL PRIVILEGES ON awllahza.* TO 'awllahza'@'127.0.0.1';`n"
    [IO.File]::WriteAllText((Join-Path $projectRoot '.runtime/mysql-bootstrap.sql'), $bootstrap)
    [IO.File]::WriteAllText((Join-Path $projectRoot '.runtime/mysql-root-password.txt'), $rootPassword)
}
if (!(Test-Path -LiteralPath $dataDirectory)) {
    & $mysqlExecutable '--no-defaults' '--initialize' "--basedir=$mysqlDirectory" "--datadir=$dataDirectory" '--console' 2> '.runtime/mysql-init.log'
    if ($LASTEXITCODE -ne 0) { throw 'MySQL initialization failed; check .runtime/mysql-init.log.' }
}
$mysqlArgs = @('--no-defaults', "--basedir=`"$mysqlDirectory`"", "--datadir=`"$dataDirectory`"", '--bind-address=127.0.0.1', '--port=3307', '--mysqlx=OFF', '--console')
$bootstrapFile = Join-Path $projectRoot '.runtime/mysql-bootstrap.sql'
if (Test-Path -LiteralPath $bootstrapFile) { $mysqlArgs += "--init-file=`"$bootstrapFile`"" }
$mysqlProcess = Start-Process -FilePath $mysqlExecutable -ArgumentList $mysqlArgs -WindowStyle Hidden -PassThru -RedirectStandardOutput '.runtime/mysql.stdout.log' -RedirectStandardError '.runtime/mysql.stderr.log'
[IO.File]::WriteAllText((Join-Path $projectRoot '.runtime/mysql.pid'), [string]$mysqlProcess.Id)
Write-Output "Started project-local MySQL process $($mysqlProcess.Id) on 127.0.0.1:3307."
