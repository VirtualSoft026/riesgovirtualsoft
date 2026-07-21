import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

replacement_logic = """
    // Aggregation logic
    let aggregatedData = {};
    let aggregatedDataGlobal = {};
    let dailyData = {};
    
    for (const gestor in window.controlOperativoRawData) {
        
        aggregatedDataGlobal[gestor] = {
            Retiros_Aprobados: 0,
            Retiros_Rechazados: 0,
            Tiempo_Total_Desde_Creacion_Segundos: 0,
            Retiros_Con_Fuga: 0,
            Dias_Tarde: 0,
            Minutos_Tarde_Total: 0,
            Minutos_Inactividad_Total: 0,
            Dias_Laborados: 0
        };

        if (selectedGestor === 'Todos' || gestor === selectedGestor) {
            aggregatedData[gestor] = {
                Retiros_Aprobados: 0,
                Retiros_Rechazados: 0,
                Tiempo_Total_Desde_Creacion_Segundos: 0,
                Retiros_Con_Fuga: 0,
                Dias_Tarde: 0,
                Minutos_Tarde_Total: 0,
                Minutos_Inactividad_Total: 0,
                Dias_Laborados: 0
            };
        }
        
        for (const fecha in window.controlOperativoRawData[gestor]) {
            let inRange = false;
            if (selectedFecha === 'Todas') {
                inRange = true;
            } else if (selectedFecha === 'today' && fecha === todayStr) {
                inRange = true;
            } else if (selectedFecha === 'yesterday' && fecha === yesterdayStr) {
                inRange = true;
            } else if (selectedFecha === '7' && fecha >= sevenDaysAgoStr && fecha <= todayStr) {
                inRange = true;
            } else if (selectedFecha === '30' && fecha >= thirtyDaysAgoStr && fecha <= todayStr) {
                inRange = true;
            } else if (selectedFecha === 'mes' && fecha.substring(0, 7) === thisMonth) {
                inRange = true;
            } else if (selectedFecha === 'mes_anterior' && fecha.substring(0, 7) === lastMonth) {
                inRange = true;
            } else if (selectedFecha === 'custom' && customStart && customEnd && fecha >= customStart && fecha <= customEnd) {
                inRange = true;
            }
            
            if (inRange) {
                const d = window.controlOperativoRawData[gestor][fecha];
                
                // Add to Global Data
                aggregatedDataGlobal[gestor].Retiros_Aprobados += d.Retiros_Aprobados || 0;
                aggregatedDataGlobal[gestor].Retiros_Rechazados += d.Retiros_Rechazados || 0;
                aggregatedDataGlobal[gestor].Tiempo_Total_Desde_Creacion_Segundos += d.Tiempo_Total_Desde_Creacion_Segundos || 0;
                aggregatedDataGlobal[gestor].Retiros_Con_Fuga += d.Retiros_Con_Fuga || 0;
                aggregatedDataGlobal[gestor].Dias_Tarde += d.Dias_Tarde || 0;
                aggregatedDataGlobal[gestor].Minutos_Tarde_Total += d.Minutos_Tarde_Total || 0;
                aggregatedDataGlobal[gestor].Minutos_Inactividad_Total += d.Minutos_Inactividad_Total || 0;
                aggregatedDataGlobal[gestor].Dias_Laborados += d.Dias_Laborados || 0;

                // Add to Filtered Data (only if this gestor is selected)
                if (selectedGestor === 'Todos' || gestor === selectedGestor) {
                    if (!dailyData[fecha]) {
                        dailyData[fecha] = { Aprobados: 0, Rechazados: 0 };
                    }
                    dailyData[fecha].Aprobados += d.Retiros_Aprobados || 0;
                    dailyData[fecha].Rechazados += d.Retiros_Rechazados || 0;
                    
                    aggregatedData[gestor].Retiros_Aprobados += d.Retiros_Aprobados || 0;
                    aggregatedData[gestor].Retiros_Rechazados += d.Retiros_Rechazados || 0;
                    aggregatedData[gestor].Tiempo_Total_Desde_Creacion_Segundos += d.Tiempo_Total_Desde_Creacion_Segundos || 0;
                    aggregatedData[gestor].Retiros_Con_Fuga += d.Retiros_Con_Fuga || 0;
                    aggregatedData[gestor].Dias_Tarde += d.Dias_Tarde || 0;
                    aggregatedData[gestor].Minutos_Tarde_Total += d.Minutos_Tarde_Total || 0;
                    aggregatedData[gestor].Minutos_Inactividad_Total += d.Minutos_Inactividad_Total || 0;
                    aggregatedData[gestor].Dias_Laborados += d.Dias_Laborados || 0;
                }
            }
        }
    }
    
    // Calculate final metrics per gestor
    for (const gestor in aggregatedData) {
        const d = aggregatedData[gestor];
        const dl = d.Dias_Laborados > 0 ? d.Dias_Laborados : 1;
        
        d.Prom_Minutos_Tarde = Math.round((d.Minutos_Tarde_Total / dl) * 100) / 100;
        d.Prom_Inactividad_Diaria = Math.round((d.Minutos_Inactividad_Total / dl) * 100) / 100;
        d.Retiros_Procesados = d.Retiros_Aprobados + d.Retiros_Rechazados;
        d.ART_Desde_Creacion_Minutos = d.Retiros_Procesados > 0 ? Math.round((d.Tiempo_Total_Desde_Creacion_Segundos / d.Retiros_Procesados) / 60 * 100) / 100 : 0;
        d.Porcentaje_Fuga = d.Retiros_Aprobados > 0 ? Math.round((d.Retiros_Con_Fuga / d.Retiros_Aprobados) * 100 * 100) / 100 : 0;
    }

    // Calculate final metrics per gestor GLOBAL
    for (const gestor in aggregatedDataGlobal) {
        const d = aggregatedDataGlobal[gestor];
        const dl = d.Dias_Laborados > 0 ? d.Dias_Laborados : 1;
        
        d.Prom_Minutos_Tarde = Math.round((d.Minutos_Tarde_Total / dl) * 100) / 100;
        d.Prom_Inactividad_Diaria = Math.round((d.Minutos_Inactividad_Total / dl) * 100) / 100;
        d.Retiros_Procesados = d.Retiros_Aprobados + d.Retiros_Rechazados;
        d.ART_Desde_Creacion_Minutos = d.Retiros_Procesados > 0 ? Math.round((d.Tiempo_Total_Desde_Creacion_Segundos / d.Retiros_Procesados) / 60 * 100) / 100 : 0;
        d.Porcentaje_Fuga = d.Retiros_Aprobados > 0 ? Math.round((d.Retiros_Con_Fuga / d.Retiros_Aprobados) * 100 * 100) / 100 : 0;
    }
"""

