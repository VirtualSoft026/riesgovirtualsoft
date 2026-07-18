import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Extract the img tag
img_match = re.search(r'<img\s+id="printMembreteImg"[^>]*>', html)
if img_match:
    img_tag = img_match.group(0)
    # Remove it from where it is now
    html = html.replace(img_tag, '')
    
    # Prepend it directly inside #printReportContainer
    html = re.sub(r'(<div\s+id="printReportContainer"[^>]*>)', r'\1\n        ' + img_tag.replace('\\', '\\\\'), html, count=1)
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
