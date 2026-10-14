/**
 * Novedades, comentarios e incidentes (nodo Firebase `logs`; app.js 8718-8776, "4. Módulo de Novedades,
 * Comentarios e Incidentes (/logs)"). Carpeta propia `domain/incidents/` (decisión de taxonomía del
 * 2026-10-03, plan maestro §3 punto 4).
 *
 * Todo PURO: sin DOM, sin Firebase, sin `Date.now()` implícito (la hora llega por parámetro). Los efectos
 * viven en `controllers/incidents-controller.js` y `services/firebase/firebase-incident-repository.js`; el
 * HTML de la tabla en `ui/views/incidents-view.js`.
 *
 * Reglas de `database.rules.json` (solo lectura) relevantes: `logs` lo leen solo Admin y Supervisor;
 * cualquier usuario aprobado puede CREAR una entrada propia (`!data.exists()` y `newData.uid === auth.uid`);
 * nadie puede modificarla después (no hay regla de actualización para gestores).
 */

export const INCIDENT_DEFAULT_TYPE = 'Novedad Operativa';
export const INCIDENT_STATUS_OPEN = 'Abierto';
export const INCIDENT_STATUS_CLOSED = 'Cerrado';

/** Máximo de novedades que se muestran/escuchan (`limitToLast(50)`, app.js 8766). */
export const INCIDENTS_LIMIT = 50;

/** Textos visibles que `app.js` muestra con `alert()` (se conservan). */
export const INCIDENT_MESSAGES = Object.freeze({
    LOGIN_REQUIRED: 'Debes iniciar sesión para registrar una novedad.',
    MISSING_FIELDS: 'Por favor completa el título y el detalle de la novedad.',
    REGISTERED: '¡Novedad/Incidente registrada exitosamente!',
    REGISTER_ERROR: 'Ocurrió un error al registrar la novedad.'
});

/**
 * Interpreta el formulario (app.js 8730-8733). Los valores llegan crudos del DOM (o `undefined` si el campo
 * no existe en la página): tipo por omisión "Novedad Operativa"; título y detalle recortados; responsable
 * recortado y, si queda vacío, el nombre del usuario.
 *
 * @param {{type?: string, title?: string, assignee?: string, detail?: string}} raw
 * @param {{name?: string}} currentUser
 * @returns {{ok: boolean, type: string, title: (string|undefined), assignee: (string|undefined), detail: (string|undefined)}}
 */
export function parseIncidentForm(raw, currentUser) {
    const type = raw.type || INCIDENT_DEFAULT_TYPE;
    const title = raw.title?.trim();
    const assignee = raw.assignee?.trim() || currentUser.name;
    const detail = raw.detail?.trim();

    return { ok: Boolean(title && detail), type, title, assignee, detail };
}

/**
 * Documento a escribir en `logs/{id}` (app.js 8745-8756). `reportedBy` toma el nombre del usuario tal cual
 * (si falta, el SDK de Firebase rechaza `undefined`, igual que hoy).
 *
 * @param {{
 *   type: string, title: string, assignee: string, detail: string,
 *   currentUser: {name?: string, email?: string},
 *   uid: string,
 *   now: number
 * }} args
 * @returns {object}
 */
export function buildIncidentPayload({ type, title, assignee, detail, currentUser, uid, now }) {
    return {
        uid,
        type,
        title,
        assignedTo: assignee,
        detail,
        reportedBy: currentUser.name,
        reportedByEmail: currentUser.email || '',
        timestamp: now,
        status: INCIDENT_STATUS_OPEN
    };
}

/**
 * Convierte el snapshot de `logs` (ordenado por `timestamp`, últimos 50) en una lista de la más reciente a
 * la más antigua, cada una con su `id` (app.js 8766-8773).
 *
 * @param {{exists: () => boolean, forEach: (cb: (child: {key: string, val: () => object}) => unknown) => unknown}} snapshot
 * @returns {Array<object>}
 */
export function snapshotToIncidents(snapshot) {
    const incidents = [];

    if (snapshot.exists()) {
        snapshot.forEach((childSnap) => {
            incidents.unshift({ id: childSnap.key, ...childSnap.val() });
        });
    }

    return incidents;
}
