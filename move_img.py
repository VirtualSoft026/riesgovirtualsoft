import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find the img tag
img_match = re.search(r'<img\s+id="printMembreteImg"[^>]*>', html)
if img_match:
    img_tag = img_match.group(0)
    # Remove it from its current location
    html = html.replace(img_tag, '')
    
    # Strip any inline style attribute
    img_tag = re.sub(r'\s*style="[^"]*"', '', img_tag)
    
    # Prepend it directly after <body>
    html = html.replace('<body>', '<body>\n    ' + img_tag)
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
