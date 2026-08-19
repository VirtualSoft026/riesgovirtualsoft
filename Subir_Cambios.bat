@echo off
setlocal enabledelayedexpansion

title Actualizador de Datos Seguro (Riesgo VS)

echo ============================================================
echo        ACTUALIZADOR SEGURO DE DATOS (RIESGO VS)
echo ============================================================
echo.

:: 1. Ejecutar scripts de Python
echo [1/4] Procesando datos locales...
python build_retiros.py || goto :error
python build_docs.py || goto :error

:: 2. Asegurar el estado y preparar rama de actualizacion
echo.
echo [2/4] Preparando la rama principal...
git checkout main || goto :error
git pull origin main || goto :error

:: 3. Agregar unica y exclusivamente los archivos permitidos (Allowlist)
echo.
echo [3/4] Agregando archivos autorizados...
git add kpi_operativos_v2.json procesos_list.json "Cronograma de Tareas/*.xlsx" "Tareas Riesgo/*.xlsx" "Horario/*.xlsx" "Teletrabajo/*.xlsx" || goto :error
:: (Agregar en la allowlist cualquier otro JSON/MD o salida legitima requerida)

:: Comprobar si realmente hubo modificaciones STAGED antes de crear el commit
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo INFO: No hay datos nuevos o modificados para subir.
    echo ============================================================
    pause
    exit /b 0
)

:: 4. Crear commit y empujar a main
echo.
echo [4/5] Subiendo a GitHub (Rama main)...
set "FECHA=%date%"
set "HORA=%time%"
git commit -m "Actualizacion de datos - %FECHA% %HORA%" || goto :error
git push origin main || goto :error

echo.
echo [5/5] Desplegando en Firebase...
call npx firebase-tools deploy --only hosting || goto :error

echo.
echo ============================================================
echo               PROCESO COMPLETADO CON EXITO
echo ============================================================
echo Los cambios fueron subidos a GitHub y desplegados en vivo.
echo ============================================================
pause
exit /b 0

:error
echo.
echo ============================================================
echo [!] ERROR DETECTADO
echo ============================================================
echo Un comando ha fallado. El script se detuvo inmediatamente por
echo medidas de seguridad. No se han guardado ni subido cambios.
echo Revisa el mensaje de error de arriba para mas detalles.
echo ============================================================
pause
exit /b 1