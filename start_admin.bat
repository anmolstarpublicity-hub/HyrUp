@echo off
echo ========================================
echo   HyrUp Admin Dashboard - Starting...
echo ========================================

set HYRUP_DATA_DIR=C:\HyrUp_Data
set HYRUP_API_KEY=e616fffda5c50197244bec1d41d5387cb03bdd6a2ec27fd5a3ce428dfd518f05

:: Kill any existing API on port 5001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5001 " ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

:: Kill any existing ngrok
taskkill /f /im ngrok.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo [1/3] Starting Ngrok tunnel...
start "HyrUp Ngrok" cmd /k "C:\HyrUp\ngrok.exe http 5001"
timeout /t 8 /nobreak >nul

echo [2/3] Starting Central API on port 5001...
start "HyrUp API" cmd /k "set HYRUP_DATA_DIR=C:\HyrUp_Data && set HYRUP_API_KEY=e616fffda5c50197244bec1d41d5387cb03bdd6a2ec27fd5a3ce428dfd518f05 && python C:\HyrUp\central_api.py"

echo Waiting for API to start...
timeout /t 5 /nobreak >nul

echo [3/3] Starting React Dashboard...
start "HyrUp Dashboard" cmd /k "cd C:\HyrUp\hyrup-frontend && npm run dev"

timeout /t 15 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================
echo All services running:
echo   Ngrok:     http://localhost:4040
echo   API:       http://localhost:5001
echo   Dashboard: http://localhost:5173
echo ========================================
echo Do NOT close any windows.
pause >nul
