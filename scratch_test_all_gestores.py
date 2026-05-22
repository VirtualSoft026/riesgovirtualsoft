import openpyxl, datetime
from test_weekend import test_date_assignments

wb_h = openpyxl.load_workbook('Horario/Horario 2026.xlsx')
ws_h = wb_h.active
rows_h = list(ws_h.values)

# Get all unique gestor names from Horario
gestores = set()
for r in rows_h:
    if r and r[0] and str(r[0]).strip() != '' and str(r[0]).strip().upper() not in ['GESTOR', 'DESCANSA', 'POR ASIGNAR']:
        gestores.add(str(r[0]).strip())

print(f"Total gestores in Horario: {len(gestores)}")
sunday = datetime.datetime(2026, 5, 24)

for gestor in sorted(gestores):
    shift, sheet, assigns = test_date_assignments(gestor, sunday)
    if len(assigns) > 0:
        print(f"\nGestor: {gestor}")
        print(f"  Shift: '{shift}'")
        print(f"  Assignments ({len(assigns)}):")
        for a in assigns:
            print(f"    - Set: '{a['set']}' | Task: '{a['task']}'")
