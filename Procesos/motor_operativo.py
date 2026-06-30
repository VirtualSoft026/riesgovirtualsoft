import os
import json
import time
import requests
import pandas as pd
from datetime import datetime

# ==========================================
# CONFIGURACIÓN DE MICROSTRATEGY (Por llenar)
# ==========================================
MSTR_BASE_URL = "https://env-i921eu432wwh4k73.cloud.strategy.com/MicroStrategyLibrary/api"
MSTR_PROJECT_NAME = "Virtualsoft" # Nombre del proyecto si no se conoce el ID
MSTR_PROJECT_ID = "" # Se autocompletará si se deja en blanco y el nombre coincide
MSTR_REPORT_ID = "06C17B674C66C15648D532B59505E1E3"
MSTR_USERNAME = "maria.sanchez"
MSTR_PASSWORD = "Marzo0393*"

# ==========================================
# CONFIGURACIÓN DE CONTRACARGOS
# ==========================================
CONTRACARGOS_DIR = r"C:\Users\Maria Alejandra\OneDrive - VIRTUALSOFT SERVICIOS & SOFTWARE S.A.S\General - Gestión de Riesgo\Cambio Estado Dep. y Contracargos\Contracargos 2026"
OUTPUT_JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "kpi_operativos_v2.json")

