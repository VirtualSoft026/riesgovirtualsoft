import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

replacement = """
    // 1. Top Alerta Tardanzas (Peores 5, orden DESC)
    const peoresTardanzas = sortBy('Prom_Minutos_Tarde').slice(0, 5);
    const peoresColors = peoresTardanzas.map(g => (selectedGestor !== 'Todos' && g === selectedGestor) ? 'rgba(54, 162, 235, 1)' : 'rgba(245, 108, 108, 0.7)');
    const peoresBorders = peoresTardanzas.map(g => (selectedGestor !== 'Todos' && g === selectedGestor) ? 'rgba(54, 162, 235, 1)' : 'rgba(245, 108, 108, 1)');
    drawChart('chartTardanzasPeores', 'bar', peoresTardanzas, peoresTardanzas.map(g => data[g].Prom_Minutos_Tarde), 'Minutos Tarde (Promedio)', peoresColors, peoresBorders, { indexAxis: 'y' });
    
    // 2. Top Excelencia Puntualidad (Mejores 5, orden ASC)
    const mejoresTardanzas = sortBy('Prom_Minutos_Tarde', true).slice(0, 5);
    const mejoresColors = mejoresTardanzas.map(g => (selectedGestor !== 'Todos' && g === selectedGestor) ? 'rgba(54, 162, 235, 1)' : 'rgba(103, 194, 58, 0.7)');
    const mejoresBorders = mejoresTardanzas.map(g => (selectedGestor !== 'Todos' && g === selectedGestor) ? 'rgba(54, 162, 235, 1)' : 'rgba(103, 194, 58, 1)');
    drawChart('chartTardanzasMejores', 'bar', mejoresTardanzas, mejoresTardanzas.map(g => data[g].Prom_Minutos_Tarde), 'Minutos Tarde (Promedio)', mejoresColors, mejoresBorders, { indexAxis: 'y' });
    
    // 3. Top Inactividad Diaria (DESC)
    const inactividadTop = sortBy('Prom_Inactividad_Diaria').slice(0, 10);
    const bgColors = inactividadTop.map(g => {
        if (selectedGestor !== 'Todos' && g === selectedGestor) return 'rgba(54, 162, 235, 1)';
        let v = data[g].Prom_Inactividad_Diaria;
        return v > 45 ? 'rgba(245, 108, 108, 0.7)' : (v > 20 ? 'rgba(230, 162, 60, 0.7)' : 'rgba(103, 194, 58, 0.7)');
    });
    drawChart('chartInactividad', 'bar', inactividadTop, inactividadTop.map(g => data[g].Prom_Inactividad_Diaria), 'Minutos Inactividad', bgColors, bgColors);
"""

js = re.sub(
    r"// 1\. Top Alerta Tardanzas \(Peores 5, orden DESC\)\s*const peoresTardanzas = sortBy\('Prom_Minutos_Tarde'\)\.slice\(0, 5\);\s*drawChart\('chartTardanzasPeores', 'bar', peoresTardanzas, peoresTardanzas\.map\(g => data\[g\]\.Prom_Minutos_Tarde\), 'Minutos Tarde \(Promedio\)', 'rgba\(245, 108, 108, 0\.7\)', 'rgba\(245, 108, 108, 1\)', \{ indexAxis: 'y' \}\);\s*// 2\. Top Excelencia Puntualidad \(Mejores 5, orden ASC\)\s*const mejoresTardanzas = sortBy\('Prom_Minutos_Tarde', true\)\.slice\(0, 5\);\s*drawChart\('chartTardanzasMejores', 'bar', mejoresTardanzas, mejoresTardanzas\.map\(g => data\[g\]\.Prom_Minutos_Tarde\), 'Minutos Tarde \(Promedio\)', 'rgba\(103, 194, 58, 0\.7\)', 'rgba\(103, 194, 58, 1\)', \{ indexAxis: 'y' \}\);\s*// 3\. Top Inactividad Diaria \(DESC\)\s*const inactividadTop = sortBy\('Prom_Inactividad_Diaria'\);\s*const bgColors = inactividadTop\.map\(g => \{\s*let v = data\[g\]\.Prom_Inactividad_Diaria;\s*return v > 45 \? 'rgba\(245, 108, 108, 0\.7\)' : \(v > 20 \? 'rgba\(230, 162, 60, 0\.7\)' : 'rgba\(103, 194, 58, 0\.7\)'\);\s*\}\);\s*drawChart\('chartInactividad', 'bar', inactividadTop, inactividadTop\.map\(g => data\[g\]\.Prom_Inactividad_Diaria\), 'Minutos Inactividad', bgColors, bgColors\);",
    replacement.strip(),
    js,
    flags=re.DOTALL
)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
