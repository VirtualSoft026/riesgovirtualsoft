// W-41: una sola fuente para los umbrales (antes se copiaban aquí).
import {
    NATIVE_IDLE_THRESHOLD_MS,
    SCREEN_LOCK_GRACE_PERIOD_MS,
    DOM_IDLE_FALLBACK_THRESHOLD_MS
} from '../../utils/constants.js';

let idleDetectorInstance = null;
let idleDetectorStartPromise = null;
let screenLockTimer = null;
let idleDetectorGranted = false;
let idleDetectorStarted = false;

// 2026-10-14: sin efectos al importar. Antes se ponía window.idleDetectorGranted = false al cargar el
// bundle; si el bundle se carga después de que app.js arrancó el detector, eso apagaba la detección de
// inactividad. app.js ya inicializa esas banderas (window.idleDetectorGranted = false) y setDetectorStatus()
// las actualiza cuando initIdleDetector() corre.

let onIdleChange = () => {};
let onWarning = () => {};
let getLastActivityTimestamp = () => Date.now();

/**
 * Updates the internal callback configuration.
 *
 * @param {{
 *   onIdleChange?: (isIdle: boolean) => void,
 *   onWarning?: (visible: boolean, message?: string) => void,
 *   getLastActivityTimestamp?: () => number
 * }} callbacks
 * @returns {void}
 */
function configureCallbacks(callbacks = {}) {
    onIdleChange =
        typeof callbacks.onIdleChange === 'function'
            ? callbacks.onIdleChange
            : () => {};

    onWarning =
        typeof callbacks.onWarning === 'function'
            ? callbacks.onWarning
            : () => {};

    getLastActivityTimestamp =
        typeof callbacks.getLastActivityTimestamp === 'function'
            ? callbacks.getLastActivityTimestamp
            : () => Date.now();
}

/**
 * Updates the internal detector status.
 *
 * @param {boolean} granted
 * @param {boolean} started
 * @returns {void}
 */
function setDetectorStatus(granted, started) {
    idleDetectorGranted = granted;
    idleDetectorStarted = started;

    // Espejo en window para compatibilidad con app.js y el arnés de QA.
    if (typeof window !== 'undefined') {
        window.idleDetectorGranted = granted;
        window.idleDetectorStarted = started;
    }
}

/**
 * Cancels the delayed locked-screen transition.
 *
 * @returns {void}
 */
function clearScreenLockTimer() {
    if (screenLockTimer !== null) {
        clearTimeout(screenLockTimer);
        screenLockTimer = null;
    }
}

/**
 * Reports a warning through the injected callback.
 *
 * @param {string} message
 * @returns {void}
 */
function showWarning(message) {
    onWarning(true, message);
}

/**
 * Applies the current native IdleDetector state.
 *
 * @returns {void}
 */
function handleDetectorChange() {
    if (!idleDetectorInstance) {
        return;
    }

    const isLocked =
        idleDetectorInstance.screenState === 'locked';

    const isIdle =
        idleDetectorInstance.userState === 'idle';

    if (isLocked) {
        if (screenLockTimer === null) {
            screenLockTimer = setTimeout(() => {
                screenLockTimer = null;
                onIdleChange(true);
            }, SCREEN_LOCK_GRACE_PERIOD_MS);
        }

        return;
    }

    if (isIdle) {
        clearScreenLockTimer();
        onIdleChange(true);
        return;
    }

    clearScreenLockTimer();
    onIdleChange(false);
}

/**
 * Starts the browser Idle Detection API.
 *
 * @returns {Promise<boolean>}
 */
