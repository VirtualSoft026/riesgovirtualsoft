/**
 * Cálculos puros del módulo "Control Operativo y Eficiencia en Retiros" y de los KPIs de gestión.
 *
 * Extraído de `app.js` (referencia de líneas: copia LF de producción):
 *  - `parseTime()`                       5910-5929 (función anidada en `calcularIndicadores()`)
 *  - agregación de `renderControlOperativoFiltered()` 7481-7650
 *  - filas/ totales/ gráficas globales de la misma función 7652-7716
 *
 * Sin DOM, sin localStorage, sin Firebase. Todo lo que dependía de la hora actual (`new Date()`) recibe
 * `now` por parámetro.
 *
 * NOTA sobre `parseTime()`: es la misma lógica que `parseTimeToMs()` de `utils/date-time.js` (prueba de
 * equivalencia en `src/tests/domain/kpi-metrics-calculator.test.mjs`). Se mantiene una copia propia, fiel
 * al original, para que los KPIs no cambien si alguien ajusta `utils/`. NO es lo mismo que
 * `parseClockTime()` (ese devuelve `{h, min}` y no un instante en ms; ver el informe).
 */

import { assertSupervisorDirectory, isSupervisorName } from '../schedules/supervisor-directory.js';

/** Minúsculas y sin acentos, como hace app.js en cada comparación de nombres (`toLowerCase().normalize("NFD")...`). */
export function normalizeForMatch(text) {
    return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Convierte una hora ("2:15 PM", "10:30 a. m.") o una fecha completa a milisegundos epoch.
 * Copia 1:1 de `parseTime` (app.js 5910-5929): primero intenta `new Date(valor)`; si no es una fecha válida
 * y el texto tiene "HH:MM", aplica esa hora sobre `baseDateMs`. Devuelve NaN si no puede interpretarlo.
 *
 * Particularidades heredadas (se conservan a propósito, ver informe):
 *  - `null` -> 0 (`new Date(null)` es el epoch) y un número se devuelve tal cual.
 *  - "5" o "12" los interpreta V8 como fechas (año 2001) y NO como horas.
 *  - "12:30 PM" / "12:15 AM" solo se resuelven bien por la rama manual (12 PM -> 12, 12 AM -> 0).
 *
 * @param {unknown} timeStr
 * @param {number} baseDateMs
 * @returns {number}
 */
export function parseTime(timeStr, baseDateMs) {
    if (typeof timeStr === 'string') {
        timeStr = timeStr.replace(/a\.\s*m\./i, 'AM').replace(/p\.\s*m\./i, 'PM');
    }
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) return d.getTime();

    if (typeof timeStr === 'string' && timeStr.includes(':')) {
        const parts = timeStr.match(/(\d+):(\d+)/);
        if (parts) {
            const base = new Date(baseDateMs);
            let hours = parseInt(parts[1], 10);
            if (timeStr.toUpperCase().includes('PM') && hours < 12) hours += 12;
            if (timeStr.toUpperCase().includes('AM') && hours === 12) hours = 0;
            base.setHours(hours, parseInt(parts[2], 10), 0, 0);
            return base.getTime();
        }
    }
    return NaN;
}

/**
 * ¿El gestor del JSON operativo coincide con alguno de los seleccionados? (`checkGestorMatch`, app.js 7510-7525).
 * Sin selección => coincide. Coincidencia exacta, por todas las palabras del seleccionado, o por nombre+apellido.
 *
 * @param {string} mstrGestor
 * @param {string[]} selectedGestores
 * @returns {boolean}
 */
export function matchesGestorSelection(mstrGestor, selectedGestores) {
    if (selectedGestores.length === 0) return true;
    if (selectedGestores.includes(mstrGestor)) return true;
    const normMstr = normalizeForMatch(mstrGestor);
    return selectedGestores.some(sel => {
        const normSel = normalizeForMatch(sel);
        if (normMstr === normSel) return true;
        const parts = normSel.split(' ').filter(Boolean);
        if (parts.every(p => normMstr.includes(p))) return true;
        const mstrParts = normMstr.split(' ').filter(Boolean);
        if (parts.length >= 2 && mstrParts.length >= 2) {
            return normMstr.includes(parts[0]) && normMstr.includes(parts[1]);
        }
        return false;
    });
}

