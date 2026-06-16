let chartTopAlertaInstance = null;
let chartTopExcelenciaInstance = null;
let chartTopInactividadInstance = null;
let chartScatterInstance = null;

function parseShiftStart(shiftStr) {
    if (!shiftStr) return null;
    const m = shiftStr.match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return { h: parseInt(m[1], 10), min: parseInt(m[2], 10) };
}

function parseTimeFromLocaleString(timeStr) {
    if (!timeStr) return null;
    const m = timeStr.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    let min = parseInt(m[2], 10);
    let ampm = m[3] ? m[3].toLowerCase().replace(/\./g, '') : null;
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return { h, min };
}

function getTardiness(loginLocaleStr, shiftStr) {
    if (!shiftStr || shiftStr === 'Por Asignar' || shiftStr === 'Descansa' || shiftStr === 'N/A') return 0;
    
    const sched = parseShiftStart(shiftStr);
    const actual = parseTimeFromLocaleString(loginLocaleStr);
    
    if (!sched || !actual) return 0;
    
    let diff = (actual.h * 60 + actual.min) - (sched.h * 60 + sched.min);
    
    if (diff < -12 * 60) {
        diff += 24 * 60; // Cross-midnight late login
    }
    
    // Ignore early logins (diff < 0) or extremely late logins (> 12 hours)
    if (diff > 0 && diff < 12 * 60) {
        return diff;
    }
    return 0;
}

async function loadTiemposMetrics() {
    try {
        // Asegurarnos de que el horario global esté cargado para resolver turnos históricos
        if (!globalScheduleRows) {
            await loadSchedule();
        }
        
        const snapshot = await database.ref('shift_reports').once('value');
        const data = snapshot.val();
        if (!data) return;
        
        const gestorStats = {};
        
        Object.values(data).forEach(report => {
            if (report.rol !== 'Gestor') return;
            
            const gestorName = report.gestor;
            if (!gestorStats[gestorName]) {
                gestorStats[gestorName] = {
                    Dias_Laborados: 0,
                    Dias_Tarde: 0,
                    Minutos_Tarde_Total: 0,
                    Minutos_Inactividad_Total: 0
                };
            }
            
            // Determinar turno programado (historico vs nuevo formato)
            let turno = report.turnoProgramado;
            if (!turno || turno === 'Por Asignar') {
                // Inferir desde el horario de Excel usando la fecha del reporte
                const reportDate = report.timestamp ? new Date(report.timestamp) : new Date();
                turno = getShiftForDate(globalScheduleRows, globalScheduleBlocks, gestorName, reportDate);
            }
            
            // Tardanza
            const tardiness = getTardiness(report.horaInicio, turno);
            
            gestorStats[gestorName].Dias_Laborados++;
            gestorStats[gestorName].Minutos_Inactividad_Total += (report.inactividadTotalMins || 0);
            
            if (tardiness > 0) {
                gestorStats[gestorName].Dias_Tarde++;
                gestorStats[gestorName].Minutos_Tarde_Total += tardiness;
            }
        });
        
        // Final calculations
        const metrics = [];
        let grandTotalDias = 0;
        let grandTotalTarde = 0;
        let grandTotalInact = 0;
        
        Object.keys(gestorStats).forEach(gestor => {
            const stats = gestorStats[gestor];
            if (stats.Dias_Laborados === 0) return;
            
            const Prom_Minutos_Tarde = stats.Minutos_Tarde_Total / stats.Dias_Laborados;
            const Porcentaje_Frecuencia_Tarde = (stats.Dias_Tarde / stats.Dias_Laborados) * 100;
            const Prom_Inactividad_Diaria = stats.Minutos_Inactividad_Total / stats.Dias_Laborados;
            
            let Score_Tardanza = 40;
            if (Prom_Minutos_Tarde <= 3) Score_Tardanza = 100;
            else if (Prom_Minutos_Tarde <= 10) Score_Tardanza = 70;
            
            let Score_Inactividad = 20;
            if (Prom_Inactividad_Diaria <= 20) Score_Inactividad = 100;
            else if (Prom_Inactividad_Diaria <= 45) Score_Inactividad = 60;
            
            metrics.push({
                gestor,
                ...stats,
                Prom_Minutos_Tarde,
                Porcentaje_Frecuencia_Tarde,
                Prom_Inactividad_Diaria,
                Score_Tardanza,
                Score_Inactividad
            });
            
            grandTotalDias += stats.Dias_Laborados;
            grandTotalTarde += stats.Minutos_Tarde_Total;
            grandTotalInact += stats.Minutos_Inactividad_Total;
        });
        
        // Update top global KPIs
        document.getElementById('tiemposTotalDias').textContent = grandTotalDias;
        document.getElementById('tiemposTotalMinsTarde').textContent = grandTotalTarde + ' min';
        document.getElementById('tiemposTotalMinsInact').textContent = grandTotalInact + ' min';
        
        renderTiemposDashboard(metrics);
        
    } catch(e) {
        console.error("Error loading Tiempos metrics", e);
    }
}

