/**
 * Configuraciones de Chart.js del Control Operativo, como datos puros.
 * Extraído de `drawChart()` (app.js 8033-8083), `drawPunctualDatesChart()` (7972-8031), `drawCombinedChart()`
 * (8085-8150), `drawCombinedChartDaily()` (8152-8216), `drawScatterMatriz()` (8218-8330) y de la gráfica
 * "Evolución Diaria de Retiros" dentro de `renderControlOperativoCharts()` (7907-7960).
 *
 * Cada `build...Config()` devuelve el objeto que `new Chart(ctx, config)` recibe. La librería Chart.js NO se
 * importa aquí: el controlador crea el gráfico con la clase inyectada. El plugin de etiquetas
 * (`ChartDataLabels`) también se inyecta (`datalabelsPlugin`); si no está disponible se usa `{}`, como el original.
 *
 * Las funciones `formatter`/`callbacks` van dentro de la configuración tal cual (Chart.js las ejecuta).
 */

/** Colores de las barras de las gráficas (app.js 7810-7900 y 8227). */
export const CHART_COLORS = Object.freeze({
    green70: 'rgba(103, 194, 58, 0.7)',
    green100: 'rgba(103, 194, 58, 1)',
    red70: 'rgba(245, 108, 108, 0.7)',
    red85: 'rgba(245, 108, 108, 0.85)',
    red100: 'rgba(245, 108, 108, 1)',
    amber70: 'rgba(230, 162, 60, 0.7)',
    transparent: 'rgba(0,0,0,0)'
});

function plugins(datalabelsPlugin) {
    return [datalabelsPlugin === undefined || datalabelsPlugin === null ? {} : datalabelsPlugin];
}

/** Formato numérico de es-CO con 0 decimales si es entero y 2 si no (app.js 8043-8048, 8093-8098). */
function formatNumberEsCO(value) {
    const num = Number(value);
    const isInt = Number.isInteger(num);
    return num.toLocaleString('es-CO', {
        minimumFractionDigits: isInt ? 0 : 2,
        maximumFractionDigits: isInt ? 0 : 2
    });
}

/** Etiqueta de valor de `drawChart`: el cero se muestra como "0 min". */
export function formatBarValue(value) {
    if (value === 0 || value === '0') return '0 min';
    return formatNumberEsCO(value);
}

/** Etiqueta de valor del gráfico combinado por gestor: el cero no se muestra. */
export function formatCombinedValue(value) {
    if (value === 0 || value === '0') return '';
    return formatNumberEsCO(value);
}

/** Etiqueta de valor del gráfico combinado diario y de la línea diaria: el cero no se muestra. */
export function formatDailyValue(value) {
    if (value === 0 || value === '0') return '';
    return Number(value).toLocaleString('es-CO');
}

/**
 * Barras genéricas (`drawChart`). `extraOptions` se mezcla al final de `options` (puede pisar `layout`,
 * `plugins`, `scales`...). Si `extraOptions.plugins.datalabels` no existe, se agrega el formato por defecto.
 * No muta `extraOptions` (el original sí lo hacía; no tiene efecto visible porque el llamador lo crea en el momento).
 */
export function buildBarChartConfig({ type, labels, dataArr, labelStr, bgColor, borderColor, extraOptions = {}, datalabelsPlugin }) {
    const isHorizontal = extraOptions.indexAxis === 'y';
    const datalabelsConfig = {
        formatter: formatBarValue,
        anchor: 'end',
        align: isHorizontal ? 'right' : 'top',
        color: '#666',
        font: { size: 10, weight: 'bold' }
    };

    const extra = { ...extraOptions, plugins: { ...(extraOptions.plugins || {}) } };
    if (!extra.plugins.datalabels) extra.plugins.datalabels = datalabelsConfig;

    return {
        type: type,
        plugins: plugins(datalabelsPlugin),
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
            ...extra
        }
    };
}

/**
 * Barras de "Conexión a tiempo" por fecha (`drawPunctualDatesChart`). El original IGNORA los parámetros
 * `dataArr` y `bgColors` que recibe: todas las barras valen 100 y son verdes (se conserva).
 */