/** `getLocalYYYYMMDD` (app.js 7486-7489): fecha local como "YYYY-MM-DD". */
export function getLocalYYYYMMDD(d) {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
}

/**
 * Cortes de fecha de los filtros de periodo (app.js 7491-7509).
 *
 * @param {Date} now Instante de referencia (el original usa `new Date()`).
 * @returns {{todayStr: string, yesterdayStr: string, sevenDaysAgoStr: string, thirtyDaysAgoStr: string, thisMonth: string, lastMonth: string}}
 */
export function resolveOperativoRanges(now) {
    const todayStr = getLocalYYYYMMDD(now);
    const yesterday = new Date(now.getTime());
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalYYYYMMDD(yesterday);

    const sevenDaysAgo = new Date(now.getTime());
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = getLocalYYYYMMDD(sevenDaysAgo);

    const thirtyDaysAgo = new Date(now.getTime());
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = getLocalYYYYMMDD(thirtyDaysAgo);

    const thisMonth = todayStr.substring(0, 7);

    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = getLocalYYYYMMDD(lastMonthDate).substring(0, 7);

    return { todayStr, yesterdayStr, sevenDaysAgoStr, thirtyDaysAgoStr, thisMonth, lastMonth };
}

/**
 * ¿La fecha "YYYY-MM-DD" cae dentro del periodo elegido? (app.js 7563-7580).
 * Un valor de periodo desconocido (o "custom" sin ambas fechas) no incluye nada.
 */
export function isFechaInRange(fecha, selectedFecha, ranges, customStart, customEnd) {
    if (selectedFecha === 'Todas') return true;
    if (selectedFecha === 'today' && fecha === ranges.todayStr) return true;
    if (selectedFecha === 'yesterday' && fecha === ranges.yesterdayStr) return true;
    if (selectedFecha === '7' && fecha >= ranges.sevenDaysAgoStr && fecha <= ranges.todayStr) return true;
    if (selectedFecha === '30' && fecha >= ranges.thirtyDaysAgoStr && fecha <= ranges.todayStr) return true;
    if (selectedFecha === 'thisMonth' && fecha.substring(0, 7) === ranges.thisMonth) return true;
    if (selectedFecha === 'lastMonth' && fecha.substring(0, 7) === ranges.lastMonth) return true;
    if (selectedFecha === 'custom' && customStart && customEnd && fecha >= customStart && fecha <= customEnd) return true;
    return false;
}

function emptyAggregate() {
    return {
        Retiros_Aprobados: 0,
        Retiros_Rechazados: 0,
        Tiempo_Total_Desde_Creacion_Segundos: 0,
        Dias_Tarde: 0,
        Minutos_Tarde_Total: 0,
        Minutos_Inactividad_Total: 0,
        Dias_Laborados: 0
    };
}

/** Métricas derivadas de un gestor (app.js 7617-7646). Muta y devuelve `d`. */
export function finalizeGestorMetrics(d) {
    const dl = d.Dias_Laborados > 0 ? d.Dias_Laborados : 1;

    d.Prom_Minutos_Tarde = Math.round((d.Minutos_Tarde_Total / dl) * 100) / 100;
    d.Prom_Inactividad_Diaria = Math.round((d.Minutos_Inactividad_Total / dl) * 100) / 100;
    d.Retiros_Procesados = d.Retiros_Aprobados + d.Retiros_Rechazados;
    d.ART_Desde_Creacion_Minutos = d.Retiros_Procesados > 0 ? Math.round((d.Tiempo_Total_Desde_Creacion_Segundos / d.Retiros_Procesados) / 60 * 100) / 100 : 0;
    d.Porcentaje_Rechazos = d.Retiros_Procesados > 0 ? Math.round((d.Retiros_Rechazados / d.Retiros_Procesados) * 100 * 100) / 100 : 0;
    d.Tasa_Aprobacion_Dia = Math.round((d.Retiros_Aprobados / dl) * 100) / 100;
    return d;
}

