@echo off
chcp 65001
echo Starting Mabinogi Mobile Recipe Helper...
echo.
echo Installing Flask if needed...
pip install -r requirements.txt
echo.
echo Starting backend server...
start /B python backend.py
echo.
echo Waiting for backend to start...
timeout /t 3 /nobreak >nul
echo.
echo Opening browser...
start http://localhost:8000
echo.
echo Backend server is running on http://localhost:8000
echo Press Ctrl+C to stop the server
pause
