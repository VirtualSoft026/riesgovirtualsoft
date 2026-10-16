import { createRunner, assert } from '../test-harness.mjs';
import { APPROVALS_LEGACY_OPTIONS, createApprovalsController } from '../../controllers/approvals-controller.js';
import { createApprovalsRepository } from '../../services/firebase/firebase-approvals-repository.js';
import { APPROVAL_MESSAGES } from '../../domain/auth/approval-policy.js';
import { createFakeDatabase, createFakeDom } from './approvals-fakes.mjs';

/**
 * Comportamiento DECIDIDO del controlador de aprobaciones (plan maestro §4 ter, 2026-10-06), con los valores POR
 * DEFECTO (sin `APPROVALS_LEGACY_OPTIONS`):
 *  - D7: doble clic -> una sola escritura (estado `isSubmitting` por fila y botones deshabilitados desde el primer
 *        clic); rol validado en el cliente (usuarios: solo Admin; permisos: Admin/Supervisor; sin usuario: denegado).
 *  - D2: el rol (y todo dato del usuario o de Firebase) llega escapado al HTML de la tabla.
 *  - D9a: filtro "Rechazados" (opción creada en el `<select>` existente), filas con motivo y acciones Revertir/Aprobar,
 *         y `revertRejectedUser` escribe `{approved: false, rejectionReason: null}`.
 * Cada prueba que contrasta con app.js lo hace contra `APPROVALS_LEGACY_OPTIONS` (diferencia intencional).
 */
const { testAsync, summarizeAsync } = createRunner('approvals-controller.js (decisiones D2, D7 y D9a por defecto)');

const settle = () => new Promise((resolve) => setImmediate(resolve));
const ADMIN = { role: 'Admin', uid: 'admin1' };
const SUPERVISOR = { role: 'Supervisor', uid: 'sup1' };
const GESTOR = { role: 'Gestor', uid: 'g1' };

/** Botón simulado (solo lo que usa `setApprovalButtonsDisabled`). */
function fakeButton() {
    return { disabled: false };
}

/**
 * Mundo de prueba: DOM simulado (con `<select>` real-ish y contenedores con botones), base simulada y registro de
 * alertas/confirmaciones. `user` es lo que devuelve `getUser` (por defecto Admin).
 */
function makeWorld({ tree = {}, failOn = [], confirmAnswer = true, user = ADMIN, withGetUser = true, status = 'Todos', search = '', options = {}, delayUpdates = false } = {}) {
    const dom = createFakeDom();
    const database = createFakeDatabase(JSON.parse(JSON.stringify(tree)), { failOn });
    const log = [];
    const timers = [];

    if (delayUpdates) {
        // Las escrituras quedan pendientes hasta `release()`: permite observar el estado "en vuelo".
        const originalRef = database.ref.bind(database);
        database.pending = [];
        database.ref = (path) => {
            const ref = originalRef(path);
            const update = ref.update;
            ref.update = (data) => new Promise((resolve, reject) => {
                database.pending.push(() => update(data).then(resolve, reject));
            });
            return ref;
        };
        database.release = () => database.pending.splice(0).forEach((fn) => fn());
    }

    const usersBody = dom.add('pendingUsersTableBody');
    const table = dom.add('usersTable');
    const panel = dom.add('usersPanel');
    dom.nest(usersBody, table);
    dom.nest(table, panel);
    dom.add('pendingPermissionsTableBody');
    dom.add('filterAprobacionesSearch', { value: search });

    // `<select>` con `options` como el de index.html 364-368 (Todos / Pendiente / Aprobado).
    const selectOptions = [{ value: 'Todos' }, { value: 'Pendiente' }, { value: 'Aprobado' }];
    dom.add('filterAprobacionesStatus', {
        value: status,
        options: selectOptions,
        appendChild(child) { selectOptions.push(child); return child; }
    });

    const deps = {
        doc: dom.doc,
        repository: createApprovalsRepository({ database }),
        alert: (m) => log.push(['alert', m]),
        confirm: (m) => { log.push(['confirm', m]); return confirmAnswer; },
        now: () => new Date('2026-10-06T12:00:00.000Z'),
        schedule: (fn, ms) => { timers.push({ fn, ms }); },
        logger: { error: (e) => log.push(['error', (e && e.message) || String(e)]) },
        onPermissionUpdated: () => { log.push(['loadPermisos']); },
        ...(withGetUser ? { getUser: () => user } : {}),
        ...options
    };

    const api = createApprovalsController(deps);

    /** Agrega un contenedor de acciones con `n` botones; devuelve los botones. */
    function addButtons(id, n = 2) {
        const buttons = Array.from({ length: n }, fakeButton);
        dom.add(id, { querySelectorAll: (sel) => (sel === 'button' ? buttons : []) });
        return buttons;
    }

    return { dom, database, log, timers, api, addButtons, selectOptions };
}

