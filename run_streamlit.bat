@echo off
echo ========================================================
echo   Launching University Library Management Streamlit App
echo ========================================================
echo.
cd /d "%~dp0"
"C:\Users\DHEV\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m streamlit run streamlit_app.py --server.port 8501
pause
