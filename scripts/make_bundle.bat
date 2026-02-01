@echo off
setlocal EnableDelayedExpansion

echo Attempting to create AppX Bundle...
echo.

REM Define paths
set "SCRIPT_DIR=%~dp0"
REM Go up one level to project root (absolute path)
pushd "%SCRIPT_DIR%.."
set "PROJECT_ROOT=%CD%"
popd
set "DIST_DIR=%PROJECT_ROOT%\dist"
set "MAP_FILE=%SCRIPT_DIR%bundle_map.txt"
set "OUTPUT_BUNDLE=%DIST_DIR%\NeuralScholarEngine.appxbundle"

echo Project Root: "%PROJECT_ROOT%"
echo Dist Dir:     "%DIST_DIR%"

REM Find the .appx file (taking the newest or first one found)
set "APPX_FILE="
if exist "%DIST_DIR%\NeuralScholarEngine *.appx" (
    for /f "delims=" %%F in ('dir /b /o-d "%DIST_DIR%\NeuralScholarEngine *.appx"') do (
        set "APPX_FILE=%DIST_DIR%\%%F"
        goto FoundFile
    )
)

:FoundFile
if "%APPX_FILE%"=="" (
    echo [ERROR] No .appx file found in "%DIST_DIR%" matching pattern "NeuralScholarEngine *.appx"
    echo Please build the app first.
    pause
    exit /b 1
)

echo Found AppX:   "%APPX_FILE%"

REM Create Mapping File with ABSOLUTE paths
echo [Files] > "%MAP_FILE%"
echo "%APPX_FILE%" "NeuralScholarEngine.appx" >> "%MAP_FILE%"

echo Map File:     "%MAP_FILE%"
type "%MAP_FILE%"
echo.

REM ---------------------------------------------------------
REM Find MakeAppx
REM ---------------------------------------------------------
set "MAKEAPPX="

REM 1. Check App Certification Kit (Common location)
set "APP_CERT_KIT=C:\Program Files (x86)\Windows Kits\10\App Certification Kit"
if exist "%APP_CERT_KIT%\makeappx.exe" (
    set "MAKEAPPX=%APP_CERT_KIT%\makeappx.exe"
    goto FoundTool
)

REM 2. Check SDK versions (if Cert Kit failed)
set "SDK_ROOT=C:\Program Files (x86)\Windows Kits\10\bin"
if exist "%SDK_ROOT%" (
    if exist "%SDK_ROOT%\10.0.26100.0\x64\MakeAppx.exe" (
        set "MAKEAPPX=%SDK_ROOT%\10.0.26100.0\x64\MakeAppx.exe"
        goto FoundTool
    )
    for /f "delims=" %%D in ('dir /b /ad /o-n "%SDK_ROOT%\10.*"') do (
        if exist "%SDK_ROOT%\%%D\x64\MakeAppx.exe" (
            set "MAKEAPPX=%SDK_ROOT%\%%D\x64\MakeAppx.exe"
            goto FoundTool
        )
    )
)

:FoundTool
if "%MAKEAPPX%"=="" (
    echo [ERROR] MakeAppx.exe not found!
    echo Please ensure Windows SDK is installed.
    pause
    exit /b 1
)

echo Using Tool:   "%MAKEAPPX%"
echo.

REM ---------------------------------------------------------
REM Run Bundling
REM ---------------------------------------------------------
if exist "%OUTPUT_BUNDLE%" del "%OUTPUT_BUNDLE%"

"%MAKEAPPX%" bundle /f "%MAP_FILE%" /p "%OUTPUT_BUNDLE%" /o

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo [SUCCESS] Bundle created!
    echo Location: "%OUTPUT_BUNDLE%"
    echo ========================================================
) else (
    echo.
    echo [ERROR] Bundling failed. Code: %errorlevel%
)
pause