const updates = (w) => w.database.calls.filter((c) => c.op === 'update');
const reads = (w) => w.database.calls.filter((c) => c.op === 'once');
const alerts = (w) => w.log.filter((e) => e[0] === 'alert').map((e) => e[1]);
const confirms = (w) => w.log.filter((e) => e[0] === 'confirm');
const html = (w) => w.dom.doc.getElementById('pendingUsersTableBody').innerHTML;

const U = (id, extra) => ({ [id]: { name: 'Ana Gómez', email: `${id}@virtualsoft.tech`, role: 'Gestor', approved: false, registrationDate: '2026-10-01T10:00:00.000Z', ...extra } });
const USERS = {
    users: {
        ...U('u1'),
        ...U('u2', { approved: true, approvalDate: '2026-10-02T09:30:00.000Z' }),
        ...U('u3', { approved: 'Rechazado', rejectionReason: 'Datos incompletos', name: 'Rita Rechazada', registrationDate: '2026-09-20T10:00:00.000Z' }),
        ...U('u5', { approved: 'Rechazado', name: 'Raúl Rechazado', registrationDate: '2026-09-25T10:00:00.000Z' })
    }
};
const P = (id, extra) => ({ [id]: { uid: 'g1', gestor: 'Ana Gómez', tipo: 'Cita médica', fecha: '2026-10-10', horaInicio: '08:00', horaFin: '10:00', motivo: 'Control', status: 'Pendiente', id: 1760000000000, ...extra } });
const PERMS = { permissions: { ...P('p1'), ...P('p2') } };

function addPermBoxes(w, id = 'p1', approveReason = '', rejectReason = 'Sin soporte') {
    const buttons = [...w.addButtons('perm-action-btns-' + id), ...w.addButtons('perm-approve-box-' + id), ...w.addButtons('perm-reject-box-' + id)];
    w.dom.add('perm-approve-reason-' + id, { value: approveReason });
    w.dom.add('perm-reason-' + id, { value: rejectReason });
    return buttons;
}

// =============================================================================================
// D7 — doble clic: una sola escritura
// =============================================================================================
testAsync('D7 doble clic en "Aprobar" usuario: UNA confirmación, UNA escritura, UNA alerta (app.js: dos de cada una)', async () => {
    const w = makeWorld({ tree: USERS });
    await Promise.all([w.api.approveUser('u1'), w.api.approveUser('u1')]);
    await settle();

    assert.equal(confirms(w).length, 1);
    assert.deepEqual(updates(w), [{ op: 'update', path: 'users/u1', data: { approved: true, approvalDate: '2026-10-06T12:00:00.000Z' } }]);
    assert.deepEqual(alerts(w), [APPROVAL_MESSAGES.USER_APPROVED]);

    // Contraste explícito con app.js (opciones legacy): dos escrituras.
    const legacy = makeWorld({ tree: USERS, options: APPROVALS_LEGACY_OPTIONS });
    await Promise.all([legacy.api.approveUser('u1'), legacy.api.approveUser('u1')]);
    assert.equal(updates(legacy).length, 2);
});

testAsync('D7 doble clic en "Confirmar Rechazo" de permiso: una escritura y una alerta', async () => {
    const w = makeWorld({ tree: PERMS });
    addPermBoxes(w);
    await Promise.all([w.api.confirmRejectPerm('p1'), w.api.confirmRejectPerm('p1')]);

    assert.deepEqual(updates(w), [{ op: 'update', path: 'permissions/p1', data: { status: 'Rechazado', notified: false, rejectionReason: 'Sin soporte' } }]);
    assert.deepEqual(alerts(w), ['Permiso Rechazado exitosamente.']);
});

