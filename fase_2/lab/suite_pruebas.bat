@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Suite de Pruebas RiskOps - Fase 2
rem ======================================================================
rem  suite_pruebas.bat  -  Suite de pruebas del laboratorio Fase 2
rem
rem  Corre sobre el codigo ACTUAL de la rama (lo que editaste localmente):
rem    1. Compila el bundle (fase_2/build, npm run build)
rem    2. Verifica window.RiskOps, las suites unitarias de fase_2/src/tests,
rem       la integracion del laboratorio, las 9 pruebas e2e con el app.js
rem       real y test_motor_operativo.py en un entorno hermetico
rem    3. Muestra el resumen y guarda el log en %RISKOPS_LAB_ROOT%\pruebas
rem
rem  Seguridad: no escribe en el repositorio, bloquea la red en cada
rem  proceso de prueba y no pasa contrasenas, tokens ni MSTR_* a las pruebas.
rem  No arranca emuladores ni toca produccion (para eso esta
rem  Iniciar_Laboratorio_Fase2.bat).
rem
rem  Opciones:  suite_pruebas.bat --solo-unitarias
rem             suite_pruebas.bat --sin-motor
rem  Variables: RISKOPS_LAB_ROOT (por defecto C:\riskops-lab-fase2)
rem             RISKOPS_PYTHON   (Python a usar; si no, venv propio del lab)
rem ======================================================================
set "HERE=%~dp0"
if not defined RISKOPS_LAB_ROOT set "RISKOPS_LAB_ROOT=C:\riskops-lab-fase2"
if not exist "%RISKOPS_LAB_ROOT%" mkdir "%RISKOPS_LAB_ROOT%" || goto :fail

echo ========================================================
echo  SUITE DE PRUEBAS - LABORATORIO RISKOPS FASE 2
echo ========================================================
echo  Resultados en: %RISKOPS_LAB_ROOT%\pruebas
echo  Red bloqueada durante las pruebas. El repositorio no se modifica.
echo ========================================================
echo.

where node >nul 2>nul || (echo ERROR: no se encontro Node.js en el PATH. Instala Node 20 o superior. & goto :fail)

echo [1/3] Compilando el bundle de src/ con esbuild...
pushd "%HERE%..\build" || goto :fail
if not exist node_modules (
    call npm.cmd install --no-audit --no-fund || (popd & goto :fail)
)
call npm.cmd run build || (popd & goto :fail)
popd
echo.

echo [2/3] Preparando Python aislado para el motor operativo...
call "%HERE%suite\preparar-python.cmd"

:run
echo.
echo [3/3] Ejecutando la suite...
echo.
node "%HERE%suite\suite-pruebas.mjs" %*
set "RC=%ERRORLEVEL%"
echo.
if "%RC%"=="0" (
    echo SUITE EN VERDE.
) else (
    echo LA SUITE TIENE FALLAS O NO PUDO PREPARARSE. Codigo: %RC%
)
echo Log completo: %RISKOPS_LAB_ROOT%\pruebas\ultimo-resultado.txt
pause
endlocal & exit /b %RC%

:fail
echo.
echo ERROR: la suite no pudo prepararse. Revisa los mensajes anteriores.
pause
endlocal & exit /b 2
