import openpyxl, unicodedata, re

def normalize(name):
    if not name: return ''
    n = unicodedata.normalize('NFD', str(name))
    n = ''.join(c for c in n if unicodedata.category(c) != 'Mn')
    return n.lower().strip()

def names_match(a, b):
    na, nb = normalize(a), normalize(b)
    if na == nb: return True
    wa = set(w for w in na.split() if len(w) > 2)
    wb_set = set(w for w in nb.split() if len(w) > 2)
    if not wa or not wb_set: return False
    return len(wa & wb_set) >= min(2, min(len(wa), len(wb_set)))

def clean_text(text):
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    return ' '.join(text.split())

def set_names_match(set1, set2):
    if not set1 or not set2: return False
    s1 = clean_text(set1)
    s2 = clean_text(set2)
    return s1 == s2 or s1 in s2 or s2 in s1

GESTOR_NAME = 'Juan Jose Diaz Alvarez'

print("=== LOAD CRONOGRAMA ASSIGNMENTS ===")
wb_c = openpyxl.load_workbook('Cronograma de Tareas/Cronograma Mayo.xlsx')
# Sheet: Semana 3 - 18 al 24 May
ws_c = wb_c['Semana 3 - 18 al 24 May']
rows_c = list(ws_c.values)

col_tarea, col_gestor = 1, 2
current_set = ""
assignments = []
for i, row in enumerate(rows_c):
    if not row or len(row) <= col_gestor: continue
    task_val = row[col_tarea]
    gestor_val = row[col_gestor]
    
    if task_val is not None:
        t_str = str(task_val).strip()
        t_str_lower = t_str.lower()
        if t_str_lower.startswith("set "):
            current_set = t_str
            print(f"Found SET header at row {i}: '{current_set}'")
        elif "cronograma" not in t_str_lower and gestor_val != "Gestor":
            if gestor_val is not None and names_match(str(gestor_val).strip(), GESTOR_NAME):
                assignments.append({
                    'set': current_set or 'Otros',
                    'task': t_str,
                    'gestor_val': str(gestor_val).strip()
                })

print("\nAssignments found for Juan Jose:")
for a in assignments:
    print(f"  Set in Cronograma: '{a['set']}' | Task: '{a['task']}'")

print("\n=== MATCH WITH TAREAS DE RIESGO ===")
wb_r = openpyxl.load_workbook('Tareas Riesgo/Tareas de Riesgo.xlsx')
ws_r = wb_r.active
rows_r = list(ws_r.values)
header = rows_r[0]
print("Header columns:", header)

# Find columns: Set, Horario, Tarea, Detalle de Tarea
col_set_idx = -1
col_tarea_idx = -1
for idx, col_name in enumerate(header):
    if col_name and 'set' in str(col_name).lower():
        col_set_idx = idx
    if col_name and 'tarea' in str(col_name).lower() and 'detalle' not in str(col_name).lower():
        col_tarea_idx = idx

print(f"Set column index: {col_set_idx}, Tarea column index: {col_tarea_idx}")

for a in assignments:
    # Look for matching row in Tareas de Riesgo
    matched_rows = []
    for r_idx, r in enumerate(rows_r[1:]):
        r_set = r[col_set_idx] if col_set_idx < len(r) else ''
        r_task = r[col_tarea_idx] if col_tarea_idx < len(r) else ''
        
        # Test match
        # taskNamesMatch logic
        norm_cron_task = clean_text(a['task'])
        norm_master_task = clean_text(r_task)
        # simplified task match for testing
        task_matched = norm_cron_task == norm_master_task or norm_cron_task in norm_master_task or norm_master_task in norm_cron_task
        
        set_matched = set_names_match(a['set'], r_set)
        
        if task_matched:
            matched_rows.append((r_idx, r_set, r_task, set_matched))
            
    print(f"\nSearching Master list for: set='{a['set']}', task='{a['task']}'")
    if not matched_rows:
        print("  --> NO TASK NAME MATCH AT ALL IN MASTER LIST")
    else:
        for r_idx, r_set, r_task, set_matched in matched_rows:
            print(f"  Found task match at master row {r_idx}: set='{r_set}', task='{r_task}' (Set matches = {set_matched})")