/**
 * Agrega el JSON operativo por gestor y por día según gestor(es) y periodo (app.js 7481-7646).
 *
 * @param {Object<string, Object<string, object>>} rawData gestor -> fecha("YYYY-MM-DD") -> métricas del día.
 * @param {{selectedGestores?: string[], selectedFecha: string, customStart?: string, customEnd?: string, now: Date}} options
 * @returns {{aggregatedData: object, aggregatedDataGlobal: object, dailyData: Object<string, {Aprobados: number, Rechazados: number}>}}
 *   `aggregatedData`: solo gestores seleccionados; `aggregatedDataGlobal`: todos (para rankings); `dailyData`: por fecha, solo seleccionados.
 */
export function aggregateOperativoData(rawData, options) {
    const { selectedGestores = [], selectedFecha, customStart, customEnd, now } = options;
    const ranges = resolveOperativoRanges(now);

    const aggregatedData = {};
    const aggregatedDataGlobal = {};
    const dailyData = {};

    for (const gestor in rawData) {
        aggregatedDataGlobal[gestor] = emptyAggregate();

        if (matchesGestorSelection(gestor, selectedGestores)) {
            aggregatedData[gestor] = emptyAggregate();
        }

        for (const fecha in rawData[gestor]) {
            if (!isFechaInRange(fecha, selectedFecha, ranges, customStart, customEnd)) continue;

            const d = rawData[gestor][fecha];
            const procesadosEnDia = (d.Retiros_Procesados !== undefined)
                ? d.Retiros_Procesados
                : ((d.Retiros_Aprobados || 0) + (d.Retiros_Rechazados || 0));
            const esDiaActivo = (d.Dias_Laborados && d.Dias_Laborados > 0) ? d.Dias_Laborados : (procesadosEnDia > 0 ? 1 : 0);

            const g = aggregatedDataGlobal[gestor];
            g.Retiros_Aprobados += d.Retiros_Aprobados || 0;
            g.Retiros_Rechazados += d.Retiros_Rechazados || 0;
            g.Tiempo_Total_Desde_Creacion_Segundos += d.Tiempo_Total_Desde_Creacion_Segundos || 0;
            g.Dias_Tarde += d.Dias_Tarde || 0;
            g.Minutos_Tarde_Total += d.Minutos_Tarde_Total || 0;
            g.Minutos_Inactividad_Total += d.Minutos_Inactividad_Total || 0;
            g.Dias_Laborados += esDiaActivo;

            if (matchesGestorSelection(gestor, selectedGestores)) {
                if (!dailyData[fecha]) {
                    dailyData[fecha] = { Aprobados: 0, Rechazados: 0 };
                }
                dailyData[fecha].Aprobados += d.Retiros_Aprobados || 0;
                dailyData[fecha].Rechazados += d.Retiros_Rechazados || 0;

                const a = aggregatedData[gestor];
                a.Retiros_Aprobados += d.Retiros_Aprobados || 0;
                a.Retiros_Rechazados += d.Retiros_Rechazados || 0;
                a.Tiempo_Total_Desde_Creacion_Segundos += d.Tiempo_Total_Desde_Creacion_Segundos || 0;
                a.Dias_Tarde += d.Dias_Tarde || 0;
                a.Minutos_Tarde_Total += d.Minutos_Tarde_Total || 0;
                a.Minutos_Inactividad_Total += d.Minutos_Inactividad_Total || 0;
                a.Dias_Laborados += esDiaActivo;
            }
        }
    }

    for (const gestor in aggregatedData) finalizeGestorMetrics(aggregatedData[gestor]);
    for (const gestor in aggregatedDataGlobal) finalizeGestorMetrics(aggregatedDataGlobal[gestor]);

    return { aggregatedData, aggregatedDataGlobal, dailyData };
}

