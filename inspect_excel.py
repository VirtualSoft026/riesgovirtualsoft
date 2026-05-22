import pandas as pd
import os

cronograma_path = 'Cronograma de Tareas/Cronograma Mayo.xlsx'
output_path = 'cronograma_inspection.txt'

if os.path.exists(cronograma_path):
    xl = pd.ExcelFile(cronograma_path)
    pd.set_option('display.max_columns', None)
    pd.set_option('display.max_rows', None)
    pd.set_option('display.width', 1000)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(f"Sheets in Cronograma Mayo.xlsx: {xl.sheet_names}\n")
        for sheet in xl.sheet_names:
            df = xl.parse(sheet)
            f.write(f"\n--- Sheet: {sheet} ---\n")
            f.write(f"Shape: {df.shape}\n")
            f.write(df.to_string())
            f.write("\n")
    print("Done writing to cronograma_inspection.txt")
else:
    print(f"File not found: {cronograma_path}")
