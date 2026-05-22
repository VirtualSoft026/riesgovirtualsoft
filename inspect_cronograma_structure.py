import openpyxl

wb = openpyxl.load_workbook('Cronograma de Tareas/Cronograma Mayo.xlsx')
sheet = wb['Semana 3 - 18 al 24 May']
print(f"Sheet dimensions: {sheet.dimensions}")

# Print first 25 rows
for r_idx in range(1, 26):
    row_vals = [sheet.cell(r_idx, c_idx).value for c_idx in range(1, 15)]
    # format: print index and values
    print(f"Row {r_idx:02d}: {row_vals}")
