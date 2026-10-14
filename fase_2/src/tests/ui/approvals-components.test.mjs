import { createRunner, assert } from '../test-harness.mjs';
import { createOriginalApp } from '../controllers/approvals-original.mjs';
import { createFakeDatabase, createFakeDom } from '../controllers/approvals-fakes.mjs';
import {
    APPROVAL_BOX,
    cancelApprovalBox,
    permissionActionContainerIds,
    readApprovalReason,
    setApprovalButtonsDisabled,
    showApprovalBox,
    userActionContainerIds
} from '../../ui/components/approval-boxes.js';
import { LIST_NOTICE_IDS, LIST_NOTICE_STYLE, removeListNotice, showListNotice } from '../../ui/components/list-notice.js';
import { closeModal, openExceptionModal, openExtraTaskModal, openModal } from '../../ui/components/modal.js';
import {
    NO_USERS_ROW_HTML,
    USER_REJECTED_ACTIONS_PREFIX,
    buildRejectedUserActionHtml,
    buildUserActionHtml,
    buildUserRoleBadgeHtml,
    buildUserRowHtml,
    ensureRejectedFilterOption
} from '../../ui/components/pending-users-table.js';
import {
    buildAdminPermissionNotifications,
    buildGestorPermissionNotifications,
    buildPermissionDetailHTML,
    buildPermissionHistoryItemHTML
} from '../../ui/views/permission-history-view.js';
import {
    NO_PENDING_PERMISSIONS_ROW_HTML,
    NO_PERMISSION_HISTORY_ROW_HTML,
    buildPendingPermissionRowHtml,
    buildPermissionHistoryRowHtml
} from '../../ui/components/pending-permissions-table.js';
import { resolvePermissionCreatedTimeText } from '../../domain/permissions/permission-service.js';
import { formatApprovalDate, formatRegistrationDate } from '../../domain/permissions/user-approval-list.js';

const { test, testAsync, summarizeAsync } = createRunner('componentes de aprobaciones (HTML idéntico al de app.js 4111-4448 + cajas, modales y avisos + decisiones D2/D7/D9a)');

/** Opciones que reproducen el HTML de app.js (D2 `escapeRole` y D9a `rejectedActions` apagadas). */
const LEGACY_ROW = { escapeRole: false, rejectedActions: false };

// ---------------------------------------------------------------------------------------------
// Ejecuta el renderizado ORIGINAL de app.js y devuelve el HTML que produce, para compararlo con los constructores
// ---------------------------------------------------------------------------------------------
async function originalHtml(kind, record) {
    const dom = createFakeDom();
    const body = dom.add(kind === 'users' ? 'pendingUsersTableBody' : 'pendingPermissionsTableBody');
    const history = kind === 'history' ? dom.add('historyPermissionsTableBody') : null;
    const table = dom.add('t');
    const panel = dom.add('p');
    dom.nest(body, table);
    dom.nest(table, panel);
    dom.add('filterAprobacionesSearch');
    dom.add('filterAprobacionesStatus', { value: 'Todos' });

    const tree = kind === 'users' ? { users: { [record.id]: record } } : { permissions: { [record.fb_id]: record } };
    if (kind === 'history') tree.permissions['pend'] = { status: 'Pendiente', gestor: 'x', tipo: 't', fecha: '2026-10-01' };
    const database = createFakeDatabase(tree);
    const app = createOriginalApp({ document: dom.doc, database, alert() {}, confirm: () => true, setTimeout() {}, Date, console, taskStateCache: {} });

    if (kind === 'users') await app.renderPendingUsers();
    else await app.renderPendingPermissions();

    return kind === 'history' ? history.innerHTML : body.innerHTML;
}

const userRecord = (extra) => ({ id: 'u1', name: 'Ana <Gómez>', email: 'ana@virtualsoft.tech', role: 'Gestor', approved: false, registrationDate: '2026-10-01T10:00:00.000Z', ...extra });
const permRecord = (extra) => ({ fb_id: '-Nabc\'d', gestor: 'Ana <b>', tipo: 'Cita "médica"', fecha: '2026-10-10', horaInicio: '08:00', horaFin: '10:00', motivo: 'Control\nmédico', status: 'Pendiente', id: 1760000000000, ...extra });

