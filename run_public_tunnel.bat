@echo off
echo ========================================================
echo   Launching Cloudflare Public Tunnel for React Library App
echo ========================================================
echo.
cd /d "%~dp0"
cloudflared.exe tunnel --url http://127.0.0.1:5173
pause
