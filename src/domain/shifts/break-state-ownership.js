/**
 * Pertenencia del estado de pausas a un usuario.
 *
 * Problema en app.js: `riskOps_breakState` es una llave global de localStorage sin usuario (315-339);
 * solo se limpia al finalizar turno (3908) o en el login de un día nuevo (635). Si en el mismo navegador
 * entra otro usuario sin finalizar turno (por ejemplo cerrando la pestaña), hereda las pausas y los
 * acumulados del anterior; además `syncActiveSessionToFirebase()` vuelve a leer esa llave en cada latido.
 *
 * Solución: se guarda `ownerUid` dentro del mismo objeto (la llave no cambia, así que el código que la
 * limpia sigue funcionando). Al restaurar, un estado cuyo dueño es otro usuario se descarta.
 *
 * Compatibilidad: un estado antiguo SIN `ownerUid` (guardado por la versión actual de app.js) se acepta
 * una vez y queda marcado como `legacy`, para no perder la pausa de quien ya la tiene en curso.
 */

import { defaultState, normalizeState } from './shift-calculator.js';

export const BREAK_STATE_RESTORE = Object.freeze({
    EMPTY: 'EMPTY',
    OWNED: 'OWNED',
    LEGACY: 'LEGACY',
    OTHER_OWNER: 'OTHER_OWNER',
    INVALID: 'INVALID'
});

/**
 * Objeto listo para `localStorage.setItem(clave, JSON.stringify(...))`.
 *
 * @param {object} state
 * @param {string|null|undefined} uid
 * @returns {object}
 */
export function serializeBreakState(state, uid) {
    const normalized = normalizeState(state);
    const { shiftTimeline, ...breakFields } = normalized; // la línea de tiempo vive en riskOps_timeline
    void shiftTimeline;

    return uid ? { ...breakFields, ownerUid: uid } : { ...breakFields };
}

/**
 * Interpreta lo leído de localStorage para el usuario actual.
 *
 * @param {string|object|null|undefined} raw JSON (texto) o ya parseado.
 * @param {string|null|undefined} uid
 * @returns {{state: object, status: string, discarded: boolean}}
 */
export function restoreBreakState(raw, uid) {
    if (raw === null || raw === undefined || raw === '') {
        return { state: defaultState(), status: BREAK_STATE_RESTORE.EMPTY, discarded: false };
    }

    let parsed = raw;

    if (typeof raw === 'string') {
        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            return { state: defaultState(), status: BREAK_STATE_RESTORE.INVALID, discarded: true };
        }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { state: defaultState(), status: BREAK_STATE_RESTORE.INVALID, discarded: true };
    }

    if (parsed.ownerUid && uid && parsed.ownerUid !== uid) {
        return { state: defaultState(), status: BREAK_STATE_RESTORE.OTHER_OWNER, discarded: true };
    }

    return {
        state: normalizeState(parsed),
        status: parsed.ownerUid ? BREAK_STATE_RESTORE.OWNED : BREAK_STATE_RESTORE.LEGACY,
        discarded: false
    };
}