export function buildPunctualDatesChartConfig({ dates, datalabelsPlugin }) {
    const datalabelsConfig = {
        formatter: function () {
            return '✓ 0 min';
        },
        anchor: 'center',
        align: 'center',
        color: '#ffffff',
        font: { size: 10, weight: 'bold' }
    };

    return {
        type: 'bar',
        plugins: plugins(datalabelsPlugin),
        data: {
            labels: dates,
            datasets: [{
                label: 'Conexión a Tiempo',
                data: dates.map(() => 100),
                backgroundColor: 'rgba(103, 194, 58, 0.8)',
                borderColor: 'rgba(103, 194, 58, 1)',
                borderWidth: 1,
                maxBarThickness: 36
            }]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 25 }
            },
            plugins: {
                datalabels: datalabelsConfig,
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            return `${ctx.label}: Conexión a Tiempo (0 min tarde)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { autoSkip: true, maxTicksLimit: 12, maxRotation: 45, minRotation: 0, font: { size: 10 } }
                },
                y: {
                    beginAtZero: true,
                    max: 120,
                    ticks: {
                        callback: function (v) { return v === 100 ? 'A tiempo' : ''; }
                    }
                }
            }
        }
    };
}

function stackedComboOptions(datalabelsConfig) {
    return {
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
    };
}

function comboDatasets(aprobados, rechazados, tasaLabel, tasaData) {
    return [
        {
            label: 'Aprobados',
            data: aprobados,
            backgroundColor: 'rgba(103, 194, 58, 0.7)',
            datalabels: { align: 'center', anchor: 'center', color: '#fff', textStrokeColor: 'rgba(0,0,0,0.5)', textStrokeWidth: 3 }
        },
        {
            label: 'Rechazados',
            data: rechazados,
            backgroundColor: 'rgba(245, 108, 108, 0.7)',
            datalabels: { align: 'center', anchor: 'center', color: '#fff', textStrokeColor: 'rgba(0,0,0,0.6)', textStrokeWidth: 3 }
        },
        {
            label: tasaLabel,
            data: tasaData,
            type: 'line',
            borderColor: 'rgba(64, 158, 255, 1)',
            backgroundColor: 'rgba(64, 158, 255, 1)',
            yAxisID: 'y1',
            datalabels: { align: 'top', anchor: 'end', color: '#fff', textStrokeColor: 'rgba(64, 158, 255, 1)', textStrokeWidth: 3 }
        }
    ];
}

/**
 * "Eficiencia y Volumen de Retiros" global (`drawCombinedChart`): barras apiladas Aprobados/Rechazados por
 * gestor + línea de Tasa Aprobación/Día en el eje derecho.
 *
 * @param {{labels: string[], data: Object<string, {Retiros_Aprobados: number, Retiros_Rechazados: number, Tasa_Aprobacion_Dia: number}>, datalabelsPlugin?: object}} p
 */
export function buildCombinedChartConfig({ labels, data, datalabelsPlugin }) {
    const datalabelsConfig = {
        formatter: formatCombinedValue,
        anchor: 'end',
        align: 'top',
        color: '#666',
        font: { size: 11, weight: 'bold' }
    };

    return {
        type: 'bar',
        plugins: plugins(datalabelsPlugin),
        data: {
            labels: labels,
            datasets: comboDatasets(
                labels.map(g => data[g].Retiros_Aprobados),
                labels.map(g => data[g].Retiros_Rechazados),
                'Tasa Aprobación / Día',
                labels.map(g => data[g].Tasa_Aprobacion_Dia)
            )
        },
        options: stackedComboOptions(datalabelsConfig)
    };
}

/**
 * Series diarias de un gestor para `drawCombinedChartDaily` (app.js 8155-8157).
 * ATENCIÓN (hallazgo): la serie "tasa" usa `Retiros_Aprobados`, igual que la de aprobados, así que la línea
 * azul "Aprobaciones del Día" repite exactamente las barras verdes. Se conserva.
 *
 * @param {string[]} sortedDates
 * @param {Object<string, Object<string, object>>} rawData JSON operativo (gestor -> fecha -> métricas).
 * @param {string} gestor
 */
export function buildCombinedDailySeries(sortedDates, rawData, gestor) {
    return {
        aprobadosData: sortedDates.map(d => rawData[gestor]?.[d]?.Retiros_Aprobados || 0),
        rechazadosData: sortedDates.map(d => rawData[gestor]?.[d]?.Retiros_Rechazados || 0),
        tasaData: sortedDates.map(d => rawData[gestor]?.[d]?.Retiros_Aprobados || 0)
    };
}

/** "Eficiencia y Volumen" de un solo gestor, día a día (`drawCombinedChartDaily`). */
export function buildCombinedChartDailyConfig({ sortedDates, rawData, selectedGestor, datalabelsPlugin }) {
    const { aprobadosData, rechazadosData, tasaData } = buildCombinedDailySeries(sortedDates, rawData, selectedGestor);

    const datalabelsConfig = {
        formatter: formatDailyValue,
        anchor: 'end',
        align: 'top',
        color: '#666',
        font: { size: 11, weight: 'bold' }
    };

    return {
        type: 'bar',
        plugins: plugins(datalabelsPlugin),
        data: {
            labels: sortedDates,
            datasets: comboDatasets(aprobadosData, rechazadosData, 'Aprobaciones del Día', tasaData)
        },
        options: stackedComboOptions(datalabelsConfig)
    };
}

/** Color de la barra de % de rechazos: > 5 rojo, > 2 ámbar, resto verde (app.js 8227). */
export function rechazosColor(v) {
    return v > 5 ? 'rgba(245, 108, 108, 0.8)' : (v > 2 ? 'rgba(230, 162, 60, 0.8)' : 'rgba(103, 194, 58, 0.8)');
}

/**
 * Datos del punto de la matriz para un solo gestor (app.js 8277-8284). Acepta números o textos con "%".
 *
 * @param {string[]} gestores
 * @param {Object<string, object>} data
 * @returns {{gestor: (string|undefined), scatterPoint: Array<{x: number, y: number, name: string}>}}
 */
export function buildScatterPoint(gestores, data) {
    const gestor = gestores[0];
    const gData = data[gestor];
    const rawTasa = gData ? (typeof gData.Tasa_Aprobacion_Dia === 'string' ? parseFloat(gData.Tasa_Aprobacion_Dia.replace('%', '')) : (gData.Tasa_Aprobacion_Dia || 0)) : 0;
    const rawRechazos = gData ? (typeof gData.Porcentaje_Rechazos === 'string' ? parseFloat(gData.Porcentaje_Rechazos.replace('%', '')) : (gData.Porcentaje_Rechazos || 0)) : 0;
    const scatterPoint = gData ? [{
        x: isNaN(rawTasa) ? 0 : rawTasa,
        y: isNaN(rawRechazos) ? 0 : rawRechazos,
        name: gestor
    }] : [];

    return { gestor, scatterPoint };
}

/**
 * Matriz de riesgo (`drawScatterMatriz`). Global: barras de % de rechazos por gestor, de mayor a menor.
 * Un solo gestor: un punto (tasa de aprobación/día vs % de rechazos).
 */
export function buildScatterMatrizConfig({ gestores, data, isGlobal = true, datalabelsPlugin }) {
    if (isGlobal) {
        const sortedGestores = [...gestores].sort((a, b) => (data[b].Porcentaje_Rechazos || 0) - (data[a].Porcentaje_Rechazos || 0));
        const rechazosData = sortedGestores.map(g => data[g].Porcentaje_Rechazos || 0);
        const colors = rechazosData.map(rechazosColor);

        const datalabelsConfig = {
            formatter: function (value) {
                return `${value}%`;
            },
            anchor: 'end',
            align: 'top',
            color: '#666',
            font: { size: 11, weight: 'bold' }
        };

        return {
            type: 'bar',
            plugins: plugins(datalabelsPlugin),
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
                            label: function (ctx) {
                                return `% Rechazos: ${ctx.raw}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true, grace: '15%', title: { display: true, text: '% Rechazos' } }
                }
            }
        };
    }

    const { gestor, scatterPoint } = buildScatterPoint(gestores, data);

    const datalabelsConfig = {
        formatter: function (value) {
            return `${value.name}
(Tasa: ${value.x}/día, Rechazos: ${value.y}%)`;
        },
        anchor: 'center',
        align: 'top',
        color: '#409EFF',
        font: { size: 11, weight: 'bold' }
    };

    return {
        type: 'scatter',
        plugins: plugins(datalabelsPlugin),
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
                        label: function (ctx) {
                            const item = ctx.raw;
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
    };
}

/**
 * Línea "Evolución Diaria de Retiros" (aprobados vs rechazados por fecha), app.js 7907-7960.
 *
 * @param {{sortedDates: string[], dailyData: Object<string, {Aprobados: number, Rechazados: number}>, datalabelsPlugin?: object}} p
 */
export function buildAprobacionesDiaConfig({ sortedDates, dailyData, datalabelsPlugin }) {
    const dailyAprobados = sortedDates.map(date => dailyData[date].Aprobados);
    const dailyRechazados = sortedDates.map(date => dailyData[date].Rechazados);

    const datalabelsDaily = {
        formatter: function (value) {
            if (value === 0 || value === '0') return '';
            return value.toLocaleString('es-CO');
        },
        anchor: 'end', align: 'top', color: '#666', font: { size: 10, weight: 'bold' }
    };

    return {
        type: 'line',
        plugins: plugins(datalabelsPlugin),
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
                x: { ticks: { autoSkip: true, maxTicksLimit: 12, maxRotation: 45, minRotation: 0, font: { size: 10 } } },
                y: { beginAtZero: true, grace: '15%' }
            }
        }
    };
}
