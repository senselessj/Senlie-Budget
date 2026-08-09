@echo off
setlocal
cd /d "%~dp0"
title Senlie Budget - Android Builder

echo.
echo  Senlie Budget Android Builder
echo  =============================
echo.
set /p SENLIE_APP_URL=Paste your deployed HTTPS Senlie Budget URL: 

if "%SENLIE_APP_URL%"=="" (
  echo.
  echo No URL entered.
  pause
  exit /b 1
)

if not exist node_modules (
  echo.
  echo Installing project dependencies...
  call npm install || goto :fail
)

if not exist android-twa\twa-manifest.json (
  echo.
  echo Creating Android project from the live PWA...
  call npm run android:init -- "%SENLIE_APP_URL%" || goto :fail
)

echo.
echo Building signed APK/AAB...
cd android-twa
call npx --yes --package @bubblewrap/cli@1.24.1 bubblewrap build || goto :fail2

echo.
echo Done. Check the android-twa folder for app-release-signed.apk / app-release-bundle.aab.
echo.
pause
exit /b 0

:fail2
cd ..
:fail
echo.
echo Android build failed. Read ANDROID_PWA_GUIDE.md for the common setup issues.
pause
exit /b 1