testAsync('D7 doble clic en "Confirmar Aprobar" de permiso y en "Confirmar" rechazo de usuario: una escritura cada uno', async () => {
    const w = makeWorld({ tree: { ...PERMS, ...USERS } });
    addPermBoxes(w, 'p1', 'ok');
    w.dom.add('user-reason-u1', { value: 'motivo' });

    await Promise.all([w.api.confirmApprovePerm('p1'), w.api.confirmApprovePerm('p1'), w.api.confirmRejectUser('u1'), w.api.confirmRejectUser('u1')]);

    assert.deepEqual(updates(w).map((c) => c.path), ['permissions/p1', 'users/u1']);
});

testAsync('D7 dos botones distintos de la MISMA fila (Aprobar y Revertir) no escriben dos veces', async () => {
    const w = makeWorld({ tree: USERS });
    await Promise.all([w.api.approveUser('u3'), w.api.revertRejectedUser('u3')]);

    assert.equal(updates(w).length, 1);
    assert.deepEqual(updates(w)[0].data.approved, true);
});

testAsync('D7 filas distintas no se bloquean entre sí', async () => {
    const w = makeWorld({ tree: PERMS });
    await Promise.all([w.api.updatePermissionStatus('p1', 'Aprobado', 'x'), w.api.updatePermissionStatus('p2', 'Aprobado', 'x')]);

    assert.equal(updates(w).length, 2);
});

testAsync('D7 los botones de la fila quedan deshabilitados desde el primer clic y se rehabilitan al terminar', async () => {
    const w = makeWorld({ tree: PERMS, delayUpdates: true });
    const buttons = addPermBoxes(w);

    const pending = w.api.confirmRejectPerm('p1');
    await settle();
    assert.equal(w.api.isSubmitting(), true);
    assert.ok(buttons.every((b) => b.disabled === true), 'deshabilitados durante la escritura');

    // Un segundo clic durante la escritura no agrega nada.
    await w.api.confirmRejectPerm('p1');
    assert.equal(w.database.pending.length, 1);

    w.database.release();
    await pending;
    assert.equal(w.api.isSubmitting(), false);
    assert.ok(buttons.every((b) => b.disabled === false), 'rehabilitados al terminar');
});

testAsync('D7 si la escritura FALLA se libera la guarda y los botones (se puede reintentar)', async () => {
    const w = makeWorld({ tree: PERMS, failOn: [{ op: 'update' }] });
    const buttons = addPermBoxes(w);

    await w.api.confirmRejectPerm('p1');
    assert.ok(buttons.every((b) => b.disabled === false));
    await w.api.confirmRejectPerm('p1');

    assert.equal(updates(w).length, 2);
    assert.deepEqual(alerts(w), [APPROVAL_MESSAGES.SERVER_ERROR, APPROVAL_MESSAGES.SERVER_ERROR]);
});

testAsync('D7 cancelar el confirm de "Aprobar" usuario rehabilita los botones y no escribe', async () => {
    const w = makeWorld({ tree: USERS, confirmAnswer: false });
    const buttons = w.addButtons('user-action-btns-u1');

    await w.api.approveUser('u1');

    assert.equal(updates(w).length, 0);
    assert.ok(buttons.every((b) => b.disabled === false));
    assert.equal(w.api.isSubmitting(), false);
});

testAsync('D7 tras terminar, un nuevo clic legítimo sí escribe (la guarda no es permanente)', async () => {
    const w = makeWorld({ tree: USERS });
    await w.api.approveUser('u1');
    await w.api.approveUser('u1');

    assert.equal(updates(w).length, 2);
});

