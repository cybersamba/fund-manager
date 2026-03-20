@echo off
chcp 65001 >nul
title Fund Manager - Deploy a Producción

echo.
echo ╔══════════════════════════════════════════╗
echo ║     FUND MANAGER — DEPLOY A NETLIFY      ║
echo ╚══════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo [1/2] Compilando la aplicacion...
echo ──────────────────────────────────────────
call npm run build

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] La compilacion ha fallado. Revisa los errores anteriores.
    pause
    exit /b 1
)

echo.
echo [2/2] Desplegando en Netlify...
echo ──────────────────────────────────────────
call netlify deploy --prod --dir=dist

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] El deploy ha fallado. Revisa los errores anteriores.
    pause
    exit /b 1
)

echo.
echo ╔══════════════════════════════════════════╗
echo ║   ✅  DEPLOY COMPLETADO CON EXITO        ║
echo ║   🌐  golden-pastelito-33f6b8.netlify.app║
echo ╚══════════════════════════════════════════╝
echo.

start "" "https://golden-pastelito-33f6b8.netlify.app"

timeout /t 5 >nul
