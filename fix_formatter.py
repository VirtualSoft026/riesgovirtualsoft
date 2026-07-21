import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

replacement = """    const datalabelsConfig = {
        formatter: function(value) {
            if (value === 0 || value === "0") return "0 min";
            const num = Number(value);
            const isInt = Number.isInteger(num);
            return num.toLocaleString('es-CO', { 
                minimumFractionDigits: isInt ? 0 : 2, 
                maximumFractionDigits: isInt ? 0 : 2 
            });
        },"""

js = re.sub(
    r"const datalabelsConfig = \{\s*formatter: function\(value\) \{\s*if \(value === 0 \|\| value === \"0\"\) return \"\";\s*const num = Number\(value\);\s*const isInt = Number\.isInteger\(num\);\s*return num\.toLocaleString\('es-CO', \{\s*minimumFractionDigits: isInt \? 0 : 2,\s*maximumFractionDigits: isInt \? 0 : 2\s*\}\);\s*\},",
    replacement.strip(),
    js,
    count=1 # only replace the first occurrence which is in drawChart
)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
