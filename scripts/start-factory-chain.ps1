param(
  [int]$Port = 8787,
  [switch]$SkipBuild,
  [switch]$Share
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$url = "http://127.0.0.1:$Port/"

Set-Location $projectRoot

function Write-Step($Message) {
  Write-Host ""
  Write-Host "== $Message" -ForegroundColor Cyan
}

function Test-Command($Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Step "Check runtime"
if (-not (Test-Command "node")) {
  throw "Node.js was not found. Please install Node.js 18 or later."
}

if (-not (Test-Command "npm")) {
  throw "npm was not found. Please check your Node.js installation."
}

$nodeMajor = [int]((node -v).TrimStart("v").Split(".")[0])
if ($nodeMajor -lt 18) {
  throw "Node.js is too old. Please use Node.js 18 or later."
}

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  Write-Host "Port $Port is already running. Opening $url" -ForegroundColor Yellow
  Start-Process $url
  return
}

if (-not (Test-Path "node_modules")) {
  Write-Step "Install dependencies"
  npm install
}

if (-not $SkipBuild -or -not (Test-Path "dist\index.html")) {
  Write-Step "Build production files"
  npm run build
}

Write-Step "Start Factory Chain"
$env:PORT = "$Port"
Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c", "cd /d `"$projectRoot`" && npm run start > product-server.log 2> product-server.err.log" `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden

$ready = $false
for ($i = 0; $i -lt 20; $i += 1) {
  Start-Sleep -Milliseconds 500
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/health" -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      $ready = $true
      break
    }
  } catch {
  }
}

if (-not $ready) {
  Write-Host "Server failed to start. Check product-server.err.log." -ForegroundColor Red
  exit 1
}

Write-Host "Factory Chain is running: $url" -ForegroundColor Green
Write-Host "Default account: 13800000001 / 123456"
if ($Share) {
  if (-not (Test-Command "cloudflared")) {
    Write-Host ""
    Write-Host "cloudflared was not found. Local access only for now." -ForegroundColor Yellow
    Write-Host "Install Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
    Write-Host "Then run: powershell -ExecutionPolicy Bypass -File scripts\start-factory-chain.ps1 -Share"
    Start-Process $url
    return
  }

  Write-Host ""
  Write-Host "Creating a public demo link. Copy the https://*.trycloudflare.com URL." -ForegroundColor Cyan
  Write-Host "Keep this window and your computer running during the demo."
  cloudflared tunnel --url $url
  return
}

Start-Process $url
