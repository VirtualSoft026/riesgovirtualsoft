@echo off
setlocal EnableExtensions
title Laboratorio Local RiskOps - Fase 2
set "HERE=%~dp0"

rem ---- Configuracion (todo se puede sobreescribir con variables de entorno) ----
if not defined RISKOPS_LAB_ROOT set "RISKOPS_LAB_ROOT=C:\riskops-lab-fase2"
if not defined RISKOPS_LAB_SERVICES set "RISKOPS_LAB_SERVICES=hosting,auth,database,ui"
if not defined RISKOPS_FIREBASE_TOOLS set "RISKOPS_FIREBASE_TOOLS=15.30.0"
rem RISKOPS_LAB_SUITE=0 omite la suite automatica; RISKOPS_LAB_PAUSA_PLAN=0 no espera tecla tras el plan.
if not defined RISKOPS_LAB_SUITE set "RISKOPS_LAB_SUITE=1"
if not defined RISKOPS_LAB_PAUSA_PLAN set "RISKOPS_LAB_PAUSA_PLAN=1"
if defined RISKOPS_JAVA_HOME set "JAVA_HOME=%RISKOPS_JAVA_HOME%"
if defined RISKOPS_JAVA_HOME set "PATH=%RISKOPS_JAVA_HOME%\bin;%PATH%"

echo ========================================================
echo INICIANDO LABORATORIO LOCAL DE RISKOPS - FASE 2
echo ========================================================
echo.
echo Carpeta de trabajo del laboratorio (ruta limpia): %RISKOPS_LAB_ROOT%
echo Servicios: %RISKOPS_LAB_SERVICES%
echo.
echo Componentes del Laboratorio Local:
echo  1. Hosting:                     http://127.0.0.1:5000
echo  2. Prueba del bundle:           http://127.0.0.1:5000/smoke.html
echo  3. Panel Control (Emulator UI): http://127.0.0.1:4000
echo  4. Emulador Firebase Auth:      http://127.0.0.1:9099
echo  5. Emulador Realtime DB:        http://127.0.0.1:9000
echo.
echo Antes de arrancar se corre la suite de pruebas automaticas sobre el codigo
echo actual de la rama y se muestra el plan de prueba manual de este inicio.
echo Resultados: %RISKOPS_LAB_ROOT%\pruebas
echo.
echo Presiona Ctrl+C en esta ventana para detener el laboratorio cuando termines.
echo (Los datos se guardan en %RISKOPS_LAB_ROOT%\emulator_data; la semilla del repo nunca se modifica)
echo ========================================================
echo.
echo [1/6] Compilando el bundle de src/ con esbuild...
pushd "%HERE%..\build" || goto :fail
if not exist node_modules call npm.cmd install --no-audit --no-fund || goto :fail
call npm.cmd run build || goto :fail
popd

echo.
echo [2/6] Suite de pruebas automaticas (red bloqueada, sin credenciales, sin escribir en el repo)...
set "SUITE_RC=0"
set "PLAN_FLAG="
if "%RISKOPS_LAB_SUITE%"=="0" goto :suite_omitida
call "%HERE%suite\preparar-python.cmd"
node "%HERE%suite\suite-pruebas.mjs"
set "SUITE_RC=%ERRORLEVEL%"
goto :plan
:suite_omitida
echo  Omitida porque RISKOPS_LAB_SUITE=0.
set "PLAN_FLAG=--sin-suite"

:plan
echo.
echo [3/6] Plan de prueba manual de este inicio...
node "%HERE%suite\plan-prueba-manual.mjs" %PLAN_FLAG%
if not "%SUITE_RC%"=="0" echo AVISO: la suite automatica tiene fallas. Empieza la prueba manual por las areas marcadas FALLA.
if "%RISKOPS_LAB_PAUSA_PLAN%"=="0" goto :stage
echo.
echo Revisa el resultado y el plan. Presiona una tecla para arrancar el laboratorio o Ctrl+C para cancelar.
pause >nul

:stage
echo.
echo [4/6] Preparando la copia de staging del sitio...
node "%HERE%stage.mjs" || goto :fail

echo.
echo [5/6] Verificando el entorno (Node, Java, puertos, emulador)...
node "%HERE%preflight.mjs" || goto :fail

echo.
echo [6/6] Arrancando los emuladores de Firebase...
echo  Plan de prueba manual: %RISKOPS_LAB_ROOT%\pruebas\plan-prueba-manual.txt
pushd "%RISKOPS_LAB_ROOT%" || goto :fail
set "IMPORT_FLAG="
if exist "emulator_data\firebase-export-metadata.json" set "IMPORT_FLAG=--import=./emulator_data"
call npx.cmd --yes firebase-tools@%RISKOPS_FIREBASE_TOOLS% emulators:start --only %RISKOPS_LAB_SERVICES% %IMPORT_FLAG% --export-on-exit=./emulator_data
popd
goto :end

:fail
echo.
echo ERROR: el laboratorio no pudo arrancar. Revisa los mensajes anteriores.
echo Resultado de la suite: %RISKOPS_LAB_ROOT%\pruebas\ultimo-resultado.txt
:end
pause
endlocal
