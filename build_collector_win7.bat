@echo off
setlocal
pushd "%~dp0"

echo ========================================
echo   Best-effort Windows 7 x64 build
echo ========================================
echo.
echo This legacy build is unsupported and uses end-of-life packages.
echo Use it only on a Windows 7 SP1 test PC with employee notice/consent.
echo.

py -3.8-64 --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Install 64-bit Python 3.8.10 from python.org first.
    echo This script must be run on the Windows 7 PC to test its compatibility.
    pause
    popd
    exit /b 1
)

py -3.8-64 -c "import struct,sys; print('Python:',sys.version); print('Architecture:',struct.calcsize('P')*8,'bit'); sys.exit(0 if sys.version_info[:2] == (3,8) and struct.calcsize('P') == 8 else 1)"
if errorlevel 1 (
    echo ERROR: This build requires 64-bit Python 3.8.
    pause
    popd
    exit /b 1
)

if not exist "%TEMP%\HyrUpCollectorWin7Venv\Scripts\python.exe" (
    py -3.8-64 -m venv "%TEMP%\HyrUpCollectorWin7Venv"
    if errorlevel 1 (
        echo ERROR: Could not create the isolated Python environment.
        pause
        popd
        exit /b 1
    )
)

"%TEMP%\HyrUpCollectorWin7Venv\Scripts\python.exe" -m pip install --upgrade pip==24.3.1
if errorlevel 1 (
    echo ERROR: Could not install the Python 3.8-compatible pip version.
    pause
    popd
    exit /b 1
)

"%TEMP%\HyrUpCollectorWin7Venv\Scripts\python.exe" -m pip install -r requirements_employee_win7.txt
if errorlevel 1 (
    echo ERROR: Dependency installation failed.
    pause
    popd
    exit /b 1
)

"%TEMP%\HyrUpCollectorWin7Venv\Scripts\pyinstaller.exe" --clean --noconfirm --onefile --noconsole ^
  --name HyrUpCollector_Windows7_x64 ^
  --distpath "%~dp0dist_win7" ^
  --workpath "%TEMP%\HyrUpCollectorWin7Work" ^
  --specpath "%TEMP%\HyrUpCollectorWin7Spec" ^
  --hidden-import=pygetwindow ^
  --hidden-import=pynput ^
  --hidden-import=pynput.keyboard ^
  --hidden-import=pynput.mouse ^
  --hidden-import=PIL ^
  --hidden-import=PIL.ImageGrab ^
  --hidden-import=PIL.Image ^
  --hidden-import=supabase ^
  --hidden-import=socketio ^
  --hidden-import=socketio.client ^
  --hidden-import=engineio ^
  --hidden-import=engineio.client ^
  --hidden-import=websocket ^
  --collect-all=supabase ^
  --collect-all=gotrue ^
  --collect-all=postgrest ^
  --collect-all=realtime ^
  --collect-all=storage3 ^
  collector.py

if errorlevel 1 (
    echo ERROR: PyInstaller build failed. See the output above.
    pause
    popd
    exit /b 1
)

echo.
echo Build created:
echo   %~dp0dist_win7\HyrUpCollector_Windows7_x64.exe
echo Test it on this Windows 7 SP1 PC before installing it on any other PC.
pause
popd
