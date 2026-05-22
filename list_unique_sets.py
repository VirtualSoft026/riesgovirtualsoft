import pandas as pd
import os

tareas_path = 'Tareas Riesgo/Tareas de Riesgo.xlsx'
if os.path.exists(tareas_path):
    df = pd.read_excel(tareas_path)
    print("Unique sets in Tareas de Riesgo.xlsx:")
    for s in sorted(df['Set '].dropna().unique()):
        print(f"- '{s}'")
else:
    print("File not found")
