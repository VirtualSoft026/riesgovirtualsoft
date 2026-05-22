import openpyxl, unicodedata

def normalize(name):
    if not name: return ''
    n = unicodedata.normalize('NFD', str(name))
    n = ''.join(c for c in n if unicodedata.category(c) != 'Mn')
    return n.lower().strip()

def names_match(a, b):
    na, nb = normalize(a), normalize(b)
    if na == nb: return True
    wa = set(w for w in na.split() if len(w) > 2)
    wb_set = set(w for w in nb.split() if len(w) > 2)
    if not wa or not wb_set: return False
    return len(wa & wb_set) >= min(2, min(len(wa), len(wb_set)))

GESTOR_NAME = 'Juan Jose Diaz Alvarez'

# 1) Horario: bloque 18-24 mayo (fila 52)
print('=== PASO 1: TURNO EN HORARIO (semana 18-24 mayo) ===')
wb_h = openpyxl.load_workbook('Horario/Horario 2026.xlsx')
ws_h = wb_h.active
rows_h = list(ws_h.values)

# Mostrar cabecera del bloque
r_header = rows_h[52]
r_days   = rows_h[53]
print('Fechas:', [str(c)[:10] if c else '-' for c in r_header])
print('Dias:  ', [str(c)[:10] if c else '-' for c in r_days])

turno_encontrado = None
for i in range(54, 65):
    r = rows_h[i] if i < len(rows_h) else None
    if not r or not r[0]: continue
    nombre_excel = str(r[0]).strip()
    match = names_match(nombre_excel, GESTOR_NAME)
    print(f'  Fila {i}: "{nombre_excel}" -> match={match}')
    if match:
        # Hoy es jueves = columna 4 (1=Lun, 2=Mar, 3=Mie, 4=Jue)
        turno_jueves = str(r[4]).strip() if len(r) > 4 and r[4] else 'N/A'
        print(f'  >>> TURNO HOY (Jueves col4): "{turno_jueves}"')
        turno_encontrado = turno_jueves

print()
print('=== PASO 2: DETECCION DE COLUMNAS CRONOGRAMA ===')
print(f'Turno resuelto: "{turno_encontrado}"')
if turno_encontrado:
    t = normalize(turno_encontrado)
    if '8am' in t or '6am' in t or 'manana' in t:
        print('-> Columnas MANANA: [1, 2]')
        col_tarea, col_gestor = 1, 2
    elif 'pm' in t or 'tarde' in t or 'noche' in t:
        print('-> Columnas TARDE/NOCHE: [4, 5]')
        col_tarea, col_gestor = 4, 5
    else:
        print('-> Turno no reconocido, buscando en AMBAS columnas')
        col_tarea, col_gestor = 1, 2
else:
    print('-> Sin turno, usando MANANA por defecto')
    col_tarea, col_gestor = 1, 2

print()
print(f'=== PASO 3: TAREAS EN CRONOGRAMA (cols tarea={col_tarea}, gestor={col_gestor}) ===')
wb_c = openpyxl.load_workbook('Cronograma de Tareas/Cronograma Mayo.xlsx')
ws_c = wb_c['Semana 3 - 18 al 24 May']
rows_c = list(ws_c.values)

tareas_asignadas = []
for i, row in enumerate(rows_c):
    if not row or len(row) <= col_gestor: continue
    tarea  = str(row[col_tarea]).strip()  if row[col_tarea]  else ''
    gestor = str(row[col_gestor]).strip() if row[col_gestor] else ''
    if not tarea or tarea in ('None', 'nan', '', 'Gestor'): continue
    if not gestor or gestor in ('None', 'nan', '', 'Gestor'): continue
    match = names_match(gestor, GESTOR_NAME)
    if match:
        print(f'  Fila {i}: TAREA="{tarea}" | GESTOR_EXCEL="{gestor}"')
        tareas_asignadas.append(tarea)

print()
print(f'Total tareas asignadas a {GESTOR_NAME}: {len(tareas_asignadas)}')

print()
print('=== PASO 4: TEST namesMatch variantes ===')
variantes = ['Juan Jose', 'Juan Jose Diaz', 'Juan Jose Alvarez', 'Juan Jose Diaz Alvarez', 'Juan Jose Diaz Alvarez ']
for v in variantes:
    print(f'  namesMatch("{v}", "{GESTOR_NAME}") = {names_match(v, GESTOR_NAME)}')
