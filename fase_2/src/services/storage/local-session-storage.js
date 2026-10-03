import { defaultState, normalizeState } from '../../domain/shifts/shift-calculator.js';

const BREAK_STATE_STORAGE_KEY = 'riskOps_breakState';

/**
 * Persists break state without exposing storage details to app.js.
 * Storage errors are contained so a storage failure cannot interrupt a shift.
 * @param {object} state
 * @returns {object}
 */
export function saveBreakState(state) {
    const normalized = normalizeState(state);
    try {
        localStorage.setItem(BREAK_STATE_STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
        console.warn('No se pudo guardar el estado de pausas:', error);
    }
    return normalized;
}

/**
 * Loads break state from localStorage.
 * Missing, malformed or inaccessible data returns the default state.
 * @returns {object}
 */
export function loadBreakState() {
    try {
        const serialized = localStorage.getItem(BREAK_STATE_STORAGE_KEY);
        return serialized ? normalizeState(JSON.parse(serialized)) : defaultState();
    } catch (error) {
        console.warn('No se pudo cargar el estado de pausas:', error);
        return defaultState();
    }
}
