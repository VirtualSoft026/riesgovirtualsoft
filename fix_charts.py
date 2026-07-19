import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add animation: false to all options: { in chart configurations
js = js.replace('options: {', 'options: {\n            animation: false,')

# Fix Chart 1 selection for global
old_chart1_logic = """const isGlobal = (gestorSelect.value === 'Todos');
    const chartExcelencia = window.chartTopExcelenciaInstance; // from tiempos.js"""

new_chart1_logic = """const isGlobal = (gestorSelect.value === 'Todos');
    const chartExcelencia = isGlobal ? controlOperativoCharts['chartTardanzasMejores'] : null;"""

js = js.replace(old_chart1_logic, new_chart1_logic)

# Fix title for Chart 1 in global
old_title = 'imgChart1.previousElementSibling.innerText = "Ranking de Excelencia (Top 10 Más Ágiles)";'
new_title = 'imgChart1.previousElementSibling.innerText = "Ranking de Excelencia (Top 5 Más Ágiles)";'
# the original source has some weird characters like Mǭs ?giles
# I'll just use regex to replace it
js = re.sub(r'imgChart1\.previousElementSibling\.innerText\s*=\s*"[^"]*";', 
            'imgChart1.previousElementSibling.innerText = "Ranking de Excelencia (Top 5 Más Ágiles)";', js)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
