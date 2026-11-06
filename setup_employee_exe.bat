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
set /p SUPA_URL="New Supabase Project URL: "
if "%SUPA_URL%"=="" (
    echo ERROR: Supabase URL cannot be empty!
    pause
    exit /b 1
)

set /p SUPA_KEY="Supabase publishable key (sb_publishable_...): "
if "%SUPA_KEY%"=="" (
    echo ERROR: Publishable key cannot be empty!
    pause
    exit /b 1
)
if /I "%SUPA_KEY:~0,10%"=="sb_secret_" (
    echo ERROR: Do not use the Supabase secret/service-role key on employee PCs.
    pause
    exit /b 1
)

echo.
echo Enter the unique collector token configured for this employee in Railway.
set /p COLLECTOR_KEY="Collector token: "
if "%COLLECTOR_KEY%"=="" (
    echo ERROR: Collector token cannot be empty!
    pause
    exit /b 1
)

echo.
set /p API_URL="Railway backend URL (include https://): "
if "%API_URL%"=="" (
    echo ERROR: Backend URL cannot be empty!
    pause
    exit /b 1
)
echo.
echo [1/5] Copying HyrUp to this PC...
if not exist "C:\HyrUp" mkdir "C:\HyrUp"
set "COLLECTOR_EXE=%~dp0HyrUpCollector.exe"
if exist "%~dp0HyrUpCollector_Windows7_x64.exe" set "COLLECTOR_EXE=%~dp0HyrUpCollector_Windows7_x64.exe"
if not exist "%COLLECTOR_EXE%" (
    echo ERROR: Collector executable was not found beside this installer.
    pause
    exit /b 1
)
copy /Y "%COLLECTOR_EXE%" "C:\HyrUp\HyrUpCollector.exe" >nul
if errorlevel 1 (
    echo ERROR: Could not copy the collector executable.
    pause
    exit /b 1
)
echo       Done.

echo [2/5] Setting Employee Name...
setx HYRUP_EMPLOYEE_NAME "%EMP_NAME%" /M >nul 2>&1
echo       Done.

echo [3/5] Setting Supabase project and collector authentication...
setx SUPABASE_URL "%SUPA_URL%" /M >nul 2>&1
if errorlevel 1 (
    echo ERROR: Could not save the Supabase URL.
    pause
    exit /b 1
)
setx SUPABASE_KEY "%SUPA_KEY%" /M >nul 2>&1
if errorlevel 1 (
    echo ERROR: Could not save the Supabase publishable key.
    pause
    exit /b 1
)
setx HYRUP_COLLECTOR_KEY "%COLLECTOR_KEY%" /M >nul 2>&1
if errorlevel 1 (
    echo ERROR: Could not save the collector token. Run this setup as Administrator.
    pause
    exit /b 1
)
echo       Done.

echo [4/5] Setting Backend API URL...
setx HYRUP_API_URL "%API_URL%" /M >nul 2>&1
if errorlevel 1 (
    echo ERROR: Could not save the backend URL.
    pause
    exit /b 1
)
set "HYRUP_COLLECTOR_KEY=%COLLECTOR_KEY%"
echo       Done.

echo [5/5] Registering silent auto-start on login...
(
echo Set oShell = CreateObject^("WScript.Shell"^)
echo oShell.Environment^("Process"^)^("HYRUP_EMPLOYEE_NAME"^) = "%EMP_NAME%"
echo oShell.Environment^("Process"^)^("SUPABASE_URL"^) = "%SUPA_URL%"
echo oShell.Environment^("Process"^)^("SUPABASE_KEY"^) = "%SUPA_KEY%"
echo oShell.Environment^("Process"^)^("HYRUP_COLLECTOR_KEY"^) = "%COLLECTOR_KEY%"
echo oShell.Environment^("Process"^)^("HYRUP_API_URL"^) = "%API_URL%"
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
echo.
echo Check Desktop for hyrup_startup.log to verify connection.
pause
