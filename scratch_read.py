import pandas as pd
import sys

try:
    df = pd.read_excel('Horario/Horario 2026.xlsx', header=None)
    print("Row 0:", df.iloc[0].tolist()[:8])
    print("Row 1:", df.iloc[1].tolist()[:8])
except Exception as e:
    print(e)
