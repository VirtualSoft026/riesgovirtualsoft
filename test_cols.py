import pandas as pd
df = pd.read_excel('Cronograma de Tareas/Cronograma Junio.xlsx', sheet_name='Semana 2 - 8 al 14 Jun', header=None)
data = df.values.tolist()
m, t = [], []
for r in range(5):
    row = data[r]
    for c in range(len(row)):
        v = str(row[c]).lower()
        if 'mañana' in v and 'sabado' not in v and 'sábado' not in v and 'domingo' not in v and not m:
            m = [c, c+1]
        if 'tarde' in v and not t:
            t = [c, c+1]
print('Cols:', m, t)
