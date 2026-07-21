import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

replacement = """    // 1. Top Alerta Tardanzas (Peores 5, orden DESC)
    let peoresTardanzas = sortBy('Prom_Minutos_Tarde').filter(g => data[g].Prom_Minutos_Tarde > 0).slice(0, 5);"""

js = re.sub(
    r"// 1\. Top Alerta Tardanzas \(Peores 5, orden DESC\)\s*let peoresTardanzas = sortBy\('Prom_Minutos_Tarde'\)\.filter\(g => data\[g\]\.Prom_Minutos_Tarde > 0\)\.slice\(0, 5\)\.reverse\(\);",
    replacement.strip(),
    js
)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
