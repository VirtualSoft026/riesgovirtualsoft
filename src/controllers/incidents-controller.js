/**
 * Controlador de novedades e incidentes (app.js 8724-8815): envío del formulario, suscripción en vivo a
 * `logs` y pintado de la tabla. Todo por inyección (`document`, `alert`, `repository`, `getUser`,
 * `getAuthUser`, `now`, `logger`); la lógica pura está en `domain/incidents/incident-service.js` y el HTML en
 * `ui/views/incidents-view.js`.
 *
 * @param {{
 *   repository: ReturnType<typeof import('../services/firebase/firebase-incident-repository.js').createIncidentRepository>,
 *   document: {getElementById: (id: string) => any},
 *   getUser: () => (object|null|undefined),
 *   getAuthUser?: () => ({uid?: string}|null|undefined),
 *   now?: () => number,
 *   alert?: (message: string) => void,
 *   logger?: {error: Function},
 *   helpers?: {escapeHTML?: Function}
 * }} deps
 */

import { INCIDENT_MESSAGES, buildIncidentPayload, parseIncidentForm } from '../domain/incidents/incident-service.js';
import { buildIncidentsTableHtml } from '../ui/views/incidents-view.js';

export function createIncidentsController(deps) {
    const {
        repository,
        document: doc,
        getUser,
        getAuthUser = () => null,
        now = Date.now,
        alert: notify = () => {},
        logger = console,
        helpers
    } = deps;

    /** Pinta la tabla de novedades. */
    function renderTable(incidents) {
        const tbody = doc.getElementById('incidentsTableBody');
        if (!tbody) return;

        tbody.innerHTML = buildIncidentsTableHtml(incidents, helpers);
    }

    /** Manejador del envío del formulario (`data-action="submit-new-incident"`). */
    async function handleSubmit(event) {
        event.preventDefault();
        const user = getUser();

        if (!user) {
            notify(INCIDENT_MESSAGES.LOGIN_REQUIRED);
            return;
        }

        const form = parseIncidentForm({
            type: doc.getElementById('incidentType')?.value,
            title: doc.getElementById('incidentTitle')?.value,
            assignee: doc.getElementById('incidentAssignee')?.value,
            detail: doc.getElementById('incidentDetail')?.value
        }, user);

        if (!form.ok) {
            notify(INCIDENT_MESSAGES.MISSING_FIELDS);
            return;
        }

        try {
            await repository.create(buildIncidentPayload({
                type: form.type,
                title: form.title,
                assignee: form.assignee,
                detail: form.detail,
                currentUser: user,
                uid: user.uid || getAuthUser().uid,
                now: now()
            }));

            const formEl = doc.getElementById('incidentForm');
            if (formEl) formEl.reset();
            notify(INCIDENT_MESSAGES.REGISTERED);
        } catch (err) {
            logger.error('Error registrando novedad en /logs:', err);
            notify(INCIDENT_MESSAGES.REGISTER_ERROR);
        }
    }

    /** Escucha en vivo las últimas 50 novedades y repinta la tabla. Devuelve la función de cancelación. */
    function startListener(onError) {
        return repository.subscribeRecent((incidents) => renderTable(incidents), onError);
    }

    return { handleSubmit, startListener, renderTable };
}
