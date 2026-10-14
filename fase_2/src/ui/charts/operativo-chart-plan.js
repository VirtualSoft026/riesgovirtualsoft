/**
 * Plan de gráficas del Control Operativo: decide QUÉ gráficas se dibujan, con qué datos, colores y títulos,
 * sin tocar el DOM ni Chart.js. Extraído de `renderControlOperativoCharts()` (app.js 7737-7969).
 *
 * El resultado es una lista ordenada de "trabajos" (`charts`) que el controlador ejecuta con las funciones de
 * `operativo-chart-configs.js` y la clase `Chart` inyectada, en el MISMO orden que el original:
 * tardanzas (peores) -> puntualidad (mejores) -> inactividad -> evolución diaria -> eficiencia -> matriz.
 */

import { escapeHTML } from '../../utils/sanitization.js';
import { normalizeForMatch } from '../../domain/analytics/metrics-calculator.js';
import { CHART_COLORS } from './operativo-chart-configs.js';

/** Escala X con omisión de etiquetas (app.js 7867, 7900). */
function xAutoSkipScales() {
    return { x: { ticks: { autoSkip: true, maxTicksLimit: 12, maxRotation: 45, minRotation: 0, font: { size: 10 } } } };
}

/** Color por minutos de inactividad: > 45 rojo, > 20 ámbar, resto verde (app.js 7826, 7889). */
export function inactividadColor(v) {
    return v > 45 ? CHART_COLORS.red70 : (v > 20 ? CHART_COLORS.amber70 : CHART_COLORS.green70);
}

/** Etiqueta de datos de la gráfica de "sin tardanzas" (app.js 7848). */
export function formatSinTardanzas() { return '🎉 ¡Sin tardanzas!'; }

/** Etiqueta de datos de las llegadas tarde por fecha (app.js 7861). */
export function formatLlegadaTarde(val) { return val > 0 ? `+${val}m` : ''; }

/**
 * Resuelve el nombre real del gestor seleccionado dentro del JSON operativo: coincidencia exacta o todas las
 * palabras (sin acentos); si no hay, devuelve el mismo texto (app.js 7740-7752 y 7790-7801).
 *
 * @param {string} name
 * @param {string[]} keys
 * @returns {string|undefined} undefined si no hay coincidencia (el llamador decide el respaldo).
 */
export function findGestorKeyByWords(name, keys) {
    let real = keys.find(k => k === name);
    if (!real) {
        const parts = normalizeForMatch(name).split(' ');
        real = keys.find(k => {
            const normK = normalizeForMatch(k);
            return parts.every(p => normK.includes(p));
        });
    }
    return real;
}

/** Títulos HTML de cada gráfica según sea vista global o de un solo gestor (app.js 7755-7774). */
export function buildOperativoChartTitles(isGlobal, selectedGestor) {
    if (isGlobal) {
        return {
            peores: `<i class='bx bx-alarm-exclamation'></i> Top Alerta Tardanzas (Peores 5)`,
            mejores: `<i class='bx bx-medal'></i> Top Excelencia Puntualidad (Mejores 5)`,
            inactividad: `<i class='bx bx-coffee-togo'></i> Promedio Inactividad Diaria (Min)`,
            eficiencia: `<i class='bx bx-layer'></i> Eficiencia y Volumen de Retiros`,
            matriz: `<i class='bx bx-bar-chart-alt-2'></i> Ranking de Porcentaje de Rechazos`
        };
    }
    return {
        peores: `<i class='bx bx-alarm-exclamation'></i> Fechas con Llegada Tarde - ${escapeHTML(selectedGestor)}`,
        mejores: `<i class='bx bx-check-double'></i> Fechas de Conexión a Tiempo - ${escapeHTML(selectedGestor)}`,
        inactividad: `<i class='bx bx-coffee-togo'></i> Inactividad Diaria por Fecha - ${escapeHTML(selectedGestor)}`,
        eficiencia: `<i class='bx bx-layer'></i> Evolución Diaria de Retiros - ${escapeHTML(selectedGestor)}`,
        matriz: `<i class='bx bx-target-lock'></i> % Rechazos: ${escapeHTML(selectedGestor)}`
    };
}

