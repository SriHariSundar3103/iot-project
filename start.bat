@echo off
REM =====================================================
REM QUICK START SCRIPT - Hospital Tool Tracking System
REM =====================================================

setlocal enabledelayedexpansion

echo.
echo ╔═══════════════════════════════════════════════════╗
echo ║   HOSPITAL TOOL TRACKING SYSTEM                   ║
echo ║   Quick Start Script (Windows)                    ║
echo ╚═══════════════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Node.js is not installed!
    echo   Download from: https://nodejs.org
    pause
    exit /b 1
)

echo ✓ Node.js is installed
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ npm is not installed!
    pause
    exit /b 1
)

echo ✓ npm is installed
npm --version

echo.
echo ====== SETUP OPTIONS ======
echo 1. Full Setup (RECOMMENDED - sets up everything)
echo 2. Backend Only
echo 3. Frontend Only
echo 4. Docker Setup
echo 5. View Status
echo 6. Stop All Services
echo.

set /p option="Enter option (1-6): "

if "%option%"=="1" goto FULL_SETUP
if "%option%"=="2" goto BACKEND_SETUP
if "%option%"=="3" goto FRONTEND_SETUP
if "%option%"=="4" goto DOCKER_SETUP
if "%option%"=="5" goto VIEW_STATUS
if "%option%"=="6" goto STOP_SERVICES
echo Invalid option!
goto END

:FULL_SETUP
echo.
echo ========== STEP 1: BACKEND SETUP ==========
cd backend
if not exist "node_modules" (
    echo Installing backend dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ✗ Backend installation failed
        pause
        exit /b 1
    )
    echo ✓ Backend dependencies installed
)
cd ..

echo.
echo ========== STEP 2: FRONTEND SETUP ==========
cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ✗ Frontend installation failed
        pause
        exit /b 1
    )
    echo ✓ Frontend dependencies installed
)
cd ..

echo.
echo ========== STEP 3: ENVIRONMENT SETUP ==========
if not exist "backend\.env" (
    echo Creating backend .env file...
    copy backend\.env.example backend\.env
    echo ⚠️  IMPORTANT: Edit backend\.env with your settings:
    echo   - MONGODB_URI
    echo   - JWT_SECRET
    echo   - GMAIL credentials
)

if not exist "frontend\.env.local" (
    echo Creating frontend .env.local file...
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:5000
        echo NEXT_PUBLIC_WS_URL=http://localhost:5000
    ) > frontend\.env.local
    echo ✓ Frontend .env.local created
)

echo.
echo ========== SETUP COMPLETE ==========
echo.
echo 📝 NEXT STEPS:
echo 1. Edit backend\.env with your MongoDB and email settings
echo 2. Run the system:
echo    - Terminal 1: npm run dev:backend
echo    - Terminal 2: npm run dev:frontend
echo    - Terminal 3: Set up ESP32 and upload code
echo 3. Open http://localhost:3000 in your browser
echo.
goto END

:BACKEND_SETUP
cd backend
if not exist "node_modules" (
    echo Installing backend dependencies...
    call npm install
)
cd ..
echo ✓ Backend setup complete
goto END

:FRONTEND_SETUP
cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)
cd ..
echo ✓ Frontend setup complete
goto END

:DOCKER_SETUP
echo Checking Docker installation...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Docker is not installed!
    echo   Download from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo ✓ Docker is installed
docker --version

echo.
echo Building Docker images...
docker-compose build

echo.
echo Starting services...
docker-compose up -d

echo.
echo ✓ Services started!
echo   Frontend:     http://localhost:3000
echo   Backend:      http://localhost:5000
echo   MongoDB GUI:  http://localhost:8081
echo.
echo View logs: docker-compose logs -f
goto END

:VIEW_STATUS
echo.
echo ========== SYSTEM STATUS ==========
echo.
echo Checking Node.js...
node --version
echo Checking npm...
npm --version
echo Checking backend directory...
if exist "backend\node_modules" (
    echo ✓ Backend dependencies installed
) else (
    echo ✗ Backend dependencies NOT installed
)

echo Checking frontend directory...
if exist "frontend\node_modules" (
    echo ✓ Frontend dependencies installed
) else (
    echo ✗ Frontend dependencies NOT installed
)

echo.
goto END

:STOP_SERVICES
echo Stopping services...
docker-compose down
echo ✓ Services stopped
goto END

:END
echo.
pause
