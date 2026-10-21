@echo off
title Compartir con Clientes - Cloudflare Tunnel
color 0B
echo ========================================================
echo    GENERANDO LINK PUBLICO PARA CLIENTES (CLOUDFLARE)
echo ========================================================
echo.
cd /d "%~dp0"
echo Conectando tunel seguro...
echo.
echo Espera unos segundos y copia el enlace que dice:
echo "https://......trycloudflare.com"
echo.
echo Para cerrar el tunel, simplemente cierra esta ventana.
echo ========================================================
echo.
.\cloudflared.exe tunnel --url http://localhost:4200
pause
