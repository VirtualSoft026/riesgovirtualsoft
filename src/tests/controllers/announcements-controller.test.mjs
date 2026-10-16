import { createRunner, assert } from '../test-harness.mjs';
import { createFakeRtdb } from '../helpers/fake-rtdb-comunicados.mjs';
import { createFakeDocument } from '../helpers/fake-dom-comunicados.mjs';
import { createRealRulesAdapter, loadRealRules } from '../helpers/reglas-reales-comunicados.mjs';
import { createAnnouncementRepository } from '../../services/firebase/firebase-announcement-repository.js';
import {
    DEFAULT_OPTIONS,
    LEGACY_OPTIONS,
    createAnnouncementsController,
    resolveAnnouncementOptions,
    URGENT_BUTTON_BUSY_HTML,
    URGENT_BUTTON_IDLE_HTML
} from '../../controllers/announcements-controller.js';
import { ANNOUNCEMENT_MESSAGES } from '../../domain/announcements/announcement-service.js';

const { test, testAsync, summarizeAsync } = createRunner('announcements-controller (comunicados con base y DOM simulados)');

const NOW = Date.UTC(2026, 10, 6, 15, 0, 0);

/** Reglas de database.rules.json para `announcements` (usuarios aprobados), expresadas como función. */
function announcementRules(roleOf, uidOf) {
    return {
        canRead: () => true,
        canWrite(op, path, newValue, oldValue) {
            const role = roleOf();
            const uid = uidOf();
            const readBy = /^announcements\/([^/]+)\/readBy\/([^/]+)$/.exec(path);
            if (readBy) return readBy[2] === uid && oldValue === null && newValue !== null && typeof newValue.readAt === 'string'; // escribir UNA vez
            const ann = /^announcements\/([^/]+)$/.exec(path);
            if (ann) {
                if (role === 'Admin') return true;
                return role === 'Supervisor' && oldValue === null && newValue !== null && !('readBy' in newValue)
                    && ['title', 'content', 'date', 'author', 'authorUid'].every((k) => typeof newValue[k] === 'string') && newValue.authorUid === uid;
            }
            return false;
        }
    };
}

function setup({ user = { uid: 'g1', name: 'Ana', role: 'Gestor', email: 'ana@virtualsoft.tech' }, data = {}, options = {}, missing = [] } = {}) {
    const db = createFakeRtdb({ data, clock: () => NOW });
    const document = createFakeDocument({ missing });
    const alerts = [];
    const warns = [];
    const errors = [];
    const timers = [];
    const closed = [];
    const state = { user, authUser: user ? { uid: user.uid } : null };
    db.rules = announcementRules(() => state.user && state.user.role, () => state.authUser && state.authUser.uid);
    const controller = createAnnouncementsController({
        repository: createAnnouncementRepository({ database: db }),
        document,
        getUser: () => state.user,
        getAuthUser: () => state.authUser,
        now: () => NOW,
        alert: (m) => alerts.push(m),
        closeModal: (id) => closed.push(id),
        setTimeout: (fn, ms) => timers.push({ fn, ms }),
        logger: { warn: (...a) => warns.push(a), error: (...a) => errors.push(a) },
        options
    });
    return { db, document, controller, alerts, warns, errors, timers, closed, state };
}

const ANN = () => ({
    '-A1': { title: 'Primero', content: '<p>uno</p>', date: '2026-10-01T10:00:00.000Z', author: 'Sara', authorUid: 's1' },
    '-A2': { title: 'Segundo', content: '<p>dos</p>', date: '2026-10-02T10:00:00.000Z', author: 'Sara', authorUid: 's1' }
});

test('initListener: carga los comunicados, actualiza la insignia y abre el modal urgente con el más antiguo', () => {
    const t = setup({ data: { announcements: ANN() } });
    t.controller.initListener();
    const badge = t.document.el('unreadAnnouncementsBadge');
    assert.equal(badge.textContent, 2);
    assert.equal(badge.style.display, 'inline-block');
    assert.equal(t.document.isActive('urgentAnnouncementModal'), true);
    assert.equal(t.document.el('urgentAnnouncementTitle').innerText, 'Primero');
    assert.equal(t.document.el('urgentAnnouncementBody').innerHTML, '<p>uno</p>');
});

test('initListener: solo repinta las vistas que están abiertas (display === "block")', () => {
    const t = setup({ data: { announcements: ANN() } });
    t.document.el('view-comunicados').style.display = 'block';
    t.document.el('view-gestion-comunicados').style.display = 'none';
    t.controller.initListener();
    assert.ok(t.document.el('gestorComunicadosList').innerHTML.includes('Primero'));
    assert.equal(t.document.el('adminComunicadosTableBody').innerHTML, '');
});

test('initListener: el listener reacciona a cambios en vivo y se puede cancelar', () => {
    const t = setup({ data: { announcements: ANN() } });
    const off = t.controller.initListener();
    t.db.rules = null; // aquí no se prueban reglas, solo la reacción en vivo
    t.document.el('view-comunicados').style.display = 'block';
    t.db.ref('announcements/-A3').set({ title: 'Tercero', content: 'c', date: '2026-10-03T10:00:00.000Z', author: 'Sara', authorUid: 's1' });
    assert.equal(t.document.el('unreadAnnouncementsBadge').textContent, 3);
    assert.ok(t.document.el('gestorComunicadosList').innerHTML.includes('Tercero'));
    off();
    assert.equal(t.db.listenerCount('announcements'), 0);
});

