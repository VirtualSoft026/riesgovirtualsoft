/**
 * Lecturas de Firebase Realtime Database que usan los KPIs y el Control Operativo.
 * La base se inyecta (`database.ref(path).once('value')`), igual que en `firebase-shift-repository.js`.
 *
 * Origen en app.js: `database.ref('users').once('value')` (5726, 7300) y
 * `database.ref('shift_reports').once('value')` (7313, y 5806 en `calcularIndicadores`).
 */

export const KPI_USERS_PATH = 'users';
export const KPI_SHIFT_REPORTS_PATH = 'shift_reports';

async function readNode(database, path) {
    const snapshot = await database.ref(path).once('value');
    return snapshot && snapshot.exists() ? snapshot.val() : null;
}

/** @returns {Promise<object|null>} Nodo `users` (uid -> usuario) o null si no existe. */
export function readUsers(database) {
    return readNode(database, KPI_USERS_PATH);
}

/** @returns {Promise<object|null>} Nodo `shift_reports` (id -> reporte) o null si no existe. */
export function readShiftReports(database) {
    return readNode(database, KPI_SHIFT_REPORTS_PATH);
}
