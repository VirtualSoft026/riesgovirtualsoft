/**
 * Vista del modal "Detalle de Tareas" de KPIs: cabecera por tipo y HTML de la lista.
 * Extraído de `openKpiTaskDetails()` (app.js 6419-6473). Solo construye texto/HTML; abrir y cerrar el
 * modal (clases CSS, ids del DOM) lo hace `controllers/kpi-controller.js`.
 */

import { escapeHTML } from '../../utils/sanitization.js';

const HEADERS = Object.freeze({
    finalizadas: Object.freeze({ title: 'Tareas Finalizadas', iconClass: 'bx bx-check-double', iconColor: 'var(--success)' }),
    no_realizadas: Object.freeze({ title: 'Tareas No Realizadas', iconClass: 'bx bx-x-circle', iconColor: 'var(--danger)' }),
    pendientes: Object.freeze({ title: 'Tareas Pendientes', iconClass: 'bx bx-time', iconColor: 'var(--warning)' })
});

/** Mensaje cuando no hay tareas en el estado elegido (app.js 6449). */
export const KPI_TASKS_EMPTY_HTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No hay tareas en este estado.</div>';

/**
 * Título e icono del modal según el tipo. Un tipo desconocido devuelve null: el original no toca la cabecera.
 *
 * @param {string} tipo 'finalizadas' | 'no_realizadas' | 'pendientes'
 * @returns {{title: string, iconClass: string, iconColor: string}|null}
 */
export function getKpiTaskDetailsHeader(tipo) {
    return Object.prototype.hasOwnProperty.call(HEADERS, tipo) ? HEADERS[tipo] : null;
}

/**
 * Tarjeta HTML de una tarea (app.js 6452-6471). `t.type === 'adicional'` se muestra en ámbar con la etiqueta
 * "Adicional"; cualquier otro tipo se muestra como "Set".
 *
 * @param {{name: string, date: string, type?: string, observation: string}} t
 * @returns {string}
 */
export function buildKpiTaskCardHtml(t) {
    const tTypeColor = t.type === 'adicional' ? 'var(--warning)' : 'var(--accent-primary)';
    const tTypeBadge = `<span style="font-size: 10px; background: ${tTypeColor}20; color: ${tTypeColor}; padding: 2px 6px; border-radius: 10px; margin-left: 8px;">${t.type === 'adicional' ? 'Adicional' : 'Set'}</span>`;

    return `
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); padding: 10px 15px; border-radius: var(--radius-sm); display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 13px; color: var(--text-primary); font-weight: 500;">
                            ${escapeHTML(t.name)}
                            ${tTypeBadge}
                        </div>
                        <div style="font-size: 11px; color: var(--text-secondary);">
                            <i class='bx bx-calendar'></i> ${escapeHTML(t.date)}
                        </div>
                    </div>
                    <div style="font-size: 11px; color: var(--text-secondary); background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 4px; border-left: 2px solid ${tTypeColor};">
                        <strong>Nota:</strong> ${escapeHTML(t.observation)}
                    </div>
                </div>
            `;
}

/** HTML de toda la lista (vacía => mensaje; si no, las tarjetas concatenadas en orden). */
export function buildKpiTaskListHtml(tasks) {
    if (!tasks || tasks.length === 0) return KPI_TASKS_EMPTY_HTML;
    return tasks.map(buildKpiTaskCardHtml).join('');
}
