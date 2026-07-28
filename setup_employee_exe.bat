@echo off
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Please right-click and Run as Administrator!
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
echo [1/3] Copying HyrUp to this PC...
if not exist "C:\HyrUp" mkdir "C:\HyrUp"
copy /Y "%~dp0HyrUpCollector.exe" "C:\HyrUp\HyrUpCollector.exe" >nul
echo       Done.

echo [2/4] Setting Employee Name...
setx HYRUP_EMPLOYEE_NAME "%EMP_NAME%" /M >nul 2>&1
echo       Done.

echo [3/4] Setting Backend API URL...
set "API_URL=https://web-copy-production-a84f.up.railway.app"
setx HYRUP_API_URL "%API_URL%" /M >nul 2>&1
echo       Done.

echo [4/4] Registering silent auto-start on login...
(
echo Set oShell = CreateObject^("WScript.Shell"^)
echo oShell.Environment^("Process"^)^("HYRUP_EMPLOYEE_NAME"^) = "%EMP_NAME%"
echo oShell.Run "C:\HyrUp\HyrUpCollector.exe", 0, False
) > "C:\HyrUp\autostart.vbs"

schtasks /delete /tn "HyrUp" /f >nul 2>&1
schtasks /create /tn "HyrUp" /tr "wscript.exe C:\HyrUp\autostart.vbs" /sc ONLOGON /rl HIGHEST /f /delay 0000:30 >nul 2>&1
echo       Done.

echo.
echo [Starting collector now...]
start "" /B wscript.exe "C:\HyrUp\autostart.vbs"

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo   Employee : %EMP_NAME%
echo   Runs     : Silently on every login
echo   No Python required on this PC
echo ========================================
pause
