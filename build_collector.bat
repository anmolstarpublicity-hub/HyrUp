@echo off
echo ========================================
echo   Building HyrUp Collector.exe
echo ========================================
echo.

echo [1/3] Installing PyInstaller and dependencies...
pip install pyinstaller pygetwindow pynput Pillow supabase python-socketio[client] --quiet
echo       Done.

echo [2/3] Compiling collector.py to .exe...
pyinstaller --onefile ^
  --noconsole ^
  --name HyrUpCollector ^
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

if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo       Done.

echo [3/3] Moving executable...
move /Y dist\HyrUpCollector.exe C:\HyrUp\HyrUpCollector.exe >nul
echo       Done.

echo.
echo ========================================
echo   Build Complete!
echo ========================================
echo   Location: C:\HyrUp\HyrUpCollector.exe
echo.
pause
