@echo off
echo ===================================================
echo Starting Library Lending Management System Backend
echo FastAPI Server on http://127.0.0.1:8000
echo Swagger API Docs at http://127.0.0.1:8000/docs
echo ===================================================
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
