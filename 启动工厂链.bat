@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-factory-chain.ps1"
if errorlevel 1 (
  echo.
  echo 启动失败，请查看 product-server.err.log。
  pause
)
