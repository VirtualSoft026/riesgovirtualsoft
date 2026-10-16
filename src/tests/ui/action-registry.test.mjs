/**
 * Pruebas del registro de acciones de la interfaz (paso 3.4, W-54 b y DE-5 = a) sobre DOM falso:
 *  - cada acción de ACTION_TABLE llama a la misma función global, con los mismos argumentos, que el atributo original;
 *  - una acción desconocida o un evento que no le corresponde no hace nada;
 *  - un enlace repetido sustituye al anterior (nunca dos ejecuciones) y el retiro deja el documento limpio;
 *  - el envío de formularios pasa el evento; `exec-command` distingue «sin valor» (null) de «valor vacío» («»);
 *  - `go-to-notification-nav` hace el mismo clic de la pestaña y oculta el desplegable.
 *
 * Se ejecuta con: node src/tests/ui/action-registry.test.mjs
 */
import { createRunner, assert } from '../test-harness.mjs';
import {
    ACTION_EVENTS,
    ACTION_TABLE,
    bindActionRegistry,
    findRegisteredAction
} from '../../ui/actions/action-registry.js';

const { test, summarize } = createRunner('registro de acciones data-action (paso 3.4)');

/** Atributos de `data-*` a partir de un objeto, con `closest` real sobre la cadena de padres. */
function node(tag, attrs = {}, parent = null, extra = {}) {
    const n = {
        tagName: tag,
        attrs,
        parentNode: parent,
        checked: false,
        style: {},
        getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null; },
        closest(selector) {
            let cur = this;
            while (cur) {
                if (selector === '[data-action]' && cur.attrs['data-action'] !== undefined) return cur;
                cur = cur.parentNode;
            }
            return null;
        },
        ...extra
    };
    return n;
}

/** Documento falso: listeners por tipo, despacho y `getElementById` para las pestañas de notificaciones. */
function fakeDocument(calls) {
    const listeners = new Map();
    const elements = new Map([
        ['navAprobaciones', { click: () => calls.push(['click', 'navAprobaciones']) }],
        ['navPermisos', { click: () => calls.push(['click', 'navPermisos']) }],
        ['notificationDropdown', { style: {} }]
    ]);
    return {
        listeners,
        addEventListener(type, fn) {
            if (!listeners.has(type)) listeners.set(type, new Set());
            listeners.get(type).add(fn);
        },
        removeEventListener(type, fn) {
            if (listeners.has(type)) listeners.get(type).delete(fn);
        },
        dispatch(type, target, extra = {}) {
            const event = { type, target, preventDefault() {}, ...extra };
            for (const fn of [...(listeners.get(type) || [])]) fn(event);
            return event;
        },
        count(type) { return listeners.has(type) ? listeners.get(type).size : 0; },
        getElementById(id) { return elements.get(id) || null; },
        execCommand(...args) { calls.push(['execCommand', ...args]); }
    };
}

/** Ventana falsa: cada llamada a una función global queda registrada con sus argumentos. */
function fakeWindow() {
    const calls = [];
    const doc = fakeDocument(calls);
    const win = new Proxy({ document: doc }, {
        get(target, name) {
            if (name in target) return target[name];
            return (...args) => { calls.push([String(name), ...args]); return undefined; };
        }
    });
    return { win, doc, calls };
}