testAsync('fila de usuario pendiente: HTML idéntico al original', async () => {
    const user = userRecord();
    const expected = await originalHtml('users', user);
    const actual = buildUserRowHtml(user, { regDateStr: formatRegistrationDate(user), appDateStr: formatApprovalDate(user), ...LEGACY_ROW });

    assert.equal(actual, expected);
    // Con datos normales (rol "Gestor") el HTML decidido por defecto es idéntico al de app.js.
    assert.equal(buildUserRowHtml(user, { regDateStr: formatRegistrationDate(user), appDateStr: formatApprovalDate(user) }), expected);
});

testAsync('fila de usuario aprobado (con y sin fecha de aprobación): HTML idéntico', async () => {
    for (const user of [userRecord({ approved: true, approvalDate: '2026-10-02T09:30:00.000Z' }), userRecord({ approved: true }), userRecord({ id: "o'neil&co", approved: false, registrationDate: undefined })]) {
        const expected = await originalHtml('users', user);
        const actual = buildUserRowHtml(user, { regDateStr: formatRegistrationDate(user), appDateStr: formatApprovalDate(user), ...LEGACY_ROW });

        assert.equal(actual, expected, JSON.stringify(user));
    }
});

test('fila vacía de usuarios: texto y estructura del original', () => {
    assert.equal(NO_USERS_ROW_HTML, `<tr><td colspan="6" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay usuarios que coincidan con los filtros.</td></tr>`);
});

test('acciones de usuario: pendiente -> botones con los mismos manejadores y ids; aprobado/rechazado -> etiqueta', () => {
    const pending = buildUserActionHtml({ id: 'u 1', approved: false });

    assert.ok(pending.includes('id="user-action-btns-u 1"'));
    assert.ok(pending.includes('id="user-reject-box-u 1"'));
    assert.ok(pending.includes('id="user-reason-u 1"'));
    assert.ok(pending.includes(`onclick="approveUser(decodeURIComponent('u%201'))"`));
    assert.ok(pending.includes(`onclick="showUserRejectBox(decodeURIComponent('u%201'))"`));
    assert.ok(pending.includes(`onclick="confirmRejectUser(decodeURIComponent('u%201'))"`));
    assert.ok(pending.includes(`onclick="cancelRejectUser(decodeURIComponent('u%201'))"`));
    assert.ok(buildUserActionHtml({ id: 'x', approved: true }).includes('Aprobado'));
    assert.equal(
        buildUserActionHtml({ id: 'x', approved: 'Rechazado' }, { rejectedActions: false }),
        `<span style="color: var(--danger); font-weight: bold;"><i class='bx bx-x'></i> Rechazado</span>`,
        'rama "Rechazado" de app.js 4183 (legacy)'
    );
});

test('el id con comillas/menor-que se escapa en el id y se codifica en el manejador (sin romper el atributo)', () => {
    const html = buildUserActionHtml({ id: `a'"<b>`, approved: false });

    assert.ok(html.includes('id="user-action-btns-a&#039;&quot;&lt;b&gt;"'));
    assert.ok(html.includes(`decodeURIComponent('a%27%22%3Cb%3E')`));
    assert.ok(!html.includes(`'a'"<b>'`));
});

test('D2 insignia del rol: ESCAPADA por defecto; { escapeRole: false } reproduce app.js (sin escapar)', () => {
    assert.ok(buildUserRoleBadgeHtml({ approved: true, role: '<i>' }).includes('&lt;i&gt;'));
    assert.ok(!buildUserRoleBadgeHtml({ approved: true, role: '<i>' }).includes('<i>'));
    assert.ok(buildUserRoleBadgeHtml({ approved: true, role: '<i>' }, { escapeRole: false }).includes('<i>'));
    assert.equal(buildUserRoleBadgeHtml({ approved: false, role: undefined }), '<span class="badge pending"></span>');
    assert.ok(buildUserRoleBadgeHtml({ approved: false, role: 'Gestor' }).includes('class="badge pending"'));
    assert.ok(buildUserRoleBadgeHtml({ approved: true, role: 'Gestor' }).includes('rgba(16, 185, 129, 0.2)'));
});

