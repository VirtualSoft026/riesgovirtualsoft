import pandas as pd
df = pd.read_excel('Horario/Horario 2026.xlsx', header=None)
data = df.values.tolist()
blocks = []
for r in range(len(data)):
    row = data[r]
    if len(row) > 1 and pd.notna(row[1]) and isinstance(row[1], (int, float)):
        if r+1 < len(data) and pd.notna(data[r+1][1]) and str(data[r+1][1]).strip().lower() in ['lunes', 'martes']:
            blocks.append((r, row[1]))
print('Blocks found at rows:', blocks)
