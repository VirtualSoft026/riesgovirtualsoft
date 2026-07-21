import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

replacement = """
    // 1. Top Alerta Tardanzas (Peores 5, orden DESC)
    let peoresTardanzas = sortBy('Prom_Minutos_Tarde').filter(g => data[g].Prom_Minutos_Tarde > 0).slice(0, 5);
    let peoresColors, peoresBorders, peoresData;
    if (peoresTardanzas.length === 0) {
        peoresTardanzas = ['Equipo 100% Puntual'];
        peoresData = [0];
        peoresColors = ['rgba(103, 194, 58, 0.7)'];
        peoresBorders = ['rgba(103, 194, 58, 1)'];
    } else {
        peoresData = peoresTardanzas.map(g => data[g].Prom_Minutos_Tarde);
        peoresColors = peoresTardanzas.map(g => (selectedGestor !== 'Todos' && g === selectedGestor) ? 'rgba(54, 162, 235, 1)' : 'rgba(245, 108, 108, 0.7)');
        peoresBorders = peoresTardanzas.map(g => (selectedGestor !== 'Todos' && g === selectedGestor) ? 'rgba(54, 162, 235, 1)' : 'rgba(245, 108, 108, 1)');
    }
    drawChart('chartTardanzasPeores', 'bar', peoresTardanzas, peoresData, 'Minutos Tarde (Promedio)', peoresColors, peoresBorders, { indexAxis: 'y' });
"""

js = re.sub(
    r"// 1\. Top Alerta Tardanzas \(Peores 5, orden DESC\)\s*const peoresTardanzas = sortBy\('Prom_Minutos_Tarde'\)\.slice\(0, 5\);\s*const peoresColors = peoresTardanzas\.map\(g => \(selectedGestor !== 'Todos' && g === selectedGestor\) \? 'rgba\(54, 162, 235, 1\)' : 'rgba\(245, 108, 108, 0\.7\)'\);\s*const peoresBorders = peoresTardanzas\.map\(g => \(selectedGestor !== 'Todos' && g === selectedGestor\) \? 'rgba\(54, 162, 235, 1\)' : 'rgba\(245, 108, 108, 1\)'\);\s*drawChart\('chartTardanzasPeores', 'bar', peoresTardanzas, peoresTardanzas\.map\(g => data\[g\]\.Prom_Minutos_Tarde\), 'Minutos Tarde \(Promedio\)', peoresColors, peoresBorders, \{ indexAxis: 'y' \}\);",
    replacement.strip(),
    js,
    flags=re.DOTALL
)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
