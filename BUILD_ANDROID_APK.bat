@echo off
setlocal
cd /d "%~dp0"
title Senlie Budget - Android Builder

echo.
echo  Senlie Budget Android Builder v0.4.9
echo  ==================================
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
  echo Checking PWA and creating Android project...
  call npm run android:init -- "%SENLIE_APP_URL%" || goto :fail
)

echo.
echo Preparing Android project compatibility...
call npm run android:prepare || goto :fail

echo.
echo Regenerating Android project from Bubblewrap manifest...
cd android-twa
call npm exec --yes --package=@bubblewrap/cli@1.24.1 -- bubblewrap update --skipVersionUpgrade || goto :fail2

echo.
echo Building signed APK/AAB...
call npm exec --yes --package=@bubblewrap/cli@1.24.1 -- bubblewrap build || goto :fail2

echo.
echo Done.
echo APK: android-twa\app-release-signed.apk
echo AAB: android-twa\app-release-bundle.aab
echo.
pause
exit /b 0

:fail2
cd ..
:fail
echo.
echo Android build stopped. The useful error should be printed ABOVE this line.
echo See ANDROID_PWA_GUIDE.md if it mentions Java, Android SDK, signing, or Digital Asset Links.
pause
exit /b 1
