@echo off
rem Auditoría de duplicados entre app.js y src/ (rama del refactor): funciones, constantes, dentro de src/ y capas (cmp-capas).
rem Solo lee app.js, login.js, index.html, login.html, styles.css, login.css, database.rules.json, js\tiempos.js y src\. No modifica el repo ni usa la red (salvo npm install la primera vez).
rem Resultado: fase_2\lab\auditoria-duplicados\salida\  y  salida-completa.txt
setlocal
cd /d "%~dp0"
if not exist node_modules\typescript call npm.cmd install --no-audit --no-fund || goto :fail
(
  for %%s in (inventario comparar cmp-multiselect cmp-extra cmp-cron usos cmp-datos cmp-constantes cmp-intra-src cmp-capas cmp-xss cmp-interpolaciones cmp-sumideros) do (
    echo ===== %%s
    node %%s.mjs
  )
  echo ===== tipos ^(tsc --checkJs sobre src^)
  call npx.cmd tsc -p tsconfig.checkjs.json
) > salida-completa.txt 2>&1
type salida-completa.txt
echo.
echo Resultado guardado en: %~dp0salida-completa.txt
goto :end
:fail
echo ERROR: no se pudieron instalar las dependencias de la auditoria (acorn, jsdom, typescript).
:end
endlocal
