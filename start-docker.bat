@echo off
echo Starting URIV application with Docker...
echo.

echo Building and starting all services...
docker-compose up --build

echo.
echo Application started successfully!
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8000
echo.
pause

