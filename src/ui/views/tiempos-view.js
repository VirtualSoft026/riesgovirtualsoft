/**
 * Vista de «Control de Tiempos» (paso 3.4, W-28 y DE-4 = a): gráficas Chart.js, KPI y tabla de cumplimiento.
 *
 * Es el render de js/tiempos.js movido sin cambios de contenido. Las dependencias del entorno entran por parámetro
 * (documento, Chart.js, plugin de etiquetas y escapeHTML). El estado de las gráficas vive en el factory, así que
 * cada vista destruye sus propias instancias antes de volver a dibujar.
 */

/**
 * @param {{doc: any, Chart: any, ChartDataLabels?: any, escapeHTML: (value: unknown) => string}} deps
 * @returns {{renderTotals: (totals: {dias: number, tarde: number, inact: number}) => void, renderDashboard: (metrics: any[]) => void}}
 */
export function createTiemposView({ doc, Chart, ChartDataLabels, escapeHTML }) {
    const charts = { alerta: null, excelencia: null, inactividad: null, scatter: null };

    /** KPI superiores (los mismos ids que index.html). */
    function renderTotals(totals) {
        doc.getElementById('tiemposTotalDias').textContent = totals.dias;
        doc.getElementById('tiemposTotalMinsTarde').textContent = Math.round(totals.tarde) + ' min';
        doc.getElementById('tiemposTotalMinsInact').textContent = Math.round(totals.inact) + ' min';
    }

    function renderDashboard(metrics) {
        if (typeof Chart === 'undefined') return;
        if (typeof ChartDataLabels !== 'undefined') {
            Chart.register(ChartDataLabels);
        }

        // Sort logic
        const topAlerta = [...metrics].sort((a, b) => b.Minutos_Tarde_Total - a.Minutos_Tarde_Total).slice(0, 5);
        const topExcelencia = [...metrics].sort((a, b) => a.Minutos_Tarde_Total - b.Minutos_Tarde_Total).slice(0, 5).reverse();
        const topInactividad = [...metrics].sort((a, b) => b.Minutos_Inactividad_Total - a.Minutos_Inactividad_Total);

        // Clean old instances
        if(charts.alerta) charts.alerta.destroy();
        if(charts.excelencia) charts.excelencia.destroy();
        if(charts.inactividad) charts.inactividad.destroy();
        if(charts.scatter) charts.scatter.destroy();

        const gestorFilterEl = doc.getElementById('tiemposGestorFilter');
        const isSingleGestor = gestorFilterEl && gestorFilterEl.value !== 'all';

        const labelTardanza = isSingleGestor ? 'Días con Más Tardanza' : 'Más Tarde al Turno';
        const labelExcelencia = isSingleGestor ? 'Días con Menos Tardanza' : 'Más Temprano al Turno';
        const labelInactividad = isSingleGestor ? 'Inactividad por Día' : 'Promedio Inactividad Diaria';

        // 1. Chart Top Alerta
        const ctxAlerta = doc.getElementById('chartTopAlerta').getContext('2d');
        charts.alerta = new Chart(ctxAlerta, {
            type: 'bar',
            data: {
                labels: topAlerta.map(m => {
                    let parts = m.gestor.split(' ');
                    if (parts.length >= 3) {
                        return parts[0] + ' ' + parts[parts.length - 2];
                    }
                    return m.gestor;
                }),
                datasets: [{
                    label: labelTardanza,
                    data: topAlerta.map(m => m.Minutos_Tarde_Total),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: '#ef4444',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', 
                responsive: true, 
                maintainAspectRatio: false, 
                layout: { padding: { right: 40 } },
                plugins: { 
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        color: '#ef4444',
                        font: { weight: 'bold', size: 11 },
                        formatter: function(value) { return Math.round(value) + ' m'; }
                    }
                }, 
                scales: { x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#6B7280' } }, y: { grid: { display: false }, ticks: { color: '#4B5563', font: { weight: 'bold' } } } } 
            }
        });

        // 2. Chart Top Excelencia
        const ctxExcelencia = doc.getElementById('chartTopExcelencia').getContext('2d');
        charts.excelencia = new Chart(ctxExcelencia, {
            type: 'bar',
            data: {
                labels: topExcelencia.map(m => {
                    let parts = m.gestor.split(' ');
                    if (parts.length >= 3) {
                        return parts[0] + ' ' + parts[parts.length - 2];
                    }
                    return m.gestor;
                }),
                datasets: [{
                    label: labelExcelencia,
                    data: topExcelencia.map(m => m.Minutos_Tarde_Total),
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10b981',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', 
                responsive: true, 
                maintainAspectRatio: false, 
                layout: { padding: { right: 40 } },
                plugins: { 
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        color: '#10b981',
                        font: { weight: 'bold', size: 11 },
                        formatter: function(value) { return Math.round(value) + ' m'; }
                    }
                }, 
                scales: { x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#6B7280' } }, y: { grid: { display: false }, ticks: { color: '#4B5563', font: { weight: 'bold' } } } } 
            }
        });

        // 3. Chart Top Inactividad Diaria
        const ctxInactividad = doc.getElementById('chartTopInactividad').getContext('2d');
        charts.inactividad = new Chart(ctxInactividad, {
            type: 'bar',
            data: {
                labels: topInactividad.map(m => {
                    let parts = m.gestor.split(' ');
                    if (parts.length >= 3) {
                        return parts[0] + ' ' + parts[parts.length - 2];
                    }
                    return m.gestor;
                }),
                datasets: [{
                    label: labelInactividad,
                    data: topInactividad.map(m => m.Minutos_Inactividad_Total),
                    backgroundColor: topInactividad.map(m => {
                        if(m.Minutos_Inactividad_Total > 45) return 'rgba(239, 68, 68, 0.7)';
                        if(m.Minutos_Inactividad_Total > 20) return 'rgba(245, 158, 11, 0.7)';
                        return 'rgba(16, 185, 129, 0.7)';
                    }),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 25 } },
                plugins: { 
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        color: '#4B5563',
                        font: { weight: 'bold', size: 11 },
                        formatter: function(value) { return Math.round(value) + ' min'; }
                    }
                },
                scales: {
                    y: {
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { color: '#6B7280' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#4B5563', font: { weight: 'bold' }, autoSkip: false, maxRotation: 45, minRotation: 45 }
                    }
                }
            }
        });

        // 4. Scatter Plot Cuadrantes
        const ctxScatter = doc.getElementById('chartScatterCuadrantes').getContext('2d');
        charts.scatter = new Chart(ctxScatter, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Gestores',
                    data: metrics.map(m => ({
                        x: m.Minutos_Tarde_Total,
                        y: m.Minutos_Inactividad_Total,
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
                layout: { padding: { top: 20, right: 20 } },
                plugins: {
                    legend: { display: false },
                    datalabels: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                return `${ctx.raw.name}: Tarde ${ctx.raw.x}m, Inact ${ctx.raw.y}m`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Total Tardanza (min)', color: '#6B7280', font: { weight: 'bold' } },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { color: '#6B7280' }
                    },
                    y: {
                        title: { display: true, text: 'Total Inactividad (min)', color: '#6B7280', font: { weight: 'bold' } },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { color: '#6B7280' }
                    }
                }
            }
        });

        // 5. Llenar la tabla del Leaderboard
        const tbody = doc.getElementById('tiemposLeaderboardBody');
        const tableTitle = doc.getElementById('tiemposLeaderboardTitle');

        if (tableTitle) {
            tableTitle.innerHTML = isSingleGestor ? `<i class='bx bx-calendar-event'></i> Desglose por Día` : `<i class='bx bx-list-ol'></i> Ranking Detallado de Cumplimiento Operativo`;
        }

        if (tbody) {
            tbody.innerHTML = '';

            if (isSingleGestor && metrics.length > 0) {
                // Desglose por Día para un solo gestor
                let dailyMetrics = metrics[0].Detalle_Dias || [];
                // Ordenar por fecha descendente
                dailyMetrics.sort((a, b) => b.fecha.localeCompare(a.fecha));

                if (dailyMetrics.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay datos suficientes</td></tr>';
                } else {
                    dailyMetrics.forEach(d => {
                        let Score_Tardanza = 40;
                        if (d.tardeMins <= 3) Score_Tardanza = 100;
                        else if (d.tardeMins <= 10) Score_Tardanza = 70;

                        let Score_Inactividad = 20;
                        if (d.inactMins <= 20) Score_Inactividad = 100;
                        else if (d.inactMins <= 45) Score_Inactividad = 60;

                        const totalScore = Score_Tardanza + Score_Inactividad;
                        let badgeColor = 'var(--success)';
                        if (totalScore < 140) badgeColor = 'var(--warning)';
                        if (totalScore < 100) badgeColor = 'var(--danger)';

                        let tr = doc.createElement('tr');
                        tr.innerHTML = `
                            <td style="font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                                <i class='bx bx-calendar' style="color: var(--accent-primary); font-size: 18px;"></i>
                                ${escapeHTML(d.fecha)}
                            </td>
                            <td style="text-align: center; color: var(--text-secondary);">1 turno</td>
                            <td style="text-align: center;">
                                <span style="color: ${d.tardeMins > 10 ? 'var(--danger)' : 'var(--text-primary)'};">
                                    ${Math.round(d.tardeMins)} min
                                </span>
                            </td>
                            <td style="text-align: center;">
                                <span style="color: ${d.inactMins > 45 ? 'var(--danger)' : 'var(--text-primary)'};">
                                    ${Math.round(d.inactMins)} min
                                </span>
                            </td>
                            <td style="text-align: center;">
                                <span class="badge" style="background-color: ${badgeColor}; color: #fff; font-size: 13px; font-weight: bold; padding: 4px 10px;">
                                    ${totalScore} pts
                                </span>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                }
            } else {
                // Ranking global de todos los gestores
                let sortedMetrics = [...metrics];
                sortedMetrics.sort((a, b) => {
                    const scoreA = a.Score_Tardanza + a.Score_Inactividad;
                    const scoreB = b.Score_Tardanza + b.Score_Inactividad;
                    return scoreB - scoreA;
                });

                if (sortedMetrics.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay datos suficientes</td></tr>';
                } else {
                    sortedMetrics.forEach(m => {
                        const totalScore = m.Score_Tardanza + m.Score_Inactividad;
                        let badgeColor = 'var(--success)';
                        if (totalScore < 140) badgeColor = 'var(--warning)';
                        if (totalScore < 100) badgeColor = 'var(--danger)';

                        let tr = doc.createElement('tr');
                        tr.innerHTML = `
                            <td style="font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                                <i class='bx bx-user-circle' style="color: var(--accent-primary); font-size: 18px;"></i>
                                ${escapeHTML(m.gestor)}
                            </td>
                            <td style="text-align: center; color: var(--text-secondary);">${m.Dias_Laborados} días</td>
                            <td style="text-align: center;">
                                <span style="color: ${m.Prom_Minutos_Tarde > 10 ? 'var(--danger)' : 'var(--text-primary)'};">
                                    ${Math.round(m.Prom_Minutos_Tarde)} min/día
                                </span>
                            </td>
                            <td style="text-align: center;">
                                <span style="color: ${m.Prom_Inactividad_Diaria > 45 ? 'var(--danger)' : 'var(--text-primary)'};">
                                    ${Math.round(m.Prom_Inactividad_Diaria)} min/día
                                </span>
                            </td>
                            <td style="text-align: center;">
                                <span class="badge" style="background-color: ${badgeColor}; color: #fff; font-size: 13px; font-weight: bold; padding: 4px 10px;">
                                    ${totalScore} pts
                                </span>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                }
            }
        }
    }
    return { renderTotals, renderDashboard };
}
