import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

new_charts_code = """function renderControlOperativoCharts(data, dailyData, selectedGestor) {
    const isGlobal = (selectedGestor === 'Todos');
    
    // UI titles update
    const elTitlePeores = document.getElementById('titleTardanzasPeores');
    const elTitleMejores = document.getElementById('titleTardanzasMejores');
    const elTitleInactividad = document.getElementById('titleInactividad');
    const elTitleEficiencia = document.getElementById('titleEficiencia');
    const elTitleMatriz = document.getElementById('titleMatrizFuga');

    if (isGlobal) {
        if (elTitlePeores) elTitlePeores.innerHTML = `<i class='bx bx-alarm-exclamation'></i> Top Alerta Tardanzas (Peores 5)`;
        if (elTitleMejores) elTitleMejores.innerHTML = `<i class='bx bx-medal'></i> Top Excelencia Puntualidad (Mejores 5)`;
        if (elTitleInactividad) elTitleInactividad.innerHTML = `<i class='bx bx-coffee-togo'></i> Promedio Inactividad Diaria (Min)`;
        if (elTitleEficiencia) elTitleEficiencia.innerHTML = `<i class='bx bx-layer'></i> Eficiencia y Volumen de Retiros`;
        if (elTitleMatriz) elTitleMatriz.innerHTML = `<i class='bx bx-bar-chart-alt-2'></i> Ranking de Porcentaje de Rechazos`;
    } else {
        if (elTitlePeores) elTitlePeores.innerHTML = `<i class='bx bx-alarm-exclamation'></i> Fechas con Llegada Tarde - ${selectedGestor}`;
        if (elTitleMejores) elTitleMejores.innerHTML = `<i class='bx bx-check-double'></i> Fechas de Conexión a Tiempo - ${selectedGestor}`;
        if (elTitleInactividad) elTitleInactividad.innerHTML = `<i class='bx bx-coffee-togo'></i> Inactividad Diaria por Fecha - ${selectedGestor}`;
        if (elTitleEficiencia) elTitleEficiencia.innerHTML = `<i class='bx bx-layer'></i> Evolución Diaria de Retiros - ${selectedGestor}`;
        if (elTitleMatriz) elTitleMatriz.innerHTML = `<i class='bx bx-target-lock'></i> Posición de Riesgo: ${selectedGestor}`;
    }

    let activeData = {};
    if (isGlobal) {
        activeData = data;
    } else {
        if (data[selectedGestor]) {
            activeData[selectedGestor] = data[selectedGestor];
        }
    }
    
    const gestores = Object.keys(activeData);
    const sortedDates = Object.keys(dailyData).sort();
    const sortBy = (key, asc=false) => [...gestores].sort((a,b) => asc ? activeData[a][key] - activeData[b][key] : activeData[b][key] - activeData[a][key]);

    if (isGlobal) {
        // 1. Top Alerta Tardanzas (Peores 5)
        let peoresTardanzas = sortBy('Prom_Minutos_Tarde').filter(g => activeData[g].Prom_Minutos_Tarde > 0).slice(0, 5);
        let peoresColors, peoresBorders, peoresData;
        if (peoresTardanzas.length === 0) {
            peoresTardanzas = ['Equipo 100% Puntual'];
            peoresData = [0];
            peoresColors = ['rgba(103, 194, 58, 0.7)'];
            peoresBorders = ['rgba(103, 194, 58, 1)'];
        } else {
            peoresData = peoresTardanzas.map(g => activeData[g].Prom_Minutos_Tarde);
            peoresColors = peoresTardanzas.map(() => 'rgba(245, 108, 108, 0.7)');
            peoresBorders = peoresTardanzas.map(() => 'rgba(245, 108, 108, 1)');
        }
        drawChart('chartTardanzasPeores', 'bar', peoresTardanzas, peoresData, 'Minutos Tarde (Promedio)', peoresColors, peoresBorders, { indexAxis: 'y' });
        
        // 2. Top Excelencia Puntualidad (Mejores 5)
        let mejoresTardanzas = sortBy('Prom_Minutos_Tarde', true).slice(0, 5).reverse();
        const mejoresColors = mejoresTardanzas.map(() => 'rgba(103, 194, 58, 0.7)');
        const mejoresBorders = mejoresTardanzas.map(() => 'rgba(103, 194, 58, 1)');
        drawChart('chartTardanzasMejores', 'bar', mejoresTardanzas, mejoresTardanzas.map(g => activeData[g].Prom_Minutos_Tarde), 'Minutos Tarde (Promedio)', mejoresColors, mejoresBorders, { indexAxis: 'y' });

        // 3. Promedio Inactividad Diaria
        const inactividadTop = sortBy('Prom_Inactividad_Diaria').slice(0, 10);
        const bgColors = inactividadTop.map(g => {
            let v = activeData[g].Prom_Inactividad_Diaria;
            return v > 45 ? 'rgba(245, 108, 108, 0.7)' : (v > 20 ? 'rgba(230, 162, 60, 0.7)' : 'rgba(103, 194, 58, 0.7)');
        });
        drawChart('chartInactividad', 'bar', inactividadTop, inactividadTop.map(g => activeData[g].Prom_Inactividad_Diaria), 'Minutos Inactividad', bgColors, bgColors);
    
    } else {
        // SINGLE GESTOR:
        // 1. Fechas con Llegadas Tarde (Dates where Minutos_Tarde_Total > 0)
        const lateDates = [];
        const lateMins = [];
        sortedDates.forEach(date => {
            const raw = window.controlOperativoRawData[selectedGestor]?.[date];
            if (raw && (raw.Minutos_Tarde_Total || 0) > 0) {
                lateDates.push(date);
                lateMins.push(raw.Minutos_Tarde_Total);
            }
        });

        if (lateDates.length === 0) {
            drawChart('chartTardanzasPeores', 'bar', ['Sin Llegadas Tardes en el Periodo'], [0], 'Minutos Tarde', ['rgba(103, 194, 58, 0.7)'], ['rgba(103, 194, 58, 1)'], { indexAxis: 'y' });
        } else {
            const lateColors = lateDates.map(() => 'rgba(245, 108, 108, 0.8)');
            drawChart('chartTardanzasPeores', 'bar', lateDates, lateMins, 'Minutos Tarde', lateColors, lateColors, { indexAxis: 'y' });
        }

        // 2. Fechas de Conexión a Tiempo (Dates where Dias_Laborados > 0 AND Minutos_Tarde_Total === 0)
        const punctualDates = [];
        sortedDates.forEach(date => {
            const raw = window.controlOperativoRawData[selectedGestor]?.[date];
            if (raw && raw.Dias_Laborados > 0 && (raw.Minutos_Tarde_Total || 0) === 0) {
                punctualDates.push(date);
            }
        });

        if (punctualDates.length === 0) {
            drawChart('chartTardanzasMejores', 'bar', ['Sin Conexiones a Tiempo en el Periodo'], [0], 'Conexión a Tiempo', ['rgba(245, 108, 108, 0.7)'], ['rgba(245, 108, 108, 1)'], { indexAxis: 'y' });
        } else {
            const punctualData = punctualDates.map(() => 0);
            const punctualColors = punctualDates.map(() => 'rgba(103, 194, 58, 0.8)');
            drawPunctualDatesChart('chartTardanzasMejores', punctualDates, punctualData, punctualColors);
        }

        // 3. Inactividad Diaria por Fecha
        const dailyInactivityValues = sortedDates.map(date => {
            return window.controlOperativoRawData[selectedGestor]?.[date]?.Minutos_Inactividad_Total || 0;
        });
        const dailyBgColors = dailyInactivityValues.map(v => {
            return v > 45 ? 'rgba(245, 108, 108, 0.7)' : (v > 20 ? 'rgba(230, 162, 60, 0.7)' : 'rgba(103, 194, 58, 0.7)');
        });
        drawChart('chartInactividad', 'bar', sortedDates, dailyInactivityValues, `Inactividad (Min)`, dailyBgColors, dailyBgColors);
    }
    
    // 4. Aprobaciones por Día Chart
    const dailyAprobados = sortedDates.map(date => dailyData[date].Aprobados);
    const dailyRechazados = sortedDates.map(date => dailyData[date].Rechazados);
    
    destroyChart('chartAprobacionesDia');
    const ctxAprobDia = document.getElementById('chartAprobacionesDia').getContext('2d');
    
    const datalabelsDaily = {
        formatter: function(value) {
            if (value === 0 || value === "0") return "";
            return value.toLocaleString('es-CO');
        },
        anchor: 'end', align: 'top', color: '#666', font: { size: 10, weight: 'bold' }
    };

    controlOperativoCharts['chartAprobacionesDia'] = new Chart(ctxAprobDia, {
        type: 'line',
        plugins: [typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {}],
        data: {
            labels: sortedDates,
            datasets: [
                {
                    label: 'Aprobados',
                    data: dailyAprobados,
                    borderColor: 'rgba(103, 194, 58, 1)',
                    backgroundColor: 'rgba(103, 194, 58, 0.2)',
                    fill: true,
                    tension: 0.3,
                    datalabels: { align: 'top', anchor: 'end', color: '#fff', textStrokeColor: 'rgba(103, 194, 58, 1)', textStrokeWidth: 3 }
                },
                {
                    label: 'Rechazados',
                    data: dailyRechazados,
                    borderColor: 'rgba(245, 108, 108, 1)',
                    backgroundColor: 'rgba(245, 108, 108, 0.2)',
                    fill: true,
                    tension: 0.3,
                    datalabels: { align: 'top', anchor: 'end', color: '#fff', textStrokeColor: 'rgba(245, 108, 108, 1)', textStrokeWidth: 3 }
                }
            ]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 30 } },
            plugins: {
                datalabels: datalabelsDaily,
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: { beginAtZero: true, grace: '15%' }
            }
        }
    });
    
    // 5. Eficiencia y Volumen de Retiros
    if (isGlobal) {
        const volTop = sortBy('Retiros_Procesados');
        drawCombinedChart('chartEficiencia', volTop, activeData);
    } else {
        drawCombinedChartDaily('chartEficiencia', sortedDates, selectedGestor);
    }
    
    // 6. Matriz de Riesgo: Fugas vs Velocidad / Rechazos
    drawScatterMatriz('chartMatrizFuga', gestores, activeData, isGlobal);
}

function drawPunctualDatesChart(id, dates, dataArr, bgColors) {
    destroyChart(id);
    const ctx = document.getElementById(id).getContext('2d');
    
    const datalabelsConfig = {
        formatter: function() {
            return "A Tiempo (0 min)";
        },
        anchor: 'end',
        align: 'right',
        color: '#67C23A',
        font: { size: 10, weight: 'bold' }
    };

    controlOperativoCharts[id] = new Chart(ctx, {
        type: 'bar',
        plugins: [typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {}],
        data: {
            labels: dates,
            datasets: [{
                label: 'Conexión a Tiempo',
                data: dataArr,
                backgroundColor: bgColors,
                borderColor: bgColors,
                borderWidth: 1
            }]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            layout: {
                padding: { right: 110 }
            },
            plugins: {
                datalabels: datalabelsConfig,
                tooltip: {
                    callbacks: {
                        label: function() {
                            return "Conexión a Tiempo (0 min tarde)";
                        }
                    }
                }
            },
            scales: {
                x: { beginAtZero: true, max: 1 }
            }
        }
    });
}"""

pattern = r"function renderControlOperativoCharts\(data, dailyData, selectedGestor\) \{.*?\nfunction drawChart"
js = re.sub(pattern, new_charts_code + "\n\nfunction drawChart", js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