test('insignia: Admin y Supervisor nunca la ven; el Gestor con todo leído tampoco', () => {
    for (const role of ['Admin', 'Supervisor']) {
        const t = setup({ user: { uid: 'x', name: 'N', role }, data: { announcements: ANN() } });
        t.controller.initListener();
        assert.equal(t.document.el('unreadAnnouncementsBadge').style.display, 'none');
    }
    const data = { announcements: ANN() };
    data.announcements['-A1'].readBy = { g1: { name: 'Ana', readAt: 'x' } };
    data.announcements['-A2'].readBy = { g1: { name: 'Ana', readAt: 'x' } };
    const t = setup({ data });
    t.controller.initListener();
    assert.equal(t.document.el('unreadAnnouncementsBadge').style.display, 'none');
    assert.equal(t.document.isActive('urgentAnnouncementModal'), false);
});

test('insignia: sin elemento en la página no falla', () => {
    const t = setup({ data: { announcements: ANN() }, missing: ['unreadAnnouncementsBadge'] });
    t.controller.initListener();
    assert.ok(true);
});

testAsync('markAsRead: escribe readBy/{uid} con nombre y fecha; el listener refresca insignia y avanza el urgente', async () => {
    const t = setup({ data: { announcements: ANN() } });
    t.controller.initListener();
    const ok = await t.controller.markAsRead('-A1');
    assert.equal(ok, true);
    assert.deepEqual(t.db.snapshot('announcements/-A1/readBy/g1'), { name: 'Ana', readAt: new Date(NOW).toISOString() });
    assert.equal(t.document.el('unreadAnnouncementsBadge').textContent, 1);
});

testAsync('doble lectura con options.legacy (comportamiento original de app.js): la regla de Firebase (escritura única) rechaza la segunda y se avisa "Error al marcar como leído."', async () => {
    const t = setup({ data: { announcements: ANN() }, options: { legacy: true } });
    t.controller.initListener();
    assert.equal(await t.controller.markAsRead('-A1'), true);
    assert.equal(await t.controller.markAsRead('-A1'), false);
    assert.deepEqual(t.alerts, [ANNOUNCEMENT_MESSAGES.READ_ERROR]);
    assert.equal(Object.keys(t.db.snapshot('announcements/-A1/readBy')).length, 1, 'no se duplica el lector');
});

testAsync('D4 (predeterminado): doble lectura -> la segunda es un no-op por la comprobación previa (sin error, sin segunda escritura, sin duplicar)', async () => {
    const t = setup({ data: { announcements: ANN() } });
    t.controller.initListener();
    await t.controller.markAsRead('-A1');
    const writes = t.db.log.filter((l) => l.path === 'announcements/-A1/readBy/g1').length;
    assert.equal(await t.controller.markAsRead('-A1'), true);
    assert.equal(t.db.log.filter((l) => l.path === 'announcements/-A1/readBy/g1').length, writes);
    assert.deepEqual(t.alerts, []);
    assert.equal(Object.keys(t.db.snapshot('announcements/-A1/readBy')).length, 1);
});

testAsync('markAsRead: sin usuario o sin nombre el SDK rechaza (undefined) y se avisa; no deja nada escrito', async () => {
    const t = setup({ user: { uid: 'g1', role: 'Gestor' }, data: { announcements: ANN() } }); // sin name
    t.controller.initListener();
    assert.equal(await t.controller.markAsRead('-A1'), false);
    assert.deepEqual(t.alerts, [ANNOUNCEMENT_MESSAGES.READ_ERROR]);
    assert.equal(t.db.snapshot('announcements/-A1/readBy'), null);
});

testAsync('cola de urgentes: marcar el actual cierra el modal y a los 500 ms muestra el siguiente; con todo leído queda cerrado', async () => {
    const t = setup({ data: { announcements: ANN() } });
    t.controller.initListener();
    assert.equal(t.document.el('urgentAnnouncementTitle').innerText, 'Primero');
    await t.document.el('btnUrgentUnderstand').onclick();
    assert.equal(t.document.isActive('urgentAnnouncementModal'), false);
    assert.equal(t.document.el('btnUrgentUnderstand').innerHTML, URGENT_BUTTON_IDLE_HTML);
    assert.equal(t.document.el('btnUrgentUnderstand').disabled, false);
    assert.equal(t.timers.length, 1);
    assert.equal(t.timers[0].ms, 500);
    t.timers[0].fn();
    assert.equal(t.document.isActive('urgentAnnouncementModal'), true);
    assert.equal(t.document.el('urgentAnnouncementTitle').innerText, 'Segundo');
    await t.document.el('btnUrgentUnderstand').onclick();
    t.timers[1].fn();
    assert.equal(t.document.isActive('urgentAnnouncementModal'), false);
});

testAsync('urgente: mientras se registra el botón queda deshabilitado con "Registrando..."', async () => {
    const t = setup({ data: { announcements: ANN() } });
    t.controller.initListener();
    const p = t.controller.markUrgentAsRead('-A1');
    assert.equal(t.document.el('btnUrgentUnderstand').innerHTML, URGENT_BUTTON_BUSY_HTML);
    assert.equal(t.document.el('btnUrgentUnderstand').disabled, true);
    await p;
    assert.equal(t.document.el('btnUrgentUnderstand').disabled, false);
});

