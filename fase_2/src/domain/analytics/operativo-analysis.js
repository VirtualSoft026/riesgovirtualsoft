/**
 * Agregación de métricas para el "Análisis Textual" del Control Operativo.
 * Extraído de `generarAnalisisTextual()` (app.js 7025-7120: primera pasada de agregación). El texto/HTML
 * resultante lo arma `ui/views/operativo-analysis-view.js`.
 *
 * Sin DOM: recibe los datos, los filtros y `now`.
 *
 * Decisión D5 (plan maestro §4 ter): los KPIs se calculan DINÁMICAMENTE desde el historial (JSON operativo de retiros +
 * `shift_reports` fusionados), filtrando por el rango de fechas y los gestores que elige el supervisor. Por eso
 * `corregirBugs` queda ENCENDIDO por defecto:
 *  - el rango de fechas es el MISMO que usa la tabla/gráficas (`resolveOperativoRanges` + `isFechaInRange` de
 *    `metrics-calculator.js`): "mes anterior" = mes calendario previo completo (31-mar -> 1..28/29-feb; enero ->
 *    diciembre del año anterior), "7"/"30" = cerrado hasta hoy, "personalizado" sin ambas fechas = nada;
 *  - 2+ gestores ("Varios") muestra el resumen del equipo seleccionado en vez de lanzar TypeError (ver la vista).
 * El comportamiento original (reglas de fecha propias, `setMonth(-1)` que desborda los días 29-31, TypeError con
 * "Varios") sigue disponible SOLO con `corregirBugs: false` explícito (pruebas diferenciales).
 *
 * Decisión D9b: con "Todos" se excluye a los usuarios con rol Supervisor/Admin (`supervisorDirectory`, nombre completo
 * exacto); la lista fija por subcadena solo con `legacyExcludedNames` explícito.
 */

import { resolveOperativoRanges, isFechaInRange } from './metrics-calculator.js';
import { assertSupervisorDirectory, isSupervisorName } from '../schedules/supervisor-directory.js';

/**
 * Etiqueta del filtro de gestor: uno solo => su nombre; ninguno => 'Todos'; varios => 'Varios' (app.js 7032).
 *
 * @param {string[]} selectedGestores
 * @returns {string}
 */
export function resolveFiltroGestor(selectedGestores) {
    return selectedGestores.length === 1 ? selectedGestores[0] : (selectedGestores.length === 0 ? 'Todos' : 'Varios');
}

/**
 * ¿La fecha del día ("YYYY-MM-DD") entra en el filtro del análisis?
 *
 * @param {string} date
 * @param {{filtroFecha: string, isCustom: boolean, dateStart: (string|null), dateEnd: (string|null), today: Date, corregirBugs?: boolean}} ctx
 *   `today`: medianoche local de "hoy" (no se muta).
 *   `corregirBugs` (ENCENDIDO por defecto, D5): mismo criterio de rango que la tabla (`isFechaInRange`); con `false`,
 *   reglas originales de app.js 7061-7093 (incluido el desborde de "mes anterior" los días 29-31).
 * @returns {boolean}
 */
export function isDateIncludedInAnalysis(date, ctx) {
    const { filtroFecha, isCustom, dateStart, dateEnd, today, corregirBugs = true } = ctx;
    if (corregirBugs) {
        return isFechaInRange(date, filtroFecha, resolveOperativoRanges(today), dateStart, dateEnd);
    }

    const itemDate = new Date(date + 'T00:00:00');
    let includeDate = true;

    if (filtroFecha === 'today') {
        if (itemDate.getTime() !== today.getTime()) includeDate = false;
    } else if (filtroFecha === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (itemDate.getTime() !== yesterday.getTime()) includeDate = false;
    } else if (filtroFecha === '7') {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (itemDate < sevenDaysAgo) includeDate = false;
    } else if (filtroFecha === '30') {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (itemDate < thirtyDaysAgo) includeDate = false;
    } else if (filtroFecha === 'thisMonth') {
        if (itemDate.getMonth() !== today.getMonth() || itemDate.getFullYear() !== today.getFullYear()) includeDate = false;
    } else if (filtroFecha === 'lastMonth') {
        // Original: setMonth(-1) sobre hoy; el 31-mar da "31-feb" = 3-mar y cuenta MARZO.
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        if (itemDate.getMonth() !== lastMonth.getMonth() || itemDate.getFullYear() !== lastMonth.getFullYear()) includeDate = false;
    } else if (isCustom && dateStart && dateEnd) {
        const startObj = new Date(dateStart + 'T00:00:00');
        const endObj = new Date(dateEnd + 'T23:59:59');
        if (itemDate < startObj || itemDate > endObj) includeDate = false;
    }

    return includeDate;
}

