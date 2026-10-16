/**
 * Normalizador del oráculo ORIGINAL para la migración de manejadores en línea (paso 3.4, W-54 b y DE-5 = a).
 *
 * Los originales (app.js y las copias congeladas) marcan los botones con `onclick="fn(...)"`, `onchange`, `oninput`,
 * `onsubmit`, `onmouseover` y `onmouseout`. La versión nueva usa `data-action` más `data-*` (src/ui/actions/). Las pruebas
 * diferenciales comparan el HTML byte a byte: este módulo reescribe SOLO esos atributos del lado original, con la misma
 * correspondencia que aplicó la migración, para que la comparación siga siendo exacta en todo lo demás. La conducta de
 * cada acción se prueba aparte (src/tests/ui/action-registry.test.mjs).
 *
 * La correspondencia es la de src/ui/actions/action-registry.js y la de los atributos del HTML generado. Cualquier
 * `on*` no contemplado queda sin tocar y la prueba que lo compara falla: nunca se normaliza en silencio.
 */
import { escapeHTML } from '../../utils/sanitization.js';

/** Llamadas con argumento codificado (`fn(decodeURIComponent('…'))`): función → [acción, atributo de datos]. */
const ENCODED_CALLS = Object.freeze({
    approveUser: ['approve-user', 'user-id'],
    revertRejectedUser: ['revert-rejected-user', 'user-id'],
    showUserRejectBox: ['show-user-reject-box', 'user-id'],
    confirmRejectUser: ['confirm-reject-user', 'user-id'],
    cancelRejectUser: ['cancel-reject-user', 'user-id'],
    showPermApproveBox: ['show-perm-approve-box', 'fb-id'],
    showPermRejectBox: ['show-perm-reject-box', 'fb-id'],
    confirmApprovePerm: ['confirm-approve-perm', 'fb-id'],
    cancelApprovePerm: ['cancel-approve-perm', 'fb-id'],
    confirmRejectPerm: ['confirm-reject-perm', 'fb-id'],
    cancelRejectPerm: ['cancel-reject-perm', 'fb-id'],
    openPermisoDetailModal: ['open-permiso-detail-modal', 'fb-id'],
    openShiftDetailModal: ['open-shift-detail-modal', 'fb-id'],
    exportShiftReport: ['export-shift-report', 'fb-id'],
    markComunicadoAsRead: ['mark-comunicado-read', 'key'],
    deleteComunicado: ['delete-comunicado', 'key'],
    viewComunicadoContent: ['view-comunicado-content', 'key'],
    viewComunicadoLecturas: ['view-comunicado-lecturas', 'key'],
    openMonitoreoDetails: ['open-monitoreo-details', 'uid'],
    viewTimelineInMonitoreo: ['view-timeline-monitoreo', 'uid'],
});

/** Llamadas con argumento literal (`fn('x')`): función → [acción, atributo de datos]. */
const LITERAL_CALLS = Object.freeze({
    closeModal: ['close-modal', 'modal'],
    openKpiTaskDetails: ['open-kpi-task-details', 'kind'],
});

/** Llamadas sin argumentos: función → acción. */
const NO_ARG_CALLS = Object.freeze({
    toggleBreakfastBreak: 'toggle-breakfast-break',
    toggleLunchBreak: 'toggle-lunch-break',
    toggleSplitShiftBreak: 'toggle-split-shift-break',
    handleEndShift: 'end-shift',
    requestIdlePermissionManual: 'request-idle-permission',
    toggleNotifications: 'toggle-notifications',
    openProfileModal: 'open-profile-modal',
    renderAssignedTasksFilter: 'render-assigned-tasks-filter',
    openExtraTaskModal: 'open-extra-task-modal',
    openExceptionModal: 'open-exception-modal',
    renderPendingUsers: 'render-pending-users',
    openLoginHistoryModal: 'open-login-history-modal',
    renderControlOperativoFiltered: 'render-control-operativo',
    generarAnalisisTextual: 'generar-analisis-textual',
    loadControlOperativoData: 'load-control-operativo',
    generarReporteEjecutivoPDF: 'generar-reporte-ejecutivo-pdf',
    openNewComunicadoModal: 'open-new-comunicado-modal',
    saveExtraTask: 'save-extra-task',
    saveNewComunicado: 'save-new-comunicado',
    confirmException: 'confirm-exception',
    changePassword: 'change-password',
    filterLoginHistoryTable: 'filter-login-history',
    markAllAsRead: 'mark-all-as-read',
    closeKpiTaskDetails: 'close-kpi-task-details',
    loadSchedule: 'load-schedule',
    loadTeletrabajo: 'load-teletrabajo',
});

