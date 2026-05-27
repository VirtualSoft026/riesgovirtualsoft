import os
import glob
import json
import pandas as pd
from datetime import datetime

def build_retiros():
    folder_path = "Retiros"
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
        print("Carpeta Retiros creada. No hay archivos para procesar.")
        return

    # Buscar archivos de excel
    excel_files = glob.glob(os.path.join(folder_path, "*.xls*"))
    if not excel_files:
        print("No se encontraron archivos Excel en la carpeta Retiros.")
        return
    
    # Obtener el más reciente
    latest_file = max(excel_files, key=os.path.getctime)
    print(f"Procesando archivo de retiros: {latest_file}")
    
    try:
        df = pd.read_excel(latest_file)
        
        gestores_map = {}
        
        for index, row in df.iterrows():
            email = row.get("Nombre Usuario Cambio")
                
            if pd.isna(email) or not isinstance(email, str):
                continue
                
            email = email.strip().lower()
            
            if email not in gestores_map:
                gestores_map[email] = {
                    "totalAprobados": 0,
                    "totalRechazados": 0,
                    "montoProcesado": 0,
                    "minutosDemoraTotales": 0,
                    "retirosConTiempo": 0
                }
                
            stats = gestores_map[email]
            
            estado = row.get("Estado Retiro Creado", "")
            if isinstance(estado, str):
                if estado.lower() == "pagado":
                    stats["totalAprobados"] += 1
                elif estado.lower() == "rechazado":
                    stats["totalRechazados"] += 1
                    
            monto = row.get("Valor Retiros Creados", 0)
            if not pd.isna(monto):
                try:
                    stats["montoProcesado"] += float(monto)
                except ValueError:
                    pass
                    
            # Tiempos
            f_creacion = row.get("Fecha Creacion Retiro Time")
            if pd.isna(f_creacion):
                f_creacion = row.get("Fecha Creacion Retiro")
                
            f_cambio = row.get("Fecha Cambio Time")
            if pd.isna(f_cambio):
                f_cambio = row.get("Fecha Cambio")
                
            if not pd.isna(f_creacion) and not pd.isna(f_cambio):
                try:
                    # pd.to_datetime maneja seriales o strings
                    d1 = pd.to_datetime(f_creacion)
                    d2 = pd.to_datetime(f_cambio)
                    
                    diff_mins = (d2 - d1).total_seconds() / 60.0
                    if 0 <= diff_mins < 10080: # maximo 1 semana de diferencia para descartar outliers absurdos
                        stats["minutosDemoraTotales"] += diff_mins
                        stats["retirosConTiempo"] += 1
                except Exception:
                    pass

        # Escribir el JSON
        out_path = os.path.join(folder_path, "retiros_data.json")
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(gestores_map, f, ensure_ascii=False, indent=2)
            
        print(f"Éxito: {len(gestores_map)} gestores procesados. Archivo guardado en {out_path}")
        
    except Exception as e:
        print(f"Error procesando {latest_file}: {e}")

if __name__ == "__main__":
    print("--- INICIANDO PROCESAMIENTO AUTOMÁTICO DE RETIROS ---")
    build_retiros()
    print("--- FIN PROCESAMIENTO ---")
