import json
from datetime import datetime

with open('temp_mstr_raw.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

all_rows = []
def extract_flat_data(node, current_row, all_rows):
    if 'element' in node:
        current_row.append(node['element']['formValues'].popitem()[1])
    if 'children' in node:
        for child in node['children']:
            extract_flat_data(child, current_row.copy(), all_rows)
    else:
        all_rows.append(current_row)

if 'data' in data.get('result', {}) and 'root' in data['result']['data']:
    extract_flat_data(data['result']['data']['root'], [], all_rows)

print(f"Extracted {len(all_rows)} rows")

yefferson_skipped = []
yefferson_aprobados = 0

fmt = "%m/%d/%Y %I:%M:%S %p"

for row in all_rows:
    agent_id = row[14].strip().lower()
    if 'yefferson' in agent_id or 'giraldo' in agent_id:
        estado_mstr = row[4].strip()
        fecha_cambio = row[6]
        fecha_creacion = row[8]
        
        try:
            t_creacion = datetime.strptime(fecha_creacion, fmt)
            t_cambio = datetime.strptime(fecha_cambio, fmt)
            ciclo = (t_cambio - t_creacion).total_seconds()
        except Exception as e:
            ciclo = -1
            
        estado = "pendiente"
        estado_mstr_lower = estado_mstr.lower()
        if "aprobado" in estado_mstr_lower or "pagado" in estado_mstr_lower or "procesado" in estado_mstr_lower:
            estado = "aprobado"
        elif "rechazado" in estado_mstr_lower or "cancelado" in estado_mstr_lower:
            estado = "rechazado"
            
        date_str = t_cambio.strftime("%Y-%m-%d") if ciclo >= 0 else ""
        
        if date_str >= '2026-06-24' and date_str <= '2026-06-29':
            if estado == "aprobado" and ciclo >= 0:
                yefferson_aprobados += 1
            else:
                yefferson_skipped.append({
                    "estado_mstr": estado_mstr,
                    "estado_calculado": estado,
                    "ciclo": ciclo,
                    "fecha": date_str
                })

print("Aprobados:", yefferson_aprobados)
print("Skipped:", len(yefferson_skipped))
for s in yefferson_skipped[:20]:
    print(s)
