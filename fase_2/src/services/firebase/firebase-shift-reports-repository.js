/**
 * Lectura de reportes de turno (`shift_reports`) para el historial (app.js 4451-4460 y 4582-4600).
 * La base se INYECTA. Solo lectura: la escritura del cierre vive en `firebase-shift-repository.js`.
 */

import { DB_ROOTS } from '../../config/routes.js';

/**
 * @param {{database: {ref: (path?: string) => any}}} deps
 */
export function createShiftReportsRepository({ database }) {
    /**
     * Todos los reportes como lista, cada uno con su clave en `fb_id` (app.js 4594-4600).
     *
     * @returns {Promise<Array<object>>}
     */
    async function fetchAllShiftReports() {
        const snapshot = await database.ref(DB_ROOTS.SHIFT_REPORTS).once('value');

        if (!snapshot.exists()) return [];

        const data = snapshot.val();

        return Object.keys(data).map((k) => ({ ...data[k], fb_id: k }));
    }

    /**
     * Un reporte por id (app.js 4454-4457). Devuelve el valor tal cual, SIN `fb_id` (como el original).
     *
     * @param {string} fbId
     * @returns {Promise<object|null>}
     */
    async function fetchShiftReportById(fbId) {
        const snapshot = await database.ref(DB_ROOTS.SHIFT_REPORTS + '/' + fbId).once('value');

        return snapshot.exists() ? snapshot.val() : null;
    }

    return { fetchAllShiftReports, fetchShiftReportById };
}