/** Atributos de una acción de la tabla y el tipo de evento con el que se dispara. */
const CASES = [
    ['toggle-breakfast-break', 'click', {}, [['toggleBreakfastBreak']]],
    ['toggle-lunch-break', 'click', {}, [['toggleLunchBreak']]],
    ['toggle-split-shift-break', 'click', {}, [['toggleSplitShiftBreak']]],
    ['end-shift', 'click', {}, [['handleEndShift']]],
    ['request-idle-permission', 'click', {}, [['requestIdlePermissionManual']]],
    ['toggle-notifications', 'click', {}, [['toggleNotifications']]],
    ['open-profile-modal', 'click', {}, [['openProfileModal']]],
    ['open-extra-task-modal', 'click', {}, [['openExtraTaskModal']]],
    ['open-exception-modal', 'click', {}, [['openExceptionModal']]],
    ['open-login-history-modal', 'click', {}, [['openLoginHistoryModal']]],
    ['change-password', 'click', {}, [['changePassword']]],
    ['confirm-exception', 'click', {}, [['confirmException']]],
    ['save-extra-task', 'click', {}, [['saveExtraTask']]],
    ['close-modal', 'click', { 'data-modal': 'shiftDetailModal' }, [['closeModal', 'shiftDetailModal']]],
    ['close-kpi-task-details', 'click', {}, [['closeKpiTaskDetails']]],
    ['mark-all-as-read', 'click', {}, [['markAllAsRead']]],
    ['go-to-notification-nav', 'click', { 'data-nav': 'navPermisos' }, [['click', 'navPermisos']]],
    ['render-assigned-tasks-filter', 'change', {}, [['renderAssignedTasksFilter']]],
    ['render-pending-users', 'input', {}, [['renderPendingUsers']]],
    ['render-pending-users', 'change', {}, [['renderPendingUsers']]],
    ['filter-login-history', 'input', {}, [['filterLoginHistoryTable']]],
    ['filter-login-history', 'change', {}, [['filterLoginHistoryTable']]],
    ['operativo-custom-change', 'change', {}, [['toggleOperativoCustomDates'], ['renderControlOperativoFiltered']]],
    ['render-control-operativo', 'change', {}, [['renderControlOperativoFiltered']]],
    ['generar-analisis-textual', 'click', {}, [['generarAnalisisTextual']]],
    ['load-control-operativo', 'click', {}, [['loadControlOperativoData']]],
    ['generar-reporte-ejecutivo-pdf', 'click', {}, [['generarReporteEjecutivoPDF']]],
    ['open-kpi-task-details', 'click', { 'data-kind': 'finalizadas' }, [['openKpiTaskDetails', 'finalizadas']]],
    ['open-new-comunicado-modal', 'click', {}, [['openNewComunicadoModal']]],
    ['save-new-comunicado', 'click', {}, [['saveNewComunicado']]],
    ['exec-command', 'click', { 'data-command': 'foreColor', 'data-value': '#ff5a5a' }, [['execCommand', 'foreColor', false, '#ff5a5a']]],
    ['mark-comunicado-read', 'click', { 'data-key': '-A1' }, [['markComunicadoAsRead', '-A1']]],
    ['delete-comunicado', 'click', { 'data-key': '-A1' }, [['deleteComunicado', '-A1']]],
    ['view-comunicado-content', 'click', { 'data-key': '-A1' }, [['viewComunicadoContent', '-A1']]],
    ['view-comunicado-lecturas', 'click', { 'data-key': '-A1' }, [['viewComunicadoLecturas', '-A1']]],
    ['toggle-gestor-split-shift', 'change', { 'data-uid': 'g1' }, [['toggleGestorSplitShift', 'g1', true]]],
    ['open-monitoreo-details', 'click', { 'data-uid': 'u1' }, [['openMonitoreoDetails', 'u1']]],
    ['view-timeline-monitoreo', 'click', { 'data-uid': 'u1' }, [['viewTimelineInMonitoreo', 'u1']]],
    ['open-shift-detail-modal', 'click', { 'data-fb-id': 'k1' }, [['openShiftDetailModal', 'k1']]],
    ['export-shift-report', 'click', { 'data-fb-id': 'k1' }, [['exportShiftReport', 'k1']]],
    ['select-task', 'click', { 'data-task-id': 't1' }, [['selectTask', 't1', 'EVENT']]],
    ['revert-rejected-user', 'click', { 'data-user-id': 'u 1' }, [['revertRejectedUser', 'u 1']]],
    ['show-user-reject-box', 'click', { 'data-user-id': 'u 1' }, [['showUserRejectBox', 'u 1']]],
    ['confirm-reject-user', 'click', { 'data-user-id': 'u 1' }, [['confirmRejectUser', 'u 1']]],
    ['cancel-reject-user', 'click', { 'data-user-id': 'u 1' }, [['cancelRejectUser', 'u 1']]],
    ['show-perm-approve-box', 'click', { 'data-fb-id': 'p1' }, [['showPermApproveBox', 'p1']]],
    ['show-perm-reject-box', 'click', { 'data-fb-id': 'p1' }, [['showPermRejectBox', 'p1']]],
    ['confirm-approve-perm', 'click', { 'data-fb-id': 'p1' }, [['confirmApprovePerm', 'p1']]],
    ['cancel-approve-perm', 'click', { 'data-fb-id': 'p1' }, [['cancelApprovePerm', 'p1']]],
    ['confirm-reject-perm', 'click', { 'data-fb-id': 'p1' }, [['confirmRejectPerm', 'p1']]],
    ['cancel-reject-perm', 'click', { 'data-fb-id': 'p1' }, [['cancelRejectPerm', 'p1']]],
    ['open-permiso-detail-modal', 'click', { 'data-fb-id': 'p1' }, [['openPermisoDetailModal', 'p1']]],
    ['load-schedule', 'click', {}, [['loadSchedule']]],
    ['load-teletrabajo', 'click', {}, [['loadTeletrabajo']]],
    ['submit-new-incident', 'submit', {}, [['handleNewIncidentSubmit', 'EVENT']]]
];