testAsync('urgente con escritura rechazada SIN lectura previa: el original (legacy) cierra el modal igual (y reaparece a los 500 ms); el predeterminado (D4) lo deja abierto', async () => {
    for (const keep of [false, true]) {
        const t = setup({ data: { announcements: ANN() }, options: keep ? {} : { legacy: true } });
        t.db.rules.canWrite = () => false; // el servidor rechaza todo
        t.controller.initListener();
        await t.controller.markUrgentAsRead('-A1');
        assert.deepEqual(t.alerts, [ANNOUNCEMENT_MESSAGES.READ_ERROR]);
        assert.equal(t.document.isActive('urgentAnnouncementModal'), keep, `keep=${keep}`);
        assert.equal(t.timers.length, keep ? 0 : 1);
        assert.equal(t.document.el('btnUrgentUnderstand').disabled, false);
    }
});

test('urgente: no pisa el modal que ya está abierto ni actúa sin uid', () => {
    const t = setup({ data: { announcements: ANN() } });
    t.document.el('urgentAnnouncementModal').classList.add('active');
    t.document.el('urgentAnnouncementTitle').innerText = 'YA ABIERTO';
    t.controller.initListener();
    assert.equal(t.document.el('urgentAnnouncementTitle').innerText, 'YA ABIERTO');
    const t2 = setup({ user: { name: 'sin uid', role: 'Gestor' }, data: { announcements: ANN() } });
    t2.controller.initListener();
    assert.equal(t2.document.isActive('urgentAnnouncementModal'), false);
});

