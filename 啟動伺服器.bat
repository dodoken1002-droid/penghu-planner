@echo off
chcp 65001 > nul
echo.
echo  ===========================
echo   澎湖旅遊規劃器
echo   http://localhost:5000
echo  ===========================
echo.

set PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe

if not exist "%PYTHON%" (
    echo [ERROR] 找不到 Python，請確認已安裝 Python 3.x
    pause
    exit /b 1
)

cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
start "" "http://localhost:5000"
"%PYTHON%" run.py
pause
