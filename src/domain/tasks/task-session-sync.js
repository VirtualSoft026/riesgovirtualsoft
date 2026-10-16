import { ROLES } from '../../config/roles.js';
import { USER_STATUS } from '../../utils/constants.js';

/**
 * Piezas puras del latido de sesión activa (`syncActiveSessionToFirebase()`, app.js 2386-2472) que NO
 * son el estado de pausas (eso ya vive en `domain/shifts/active-session-payload.js` y
 * `controllers/shift-controller.js` → `describeLiveSession`).
 *
 * Regla de oro que este módulo hace verificable (comentario de app.js 2455-2465): el latido SOLO
 * transporta metadatos de la sesión. `buildSessionMetadata()` arma el payload campo por campo y NUNCA
 * incluye `tasks`; así un ping periódico con un snapshot desactualizado no puede pisar una tarea
 * recién guardada (la persistencia de cada tarea es exclusiva de `persistTaskToActiveSession()`).
 */

/** Versión de la aplicación que el latido publica en `active_sessions/{uid}/appVersion` (app.js 2468). */
export const APP_VERSION = 'v104';

/** Rol que publica latido. */
const GESTOR_ROLE = ROLES.GESTOR;

/**
 * ¿Debe este usuario enviar latido? Solo un Gestor con `uid` (app.js 2387-2389).
 *
 * @param {{role?: string, uid?: string}|null|undefined} user
 * @returns {boolean}
 */
export function shouldSyncActiveSession(user) {
    if (!user || user.role !== GESTOR_ROLE) return false;

    return !!user.uid;
}

/**
 * Si la sesión se cerró en otra pestaña, `localStorage` ya no tiene al usuario (app.js 2392-2397).
 *
 * @param {string|null|undefined} storedUserRaw valor de `localStorage.getItem('riskOps_currentUser')`
 * @returns {boolean}
 */
export function isSessionClosedElsewhere(storedUserRaw) {
    return !storedUserRaw;
}

/**
 * Hora de login a publicar: la del usuario local o, si falta, la actual (app.js 2411).
 *
 * @param {{loginTime?: string}} user
 * @param {() => string} nowIso devuelve `new Date().toISOString()`
 * @returns {string}
 */
export function resolveLoginTime(user, nowIso) {
    return user.loginTime || nowIso();
}

/**
 * ¿El usuario está inactivo? Con detector nativo concedido manda `globalIdleState`; sin él, el respaldo
 * por DOM (app.js 2419-2424). El respaldo se pasa como función porque solo se evalúa sin detector.
 *
 * @param {{idleDetectorGranted: boolean, globalIdleState: boolean, domIdleFallback: () => boolean}} input
 * @returns {boolean}
 */
export function resolveIsInactive({ idleDetectorGranted, globalIdleState, domIdleFallback }) {
    if (idleDetectorGranted) return globalIdleState;

    return domIdleFallback() ? true : false;
}

/**
 * Evento de la bitácora que corresponde a un cambio de estado (app.js 2438-2442): entrar a Inactivo abre
 * el evento 'Inactividad'; salir de Inactivo lo cierra; cualquier otro caso no hace nada.
 *
 * @param {string} currentStatus
 * @param {string} previousStatus
 * @returns {'start'|'end'|null}
 */
export function decideInactivityTimelineAction(currentStatus, previousStatus) {
    if (currentStatus === USER_STATUS.INACTIVE && previousStatus !== USER_STATUS.INACTIVE) return 'start';
    if (currentStatus !== USER_STATUS.INACTIVE && previousStatus === USER_STATUS.INACTIVE) return 'end';

    return null;
}

/**
 * Metadatos de la sesión (app.js 2461-2470). Nunca incluye `tasks`.
 *
 * @param {{
 *   user: {name?: string, email?: string, shift?: string},
 *   loginTime: string,
 *   lastActive: number,
 *   status: string,
 *   counters: {totalTasks: number, finalized: number, completedTasks: number, notDoneTasks: number, percentage: number},
 *   timeline?: Array<object>|null,
 *   appVersion?: string
 * }} input
 * @returns {Record<string, unknown>}
 */
export function buildSessionMetadata({ user, loginTime, lastActive, status, counters, timeline, appVersion = APP_VERSION }) {
    return {
        name: user.name,
        email: user.email,
        shift: user.shift || 'Por Asignar',
        loginTime,
        lastActive,
        status,
        totalTasks: counters.totalTasks,
        finalizedTasks: counters.finalized,
        completedTasks: counters.completedTasks,
        notDoneTasks: counters.notDoneTasks,
        percentage: counters.percentage,
        timeline: timeline || [],
        appVersion
    };
}

/**
 * Cola del payload que el laboratorio conecta sin tocar `status`/`totalTasks` (esas dos líneas las
 * reemplaza la integración del controlador de turno): los contadores derivados del DOM, el porcentaje,
 * la bitácora y la versión.
 *
 * @param {{finalized: number, completedTasks: number, notDoneTasks: number, percentage: number}} counters
 * @param {Array<object>|null|undefined} timeline
 * @param {string} [appVersion]
 * @returns {{finalizedTasks: number, completedTasks: number, notDoneTasks: number, percentage: number, timeline: Array<object>, appVersion: string}}
 */
export function buildSessionMetadataTail(counters, timeline, appVersion = APP_VERSION) {
    return {
        finalizedTasks: counters.finalized,
        completedTasks: counters.completedTasks,
        notDoneTasks: counters.notDoneTasks,
        percentage: counters.percentage,
        timeline: timeline || [],
        appVersion
    };
}