// =============================================================================================
// D7 — rol validado en el cliente (enforcePolicy por defecto)
// =============================================================================================
testAsync('D7 un Gestor no escribe NADA (usuarios ni permisos) y ve "No tienes permiso..." sin confirmaciones', async () => {
    const w = makeWorld({ tree: { ...USERS, ...PERMS }, user: GESTOR });
    addPermBoxes(w, 'p1', 'ok', 'motivo');
    w.dom.add('user-reason-u1', { value: 'motivo' });

    await w.api.approveUser('u1');
    await w.api.confirmRejectUser('u1');
    await w.api.revertRejectedUser('u3');
    await w.api.confirmApprovePerm('p1');
    await w.api.confirmRejectPerm('p1');
    await w.api.updatePermissionStatus('p1', 'Aprobado');

    assert.equal(updates(w).length, 0);
    assert.equal(confirms(w).length, 0);
    assert.deepEqual(alerts(w), Array(6).fill(APPROVAL_MESSAGES.NOT_ALLOWED));
});

testAsync('D7 un Supervisor decide permisos pero NO aprueba/rechaza/revierte usuarios (igual que las reglas)', async () => {
    const w = makeWorld({ tree: { ...USERS, ...PERMS }, user: SUPERVISOR });
    addPermBoxes(w);
    w.dom.add('user-reason-u1', { value: 'motivo' });

    await w.api.approveUser('u1');
    await w.api.confirmRejectUser('u1');
    await w.api.revertRejectedUser('u3');
    await w.api.confirmRejectPerm('p1');

    assert.deepEqual(updates(w).map((c) => c.path), ['permissions/p1']);
    assert.deepEqual(alerts(w).slice(0, 3), Array(3).fill(APPROVAL_MESSAGES.NOT_ALLOWED));
});

testAsync('D7 sin getUser, o con usuario null, se DENIEGA (seguro por omisión)', async () => {
    const noDep = makeWorld({ tree: USERS, withGetUser: false });
    await noDep.api.approveUser('u1');
    await noDep.api.updatePermissionStatus('p1', 'Aprobado');
    assert.equal(updates(noDep).length, 0);

    const nullUser = makeWorld({ tree: USERS, user: null });
    await nullUser.api.approveUser('u1');
    assert.equal(updates(nullUser).length, 0);
    assert.deepEqual(alerts(nullUser), [APPROVAL_MESSAGES.NOT_ALLOWED]);
});

testAsync('D7 un Admin con la cuenta NO aprobada (approved:false o "Rechazado") no escribe; con approved ausente sí (sesión de login.js)', async () => {
    for (const approved of [false, 'Rechazado']) {
        const w = makeWorld({ tree: USERS, user: { role: 'Admin', approved } });
        await w.api.approveUser('u1');
        assert.equal(updates(w).length, 0, String(approved));
    }

    // login.js guarda la sesión sin `approved` (solo deja entrar cuentas aprobadas): se trata como aprobada.
    const w = makeWorld({ tree: USERS, user: { role: 'Admin' } });
    await w.api.approveUser('u1');
    assert.equal(updates(w).length, 1);
});

testAsync('D7 el rol se lee en CADA acción (si cambia en vivo, la siguiente acción lo respeta)', async () => {
    let current = ADMIN;
    const w = makeWorld({ tree: USERS, options: { getUser: () => current } });

    await w.api.approveUser('u1');
    current = GESTOR;
    await w.api.approveUser('u1');

    assert.equal(updates(w).length, 1);
});

// =============================================================================================
// D2 — XSS: el HTML de la tabla de usuarios no inyecta datos sin escapar
// =============================================================================================
const PAYLOADS = ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '" onmouseover="alert(1)', "' onfocus='alert(1)", '</td><svg onload=alert(1)>'];

testAsync('D2 / W-52 rol con <script>, <img onerror>, comillas y cierre de etiqueta: se escapa en la insignia SIEMPRE, también con APPROVALS_LEGACY_OPTIONS (app.js no)', async () => {
    for (const role of PAYLOADS) {
        const tree = { users: { x1: { name: 'Ana', email: 'a@virtualsoft.tech', role, approved: false, registrationDate: '2026-10-01T10:00:00Z' }, x2: { name: 'Bo', role, approved: true } } };
        const w = makeWorld({ tree });
        await w.api.renderPendingUsers();
        const out = html(w);

        assert.ok(!out.includes(role), 'el payload crudo no debe aparecer: ' + role);
        assert.ok(!/<script|<img|<svg/i.test(out), 'sin etiquetas inyectadas: ' + role);
        assert.ok(!/" onmouseover="|' onfocus='/.test(out), 'sin atributos inyectados: ' + role);

        // W-52: las opciones legadas ya no apagan el escape (la inserción cruda de app.js se prueba en
        // approvals-controller.test.mjs contra la copia literal)
        const legacy = makeWorld({ tree, options: APPROVALS_LEGACY_OPTIONS });
        await legacy.api.renderPendingUsers();
        assert.ok(!html(legacy).includes(role), 'con APPROVALS_LEGACY_OPTIONS tampoco aparece crudo: ' + role);
    }
});

