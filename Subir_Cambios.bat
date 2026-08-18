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
echo [2/4] Preparando la rama de actualizacion...
git fetch origin || goto :error
:: Se crea o sobreescribe una rama local llamada 'update-data' a partir de main
git checkout -B update-data origin/main || goto :error

:: 3. Agregar unica y exclusivamente los archivos permitidos (Allowlist)
echo.
echo [3/4] Agregando archivos autorizados...
git add kpi_operativos_v2.json procesos_list.json "Cronograma de Tareas/*.xlsx" "Tareas Riesgo/*.xlsx" || goto :error
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

:: 4. Crear commit y empujar a rama de PR
echo.
echo [4/4] Creando paquete y subiendo a GitHub (Rama update-data)...
set "FECHA=%date%"
set "HORA=%time%"
git commit -m "Actualizacion de datos - %FECHA% %HORA%" || goto :error
git push origin update-data --force || goto :error

echo.
echo ============================================================
echo               PROCESO COMPLETADO CON EXITO
echo ============================================================
echo Los cambios seguros fueron subidos a la rama 'update-data'.
echo Ve a GitHub y abre un Pull Request (PR) hacia 'main'.
echo.
echo No se ha desplegado en Firebase. (Requiere validacion previa).
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