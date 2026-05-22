import pandas as pd
import os

excel_file = 'Tareas Riesgo/Tareas de Riesgo.xlsx'
if os.path.exists(excel_file):
    xl = pd.ExcelFile(excel_file)
    df = xl.parse(xl.sheet_names[0])
    print("Columns:", df.columns.tolist())
    print("\nUnique task names in Tareas de Riesgo.xlsx:")
    unique_tasks = df['Tarea'].dropna().unique()
    for task in sorted(unique_tasks):
        print(f"- {task}")
else:
    print(f"File not found: {excel_file}")