testAsync('D2 nombre, correo, fechas, id y motivo de rechazo con payloads: nada llega crudo al HTML (vista Todos y Rechazados)', async () => {
    for (const payload of PAYLOADS) {
        const users = {
            [`k${payload}`]: { name: payload, email: payload, role: 'Gestor', approved: false, registrationDate: payload, approvalDate: payload },
            [`r${payload}`]: { name: payload, email: payload, role: payload, approved: 'Rechazado', rejectionReason: payload }
        };
        for (const status of ['Todos', 'Rechazado']) {
            const w = makeWorld({ tree: { users }, status });
            await w.api.renderPendingUsers();
            const out = html(w);

            assert.ok(!/<script|<img|<svg/i.test(out), `${status}: sin etiquetas inyectadas (${payload})`);
            assert.ok(!/" onmouseover="|' onfocus='/.test(out), `${status}: sin atributos inyectados (${payload})`);
        }
    }
});

testAsync('D2 el id con comillas se codifica en los onclick de Revertir/Aprobar (no rompe el atributo)', async () => {
    const tree = { users: { "a'b\"c": { name: 'X', approved: 'Rechazado', rejectionReason: 'r' } } };
    const w = makeWorld({ tree, status: 'Rechazado' });
    await w.api.renderPendingUsers();

    assert.ok(html(w).includes('data-action="revert-rejected-user" data-user-id="a&#039;b&quot;c"'));
    assert.ok(!html(w).includes('onclick='), 'ningún onclick inline');
    assert.ok(html(w).includes('data-action="approve-user" data-user-id="a&#039;b&quot;c"'));
    assert.ok(html(w).includes('id="user-rejected-actions-a&#039;b&quot;c"'));
});

// =============================================================================================
// D9a — usuarios rechazados: filtro, filas y reversión
// =============================================================================================
testAsync('D9a renderPendingUsers agrega UNA vez la opción "Rechazados" al selector existente (idempotente); legacy no', async () => {
    const w = makeWorld({ tree: USERS });
    await w.api.renderPendingUsers();
    await w.api.renderPendingUsers();

    const added = w.selectOptions.filter((o) => o.value === 'Rechazado');
    assert.equal(added.length, 1);
    assert.equal(added[0].textContent, 'Rechazados');
    assert.equal(added[0].style.color, 'black');

    const legacy = makeWorld({ tree: USERS, options: APPROVALS_LEGACY_OPTIONS });
    await legacy.api.renderPendingUsers();
    assert.equal(legacy.selectOptions.length, 3);
});

testAsync('D9a con "Todos" la tabla es idéntica a app.js para datos normales (los rechazados siguen fuera de Todos)', async () => {
    const w = makeWorld({ tree: USERS });
    const legacy = makeWorld({ tree: USERS, options: APPROVALS_LEGACY_OPTIONS });
    await w.api.renderPendingUsers();
    await legacy.api.renderPendingUsers();

    assert.equal(html(w), html(legacy));
    assert.ok(!html(w).includes('Rita Rechazada'));
});

testAsync('D9a filtro "Rechazado": solo rechazados, más reciente primero, con motivo y botones Revertir/Aprobar', async () => {
    const w = makeWorld({ tree: USERS, status: 'Rechazado' });
    await w.api.renderPendingUsers();
    const out = html(w);

    assert.equal((out.match(/<tr /g) || []).length, 2);
    assert.ok(out.indexOf('Raúl Rechazado') < out.indexOf('Rita Rechazada'), 'orden por fecha de registro');
    assert.ok(!out.includes('u1@virtualsoft') && !out.includes('u2@virtualsoft'), 'sin pendientes ni aprobados');
    assert.ok(out.includes('Motivo: Datos incompletos') && out.includes('Motivo: No especificado'));
    assert.ok(out.includes('data-action="revert-rejected-user" data-user-id="u3"') && out.includes('data-action="approve-user" data-user-id="u3"'));
});

