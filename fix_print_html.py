import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

replacement = """        <!-- Charts Container -->
        <div class="print-charts">
            <div style="page-break-inside: avoid; margin-bottom: 30px;">
                <h3 style="color: var(--accent-primary); text-align: center; margin-bottom: 10px;">Top Alerta Tardanzas</h3>
                <img id="printChart5" src="" style="width: 100%; max-width: 600px; display: block; margin: 0 auto;">
            </div>
            <div style="margin-bottom: 30px; page-break-inside: avoid;">
                <h3 style="color: var(--accent-primary); text-align: center; margin-bottom: 10px;">Top Excelencia Puntualidad</h3>
                <img id="printChart1" src="" style="width: 100%; max-width: 600px; display: block; margin: 0 auto;">
            </div>
            <div style="page-break-inside: avoid; margin-bottom: 30px;">
                <h3 style="color: var(--accent-primary); text-align: center; margin-bottom: 10px;">Promedio Inactividad Diaria (Min)</h3>
                <img id="printChart3" src="" style="width: 100%; max-width: 600px; display: block; margin: 0 auto;">
            </div>
            <div style="page-break-inside: avoid; margin-bottom: 30px;">
                <h3 style="color: var(--accent-primary); text-align: center; margin-bottom: 10px;">Eficiencia y Volumen de Retiros</h3>
                <img id="printChart4" src="" style="width: 100%; max-width: 800px; display: block; margin: 0 auto;">
            </div>
            <div style="page-break-inside: avoid; margin-bottom: 30px;">
                <h3 style="color: var(--accent-primary); text-align: center; margin-bottom: 10px;">Aprobaciones por Día</h3>
                <img id="printChart2" src="" style="width: 100%; max-width: 800px; display: block; margin: 0 auto;">
            </div>
            <div id="printTableContainer" style="page-break-inside: auto; margin-bottom: 30px; display: block;">
            </div>
        </div>"""

html = re.sub(
    r"<!-- Charts Container -->\s*<div class=\"print-charts\">.*?</div>\s*</div>\s*</div>\s*<!-- Analysis Modal -->",
    replacement + "\n    </div>\n\n    <!-- Analysis Modal -->",
    html,
    flags=re.DOTALL
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
