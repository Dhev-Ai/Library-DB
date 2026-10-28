@echo off
echo ========================================================
echo   Pushing Library Lending Management System to GitHub
echo   Repository: https://github.com/Dhev-Ai/Library-DB
echo ========================================================
echo.
cd /d "%~dp0"
git push -u origin main
echo.
echo If GitHub prompted you in your browser, please confirm authorization.
echo.
pause
