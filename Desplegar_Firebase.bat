@echo off
echo ========================================================
echo PREPARANDO DESPLIEGUE A FIREBASE HOSTING
echo ========================================================
echo.
echo Paso 1: Iniciando sesion en Google...
echo (Se abrira una pestana en tu navegador. Por favor, selecciona tu cuenta
echo de Google que tiene acceso a Firebase y acepta los permisos).
echo.
call npx firebase-tools login

echo.
echo Paso 2: Subiendo archivos a la nube...
echo.
call npx firebase-tools deploy --only hosting

echo.
echo ========================================================
echo DESPLIEGUE COMPLETADO.
echo Tu pagina segura ahora esta disponible en:
echo https://riskops-75637.web.app
echo ========================================================
pause
