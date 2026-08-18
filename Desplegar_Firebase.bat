@echo off
echo ========================================================
echo PREPARANDO DESPLIEGUE A FIREBASE HOSTING
echo ========================================================
echo.
echo Paso 1: Iniciando sesion en Google...
echo (Se abrira una pestana en tu navegador. Por favor, selecciona tu cuenta
echo de Google que tiene acceso a Firebase y acepta los permisos).
echo.
call npx firebase-tools login || goto :error

echo.
echo Paso 2: Subiendo archivos a la nube...
echo.
call npx firebase-tools deploy --only hosting || goto :error

echo.
echo ========================================================
echo DESPLIEGUE COMPLETADO.
echo Tu pagina segura ahora esta disponible en:
echo https://riskops-75637.web.app
echo ========================================================
pause
exit /b 0

:error
echo ========================================================
echo [!] ERROR DURANTE EL DESPLIEGUE
echo Por favor, revisa el mensaje de error anterior.
echo ========================================================
pause
exit /b 1