const ENCODED_RE = /\bon(click|change|input|submit)=(["'])(\w+)\(decodeURIComponent\('([^']*)'\)(, this\.checked|, event)?\)\2/g;
const LITERAL_RE = /\bon(click|change|input|submit)=(["'])(\w+)\('([^']*)'\)\2/g;
const NO_ARG_RE = /\bon(click|change|input|submit)=(["'])(\w+)\(\)\2/g;
const TOGGLE_LITERAL_RE = /\bonchange="toggleGestorSplitShift\('([^']*)', this\.checked\)"/g;
const HOVER_RE = /\s+onmouse(over|out)="[^"]*"/g;
const HOVER_LINK_STYLE_RE = /style="color: var\(--accent-primary\); text-decoration: none; cursor: pointer; transition: color 0\.2s;"(\s+onmouseover="this\.style\.textDecoration)/g;
const NAV_RE = /\bonclick="document\.getElementById\('(\w+)'\)\.click\(\); document\.getElementById\('notificationDropdown'\)\.style\.display = 'none';"/g;
const MULTISELECT_RE = /\s+onclick="toggleMultiSelectDropdown\('[^']*'\)"/g;

/**
 * Reescribe los manejadores en línea del HTML original a la forma delegada del código nuevo.
 *
 * Modo estricto (por defecto): cualquier manejador de la aplicación sin correspondencia lanza un error, para que una
 * función migrada nueva no pase en silencio. Modo no estricto (`{ strict: false }`): los manejadores sin
 * correspondencia se dejan tal cual; sirve para comparar trazas que incluyen contenido del usuario (HTML de los
 * comunicados), que puede llevar cualquier `onclick` y debe ser igual en ambos lados.
 *
 * @param {string} text HTML original
 * @param {{strict?: boolean}} [options]
 * @returns {string} HTML con los atributos en su forma delegada
 */
export function legacyActionsToDelegated(text, { strict = true } = {}) {
    if (typeof text !== 'string') return text;

    return text
        .replace(ENCODED_RE, (m, _ev, _q, fn, encoded, extra) => {
            if (fn === 'selectTask') return `data-action="select-task" data-task-id="${escapeHTML(decodeURIComponent(encoded))}"`;
            if (fn === 'toggleGestorSplitShift') {
                return `data-action="toggle-gestor-split-shift" data-uid="${escapeHTML(decodeURIComponent(encoded))}"`;
            }
            const spec = ENCODED_CALLS[fn];
            if (!spec || extra) {
                if (!strict) return m;
                throw new Error(extra ? `argumento extra no contemplado en ${fn}` : `manejador original sin correspondencia: ${fn}`);
            }
            return `data-action="${spec[0]}" data-${spec[1]}="${escapeHTML(decodeURIComponent(encoded))}"`;
        })
        .replace(LITERAL_RE, (m, _ev, _q, fn, arg) => {
            const spec = LITERAL_CALLS[fn];
            if (!spec) {
                if (!strict) return m;
                throw new Error(`manejador literal sin correspondencia: ${fn}`);
            }
            return `data-action="${spec[0]}" data-${spec[1]}="${arg}"`;
        })
        .replace(NO_ARG_RE, (m, _ev, _q, fn) => {
            const action = NO_ARG_CALLS[fn];
            if (!action) {
                if (!strict) return m;
                throw new Error(`manejador sin argumentos sin correspondencia: ${fn}`);
            }
            return `data-action="${action}"`;
        })
        .replace(TOGGLE_LITERAL_RE, (_m, uid) => `data-action="toggle-gestor-split-shift" data-uid="${escapeHTML(uid)}"`)
        .replace(NAV_RE, (_m, nav) => `data-action="go-to-notification-nav" data-nav="${nav}"`)
        .replace(MULTISELECT_RE, '')
        .replace(HOVER_LINK_STYLE_RE, 'class="comunicado-title-link"$1')
        .replace(HOVER_RE, '');
}

/**
 * Aplica el normalizador a cada cadena de un valor (cadena, arreglo u objeto anidado).
 *
 * @param {unknown} value
 * @param {{strict?: boolean}} [options] ver legacyActionsToDelegated
 * @returns {unknown}
 */
export function normalizeLegacyActions(value, options = {}) {
    if (typeof value === 'string') return legacyActionsToDelegated(value, options);
    if (Array.isArray(value)) return value.map((x) => normalizeLegacyActions(x, options));
    if (value && typeof value === 'object') {
        const out = {};
        for (const key of Object.keys(value)) out[key] = normalizeLegacyActions(value[key], options);
        return out;
    }
    return value;
}
