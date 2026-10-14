/**
 * Repositorio de cierre de turno sobre Firebase Realtime Database.
 *
 * Puerto 1:1 de `persistShiftClosureCore()` (app.js 3586-3600). La función
 * original usa los globales `database` y `firebase.database.ServerValue`;
 * aquí se inyectan para poder probarla sin Firebase real.
 *
 * Garantía que se conserva: una sola escritura multi-ruta atómica
 * (`database.ref().update(...)`) que guarda el reporte, borra la sesión activa
 * y marca `logoutTime`. Si falla, no se escribe nada.
 *
 * @param {{
 *   database: {ref: (path?: string) => any},
 *   serverTimestamp: unknown
 * }} deps `serverTimestamp` es `firebase.database.ServerValue.TIMESTAMP`.
 * @returns {{persistShiftClosureCore: (reportUid: string, loginLogId: string, shiftReportObject: object) => Promise<string>}}
 */
export function createShiftRepository({ database, serverTimestamp }) {
    async function persistShiftClosureCore(reportUid, loginLogId, shiftReportObject) {
        if (!reportUid) throw new Error('Missing authenticated UID for shift closure');
        if (!loginLogId) throw new Error('Missing login log ID for shift closure');

        const reportRef = database.ref('shift_reports').push();
        if (!reportRef.key) throw new Error('Unable to allocate shift report ID');

        const updates = {};
        updates[`shift_reports/${reportRef.key}`] = shiftReportObject;
        updates[`active_sessions/${reportUid}`] = null;
        updates[`login_logs/${loginLogId}/logoutTime`] = serverTimestamp;

        await database.ref().update(updates);
        return reportRef.key;
    }

    return { persistShiftClosureCore };
}
