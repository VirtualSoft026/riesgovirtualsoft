import csv
import zipfile
import xml.etree.ElementTree as ET

def read_xlsx(path):
    # .xlsx is just a zip file
    with zipfile.ZipFile(path, 'r') as z:
        # Get shared strings
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            with z.open('xl/sharedStrings.xml') as f:
                tree = ET.parse(f)
                root = tree.getroot()
                ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                for si in root.findall('ns:si', ns):
                    t = si.find('ns:t', ns)
                    strings.append(t.text if t is not None else "")
                
        # Read first sheet
        with z.open('xl/worksheets/sheet1.xml') as f:
            tree = ET.parse(f)
            root = tree.getroot()
            ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            rows = root.findall('.//ns:row', ns)
            for row in rows[:5]:
                row_data = []
                for cell in row.findall('ns:c', ns):
                    v = cell.find('ns:v', ns)
                    if v is not None:
                        val = v.text
                        if cell.get('t') == 's':
                            val = strings[int(val)]
                        row_data.append(val)
                print(row_data)

try:
    read_xlsx('Permisos/Permisos Gestores.xlsx')
except Exception as e:
    print("Error:", e)
