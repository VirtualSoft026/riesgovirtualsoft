/**
 * Piezas puras del latido de sesión activa (`syncActiveSessionToFirebase()`, app.js 2386-2474).
 *
 * - `resolveLiveStatus`: el estado que se escribe en `active_sessions/{uid}/status` (app.js 2426-2436).
 *   Prioridad: Pausa de Turno > Almuerzo > Desayuno > Inactivo > En Línea.
 * - `buildBreakPayloadFields`: campos de la Pausa de Turno que el latido NO enviaba (solo se conocían al
 *   cierre en `tiempoPausaTurnoMins`). Con ellos el supervisor puede mostrar desde cuándo está en pausa
 *   y cuánto acumuló sin esperar al cierre del turno.
 */

import { SESSION_STATUS } from '../analytics/active-session-status.js';

/**
 * @param {{isSplitShiftBreak?: boolean, isLunchBreak?: boolean, isBreakfastBreak?: boolean}} state
 * @param {boolean} isInactive
 * @returns {string}
 */
export function resolveLiveStatus(state, isInactive) {
    const current = state || {};

    if (current.isSplitShiftBreak) return SESSION_STATUS.SHIFT_BREAK;
    if (current.isLunchBreak) return SESSION_STATUS.LUNCH;
    if (current.isBreakfastBreak) return SESSION_STATUS.BREAKFAST;
    if (isInactive) return SESSION_STATUS.INACTIVE;

    return SESSION_STATUS.ONLINE;
}

/**
 * Campos nuevos del latido para la Pausa de Turno. Valores `null` (no `undefined`) para que
 * `ref.update()` de Firebase limpie el dato al retomar el turno.
 *
 * @param {{isSplitShiftBreak?: boolean, splitShiftStartTime?: number|null, totalSplitShiftTimeMs?: number}} state
 * @returns {{splitShiftStartTime: number|null, totalSplitShiftTimeMs: number}}
 */
export function buildBreakPayloadFields(state) {
    const current = state || {};
    const inPause = current.isSplitShiftBreak === true && Number.isFinite(current.splitShiftStartTime);

    return {
        splitShiftStartTime: inPause ? current.splitShiftStartTime : null,
        totalSplitShiftTimeMs: Number.isFinite(current.totalSplitShiftTimeMs) ? current.totalSplitShiftTimeMs : 0
    };
}
