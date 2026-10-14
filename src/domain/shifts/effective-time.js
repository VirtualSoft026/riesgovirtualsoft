/**
 * Tiempo efectivo de un turno: UNA sola fórmula para el correo de cierre y para el panel de reportes
 * (decisión D1 del responsable, plan maestro §4 ter, 2026-10-06).
 *
 *     Efectivo = duración del turno − almuerzo − desayuno − Pausa de Turno − inactividad   (nunca negativo)
 *
 * - El exceso de almuerzo/desayuno NO se resta otra vez: ya está dentro del almuerzo/desayuno (app.js lo
 *   restaba dos veces en el correo, una como pausa y otra dentro de la penalidad).
 * - La penalidad de conectividad (exceso almuerzo + exceso desayuno + inactividad) se sigue calculando
 *   igual (`calculateConnectivityPenalty`) y se informa (`Exceso_Pausas_Penalidad` /
 *   `penalidadConectividadMins`), pero es un dato INFORMATIVO: ya no se resta de las horas efectivas.
 * - La Pausa de Turno no es tiempo trabajado (RN-4) y no genera penalidad.
 *
 * Funciones puras: sin DOM, sin Firebase, sin reloj.
 */

import { ALLOWED_LUNCH_MINUTES, ALLOWED_BREAKFAST_MINUTES } from '../../utils/constants.js';

/** De dónde salió la inactividad que se resta a un reporte guardado. */
export const REPORT_INACTIVITY_SOURCE = Object.freeze({
    /** Campo `inactividadTotalMins` del reporte (inactividad de la bitácora consolidada, 1 decimal). */
    STORED: 'inactividadTotalMins',
    /** Reporte antiguo sin `inactividadTotalMins`: penalidad − exceso de almuerzo − exceso de desayuno. */
    DERIVED_FROM_PENALTY: 'penalidad-menos-excesos',
    /** Sin ninguno de los dos datos: se toma 0. */
    NONE: 'sin-dato'
});

function finiteOrZero(value) {
    const n = typeof value === 'string' ? parseFloat(value) : value;

    return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

/**
 * Fórmula única del tiempo efectivo, en minutos. Las entradas ausentes, nulas o no numéricas cuentan
 * como 0. El resultado nunca es negativo. No redondea (cada consumidor da el formato que muestra).
 *
 * @param {{shiftMinutes: number, lunchMinutes?: number, breakfastMinutes?: number,
 *          splitShiftMinutes?: number, inactivityMinutes?: number}} parts
 * @returns {number}
 */
export function computeEffectiveMinutes({
    shiftMinutes, lunchMinutes = 0, breakfastMinutes = 0, splitShiftMinutes = 0, inactivityMinutes = 0
}) {
    const effective = finiteOrZero(shiftMinutes)
        - finiteOrZero(lunchMinutes)
        - finiteOrZero(breakfastMinutes)
        - finiteOrZero(splitShiftMinutes)
        - finiteOrZero(inactivityMinutes);

    return Math.max(0, effective);
}

/**
 * Minutos efectivos → texto de horas con 2 decimales (formato de `Horas_Efectivas_Trabajadas`).
 *
 * @param {number} minutes
 * @returns {string}
 */
export function formatEffectiveHours(minutes) {
    return Math.max(0, finiteOrZero(minutes) / 60).toFixed(2);
}

/**
 * Inactividad (minutos) de un reporte de `shift_reports` para la fórmula única.
 *
 *  1. Si el reporte trae `inactividadTotalMins` numérico (lo guarda `handleEndShift` desde la bitácora
 *     consolidada, sin solapes ni inactividad dentro de pausas), se usa tal cual.
 *  2. Reportes ANTIGUOS sin ese campo: se deriva de la penalidad guardada,
 *     `penalidadConectividadMins − max(0, almuerzo − 60) − max(0, desayuno − 15)`, con piso en 0 y a 1
 *     decimal. Es la inactividad "cruda" con la que se calculó la penalidad (antes de consolidar la
 *     bitácora), por lo que puede ser algo mayor que la consolidada.
 *  3. Sin ninguno de los dos datos: 0.
 *
 * @param {object} report
 * @returns {{minutes: number, source: string}}
 */
export function resolveReportInactivityMinutes(report) {
    const r = report || {};
    const stored = r.inactividadTotalMins;

    if (typeof stored === 'number' && Number.isFinite(stored)) {
        return { minutes: Math.max(0, stored), source: REPORT_INACTIVITY_SOURCE.STORED };
    }

    const penalty = r.penalidadConectividadMins;

    if (typeof penalty === 'number' && Number.isFinite(penalty)) {
        const extraLunch = Math.max(0, finiteOrZero(r.tiempoAlmuerzoMins) - ALLOWED_LUNCH_MINUTES);
        const extraBreakfast = Math.max(0, finiteOrZero(r.tiempoDesayunoMins) - ALLOWED_BREAKFAST_MINUTES);
        const derived = Math.max(0, parseFloat((penalty - extraLunch - extraBreakfast).toFixed(1)));

        return { minutes: derived, source: REPORT_INACTIVITY_SOURCE.DERIVED_FROM_PENALTY };
    }

    return { minutes: 0, source: REPORT_INACTIVITY_SOURCE.NONE };
}

/**
 * Tiempo efectivo (minutos) de un reporte guardado cuya duración ya se conoce (el panel la obtiene de
 * `horaInicio`/`horaFin`). Usa los campos del reporte con la fórmula única.
 *
 * @param {object} report reporte de `shift_reports`
 * @param {number} shiftMinutes duración del turno en minutos
 * @returns {number}
 */
export function computeSavedReportEffectiveMinutes(report, shiftMinutes) {
    const r = report || {};

    return computeEffectiveMinutes({
        shiftMinutes,
        lunchMinutes: r.tiempoAlmuerzoMins,
        breakfastMinutes: r.tiempoDesayunoMins,
        splitShiftMinutes: r.tiempoPausaTurnoMins,
        inactivityMinutes: resolveReportInactivityMinutes(r).minutes
    });
}
