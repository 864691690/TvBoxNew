@echo off
cd /d "D:\BaiduNetdiskDownload\5.07\Android-SDK@5.07.82603_20260414\Android-SDK@5.07.82603_20260414\HBuilder-Integrate-AS"
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set JAVA_HOME=C:\Program Files\Java\jdk-17
echo === Gradle Version ===
call gradlew.bat --version
echo.
echo === Starting Build ===
call gradlew.bat assembleRelease --stacktrace 2>&1
echo === Exit Code: %ERRORLEVEL% ===