test('urgente: el contenido malicioso se sanitiza; título y autor se asignan como texto', () => {
    const data = { announcements: { k: { title: '<img src=x onerror=alert(1)>', author: '<b>a</b>', content: '<script>alert(2)</script><p onclick="x()">c</p><a href="javascript:alert(3)">l</a>', date: '2026-10-01T00:00:00.000Z' } } };
    const t = setup({ data });
    t.controller.initListener();
    const body = t.document.el('urgentAnnouncementBody').innerHTML;
    assert.ok(!body.includes('<script') && !/onclick/i.test(body) && !/href="javascript/i.test(body));
    assert.equal(t.document.el('urgentAnnouncementTitle').innerText, '<img src=x onerror=alert(1)>');
});

testAsync('publicar: Admin/Supervisor publican con el payload exacto; se cierra el modal y se avisa', async () => {
    for (const role of ['Admin', 'Supervisor']) {
        const t = setup({ user: { uid: 'u1', name: 'Sara', role }, data: {} });
        t.document.el('comunicadoTitle').value = '  Aviso  ';
        t.document.el('comunicadoContent').innerHTML = ' <p onclick="x()">Hola</p> <script>alert(1)</script> ';
        await t.controller.save();
        const stored = Object.values(t.db.snapshot('announcements'))[0];
        assert.equal(stored.title, 'Aviso');
        assert.ok(!stored.content.includes('<script') && !/onclick/.test(stored.content));
        assert.equal(stored.author, 'Sara');
        assert.equal(stored.authorUid, 'u1');
        assert.equal(stored.date, new Date(NOW).toISOString());
        assert.deepEqual(t.alerts, [ANNOUNCEMENT_MESSAGES.PUBLISHED]);
        assert.deepEqual(t.closed, ['newComunicadoModal']);
    }
});

testAsync('publicar: Gestor o sin usuario son rechazados con aviso y sin escribir; campos vacíos avisan', async () => {
    const g = setup({ data: {} });
    await g.controller.save();
    assert.deepEqual(g.alerts, [ANNOUNCEMENT_MESSAGES.NOT_ALLOWED_PUBLISH]);
    assert.equal(g.db.snapshot('announcements'), null);
    assert.equal(g.warns[0][0], 'saveNewComunicado: rol no autorizado');
    const n = setup({ user: null, data: {} });
    await n.controller.save();
    assert.deepEqual(n.alerts, [ANNOUNCEMENT_MESSAGES.NOT_ALLOWED_PUBLISH]);
    const a = setup({ user: { uid: 'a', name: 'A', role: 'Admin' }, data: {} });
    a.document.el('comunicadoTitle').value = '   ';
    a.document.el('comunicadoContent').innerHTML = '<p>x</p>';
    await a.controller.save();
    assert.deepEqual(a.alerts, [ANNOUNCEMENT_MESSAGES.MISSING_FIELDS]);
    assert.equal(a.db.snapshot('announcements'), null);
});

testAsync('publicar: si la base lo rechaza, se avisa "Error al publicar." y el modal NO se cierra', async () => {
    const t = setup({ user: { uid: 'a', name: 'A', role: 'Admin' }, data: {} });
    t.db.rules.canWrite = () => false;
    t.document.el('comunicadoTitle').value = 'T';
    t.document.el('comunicadoContent').innerHTML = '<p>x</p>';
    await t.controller.save();
    assert.deepEqual(t.alerts, [ANNOUNCEMENT_MESSAGES.PUBLISH_ERROR]);
    assert.deepEqual(t.closed, []);
    assert.equal(t.errors.length, 1);
});

testAsync('publicar: authorUid sale de la sesión de Firebase (auth.uid), no del uid guardado en el usuario local', async () => {
    const t = setup({ user: { uid: 'local-1', name: 'Sara', role: 'Supervisor' }, data: {} });
    t.state.authUser = { uid: 'firebase-1' };
    t.document.el('comunicadoTitle').value = 'T';
    t.document.el('comunicadoContent').innerHTML = '<p>x</p>';
    await t.controller.save();
    assert.equal(Object.values(t.db.snapshot('announcements'))[0].authorUid, 'firebase-1');
});

testAsync('publicar: sin sesión de Firebase falla con aviso "Error al publicar." (el original lanza TypeError dentro del try)', async () => {
    const t = setup({ user: { uid: 'u1', name: 'Sara', role: 'Supervisor' }, data: {} });
    t.state.authUser = null;
    t.document.el('comunicadoTitle').value = 'T';
    t.document.el('comunicadoContent').innerHTML = '<p>x</p>';
    await t.controller.save();
    assert.deepEqual(t.alerts, [ANNOUNCEMENT_MESSAGES.PUBLISH_ERROR]);
    assert.equal(t.db.snapshot('announcements'), null);
});

test('abrir modal nuevo: solo roles que publican; limpia título y contenido', () => {
    const t = setup({ user: { uid: 'u', name: 'S', role: 'Supervisor' } });
    t.document.el('comunicadoTitle').value = 'viejo';
    t.document.el('comunicadoContent').innerHTML = 'viejo';
    t.controller.openNewModal();
    assert.equal(t.document.el('comunicadoTitle').value, '');
    assert.equal(t.document.el('comunicadoContent').innerHTML, '');
    assert.equal(t.document.isActive('newComunicadoModal'), true);
    const g = setup();
    g.controller.openNewModal();
    assert.equal(g.document.isActive('newComunicadoModal'), false);
    assert.equal(g.warns[0][0], 'openNewComunicadoModal: rol no autorizado');
});

test('vista de lectura: muestra título/autor/fecha como texto y el cuerpo sanitizado; id inexistente no hace nada', () => {
    const t = setup({ user: { uid: 'u', name: 'S', role: 'Supervisor' }, data: { announcements: { k: { title: 'T', author: 'A', content: '<p>c</p><script>x()</script>', date: '2026-10-01T10:00:00.000Z' } } } });
    t.controller.initListener();
    t.controller.viewContent('nope');
    assert.equal(t.document.isActive('viewComunicadoContentModal'), false);
    t.controller.viewContent('k');
    assert.equal(t.document.el('viewComunicadoContentTitle').innerText, 'T');
    assert.equal(t.document.el('viewComunicadoContentDate').innerText, new Date('2026-10-01T10:00:00.000Z').toLocaleString('es-CO'));
    assert.ok(!t.document.el('viewComunicadoContentBody').innerHTML.includes('<script'));
    assert.equal(t.document.isActive('viewComunicadoContentModal'), true);
});

testAsync('lecturas: lista quién leyó y quién falta (gestores aprobados); Gestor no puede consultarlas', async () => {
    const data = {
        announcements: { k: { title: 'T', author: 'A', content: 'c', date: '2026-10-01T10:00:00.000Z', readBy: { g1: { name: 'Ana', readAt: '2026-10-02T10:00:00.000Z' } } } },
        users: { g1: { name: 'Ana', approved: true, role: 'Gestor' }, g2: { name: 'Luis', approved: true, role: 'Gestor' }, a1: { name: 'Admin', approved: true, role: 'Admin' } }
    };
    const t = setup({ user: { uid: 's', name: 'Sara', role: 'Supervisor' }, data });
    t.controller.initListener();
    await t.controller.viewLecturas('k');
    assert.equal(t.document.isActive('comunicadoLecturasModal'), true);
    assert.ok(t.document.el('comunicadoReadList').innerHTML.includes('Ana'));
    const unread = t.document.el('comunicadoUnreadList').innerHTML;
    assert.ok(unread.includes('Luis') && !unread.includes('Ana') && !unread.includes('Admin'));

    const g = setup({ data });
    g.controller.initListener();
    await g.controller.viewLecturas('k');
    assert.equal(g.document.isActive('comunicadoLecturasModal'), false);
    assert.equal(g.warns[0][0], 'viewComunicadoLecturas: rol no autorizado');
});

testAsync('lecturas: nadie ha leído / todos leyeron / error de lectura de usuarios / usuarios vacíos', async () => {
    const base = { k: { title: 'T', author: 'A', content: 'c', date: '2026-10-01T10:00:00.000Z' } };
    const t = setup({ user: { uid: 's', name: 'S', role: 'Supervisor' }, data: { announcements: base, users: { g1: { name: 'Ana', approved: true, role: 'Gestor' } } } });
    t.controller.initListener();
    await t.controller.viewLecturas('k');
    assert.ok(t.document.el('comunicadoReadList').innerHTML.includes('Nadie ha leído esto aún.'));

    const all = { k: { ...base.k, readBy: { g1: { name: 'Ana', readAt: '2026-10-02T00:00:00.000Z' } } } };
    const t2 = setup({ user: { uid: 's', name: 'S', role: 'Supervisor' }, data: { announcements: all, users: { g1: { name: 'Ana', approved: true, role: 'Gestor' } } } });
    t2.controller.initListener();
    await t2.controller.viewLecturas('k');
    assert.ok(t2.document.el('comunicadoUnreadList').innerHTML.includes('¡Todos han leído!'));

    const t3 = setup({ user: { uid: 's', name: 'S', role: 'Supervisor' }, data: { announcements: base } });
    t3.controller.initListener();
    t3.db.rules.canRead = (p) => p !== 'users';
    await t3.controller.viewLecturas('k');
    assert.ok(t3.document.el('comunicadoUnreadList').innerHTML.includes('Error al cargar usuarios.'));

    const t4 = setup({ user: { uid: 's', name: 'S', role: 'Supervisor' }, data: { announcements: base } }); // sin nodo users
    t4.controller.initListener();
    await t4.controller.viewLecturas('k');
    assert.ok(t4.document.el('comunicadoUnreadList').innerHTML.includes('Cargando usuarios...'), 'hallazgo: sin nodo users el texto "Cargando usuarios..." queda para siempre');
});

test('lecturas con nombres maliciosos: se escapan (lectores y pendientes)', async () => {
    const data = {
        announcements: { k: { title: 'T', author: 'A', content: 'c', date: '2026-10-01T10:00:00.000Z', readBy: { g1: { name: '<img src=x onerror=alert(1)>', readAt: '2026-10-02T00:00:00.000Z' } } } },
        users: { g2: { name: '<script>alert(2)</script>', approved: true, role: 'Gestor' } }
    };
    const t = setup({ user: { uid: 's', name: 'S', role: 'Supervisor' }, data });
    t.controller.initListener();
    await t.controller.viewLecturas('k');
    const html = t.document.el('comunicadoReadList').innerHTML + t.document.el('comunicadoUnreadList').innerHTML;
    assert.ok(!html.includes('<img') && !html.includes('<script'));
});

testAsync('eliminar: solo Admin; pide confirmación y borra al confirmar; si falla avisa; siempre restaura el botón', async () => {
    const t = setup({ user: { uid: 'a', name: 'A', role: 'Admin' }, data: { announcements: ANN() } });
    t.controller.initListener();
    t.controller.requestDelete('-A1');
    assert.equal(t.document.isActive('confirmDeleteModal'), true);
    assert.equal(t.controller.getPendingDeleteId(), '-A1');
    t.document.el('confirmDeleteBtn').innerHTML = 'Eliminar';
    await t.controller.confirmDelete();
    assert.equal(t.db.snapshot('announcements/-A1'), null);
    assert.deepEqual(t.closed, ['confirmDeleteModal']);
    assert.equal(t.document.el('confirmDeleteBtn').innerHTML, 'Eliminar');
    assert.equal(t.document.el('confirmDeleteBtn').disabled, false);
    assert.equal(t.controller.getPendingDeleteId(), null);

    t.db.rules.canWrite = () => false;
    t.controller.requestDelete('-A2');
    await t.controller.confirmDelete();
    assert.deepEqual(t.alerts, [ANNOUNCEMENT_MESSAGES.DELETE_ERROR]);
    assert.notEqual(t.db.snapshot('announcements/-A2'), null);
    assert.equal(t.document.el('confirmDeleteBtn').disabled, false);

    await t.controller.confirmDelete(); // sin pendiente: no hace nada
    assert.equal(t.alerts.length, 1);
});

testAsync('eliminar: Supervisor y Gestor son rechazados al pedir; y si el rol cambia antes de confirmar, se cancela', async () => {
    for (const role of ['Supervisor', 'Gestor']) {
        const t = setup({ user: { uid: 'u', name: 'N', role }, data: { announcements: ANN() } });
        t.controller.requestDelete('-A1');
        assert.deepEqual(t.alerts, [ANNOUNCEMENT_MESSAGES.NOT_ALLOWED_DELETE]);
        assert.equal(t.document.isActive('confirmDeleteModal'), false);
    }
    const t = setup({ user: { uid: 'a', name: 'A', role: 'Admin' }, data: { announcements: ANN() } });
    t.controller.requestDelete('-A1');
    t.state.user = { uid: 'a', name: 'A', role: 'Gestor' };
    await t.controller.confirmDelete();
    assert.notEqual(t.db.snapshot('announcements/-A1'), null);
    assert.deepEqual(t.closed, ['confirmDeleteModal']);
    assert.equal(t.controller.getPendingDeleteId(), null);
});

test('renderAdmin muestra Eliminar solo al Admin; renderGestor marca leídos con su fecha', () => {
    const data = { announcements: ANN() };
    data.announcements['-A1'].readBy = { g1: { name: 'Ana', readAt: '2026-10-05T10:00:00.000Z' } };
    const a = setup({ user: { uid: 'a', name: 'A', role: 'Admin' }, data });
    a.controller.initListener();
    a.controller.renderAdmin();
    assert.ok(a.document.el('adminComunicadosTableBody').innerHTML.includes('data-action="delete-comunicado"'));
    const s = setup({ user: { uid: 's', name: 'S', role: 'Supervisor' }, data });
    s.controller.initListener();
    s.controller.renderAdmin();
    assert.ok(!s.document.el('adminComunicadosTableBody').innerHTML.includes('delete-comunicado'));
    const g = setup({ data });
    g.controller.initListener();
    g.controller.renderGestor();
    const html = g.document.el('gestorComunicadosList').innerHTML;
    assert.ok(html.includes('Leído el ' + new Date('2026-10-05T10:00:00.000Z').toLocaleString('es-CO')));
    assert.ok(html.includes('data-action="mark-comunicado-read"'), 'el botón de marcar leído va delegado');
    const missing = setup({ missing: ['gestorComunicadosList', 'adminComunicadosTableBody'] });
    missing.controller.renderGestor();
    missing.controller.renderAdmin();
});

// =====================================================================================================
// D4 con las REGLAS REALES de database.rules.json (evaluadas sobre la base simulada) y D9(c) por rol
// =====================================================================================================

const REAL = loadRealRules();
const USERS_REAL = () => ({
    g1: { name: 'Ana', role: 'Gestor', approved: true },
    s1: { name: 'Sara', role: 'Supervisor', approved: true },
    a1: { name: 'Admin', role: 'Admin', approved: true },
    gx: { name: 'Nuevo', role: 'Gestor', approved: false }
});
const ANA = { uid: 'g1', name: 'Ana', role: 'Gestor', email: 'ana@virtualsoft.tech' };

/**
 * Entorno con reglas reales. `staleCache` simula el caché del listener desactualizado (la lectura ya existe en el
 * servidor pero el cliente aún no lo sabe): el controlador lee los comunicados de ese mapa fijo y no se suscribe.
 */
function setupReal({ user = ANA, data, options = {}, staleCache = null } = {}) {
    const db = createFakeRtdb({ data, clock: () => NOW });
    const document = createFakeDocument();
    const state = { user, authUser: user ? { uid: user.uid } : null };
    const adapter = createRealRulesAdapter({ db, getAuth: () => state.authUser });
    db.rules = adapter;
    const out = { db, document, state, adapter, alerts: [], errors: [], timers: [] };
    let cache = staleCache;
    out.controller = createAnnouncementsController({
        repository: createAnnouncementRepository({ database: db }),
        document,
        getUser: () => state.user,
        getAuthUser: () => state.authUser,
        ...(staleCache ? { getAnnouncements: () => cache, setAnnouncements: (m) => { cache = m; } } : {}),
        now: () => NOW,
        alert: (m) => out.alerts.push(m),
        setTimeout: (fn, ms) => out.timers.push({ fn, ms }),
        logger: { warn() {}, error: (...a) => out.errors.push(a) },
        options
    });
    out.readByWrites = (id, uid) => db.log.filter((l) => l.path === `announcements/${id}/readBy/${uid}`).length;
    out.runTimers = () => { const t = out.timers.splice(0); t.forEach((x) => x.fn()); };
    return out;
}

const serverWithRead = () => {
    const ann = ANN();
    ann['-A1'].readBy = { g1: { name: 'Ana', readAt: '2026-10-05T10:00:00.000Z' } };
    return { announcements: ann, users: USERS_REAL() };
};

test('reglas reales: readBy/$reader_uid se escribe UNA vez (!data.exists()) y solo por el propio usuario aprobado; Admin hereda la escritura total', () => {
    if (!REAL) { console.log('         [OMITIDA] database.rules.json no encontrado'); return; }
    const node = REAL.rules.announcements.$announcement_id;
    const w = node.readBy.$reader_uid['.write'];
    assert.ok(w.includes('auth.uid === $reader_uid') && w.includes('!data.exists()') && w.includes('newData.exists()'));
    assert.ok(node.readBy.$reader_uid['.validate'].includes("newData.hasChildren(['readAt'])"));
    assert.ok(node['.write'].includes("=== 'Admin'"), 'la rama Admin del padre se hereda (cascada)');
    // el evaluador reproduce la regla: primera vez sí, segunda no; otro uid no; no aprobado no; Admin sí reescribe
    const db = createFakeRtdb({ data: serverWithRead() });
    const who = { uid: 'g1' };
    const rules = createRealRulesAdapter({ db, getAuth: () => who });
    const receipt = { name: 'Ana', readAt: 'x' };
    assert.equal(rules.canWrite('set', 'announcements/-A2/readBy/g1', receipt), true, 'primera lectura');
    assert.equal(rules.canWrite('set', 'announcements/-A1/readBy/g1', receipt), false, 'duplicidad: ya existe');
    assert.equal(rules.canWrite('set', 'announcements/-A2/readBy/s1', receipt), false, 'no se escribe la lectura de otro');
    assert.equal(rules.canWrite('set', 'announcements/-A2/readBy/g1', { name: 'Ana' }), false, '.validate exige readAt');
    who.uid = 'gx';
    assert.equal(rules.canWrite('set', 'announcements/-A2/readBy/gx', receipt), false, 'no aprobado');
    assert.equal(rules.canRead('announcements/-A2/readBy/gx'), false, 'no aprobado tampoco lee');
    who.uid = 'a1';
    assert.equal(rules.canWrite('set', 'announcements/-A1/readBy/g1', receipt), true, 'Admin: la escritura total del padre se hereda');
    who.uid = 's1';
    assert.equal(rules.canWrite('set', 'announcements/-A1/readBy/g1', receipt), false, 'Supervisor no');
});

test('opciones: el predeterminado es D4 encendido; legacy restaura app.js; las claves explícitas mandan', () => {
    assert.deepEqual(resolveAnnouncementOptions(), { ...DEFAULT_OPTIONS });
    assert.deepEqual(resolveAnnouncementOptions({}), { skipIfAlreadyRead: true, keepUrgentModalOpenOnFailure: true });
    assert.deepEqual(resolveAnnouncementOptions({ legacy: true }), { ...LEGACY_OPTIONS });
    assert.deepEqual(resolveAnnouncementOptions({ legacy: true, keepUrgentModalOpenOnFailure: true }), { skipIfAlreadyRead: false, keepUrgentModalOpenOnFailure: true });
    assert.deepEqual(resolveAnnouncementOptions({ skipIfAlreadyRead: false }), { skipIfAlreadyRead: false, keepUrgentModalOpenOnFailure: true });
});

testAsync('D4 reglas reales: caché desactualizado + modal urgente -> la escritura falla por DUPLICIDAD, se da por leído, el modal se cierra y NO reaparece (pasa al siguiente)', async () => {
    if (!REAL) return;
    const t = setupReal({ data: serverWithRead(), staleCache: ANN() }); // el caché no sabe que -A1 ya se leyó
    t.controller.checkUnreadUrgent();
    assert.equal(t.document.el('urgentAnnouncementTitle').innerText, 'Primero');
    await t.document.el('btnUrgentUnderstand').onclick();
    assert.deepEqual(t.alerts, [], 'sin "Error al marcar como leído."');
    assert.equal(t.document.isActive('urgentAnnouncementModal'), false, 'el modal se cerró');
    assert.equal(t.readByWrites('-A1', 'g1'), 0, 'la base no aceptó una segunda escritura');
    assert.equal(t.db.snapshot('announcements/-A1/readBy/g1').readAt, '2026-10-05T10:00:00.000Z', 'la lectura original se conserva');
    assert.ok(t.adapter.evaluations.some((e) => e.kind === 'write' && e.path === 'announcements/-A1/readBy/g1' && !e.allowed), 'la regla real rechazó la duplicidad');
    assert.ok(t.adapter.evaluations.some((e) => e.kind === 'read' && e.path === 'announcements/-A1/readBy/g1' && e.allowed), 'se verificó con una lectura');
    t.runTimers();
    assert.equal(t.document.isActive('urgentAnnouncementModal'), true);
    assert.equal(t.document.el('urgentAnnouncementTitle').innerText, 'Segundo', 'avanza al siguiente: -A1 NO se reabre');
    await t.document.el('btnUrgentUnderstand').onclick();
    t.runTimers();
    assert.equal(t.document.isActive('urgentAnnouncementModal'), false, 'todo leído: queda cerrado');
    assert.equal(t.readByWrites('-A2', 'g1'), 1);
});

testAsync('D4 diferencial: el MISMO escenario con options.legacy reproduce el bucle de app.js (error, cierra y reabre -A1 a los 500 ms)', async () => {
    if (!REAL) return;
    const t = setupReal({ data: serverWithRead(), staleCache: ANN(), options: { legacy: true } });
    t.controller.checkUnreadUrgent();
    for (let vuelta = 0; vuelta < 3; vuelta += 1) {
        await t.document.el('btnUrgentUnderstand').onclick();
        assert.equal(t.document.isActive('urgentAnnouncementModal'), false);
        t.runTimers();
        assert.equal(t.document.isActive('urgentAnnouncementModal'), true, `vuelta ${vuelta}: reaparece`);
        assert.equal(t.document.el('urgentAnnouncementTitle').innerText, 'Primero', 'siempre el mismo comunicado (bucle)');
    }
    assert.deepEqual(t.alerts, Array(3).fill(ANNOUNCEMENT_MESSAGES.READ_ERROR));
});

testAsync('D4 fallo de RED (no duplicidad): no se marca leído, no se verifica como duplicidad, el modal sigue abierto y el reintento con red funciona', async () => {
    if (!REAL) return;
    const t = setupReal({ data: { announcements: ANN(), users: USERS_REAL() } });
    t.controller.initListener();
    const network = Object.assign(new Error('Network error: client is offline'), { code: 'NETWORK_ERROR' });
    t.db.failWrites = () => network;
    assert.equal(t.document.el('urgentAnnouncementTitle').innerText, 'Primero');
    await t.document.el('btnUrgentUnderstand').onclick();
    assert.deepEqual(t.alerts, [ANNOUNCEMENT_MESSAGES.READ_ERROR]);
    assert.equal(t.document.isActive('urgentAnnouncementModal'), true, 'NO se cierra en falso');
    assert.equal(t.document.el('btnUrgentUnderstand').disabled, false, 'botón rehabilitado para reintentar');
    assert.equal(t.document.el('btnUrgentUnderstand').innerHTML, URGENT_BUTTON_IDLE_HTML);
    assert.equal(t.timers.length, 0, 'no se programa reapertura');
    assert.equal(t.db.snapshot('announcements/-A1/readBy'), null, 'nada escrito');
    assert.ok(!t.adapter.evaluations.some((e) => e.kind === 'read' && e.path.includes('/readBy/')), 'un fallo de red no dispara la verificación de duplicidad');
    assert.equal(t.document.el('unreadAnnouncementsBadge').textContent, 2, 'la insignia no cambia');
    t.db.failWrites = null; // vuelve la red
    await t.document.el('btnUrgentUnderstand').onclick();
    assert.equal(t.document.isActive('urgentAnnouncementModal'), false);
    assert.equal(t.readByWrites('-A1', 'g1'), 1);
    assert.equal(t.alerts.length, 1);
});

testAsync('D4 PERMISSION_DENIED REAL sin lectura previa (uid de sesión distinto / usuario no aprobado): NO se da por leído y el modal sigue abierto', async () => {
    if (!REAL) return;
    // (a) el uid local no coincide con la sesión de Firebase: la regla rechaza readBy/{uid local} y no hay lectura previa
    const a = setupReal({ data: { announcements: ANN(), users: USERS_REAL() } });
    a.state.authUser = { uid: 's1' };
    a.controller.initListener();
    await a.document.el('btnUrgentUnderstand').onclick();
    assert.deepEqual(a.alerts, [ANNOUNCEMENT_MESSAGES.READ_ERROR]);
    assert.equal(a.document.isActive('urgentAnnouncementModal'), true);
    assert.equal(a.db.snapshot('announcements/-A1/readBy'), null);
    assert.ok(a.adapter.evaluations.some((e) => e.kind === 'read' && e.path === 'announcements/-A1/readBy/g1'), 'se verificó y no existía');
    // (b) gestor NO aprobado: ni escribe ni puede verificar (lectura denegada) -> fallo real
    const b = setupReal({ user: { uid: 'gx', name: 'Nuevo', role: 'Gestor' }, data: { announcements: ANN(), users: USERS_REAL() }, staleCache: ANN() });
    b.controller.checkUnreadUrgent();
    await b.document.el('btnUrgentUnderstand').onclick();
    assert.deepEqual(b.alerts, [ANNOUNCEMENT_MESSAGES.READ_ERROR]);
    assert.equal(b.document.isActive('urgentAnnouncementModal'), true);
    assert.equal(b.db.snapshot('announcements/-A1/readBy'), null);
});

testAsync('D4: si la lectura de verificación falla, se trata como fallo real (conservador); sin fetchReadReceipt en el repositorio también', async () => {
    if (!REAL) return;
    const t = setupReal({ data: serverWithRead(), staleCache: ANN() });
    const realCanRead = t.adapter.canRead;
    t.db.rules = { canRead: (p) => (p.includes('/readBy/') ? false : realCanRead(p)), canWrite: t.adapter.canWrite };
    t.controller.checkUnreadUrgent();
    await t.document.el('btnUrgentUnderstand').onclick();
    assert.deepEqual(t.alerts, [ANNOUNCEMENT_MESSAGES.READ_ERROR]);
    assert.equal(t.document.isActive('urgentAnnouncementModal'), true);

    const db = createFakeRtdb({ data: serverWithRead() });
    db.rules = createRealRulesAdapter({ db, getAuth: () => ({ uid: 'g1' }) });
    const repo = createAnnouncementRepository({ database: db });
    delete repo.fetchReadReceipt;
    const alerts = [];
    const c = createAnnouncementsController({ repository: repo, document: createFakeDocument(), getUser: () => ANA, getAuthUser: () => ({ uid: 'g1' }), getAnnouncements: () => ANN(), now: () => NOW, alert: (m) => alerts.push(m), logger: { warn() {}, error() {} } });
    assert.equal(await c.markAsRead('-A1'), false);
    assert.deepEqual(alerts, [ANNOUNCEMENT_MESSAGES.READ_ERROR]);
});

testAsync('D4: comprobación previa en el cliente -> si readBy[uid] ya está en el caché NO se intenta escribir (con legacy sí, y falla)', async () => {
    if (!REAL) return;
    const fresh = setupReal({ data: serverWithRead() });
    fresh.controller.initListener();
    const before = fresh.adapter.evaluations.filter((e) => e.kind === 'write').length;
    assert.equal(await fresh.controller.markAsRead('-A1'), true);
    assert.equal(fresh.adapter.evaluations.filter((e) => e.kind === 'write').length, before, 'ni siquiera se intentó la escritura');
    const legacy = setupReal({ data: serverWithRead(), options: { legacy: true } });
    legacy.controller.initListener();
    assert.equal(await legacy.controller.markAsRead('-A1'), false);
    assert.deepEqual(legacy.alerts, [ANNOUNCEMENT_MESSAGES.READ_ERROR]);
});

testAsync('D4: la duplicidad confirmada actualiza la insignia y la lista del gestor aunque el caché siga viejo', async () => {
    if (!REAL) return;
    const t = setupReal({ data: serverWithRead(), staleCache: ANN() });
    t.controller.updateUnreadBadge();
    assert.equal(t.document.el('unreadAnnouncementsBadge').textContent, 2);
    assert.equal(await t.controller.markAsRead('-A1'), true);
    assert.equal(t.document.el('unreadAnnouncementsBadge').textContent, 1);
    t.controller.renderGestor();
    assert.ok(t.document.el('gestorComunicadosList').innerHTML.includes('Leído el ' + new Date('2026-10-05T10:00:00.000Z').toLocaleString('es-CO')));
    assert.deepEqual(t.alerts, []);
});

testAsync('D9(c) reglas reales: Admin, Supervisor y Gestor ven el modal urgente bloqueante, confirman y su lectura queda registrada; no reaparece', async () => {
    if (!REAL) return;
    for (const user of [ANA, { uid: 's1', name: 'Sara', role: 'Supervisor' }, { uid: 'a1', name: 'Admin', role: 'Admin' }]) {
        const t = setupReal({ user, data: { announcements: ANN(), users: USERS_REAL() } });
        t.controller.initListener();
        assert.equal(t.document.isActive('urgentAnnouncementModal'), true, `${user.role}: modal abierto`);
        assert.equal(t.document.el('urgentAnnouncementTitle').innerText, 'Primero');
        await t.document.el('btnUrgentUnderstand').onclick();
        t.runTimers();
        assert.equal(t.document.el('urgentAnnouncementTitle').innerText, 'Segundo', `${user.role}: pasa al siguiente`);
        await t.document.el('btnUrgentUnderstand').onclick();
        t.runTimers();
        assert.equal(t.document.isActive('urgentAnnouncementModal'), false, `${user.role}: todo confirmado`);
        assert.ok(t.db.snapshot(`announcements/-A1/readBy/${user.uid}`) && t.db.snapshot(`announcements/-A2/readBy/${user.uid}`), `${user.role}: lecturas registradas`);
        assert.deepEqual(t.alerts, [], user.role);
        t.controller.checkUnreadUrgent();
        assert.equal(t.document.isActive('urgentAnnouncementModal'), false, `${user.role}: no reaparece`);
        // la insignia de "no leídos" sigue oculta para Admin/Supervisor (sin cambio)
        if (user.role !== 'Gestor') assert.equal(t.document.el('unreadAnnouncementsBadge').style.display, 'none');
    }
});

await summarizeAsync();
