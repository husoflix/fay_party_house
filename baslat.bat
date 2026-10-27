@echo off
chcp 65001 > nul
title Fay Party House Sunucusu
cd /d "%~dp0"

echo ===================================================
echo   🍰 Fay Party House Baslatiliyor...
echo ===================================================
echo.
echo   Tarayici aciliyor: http://localhost:3100
echo   Yonetim Paneli:    http://localhost:3100/admin
echo.
echo   Kapatmak icin bu pencereyi kapatabilirsiniz.
echo ===================================================
echo.

start http://localhost:3100
node backend/server.js
pause
