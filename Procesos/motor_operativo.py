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
MSTR_REPORT_ID = "B8B21D45184E89DD2A5A0898940B66A1"
MSTR_USERNAME = "maria.sanchez"
MSTR_PASSWORD = "Marzo0393*"

def get_firebase_gestores():
    try:
        res = requests.get('https://riskops-75637-default-rtdb.firebaseio.com/users.json', timeout=10)
        users = res.json()
        mapping = {}
        if users:
            for uid, u in users.items():
                if u.get('approved') == True:
                    name = u.get('name', '').strip()
                    email = u.get('email', '').strip().lower()
                    
                    mapping[email] = name
                    if '@' in email:
                        mapping[email.split('@')[0]] = name
                    mapping[name.lower()] = name
                    
                    parts = name.lower().split()
                    if len(parts) >= 2:
                        mapping[f"{parts[0]} {parts[1]}"] = name
                    if len(parts) >= 3:
                        mapping[f"{parts[0]} {parts[2]}"] = name
                    if len(parts) >= 4:
                        mapping[f"{parts[0]} {parts[3]}"] = name
                        mapping[f"{parts[0]} {parts[1]} {parts[2]} {parts[3]}"] = name
            
            # Ajustes finos para MSTR (Nombres con los que MSTR los registra pero difieren en Firebase)
            mapping['oriana borjs'] = mapping.get('oriana.borja', 'Oriana Borja Romero')
            mapping['luis fuentes'] = mapping.get('luis.fuentes', 'Luis Alfredo Fuentes Martinez')
            mapping['jose.diaz@virtualsoft.tech'] = mapping.get('juan.diaz', 'Juan Jose Diaz Alvarez')
        return mapping
    except Exception as e:
        print("Error obteniendo gestores de Firebase:", e)
        return {}

GESTORES_PERMITIDOS = get_firebase_gestores()
print(f"Gestores permitidos cargados dinámicamente desde Firebase: {len(set(GESTORES_PERMITIDOS.values()))} usuarios únicos.")

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
            response = requests.post(auth_url, data=payload, timeout=20)
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
            res = requests.get(f"{MSTR_BASE_URL}/projects", headers=headers, cookies=self.session_cookies, timeout=20)
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

    def extract_flat_data(self, node, current_row, all_rows):
        if 'element' in node:
            current_row.append(node['element']['formValues'].popitem()[1])
        if 'children' in node:
            for child in node['children']:
                self.extract_flat_data(child, current_row.copy(), all_rows)
        else:
            all_rows.append(current_row)

    def fetch_retiros_data(self):
        print(f"Obteniendo datos del reporte {MSTR_REPORT_ID} desde MicroStrategy...")
        all_rows = []
        if False and os.path.exists('temp_mstr_raw_full.json'):
            print("USANDO ARCHIVO LOCAL temp_mstr_raw_full.json")
            with open('temp_mstr_raw_full.json', 'r', encoding='utf-8') as f:
                all_rows = json.load(f)
        elif self.auth_token and self.project_id and MSTR_REPORT_ID:
            headers = {
                'X-MSTR-AuthToken': self.auth_token,
                'X-MSTR-ProjectID': self.project_id,
                'Accept': 'application/json'
            }
            try:
                url = f"{MSTR_BASE_URL}/reports/{MSTR_REPORT_ID}/instances?limit=1000"
                res = requests.post(url, headers=headers, cookies=self.session_cookies, timeout=20)
                res.raise_for_status()
                data = res.json()
                
                instance_id = data.get('instanceId')
                
                if 'data' in data.get('result', {}) and 'root' in data['result']['data']:
                    self.extract_flat_data(data['result']['data']['root'], [], all_rows)
                    print(f"Página 1 extraída. Total actual: {len(all_rows)} filas.")
                
                # Check pagination
                paging = data.get('result', {}).get('data', {}).get('paging', {})
                total_rows = paging.get('total', 0)
                
                print(f"MicroStrategy reporta un total de {total_rows} filas en este reporte.")
                
                # Fetch remaining pages if needed (limit to 500,000 to avoid infinite loops/crashes)
                MAX_ROWS = 500000
                current_offset = len(all_rows)
                
                while current_offset < total_rows and current_offset < MAX_ROWS and instance_id:
                    page_url = f"{MSTR_BASE_URL}/reports/{MSTR_REPORT_ID}/instances/{instance_id}?offset={current_offset}&limit=1000"
                    page_res = requests.get(page_url, headers=headers, cookies=self.session_cookies, timeout=20)
                    if not page_res.ok:
                        break
                    
                    page_data = page_res.json()
                    
                    if 'data' in page_data.get('result', {}) and 'root' in page_data['result']['data']:
                        prev_len = len(all_rows)
                        self.extract_flat_data(page_data['result']['data']['root'], [], all_rows)
                        if len(all_rows) == prev_len:
                            break # No new rows added
                    
                    current_offset = len(all_rows)
                    print(f"Página extraída. Total actual: {current_offset} filas.")
                
                print(f"Extracción API finalizada: {len(all_rows)} filas totales.")
                with open('temp_mstr_raw_full.json', 'w', encoding='utf-8') as f:
                    json.dump(all_rows, f)
            except Exception as e:
                print(f"Error descargando el reporte de MicroStrategy: {e}")

        # Fallback a local file if MSTR failed but we have temp_mstr_raw.json
        if len(all_rows) == 0 and os.path.exists('temp_mstr_raw.json'):
            print("Usando archivo temporal temp_mstr_raw.json de MicroStrategy...")
            with open('temp_mstr_raw.json', 'r', encoding='utf-8') as f:
                data = json.load(f)
                if 'data' in data.get('result', {}) and 'root' in data['result']['data']:
                    self.extract_flat_data(data['result']['data']['root'], [], all_rows)
                    print(f"Se extrajeron {len(all_rows)} filas del archivo temporal.")

        parsed_retiros = []
        # Mapping index from attributes
        # 2: Id Usuario, 4: Estado Retiro Creado, 6: Fecha Cambio Time, 8: Fecha Creacion Retiro Time, 14: Nombre Usuario Cambio
        for row in all_rows:
            try:
                user_id = row[2]
                estado_mstr = row[4].strip()
                fecha_cambio = row[6]
                fecha_creacion = row[8]
                agent_id = row[14].strip()
                
                # We need to calculate elapsed seconds
                fmt = "%m/%d/%Y %I:%M:%S %p"
                try:
                    t_creacion = datetime.strptime(fecha_creacion, fmt)
                    t_cambio = datetime.strptime(fecha_cambio, fmt)
                    ciclo = (t_cambio - t_creacion).total_seconds()
                    if ciclo < 0:
                        ciclo = 0
                except Exception as e:
                    # Fallback date format if needed
                    ciclo = 0

                # Normalizar estado
                estado_mstr_lower = estado_mstr.lower()
                banco = str(row[19]).strip() if len(row) > 19 else ""
                
                if "rechazado" in estado_mstr_lower or "cancelado" in estado_mstr_lower:
                    estado = "rechazado"
                else:
                    estado = "aprobado"
                
                # Filtrar y normalizar el nombre del gestor
                agent_lower = agent_id.lower().strip()
                if agent_lower in GESTORES_PERMITIDOS:
                    agent_name_clean = GESTORES_PERMITIDOS[agent_lower]
                elif agent_lower == "":
                    agent_name_clean = "Sistema (Automatizado)"
                else:
                    agent_name_clean = agent_id.title()
                
                if agent_name_clean and estado in ["aprobado", "rechazado"] and ciclo >= 0:
                    parsed_retiros.append({
                        "User_ID": user_id,
                        "Agent_ID": agent_name_clean,
                        "Estado": estado,
                        "Tiempo_Ciclo_Segundos": ciclo,
                        "Fecha_Date": t_cambio.strftime("%Y-%m-%d") if 't_cambio' in locals() else ""
                    })
            except Exception as e:
                continue
                
        return parsed_retiros

