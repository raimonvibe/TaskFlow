# TaskFlow URLs Script (Windows / PowerShell)
# Prints every local interface for the running docker-compose stack.
# Mirrors scripts/urls.sh — run from anywhere; resolves the repo root itself.

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$ports = @{
  FRONTEND_PORT   = 5173
  BACKEND_PORT    = 3000
  GRAFANA_PORT    = 3001
  PROMETHEUS_PORT = 9090
  ADMINER_PORT    = 8080
  POSTGRES_PORT   = 5432
  REDIS_PORT      = 6379
}

$envFile = Join-Path $RepoRoot '.env'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { return }
    if ($line -notmatch '^(?<key>[A-Za-z_][A-Za-z0-9_]*)=(?<value>.*)$') { return }
    $key = $Matches.key
    if (-not $ports.ContainsKey($key)) { return }
    $value = $Matches.value.Trim().Trim('"').Trim("'")
    if ($value -match '^\d+$') {
      $ports[$key] = [int]$value
    }
  }
}

Write-Host 'TaskFlow local interfaces' -ForegroundColor Blue
Write-Host ''
'{0,-13} {1}' -f 'Frontend',    "http://localhost:$($ports.FRONTEND_PORT)"
'{0,-13} {1}' -f 'Backend API', "http://localhost:$($ports.BACKEND_PORT)"
'{0,-13} {1}' -f 'Grafana',     "http://localhost:$($ports.GRAFANA_PORT)  (admin/admin)"
'{0,-13} {1}' -f 'Prometheus',  "http://localhost:$($ports.PROMETHEUS_PORT)"
'{0,-13} {1}' -f 'Adminer',     "http://localhost:$($ports.ADMINER_PORT)  (DB UI)"
'{0,-13} {1}' -f 'Postgres',    "localhost:$($ports.POSTGRES_PORT)  (not a web page - use Adminer or psql)"
'{0,-13} {1}' -f 'Redis',       "localhost:$($ports.REDIS_PORT)  (not a web page - use redis-cli)"
Write-Host ''
Write-Host 'Live status:' -ForegroundColor Green
docker compose ps
