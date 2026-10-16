/**
 * Sesión de RiskOps (W-02 y W-55 a; DE-1 = b).
 *
 * Reemplaza el bloque de sesión de `app.js` (l. 119-121 y 670-760), con una diferencia de seguridad: el rol y
 * la aprobación salen de `users/{uid}` en el servidor y se escuchan mientras dure la sesión. El caché de
 * `localStorage` (`riskOps_currentUser`) es solo de presentación: si difiere del servidor, prevalece el
 * servidor y el caché se reescribe (CF-4.1, CF-4.3).
 *
 * Se conserva de `app.js`:
 * - sin sesión local → `login.html`;
 * - sesión de un Gestor iniciada otro día → se limpia y vuelve a `login.html`;
 * - `login_logs/{id}/logoutTime`: se borra el falso cierre de una recarga y se registra `onDisconnect`;
 * - el cambio de `hasSplitShift` en tiempo real (solo Gestor), incluido el valor inicial.
 *
 * Se retira (DE-12): el parche de una sola vez `inactivity_cleared_june17_v1`.
 *
 * Todo el entorno entra por inyección: no toca `window`, `localStorage` ni `firebase` directamente.
 */

import { STORAGE_KEYS } from '../utils/constants.js';
import { ROLES } from '../config/roles.js';
import { validateUserProfile, mergeSessionProfile } from '../domain/auth/user-profile.js';

/** Motivos de cierre de sesión que no vienen del perfil. */
export const SESSION_END = Object.freeze({
    NO_LOCAL_SESSION: 'sin-sesion-local',
    STALE_DAY: 'sesion-de-otro-dia',
    NOT_AUTHENTICATED: 'sin-autenticacion',
    UID_MISMATCH: 'sesion-de-otro-usuario',
    PROFILE_READ_ERROR: 'perfil-no-legible',
    LOGOUT: 'cierre-de-sesion'
});

/** Claves que se borran al cerrar sesión: todas las de `STORAGE_KEYS` menos la preferencia de tema (CF-4.4). */
export const SESSION_STORAGE_KEYS = Object.freeze(
    Object.entries(STORAGE_KEYS).filter(([name]) => name !== 'THEME').map(([, key]) => key)
);

/**
 * ¿Dos fechas caen el mismo día local? (app.js 674-678).
 *
 * @param {Date} a
 * @param {Date} b
 * @returns {boolean}
 */
export function isSameLocalDay(a, b) {
    return !isNaN(a.getTime()) &&
        a.getDate() === b.getDate() &&
        a.getMonth() === b.getMonth() &&
        a.getFullYear() === b.getFullYear();
}

/**
 * @param {string|null} raw
 * @returns {Record<string, unknown>|null}
 */
function parseCachedUser(raw) {
    if (!raw) return null;

    try {
        const value = JSON.parse(raw);
        return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    } catch (e) {
        return null;
    }
}

/**
 * @param {{
 *   auth: {onAuthStateChanged: (cb: (user: {uid: string}|null) => void) => (() => void), signOut: () => Promise<void>},
 *   database: {ref: (path: string) => any},
 *   storage: {getItem: (key: string) => (string|null), setItem: (key: string, value: string) => void, removeItem: (key: string) => void},
 *   goToLogin: () => void,
 *   serverTimestamp?: unknown,
 *   now?: () => Date,
 *   logger?: {info: Function, warn: Function, error: Function},
 *   onReady?: (profile: Record<string, unknown>) => void,
 *   onProfileChange?: (profile: Record<string, unknown>, previous: Record<string, unknown>) => void,
 *   onSplitShiftChange?: (hasSplitShift: boolean) => void,
 *   onEnd?: (reason: string, detail?: string) => void
 * }} deps
 */
