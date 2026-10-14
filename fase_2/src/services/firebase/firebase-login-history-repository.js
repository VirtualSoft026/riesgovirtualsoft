/**
 * Lecturas de Firebase del historial de accesos (app.js 8416-8418): `active_sessions`, `shift_reports` y
 * `login_history`, EN ESE ORDEN y de forma secuencial (como el original). La base se INYECTA.
 *
 * Reglas (`database.rules.json`, solo lectura): los tres nodos los leen solo Admin y Supervisor aprobados.
 *
 * @param {{database: {ref: (path: string) => any}}} deps
 */
export function createLoginHistoryRepository({ database }) {
    return {
        /**
         * @returns {Promise<{active: object, reports: object, logs: object}>} snapshots sin tocar
         */
        async fetchSources() {
            const active = await database.ref('active_sessions').once('value');
            const reports = await database.ref('shift_reports').once('value');
            const logs = await database.ref('login_history').once('value');

            return { active, reports, logs };
        }
    };
}