testAsync('fila de permiso pendiente: HTML idéntico al original (con y sin horaSolicitud, campos faltantes)', async () => {
    for (const p of [permRecord(), permRecord({ horaSolicitud: '9:00 a. m.' }), permRecord({ motivo: '', id: undefined }), permRecord({ gestor: undefined, tipo: undefined, horaInicio: undefined, horaFin: undefined })]) {
        const expected = await originalHtml('perms', p);
        const actual = buildPendingPermissionRowHtml(p, resolvePermissionCreatedTimeText(p));

        assert.equal(actual, expected, JSON.stringify(p));
    }
});

testAsync('fila de historial: HTML idéntico al original (Aprobado y Rechazado)', async () => {
    for (const p of [permRecord({ status: 'Aprobado', rejectionReason: 'Aprobado sin observaciones adicionales' }), permRecord({ status: 'Rechazado', rejectionReason: '<script>' }), permRecord({ status: 'Rechazado' })]) {
        const expected = await originalHtml('history', p);
        const actual = buildPermissionHistoryRowHtml(p);

        assert.equal(actual, expected, JSON.stringify(p));
    }
});

test('filas vacías de permisos: textos del original', () => {
    assert.equal(NO_PENDING_PERMISSIONS_ROW_HTML, `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay permisos pendientes de aprobación.</td></tr>`);
    assert.equal(NO_PERMISSION_HISTORY_ROW_HTML, `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay historial de permisos procesados.</td></tr>`);
});

test('permiso pendiente: manejadores y ids de las tres cajas (acciones, aprobar, rechazar)', () => {
    const html = buildPendingPermissionRowHtml(permRecord({ fb_id: 'p1' }), 'hora');

    for (const handler of ['showPermApproveBox', 'showPermRejectBox', 'confirmApprovePerm', 'cancelApprovePerm', 'confirmRejectPerm', 'cancelRejectPerm']) {
        assert.ok(html.includes(`onclick="${handler}(decodeURIComponent('p1'))"`), handler);
    }
    for (const id of ['perm-action-btns-p1', 'perm-approve-box-p1', 'perm-approve-reason-p1', 'perm-reject-box-p1', 'perm-reason-p1']) {
        assert.ok(html.includes(`id="${id}"`), id);
    }
});

// ---------------------------------------------------------------------------------------------
// Cajas de acción parametrizadas (sustituyen a las funciones show*/cancel* "redundantes")
// ---------------------------------------------------------------------------------------------
function boxesDom(prefixes) {
    const dom = createFakeDom();
    dom.add(prefixes.actionsPrefix + '7', { style: { display: 'flex' } });
    dom.add(prefixes.boxPrefix + '7', { style: { display: 'none' } });
    dom.add(prefixes.reasonPrefix + '7', { value: ' texto ' });
    return dom;
}

for (const [name, box] of Object.entries(APPROVAL_BOX)) {
    test(`${name}: mostrar oculta los botones y muestra la caja; cancelar lo revierte y vacía el motivo`, () => {
        const dom = boxesDom(box);
        const actions = dom.doc.getElementById(box.actionsPrefix + '7');
        const boxEl = dom.doc.getElementById(box.boxPrefix + '7');
        const reason = dom.doc.getElementById(box.reasonPrefix + '7');

        assert.equal(readApprovalReason(dom.doc, box, '7'), 'texto');
        showApprovalBox(dom.doc, box, '7');
        assert.equal(actions.style.display, 'none');
        assert.equal(boxEl.style.display, 'flex');
        assert.equal(reason.value, ' texto ', 'mostrar no toca el motivo');

        cancelApprovalBox(dom.doc, box, '7');
        assert.equal(actions.style.display, 'flex');
        assert.equal(boxEl.style.display, 'none');
        assert.equal(reason.value, '');
    });
}

