@echo off
cd /d "D:\BaiduNetdiskDownload\5.06\Android-SDK@5.06.82597_20260401\Android-SDK@5.06.82597_20260401\HBuilder-Integrate-AS"
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
echo === Build ===
call gradlew.bat assembleRelease 2>&1
echo EXIT_CODE=%ERRORLEVEL%
