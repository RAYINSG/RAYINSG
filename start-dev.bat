@echo off
echo Starting HomeStore dev server...

:: Kill anything using port 8081
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8081"') do taskkill /F /PID %%a >nul 2>&1
echo Port 8081 cleared.

:: ADB reverse
"C:\Users\ChiJu\AppData\Local\Android\platform-tools\adb.exe" reverse tcp:8081 tcp:8081
echo ADB reverse done.

:: Start Metro
set EXPO_TOKEN=Yw5-ITnF1zKcIhocRifedQ2EpRFdgqm0PkNshRHk
cd /d "%~dp0"
npx expo start --localhost