function renderTiemposDashboard(metrics) {
    if (typeof Chart === 'undefined') return;
    
    // Sort logic
    const topAlerta = [...metrics].sort((a, b) => b.Prom_Minutos_Tarde - a.Prom_Minutos_Tarde).slice(0, 5);
    const topExcelencia = [...metrics].sort((a, b) => a.Prom_Minutos_Tarde - b.Prom_Minutos_Tarde).slice(0, 5);
    const topInactividad = [...metrics].sort((a, b) => b.Prom_Inactividad_Diaria - a.Prom_Inactividad_Diaria);
    
    // Clean old instances
    if(chartTopAlertaInstance) chartTopAlertaInstance.destroy();
    if(chartTopExcelenciaInstance) chartTopExcelenciaInstance.destroy();
    if(chartTopInactividadInstance) chartTopInactividadInstance.destroy();
    if(chartScatterInstance) chartScatterInstance.destroy();
    
    // 1. Chart Top Alerta (Rojo)
    const ctxAlerta = document.getElementById('chartTopAlerta').getContext('2d');
    chartTopAlertaInstance = new Chart(ctxAlerta, {
        type: 'bar',
        data: {
            labels: topAlerta.map(m => m.gestor.split(' ')[0]),
            datasets: [{
                label: 'Promedio Mins Tarde',
                data: topAlerta.map(m => m.Prom_Minutos_Tarde.toFixed(1)),
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                borderColor: '#ef4444',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#9CA3AF' }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#F3F4F6' }
                }
            }
        }
    });

    // 2. Chart Top Excelencia (Verde)
    const ctxExcelencia = document.getElementById('chartTopExcelencia').getContext('2d');
    chartTopExcelenciaInstance = new Chart(ctxExcelencia, {
        type: 'bar',
        data: {
            labels: topExcelencia.map(m => m.gestor.split(' ')[0]),
            datasets: [{
                label: 'Promedio Mins Tarde',
                data: topExcelencia.map(m => m.Prom_Minutos_Tarde.toFixed(1)),
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                borderColor: '#10b981',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#9CA3AF' }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#F3F4F6' }
                }
            }
        }
    });

    // 3. Chart Top Inactividad Diaria
    const ctxInactividad = document.getElementById('chartTopInactividad').getContext('2d');
    chartTopInactividadInstance = new Chart(ctxInactividad, {
        type: 'bar',
        data: {
            labels: topInactividad.map(m => m.gestor.split(' ')[0]),
            datasets: [{
                label: 'Promedio Inactividad (mins)',
                data: topInactividad.map(m => m.Prom_Inactividad_Diaria.toFixed(1)),
                backgroundColor: topInactividad.map(m => {
                    if(m.Prom_Inactividad_Diaria > 45) return 'rgba(239, 68, 68, 0.7)';
                    if(m.Prom_Inactividad_Diaria > 20) return 'rgba(245, 158, 11, 0.7)';
                    return 'rgba(16, 185, 129, 0.7)';
                }),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#9CA3AF' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#F3F4F6', autoSkip: false, maxRotation: 45, minRotation: 45 }
                }
            }
        }
    });

    // 4. Scatter Plot Cuadrantes
    const ctxScatter = document.getElementById('chartScatterCuadrantes').getContext('2d');
    chartScatterInstance = new Chart(ctxScatter, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Gestores',
                data: metrics.map(m => ({
                    x: m.Prom_Minutos_Tarde,
                    y: m.Prom_Inactividad_Diaria,
                    name: m.gestor.split(' ')[0]
                })),
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: '#3b82f6',
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return `${ctx.raw.name}: Tarde ${ctx.raw.x.toFixed(1)}m, Inact ${ctx.raw.y.toFixed(1)}m`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Promedio Tardanza (min)', color: '#9CA3AF' },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#9CA3AF' }
                },
                y: {
                    title: { display: true, text: 'Promedio Inactividad (min)', color: '#9CA3AF' },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#9CA3AF' }
                }
            }
        }
    });
}
