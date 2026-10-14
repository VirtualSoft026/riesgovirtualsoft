@echo off
rem ======================================================================
rem  Prepara el Python aislado del laboratorio para test_motor_operativo.py
rem  y deja RISKOPS_PYTHON definido en el .bat que lo llama (por eso NO usa
rem  setlocal). Lo usan suite_pruebas.bat e Iniciar_Laboratorio_Fase2.bat.
rem
rem  El entorno vive en %RISKOPS_LAB_ROOT%\venv-motor, fuera del repositorio.
rem  La primera vez instala requirements.txt (necesita internet solo esa vez).
rem ======================================================================
if defined RISKOPS_PYTHON exit /b 0
if not defined RISKOPS_LAB_ROOT set "RISKOPS_LAB_ROOT=C:\riskops-lab-fase2"
if not exist "%RISKOPS_LAB_ROOT%" mkdir "%RISKOPS_LAB_ROOT%"
set "RISKOPS_VENV=%RISKOPS_LAB_ROOT%\venv-motor"
if exist "%RISKOPS_VENV%\Scripts\python.exe" goto :deps
where py >nul 2>nul && py -3 -m venv "%RISKOPS_VENV%"
if not exist "%RISKOPS_VENV%\Scripts\python.exe" (
    where python >nul 2>nul && python -m venv "%RISKOPS_VENV%"
)
if not exist "%RISKOPS_VENV%\Scripts\python.exe" (
    echo  AVISO: no se pudo crear el entorno de Python. La prueba del motor operativo se omitira.
    exit /b 0
)
:deps
if not exist "%RISKOPS_VENV%\.dependencias-ok" (
    echo  Instalando requirements.txt en el entorno del laboratorio, solo la primera vez...
    "%RISKOPS_VENV%\Scripts\python.exe" -m pip install --disable-pip-version-check --no-input -q -r "%~dp0..\..\..\requirements.txt" && type nul > "%RISKOPS_VENV%\.dependencias-ok"
)
set "RISKOPS_PYTHON=%RISKOPS_VENV%\Scripts\python.exe"
exit /b 0
