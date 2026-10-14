/**
 * Controlador de turno: pausas (desayuno, almuerzo, Pausa de Turno), visibilidad del botón de Pausa de
 * Turno, latido hacia el supervisor y cálculo de tiempos del cierre.
 *
 * Reemplaza, de `app.js`, la parte con efectos de `toggleBreakfastBreak()` (3505), `toggleLunchBreak()`
 * (3546), `toggleSplitShiftBreak()` (3621), la restauración de botones (6489-6517), el listener de
 * `hasSplitShift` (682-695), la visibilidad en `setupSidebar()`/`updateNavigation()` (5123/5133), el cierre
 * de pausas abiertas de `handleEndShift()` (3732-3734) y su bloque de cálculo (3742-3780).
 *
 * No toca el DOM, localStorage ni Firebase directamente: recibe todo por `deps` (inyección de
 * dependencias), así se prueba sin navegador. La adaptación a `app.js` vive en el paso de integración
 * del laboratorio (`fase_2/lab/integracion/`), no aquí.
 *
 * Reglas de negocio (plan maestro, sección 4 bis):
 *  RN-1/RN-2/RN-3  El flag `hasSplitShift` gobierna iniciar la pausa y mostrar el botón; retomar siempre
 *                  se permite. RN-4  La pausa no es tiempo trabajado (se descuenta al cierre).
 * Deuda cerrada aquí: botón refrescado en login/flag en vivo/recarga/cambio de pausa/evento `storage`
 * (punto 2); fallo de sincronización visible (punto 5); campos de la pausa en el latido (punto 4).
 */

import { toggleBreak } from '../domain/shifts/break-transitions.js';
import {
    SPLIT_SHIFT_BLOCK_REASON,
    isSplitShiftEnabled,
    shouldShowSplitShiftButton
} from '../domain/shifts/split-shift-policy.js';
import { calculateShiftClosureTimes } from '../domain/shifts/shift-calculator.js';
import { buildClosureEmailTimeFields } from '../domain/shifts/shift-report-builder.js';
import { resolveLiveStatus, buildBreakPayloadFields } from '../domain/shifts/active-session-payload.js';
import { applyBreakButtonView, BREAK_BUTTON_IDS } from '../ui/components/break-button.js';
import { STORAGE_KEYS } from '../utils/constants.js';

/** Campos del estado de pausas que el controlador lee y escribe (los 9 de `saveBreakState()`). */
export const BREAK_STATE_FIELDS = Object.freeze([
    'isLunchBreak', 'lunchStartTime', 'totalLunchTimeMs',
    'isBreakfastBreak', 'breakfastStartTime', 'totalBreakfastTimeMs',
    'isSplitShiftBreak', 'splitShiftStartTime', 'totalSplitShiftTimeMs'
]);

const ACTIVE_FIELD = Object.freeze({
    breakfast: 'isBreakfastBreak',
    lunch: 'isLunchBreak',
    split: 'isSplitShiftBreak'
});

/** Orden en que `handleEndShift()` cierra las pausas abiertas (app.js 3732-3734). */
const END_SHIFT_CLOSE_ORDER = Object.freeze(['lunch', 'breakfast', 'split']);

export const BLOCK_MESSAGE = Object.freeze({
    [SPLIT_SHIFT_BLOCK_REASON.OTHER_BREAK_ACTIVE]: 'Debes volver del descanso actual primero.',
    [SPLIT_SHIFT_BLOCK_REASON.SPLIT_SHIFT_NOT_ENABLED]: 'La Pausa de Turno no está habilitada para tu usuario. Pídele a tu supervisor que la active.',
    NO_USER: ''
});

function pickBreakFields(state) {
    const picked = {};

    BREAK_STATE_FIELDS.forEach((field) => {
        picked[field] = state[field];
    });

    return picked;
}