/**
 * Filas ordenadas y totales de la tabla/tarjetas resumen (app.js 7652-7716).
 * Orden: más aprobados primero (estable). Se omiten gestores sin retiros y sin días laborados.
 * `avgArt` es el texto con 1 decimal o el número 0 si nadie procesó retiros (igual que el original).
 *
 * @param {Object<string, object>} aggregatedData Resultado de `aggregateOperativoData().aggregatedData`.
 * @returns {{rows: object[], globalProcesados: number, globalAprobados: number, globalRechazados: number, avgArt: (string|number)}}
 */
export function summarizeOperativoRows(aggregatedData) {
    let globalProcesados = 0;
    let globalAprobados = 0;
    let globalRechazados = 0;
    let globalARTTotal = 0;
    let gestoresContados = 0;
    const rows = [];

    const gestoresArray = Object.keys(aggregatedData).map(gestor => ({ gestor, ...aggregatedData[gestor] }));
    gestoresArray.sort((a, b) => b.Retiros_Aprobados - a.Retiros_Aprobados);

    for (const d of gestoresArray) {
        if (d.Retiros_Procesados === 0 && d.Dias_Laborados === 0) continue;

        globalProcesados += d.Retiros_Procesados;
        globalAprobados += d.Retiros_Aprobados;
        globalRechazados += d.Retiros_Rechazados;
        globalARTTotal += d.ART_Desde_Creacion_Minutos;
        if (d.Retiros_Procesados > 0) gestoresContados++;

        rows.push(d);
    }

    const avgArt = gestoresContados > 0 ? (globalARTTotal / gestoresContados).toFixed(1) : 0;

    return { rows, globalProcesados, globalAprobados, globalRechazados, avgArt };
}

/**
 * Gestores que alimentan los rankings globales: sin supervisores y sin filas vacías (app.js 7718-7726).
 *
 * Decisión D9b (predeterminado): se excluye a quien tenga rol `Supervisor`/`Admin` en `users`; como las llaves del JSON
 * operativo son NOMBRES (sin uid), la comparación es por nombre completo EXACTO normalizado contra el directorio
 * (`domain/schedules/supervisor-directory.js`), nunca por subcadena. Sin directorio (`null`) no se excluye a nadie.
 *
 * Comportamiento original (solo pruebas diferenciales): `{ legacyExcludedNames: SUPERVISORES_NOMBRES }` compara por
 * subcadena y además oculta cualquier nombre que contenga 'Sara Santamar' (app.js 7722).
 *
 * @param {Object<string, object>} aggregatedDataGlobal
 * @param {object|null} supervisorDirectory Directorio derivado de `users` (`buildSupervisorDirectory`).
 * @param {{legacyExcludedNames?: readonly string[]}} [options]
 * @returns {Object<string, object>}
 */
export function selectGlobalForCharts(aggregatedDataGlobal, supervisorDirectory, options = {}) {
    const { legacyExcludedNames } = options;
    const directory = legacyExcludedNames ? null : assertSupervisorDirectory(supervisorDirectory, 'selectGlobalForCharts');
    const isExcluded = legacyExcludedNames
        ? (gestor) => legacyExcludedNames.some(ex => gestor.includes(ex) || gestor.includes('Sara Santamar'))
        : (gestor) => isSupervisorName(directory, gestor);

    const globalForCharts = {};
    for (const gestor in aggregatedDataGlobal) {
        if (isExcluded(gestor)) continue;
        if (aggregatedDataGlobal[gestor].Retiros_Procesados > 0 || aggregatedDataGlobal[gestor].Dias_Laborados > 0) {
            globalForCharts[gestor] = aggregatedDataGlobal[gestor];
        }
    }
    return globalForCharts;
}

/** Etiqueta del gestor seleccionado que se pasa a las gráficas (app.js 7733). */
export function resolveSelectedGestorLabel(selectedGestores) {
    return selectedGestores.length === 1 ? selectedGestores[0] : (selectedGestores.length === 0 ? 'Todos' : `${selectedGestores.length} Gestores`);
}
