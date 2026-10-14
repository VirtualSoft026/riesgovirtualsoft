import {
    ALLOWED_LUNCH_MINUTES,
    ALLOWED_BREAKFAST_MINUTES
} from '../../utils/constants.js';
import { computeEffectiveMinutes, formatEffectiveHours } from './effective-time.js';

/**
 * Break durations and the connectivity penalty applied at shift close.
 * Penalty = lunch excess over 60 min + breakfast excess over 15 min +
 * inactivity minutes, rounded to one decimal.
 *
 * @param {{lunchMs: number, breakfastMs: number, inactivityMins: number}} input
 * @returns {{lunchMinutes: number, breakfastMinutes: number, extraLunch: number, extraBreakfast: number, penaltyMins: number}}
 */
export function calculateConnectivityPenalty({ lunchMs, breakfastMs, inactivityMins }) {
    const lunchMinutes = parseFloat((lunchMs / (1000 * 60)).toFixed(1));
    const breakfastMinutes = parseFloat((breakfastMs / (1000 * 60)).toFixed(1));
    const extraLunch = Math.max(0, lunchMinutes - ALLOWED_LUNCH_MINUTES);
    const extraBreakfast = Math.max(0, breakfastMinutes - ALLOWED_BREAKFAST_MINUTES);
    const penaltyMins = parseFloat((extraLunch + extraBreakfast + inactivityMins).toFixed(1));

    return { lunchMinutes, breakfastMinutes, extraLunch, extraBreakfast, penaltyMins };
}

/**
 * FÓRMULA ANTERIOR del correo de cierre (app.js `handleEndShift`, más la Pausa de Turno del candidato):
 * turno − almuerzo − desayuno − Pausa de Turno − PENALIDAD de conectividad, 2 decimales, nunca negativo.
 *
 * Desde la decisión D1 (2026-10-06) el cierre NO usa esta fórmula (contaba dos veces el exceso de
 * almuerzo/desayuno); usa `computeEffectiveMinutes` de `effective-time.js`. Se conserva SOLO como
 * referencia literal de app.js para las pruebas diferenciales (`shift-closure-calculations`, `shift-effective-hours-split`).
 *
 * `splitShiftMs` es opcional (0 por defecto).
 *
 * @param {{loginMs: number, endMs: number, lunchMs: number, breakfastMs: number, splitShiftMs?: number, penaltyMins: number}} input
 * @returns {string}
 */
export function calculateEffectiveHours({ loginMs, endMs, lunchMs, breakfastMs, splitShiftMs = 0, penaltyMins }) {
    const effectiveShiftMs = (endMs - loginMs) - lunchMs - breakfastMs - splitShiftMs - (penaltyMins * 60 * 1000);

    return Math.max(0, (effectiveShiftMs / (1000 * 60 * 60))).toFixed(2);
}

/**
 * Returns the default shape of the shift break/pause state.
 *
 * @returns {object}
 */
export function defaultState() {
    return {
        isLunchBreak: false,
        lunchStartTime: null,
        totalLunchTimeMs: 0,
        isBreakfastBreak: false,
        breakfastStartTime: null,
        totalBreakfastTimeMs: 0,
        isSplitShiftBreak: false,
        splitShiftStartTime: null,
        totalSplitShiftTimeMs: 0,
        shiftTimeline: []
    };
}

/**
 * Normalizes a persisted or partial break state into a complete, safe shape.
 *
 * @param {object} value
 * @returns {object}
 */
export function normalizeState(value) {
    const defaults = defaultState();
    if (!value || typeof value !== 'object') return defaults;

    return {
        isLunchBreak: value.isLunchBreak === true,
        lunchStartTime: Number.isFinite(value.lunchStartTime) ? value.lunchStartTime : null,
        totalLunchTimeMs: Number.isFinite(value.totalLunchTimeMs) ? value.totalLunchTimeMs : 0,
        isBreakfastBreak: value.isBreakfastBreak === true,
        breakfastStartTime: Number.isFinite(value.breakfastStartTime) ? value.breakfastStartTime : null,
        totalBreakfastTimeMs: Number.isFinite(value.totalBreakfastTimeMs) ? value.totalBreakfastTimeMs : 0,
        isSplitShiftBreak: value.isSplitShiftBreak === true,
        splitShiftStartTime: Number.isFinite(value.splitShiftStartTime) ? value.splitShiftStartTime : null,
        totalSplitShiftTimeMs: Number.isFinite(value.totalSplitShiftTimeMs) ? value.totalSplitShiftTimeMs : 0,
        shiftTimeline: Array.isArray(value.shiftTimeline)
            ? value.shiftTimeline.map(event => ({ ...event }))
            : []
    };
}

/**
 * Tiempos de cierre de turno en un solo paso (handleEndShift): minutos de cada pausa,
 * penalidad de conectividad y horas efectivas.
 *
 * Decisión D1 (2026-10-06): horas efectivas = turno − almuerzo − desayuno − Pausa de Turno − inactividad
 * (fórmula única `computeEffectiveMinutes`, la misma del panel de reportes). El exceso de almuerzo/desayuno
 * ya no se resta dos veces. La penalidad (`penaltyMins`) se calcula igual que antes y es INFORMATIVA.
 * La Pausa de Turno NO es tiempo trabajado y NO genera penalidad (RN-4).
 *
 * Inactividad: `inactivityMins` es la de la bitácora en vivo (la que entra en la penalidad, sin cambios).
 * `effectiveInactivityMins` es la que se RESTA de las horas efectivas; el cierre integrado pasa la de la
 * bitácora consolidada (la misma que se guarda en `inactividadTotalMins` y que lee el panel), así correo y
 * panel coinciden y la inactividad que cae dentro de una pausa no se descuenta dos veces. Si se omite, se
 * usa `inactivityMins`.
 *
 * @param {{loginMs: number, endMs: number, lunchMs: number, breakfastMs: number, splitShiftMs?: number,
 *          inactivityMins: number, effectiveInactivityMins?: number}} input
 * @returns {{lunchMinutes: number, breakfastMinutes: number, splitShiftMinutes: number, extraLunch: number,
 *            extraBreakfast: number, penaltyMins: number, inactivityDeductedMins: number, effectiveHours: string}}
 */
export function calculateShiftClosureTimes({
    loginMs, endMs, lunchMs, breakfastMs, splitShiftMs = 0, inactivityMins, effectiveInactivityMins
}) {
    const penalty = calculateConnectivityPenalty({ lunchMs, breakfastMs, inactivityMins });
    const splitShiftMinutes = parseFloat(((splitShiftMs || 0) / (1000 * 60)).toFixed(1));

    const deducted = Number.isFinite(effectiveInactivityMins) ? effectiveInactivityMins : (Number.isFinite(inactivityMins) ? inactivityMins : 0);
    const effectiveMinutes = computeEffectiveMinutes({
        shiftMinutes: (endMs - loginMs) / (1000 * 60),
        lunchMinutes: (lunchMs || 0) / (1000 * 60),
        breakfastMinutes: (breakfastMs || 0) / (1000 * 60),
        splitShiftMinutes: (splitShiftMs || 0) / (1000 * 60),
        inactivityMinutes: deducted
    });

    return { ...penalty, splitShiftMinutes, inactivityDeductedMins: deducted, effectiveHours: formatEffectiveHours(effectiveMinutes) };
}
