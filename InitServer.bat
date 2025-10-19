@echo off
title AcquaTrack - Ngrok
chcp 65001 >nul
echo ========================================
echo    🌍 ACQUATRACK - NGROK
echo ========================================
echo.

:: Caminho até o ngrok (ajuste se estiver em outro local)
set "NGROK_PATH=%~dp0ngrok.exe"

if not exist "%NGROK_PATH%" (
    echo ❌ ngrok.exe não encontrado!
    echo Certifique-se de que o ngrok está na mesma pasta que este arquivo.
    pause
    exit /b 1
)

:: Configurar authtoken se ainda não estiver feito
echo 🔑 Verificando token do Ngrok...
"%NGROK_PATH%" config check >nul 2>&1
if %errorlevel% neq 0 (
    echo 💡 Adicionando seu token...
    "%NGROK_PATH%" config add-authtoken 33tgeaUQcbYrDeF3hX7aKirbjFt_5sV5jZC4wu3DyVbPfaJm9
    echo ✅ Token configurado!
) else (
    echo ✅ Token já configurado!
)

:: Iniciar túnel
echo 🌐 Iniciando túnel para http://localhost:3000 ...
echo ========================================
"%NGROK_PATH%" http 3000
pause
