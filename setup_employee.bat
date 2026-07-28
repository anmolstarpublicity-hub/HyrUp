@echo off
cd /d %SystemRoot%

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Please run as Administrator!
    pause
    exit /b 1
)

echo ========================================
echo        HyrUp Employee Setup
echo ========================================
echo.

set /p EMP_NAME="Enter Employee Full Name (e.g. John Smith): "
if "%EMP_NAME%"=="" (
    echo ERROR: Employee name cannot be empty!
    pause
    exit /b 1
)

echo.
echo [1/3] Setting Employee Name and API URL...
setx HYRUP_EMPLOYEE_NAME "%EMP_NAME%" /M >nul 2>&1
setx HYRUP_API_URL "https://web-copy-production-a84f.up.railway.app" /M >nul 2>&1
echo       Done.

echo [2/3] Installing dependencies...
pip install -r C:\HyrUp\requirements_employee.txt --quiet
echo       Done.

echo [3/3] Registering auto-start on login...
(
echo Set oShell = CreateObject^("WScript.Shell"^)
echo oShell.Environment^("Process"^)^("HYRUP_EMPLOYEE_NAME"^) = "%EMP_NAME%"
echo oShell.Run "python C:\HyrUp\collector.py", 0, False
) > "C:\HyrUp\autostart.vbs"
schtasks /delete /tn "HyrUp" /f >nul 2>&1
schtasks /create /tn "HyrUp" /tr "wscript.exe C:\HyrUp\autostart.vbs" /sc ONLOGON /rl HIGHEST /f /delay 0000:30 >nul 2>&1
echo       Done.

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo   Employee: %EMP_NAME%
echo   Data goes directly to Supabase cloud.
echo   No network/shared folder needed.
echo.
pause
