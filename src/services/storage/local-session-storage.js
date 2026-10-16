import { defaultState, normalizeState } from '../../domain/shifts/shift-calculator.js';
import { STORAGE_KEYS } from '../../utils/constants.js';


/**
 * Persiste los campos de pausa (sin shiftTimeline) en `riskOps_breakState` y la
 * línea de tiempo en `riskOps_timeline` — misma forma de datos que app.js.
 *
 * Opción A aprobada (2026-10-13): las dos llaves viven independientes, sin migración.
 * Ver diagnóstico de 2026-10-03, sección 8, opción A.
 *
 * Storage errors are contained so a storage failure cannot interrupt a shift.
 * @param {object} state
 * @returns {object}
 */
export function saveBreakState(state) {
    const normalized = normalizeState(state);
    const { shiftTimeline, ...pauseFields } = normalized;
    try {
        localStorage.setItem(STORAGE_KEYS.BREAK_STATE, JSON.stringify(pauseFields));
    } catch (error) {
        console.warn('No se pudo guardar el estado de pausas:', error);
    }
    saveTimeline(shiftTimeline);
    return normalized;
}

/**
 * Carga los campos de pausa desde `riskOps_breakState` y la línea de tiempo desde
 * `riskOps_timeline`, los une y los devuelve como un objeto completo.
 *
 * Missing, malformed or inaccessible data returns the default state.
 * @returns {object}
 */
export function loadBreakState() {
    try {
        const serialized = localStorage.getItem(STORAGE_KEYS.BREAK_STATE);
        const pauseFields = serialized ? normalizeState(JSON.parse(serialized)) : defaultState();
        const timeline = loadTimeline();
        return { ...pauseFields, shiftTimeline: timeline };
    } catch (error) {
        console.warn('No se pudo cargar el estado de pausas:', error);
        return defaultState();
    }
}

/**
 * Persiste la línea de tiempo del turno en `riskOps_timeline`.
 *
 * Equivalente a lo que escribía app.js (líneas 349-404) pero desde el módulo
 * de servicio, en lugar de directamente desde los controladores.
 *
 * Storage errors are contained.
 * @param {Array} events
 */
export function saveTimeline(events) {
    try {
        const safe = Array.isArray(events) ? events : [];
        localStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(safe));
    } catch (error) {
        console.warn('No se pudo guardar la línea de tiempo del turno:', error);
    }
}

/**
 * Carga la línea de tiempo del turno desde `riskOps_timeline`.
 *
 * Devuelve [] si la llave no existe, el JSON está malformado o hay error de acceso.
 * @returns {Array}
 */
export function loadTimeline() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.TIMELINE);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('No se pudo cargar la línea de tiempo del turno:', error);
        return [];
    }
}

/**
 * No-op — Opción A aprobada (2026-10-13).
 *
 * Con la Opción A, `saveBreakState` ya escribe `riskOps_timeline` como llave
 * separada (igual que app.js), por lo que no existe incompatibilidad de forma de
 * datos al conectar y no se necesita migrar nada. Esta función se mantiene
 * exportada para no romper el import en bootstrap.js, pero no ejecuta ninguna
 * acción.
 *
 * Antes de la decisión P3/Opción B esta función intentaba leer `riskOps_timeline`
 * y copiarla dentro de `riskOps_breakState.shiftTimeline`. Con Opción A ese
 * mecanismo es innecesario y ha sido eliminado.
 *
 * @returns {void}
 */
export function migrateFromLegacyStorage() {
    // no-op — Opción A: llaves separadas, sin migración necesaria.
}
