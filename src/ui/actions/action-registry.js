/**
 * Registro de acciones de la interfaz (paso 3.4, W-54 b y DE-5 = a): sustituye los atributos `onclick`, `onchange`,
 * `oninput` y `onsubmit` de index.html y del HTML generado en JS por `data-action` más `data-*` con los datos.
 *
 * Un listener por tipo de evento en el documento busca el elemento más cercano con `data-action`, busca el nombre en
 * ACTION_TABLE y ejecuta la entrada. Cada entrada llama a la misma función global, con los mismos argumentos, que
 * llamaba el atributo original (el elemento hace de `this`; `event` se pasa cuando el original lo usaba).
 *
 * Solo se ejecutan los nombres de ACTION_TABLE. Las acciones de la delegación de W-50 del paso 3.2 (`approve-user`,
 * `toggle-tree`) y la de `switch-panel` tienen su propio enlace por nombre (utils/action-delegation.js) y no entran aquí,
 * así que no se ejecutan dos veces.
 *
 * `win` es el objeto global (window en el navegador; el contexto del arnés en las pruebas).
 */

/** Tipos de evento que atiende el registro. */
export const ACTION_EVENTS = Object.freeze(['click', 'change', 'input', 'submit']);

/** Un nombre de acción: los eventos en que se ejecuta y la llamada que hace. */
function entry(events, run) {
    return Object.freeze({ events: Object.freeze(events), run });
}

const dataOf = (el, name) => el.getAttribute(`data-${name}`);

/**
 * Tabla de acciones. Los nombres son los del `data-action` del HTML; la columna «llamada» de la tabla de pruebas
 * (action-registry.test.mjs) indica la llamada original que reemplaza cada uno.
 */
export const ACTION_TABLE = Object.freeze({
    // Barra lateral, cabecera y paneles de index.html.
    'toggle-breakfast-break': entry(['click'], (w) => w.toggleBreakfastBreak()),
    'toggle-lunch-break': entry(['click'], (w) => w.toggleLunchBreak()),
    'toggle-split-shift-break': entry(['click'], (w) => w.toggleSplitShiftBreak()),
    'end-shift': entry(['click'], (w) => w.handleEndShift()),
    'request-idle-permission': entry(['click'], (w) => w.requestIdlePermissionManual()),
    'toggle-notifications': entry(['click'], (w) => w.toggleNotifications()),
    'open-profile-modal': entry(['click'], (w) => w.openProfileModal()),
    'open-extra-task-modal': entry(['click'], (w) => w.openExtraTaskModal()),
    'open-exception-modal': entry(['click'], (w) => w.openExceptionModal()),
    'open-login-history-modal': entry(['click'], (w) => w.openLoginHistoryModal()),
    'change-password': entry(['click'], (w) => w.changePassword()),
    'confirm-exception': entry(['click'], (w) => w.confirmException()),
    'save-extra-task': entry(['click'], (w) => w.saveExtraTask()),
    'close-modal': entry(['click'], (w, el) => w.closeModal(dataOf(el, 'modal'))),
    'close-kpi-task-details': entry(['click'], (w) => w.closeKpiTaskDetails()),
    'mark-all-as-read': entry(['click'], (w) => w.markAllAsRead()),
    'go-to-notification-nav': entry(['click'], (w, el) => {
        w.document.getElementById(dataOf(el, 'nav')).click();
        w.document.getElementById('notificationDropdown').style.display = 'none';
    }),

    // Tareas, filtros y controles de Control Operativo.
    'render-assigned-tasks-filter': entry(['change'], (w) => w.renderAssignedTasksFilter()),
    'render-pending-users': entry(['input', 'change'], (w) => w.renderPendingUsers()),
    'filter-login-history': entry(['input', 'change'], (w) => w.filterLoginHistoryTable()),
    'operativo-custom-change': entry(['change'], (w) => {
        w.toggleOperativoCustomDates();
        w.renderControlOperativoFiltered();
    }),
    'render-control-operativo': entry(['change'], (w) => w.renderControlOperativoFiltered()),
    'generar-analisis-textual': entry(['click'], (w) => w.generarAnalisisTextual()),
    'load-control-operativo': entry(['click'], (w) => w.loadControlOperativoData()),
    'generar-reporte-ejecutivo-pdf': entry(['click'], (w) => w.generarReporteEjecutivoPDF()),
    'open-kpi-task-details': entry(['click'], (w, el) => w.openKpiTaskDetails(dataOf(el, 'kind'))),

    // Comunicados y formularios.
    'open-new-comunicado-modal': entry(['click'], (w) => w.openNewComunicadoModal()),
    'save-new-comunicado': entry(['click'], (w) => w.saveNewComunicado()),
    'submit-new-incident': entry(['submit'], (w, el, event) => w.handleNewIncidentSubmit(event)),
    'exec-command': entry(['click'], (w, el) => {
        const value = dataOf(el, 'value');
        w.document.execCommand(dataOf(el, 'command'), false, value === null ? null : value);
    }),
    'mark-comunicado-read': entry(['click'], (w, el) => w.markComunicadoAsRead(dataOf(el, 'key'))),
    'delete-comunicado': entry(['click'], (w, el) => w.deleteComunicado(dataOf(el, 'key'))),
    'view-comunicado-content': entry(['click'], (w, el) => w.viewComunicadoContent(dataOf(el, 'key'))),
    'view-comunicado-lecturas': entry(['click'], (w, el) => w.viewComunicadoLecturas(dataOf(el, 'key'))),

    // Filtros de horario, turnos y gestores.
    'toggle-gestor-split-shift': entry(['change'], (w, el) => w.toggleGestorSplitShift(dataOf(el, 'uid'), el.checked)),
    'open-monitoreo-details': entry(['click'], (w, el) => w.openMonitoreoDetails(dataOf(el, 'uid'))),
    'view-timeline-monitoreo': entry(['click'], (w, el) => w.viewTimelineInMonitoreo(dataOf(el, 'uid'))),
    'open-shift-detail-modal': entry(['click'], (w, el) => w.openShiftDetailModal(dataOf(el, 'fb-id'))),
    'export-shift-report': entry(['click'], (w, el) => w.exportShiftReport(dataOf(el, 'fb-id'))),
    'select-task': entry(['click'], (w, el, event) => w.selectTask(dataOf(el, 'task-id'), event)),

    // Aprobaciones de usuarios pendientes y rechazados.
    'revert-rejected-user': entry(['click'], (w, el) => w.revertRejectedUser(dataOf(el, 'user-id'))),
    'show-user-reject-box': entry(['click'], (w, el) => w.showUserRejectBox(dataOf(el, 'user-id'))),
    'confirm-reject-user': entry(['click'], (w, el) => w.confirmRejectUser(dataOf(el, 'user-id'))),
    'cancel-reject-user': entry(['click'], (w, el) => w.cancelRejectUser(dataOf(el, 'user-id'))),

    // Aprobaciones y detalle de permisos.
    'show-perm-approve-box': entry(['click'], (w, el) => w.showPermApproveBox(dataOf(el, 'fb-id'))),
    'show-perm-reject-box': entry(['click'], (w, el) => w.showPermRejectBox(dataOf(el, 'fb-id'))),
    'confirm-approve-perm': entry(['click'], (w, el) => w.confirmApprovePerm(dataOf(el, 'fb-id'))),
    'cancel-approve-perm': entry(['click'], (w, el) => w.cancelApprovePerm(dataOf(el, 'fb-id'))),
    'confirm-reject-perm': entry(['click'], (w, el) => w.confirmRejectPerm(dataOf(el, 'fb-id'))),
    'cancel-reject-perm': entry(['click'], (w, el) => w.cancelRejectPerm(dataOf(el, 'fb-id'))),
    'open-permiso-detail-modal': entry(['click'], (w, el) => w.openPermisoDetailModal(dataOf(el, 'fb-id'))),

    // Refrescar de las hojas de Tareas (horario y teletrabajo).
    'load-schedule': entry(['click'], (w) => w.loadSchedule()),
    'load-teletrabajo': entry(['click'], (w) => w.loadTeletrabajo()),
});

