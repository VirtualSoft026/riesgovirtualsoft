@echo off
chcp 65001 > nul
title Actualizador de Página Web de Riesgo

:: Detectar la ubicación de Git
set GIT_BIN=git
where git >nul 2>nul
if %errorlevel% neq 0 (
    set GIT_BIN="%USERPROFILE%\AppData\Local\Programs\Git\cmd\git.exe"
)

echo ============================================================
echo        ACTUALIZADOR AUTOMÁTICO DE DATOS (RIESGO VS)
echo ============================================================
echo.
echo Buscando cambios locales en Horario, Teletrabajo o procesos...
echo.

%GIT_BIN% status -s

echo.
echo ============================================================
echo Guardando y preparando los archivos modificados...
%GIT_BIN% add .

:: Crear un mensaje de commit automático con fecha y hora
set "FECHA=%date%"
set "HORA=%time%"
set "COMMIT_MSG=Actualización automática de datos - %FECHA% %HORA%"

echo.
echo Creando el paquete de actualización...
%GIT_BIN% commit -m "%COMMIT_MSG%"

echo.
echo Subiendo los datos a GitHub (Internet)...
%GIT_BIN% push origin main

echo.
echo ============================================================
echo            ¡PROCESO COMPLETADO CON ÉXITO!
echo.
echo Los cambios ya están subiéndose a la nube.
echo Por favor, espera 1 minuto y refresca la web (Ctrl + F5).
echo ============================================================
echo.
pause