/**
 * Primera pasada de `generarAnalisisTextual()`: totales y estadísticas por gestor.
 *
 * @param {Object<string, Object<string, object>>} rawData JSON operativo (gestor -> fecha -> métricas).
 * @param {{
 *   selectedGestores: string[], filtroFecha: string, dateStart?: (string|null), dateEnd?: (string|null), now: Date,
 *   supervisorDirectory?: (object|null), legacyExcludedNames?: string[], corregirBugs?: boolean
 * }} options
 *   `dateStart`/`dateEnd` solo se usan con `filtroFecha === 'custom'`.
 *   `supervisorDirectory` (D9b): directorio de `buildSupervisorDirectory(users)`; con "Todos" se excluye a los
 *   gestores cuyo nombre completo coincide EXACTO con un usuario de rol Supervisor/Admin. `null` = no se excluye a nadie.
 *   `legacyExcludedNames` (solo pruebas diferenciales): lista fija comparada por subcadena, como app.js 7101.
 *   `corregirBugs` (ENCENDIDO por defecto, D5): ver `isDateIncludedInAnalysis`.
 * @returns {{
 *   totalProcesados: number, totalAprobados: number, totalRechazados: number, excludedCount: number,
 *   gestoresStats: Object<string, {procesados: number, aprobados: number, rechazados: number, artPromedio: number}>
 * }}
 */
export function computeAnalysisStats(rawData, options) {
    if (Object.prototype.hasOwnProperty.call(options, 'excludedNames')) {
        throw new TypeError('computeAnalysisStats: la opción excludedNames ya no se admite (decisión D9b); '
            + 'use supervisorDirectory (derivado de users) o, solo en pruebas diferenciales, legacyExcludedNames.');
    }
    const {
        selectedGestores, filtroFecha, dateStart = null, dateEnd = null, now, corregirBugs = true,
        supervisorDirectory = null, legacyExcludedNames
    } = options;
    const directory = legacyExcludedNames ? null : assertSupervisorDirectory(supervisorDirectory, 'computeAnalysisStats');
    const isExcluded = legacyExcludedNames
        ? (gestor) => legacyExcludedNames.some(ex => gestor.includes(ex))
        : (gestor) => isSupervisorName(directory, gestor);
    const isCustom = filtroFecha === 'custom';

    let totalProcesados = 0;
    let totalAprobados = 0;
    let totalRechazados = 0;
    const gestoresStats = {};
    let excludedCount = 0;

    for (const gestor in rawData) {
        if (selectedGestores.length > 0 && !selectedGestores.includes(gestor)) continue;

        // Con "Todos" se excluyen los supervisores
        if (selectedGestores.length === 0 && isExcluded(gestor)) {
            excludedCount++;
            continue;
        }

        let gProcesados = 0;
        let gAprobados = 0;
        let gRechazados = 0;
        let gARTTotal = 0;
        let gARTCount = 0;

        const today = new Date(now.getTime());
        today.setHours(0, 0, 0, 0);

        for (const date in rawData[gestor]) {
            if (!isDateIncludedInAnalysis(date, { filtroFecha, isCustom, dateStart, dateEnd, today, corregirBugs })) continue;

            const dayData = rawData[gestor][date];
            gProcesados += dayData.Retiros_Procesados || 0;
            gAprobados += dayData.Retiros_Aprobados || 0;
            gRechazados += dayData.Retiros_Rechazados || 0;
            if (dayData.ART_Desde_Creacion_Minutos > 0) {
                gARTTotal += dayData.ART_Desde_Creacion_Minutos;
                gARTCount++;
            }
        }

        if (gProcesados > 0) {
            totalProcesados += gProcesados;
            totalAprobados += gAprobados;
            totalRechazados += gRechazados;
            gestoresStats[gestor] = {
                procesados: gProcesados,
                aprobados: gAprobados,
                rechazados: gRechazados,
                artPromedio: gARTCount > 0 ? (gARTTotal / gARTCount) : 0
            };
        }
    }

    return { totalProcesados, totalAprobados, totalRechazados, excludedCount, gestoresStats };
}
