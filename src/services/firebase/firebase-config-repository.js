/**
 * Repositorio de la configuración de gestores sobre Firebase Realtime Database
 * (app.js 6762 y 6825): lectura del nodo `users` y escritura de `users/{uid}/hasSplitShift`.
 *
 * Reglas (`database.rules.json`, solo lectura): `users` solo lo leen Admin y Supervisor; el flag solo lo
 * escribe un Admin aprobado (ver `domain/users/gestor-config.js`, `canWriteHasSplitShift`).
 *
 * @param {{database: {ref: (path: string) => any}}} deps
 */
export function createConfigRepository({ database }) {
    return {
        /** Lee el nodo `users` una vez. Devuelve el snapshot sin tocarlo. */
        fetchUsersSnapshot() {
            return database.ref('users').once('value');
        },

        /** Escribe el flag de Pausa de Turno de un usuario. Devuelve la promesa de la escritura. */
        setHasSplitShift(uid, value) {
            return database.ref('users/' + uid + '/hasSplitShift').set(value);
        }
    };
}