test('los tres tipos de caja usan los prefijos de id de app.js', () => {
    assert.deepEqual(APPROVAL_BOX.USER_REJECT, { actionsPrefix: 'user-action-btns-', boxPrefix: 'user-reject-box-', reasonPrefix: 'user-reason-' });
    assert.deepEqual(APPROVAL_BOX.PERMISSION_REJECT, { actionsPrefix: 'perm-action-btns-', boxPrefix: 'perm-reject-box-', reasonPrefix: 'perm-reason-' });
    assert.deepEqual(APPROVAL_BOX.PERMISSION_APPROVE, { actionsPrefix: 'perm-action-btns-', boxPrefix: 'perm-approve-box-', reasonPrefix: 'perm-approve-reason-' });
});

test('una caja inexistente lanza TypeError (como app.js: no se enmascara)', () => {
    const dom = createFakeDom();

    assert.throws(() => showApprovalBox(dom.doc, APPROVAL_BOX.USER_REJECT, 'nada'), TypeError);
    assert.throws(() => cancelApprovalBox(dom.doc, APPROVAL_BOX.PERMISSION_APPROVE, 'nada'), TypeError);
    assert.throws(() => readApprovalReason(dom.doc, APPROVAL_BOX.PERMISSION_REJECT, 'nada'), TypeError);
});

// ---------------------------------------------------------------------------------------------
// Aviso "Mostrando los 5 ..."
// ---------------------------------------------------------------------------------------------
function noticeDom() {
    const dom = createFakeDom();
    const tbody = dom.add('tb');
    const table = dom.add('tbl');
    const panel = dom.add('pnl');
    dom.nest(tbody, table);
    dom.nest(table, panel);
    return { dom, panel };
}

test('showListNotice agrega el aviso con estilo e id al contenedor del contenedor de la tabla y lo reemplaza', () => {
    const { dom, panel } = noticeDom();
    showListNotice(dom.doc, { tbodyId: 'tb', noticeId: LIST_NOTICE_IDS.USERS, text: 'uno' });
    showListNotice(dom.doc, { tbodyId: 'tb', noticeId: LIST_NOTICE_IDS.USERS, text: 'dos' });

    assert.equal(panel.children.filter((c) => c.id === 'pendingMostrandoMsg').length, 1);
    const msg = dom.doc.getElementById('pendingMostrandoMsg');
    assert.equal(msg.innerText, 'dos');
    assert.equal(msg.style, 'text-align: center; font-size: 11px; color: var(--text-secondary); margin-top: 10px; margin-bottom: 15px; font-style: italic;');
    assert.equal(LIST_NOTICE_STYLE, msg.style);
});

test('showListNotice con requireTable no hace nada si la tabla ya no existe; removeListNotice es idempotente', () => {
    const { dom } = noticeDom();
    dom.doc.getElementById('tb').remove();

    showListNotice(dom.doc, { tbodyId: 'tb', noticeId: LIST_NOTICE_IDS.USERS, text: 'x', requireTable: true });
    assert.equal(dom.doc.getElementById('pendingMostrandoMsg'), null);
    removeListNotice(dom.doc, LIST_NOTICE_IDS.USERS);
    removeListNotice(dom.doc, LIST_NOTICE_IDS.PERMISSIONS);
});

test('ids de los avisos idénticos a app.js (pendingMostrandoMsg / pendingPermsMostrandoMsg)', () => {
    assert.equal(LIST_NOTICE_IDS.USERS, 'pendingMostrandoMsg');
    assert.equal(LIST_NOTICE_IDS.PERMISSIONS, 'pendingPermsMostrandoMsg');
});

// ---------------------------------------------------------------------------------------------
// Modales
// ---------------------------------------------------------------------------------------------
test('openModal / closeModal agregan y quitan "active"; un id inexistente no falla', () => {
    const dom = createFakeDom();
    const modal = dom.add('m');

    openModal(dom.doc, 'm');
    assert.equal(modal.classList.contains('active'), true);
    closeModal(dom.doc, 'm');
    assert.equal(modal.classList.contains('active'), false);
    openModal(dom.doc, 'no');
    closeModal(dom.doc, 'no');
});