class MicroStrategyConnector:
    def __init__(self):
        self.auth_token = None
        self.session_cookies = None
        self.project_id = MSTR_PROJECT_ID

    def authenticate(self):
        if not MSTR_BASE_URL:
            print("MicroStrategy URL no configurada. Saltando autenticación.")
            return False
            
        auth_url = f"{MSTR_BASE_URL}/auth/login"
        payload = {
            "username": MSTR_USERNAME,
            "password": MSTR_PASSWORD,
            "loginMode": 1
        }
        try:
            response = requests.post(auth_url, data=payload)
            response.raise_for_status()
            self.auth_token = response.headers.get('X-MSTR-AuthToken')
            self.session_cookies = response.cookies
            print("Autenticación en MicroStrategy exitosa.")
            
            # Autodescubrir Project ID si no se proveyó
            if not self.project_id and MSTR_PROJECT_NAME:
                self.discover_project_id()
                
            return True
        except Exception as e:
            print(f"Error autenticando en MicroStrategy: {e}")
            return False

    def discover_project_id(self):
        print(f"Buscando ID para el proyecto '{MSTR_PROJECT_NAME}'...")
        headers = {'X-MSTR-AuthToken': self.auth_token, 'Accept': 'application/json'}
        try:
            res = requests.get(f"{MSTR_BASE_URL}/projects", headers=headers, cookies=self.session_cookies)
            res.raise_for_status()
            projects = res.json()
            for p in projects:
                if p.get('name', '').lower() == MSTR_PROJECT_NAME.lower():
                    self.project_id = p.get('id')
                    print(f"Project ID encontrado exitosamente: {self.project_id}")
                    return
            print("No se encontró un proyecto con ese nombre.")
        except Exception as e:
            print(f"Error buscando Project ID: {e}")

    def fetch_retiros_data(self):
        print(f"Obteniendo datos del reporte {MSTR_REPORT_ID} desde MicroStrategy...")
        if self.auth_token and self.project_id and MSTR_REPORT_ID:
            headers = {
                'X-MSTR-AuthToken': self.auth_token,
                'X-MSTR-ProjectID': self.project_id,
                'Accept': 'application/json'
            }
            try:
                # 1. Crear instancia del reporte
                url = f"{MSTR_BASE_URL}/reports/{MSTR_REPORT_ID}/instances"
                print(f"Llamando a {url}")
                res = requests.post(url, headers=headers, cookies=self.session_cookies)
                res.raise_for_status()
                data = res.json()
                
                # Guardar el JSON crudo para analizar su estructura
                with open("temp_mstr_raw.json", "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                print("Estructura del reporte guardada en temp_mstr_raw.json temporalmente para mapeo.")
            except Exception as e:
                print(f"Error descargando el reporte de MicroStrategy: {e}")

        # MOCK DATA TEMPORAL: Mientras mapeamos la estructura exacta del JSON
        print("Usando mock data por ahora como respaldo...")
        
        mock_retiros = [
            {"User_ID": "U001", "Agent_ID": "Oriana Borja", "Estado": "Aprobado", "Tiempo_Ciclo_Segundos": 900},
            {"User_ID": "U002", "Agent_ID": "Oriana Borja", "Estado": "Rechazado", "Tiempo_Ciclo_Segundos": 600},
            {"User_ID": "U003", "Agent_ID": "Alexander Villada", "Estado": "Aprobado", "Tiempo_Ciclo_Segundos": 1200},
            {"User_ID": "U004", "Agent_ID": "Alexander Villada", "Estado": "Aprobado", "Tiempo_Ciclo_Segundos": 3000},
            {"User_ID": "U005", "Agent_ID": "Marilyn Alejandra", "Estado": "Aprobado", "Tiempo_Ciclo_Segundos": 400},
            {"User_ID": "U006", "Agent_ID": "Josue Alvarez", "Estado": "Aprobado", "Tiempo_Ciclo_Segundos": 1500}
        ]
        return mock_retiros


class MotorOperativo:
    def __init__(self):
        self.mstr = MicroStrategyConnector()
        self.datos_gestores = {}

    def inicializar_gestor(self, agent_id):
        if agent_id not in self.datos_gestores:
            self.datos_gestores[agent_id] = {
                "Dias_Laborados": 0,
                "Dias_Tarde": 0,
                "Minutos_Tarde_Total": 0,
                "Minutos_Inactividad_Total": 0,
                "Retiros_Aprobados": 0,
                "Retiros_Rechazados": 0,
                "Tiempo_Total_Desde_Creacion_Segundos": 0,
                "Retiros_Con_Fuga": 0
            }

    def procesar_retiros_mstr(self, retiros_data):
        print("Procesando histórico de retiros...")
        for row in retiros_data:
            agent = row["Agent_ID"].strip()
            self.inicializar_gestor(agent)
            
            estado = row["Estado"].lower()
            if estado == "aprobado":
                self.datos_gestores[agent]["Retiros_Aprobados"] += 1
            elif estado == "rechazado":
                self.datos_gestores[agent]["Retiros_Rechazados"] += 1
                
            self.datos_gestores[agent]["Tiempo_Total_Desde_Creacion_Segundos"] += row["Tiempo_Ciclo_Segundos"]

    def procesar_contracargos(self, retiros_data):
        print(f"Buscando archivos de contracargos en: {CONTRACARGOS_DIR}")
        fraudes_user_ids = set()
        
        if os.path.exists(CONTRACARGOS_DIR):
            for file in os.listdir(CONTRACARGOS_DIR):
                if file.endswith(('.xlsx', '.xls')):
                    filepath = os.path.join(CONTRACARGOS_DIR, file)
                    try:
                        df = pd.read_excel(filepath)
                        col_user = next((c for c in df.columns if 'user' in str(c).lower() or 'id' in str(c).lower()), None)
                        if col_user:
                            for user_id in df[col_user].dropna():
                                fraudes_user_ids.add(str(user_id).strip())
                    except Exception as e:
                        print(f"Error leyendo excel {file}: {e}")
        else:
            print("Directorio de contracargos no encontrado o vacío. Usando mock fraude U004.")
            fraudes_user_ids.add("U004")

        # Cruce Lógico (Atribución de Fugas)
        print("Realizando cruce lógico para atribución de fugas...")
        for row in retiros_data:
            if str(row["User_ID"]).strip() in fraudes_user_ids and row["Estado"].lower() == "aprobado":
                agent = row["Agent_ID"].strip()
                self.inicializar_gestor(agent)
                self.datos_gestores[agent]["Retiros_Con_Fuga"] += 1

    def integrar_datos_firebase(self):
        mock_tiempos = {
            "Oriana Borja": {"Dias_Laborados": 20, "Dias_Tarde": 2, "Minutos_Tarde_Total": 15, "Minutos_Inactividad_Total": 300},
            "Alexander Villada": {"Dias_Laborados": 22, "Dias_Tarde": 5, "Minutos_Tarde_Total": 60, "Minutos_Inactividad_Total": 800},
            "Marilyn Alejandra": {"Dias_Laborados": 20, "Dias_Tarde": 0, "Minutos_Tarde_Total": 0, "Minutos_Inactividad_Total": 150},
            "Josue Alvarez": {"Dias_Laborados": 19, "Dias_Tarde": 1, "Minutos_Tarde_Total": 5, "Minutos_Inactividad_Total": 1000}
        }
        for agent, data in mock_tiempos.items():
            self.inicializar_gestor(agent)
            self.datos_gestores[agent].update(data)

    def calcular_metricas_y_scores(self):
        print("Calculando columnas y scores...")
        for agent, d in self.datos_gestores.items():
            dl = d["Dias_Laborados"] if d["Dias_Laborados"] > 0 else 1
            
            d["Prom_Minutos_Tarde"] = round(d["Minutos_Tarde_Total"] / dl, 2)
            d["Porcentaje_Frecuencia_Tarde"] = round((d["Dias_Tarde"] / dl) * 100, 2)
            d["Prom_Inactividad_Diaria"] = round(d["Minutos_Inactividad_Total"] / dl, 2)
            
            d["Retiros_Procesados"] = d["Retiros_Aprobados"] + d["Retiros_Rechazados"]
            if d["Retiros_Procesados"] > 0:
                d["ART_Desde_Creacion_Minutos"] = round((d["Tiempo_Total_Desde_Creacion_Segundos"] / d["Retiros_Procesados"]) / 60, 2)
            else:
                d["ART_Desde_Creacion_Minutos"] = 0
                
            if d["Retiros_Aprobados"] > 0:
                d["Porcentaje_Fuga"] = round((d["Retiros_Con_Fuga"] / d["Retiros_Aprobados"]) * 100, 2)
            else:
                d["Porcentaje_Fuga"] = 0
                
            if d["Prom_Minutos_Tarde"] <= 3: d["Score_Tardanza"] = 100
            elif d["Prom_Minutos_Tarde"] <= 10: d["Score_Tardanza"] = 70
            else: d["Score_Tardanza"] = 40
            
            if d["Prom_Inactividad_Diaria"] <= 20: d["Score_Inactividad"] = 100
            elif d["Prom_Inactividad_Diaria"] <= 45: d["Score_Inactividad"] = 60
            else: d["Score_Inactividad"] = 20
            
            if d["ART_Desde_Creacion_Minutos"] <= 15: d["Score_Velocidad_Retiros"] = 100
            elif d["ART_Desde_Creacion_Minutos"] <= 45: d["Score_Velocidad_Retiros"] = 75
            else: d["Score_Velocidad_Retiros"] = 40
            
            if d["Porcentaje_Fuga"] == 0: d["Score_Calidad_Retiros"] = 100
            elif d["Porcentaje_Fuga"] <= 1: d["Score_Calidad_Retiros"] = 50
            else: d["Score_Calidad_Retiros"] = 0

    def guardar_json(self):
        with open(OUTPUT_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(self.datos_gestores, f, ensure_ascii=False, indent=2)
        print(f"Resultados unificados guardados en {OUTPUT_JSON_PATH}")

    def run(self):
        self.mstr.authenticate()
        retiros_data = self.mstr.fetch_retiros_data()
        self.procesar_retiros_mstr(retiros_data)
        self.procesar_contracargos(retiros_data)
        self.integrar_datos_firebase()
        self.calcular_metricas_y_scores()
        self.guardar_json()

if __name__ == "__main__":
    motor = MotorOperativo()
    motor.run()