/**
 * Elemento más cercano (incluido el propio) con `data-action` y su entrada en la tabla, o `null`.
 *
 * @param {unknown} target objetivo del evento
 * @param {Record<string, {events: string[], run: Function}>} [table=ACTION_TABLE]
 * @returns {{el: any, name: string, entry: {events: string[], run: Function}}|null}
 */
export function findRegisteredAction(target, table = ACTION_TABLE) {
    if (!target || typeof target.closest !== 'function') return null;

    const el = target.closest('[data-action]');
    if (!el) return null;

    const name = el.getAttribute('data-action');
    if (!Object.prototype.hasOwnProperty.call(table, name)) return null;

    return { el, name, entry: table[name] };
}

/** Documento → listeners activos del registro (un juego por documento). */
const activeRegistries = new WeakMap();

/**
 * Enlaza el registro en `doc`. Re-enlazar sustituye el juego anterior: nunca hay dos listeners del mismo registro.
 *
 * @param {{addEventListener: Function, removeEventListener: Function}} doc documento o nodo raíz
 * @param {{win: object, table?: object, events?: string[]}} options
 * @returns {() => void} retira el registro (solo si sigue siendo el activo)
 */
export function bindActionRegistry(doc, { win, table = ACTION_TABLE, events = ACTION_EVENTS } = {}) {
    if (!doc || typeof doc.addEventListener !== 'function' || !win) return () => {};

    const previous = activeRegistries.get(doc);
    if (previous) previous.forEach(({ type, listener }) => doc.removeEventListener(type, listener));

    const bound = events.map((type) => {
        const listener = (event) => {
            const match = findRegisteredAction(event && event.target, table);
            if (!match || !match.entry.events.includes(type)) return;

            match.entry.run(win, match.el, event);
        };

        doc.addEventListener(type, listener);
        return { type, listener };
    });

    activeRegistries.set(doc, bound);

    return () => {
        if (activeRegistries.get(doc) !== bound) return;

        bound.forEach(({ type, listener }) => doc.removeEventListener(type, listener));
        activeRegistries.delete(doc);
    };
}