test('openExceptionModal: deja activo solo "No Realizada", limpia razón y detalle y abre el modal', () => {
    const dom = createFakeDom();
    const pending = dom.add('b1', { isStatusButton: true, classes: new Set(['active']) });
    const notDone = dom.add('b2', { isStatusButton: true, isNotDone: true });
    const reason = dom.add('exceptionReason', { value: 'Otro' });
    const details = dom.add('exceptionDetails', { value: 'viejo' });
    const modal = dom.add('exceptionModal');

    openExceptionModal(dom.doc);

    assert.equal(pending.classes.has('active'), false);
    assert.equal(notDone.classes.has('active'), true);
    assert.equal(reason.value, '');
    assert.equal(details.value, '');
    assert.equal(modal.classes.has('active'), true);
});

test('openExceptionModal sin el botón .not-done lanza TypeError; sin campos opcionales sigue (como app.js)', () => {
    const dom = createFakeDom();
    assert.throws(() => openExceptionModal(dom.doc), TypeError);

    dom.add('b2', { isStatusButton: true, isNotDone: true });
    openExceptionModal(dom.doc); // sin campos ni modal: no lanza
});

test('openExtraTaskModal: limpia el formulario, fija el estado inicial y devuelve true; sin modal devuelve false y no toca nada', () => {
    const dom = createFakeDom();
    assert.equal(openExtraTaskModal(dom.doc, 'Finalizada'), false);

    const modal = dom.add('extraTaskModal');
    const name = dom.add('extraTaskName', { value: 'x' });
    const status = dom.add('extraTaskStatus', { value: 'Pendiente' });
    const obs = dom.add('extraTaskObs', { value: 'y' });

    assert.equal(openExtraTaskModal(dom.doc, 'Finalizada'), true);
    assert.equal(name.value, '');
    assert.equal(status.value, 'Finalizada');
    assert.equal(obs.value, '');
    assert.equal(modal.classes.has('active'), true);
});

// ---------------------------------------------------------------------------------------------
// D2 — XSS: payloads en TODOS los campos de usuario/Firebase de los módulos de aprobaciones/permisos
// ---------------------------------------------------------------------------------------------
const XSS = ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '" onmouseover="alert(1)', "' onfocus='alert(1)", '</td><svg onload=alert(1)>'];

/** El HTML no contiene etiquetas ni atributos inyectados (solo los propios de la plantilla). */
function assertNoInjection(html, label) {
    assert.ok(!/<script|<img|<svg/i.test(html), `${label}: etiqueta inyectada`);
    assert.ok(!/" onmouseover="|' onfocus='/.test(html), `${label}: atributo inyectado`);
}

test('D2 fila de usuario (pendiente, aprobado y rechazado) con payloads en nombre, correo, rol, fechas, motivo e id', () => {
    for (const x of XSS) {
        for (const approved of [false, true, 'Rechazado']) {
            const user = { id: x, name: x, email: x, role: x, approved, rejectionReason: x };
            assertNoInjection(buildUserRowHtml(user, { regDateStr: x, appDateStr: x }), `${approved} ${x}`);
        }
    }
});

test('D2 fila de permiso pendiente e historial con payloads en gestor, tipo, fecha, horas, motivo, observación e id', () => {
    for (const x of XSS) {
        const p = { fb_id: x, gestor: x, tipo: x, fecha: x, horaInicio: x, horaFin: x, motivo: x, status: x, rejectionReason: x };
        assertNoInjection(buildPendingPermissionRowHtml(p, x), 'pendiente ' + x);
        assertNoInjection(buildPermissionHistoryRowHtml(p), 'historial ' + x);
    }
});

test('D2 vistas de permisos (historial, detalle, notificaciones) con payloads en todos los campos', () => {
    for (const x of XSS) {
        const p = { fb_id: x, gestor: x, tipo: x, fecha: x, fechaDesde: x, fechaHasta: x + '2', horaInicio: x, horaFin: x, horaSolicitud: x, motivo: x, status: x, rejectionReason: x };
        assertNoInjection(buildPermissionHistoryItemHTML(p), 'item ' + x);
        assertNoInjection(buildPermissionDetailHTML(p), 'detalle ' + x);
        assertNoInjection(buildAdminPermissionNotifications({ [x]: { ...p, status: 'Pendiente', notified_admin: false } }).html, 'notif admin ' + x);
        assertNoInjection(buildGestorPermissionNotifications({ [x]: { ...p, status: 'Rechazado', notified: false } }).html, 'notif gestor ' + x);
    }
});

