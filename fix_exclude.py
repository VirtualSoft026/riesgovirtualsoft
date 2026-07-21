import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

replacement = """    const globalForCharts = {};
    const excludedGestoresGlobal = ['Sara Santamaría', 'Maria Sanchez', 'Camilo Espinosa'];
    for (const gestor in aggregatedDataGlobal) {
        if (excludedGestoresGlobal.some(ex => gestor.includes(ex) || gestor.includes('Sara Santamar'))) continue;
        if (aggregatedDataGlobal[gestor].Retiros_Procesados > 0 || aggregatedDataGlobal[gestor].Dias_Laborados > 0) {
            globalForCharts[gestor] = aggregatedDataGlobal[gestor];
        }
    }"""

js = re.sub(
    r"const globalForCharts = \{\};\s*for \(const gestor in aggregatedDataGlobal\) \{\s*if \(aggregatedDataGlobal\[gestor\]\.Retiros_Procesados > 0 \|\| aggregatedDataGlobal\[gestor\]\.Dias_Laborados > 0\) \{\s*globalForCharts\[gestor\] = aggregatedDataGlobal\[gestor\];\s*\}\s*\}",
    replacement.strip(),
    js
)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