class MotorOperativo:
    def __init__(self):
        self.mstr = MicroStrategyConnector()
        self.datos_gestores = {}

    def procesar_retiros_mstr(self, retiros_data):
        print("Procesando histórico de retiros...")
        for row in retiros_data:
            agent = row["Agent_ID"]
            fecha = row.get("Fecha_Date", "")
            
            # Use nested dictionary for Agent -> Date
            if agent not in self.datos_gestores:
                self.datos_gestores[agent] = {}
            if fecha not in self.datos_gestores[agent]:
                self.datos_gestores[agent][fecha] = {
                    "Dias_Laborados": 1,
                    "Dias_Tarde": 0,
                    "Minutos_Tarde_Total": 0,
                    "Minutos_Inactividad_Total": 0,
                    "Retiros_Aprobados": 0,
                    "Retiros_Rechazados": 0,
                    "Tiempo_Total_Desde_Creacion_Segundos": 0,
                    "Retiros_Con_Fuga": 0
                }
                
            estado = row["Estado"].lower()
            if estado == "aprobado":
                self.datos_gestores[agent][fecha]["Retiros_Aprobados"] += 1
            elif estado == "rechazado":
                self.datos_gestores[agent][fecha]["Retiros_Rechazados"] += 1
                
            self.datos_gestores[agent][fecha]["Tiempo_Total_Desde_Creacion_Segundos"] += row["Tiempo_Ciclo_Segundos"]

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
            print("Directorio de contracargos no encontrado o vacío.")

        # Cruce Lógico (Atribución de Fugas)
        for row in retiros_data:
            if str(row["User_ID"]).strip() in fraudes_user_ids and row["Estado"].lower() == "aprobado":
                agent = row["Agent_ID"]
                fecha = row.get("Fecha_Date", "")
                if agent in self.datos_gestores and fecha in self.datos_gestores[agent]:
                    self.datos_gestores[agent][fecha]["Retiros_Con_Fuga"] += 1

    def integrar_datos_firebase(self):
        # Todo: Integrate real firebase data for inactividad. Using 0s for now to keep the frontend clean.
        pass

    def calcular_metricas_y_scores(self):
        print("Calculando columnas y scores...")
        for agent, fechas_data in self.datos_gestores.items():
            for fecha, d in fechas_data.items():
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
