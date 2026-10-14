/**
 * Acceso a Firebase para "marcar todas las notificaciones como leídas" (markAllAsRead, app.js 4860-4896).
 *
 * La base (`database`) y la resolución del uid de Auth se INYECTAN: no hay globales aquí. Las reglas de qué
 * permisos se actualizan viven en `domain/auth/notification-rules.js`.
 *
 * Rutas: lee `permissions` (Admin/Supervisor) o `permissions` filtrado por `uid` (Gestor) y escribe un único
 * `update` con las rutas `<id>/notified_admin` o `<id>/notified`.
 */

import { DB_ROOTS } from '../../config/routes.js';
import {
    isAdminNotificationScope,
    buildAdminReadUpdates,
    buildGestorReadUpdates
} from '../../domain/auth/notification-rules.js';

/**
 * @param {{
 *   database: {ref: (path?: string) => any},
 *   getAuthUid?: () => (string|null|undefined)
 * }} deps `getAuthUid` devuelve el uid de Firebase Auth (equivale a `firebase.auth().currentUser.uid`).
 * @returns {{markAllAsRead: (user: object|null) => Promise<{updated: number}>}}
 */
export function createNotificationsRepository({ database, getAuthUid = () => null }) {
    /**
     * @param {{role?: string, uid?: string}|null} user
     * @returns {Promise<{updated: number}>} cantidad de rutas actualizadas (0 si no había nada o no hay usuario/uid)
     */
    async function markAllAsRead(user) {
        if (!user) return { updated: 0 };

        const permissionsRef = database.ref(DB_ROOTS.PERMISSIONS);

        if (isAdminNotificationScope(user)) {
            const snapshot = await permissionsRef.once('value');

            if (!snapshot.exists()) return { updated: 0 };

            const updates = buildAdminReadUpdates(snapshot.val());

            if (Object.keys(updates).length > 0) await permissionsRef.update(updates);

            return { updated: Object.keys(updates).length };
        }

        const authUid = user.uid || getAuthUid();

        if (!authUid) return { updated: 0 };

        const snapshot = await database.ref(DB_ROOTS.PERMISSIONS).orderByChild('uid').equalTo(authUid).once('value');

        if (!snapshot.exists()) return { updated: 0 };

        const updates = buildGestorReadUpdates(snapshot.val());

        if (Object.keys(updates).length > 0) await database.ref(DB_ROOTS.PERMISSIONS).update(updates);

        return { updated: Object.keys(updates).length };
    }

    return { markAllAsRead };
}
