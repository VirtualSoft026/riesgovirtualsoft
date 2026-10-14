import { TIMELINE_EVENT } from '../../utils/constants.js';
import { SPLIT_SHIFT_BLOCK_REASON } from './split-shift-policy.js';

/**
 * Transiciones de estado de las pausas (desayuno, almuerzo, pausa de turno).
 *
 * Puerto 1:1, solo de la parte pura, de `toggleBreakfastBreak()` (app.js
 * 3505-3543), `toggleLunchBreak()` (3546-3584) y `toggleSplitShiftBreak()`
 * (3621-3659). Las tres funciones originales son idénticas salvo por los
 * nombres de campo, el texto del evento y los colores del botón; aquí se
 * unifican en una sola función parametrizada por tipo de pausa.
 *
 * Regla de negocio añadida (2026-10-06, RN-1/RN-3): INICIAR una pausa de turno exige
 * `options.splitShiftEnabled === true` (flag `hasSplitShift` del gestor); retomar siempre se
 * permite. Es seguro por omisión: si el controlador no pasa la opción, no se inicia la pausa.
 * Almuerzo y desayuno no dependen del flag.
 *
 * NO incluye (queda para el controlador de turno, aún no escrito):
 * - la guarda `if (!currentUser) return;`
 * - el `alert()` cuando hay otra pausa activa (aquí se devuelve `blocked`)
 * - el estilo del botón (innerHTML, colores, sombra)
 * - `saveBreakState()`, `pushTimelineEvent()`, `updateActivity()` y
 *   `syncActiveSessionToFirebase()` (aquí se devuelven como `effects`).
 */

const BREAK_KINDS = Object.freeze({
    breakfast: {
        activeField: 'isBreakfastBreak',
        startField: 'breakfastStartTime',
        totalField: 'totalBreakfastTimeMs',
        eventType: TIMELINE_EVENT.BREAKFAST,
        others: ['isLunchBreak', 'isSplitShiftBreak']
    },
    lunch: {
        activeField: 'isLunchBreak',
        startField: 'lunchStartTime',
        totalField: 'totalLunchTimeMs',
        eventType: TIMELINE_EVENT.LUNCH,
        others: ['isBreakfastBreak', 'isSplitShiftBreak']
    },
    split: {
        activeField: 'isSplitShiftBreak',
        startField: 'splitShiftStartTime',
        totalField: 'totalSplitShiftTimeMs',
        eventType: TIMELINE_EVENT.SHIFT_BREAK,
        others: ['isBreakfastBreak', 'isLunchBreak']
    }
});

/**
 * Calcula el siguiente estado de pausas al pulsar el botón de una pausa.
 * No muta `state`.
 *
 * @param {object} state Estado con los campos de `defaultState()` (solo se leen los de pausas).
 * @param {'breakfast'|'lunch'|'split'} kind
 * @param {number} [now=Date.now()]
 * @param {{splitShiftEnabled?: boolean}} [options] `splitShiftEnabled`: valor de `currentUser.hasSplitShift === true`.
 * @returns {{
 *   blocked: boolean,
 *   blockedReason: 'OTHER_BREAK_ACTIVE'|'SPLIT_SHIFT_NOT_ENABLED'|null,
 *   action: 'start'|'end'|null,
 *   state: object,
 *   timelineEvent: {type: string, action: 'start'|'end'}|null,
 *   effects: {saveState: boolean, syncFirebase: boolean, updateActivity: boolean}
 * }}
 */
export function toggleBreak(state, kind, now = Date.now(), options = {}) {
    const config = BREAK_KINDS[kind];

    if (!config) {
        throw new Error(`Tipo de pausa desconocido: ${kind}`);
    }

    const current = state || {};

    if (!current[config.activeField]) {
        // Iniciar la pausa de turno exige el flag hasSplitShift (RN-1).
        if (kind === 'split' && !(options && options.splitShiftEnabled === true)) {
            return {
                blocked: true,
                blockedReason: SPLIT_SHIFT_BLOCK_REASON.SPLIT_SHIFT_NOT_ENABLED,
                action: null,
                state: { ...current },
                timelineEvent: null,
                effects: { saveState: false, syncFirebase: false, updateActivity: false }
            };
        }

        // Iniciar: no se permite si ya hay otra pausa activa.
        if (config.others.some((field) => current[field])) {
            return {
                blocked: true,
                blockedReason: SPLIT_SHIFT_BLOCK_REASON.OTHER_BREAK_ACTIVE,
                action: null,
                state: { ...current },
                timelineEvent: null,
                effects: { saveState: false, syncFirebase: false, updateActivity: false }
            };
        }

        return {
            blocked: false,
            blockedReason: null,
            action: 'start',
            state: {
                ...current,
                [config.activeField]: true,
                [config.startField]: now
            },
            timelineEvent: { type: config.eventType, action: 'start' },
            effects: { saveState: true, syncFirebase: true, updateActivity: false }
        };
    }

    // Terminar: acumula el tiempo solo si había una hora de inicio guardada.
    const startedAt = current[config.startField];
    const total = current[config.totalField] || 0;

    return {
        blocked: false,
        blockedReason: null,
        action: 'end',
        state: {
            ...current,
            [config.activeField]: false,
            [config.totalField]: startedAt ? total + (now - startedAt) : total,
            [config.startField]: null
        },
        timelineEvent: { type: config.eventType, action: 'end' },
        effects: { saveState: true, syncFirebase: true, updateActivity: true }
    };
}
