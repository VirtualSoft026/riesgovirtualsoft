import re

# 1. Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

replacement_html = """
            <div style="page-break-inside: avoid; margin-bottom: 30px;">
                <h3 style="color: var(--accent-primary); text-align: center; margin-bottom: 10px;">Eficiencia y Volumen de Retiros</h3>
                <img id="printChart4" src="" style="width: 100%; max-width: 600px; display: block; margin: 0 auto;">
            </div>
            <div id="printTableContainer" style="page-break-inside: auto; margin-bottom: 30px; display: none;">
            </div>
        </div>
"""

html = re.sub(
    r'<div style="page-break-inside: avoid; margin-bottom: 30px;">\s*<h3 style="color: var\(--accent-primary\); text-align: center; margin-bottom: 10px;">Eficiencia y Volumen de Retiros</h3>\s*<img id="printChart4" src="" style="width: 100%; max-width: 600px; display: block; margin: 0 auto;">\s*</div>\s*</div>',
    replacement_html.strip(),
    html
)

# Bump version
html = re.sub(r'app\.js\?v=20260718_26', 'app.js?v=20260718_27', html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# 2. Update app.js
with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

replacement_js = """
    if (isGlobal && chartEficiencia) {
        try {
            imgChart4.src = chartEficiencia.toBase64Image();
            imgChart4.style.display = 'block';
            if (imgChart4.previousElementSibling) imgChart4.previousElementSibling.style.display = 'block';
        } catch(e) { console.error(e); }
    } else {
        imgChart4.style.display = 'none';
        if (imgChart4.previousElementSibling) imgChart4.previousElementSibling.style.display = 'none';
    }

    // 3.5. Tabla de Resumen
    const printTableContainer = document.getElementById('printTableContainer');
    if (printTableContainer) {
        if (isGlobal) {
            const tableDiv = document.getElementById('tablaResumenOperativo').parentElement;
            printTableContainer.innerHTML = `<h3 style="color: var(--accent-primary); text-align: center; margin-bottom: 20px; font-size: 16px;">Resumen de Retiros por Gestor</h3>` + tableDiv.outerHTML;
            printTableContainer.style.display = 'block';
        } else {
            printTableContainer.style.display = 'none';
            printTableContainer.innerHTML = '';
        }
    }

    // 4. Llamar a imprimir
"""

js = re.sub(
    r'if \(isGlobal && chartEficiencia\) \{.*?imgChart4\.previousElementSibling\.style\.display = \'none\';\s*\}\s*// 4\. Llamar a imprimir',
    replacement_js.strip(),
    js,
    flags=re.DOTALL
)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)