/**
 * @param {{
 *   data: Object<string, object>,
 *   dailyData: Object<string, {Aprobados: number, Rechazados: number}>,
 *   selectedGestor: string,
 *   selectedGestoresList: string[],
 *   rawData: (Object<string, Object<string, object>>|null)
 * }} input
 *   `data`: métricas globales por gestor (`selectGlobalForCharts`); `dailyData`: por fecha, solo seleccionados;
 *   `selectedGestor`: 'Todos', "N Gestores" o el nombre; `selectedGestoresList`: valores del multiselect;
 *   `rawData`: JSON operativo (para las series por fecha de un solo gestor).
 * @returns {{
 *   isGlobal: boolean, realSelectedGestor: (string|null), titles: object,
 *   gestores: string[], sortedDates: string[], activeData: object, charts: object[]
 * }}
 */
export function buildControlOperativoChartPlan({ data, dailyData, selectedGestor, selectedGestoresList, rawData }) {
    const isGlobal = (selectedGestor === 'Todos' || selectedGestor.includes('Gestores'));

    let realSelectedGestor = null;
    if (!isGlobal && selectedGestor) {
        const rawKeys = Object.keys(rawData || {});
        realSelectedGestor = findGestorKeyByWords(selectedGestor, rawKeys);
        if (!realSelectedGestor) realSelectedGestor = selectedGestor;
    }

    const titles = buildOperativoChartTitles(isGlobal, selectedGestor);

    let activeData = {};
    if (isGlobal || selectedGestoresList.length === 0) {
        activeData = data;
    } else {
        const rawKeys = Object.keys(data);
        selectedGestoresList.forEach(g => {
            const realGestor = findGestorKeyByWords(g, rawKeys);
            if (realGestor && data[realGestor]) {
                activeData[realGestor] = data[realGestor];
            } else if (data[g]) {
                activeData[g] = data[g];
            }
        });
    }

    const gestores = Object.keys(activeData);
    const sortedDates = Object.keys(dailyData).sort();
    const sortBy = (key, asc = false) => [...gestores].sort((a, b) => asc ? activeData[a][key] - activeData[b][key] : activeData[b][key] - activeData[a][key]);

    const charts = [];

    if (isGlobal) {
        // 1. Top Alerta Tardanzas (Peores 5)
        let peoresTardanzas = sortBy('Prom_Minutos_Tarde').filter(g => activeData[g].Prom_Minutos_Tarde > 0).slice(0, 5);
        let peoresColors, peoresBorders, peoresData;
        if (peoresTardanzas.length === 0) {
            peoresTardanzas = ['Equipo 100% Puntual'];
            peoresData = [0];
            peoresColors = [CHART_COLORS.green70];
            peoresBorders = [CHART_COLORS.green100];
        } else {
            peoresData = peoresTardanzas.map(g => activeData[g].Prom_Minutos_Tarde);
            peoresColors = peoresTardanzas.map(() => CHART_COLORS.red70);
            peoresBorders = peoresTardanzas.map(() => CHART_COLORS.red100);
        }
        charts.push({ kind: 'bar', id: 'chartTardanzasPeores', type: 'bar', labels: peoresTardanzas, dataArr: peoresData, labelStr: 'Minutos Tarde (Promedio)', bgColor: peoresColors, borderColor: peoresBorders, extraOptions: { indexAxis: 'y' } });

        // 2. Top Excelencia Puntualidad (Mejores 5)
        const mejoresTardanzas = sortBy('Prom_Minutos_Tarde', true).slice(0, 5).reverse();
        const mejoresColors = mejoresTardanzas.map(() => CHART_COLORS.green70);
        const mejoresBorders = mejoresTardanzas.map(() => CHART_COLORS.green100);
        charts.push({ kind: 'bar', id: 'chartTardanzasMejores', type: 'bar', labels: mejoresTardanzas, dataArr: mejoresTardanzas.map(g => activeData[g].Prom_Minutos_Tarde), labelStr: 'Minutos Tarde (Promedio)', bgColor: mejoresColors, borderColor: mejoresBorders, extraOptions: { indexAxis: 'y' } });

        // 3. Promedio Inactividad Diaria
        const inactividadTop = sortBy('Prom_Inactividad_Diaria').slice(0, 10);
        const bgColors = inactividadTop.map(g => inactividadColor(activeData[g].Prom_Inactividad_Diaria));
        charts.push({ kind: 'bar', id: 'chartInactividad', type: 'bar', labels: inactividadTop, dataArr: inactividadTop.map(g => activeData[g].Prom_Inactividad_Diaria), labelStr: 'Minutos Inactividad', bgColor: bgColors, borderColor: bgColors, extraOptions: {} });
    } else {
        // UN SOLO GESTOR
        if (!realSelectedGestor) realSelectedGestor = selectedGestor;

        // 1. Fechas con llegadas tarde
        const dailyLateMins = sortedDates.map(date => {
            const raw = rawData[realSelectedGestor]?.[date];
            return (raw && (raw.Minutos_Tarde_Total || 0) > 0) ? raw.Minutos_Tarde_Total : 0;
        });

        const hasLate = dailyLateMins.some(v => v > 0);

        if (!hasLate) {
            charts.push({
                kind: 'bar', id: 'chartTardanzasPeores', type: 'bar', labels: ['Sin Llegadas Tardes en el Periodo'], dataArr: [0], labelStr: 'Minutos Tarde',
                bgColor: [CHART_COLORS.green70], borderColor: [CHART_COLORS.green100],
                extraOptions: {
                    maxBarThickness: 36,
                    plugins: {
                        datalabels: {
                            formatter: formatSinTardanzas,
                            anchor: 'center', align: 'center', color: 'var(--success)', font: { size: 12, weight: 'bold' }
                        }
                    }
                }
            });
        } else {
            const lateColors = dailyLateMins.map(v => v > 0 ? CHART_COLORS.red85 : CHART_COLORS.transparent);
            charts.push({
                kind: 'bar', id: 'chartTardanzasPeores', type: 'bar', labels: sortedDates, dataArr: dailyLateMins, labelStr: 'Minutos Tarde',
                bgColor: lateColors, borderColor: lateColors,
                extraOptions: {
                    maxBarThickness: 36,
                    plugins: {
                        datalabels: {
                            formatter: formatLlegadaTarde,
                            anchor: 'end', align: 'top', color: 'var(--danger)', font: { size: 10, weight: 'bold' }
                        }
                    },
                    scales: {
                        x: { ticks: { autoSkip: true, maxTicksLimit: 12, maxRotation: 45, minRotation: 0, font: { size: 10 } } },
                        y: { beginAtZero: true, grace: '20%' }
                    }
                }
            });
        }

        // 2. Fechas de conexión a tiempo (Dias_Laborados > 0 y sin minutos tarde)
        const punctualDates = [];
        sortedDates.forEach(date => {
            const raw = rawData[realSelectedGestor]?.[date];
            if (raw && raw.Dias_Laborados > 0 && (raw.Minutos_Tarde_Total || 0) === 0) {
                punctualDates.push(date);
            }
        });

        if (punctualDates.length === 0) {
            charts.push({ kind: 'bar', id: 'chartTardanzasMejores', type: 'bar', labels: ['Sin Conexiones a Tiempo en el Periodo'], dataArr: [0], labelStr: 'Conexión a Tiempo', bgColor: [CHART_COLORS.red70], borderColor: [CHART_COLORS.red100], extraOptions: { maxBarThickness: 36 } });
        } else {
            const punctualData = punctualDates.map(() => 0);
            const punctualColors = punctualDates.map(() => 'rgba(103, 194, 58, 0.8)');
            charts.push({ kind: 'punctual', id: 'chartTardanzasMejores', dates: punctualDates, dataArr: punctualData, bgColors: punctualColors });
        }

        // 3. Inactividad diaria por fecha
        const dailyInactivityValues = sortedDates.map(date => {
            return rawData[realSelectedGestor]?.[date]?.Minutos_Inactividad_Total || 0;
        });
        const dailyBgColors = dailyInactivityValues.map(inactividadColor);
        charts.push({ kind: 'bar', id: 'chartInactividad', type: 'bar', labels: sortedDates, dataArr: dailyInactivityValues, labelStr: `Inactividad (Min)`, bgColor: dailyBgColors, borderColor: dailyBgColors, extraOptions: { maxBarThickness: 36, scales: xAutoSkipScales() } });
    }

    // 4. Aprobaciones por día
    charts.push({ kind: 'aprobacionesDia', id: 'chartAprobacionesDia', sortedDates, dailyData });

    // 5. Eficiencia y volumen de retiros
    if (isGlobal) {
        const volTop = sortBy('Retiros_Procesados');
        charts.push({ kind: 'combined', id: 'chartEficiencia', labels: volTop, data: activeData });
    } else {
        charts.push({ kind: 'combinedDaily', id: 'chartEficiencia', sortedDates, selectedGestor: realSelectedGestor, rawData });
    }

    // 6. Matriz de riesgo: % rechazos
    charts.push({ kind: 'scatter', id: 'chartMatrizFuga', gestores, data: activeData, isGlobal });

    return { isGlobal, realSelectedGestor, titles, gestores, sortedDates, activeData, charts };
}
