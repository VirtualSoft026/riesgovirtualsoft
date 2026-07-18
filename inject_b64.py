import base64
with open('assets/src/img/membrete_full.png', 'rb') as f:
    img_data = base64.b64encode(f.read()).decode('utf-8')
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()
html = html.replace('src="assets/src/img/membrete_full.png"', f'src="data:image/png;base64,{img_data}"')
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