/** Entradas de la tabla que ya tienen su propio caso arriba (para comprobar que la tabla no crece sin prueba). */
const COVERED = new Set(CASES.map(([name]) => name));

test('la tabla tiene exactamente las acciones migradas y cada una tiene caso de prueba', () => {
    for (const name of Object.keys(ACTION_TABLE)) {
        assert.ok(COVERED.has(name), `sin caso de prueba: ${name}`);
    }
    for (const name of COVERED) {
        assert.ok(Object.prototype.hasOwnProperty.call(ACTION_TABLE, name), `caso sin entrada en la tabla: ${name}`);
    }
});

test('ACTION_EVENTS son los cuatro tipos de evento de los atributos migrados', () => {
    assert.deepEqual([...ACTION_EVENTS].sort(), ['change', 'click', 'input', 'submit']);
});

test('cada acción llama a la misma función global con los mismos argumentos que su atributo original', () => {
    for (const [action, type, attrs, expected] of CASES) {
        const { win, doc, calls } = fakeWindow();
        bindActionRegistry(doc, { win });
        const el = node('div', { 'data-action': action, ...attrs }, null, { checked: action === 'toggle-gestor-split-shift' });
        const event = doc.dispatch(type, el, { target: el });
        // `EVENT` marca el objeto del evento: selectTask y el envío del formulario reciben el mismo objeto.
        const want = expected.map((call) => call.map((v) => (v === 'EVENT' ? event : v)));
        assert.deepEqual(calls, want, `${action} (${type})`);
    }
});

test('select-task y submit-new-incident reciben el mismo objeto de evento', () => {
    for (const [action, type, attrs, fn] of [['select-task', 'click', { 'data-task-id': 't1' }, 'selectTask'], ['submit-new-incident', 'submit', {}, 'handleNewIncidentSubmit']]) {
        const { win, doc, calls } = fakeWindow();
        bindActionRegistry(doc, { win });
        const el = node('form', { 'data-action': action, ...attrs });
        const event = doc.dispatch(type, el, { target: el });
        assert.equal(calls.length, 1);
        assert.equal(calls[0][0], fn);
        assert.equal(calls[0][calls[0].length - 1], event, `${action} recibe el evento`);
    }
});

test('acción desconocida, o evento que no le corresponde: no se ejecuta nada', () => {
    const { win, doc, calls } = fakeWindow();
    bindActionRegistry(doc, { win });
    doc.dispatch('click', node('button', { 'data-action': 'no-existe' }));
    doc.dispatch('click', node('button', { 'data-action': 'toggle-tree' })); // delegación de W-50: no es de este registro
    doc.dispatch('click', node('button', { 'data-action': 'approve-user', 'data-user-id': 'u1' }));
    doc.dispatch('click', node('button', { 'data-action': 'switch-panel', 'data-panel': 'login' }));
    doc.dispatch('change', node('button', { 'data-action': 'toggle-breakfast-break' })); // solo click
    doc.dispatch('click', node('input', { 'data-action': 'toggle-gestor-split-shift', 'data-uid': 'g1' })); // solo change
    doc.dispatch('input', node('button', { 'data-action': 'save-extra-task' })); // solo click
    assert.deepEqual(calls, []);
});

