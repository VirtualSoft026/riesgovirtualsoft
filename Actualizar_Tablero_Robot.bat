@echo off
setlocal enabledelayedexpansion

echo Actualizando Tablero de Risk Manager (Modo Rebase Seguro)...
echo ==============================================
cd /d "c:\Users\Maria Alejandra\OneDrive - VIRTUALSOFT SERVICIOS & SOFTWARE S.A.S\Indicadores y Pagina WEB"

:: 1. Extrayendo datos
echo [1/4] Extrayendo datos de MicroStrategy y Contracargos...
python motor_operativo.py || goto :error
python build_docs.py || goto :error

:: 2. Agregar los archivos operativos (Allowlist)
echo [2/4] Agregando archivos permitidos...
git add kpi_operativos_v2.json procesos_list.json || goto :error

:: Verificar si hay algo en stage para hacer commit
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo INFO: No hay cambios nuevos en los datos operativos para subir.
    ping 127.0.0.1 -n 4 > nul
    exit /b 0
)

:: Crear el commit local
git commit -m "Actualizacion automatica desde el programador de tareas" || goto :error

:: 3. Rebase y Push
echo [3/4] Preparando rebase sobre main remoto...
:: Obtener SHA remoto anterior
for /f "tokens=*" %%a in ('git rev-parse origin/main') do set "OLD_SHA=%%a"

git fetch origin || goto :error

:: Usar autostash para proteger cambios no commiteados (ej: Excel abierto) durante el rebase
git pull --rebase origin main --autostash
if %errorlevel% neq 0 (
    echo [!] CONFLICTO DETECTADO DURANTE EL REBASE.
    echo Abortando el rebase para evitar sobreescrituras y regresando al estado anterior...
    git rebase --abort
    goto :error
)

echo [4/4] Subiendo datos nuevos a la plataforma web (GitHub)...
git push origin main || goto :error

:: Obtener SHA nuevo
for /f "tokens=*" %%a in ('git rev-parse HEAD') do set "NEW_SHA=%%a"

echo ==============================================
echo Actualizacion Completada con Exito!
echo SHA Anterior: %OLD_SHA%
echo SHA Nuevo:    %NEW_SHA%
echo Archivos publicados:
echo - kpi_operativos_v2.json
echo - procesos_list.json
echo.
echo Esta ventana se cerrara sola en 5 segundos.
ping 127.0.0.1 -n 6 > nul
exit /b 0

:error
echo ==============================================
echo [!] ERROR EN EL PROCESO
echo Deteniendo la ejecucion sin resolver automaticamente.
echo Por favor, revisa la consola.
echo ==============================================
pause
exit /b 1
