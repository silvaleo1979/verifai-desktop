@echo off
chcp 65001 >nul
title VerifAI Desktop - Instalador

echo.
echo ============================================
echo    🚀 VerifAI Desktop - Instalador
echo ============================================
echo.

echo Escolha o tipo de instalação:
echo.
echo 1. Versão Completa (Instalador)
echo 2. Versão Portátil (ZIP)
echo 3. Sair
echo.

set /p choice="Digite sua escolha (1-3): "

if "%choice%"=="1" goto :full
if "%choice%"=="2" goto :portable
if "%choice%"=="3" goto :exit
goto :invalid

:full
echo.
echo 🔧 Baixando versão completa...
powershell -ExecutionPolicy Bypass -File "%~dp0install-verifai.ps1"
goto :end

:portable
echo.
echo 📦 Baixando versão portátil...
powershell -ExecutionPolicy Bypass -File "%~dp0install-verifai.ps1" -Portable
goto :end

:invalid
echo.
echo ❌ Escolha inválida!
pause
goto :start

:exit
echo.
echo 👋 Até logo!
pause
exit /b 0

:end
echo.
echo ✅ Instalação concluída!
echo.
pause

