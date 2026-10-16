/**
 * Construcción del reporte de cierre de turno.
 *
 * Puerto 1:1 de los bloques puros de `handleEndShift()` (app.js 3753-3767,
 * 3831-3842, 3857-3867 y 3871-3888). El cálculo de penalidad, las horas
 * efectivas y la consolidación de la línea de tiempo ya existían en
 * `shift-calculator.js` y `timeline-service.js`; este archivo agrega lo que
 * faltaba para armar el reporte completo.
 */

/**
 * Suma los minutos de eventos "Inactividad". Un evento abierto cuenta hasta `fallbackEndMs`. Sin redondeo (bloque de
 * app.js 3753-3761). W-41: es la de `domain/analytics/time-metrics.js` (antes había dos copias del mismo cuerpo).
 */
import { sumInactivityMinutes } from '../analytics/time-metrics.js';
export { sumInactivityMinutes };

/**
 * Igual que `sumInactivityMinutes`, redondeado a 1 decimal (app.js 3857-3867,
 * se usa sobre la línea de tiempo ya consolidada).
 *
 * @param {Array<{type: string, start: number, end: number|null}>} events
 * @param {number} fallbackEndMs
 * @returns {number}
 */
export function sumCleanInactivityMinutes(events, fallbackEndMs) {
    return parseFloat(sumInactivityMinutes(events, fallbackEndMs).toFixed(1));
}

function defaultFormatClock(ms) {
    return new Date(ms).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Texto de la bitácora de tiempos (una línea por evento), o el mensaje fijo
 * si no hay eventos.
 *
 * @param {Array<{type: string, start: number, end: number|null}>} cleanTimeline
 * @param {(ms: number) => string} [formatClock] Por defecto `es-CO`, HH:MM (igual que app.js).
 * @returns {string}
 */
export function buildBitacoraText(cleanTimeline, formatClock = defaultFormatClock) {
    if (!Array.isArray(cleanTimeline) || cleanTimeline.length === 0) {
        return 'No se registraron pausas o inactividades.';
    }

    let text = '';

    cleanTimeline.forEach((event) => {
        const start = formatClock(event.start);
        const end = event.end ? formatClock(event.end) : 'No regresó';
        text += `- ${event.type}: inicio ${start} fin ${end}\n`;
    });

    return text;
}

/**
 * Objeto que se guarda en `shift_reports/{id}` (app.js 3871-3888).
 *
 * @param {{
 *   uid: string|null,
 *   localUser: {name: string, role: string, shift?: string},
 *   loginDate: Date,
 *   now: Date,
 *   setSelectValue: string|null|undefined,
 *   report: string,
 *   tasks: object,
 *   cleanTimeline: Array<object>,
 *   penaltyMins: number,
 *   cleanInactivityMins: number,
 *   lunchMinutes: number,
 *   breakfastMinutes: number,
 *   totalSplitShiftTimeMs: number
 * }} input
 * @returns {object}
 */
export function buildShiftReportObject(input) {
    const {
        uid, localUser, loginDate, now, setSelectValue, report, tasks,
        cleanTimeline, penaltyMins, cleanInactivityMins, lunchMinutes,
        breakfastMinutes, totalSplitShiftTimeMs
    } = input;

    return {
        uid,
        gestor: localUser.name,
        rol: localUser.role,
        horaInicio: loginDate.toLocaleString(),
        horaFin: now.toLocaleString(),
        turnoProgramado: localUser.shift || 'Por Asignar',
        setTrabajado: setSelectValue === null || setSelectValue === undefined ? 'N/A' : setSelectValue,
        reporte: report,
        tasks,
        timeline: cleanTimeline,
        penalidadConectividadMins: penaltyMins,
        inactividadTotalMins: cleanInactivityMins,
        tiempoAlmuerzoMins: lunchMinutes,
        tiempoDesayunoMins: breakfastMinutes,
        tiempoPausaTurnoMins: totalSplitShiftTimeMs
            ? parseFloat((totalSplitShiftTimeMs / 60000).toFixed(1))
            : 0,
        timestamp: now.getTime()
    };
}

/**
 * Campos de tiempos del correo de cierre de turno (los que `handleEndShift()` agrega a `formData`
 * entre "Hora_Fin_Turno" y "Horas_Efectivas_Trabajadas"), en el mismo orden que app.js.
 *
 * `Tiempo_Pausa_Turno_Descontado` solo aparece si hubo Pausa de Turno (> 0), para no agregar ruido
 * al correo del resto de gestores.
 *
 * @param {{lunchMinutes: number, breakfastMinutes: number, splitShiftMinutes: number, penaltyMins: number, effectiveHours: string}} times
 * @param {number} totalSplitShiftTimeMs
 * @returns {Array<[string, string]>} pares [campo, valor]
 */
export function buildClosureEmailTimeFields(times, totalSplitShiftTimeMs = 0) {
    const fields = [
        ['Tiempo_Almuerzo_Descontado', `${times.lunchMinutes} minutos`],
        ['Tiempo_Desayuno_Descontado', `${times.breakfastMinutes} minutos`]
    ];

    if (totalSplitShiftTimeMs > 0) {
        fields.push(['Tiempo_Pausa_Turno_Descontado', `${times.splitShiftMinutes} minutos`]);
    }

    fields.push(['Exceso_Pausas_Penalidad', `${times.penaltyMins} minutos`]);
    fields.push(['Horas_Efectivas_Trabajadas', `${times.effectiveHours} hrs`]);

    return fields;
}