async function startIdleDetectorLogic() {
    if (idleDetectorStarted && idleDetectorInstance) {
        return true;
    }

    if (idleDetectorStartPromise) {
        return idleDetectorStartPromise;
    }

    if (
        typeof window === 'undefined' ||
        !('IdleDetector' in window)
    ) {
        setDetectorStatus(false, false);
        return false;
    }

    idleDetectorStartPromise = (async () => {
        try {
            const detector = new window.IdleDetector();

            detector.addEventListener(
                'change',
                handleDetectorChange
            );

            await detector.start({
                threshold: NATIVE_IDLE_THRESHOLD_MS
            });

            idleDetectorInstance = detector;
            setDetectorStatus(true, true);
            onWarning(false);

            return true;
        } catch (error) {
            idleDetectorInstance = null;
            setDetectorStatus(false, false);
            clearScreenLockTimer();

            console.error(
                'IdleDetector start failed:',
                error
            );

            return false;
        } finally {
            idleDetectorStartPromise = null;
        }
    })();

    return idleDetectorStartPromise;
}

/**
 * Checks the current browser permission and starts Idle Detection when
 * permission has already been granted.
 *
 * @returns {Promise<boolean>}
 */
async function checkAndStartIdleDetector() {
    if (
        typeof window === 'undefined' ||
        !('IdleDetector' in window)
    ) {
        setDetectorStatus(false, false);
        showWarning(
            'Tu navegador no admite el permiso de inactividad. ' +
            'Esto no impide finalizar el turno.'
        );
        return false;
    }

    if (
        typeof navigator === 'undefined' ||
        !navigator.permissions ||
        typeof navigator.permissions.query !== 'function'
    ) {
        setDetectorStatus(false, false);
        showWarning(
            'No fue posible verificar el permiso de inactividad. ' +
            'Esto no impide finalizar el turno.'
        );
        return false;
    }

    try {
        const permissionStatus =
            await navigator.permissions.query({
                name: 'idle-detection'
            });

        if (permissionStatus.state === 'granted') {
            const started = await startIdleDetectorLogic();

            if (!started) {
                showWarning(
                    'El permiso está otorgado, pero el detector ' +
                    'de inactividad no pudo iniciarse. Usa el botón ' +
                    'para reintentar.'
                );
            }

            return started;
        }

        setDetectorStatus(false, false);
        showWarning(
            'Permiso de inactividad pendiente o denegado. ' +
            'RiskOps no podrá registrar automáticamente cuando ' +
            'bloquees la pantalla. Esto no impide finalizar el turno.'
        );
    } catch (error) {
        setDetectorStatus(false, false);

        console.error(
            'Permission query error:',
            error
        );

        showWarning(
            'No fue posible verificar el permiso de inactividad. ' +
            'Esto no impide finalizar el turno.'
        );
    }

    return false;
}

/**
 * Initializes the idle detector service with application callbacks.
 *
 * The module keeps detector state private and does not call application
 * functions such as applyIdleStateChange or manipulate the DOM directly.
 *
 * @param {{
 *   onIdleChange?: (isIdle: boolean) => void,
 *   onWarning?: (visible: boolean, message?: string) => void,
 *   getLastActivityTimestamp?: () => number,
 *   autoStart?: boolean
 * }} [callbacks]
 * @returns {Promise<boolean>}
 */
export async function initIdleDetector(callbacks = {}) {
    configureCallbacks(callbacks);

    if (callbacks.autoStart === false) {
        return false;
    }

    return checkAndStartIdleDetector();
}

/**
 * Requests browser permission and starts the idle detector manually.
 *
 * @returns {Promise<boolean>}
 */
export async function requestIdlePermissionManual() {
    if (
        typeof window === 'undefined' ||
        !('IdleDetector' in window)
    ) {
        setDetectorStatus(false, false);
        showWarning(
            'Tu navegador no admite el permiso de inactividad. ' +
            'Esto no impide finalizar el turno.'
        );
        return false;
    }

    if (
        typeof window.IdleDetector.requestPermission !==
        'function'
    ) {
        setDetectorStatus(false, false);
        showWarning(
            'Tu navegador no permite solicitar el permiso ' +
            'de inactividad. Esto no impide finalizar el turno.'
        );
        return false;
    }

    try {
        const permissionState =
            await window.IdleDetector.requestPermission();

        if (permissionState === 'granted') {
            const started = await startIdleDetectorLogic();

            if (!started) {
                showWarning(
                    'El permiso fue otorgado, pero el detector ' +
                    'de inactividad no pudo iniciarse. Esto no ' +
                    'impide finalizar el turno.'
                );
            }

            return started;
        }

        setDetectorStatus(false, false);
        showWarning(
            'Permiso de inactividad denegado. ' +
            'Esto no impide finalizar el turno.'
        );
    } catch (error) {
        setDetectorStatus(false, false);

        console.error(
            'Request permission error:',
            error
        );

        showWarning(
            'No fue posible activar el permiso de inactividad. ' +
            'Esto no impide finalizar el turno.'
        );
    }

    return false;
}

