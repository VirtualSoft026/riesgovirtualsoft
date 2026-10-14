/**
 * Acceso a Firebase del panel de Monitoreo (app.js 5162-5173 y 5640-5666).
 * La base (`database`) se INYECTA.
 */

import { DB_ROOTS } from '../../config/routes.js';
import { SUPERVISOR_ROLES } from '../../domain/schedules/supervisor-directory.js';

/**
 * Nombres de los Gestores aprobados, sin repetir y ordenados (app.js 5648-5655).
 *
 * @param {Record<string, {role?: string, approved?: boolean, name?: string}>|null|undefined} users
 * @returns {string[]}
 */
export function extractApprovedGestorNames(users) {
    if (!users) return [];

    const gestores = Object.keys(users)
        .map((k) => users[k])
        .filter((u) => u && u.role === 'Gestor' && u.approved === true)
        .map((u) => u.name.trim())
        .sort((a, b) => a.localeCompare(b));

    return [...new Set(gestores)];
}

/**
 * @param {{database: {ref: (path?: string) => any}}} deps
 */
export function createMonitoringRepository({ database }) {
    /**
     * Escucha `active_sessions` en tiempo real. `onSessions` recibe el objeto de sesiones (o `{}` si no hay).
     *
     * @param {(sessions: Record<string, object>) => void} onSessions
     * @param {(error: unknown) => void} [onError]
     * @returns {() => void} función para dejar de escuchar
     */
    function listenActiveSessions(onSessions, onError = () => {}) {
        const ref = database.ref(DB_ROOTS.ACTIVE_SESSIONS);
        const handler = (snapshot) => {
            onSessions(snapshot.exists() ? snapshot.val() : {});
        };

        ref.on('value', handler, onError);

        return () => ref.off('value', handler);
    }

    /**
     * Nombres de Gestores aprobados (una sola lectura de `users`).
     *
     * @returns {Promise<string[]>}
     */
    async function fetchApprovedGestorNames() {
        const snapshot = await database.ref(DB_ROOTS.USERS).once('value');

        return snapshot.exists() ? extractApprovedGestorNames(snapshot.val()) : [];
    }

    /**
     * Usuarios con rol de supervisor (decisión D9b): una consulta por rol exacto (`orderByChild('role').equalTo(rol)`,
     * con el índice `.indexOn: ["role", ...]` que ya declara `database.rules.json`), sin descargar todo `users`.
     * Requiere permiso de lectura de `users` (solo Admin/Supervisor, que son quienes ven Monitoreo).
     *
     * @returns {Promise<Record<string, object>>} uid -> usuario (solo Supervisor/Admin)
     */
    async function fetchSupervisorUsers() {
        const merged = {};
        for (const role of SUPERVISOR_ROLES) {
            const snapshot = await database.ref(DB_ROOTS.USERS).orderByChild('role').equalTo(role).once('value');
            if (snapshot && snapshot.exists()) Object.assign(merged, snapshot.val());
        }
        return merged;
    }

    return { listenActiveSessions, fetchApprovedGestorNames, fetchSupervisorUsers };
}
