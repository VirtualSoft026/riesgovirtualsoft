const NATIVE_IDLE_THRESHOLD_MS = 3 * 60 * 1000;
const SCREEN_LOCK_GRACE_PERIOD_MS = 10 * 1000;
const DOM_IDLE_FALLBACK_THRESHOLD_MS = 5 * 60 * 1000;

let idleDetectorInstance = null;
let idleDetectorStartPromise = null;
let screenLockTimer = null;
let idleDetectorGranted = false;
let idleDetectorStarted = false;

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
