import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

replacement = """    // 2. Top Excelencia Puntualidad (Mejores 5, orden ASC)
    const mejoresTardanzas = sortBy('Prom_Minutos_Tarde', true).slice(0, 5).reverse();"""

js = re.sub(
    r"// 2\. Top Excelencia Puntualidad \(Mejores 5, orden ASC\)\s*const mejoresTardanzas = sortBy\('Prom_Minutos_Tarde', true\)\.slice\(0, 5\);",
    replacement.strip(),
    js
)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
