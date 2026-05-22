import pandas as pd
import os
import re
import unicodedata

def clean_text(text):
    if not isinstance(text, str):
        return ""
    # Lowercase, remove accents, keep only alphanumeric characters and spaces, compress whitespace
    text = text.lower()
    text = ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = ' '.join(text.split())
    return text

def normalize_task_name(name):
    # E.g. "Conciliación de Pasarelas..." -> "conciliacion de pasarelas"
    cleaned = clean_text(name)
    # Common prefixes/truncations
    if "conciliacion de pasarelas" in cleaned:
        return "conciliacion de pasarelas"
    if "revision de billetera" in cleaned or "billetera usuarios" in cleaned:
        return "revision de billetera usuarios pdv"
    if "revision de eventos" in cleaned or "revision de evento" in cleaned:
        return "revision de eventos"
    return cleaned

cronograma_path = 'Cronograma de Tareas/Cronograma Mayo.xlsx'
tareas_path = 'Tareas Riesgo/Tareas de Riesgo.xlsx'

if os.path.exists(cronograma_path) and os.path.exists(tareas_path):
    # Load tasks from Tareas de Riesgo.xlsx
    df_tareas = pd.read_excel(tareas_path)
    task_names = df_tareas['Tarea'].dropna().unique().tolist()
    
    # Load cronograma
    xl = pd.ExcelFile(cronograma_path)
    for sheet in xl.sheet_names:
        print(f"\n--- Sheet: {sheet} ---")
        df_cron = xl.parse(sheet)
        
        # We want to extract tasks from columns:
        # Group 1: col 1, 2
        # Group 2: col 4, 5
        # Group 3: col 7, 8
        # Group 4: col 10, 11
        col_groups = [(1, 2), (4, 5), (7, 8), (10, 11)]
        
        cron_tasks = []
        for col_t, col_g in col_groups:
            # Get data from these columns
            c_tasks = df_cron.iloc[:, col_t].dropna().tolist()
            c_gestores = df_cron.iloc[:, col_g].dropna().tolist()
            # Let's inspect rows
            for idx, row in df_cron.iterrows():
                t_val = row.iloc[col_t]
                g_val = row.iloc[col_g]
                if pd.notna(t_val) and pd.notna(g_val) and g_val != 'Gestor' and 'Cronograma' not in str(t_val) and 'Set' not in str(t_val):
                    cron_tasks.append((str(t_val).strip(), str(g_val).strip()))
                    
        # Compare
        matched = 0
        unmatched = []
        for ct, cg in cron_tasks:
            norm_ct = normalize_task_name(ct)
            found = False
            for t in task_names:
                norm_t = normalize_task_name(t)
                # Check for exact normalized match or if one contains the other
                if norm_ct == norm_t or norm_t in norm_ct or norm_ct in norm_t:
                    found = True
                    break
            if found:
                matched += 1
            else:
                unmatched.append((ct, cg))
        
        print(f"Total tasks in cronograma: {len(cron_tasks)}")
        print(f"Matched: {matched}")
        print(f"Unmatched: {len(unmatched)}")
        if unmatched:
            print("Unmatched examples:")
            for ct, cg in unmatched[:10]:
                print(f"  Task: '{ct}' -> Gestor: '{cg}'")
else:
    print("Files not found")
