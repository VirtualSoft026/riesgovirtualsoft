/**
 * Repositorio de comunicados sobre Firebase Realtime Database (nodo `announcements` y lectura de `users`).
 *
 * Puerto 1:1 de los accesos a Firebase del módulo de comunicados de `app.js` (6559-6575, 6603-6613,
 * 6692-6703, 6944, 6983). La base se INYECTA (`database`), así se prueba con una base simulada.
 *
 * Reglas de `database.rules.json` que este repositorio respeta (solo lectura, no se modifican):
 *  - `announcements` se lee con cualquier usuario aprobado.
 *  - `announcements/$id` lo escribe un Admin, o un Supervisor SOLO para crear (sin `readBy`, con
 *    title/content/date/author/authorUid como cadenas y `authorUid === auth.uid`).
 *  - `announcements/$id/readBy/$uid` solo lo escribe el propio usuario y SOLO UNA VEZ
 *    (`!data.exists()`): un segundo `set` del mismo lector lo rechaza la base (ver hallazgo en el informe).
 *  - `users` solo lo leen Admin y Supervisor.
 *
 * @param {{database: {ref: (path: string) => any}}} deps
 */
export function createAnnouncementRepository({ database }) {
    return {
        /**
         * Suscripción en vivo a todos los comunicados.
         *
         * @param {(announcements: Record<string, object>) => void} onChange recibe `snapshot.val() || {}`
         * @param {(error: unknown) => void} [onError] opcional; `app.js` hoy no pasa ninguno
         * @returns {() => void} función para cancelar la suscripción
         */
        subscribe(onChange, onError) {
            const ref = database.ref('announcements');
            const handler = (snapshot) => onChange(snapshot.val() || {});

            if (onError) {
                ref.on('value', handler, onError);
            } else {
                ref.on('value', handler);
            }

            return () => {
                if (typeof ref.off === 'function') ref.off('value', handler);
            };
        },

        /** Crea un comunicado con clave nueva (`push` + `set`). Devuelve la clave. */
        async publish(payload) {
            const newRef = database.ref('announcements').push();
            await newRef.set(payload);

            return newRef.key;
        },

        /** Marca `announcements/{id}/readBy/{uid}` con el recibo de lectura. */
        async markAsRead(id, uid, receipt) {
            await database.ref(`announcements/${id}/readBy/${uid}`).set(receipt);
        },

        /** Elimina un comunicado completo. */
        async remove(id) {
            await database.ref('announcements/' + id).remove();
        },

        /** Lee el nodo `users` una vez (Admin/Supervisor). Devuelve el snapshot sin tocarlo. */
        fetchUsersSnapshot() {
            return database.ref('users').once('value');
        }
    };
}
