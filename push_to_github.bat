@echo off
setlocal
echo ====================================================================
echo   Pushing Library Lending Management System to GitHub
echo   Repository: https://github.com/Dhev-Ai/Library-DB
echo ====================================================================
echo.
cd /d "%~dp0"

echo If you have a GitHub Personal Access Token (classic with 'repo' scope),
echo paste it below. (If not, press Enter to try standard login).
echo.
set /p TOKEN="GitHub Token (optional, press Enter to skip): "

if "%TOKEN%"=="" (
    echo.
    echo Attempting standard git push...
    git push -u origin main
) else (
    echo.
    echo Pushing using provided GitHub access token...
    git push -u https://%TOKEN%@github.com/Dhev-Ai/Library-DB.git main
)

echo.
echo ====================================================================
pause
