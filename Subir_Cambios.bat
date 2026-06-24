@echo off
title Actualizador de Pagina Web de Riesgo

:: Ruta de Git
set "GIT_BIN=%USERPROFILE%\AppData\Local\Programs\Git\cmd\git.exe"

:: Si no existe en la ruta de AppData, usar el comando global
if not exist "%GIT_BIN%" (
    set "GIT_BIN=git"
)

echo ============================================================
echo        ACTUALIZADOR AUTOMATICO DE DATOS (RIESGO VS)
echo ============================================================
echo.
echo Buscando cambios locales en Horario, Teletrabajo o procesos...
echo.

"%GIT_BIN%" status -s

echo.
echo ============================================================
echo Procesando datos de Retiros locales (Python)...
python build_retiros.py

echo.
echo ============================================================
echo Guardando y preparando los archivos modificados...
"%GIT_BIN%" add .

:: Crear un mensaje de commit automatico con fecha y hora
set "FECHA=%date%"
set "HORA=%time%"
set "COMMIT_MSG=Actualizacion automatica de datos - %FECHA% %HORA%"

echo.
echo Creando el paquete de actualizacion...
"%GIT_BIN%" commit -m "%COMMIT_MSG%"

echo.
echo Subiendo los datos a GitHub (Internet)...
"%GIT_BIN%" push origin main

echo.
echo ============================================================
echo Subiendo los datos a Firebase Hosting (Pagina Web)...
call npx firebase-tools deploy --only hosting
echo.
echo ============================================================
echo            PROCESO COMPLETADO CON EXITO!
echo.
echo Los cambios ya estan publicados en tu pagina web.
echo Por favor, espera 1 minuto y refresca la web (Ctrl + F5).
echo ============================================================
echo.
pause