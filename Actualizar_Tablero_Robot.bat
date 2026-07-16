@echo off
echo Actualizando Tablero de Risk Manager...
echo ==============================================
echo 1. Extrayendo datos de MicroStrategy y Contracargos...
cd "c:\Users\Maria Alejandra\OneDrive - VIRTUALSOFT SERVICIOS & SOFTWARE S.A.S\Indicadores y Pagina WEB"
python Procesos\motor_operativo.py
python build_docs.py

echo 2. Subiendo datos nuevos a la plataforma web (GitHub)...
git add kpi_operativos_v2.json procesos_list.json
git commit -m "Actualizacion automatica desde el programador de tareas" || echo "No hay cambios nuevos para subir."
git push origin main || echo "No se requirio hacer push."

echo ==============================================
echo Actualizacion Completada con Exito!
echo Esta ventana se cerrara sola en 5 segundos.
ping 127.0.0.1 -n 6 > nul
exit /b 0
