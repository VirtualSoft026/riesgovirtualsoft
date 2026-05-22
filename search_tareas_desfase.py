import pandas as pd
import os

tareas_path = 'Tareas Riesgo/Tareas de Riesgo.xlsx'
if os.path.exists(tareas_path):
    df = pd.read_excel(tareas_path)
    matches = df[df['Tarea'].astype(str).str.lower().str.contains('desfase')]
    for idx, row in matches.iterrows():
        print(f"Set: '{row['Set ']}' | Tarea: '{row['Tarea']}'")
else:
    print("File not found")
