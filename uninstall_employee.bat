@echo off
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Please right-click and Run as Administrator!
    pause
    exit /b 1
)

echo ========================================
echo   Removing HyrUp from this PC...
echo ========================================

echo [1/3] Stopping collector...
taskkill /f /im HyrUpCollector.exe >nul 2>&1
taskkill /f /im python.exe >nul 2>&1
echo       Done.

echo [2/3] Removing scheduled task...
schtasks /delete /tn "HyrUp" /f >nul 2>&1
echo       Done.

echo [3/3] Removing files...
del /f /q "C:\HyrUp\HyrUpCollector.exe" >nul 2>&1
del /f /q "C:\HyrUp\autostart.vbs" >nul 2>&1
echo       Done.

echo.
echo ========================================
echo   HyrUp removed successfully.
echo ========================================
pause
