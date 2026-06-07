@echo off
setlocal enabledelayedexpansion
title SMART Rental Management System - Setup

echo.
echo  ==========================================
echo    SMART Rental Management System
echo    Auto Setup and Start Script
echo  ==========================================
echo.

:: ── 1. Check Python ────────────────────────────────────────────────────────
echo [..] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Python is not installed or not in PATH.
    echo.
    echo Please install Python 3.10 or higher from:
    echo   https://www.python.org/downloads/
    echo.
    echo IMPORTANT: During installation check the box "Add Python to PATH"
    echo.
    goto :error
)
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VER=%%i
echo [OK] Python %PYTHON_VER% detected

:: ── 2. Check Node.js ───────────────────────────────────────────────────────
echo [..] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js is not installed or not in PATH.
    echo.
    echo Please install Node.js 18 or higher from:
    echo   https://nodejs.org/en/download/
    echo.
    goto :error
)
for /f %%i in ('node --version 2^>^&1') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER% detected

:: ── 3. Backend: Virtual environment ───────────────────────────────────────
echo.
echo  -- Backend Setup --
echo.
cd /d "%~dp0backend"

if not exist "venv" (
    echo [..] Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        goto :error
    )
    echo [OK] Virtual environment created
) else (
    echo [OK] Virtual environment already exists
)

call venv\Scripts\activate.bat
python -m pip install --upgrade pip -q

:: ── 4. Install Python packages ─────────────────────────────────────────────
echo [..] Installing Python packages (this may take a few minutes)...
pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to install Python packages.
    echo Check your internet connection and try again.
    goto :error
)
echo [OK] Python packages installed

:: ── 5. Check MySQL ─────────────────────────────────────────────────────────
echo [..] Checking MySQL connection...
python -c "import pymysql; pymysql.connect(host='localhost',user='root',password='')" >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Cannot connect to MySQL.
    echo.
    echo Please start MySQL before running this script:
    echo   - Open XAMPP Control Panel
    echo   - Click Start next to MySQL
    echo   - Then double-click this file again
    echo.
    goto :error
)
echo [OK] MySQL is running

:: ── 6. Create .env if missing ──────────────────────────────────────────────
if not exist ".env" (
    echo [..] Creating .env configuration file...
    (
        echo DATABASE_URL=mysql+pymysql://root:@localhost:3306/realestate_db
        echo.
        echo SECRET_KEY=YCmpq8W4Wz1X_KJkjPrvP3OerulmbjxVapmu4Eg4VFg
        echo ALGORITHM=HS256
        echo ACCESS_TOKEN_EXPIRE_MINUTES=30
        echo.
        echo ANTHROPIC_API_KEY=placeholder
        echo ML_MODEL_PATH=./models
        echo ML_RETRAIN_INTERVAL_DAYS=30
        echo.
        echo CORS_ORIGINS=["http://localhost:5173","http://localhost:8000","http://127.0.0.1:5173"]
    ) > .env
    echo [OK] .env file created
) else (
    echo [OK] .env file already exists
)

:: ── 7. Create database and tables ─────────────────────────────────────────
echo [..] Setting up database...
python -c "
import pymysql
try:
    conn = pymysql.connect(host='localhost', user='root', password='', charset='utf8mb4')
    conn.cursor().execute('CREATE DATABASE IF NOT EXISTS realestate_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
    conn.commit()
    conn.close()
    print('[OK] Database ready')
except Exception as e:
    print(f'[ERROR] {e}')
    exit(1)
"
if errorlevel 1 goto :error

echo [..] Creating database tables...
python -c "
from app.database import Base, engine
from app import models
Base.metadata.create_all(bind=engine)
print('[OK] Tables created')
"
if errorlevel 1 (
    echo [ERROR] Could not create database tables.
    goto :error
)

:: ── 8. Frontend: Install packages ─────────────────────────────────────────
echo.
echo  -- Frontend Setup --
echo.
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo [..] Installing Node.js packages (this may take a few minutes)...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install Node.js packages.
        goto :error
    )
    echo [OK] Node.js packages installed
) else (
    echo [OK] Node.js packages already installed
)

:: ── 9. Launch servers ──────────────────────────────────────────────────────
echo.
echo  ==========================================
echo    Launching Application
echo  ==========================================
echo.
echo  Backend  : http://localhost:8000
echo  Frontend : http://localhost:5173
echo  API Docs : http://localhost:8000/docs
echo.
echo  Two windows will open - one for each server.
echo  Keep them open while using the app.
echo.

start "SMART Rental - Backend" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && echo Backend running at http://localhost:8000 && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 4 /nobreak >nul
start "SMART Rental - Frontend" cmd /k "cd /d "%~dp0frontend" && echo Frontend running at http://localhost:5173 && npm run dev"

echo  Done! Open http://localhost:5173 in your browser.
echo.
pause
exit /b 0

:: ── Error handler ──────────────────────────────────────────────────────────
:error
echo.
echo  ==========================================
echo    Setup failed. Read the error above.
echo  ==========================================
echo.
pause
exit /b 1