export function createSession({
    auth,
    database,
    storage,
    goToLogin,
    serverTimestamp = null,
    now = () => new Date(),
    logger = console,
    onReady = () => {},
    onProfileChange = () => {},
    onSplitShiftChange = () => {},
    onEnd = () => {}
}) {
    /** @type {Record<string, unknown>|null} */
    let current = null;
    let ended = false;
    let started = false;
    /** @type {(() => void)|null} */
    let unsubscribeAuth = null;
    /** @type {{ref: any, callback: Function}|null} */
    let profileListener = null;

    function clearSessionStorage() {
        SESSION_STORAGE_KEYS.forEach((key) => {
            try {
                storage.removeItem(key);
            } catch (e) { /* almacenamiento no disponible: no bloquea la salida */ }
        });
    }

    function detachListeners() {
        if (profileListener) {
            try {
                profileListener.ref.off('value', profileListener.callback);
            } catch (e) { /* ya desconectado */ }
            profileListener = null;
        }

        if (unsubscribeAuth) {
            try {
                unsubscribeAuth();
            } catch (e) { /* ya desconectado */ }
            unsubscribeAuth = null;
        }
    }

    /**
     * Cierra la sesión una sola vez: quita listeners, borra las claves de sesión, hace `signOut` y vuelve al login.
     *
     * @param {string} reason
     * @param {string} [detail]
     */
    function end(reason, detail) {
        if (ended) return;
        ended = true;
        logger.info('[sesion] fin de sesión:', reason);
        detachListeners();
        clearSessionStorage();
        current = null;

        try {
            onEnd(reason, detail);
        } catch (e) {
            logger.error('[sesion] onEnd falló', e);
        }

        Promise.resolve()
            .then(() => auth.signOut())
            .catch((error) => logger.error('[sesion] signOut falló', error))
            .then(() => goToLogin());
    }

    function trackLoginLog(loginLogId) {
        if (!loginLogId) return;

        try {
            // Elimina el falso logoutTime que deja una recarga (F5) o un corte breve de red (app.js 719-724).
            database.ref(`login_logs/${loginLogId}/logoutTime`).remove();
            database.ref(`login_logs/${loginLogId}`).onDisconnect().update({ logoutTime: serverTimestamp });
        } catch (error) {
            logger.error('[sesion] no se pudo registrar onDisconnect del login_log', error);
        }
    }

    /**
     * @param {string} uid
     * @param {Record<string, unknown>} cached
     */
    function listenProfile(uid, cached) {
        const ref = database.ref(`users/${uid}`);
        let first = true;
        /** @type {boolean|undefined} */
        let lastSplit;

        const callback = (snapshot) => {
            if (ended) return;

            const result = validateUserProfile(uid, snapshot ? snapshot.val() : null);

            if (result.ok !== true) {
                const failure = /** @type {{ok: false, reason: string, rejectionReason?: string}} */ (result);
                end(failure.reason, failure.rejectionReason);
                return;
            }

            const previous = current;
            const merged = mergeSessionProfile(previous || cached, result.profile);

            current = merged;

            try {
                storage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(merged));
            } catch (e) { /* el caché es solo de presentación */ }

            if (first) {
                first = false;
                trackLoginLog(typeof merged.loginLogId === 'string' ? merged.loginLogId : '');
                onReady(merged);
            } else if (previous && previous.role !== merged.role) {
                onProfileChange(merged, previous);
            }

            if (merged.role === ROLES.GESTOR && merged.hasSplitShift !== lastSplit) {
                lastSplit = /** @type {boolean} */ (merged.hasSplitShift);
                onSplitShiftChange(lastSplit);
            }
        };

        const onError = (error) => {
            logger.error('[sesion] no se pudo leer users/{uid}', error);
            end(SESSION_END.PROFILE_READ_ERROR);
        };

        ref.on('value', callback, onError);
        profileListener = { ref, callback };
    }

    /**
     * Arranca la sesión. Devuelve `false` si se cerró de inmediato (sin sesión local o de otro día).
     *
     * @returns {boolean}
     */
    function start() {
        if (started) return !ended;
        started = true;

        const cached = parseCachedUser(storage.getItem(STORAGE_KEYS.CURRENT_USER));

        if (!cached) {
            end(SESSION_END.NO_LOCAL_SESSION);
            return false;
        }

        if (cached.role === ROLES.GESTOR && cached.loginTime) {
            const loginDate = new Date(/** @type {string} */ (cached.loginTime));

            if (!isSameLocalDay(loginDate, now())) {
                end(SESSION_END.STALE_DAY);
                return false;
            }
        }

        unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (ended) return;

            if (!user) {
                end(SESSION_END.NOT_AUTHENTICATED);
                return;
            }

            if (cached.uid && cached.uid !== user.uid) {
                end(SESSION_END.UID_MISMATCH);
                return;
            }

            if (!profileListener) listenProfile(user.uid, cached);
        });

        return true;
    }

    return {
        start,
        /** Cierre de sesión pedido por el usuario. */
        logout: () => end(SESSION_END.LOGOUT),
        /** Perfil vigente (validado contra el servidor) o `null` antes de `onReady` o después del cierre. */
        getUser: () => current,
        /** Quita los listeners sin cerrar la sesión (pruebas y `shutdown()` de bootstrap). */
        shutdown: detachListeners,
        isEnded: () => ended
    };
}
