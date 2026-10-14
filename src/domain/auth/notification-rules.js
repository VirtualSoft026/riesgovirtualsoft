/**
 * Reglas de "marcar todas las notificaciones como leídas" (markAllAsRead, app.js 4860-4896).
 *
 * Los permisos (`permissions/{id}`) llevan dos banderas de aviso:
 *  - `notified_admin` (false = el Admin/Supervisor aún no ha visto una solicitud PENDIENTE).
 *  - `notified` (false = el Gestor aún no ha visto la RESPUESTA a su solicitud, ya no pendiente).
 *
 * Este módulo solo construye el objeto de actualizaciones multi-ruta; el acceso a Firebase vive en
 * `services/firebase/firebase-notifications-repository.js`.
 */

/** Estado de un permiso que aún espera respuesta. */
export const PERMISSION_PENDING_STATUS = 'Pendiente';

/**
 * ¿El rol lee las notificaciones de TODAS las solicitudes (Admin/Supervisor)? (app.js 4863)
 *
 * @param {{role?: string}|null|undefined} user
 * @returns {boolean}
 */
export function isAdminNotificationScope(user) {
    return Boolean(user && (user.role === 'Admin' || user.role === 'Supervisor'));
}

/**
 * Actualizaciones para Admin/Supervisor: cada permiso pendiente con `notified_admin === false` pasa a true.
 *
 * @param {Record<string, {notified_admin?: boolean, status?: string}>|null|undefined} permissions
 * @returns {Record<string, boolean>}
 */
export function buildAdminReadUpdates(permissions) {
    const updates = {};
    const data = permissions || {};

    for (const key in data) {
        if (data[key].notified_admin === false && data[key].status === PERMISSION_PENDING_STATUS) {
            updates[key + '/notified_admin'] = true;
        }
    }

    return updates;
}

/**
 * Actualizaciones para el Gestor: cada permiso suyo ya respondido con `notified === false` pasa a true.
 *
 * @param {Record<string, {notified?: boolean, status?: string}>|null|undefined} permissions
 * @returns {Record<string, boolean>}
 */
export function buildGestorReadUpdates(permissions) {
    const updates = {};
    const data = permissions || {};

    for (const key in data) {
        if (data[key].notified === false && data[key].status !== PERMISSION_PENDING_STATUS) {
            updates[key + '/notified'] = true;
        }
    }

    return updates;
}
