import json
import os
import sys

# Agrega la ruta de Procesos al path
sys.path.append(os.path.abspath('Procesos'))
from motor_operativo import MotorOperativo

def test_run():
    print("Cargando datos desde temp_mstr_raw_full.json...")
    with open('temp_mstr_raw_full.json', 'r', encoding='utf-8') as f:
        all_rows = json.load(f)
    
    # Simular la lógica de extracción de fechas del archivo original
    # We can just instantiate MotorOperativo and call the parsing logic directly.
    # Actually, we need to replicate the parsing logic or call it if it was refactored.
    # Since parsing is inside fetch_retiros_data, let's just run motor_operativo directly.
