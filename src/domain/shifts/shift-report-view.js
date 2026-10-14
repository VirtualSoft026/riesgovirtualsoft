/**
 * Reglas del historial de reportes de turno (sin DOM, sin Firebase, sin `Date.now()` implícito).
 *
 * Puerto de la lógica pura de `exportShiftReport()` (app.js 4451-4578), `applyShiftReportsFilters()` (4617-4728),
 * `openShiftDetailModal()` (4730-4833) y del cálculo de "tiempo efectivo" del panel de reportes
 * (`calcularIndicadores()`, app.js 5927-5948).
 *
 * El HTML de filas/modal/PDF vive en `ui/views/shift-reports-view.js`.
 */

import { normalizeName } from '../../utils/normalize.js';
import { computeSavedReportEffectiveMinutes } from './effective-time.js';

/** Marcador que separa el texto del reporte de su bitácora textual (app.js 4463, 4659, 4747). */
export const BITACORA_MARKER = '=== BITÁCORA DE TIEMPOS ===';

/**
 * Líneas de la bitácora textual de un reporte, recortadas, sin vacías y SIN repetidas (se conserva la primera
 * aparición). Es el mismo cálculo que repetían la tabla, el modal y el PDF.
 *
 * @param {unknown} rawReporte `reportObj.reporte`
 * @returns {string[]}
 */
export function extractBitacoraLines(rawReporte) {
    const raw = rawReporte || '';
    const lines = [];

    if (raw.includes(BITACORA_MARKER)) {
        const parts = raw.split(BITACORA_MARKER);
        const rawBitacora = (parts[1] || '').trim();

        if (rawBitacora) {
            rawBitacora.split('\n').map((l) => l.trim()).filter(Boolean).forEach((l) => {
                if (!lines.includes(l)) lines.push(l);
            });
        }
    }

    return lines;
}

/**
 * Inicio de la ventana por defecto del historial: las 00:00 del DÍA ANTERIOR (hora local) (app.js 4646-4647).
 * (La variable original se llama `twoDaysAgo`, pero calcula "inicio de ayer": ayer + hoy = "últimos 2 días".)
 *
 * @param {Date|number} now
 * @returns {number} ms
 */
export function getDefaultWindowStartMs(now) {
    const d = new Date(now);

    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 0, 0, 0).getTime();
}

/**
 * Fecha local `YYYY-MM-DD` de un instante (app.js 4633-4638).
 *
 * @param {number|Date} timestamp
 * @returns {string}
 */
export function toLocalDateKey(timestamp) {
    const d = new Date(timestamp);
    const localMonth = String(d.getMonth() + 1).padStart(2, '0');
    const localDay = String(d.getDate()).padStart(2, '0');

    return `${d.getFullYear()}-${localMonth}-${localDay}`;
}

/**
 * Filtra y ordena los reportes del historial.
 *
 *  - Con gestores seleccionados: coincide por nombre normalizado (sin tildes/mayúsculas).
 *  - Con fecha `YYYY-MM-DD`: coincide por la fecha local del `timestamp`, o si `horaInicio`/`horaFin` la contienen.
 *  - Sin filtros explícitos: solo reportes desde el inicio de ayer (`timestamp`, o `horaInicio` parseado).
 *  - Orden: más reciente primero (`timestamp` descendente; sin timestamp = 0).
 *
 * @param {Array<object>} reports
 * @param {{selectedGestores?: string[], fechaQuery?: string, now: Date|number}} options
 * @returns {{rows: Array<object>, hasExplicitFilter: boolean}}
 */
export function filterShiftReports(reports, { selectedGestores = [], fechaQuery = '', now }) {
    let filtered = [...reports];
    const hasExplicitFilter = Boolean(selectedGestores.length > 0 || fechaQuery);

    if (selectedGestores.length > 0) {
        filtered = filtered.filter((r) => selectedGestores.some((g) => normalizeName(r.gestor) === normalizeName(g)));
    }

    if (fechaQuery) {
        filtered = filtered.filter((r) => {
            if (r.timestamp) {
                if (toLocalDateKey(r.timestamp) === fechaQuery) return true;
            }
            if (r.horaInicio && r.horaInicio.includes(fechaQuery)) return true;
            if (r.horaFin && r.horaFin.includes(fechaQuery)) return true;
            return false;
        });
    } else if (!hasExplicitFilter) {
        const windowStart = getDefaultWindowStartMs(now);

        filtered = filtered.filter((r) => {
            const reportTime = r.timestamp || (r.horaInicio ? new Date(r.horaInicio).getTime() : 0);

            return reportTime >= windowStart;
        });
    }

    filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    return { rows: filtered, hasExplicitFilter };
}

/**
 * Mensaje de tabla vacía (app.js 4668-4669).
 *
 * @param {boolean} hasExplicitFilter
 * @returns {string}
 */
