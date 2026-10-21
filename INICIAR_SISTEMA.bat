@echo off
title Importadora de productos - Frontend Serverless
color 0A
echo ========================================================
echo    INICIANDO SISTEMA: IMPORTADORA DE PRODUCTOS
echo    Arquitectura: Angular 19 + Google Cloud Firebase
echo    100%% Serverless - Sin necesidad de MySQL ni PHP
echo ========================================================
echo.

cd /d "%~dp0"
cd frontend

echo Iniciando Servidor Frontend (Angular en puerto 4200)...
start "Frontend Web - Puerto 4200" npm start

echo.
echo ========================================================
echo  Sistema iniciado correctamente:
echo   - Catalogo Clientes: http://localhost:4200/
echo   - Panel Admin:       http://localhost:4200/#/admin/login
echo   - Admin autorizado:  cruz.arias.beymar@itsecsucre.edu.bo
echo ========================================================
echo.
pause
