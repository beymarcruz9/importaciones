@echo off
title Importadora de productos - Sistema
color 0A
echo ========================================================
echo    INICIANDO SISTEMA: IMPORTADORA DE PRODUCTOS
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Iniciando Servidor Backend (PHP en puerto 8000)...
start "Backend API - Puerto 8000" php -S 0.0.0.0:8000 backend/server.php

timeout /t 2 /nobreak >nul

echo [2/2] Iniciando Servidor Frontend (Angular en puerto 4200)...
cd frontend
start "Frontend Web - Puerto 4200" npm start

echo.
echo ========================================================
echo  Sistema iniciado correctamente:
echo   - Frontend: http://localhost:4200
echo   - Backend:  http://127.0.0.1:8000
echo   - Login:    admin@importadora.com / password123
echo ========================================================
echo.
pause
