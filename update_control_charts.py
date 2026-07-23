import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

new_charts_code = """function renderControlOperativoCharts(data, dailyData, selectedGestor) {
    const isGlobal = (selectedGestor === 'Todos');
    
    // Filter dataset if a specific gestor is selected
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
    
    // Sort logic
    const sortBy = (key, asc=false) => [...gestores].sort((a,b) => asc ? activeData[a][key] - activeData[b][key] : activeData[b][key] - activeData[a][key]);
    
    // 1. Top Alerta Tardanzas
    let peoresTardanzas = sortBy('Prom_Minutos_Tarde').filter(g => activeData[g].Prom_Minutos_Tarde > 0);
    if (isGlobal) peoresTardanzas = peoresTardanzas.slice(0, 5);

    let peoresColors, peoresBorders, peoresData;
    if (peoresTardanzas.length === 0) {
        peoresTardanzas = [isGlobal ? 'Equipo 100% Puntual' : selectedGestor];
        peoresData = [0];
        peoresColors = ['rgba(103, 194, 58, 0.7)'];
        peoresBorders = ['rgba(103, 194, 58, 1)'];
    } else {
        peoresData = peoresTardanzas.map(g => activeData[g].Prom_Minutos_Tarde);
        peoresColors = peoresTardanzas.map(() => 'rgba(245, 108, 108, 0.7)');
        peoresBorders = peoresTardanzas.map(() => 'rgba(245, 108, 108, 1)');
    }
    drawChart('chartTardanzasPeores', 'bar', peoresTardanzas, peoresData, 'Minutos Tarde (Promedio)', peoresColors, peoresBorders, { indexAxis: 'y' });
    
    // 2. Top Excelencia Puntualidad
    let mejoresTardanzas = sortBy('Prom_Minutos_Tarde', true);
    if (isGlobal) mejoresTardanzas = mejoresTardanzas.slice(0, 5).reverse();

    const mejoresColors = mejoresTardanzas.map(() => 'rgba(103, 194, 58, 0.7)');
    const mejoresBorders = mejoresTardanzas.map(() => 'rgba(103, 194, 58, 1)');
    drawChart('chartTardanzasMejores', 'bar', mejoresTardanzas, mejoresTardanzas.map(g => activeData[g].Prom_Minutos_Tarde), 'Minutos Tarde (Promedio)', mejoresColors, mejoresBorders, { indexAxis: 'y' });
    
    // 3. Promedio Inactividad Diaria (Min)
    if (isGlobal) {
        const inactividadTop = sortBy('Prom_Inactividad_Diaria').slice(0, 10);
        const bgColors = inactividadTop.map(g => {
            let v = activeData[g].Prom_Inactividad_Diaria;
            return v > 45 ? 'rgba(245, 108, 108, 0.7)' : (v > 20 ? 'rgba(230, 162, 60, 0.7)' : 'rgba(103, 194, 58, 0.7)');
        });
        drawChart('chartInactividad', 'bar', inactividadTop, inactividadTop.map(g => activeData[g].Prom_Inactividad_Diaria), 'Minutos Inactividad', bgColors, bgColors);
    } else {
        const dailyInactivityValues = sortedDates.map(date => {
            return window.controlOperativoRawData[selectedGestor]?.[date]?.Minutos_Inactividad_Total || 0;
        });
        const dailyBgColors = dailyInactivityValues.map(v => {
            return v > 45 ? 'rgba(245, 108, 108, 0.7)' : (v > 20 ? 'rgba(230, 162, 60, 0.7)' : 'rgba(103, 194, 58, 0.7)');
        });
        drawChart('chartInactividad', 'bar', sortedDates, dailyInactivityValues, `Inactividad Diaria (Min)`, dailyBgColors, dailyBgColors);
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

function drawChart(id, type, labels, dataArr, labelStr, bgColor, borderColor, extraOptions = {}) {
    destroyChart(id);
    const ctx = document.getElementById(id).getContext('2d');
    
    const isHorizontal = extraOptions.indexAxis === 'y';
    const datalabelsConfig = {
        formatter: function(value) {
            if (value === 0 || value === "0") return "0 min";
            const num = Number(value);
            const isInt = Number.isInteger(num);
            return num.toLocaleString('es-CO', { 
                minimumFractionDigits: isInt ? 0 : 2, 
                maximumFractionDigits: isInt ? 0 : 2 
            });
        },
        anchor: 'end',
        align: isHorizontal ? 'right' : 'top',
        color: '#666',
        font: { size: 10, weight: 'bold' }
    };

    if (!extraOptions.plugins) extraOptions.plugins = {};
    if (!extraOptions.plugins.datalabels) extraOptions.plugins.datalabels = datalabelsConfig;

    controlOperativoCharts[id] = new Chart(ctx, {
        type: type,
        plugins: [typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {}],
        data: {
            labels: labels,
            datasets: [{
                label: labelStr,
                data: dataArr,
                backgroundColor: bgColor,
                borderColor: borderColor,
                borderWidth: 1
            }]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: isHorizontal ? 0 : 20,
                    right: isHorizontal ? 40 : 0
                }
            },
            ...extraOptions
        }
    });
}

function drawCombinedChart(id, labels, data) {
    destroyChart(id);
    const ctx = document.getElementById(id).getContext('2d');
    
    const datalabelsConfig = {
        formatter: function(value) {
            if (value === 0 || value === "0") return "";
            const num = Number(value);
            const isInt = Number.isInteger(num);
            return num.toLocaleString('es-CO', { 
                minimumFractionDigits: isInt ? 0 : 2, 
                maximumFractionDigits: isInt ? 0 : 2 
            });
        },
        anchor: 'end',
        align: 'top',
        color: '#666',
        font: { size: 11, weight: 'bold' }
    };

    controlOperativoCharts[id] = new Chart(ctx, {
        type: 'bar',
        plugins: [typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {}],
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Aprobados',
                    data: labels.map(g => data[g].Retiros_Aprobados),
                    backgroundColor: 'rgba(103, 194, 58, 0.7)',
                    datalabels: { align: 'center', anchor: 'center', color: '#fff', textStrokeColor: 'rgba(0,0,0,0.5)', textStrokeWidth: 3 }
                },
                {
                    label: 'Rechazados',
                    data: labels.map(g => data[g].Retiros_Rechazados),
                    backgroundColor: 'rgba(245, 108, 108, 0.7)',
                    datalabels: { align: 'center', anchor: 'center', color: '#fff', textStrokeColor: 'rgba(0,0,0,0.6)', textStrokeWidth: 3 }
                },
                {
                    label: 'Tasa Aprobación / Día',
                    data: labels.map(g => data[g].Tasa_Aprobacion_Dia),
                    type: 'line',
                    borderColor: 'rgba(64, 158, 255, 1)',
                    backgroundColor: 'rgba(64, 158, 255, 1)',
                    yAxisID: 'y1',
                    datalabels: { align: 'top', anchor: 'end', color: '#fff', textStrokeColor: 'rgba(64, 158, 255, 1)', textStrokeWidth: 3 }
                }
            ]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 30 } },
            plugins: {
                datalabels: datalabelsConfig,
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: { stacked: true },
                y: { stacked: true, position: 'left', grace: '10%' },
                y1: { position: 'right', grid: { drawOnChartArea: false }, grace: '15%' }
            }
        }
    });
}

function drawCombinedChartDaily(id, sortedDates, selectedGestor) {
    destroyChart(id);
    const ctx = document.getElementById(id).getContext('2d');

    const aprobadosData = sortedDates.map(d => window.controlOperativoRawData[selectedGestor]?.[d]?.Retiros_Aprobados || 0);
    const rechazadosData = sortedDates.map(d => window.controlOperativoRawData[selectedGestor]?.[d]?.Retiros_Rechazados || 0);
    const tasaData = sortedDates.map(d => window.controlOperativoRawData[selectedGestor]?.[d]?.Retiros_Aprobados || 0);

    const datalabelsConfig = {
        formatter: function(value) {
            if (value === 0 || value === "0") return "";
            return Number(value).toLocaleString('es-CO');
        },
        anchor: 'end',
        align: 'top',
        color: '#666',
        font: { size: 11, weight: 'bold' }
    };

    controlOperativoCharts[id] = new Chart(ctx, {
        type: 'bar',
        plugins: [typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {}],
        data: {
            labels: sortedDates,
            datasets: [
                {
                    label: 'Aprobados',
                    data: aprobadosData,
                    backgroundColor: 'rgba(103, 194, 58, 0.7)',
                    datalabels: { align: 'center', anchor: 'center', color: '#fff', textStrokeColor: 'rgba(0,0,0,0.5)', textStrokeWidth: 3 }
                },
                {
                    label: 'Rechazados',
                    data: rechazadosData,
                    backgroundColor: 'rgba(245, 108, 108, 0.7)',
                    datalabels: { align: 'center', anchor: 'center', color: '#fff', textStrokeColor: 'rgba(0,0,0,0.6)', textStrokeWidth: 3 }
                },
                {
                    label: 'Aprobaciones del Día',
                    data: tasaData,
                    type: 'line',
                    borderColor: 'rgba(64, 158, 255, 1)',
                    backgroundColor: 'rgba(64, 158, 255, 1)',
                    yAxisID: 'y1',
                    datalabels: { align: 'top', anchor: 'end', color: '#fff', textStrokeColor: 'rgba(64, 158, 255, 1)', textStrokeWidth: 3 }
                }
            ]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 30 } },
            plugins: {
                datalabels: datalabelsConfig,
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: { stacked: true },
                y: { stacked: true, position: 'left', grace: '10%' },
                y1: { position: 'right', grid: { drawOnChartArea: false }, grace: '15%' }
            }
        }
    });
}

function drawScatterMatriz(id, gestores, data, isGlobal = true) {
    destroyChart(id);
    const ctx = document.getElementById(id).getContext('2d');
    
    if (isGlobal) {
        const sortedGestores = [...gestores].sort((a,b) => (data[b].Porcentaje_Rechazos || 0) - (data[a].Porcentaje_Rechazos || 0));
        const rechazosData = sortedGestores.map(g => data[g].Porcentaje_Rechazos || 0);
        const colors = rechazosData.map(v => v > 5 ? 'rgba(245, 108, 108, 0.8)' : (v > 2 ? 'rgba(230, 162, 60, 0.8)' : 'rgba(103, 194, 58, 0.8)'));

        const datalabelsConfig = {
            formatter: function(value) {
                return `${value}%`;
            },
            anchor: 'end',
            align: 'top',
            color: '#666',
            font: { size: 11, weight: 'bold' }
        };

        controlOperativoCharts[id] = new Chart(ctx, {
            type: 'bar',
            plugins: [typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {}],
            data: {
                labels: sortedGestores,
                datasets: [{
                    label: 'Porcentaje de Rechazos (%)',
                    data: rechazosData,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 30 } },
                plugins: {
                    datalabels: datalabelsConfig,
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                return `% Rechazos: ${ctx.raw}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true, grace: '15%', title: { display: true, text: '% Rechazos' } }
                }
            }
        });
    } else {
        const gestor = gestores[0];
        const gData = data[gestor];
        const scatterPoint = gData ? [{
            x: gData.Tasa_Aprobacion_Dia || 0,
            y: gData.Porcentaje_Rechazos || 0,
            name: gestor
        }] : [];

        const datalabelsConfig = {
            formatter: function(value) {
                return `${value.name}\\n(Tasa: ${value.x}/día, Rechazos: ${value.y}%)`;
            },
            anchor: 'center',
            align: 'top',
            color: '#409EFF',
            font: { size: 11, weight: 'bold' }
        };

        controlOperativoCharts[id] = new Chart(ctx, {
            type: 'scatter',
            plugins: [typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {}],
            data: {
                datasets: [{
                    label: gestor || 'Gestor',
                    data: scatterPoint,
                    backgroundColor: 'rgba(64, 158, 255, 0.9)',
                    borderColor: 'rgba(64, 158, 255, 1)',
                    pointRadius: 10,
                    pointHoverRadius: 12
                }]
            },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 45, right: 45 } },
                plugins: {
                    datalabels: datalabelsConfig,
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                let item = ctx.raw;
                                return `${item.name}: Tasa Aprob.= ${item.x}/día, % Rechazos= ${item.y}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: { beginAtZero: true, title: { display: true, text: 'Tasa Aprobación / Día' }, grace: '25%' },
                    y: { beginAtZero: true, title: { display: true, text: 'Porcentaje Rechazos (%)' }, grace: '25%' }
                }
            }
        });
    }
}"""

pattern = r"function renderControlOperativoCharts\(data, dailyData, selectedGestor\) \{.*?function drawScatterMatriz\(id, gestores, data\) \{.*?\n\}"
js = re.sub(pattern, new_charts_code, js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
