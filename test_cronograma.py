import pandas as pd
import os
from datetime import datetime

months = {
    "ene": 1, "enero": 1,
    "feb": 2, "febrero": 2,
    "mar": 3, "marzo": 3,
    "abr": 4, "abril": 4,
    "may": 5, "mayo": 5,
    "jun": 6, "junio": 6,
    "jul": 7, "julio": 7,
    "ago": 8, "agosto": 8,
    "sep": 9, "set": 9, "septiembre": 9,
    "oct": 10, "octubre": 10,
    "nov": 11, "noviembre": 11,
    "dic": 12, "diciembre": 12
}

def parse_sheet_range(sheet_name, year=2026):
    import re
    clean = sheet_name.replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
    
    # Try "Semana X - DD Month1 al DD Month2"
    m = re.search(r'Semana\s+\d+\s*-\s*(\d+)\s+(\w+)\s+al\s+(\d+)\s+(\w+)', clean, re.IGNORECASE)
    if m:
        start_day = int(m.group(1))
        start_m_str = m.group(2)[:3].lower()
        end_day = int(m.group(3))
        end_m_str = m.group(4)[:3].lower()
        
        start_month = months.get(start_m_str, 1)
        end_month = months.get(end_m_str, 1)
        
        start_date = datetime(year, start_month, start_day, 0, 0, 0)
        end_date = datetime(year, end_month, end_day, 23, 59, 59)
        return start_date, end_date
        
    # Try "Semana X - DD al DD Month"
    m = re.search(r'Semana\s+\d+\s*-\s*(\d+)\s+al\s+(\d+)\s+(\w+)', clean, re.IGNORECASE)
    if m:
        start_day = int(m.group(1))
        end_day = int(m.group(2))
        m_str = m.group(3)[:3].lower()
        
        month = months.get(m_str, 1)
        start_date = datetime(year, month, start_day, 0, 0, 0)
        end_date = datetime(year, month, end_day, 23, 59, 59)
        return start_date, end_date
        
    return None

def get_week_sheet(sheet_names, target_date):
    for name in sheet_names:
        r = parse_sheet_range(name, target_date.year)
        if r:
            start, end = r
            if start <= target_date <= end:
                return name
    return sheet_names[-1] # fallback to last

def get_columns_for_date_and_shift(target_date, shift_text):
    day = target_date.weekday() # Monday=0, ..., Saturday=5, Sunday=6
    # Note: JS target_date.getDay() is Sunday=0, Monday=1, ..., Saturday=6
    # Let's map weekday to our column groups:
    # Group 1 (Cols 1-2): Lunes a Viernes Mañana
    # Group 2 (Cols 4-5): Lunes a Viernes Tarde/Noche
    # Group 3 (Cols 7-8): Sábado
    # Group 4 (Cols 10-11): Domingo
    
    if day == 5: # Saturday
        return 7, 8
    elif day == 6: # Sunday
        return 10, 11
    else: # Monday to Friday
        shift_text = str(shift_text).lower()
        if "manana" in shift_text or "mañana" in shift_text or "6am" in shift_text or "8am" in shift_text:
            return 1, 2
        else:
            return 4, 5

# Test it on Cronograma Mayo.xlsx
cron_path = 'Cronograma de Tareas/Cronograma Mayo.xlsx'
if os.path.exists(cron_path):
    xl = pd.ExcelFile(cron_path)
    sheet_names = xl.sheet_names
    print("Available sheets:", sheet_names)
    
    # Test date 1: May 22, 2026 (Friday)
    test_date = datetime(2026, 5, 22, 12, 0, 0)
    sheet = get_week_sheet(sheet_names, test_date)
    print(f"\nDate {test_date.strftime('%Y-%m-%d')} resolved to sheet: '{sheet}'")
    
    # Test shifts for Friday
    df = xl.parse(sheet)
    for shift in ["Mañana", "Tarde", "Noche"]:
        t_col, g_col = get_columns_for_date_and_shift(test_date, shift)
        print(f"Shift: '{shift}' -> cols: {t_col}, {g_col}")
        
        # Scan and show assignments for Daniel
        current_set = ""
        daniel_tasks = []
        for r_idx in range(len(df)):
            task_val = df.iloc[r_idx, t_col]
            gestor_val = df.iloc[r_idx, g_col]
            
            if pd.notna(task_val):
                t_str = str(task_val).strip()
                if t_str.lower().startswith("set "):
                    current_set = t_str
                elif "cronograma" not in t_str.lower() and gestor_val != "Gestor":
                    if pd.notna(gestor_val) and "daniel" in str(gestor_val).lower():
                        daniel_tasks.append((current_set, t_str))
                        
        print(f"  Daniel's tasks on this shift:")
        for s, t in daniel_tasks:
            print(f"    Set: {s} | Task: {t}")

else:
    print("File not found")
