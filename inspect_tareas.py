import pandas as pd
import os

tareas_path = 'Tareas Riesgo/Tareas de Riesgo.xlsx'
if os.path.exists(tareas_path):
    xl = pd.ExcelFile(tareas_path)
    print("Sheets in Tareas de Riesgo.xlsx:", xl.sheet_names)
    for sheet in xl.sheet_names:
        df = xl.parse(sheet)
        print(f"\nSheet '{sheet}' shape: {df.shape}")
        print("Columns:", df.columns.tolist())
        print(df.head(5))
else:
    print("File not found")