testAsync('D9a filtro "Rechazado" con más de 5: no recorta ni muestra el aviso; la búsqueda aplica', async () => {
    const users = {};
    for (let i = 0; i < 8; i += 1) Object.assign(users, U('r' + i, { approved: 'Rechazado', name: i === 3 ? 'Ángela Ruiz' : 'Rech ' + i }));
    const w = makeWorld({ tree: { users }, status: 'Rechazado' });
    await w.api.renderPendingUsers();
    assert.equal((html(w).match(/<tr /g) || []).length, 8);
    w.timers.forEach((t) => t.fn());
    assert.equal(w.dom.doc.getElementById('pendingMostrandoMsg'), null);

    const s = makeWorld({ tree: { users }, status: 'Rechazado', search: 'angela' });
    await s.api.renderPendingUsers();
    assert.equal((html(s).match(/<tr /g) || []).length, 1);
});

testAsync('D9a filtro "Rechazado" sin rechazados -> "No hay usuarios que coincidan con los filtros."', async () => {
    const w = makeWorld({ tree: { users: U('u1') }, status: 'Rechazado' });
    await w.api.renderPendingUsers();

    assert.ok(html(w).includes('No hay usuarios que coincidan con los filtros.'));
});

testAsync('D9a revertRejectedUser: confirma, escribe {approved:false, rejectionReason:null}, avisa y recarga', async () => {
    const w = makeWorld({ tree: USERS });
    await w.api.revertRejectedUser('u3');
    await settle();

    assert.deepEqual(confirms(w), [['confirm', APPROVAL_MESSAGES.CONFIRM_REVERT_USER]]);
    assert.deepEqual(updates(w), [{ op: 'update', path: 'users/u3', data: { approved: false, rejectionReason: null } }]);
    assert.deepEqual(alerts(w), [APPROVAL_MESSAGES.USER_REVERTED]);
    assert.equal(reads(w).length, 1, 'recarga la tabla');
});

testAsync('D9a revertRejectedUser: cancelar no escribe; un fallo muestra "Error al contactar al servidor" y no recarga', async () => {
    const cancel = makeWorld({ tree: USERS, confirmAnswer: false });
    await cancel.api.revertRejectedUser('u3');
    assert.equal(updates(cancel).length, 0);

    const fail = makeWorld({ tree: USERS, failOn: [{ op: 'update' }] });
    await fail.api.revertRejectedUser('u3');
    await settle();
    assert.deepEqual(alerts(fail), [APPROVAL_MESSAGES.SERVER_ERROR]);
    assert.equal(reads(fail).length, 0);
});

testAsync('D9a "Aprobar" desde la fila de rechazado reutiliza approveUser: {approved:true, approvalDate}', async () => {
    const w = makeWorld({ tree: USERS });
    await w.api.approveUser('u3');

    assert.deepEqual(updates(w), [{ op: 'update', path: 'users/u3', data: { approved: true, approvalDate: '2026-10-06T12:00:00.000Z' } }]);
});

testAsync('D9a llave vacía en revertRejectedUser: el repositorio la rechaza antes de tocar Firebase', async () => {
    const w = makeWorld({ tree: USERS });
    await w.api.revertRejectedUser('');

    assert.equal(updates(w).length, 0);
    assert.deepEqual(alerts(w), [APPROVAL_MESSAGES.SERVER_ERROR]);
});

testAsync('D9a con las opciones legacy, revertRejectedUser no hace nada y "Rechazado" se comporta como en app.js', async () => {
    const w = makeWorld({ tree: USERS, status: 'Rechazado', options: APPROVALS_LEGACY_OPTIONS });
    await w.api.revertRejectedUser('u3');
    assert.equal(w.database.calls.length, 0);

    await w.api.renderPendingUsers();
    // app.js trata el valor desconocido como "sin filtro de estado": pendientes + aprobados, sin rechazados.
    assert.ok(html(w).includes('u1@virtualsoft') && !html(w).includes('Rita Rechazada'));
});

summarizeAsync().then(() => {});
