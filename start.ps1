# LensCraft AI — démarrage local en une commande
# Usage : clic droit > "Exécuter avec PowerShell", ou .\start.ps1 dans un terminal

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

# Build si absent ou périmé
if (-not (Test-Path "dist\server.cjs")) {
    Write-Host "Build manquant — compilation en cours..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Host "Build échoué." -ForegroundColor Red; exit 1 }
}

# Clé IA : remplacez par la vôtre, ou laissez le placeholder
# (les utilisateurs peuvent aussi coller leur propre clé dans l'app via « Clé API »)
if (-not $env:GEMINI_API_KEY) { $env:GEMINI_API_KEY = "placeholder-add-your-real-key" }
if (-not $env:PORT)          { $env:PORT = "3200" }
if (-not $env:NODE_ENV)      { $env:NODE_ENV = "production" }

Write-Host ""
Write-Host "  LensCraft AI  ->  http://localhost:$($env:PORT)" -ForegroundColor Green
Write-Host "  Questionnaire ->  http://localhost:$($env:PORT)/survey" -ForegroundColor Green
Write-Host "  Résultats     ->  http://localhost:$($env:PORT)/survey/results" -ForegroundColor Green
Write-Host ""
Write-Host "  Ctrl+C pour arrêter." -ForegroundColor DarkGray
Write-Host ""

node dist/server.cjs
