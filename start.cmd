@echo off
REM LensCraft AI - démarrage local en une commande
REM Double-cliquez ce fichier, ou tapez "start.cmd" dans un terminal.

cd /d "%~dp0"

if not exist "dist\server.cjs" (
    echo Build manquant - compilation en cours...
    call npm run build
    if errorlevel 1 (
        echo Build echoue.
        pause
        exit /b 1
    )
)

if "%GEMINI_API_KEY%"=="" set GEMINI_API_KEY=placeholder-add-your-real-key
if "%PORT%"=="" set PORT=3200
if "%NODE_ENV%"=="" set NODE_ENV=production

echo.
echo   LensCraft AI  -^>  http://localhost:%PORT%
echo   Questionnaire -^>  http://localhost:%PORT%/survey
echo   Resultats     -^>  http://localhost:%PORT%/survey/results
echo.
echo   Ctrl+C pour arreter.
echo.

node dist\server.cjs
pause
