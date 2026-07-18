import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find the img tag with id="printMembreteImg" and replace it
new_img_tag = '<img id="printMembreteImg" src="assets/src/img/membrete_full.png" alt="Membrete">'
html = re.sub(r'<img\s+id="printMembreteImg"[^>]*>', new_img_tag, html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
