@echo off
setlocal
cd /d "%~dp0"
title Senlie Budget - Development

echo.
echo  Senlie Budget - Senlie Technologies
echo  ------------------------------------
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo Install Node.js 20.9 or newer, then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo ERROR: .env.local was not found.
  echo.
  echo Copy .env.example to .env.local and paste your REAL Supabase
  echo Project URL and publishable key.
  echo.
  pause
  exit /b 1
)

findstr /I /C:"YOUR_PROJECT" /C:"your_project" /C:"YOUR_PUBLISHABLE" /C:"YOUR_ANON" /C:"REPLACE_ME" ".env.local" >nul
if not errorlevel 1 (
  echo ERROR: .env.local still contains placeholder Supabase values.
  echo.
  echo Open .env.local and paste the REAL Project URL and publishable key
  echo from your Supabase project's Connect dialog.
  echo.
  pause
  exit /b 1
)

findstr /B /C:"NEXT_PUBLIC_SUPABASE_URL=" ".env.local" >nul
if errorlevel 1 (
  echo ERROR: NEXT_PUBLIC_SUPABASE_URL is missing from .env.local.
  echo.
  pause
  exit /b 1
)

findstr /B /C:"NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=" /C:"NEXT_PUBLIC_SUPABASE_ANON_KEY=" ".env.local" >nul
if errorlevel 1 (
  echo ERROR: No Supabase publishable/anon key was found in .env.local.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo First launch: installing npm dependencies...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Supabase configuration file found.
echo Starting Senlie Budget...
echo Open http://localhost:3000 after Next.js reports Ready.
echo.
call npm run dev

pause
