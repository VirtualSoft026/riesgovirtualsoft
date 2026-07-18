import base64
import re

with open('assets/src/img/membrete_full.png', 'rb') as f:
    img_data = base64.b64encode(f.read()).decode('utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Use regex to replace the src attribute of printMembreteImg
new_src = f'src="data:image/png;base64,{img_data}"'
html = re.sub(r'(<img\s+id="printMembreteImg"\s+)src="[^"]*"', r'\1' + new_src, html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
