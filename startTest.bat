@echo off
setlocal
cd /d E:\ScapeLab\osrs-simulator

echo == Ensuring virtual environment ==
if not exist ".venv\Scripts\python.exe" (
  echo Creating venv with Python 3.13...
  py -3.13 -m venv ".venv" 2>nul
  if errorlevel 1 (
    echo Falling back to default Python to create venv...
    python -m venv ".venv"
  )
)

set "VENV_PY=%CD%\.venv\Scripts\python.exe"
if not exist "%VENV_PY%" (
  echo ERROR: venv interpreter not found at "%VENV_PY%".
  echo Delete the .venv folder and try again, or ensure Python is installed.
  pause
  exit /b 1
)

echo == Upgrading pip ==
"%VENV_PY%" -m pip install -U pip

echo == Installing deps ==
if exist "backend\requirements.txt" (
  "%VENV_PY%" -m pip install -r "backend\requirements.txt"
)
if exist "backend\requirements-dev.txt" (
  "%VENV_PY%" -m pip install -r "backend\requirements-dev.txt"
) else (
  "%VENV_PY%" -m pip install fastapi pydantic pytest httpx python-dotenv
)

echo == Running tests ==
echo Using "%VENV_PY%"
"%VENV_PY%" "backend\app\testing\UnitTest.py"
set EXITCODE=%ERRORLEVEL%

echo.
pause
endlocal & exit /b %EXITCODE%
