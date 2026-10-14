/**
 * Vista "Novedades, Incidentes y Soportes": HTML de la tabla `#incidentsTableBody` (app.js 8777-8815).
 *
 * Seguridad: igual que `app.js`, tipo, título, detalle, responsable y reportante se escapan con
 * `escapeHTML`; la fecha y el estado salen de valores controlados. El `escapeHTML` puede inyectarse
 * (`helpers`) para usar el de `app.js`.
 */

import { escapeHTML } from '../../utils/sanitization.js';

export const EMPTY_INCIDENTS_HTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-secondary);">No hay novedades ni incidentes registrados.</td></tr>';

/**
 * Fecha corta de la novedad (`toLocaleString([], {dateStyle:'short', timeStyle:'short'})`), o 'N/A'.
 *
 * @param {number|string|undefined} timestamp
 * @returns {string}
 */
export function formatIncidentDate(timestamp) {
    return timestamp ? new Date(timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';
}

/**
 * Contenido completo de `#incidentsTableBody` (o el mensaje de lista vacía).
 *
 * @param {Array<object>|null|undefined} incidents
 * @param {{escapeHTML?: (value: unknown) => string}} [helpers]
 * @returns {string}
 */
export function buildIncidentsTableHtml(incidents, helpers) {
    const esc = (helpers && helpers.escapeHTML) || escapeHTML;

    if (!incidents || incidents.length === 0) {
        return EMPTY_INCIDENTS_HTML;
    }

    let html = '';
    incidents.forEach((inc) => {
        const dateStr = formatIncidentDate(inc.timestamp);
        const typeBadge = `<span class="badge pending" style="font-size: 10px;">${esc(inc.type || 'Soporte')}</span>`;
        const statusBadge = inc.status === 'Cerrado'
            ? `<span class="badge status-completed" style="font-size: 10px; background: var(--success); color: white;">Cerrado</span>`
            : `<span class="badge in-progress" style="font-size: 10px; background: var(--warning); color: white;">Abierto</span>`;

        html += `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 10px; font-size: 12px; color: var(--text-secondary);">${dateStr}</td>
                <td style="padding: 10px;">${typeBadge}</td>
                <td style="padding: 10px;">
                    <div style="font-weight: 600; color: var(--text-primary); font-size: 13px;">${esc(inc.title || '')}</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${esc(inc.detail || '')}</div>
                    ${inc.assignedTo ? `<div style="font-size: 10px; color: var(--accent-primary); margin-top: 2px;">Resp: ${esc(inc.assignedTo)}</div>` : ''}
                </td>
                <td style="padding: 10px; font-size: 12px; color: var(--text-primary);">${esc(inc.reportedBy || 'Anónimo')}</td>
                <td style="padding: 10px; text-align: center;">${statusBadge}</td>
            </tr>
        `;
    });

    return html;
}