/**
 * @param {{
 *   getUser: () => (object|null),
 *   getState: () => object,
 *   applyState: (fields: object) => void,
 *   reloadState?: () => void,
 *   setUserFlag?: (value: boolean) => void,
 *   now?: () => number,
 *   timeline: {push: (type: string, action: 'start'|'end') => void},
 *   storage: {saveBreakState: () => void},
 *   sync: () => (Promise<unknown>|undefined),
 *   onActivity?: () => void,
 *   ui: {
 *     getButton: (id: string) => (object|null),
 *     setSplitShiftVisible: (visible: boolean) => void,
 *     notifyBlocked?: (reason: string, message: string) => void,
 *     setSyncWarning?: (failed: boolean, error?: unknown) => void,
 *     refreshSidebar?: () => void
 *   },
 *   logger?: {warn: Function}
 * }} deps
 */
export function createShiftController(deps) {
    const {
        getUser, getState, applyState, reloadState, setUserFlag,
        now = Date.now, timeline, storage, sync, onActivity, ui, logger = console
    } = deps;

    function readState() {
        return pickBreakFields(getState() || {});
    }

    /** Envía el latido y deja visible si falló; nunca lanza ni deja una promesa sin atender. */
    function syncAndTrack() {
        let pending;

        try {
            pending = sync();
        } catch (error) {
            if (ui.setSyncWarning) ui.setSyncWarning(true, error);
            logger.warn('Fallo al sincronizar la sesión activa:', error);
            return Promise.resolve({ ok: false, error });
        }

        if (!pending || typeof pending.then !== 'function') {
            return Promise.resolve({ ok: true });
        }

        return pending.then(
            () => {
                if (ui.setSyncWarning) ui.setSyncWarning(false);
                return { ok: true };
            },
            (error) => {
                if (ui.setSyncWarning) ui.setSyncWarning(true, error);
                logger.warn('Fallo al sincronizar la sesión activa:', error);
                return { ok: false, error };
            }
        );
    }

    /** ¿Debe verse el botón de Pausa de Turno? (RN-1/RN-2/RN-3) */
    function isSplitShiftButtonVisible() {
        return shouldShowSplitShiftButton(getUser(), { isSplitShiftBreak: readState().isSplitShiftBreak });
    }

    /** Aplica la visibilidad calculada al botón. */
    function refreshSplitShiftButton() {
        const visible = isSplitShiftButtonVisible();
        ui.setSplitShiftVisible(visible);
        return visible;
    }

    /**
     * Pinta los botones según el estado. Con `onlyActive` solo toca los de pausa en curso (como la
     * restauración de app.js 6489-6517, que deja el resto con su HTML por defecto).
     */
    function renderBreakButtons({ onlyActive = false } = {}) {
        const state = readState();

        Object.keys(ACTIVE_FIELD).forEach((kind) => {
            const active = state[ACTIVE_FIELD[kind]] === true;

            if (onlyActive && !active) return;

            applyBreakButtonView(ui.getButton(BREAK_BUTTON_IDS[kind]), kind, active);
        });
    }

    /**
     * Pulsar un botón de pausa. Devuelve el resultado de la transición más `syncPromise`.
     *
     * @param {'breakfast'|'lunch'|'split'} kind
     */
    function toggle(kind) {
        const user = getUser();

        if (!user) {
            return { blocked: true, blockedReason: 'NO_USER', action: null, syncPromise: Promise.resolve({ ok: true }) };
        }

        const state = readState();
        const result = toggleBreak(state, kind, now(), { splitShiftEnabled: isSplitShiftEnabled(user) });

        if (result.blocked) {
            if (ui.notifyBlocked) ui.notifyBlocked(result.blockedReason, BLOCK_MESSAGE[result.blockedReason] || '');
            if (kind === 'split') refreshSplitShiftButton(); // sin flag el botón no debe quedar visible
            return { ...result, syncPromise: Promise.resolve({ ok: true }) };
        }

        applyState(pickBreakFields(result.state));
        timeline.push(result.timelineEvent.type, result.timelineEvent.action);
        storage.saveBreakState();
        applyBreakButtonView(ui.getButton(BREAK_BUTTON_IDS[kind]), kind, result.action === 'start');

        if (result.effects.updateActivity && onActivity) onActivity();

        if (kind === 'split') refreshSplitShiftButton();

        return { ...result, syncPromise: syncAndTrack() };
    }

    /**
     * El flag `hasSplitShift` cambió en Firebase (listener en vivo) o desde otra vía.
     * Si se revoca con una pausa en curso, el botón "Retomar Turno" sigue visible (RN-3).
     */
    function handleFlagChange(rawValue) {
        const user = getUser();

        if (!user) return { changed: false, visible: false };

        const value = rawValue === true;

        if (user.hasSplitShift === value) {
            return { changed: false, visible: isSplitShiftButtonVisible() };
        }

        if (setUserFlag) setUserFlag(value);

        const visible = refreshSplitShiftButton();

        if (ui.refreshSidebar) ui.refreshSidebar();

        return { changed: true, visible };
    }

    /** Evento `storage` del navegador (otra pestaña cambió el estado de pausas): recarga y repinta. */
    function handleStorageChange(key) {
        if (key !== STORAGE_KEYS.BREAK_STATE) return false;

        if (reloadState) reloadState();
        renderBreakButtons();
        refreshSplitShiftButton();

        return true;
    }

    /** Al iniciar sesión o recargar: botones de pausa en curso + visibilidad del botón de Pausa de Turno. */
    function restoreOnLoad() {
        renderBreakButtons({ onlyActive: true });
        refreshSplitShiftButton();
    }

    /**
     * Cierra las pausas abiertas antes de calcular el cierre (app.js 3732-3734). Retomar siempre está
     * permitido aunque el flag se haya revocado, así la pausa siempre queda acumulada.
     *
     * @returns {Array<'lunch'|'breakfast'|'split'>} pausas cerradas
     */
    function closeOpenBreaks() {
        const closed = [];

        END_SHIFT_CLOSE_ORDER.forEach((kind) => {
            if (readState()[ACTIVE_FIELD[kind]]) {
                const result = toggle(kind);

                if (!result.blocked) closed.push(kind);
            }
        });

        return closed;
    }

    /**
     * Tiempos y campos del correo del cierre (decisión D1): horas efectivas = turno − almuerzo − desayuno −
     * Pausa de Turno (RN-4) − inactividad; la penalidad se informa pero no se resta.
     *
     * @param {{loginMs: number, endMs: number, inactivityMins: number, cleanInactivityMins?: number}} input
     *   `inactivityMins`: bitácora en vivo (entra en la penalidad, como en app.js). `cleanInactivityMins`:
     *   bitácora consolidada (la que se guarda en `inactividadTotalMins`); es la que se resta de las horas
     *   efectivas para que el correo coincida con el panel. Si se omite, se resta `inactivityMins`.
     */
    function computeShiftClosure({ loginMs, endMs, inactivityMins, cleanInactivityMins }) {
        const state = readState();
        const times = calculateShiftClosureTimes({
            loginMs,
            endMs,
            lunchMs: state.totalLunchTimeMs,
            breakfastMs: state.totalBreakfastTimeMs,
            splitShiftMs: state.totalSplitShiftTimeMs,
            inactivityMins,
            effectiveInactivityMins: cleanInactivityMins
        });

        return { times, emailFields: buildClosureEmailTimeFields(times, state.totalSplitShiftTimeMs) };
    }

    /** Estado y campos de pausa que lleva el latido de `active_sessions/{uid}`. */
    function describeLiveSession(isInactive) {
        const state = readState();

        return { status: resolveLiveStatus(state, isInactive === true), ...buildBreakPayloadFields(state) };
    }

    return {
        toggle,
        toggleBreakfast: () => toggle('breakfast'),
        toggleLunch: () => toggle('lunch'),
        toggleSplitShift: () => toggle('split'),
        isSplitShiftButtonVisible,
        refreshSplitShiftButton,
        renderBreakButtons,
        handleFlagChange,
        handleStorageChange,
        restoreOnLoad,
        closeOpenBreaks,
        computeShiftClosure,
        describeLiveSession
    };
}