export function buildShiftReportsEmptyMessage(hasExplicitFilter) {
    return hasExplicitFilter
        ? 'No hay historial de turnos registrados con los filtros seleccionados.'
        : 'No hay turnos registrados en los últimos 2 días. Selecciona una fecha o escribe un gestor para consultar turnos anteriores.';
}

/**
 * Pie informativo cuando no hay filtros explícitos (app.js 4838). Se conserva el texto original tal cual,
 * incluida la palabra "complete" (sic).
 *
 * @param {number} count
 * @returns {string}
 */
export function buildShiftReportsFooterMessage(count) {
    return `Mostrando turnos de los últimos 2 días (${count} turnos). Selecciona una fecha o escribe un gestor para consultar el historial antiguo complete.`;
}

/**
 * Nombres de Gestor únicos, recortados y ordenados para el multiselect (app.js 4602-4607).
 *
 * @param {Array<{gestor?: string}>} reports
 * @returns {string[]}
 */
export function collectGestorOptions(reports) {
    const set = new Set();

    reports.forEach((r) => {
        if (r.gestor) set.add(String(r.gestor).trim());
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Nombre de archivo del PDF (app.js 4543-4546). La fecha usa el formato local `es-CO` y los caracteres no
 * alfanuméricos se reemplazan por `_`.
 *
 * @param {{gestor?: string, timestamp?: number}} reportObj
 * @returns {string}
 */
export function buildShiftReportPdfFileName(reportObj) {
    const safeName = (reportObj.gestor || 'Gestor').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dateStr = (reportObj.timestamp ? new Date(reportObj.timestamp).toLocaleDateString('es-CO') : 'fecha').replace(/[^a-z0-9]/gi, '_');

    return `Reporte_Turno_${safeName}_${dateStr}.pdf`;
}

/**
 * Opciones de html2pdf (app.js 4548-4554).
 *
 * @param {string} filename
 * @returns {object}
 */
export function buildPdfOptions(filename) {
    return {
        margin: 10,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
}

// ----------------------------------------------------------------------------------------------
// Panel de reportes: tiempo efectivo por reporte (calcularIndicadores, app.js 5927-5948)
// ----------------------------------------------------------------------------------------------

/**
 * Interpreta la hora de un reporte guardada con `toLocaleString()` (app.js 5909-5929, `parseTime` local de
 * `calcularIndicadores()`): primero como fecha completa; si no, toma "HH:MM" con AM/PM y la aplica al día base.
 *
 * @param {unknown} timeStr
 * @param {number} baseDateMs
 * @returns {number} ms, o NaN si no se puede interpretar
 */
export function parseShiftReportTime(timeStr, baseDateMs) {
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
 * Tiempo efectivo (minutos) de UN reporte guardado, para el panel de reportes ("Duración Promedio").
 *
 * Decisión D1 (2026-10-06): misma fórmula única que el correo de cierre (`effective-time.js`):
 * `duración − almuerzo − desayuno − Pausa de Turno − inactividad`, nunca negativo. La inactividad sale de
 * `inactividadTotalMins`; en reportes antiguos sin ese campo se deriva de `penalidadConectividadMins` menos
 * los excesos de almuerzo/desayuno (ver `resolveReportInactivityMinutes`). La penalidad NO se resta: es
 * informativa.
 *
 * Devuelve `null` si el reporte no cuenta para el promedio (sin horas, ilegible o duración fuera de
 * (0, 1440] min), igual que app.js.
 *
 * `legacy: true` reproduce el cálculo ORIGINAL del panel de app.js (5937-5943: NO resta la inactividad); solo
 * lo usa la prueba diferencial contra la copia literal de app.js.
 *
 * @param {object} report reporte de `shift_reports`
 * @param {{nowMs: number, legacy?: boolean}} options `nowMs` solo sirve de día base cuando el reporte no trae
 *   `timestamp` ni `loginTime`.
 * @returns {number|null}
 */
export function computeReportEffectiveMinutes(report, { nowMs, legacy = false }) {
    if (!(report.horaInicio && report.horaFin)) return null;

    const baseMs = report.timestamp || report.loginTime || nowMs;
    const startMs = parseShiftReportTime(report.horaInicio, baseMs);
    const endMs = parseShiftReportTime(report.horaFin, baseMs);

    if (isNaN(startMs) || isNaN(endMs)) return null;

    let diffMins = (endMs - startMs) / 60000;

    if (diffMins < 0) diffMins += 1440; // Cruzó la medianoche

    if (!(diffMins > 0 && diffMins <= 1440)) return null;

    if (!legacy) return computeSavedReportEffectiveMinutes(report, diffMins);

    const almuerzo = report.tiempoAlmuerzoMins || 0;
    const desayuno = report.tiempoDesayunoMins || 0;
    const pausaTurno = report.tiempoPausaTurnoMins || 0;
    let tiempoEfectivo = diffMins - almuerzo - desayuno - pausaTurno;

    if (tiempoEfectivo < 0) tiempoEfectivo = 0;

    return tiempoEfectivo;
}