// ---------------------------------------------------------------------------------------------
// D9a — fila de usuario rechazado y opción "Rechazados" del selector
// ---------------------------------------------------------------------------------------------
test('D9a acción de rechazado: etiqueta, motivo escapado (o "No especificado") y botones Revertir/Aprobar con ids codificados', () => {
    const html = buildRejectedUserActionHtml({ id: 'u 1', rejectionReason: 'Falta <b>cargo</b>' });

    assert.ok(html.includes(`<i class='bx bx-x'></i> Rechazado`));
    assert.ok(html.includes('Motivo: Falta &lt;b&gt;cargo&lt;/b&gt;'));
    assert.ok(html.includes(`id="${USER_REJECTED_ACTIONS_PREFIX}u 1"`));
    assert.ok(html.includes(`onclick="revertRejectedUser(decodeURIComponent('u%201'))"`));
    assert.ok(html.includes(`onclick="approveUser(decodeURIComponent('u%201'))"`));
    assert.equal(buildUserActionHtml({ id: 'u 1', approved: 'Rechazado', rejectionReason: 'Falta <b>cargo</b>' }), html, 'por defecto');

    for (const empty of [undefined, null, '']) {
        assert.ok(buildRejectedUserActionHtml({ id: 'x', rejectionReason: empty }).includes('Motivo: No especificado'));
    }
});

test('D9a ensureRejectedFilterOption: agrega una sola vez la opción (textContent, sin HTML); tolera select ausente o sin options', () => {
    const options = [{ value: 'Todos' }, { value: 'Pendiente' }, { value: 'Aprobado' }];
    const select = { options, appendChild: (o) => { options.push(o); return o; } };
    const created = [];
    const doc = { createElement: (tag) => { const o = { tag, style: {} }; created.push(o); return o; } };

    assert.equal(ensureRejectedFilterOption(doc, select), true);
    assert.equal(ensureRejectedFilterOption(doc, select), true);
    assert.equal(created.length, 1);
    assert.deepEqual(options[3], { tag: 'option', value: 'Rechazado', textContent: 'Rechazados', style: { color: 'black' } });
    assert.equal(options.length, 4);

    assert.equal(ensureRejectedFilterOption(doc, null), false);
    assert.equal(ensureRejectedFilterOption(doc, { value: 'Todos' }), false);
    assert.equal(created.length, 1);
});

// ---------------------------------------------------------------------------------------------
// D7 — botones deshabilitados mientras la escritura está en vuelo
// ---------------------------------------------------------------------------------------------
test('D7 setApprovalButtonsDisabled deshabilita/rehabilita los botones de los contenedores existentes e ignora los ausentes', () => {
    const dom = createFakeDom();
    const buttons = [{ disabled: false }, { disabled: false }];
    dom.add('perm-action-btns-p1', { querySelectorAll: (sel) => (sel === 'button' ? buttons : []) });
    dom.add('perm-approve-box-p1'); // sin querySelectorAll: se ignora

    setApprovalButtonsDisabled(dom.doc, permissionActionContainerIds('p1'), true);
    assert.deepEqual(buttons.map((b) => b.disabled), [true, true]);
    setApprovalButtonsDisabled(dom.doc, permissionActionContainerIds('p1'), false);
    assert.deepEqual(buttons.map((b) => b.disabled), [false, false]);
});

test('D7 contenedores de acciones por fila (mismos prefijos que el HTML de las tablas)', () => {
    assert.deepEqual(userActionContainerIds('u1'), ['user-action-btns-u1', 'user-reject-box-u1', 'user-rejected-actions-u1']);
    assert.deepEqual(permissionActionContainerIds('p1'), ['perm-action-btns-p1', 'perm-approve-box-p1', 'perm-reject-box-p1']);
});

summarizeAsync();