/**
 * Determines whether the DOM inactivity fallback should be applied.
 *
 * The caller remains responsible for checking application state such as
 * active breaks and user role.
 *
 * @param {number} [now=Date.now()]
 * @returns {boolean}
 */
export function shouldApplyDomIdleFallback(now = Date.now()) {
    if (idleDetectorGranted) {
        return false;
    }

    if (
        typeof document !== 'undefined' &&
        document.visibilityState !== 'visible'
    ) {
        return false;
    }

    if (
        typeof document !== 'undefined' &&
        typeof document.hasFocus === 'function' &&
        !document.hasFocus()
    ) {
        return false;
    }

    const lastActivityTimestamp =
        Number(getLastActivityTimestamp());

    if (!Number.isFinite(lastActivityTimestamp)) {
        return false;
    }

    return (
        now - lastActivityTimestamp >
        DOM_IDLE_FALLBACK_THRESHOLD_MS
    );
}

/** Eventos del documento que cuentan como actividad del usuario (app.js, antes de W-24). */
export const IDLE_ACTIVITY_DOCUMENT_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'visibilitychange'];

/** Eventos de la ventana que cuentan como actividad (antes de W-24: solo `focus`). */
export const IDLE_ACTIVITY_WINDOW_EVENTS = ['focus'];

/** Periodo del sondeo del respaldo DOM (antes de W-24: `setInterval(..., 1000)`). */
export const DOM_IDLE_POLL_MS = 1000;

/**
 * Registra UNA vez la escucha de actividad y el sondeo del respaldo DOM (W-24). Devuelve la función que retira todo:
 * los listeners del documento y de la ventana y el temporizador.
 *
 * Cada sondeo llama a `onDomFallback()` solo si `shouldApplyDomIdleFallback()` lo permite (sin detector nativo, pestaña
 * visible y con foco, y más de 5 min sin actividad según `getLastActivityTimestamp` de `initIdleDetector`).
 *
 * @param {{
 *   doc: { addEventListener: Function, removeEventListener: Function },
 *   win: { addEventListener: Function, removeEventListener: Function },
 *   onActivity: (event?: unknown) => void,
 *   onDomFallback?: () => void,
 *   pollMs?: number,
 *   setIntervalFn?: Function,
 *   clearIntervalFn?: Function
 * }} options
 * @returns {() => void} desenlace
 */
export function bindIdleActivityListeners({
    doc,
    win,
    onActivity,
    onDomFallback,
    pollMs = DOM_IDLE_POLL_MS,
    setIntervalFn = setInterval,
    clearIntervalFn = clearInterval
}) {
    if (typeof onActivity !== 'function') {
        throw new TypeError('bindIdleActivityListeners: onActivity debe ser una función');
    }

    IDLE_ACTIVITY_DOCUMENT_EVENTS.forEach((eventName) => doc.addEventListener(eventName, onActivity));
    IDLE_ACTIVITY_WINDOW_EVENTS.forEach((eventName) => win.addEventListener(eventName, onActivity));

    const pollTimer = setIntervalFn(() => {
        if (shouldApplyDomIdleFallback() && typeof onDomFallback === 'function') {
            onDomFallback();
        }
    }, pollMs);

    return function unbindIdleActivityListeners() {
        IDLE_ACTIVITY_DOCUMENT_EVENTS.forEach((eventName) => doc.removeEventListener(eventName, onActivity));
        IDLE_ACTIVITY_WINDOW_EVENTS.forEach((eventName) => win.removeEventListener(eventName, onActivity));
        clearIntervalFn(pollTimer);
    };
}
