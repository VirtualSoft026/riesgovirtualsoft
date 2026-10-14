/**
 * Controlador de notificaciones: abrir/cerrar el desplegable y marcar todas como leídas.
 *
 * Reemplaza, de `app.js`: `toggleNotifications()` (4849) y `markAllAsRead()` (4860). El acceso a Firebase vive
 * en `services/firebase/firebase-notifications-repository.js` y las reglas en `domain/auth/notification-rules.js`.
 *
 * @param {{
 *   document: any,
 *   getUser: () => (object|null),
 *   repository: {markAllAsRead: (user: object|null) => Promise<{updated: number}>},
 *   logger?: {error: Function}
 * }} deps
 */
export function createNotificationsController({ document, getUser, repository, logger = console }) {
    /** app.js 4849-4858 */
    function toggleNotifications() {
        const drop = document.getElementById('notificationDropdown');
        if (drop) {
            if (drop.style.display === 'none' || drop.style.display === '') {
                drop.style.display = 'block';
            } else {
                drop.style.display = 'none';
            }
        }
    }

    /** app.js 4860-4896 */
    async function markAllAsRead() {
        const user = getUser();
        if (!user) return;

        try {
            await repository.markAllAsRead(user);
        } catch (e) {
            logger.error(e);
        }
    }

    return { toggleNotifications, markAllAsRead };
}
