@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo     🌾 KisanClaim MCP - wHACKiest 2026 Launcher
echo ===================================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: 1. Check Python virtual environment
if not exist "venv\Scripts\python.exe" (
    echo [INFO] Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment. Please ensure Python 3.11+ is installed.
        exit /b 1
    )
    echo [INFO] Installing backend dependencies...
    venv\Scripts\python.exe -m pip install -r backend\requirements.txt
)

:: 2. Check Frontend dependencies
if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

:: 3. Seed Database
echo [INFO] Initializing SQLite database and seed data...
set "PYTHONIOENCODING=utf-8"
venv\Scripts\python.exe -m backend.seed

echo.
echo ===================================================
echo   Starting KisanClaim MCP Services:
echo   🌾 Farmer Mobile App:       http://localhost:5173
echo   🛡️ Insurer Review Console:  http://localhost:5173 (Click Insurer Console in header)
echo   ⚙️ Backend API & Docs:      http://localhost:8000/docs
echo ===================================================
echo.

:: 4. Start Backend Server in a new window
echo [INFO] Launching FastAPI backend on http://localhost:8000...
start "KisanClaim Backend" cmd /k "cd /d "%SCRIPT_DIR%" && set "PYTHONIOENCODING=utf-8" && venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

:: 5. Start Frontend Dev Server in current window
echo [INFO] Launching Vite frontend on http://localhost:5173...
cd frontend
call npm run dev -- --host

pause
