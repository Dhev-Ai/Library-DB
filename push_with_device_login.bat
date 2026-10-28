@echo off
echo ========================================================
echo   Connecting Git to GitHub (Dhev-Ai/Library-DB)
echo ========================================================
echo.
cd /d "%~dp0"

echo Step 1: Authorizing GitHub account...
echo (If a code appears below, open https://github.com/login/device and enter it)
echo.
"C:\Program Files\Git\mingw64\bin\git-credential-manager.exe" github login --device

echo.
echo Step 2: Pushing code to GitHub...
git push -u origin main

echo.
echo ========================================================
echo   Done! Check https://github.com/Dhev-Ai/Library-DB
echo ========================================================
pause