test('sin atributo data-action no hay ejecución; un hijo dentro de un botón sí la dispara (closest)', () => {
    const { win, doc, calls } = fakeWindow();
    bindActionRegistry(doc, { win });
    doc.dispatch('click', node('span', {}));
    const button = node('button', { 'data-action': 'toggle-lunch-break' });
    const icon = node('i', {}, button);
    doc.dispatch('click', icon, { target: icon });
    assert.deepEqual(calls, [['toggleLunchBreak']]);
});

test('findRegisteredAction: devuelve el elemento y la entrada; null si no está en la tabla', () => {
    const button = node('button', { 'data-action': 'end-shift' });
    const found = findRegisteredAction(node('i', {}, button));
    assert.equal(found.name, 'end-shift');
    assert.equal(found.el, button);
    assert.equal(findRegisteredAction(node('button', { 'data-action': 'nope' })), null);
    assert.equal(findRegisteredAction(null), null);
    assert.equal(findRegisteredAction({}), null);
});

test('un enlace repetido sustituye al anterior: cada clic se ejecuta UNA vez', () => {
    const { win, doc, calls } = fakeWindow();
    bindActionRegistry(doc, { win });
    bindActionRegistry(doc, { win });
    bindActionRegistry(doc, { win });
    assert.equal(doc.count('click'), 1);
    assert.equal(doc.count('change'), 1);
    doc.dispatch('click', node('button', { 'data-action': 'toggle-notifications' }));
    assert.deepEqual(calls, [['toggleNotifications']]);
});

test('la función de retiro quita los listeners; retirar dos veces no falla; volver a enlazar funciona', () => {
    const { win, doc, calls } = fakeWindow();
    const unbind = bindActionRegistry(doc, { win });
    unbind();
    assert.equal(doc.count('click'), 0);
    doc.dispatch('click', node('button', { 'data-action': 'toggle-notifications' }));
    assert.deepEqual(calls, []);
    unbind();
    bindActionRegistry(doc, { win });
    doc.dispatch('click', node('button', { 'data-action': 'toggle-notifications' }));
    assert.deepEqual(calls, [['toggleNotifications']]);
});

test('una función de retiro antigua no retira el registro que la sustituyó', () => {
    const { win, doc, calls } = fakeWindow();
    const first = bindActionRegistry(doc, { win });
    bindActionRegistry(doc, { win });
    first();
    doc.dispatch('click', node('button', { 'data-action': 'toggle-notifications' }));
    assert.deepEqual(calls, [['toggleNotifications']]);
});

test('exec-command: sin data-value pasa null; con data-value vacío pasa cadena vacía; con valor lo pasa tal cual', () => {
    const { win, doc, calls } = fakeWindow();
    bindActionRegistry(doc, { win });
    doc.dispatch('click', node('button', { 'data-action': 'exec-command', 'data-command': 'bold' }));
    doc.dispatch('click', node('button', { 'data-action': 'exec-command', 'data-command': 'removeFormat', 'data-value': '' }));
    doc.dispatch('click', node('button', { 'data-action': 'exec-command', 'data-command': 'fontSize', 'data-value': '5' }));
    assert.deepEqual(calls, [
        ['execCommand', 'bold', false, null],
        ['execCommand', 'removeFormat', false, ''],
        ['execCommand', 'fontSize', false, '5']
    ]);
});

test('go-to-notification-nav: hace clic en la pestaña indicada y oculta el desplegable de notificaciones', () => {
    const { win, doc, calls } = fakeWindow();
    bindActionRegistry(doc, { win });
    doc.dispatch('click', node('div', { 'data-action': 'go-to-notification-nav', 'data-nav': 'navAprobaciones' }));
    assert.deepEqual(calls, [['click', 'navAprobaciones']]);
    assert.equal(doc.getElementById('notificationDropdown').style.display, 'none');
});

test('el registro usa el objeto `win` que se le pasa (no un global)', () => {
    const { win, doc, calls } = fakeWindow();
    const other = fakeWindow();
    bindActionRegistry(doc, { win });
    doc.dispatch('click', node('button', { 'data-action': 'mark-all-as-read' }));
    assert.deepEqual(calls, [['markAllAsRead']]);
    assert.equal(other.calls.length, 0);
});

summarize();
