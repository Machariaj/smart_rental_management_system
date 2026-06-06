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
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH.
    echo.
    echo Please install Python 3.10 or higher from:
    echo   https://www.python.org/downloads/
    echo.
    echo IMPORTANT: During installation, check the box that says
    echo            "Add Python to PATH"
    echo.
    pause
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VER=%%i
echo [OK] Python %PYTHON_VER% detected

:: ── 2. Check Node.js ───────────────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo.
    echo Please install Node.js 18 or higher from:
    echo   https://nodejs.org/en/download/
    echo.
    pause
    exit /b 1
)
for /f %%i in ('node --version 2^>^&1') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER% detected

:: ── 3. Check MySQL is running ──────────────────────────────────────────────
echo [..] Checking MySQL connection...
python -c "import pymysql; pymysql.connect(host='localhost',user='root',password='')" >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Cannot connect to MySQL.
    echo.
    echo Make sure MySQL is running before continuing.
    echo If you are using XAMPP, open the XAMPP Control Panel
    echo and click Start next to MySQL.
    echo.
    pause
    exit /b 1
)
echo [OK] MySQL is running

:: ── 4. Backend setup ───────────────────────────────────────────────────────
echo.
echo  -- Backend Setup --
echo.
cd /d "%~dp0backend"

:: Create virtual environment
if not exist "venv" (
    echo [..] Creating Python virtual environment...
    python -m venv venv
    echo [OK] Virtual environment created
) else (
    echo [OK] Virtual environment already exists
)

:: Activate venv
call venv\Scripts\activate.bat

:: Upgrade pip silently
python -m pip install --upgrade pip -q

:: Install Python packages
echo [..] Installing Python packages (this may take a minute)...
pip install -r requirements.txt -q
if errorlevel 1 (
    echo [ERROR] Failed to install Python packages. Check your internet connection.
    pause
    exit /b 1
)
echo [OK] Python packages installed

:: Create .env if missing
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

:: Create database and tables
echo [..] Setting up database...
python -c "
import pymysql
try:
    conn = pymysql.connect(host='localhost', user='root', password='', charset='utf8mb4')
    cursor = conn.cursor()
    cursor.execute('CREATE DATABASE IF NOT EXISTS realestate_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
    conn.commit()
    conn.close()
    print('[OK] Database ready')
except Exception as e:
    print(f'[ERROR] Database setup failed: {e}')
    exit(1)
"
if errorlevel 1 (
    pause
    exit /b 1
)

:: Run FastAPI once briefly to create all tables via SQLAlchemy
echo [..] Initialising database tables...
python -c "
from app.database import Base, engine
from app import models
Base.metadata.create_all(bind=engine)
print('[OK] Database tables created')
"
if errorlevel 1 (
    echo [ERROR] Could not create database tables. Check your DATABASE_URL in backend\.env
    pause
    exit /b 1
)

:: ── 5. Frontend setup ──────────────────────────────────────────────────────
echo.
echo  -- Frontend Setup --
echo.
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo [..] Installing Node.js packages (this may take a few minutes)...
    call npm install --silent
    if errorlevel 1 (
        echo [ERROR] Failed to install Node.js packages. Check your internet connection.
        pause
        exit /b 1
    )
    echo [OK] Node.js packages installed
) else (
    echo [OK] Node.js packages already installed
)

:: ── 6. Launch both servers ─────────────────────────────────────────────────
echo.
echo  ==========================================
echo    Launching Application
echo  ==========================================
echo.
echo  Backend  : http://localhost:8000
echo  Frontend : http://localhost:5173
echo  API Docs : http://localhost:8000/docs
echo.
echo  Two windows will open — one for each server.
echo  Keep them running while using the app.
echo  Close them to stop the application.
echo.

:: Start backend in a new window
start "SMART Rental - Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && echo. && echo  Backend running at http://localhost:8000 && echo  Press Ctrl+C to stop && echo. && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Short pause so backend gets a head start
timeout /t 4 /nobreak >nul

:: Start frontend in a new window
start "SMART Rental - Frontend (React)" cmd /k "cd /d "%~dp0frontend" && echo. && echo  Frontend running at http://localhost:5173 && echo  Press Ctrl+C to stop && echo. && npm run dev"

echo  Setup complete. The application is starting...
echo.
pause