js = re.sub(
    r"// Aggregation logic\s+let aggregatedData = \{\};\s+let dailyData = \{\};\s+for \(const gestor in window\.controlOperativoRawData\) \{.*?\/\/\s*Calculate final metrics per gestor\s*for \(const gestor in aggregatedData\) \{.*?Porcentaje_Fuga.*?\}",
    replacement_logic.strip(),
    js,
    flags=re.DOTALL
)

replacement_charts = """
    // Render charts
    // Filter out empty gestores for global charts
    const globalForCharts = {};
    for (const gestor in aggregatedDataGlobal) {
        if (aggregatedDataGlobal[gestor].Retiros_Procesados > 0 || aggregatedDataGlobal[gestor].Dias_Laborados > 0) {
            globalForCharts[gestor] = aggregatedDataGlobal[gestor];
        }
    }
    
    // We pass globalForCharts to the charts so rankings always compare the whole team.
    // However, we pass dailyData which is specific to the selected gestor so the line chart is filtered.
    renderControlOperativoCharts(globalForCharts, dailyData, selectedGestor);
}

function renderControlOperativoCharts(data, dailyData, selectedGestor) {
"""

js = re.sub(
    r'// Render charts\s*// Filter out empty gestores for charts\s*const filteredForCharts = \{\};\s*for \(const gestor in aggregatedData\) \{.*?\}.*?renderControlOperativoCharts\(filteredForCharts, dailyData\);\s*\}\s*function renderControlOperativoCharts\(data, dailyData\) \{',
    replacement_charts.strip(),
    js,
    flags=re.DOTALL
)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
