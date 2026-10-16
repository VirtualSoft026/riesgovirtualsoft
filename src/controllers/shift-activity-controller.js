/**
 * Controlador de actividad del turno: detecta inactividad y restaura el estado activo del Gestor.
 *
 * Migra de app.js:
 *   - `applyIdleStateChange()` (líneas 517-537) → `onIdleChange(isIdle)`
 *   - `updateActivity()` (líneas 564-586)       → `onActivity()`
 *
 * Los tres mecanismos de detección son:
 *   1. Native IdleDetector API  → dispara `onIdleChange(bool)` (vía idle-detector-adapter)
 *   2. DOM events (mousemove, keydown, click, scroll, visibilitychange, focus)
 *      → disparan `onActivity()` directamente
 *   3. DOM fallback poller (setInterval 1s) → llama `shouldApplyDomIdleFallback(now)`
 *      (exportado desde idle-detector-adapter) y llama `onIdleChange(true)` si corresponde
 *
 * El WIRING de los tres mecanismos (addEventListener + setInterval + initIdleDetector)
 * corresponde a bootstrap.js, NO a este controlador. Este controlador expone solo
 * las funciones de reacción y el accessor del timestamp.
 *
 * Contrato de estados (igual que app.js):
 *   - onIdleChange(true):  si user.status === 'Activo' → push 'Inactividad start', set 'Inactivo'
 *   - onIdleChange(false): si user.status === 'Inactivo' → push 'Inactividad end', set 'Activo'
 *   - onActivity():        actualiza timestamp; si Inactivo → push 'Inactividad end', set 'Activo'
 *
 * Guards de pausa (igual que app.js): si `isOnBreak()` es true, `onIdleChange` no actúa.
 * Solo aplica para Gestores (`user.role === 'Gestor'`).
 *
 * Dependencias `pushTimelineEvent`, `onStatusDisplay` y `syncSession`: hoy las inyecta app.js con sus
 *   funciones reales. bootstrap.js no tiene versiones simuladas (W-53 a, paso 3.0); las conecta con los
 *   módulos de `src/` cuando migra el detector de inactividad (W-24, paso 3.3) y la sincronización de la
 *   sesión activa (W-19, paso 3.2).
 *
 * @param {{
 *   getUser:            () => ({role: string, uid: string, status: string}|null),
 *   isOnBreak:          () => boolean,
 *   setUserStatus:      (uid: string, status: string) => void,
 *   pushTimelineEvent:  (type: string, action: string) => void,
 *   onStatusDisplay:    () => void,
 *   syncSession:        () => void,
 *   now?:               () => number,
 *   logger?:            {warn: Function}
 * }} deps
 */
export function createShiftActivityController({
    getUser,
    isOnBreak,
    setUserStatus,
    pushTimelineEvent,
    onStatusDisplay,
    syncSession,
    now = Date.now,
    logger = console,
}) {
    /**
     * Equivalente a `lastLocalActivityTimestamp` de app.js.
     * Se inicializa con la marca de tiempo actual y se actualiza en cada `onActivity`.
     * `idle-detector-adapter` lo lee vía `getLastActivityTimestamp` para decidir
     * si ya pasó el umbral de inactividad DOM.
     */
    let _lastActivityTimestamp = now();

    // ─────────────────────────────────────────────────────────────────────────────
    // Helpers internos
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Marca al usuario como 'Activo' y sincroniza estado. Extrae la secuencia
     * compartida entre `onIdleChange(false)` y `onActivity()`.
     *
     * @param {object} user - perfil DB del usuario (role, uid, status ya verificados)
     */
    function _applyActive(user) {
        user.status = 'Activo'; // mutación local del objeto compartido, igual que app.js
        pushTimelineEvent('Inactividad', 'end');
        _lastActivityTimestamp = now();
        setUserStatus(user.uid, 'Activo');
        onStatusDisplay();
        syncSession();
    }

    /**
     * Marca al usuario como 'Inactivo' y sincroniza estado.
     *
     * @param {object} user - perfil DB del usuario (role, uid, status ya verificados)
     */
    function _applyInactive(user) {
        user.status = 'Inactivo'; // mutación local del objeto compartido, igual que app.js
        pushTimelineEvent('Inactividad', 'start');
        setUserStatus(user.uid, 'Inactivo');
        onStatusDisplay();
        syncSession();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // API pública
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Reacciona al cambio de estado del IdleDetector nativo (o del poller DOM).
     *
     * Migra `applyIdleStateChange()` de app.js (líneas 517-537).
     * Se llama desde idle-detector-adapter vía el callback `onIdleChange`.
     * También se llama desde el poller DOM de 1s cuando `shouldApplyDomIdleFallback()`
     * devuelve true (en ese caso siempre con `isIdle = true`).
     *
     * @param {boolean} isIdle
     */
    function onIdleChange(isIdle) {
        const user = getUser();
        if (!user || user.role !== 'Gestor') return;
        if (isOnBreak()) return; // Guards: pausa activa → no se afirma inactividad

        if (isIdle && user.status === 'Activo') {
            _applyInactive(user);
        } else if (!isIdle && user.status === 'Inactivo') {
            _applyActive(user);
        }
    }

    /**
     * Reacciona a eventos DOM de actividad del usuario.
     *
     * Migra `updateActivity()` de app.js (líneas 564-586).
     * Se conecta en bootstrap.js a: mousemove, keydown, click, scroll,
     * visibilitychange (document) y focus (window).
     *
     * Contrato original conservado:
     *   - Siempre actualiza `_lastActivityTimestamp`.
     *   - Si el usuario estaba 'Inactivo' → restaura a 'Activo'.
     *   - No verifica `isOnBreak()`: el original tampoco lo hace. La pausa inhibe
     *     la transición hacia 'Inactivo' (en `onIdleChange`), pero la actividad DOM
     *     siempre puede restaurar al estado 'Activo'.
     */
    function onActivity() {
        _lastActivityTimestamp = now();

        const user = getUser();
        if (!user || user.role !== 'Gestor') return;

        if (user.status === 'Inactivo') {
            _applyActive(user);
        }
    }

    /**
     * Devuelve el último timestamp de actividad DOM.
     * `idle-detector-adapter.initIdleDetector` lo recibe como `getLastActivityTimestamp`
     * para calcular el umbral interno del DOM fallback.
     *
     * @returns {number}
     */
    function getLastActivityTimestamp() {
        return _lastActivityTimestamp;
    }

    return { onIdleChange, onActivity, getLastActivityTimestamp };
}
