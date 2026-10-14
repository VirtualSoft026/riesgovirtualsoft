import { createRunner, assert } from '../test-harness.mjs';
import { createNotificationsRepository } from '../../services/firebase/firebase-notifications-repository.js';
import { createShiftReportsRepository } from '../../services/firebase/firebase-shift-reports-repository.js';
import { createMonitoringRepository, extractApprovedGestorNames } from '../../services/firebase/firebase-monitoring-repository.js';

const { test, testAsync, summarizeAsync } = createRunner('repositorios Firebase del corte historial/navegación (base inyectada, sin red)');

const snap = (v) => ({ exists: () => v !== null && v !== undefined, val: () => v });

/** Base de datos simulada: registra lecturas, escuchas y escrituras. */
function fakeDb(tree) {
    const log = [];
    const listeners = {};
    return {
        log, listeners,
        ref(path) {
            const ref = {
                once: async (ev) => { log.push({ op: 'once', path, ev, filter: ref._filter }); return snap(ref._filter ? ref._filter(tree[path]) : tree[path]); },
                update: async (u) => { log.push({ op: 'update', path, u }); },
                on: (ev, cb, errCb) => { listeners[path] = { cb, errCb }; log.push({ op: 'on', path, ev }); },
                off: (ev, cb) => { log.push({ op: 'off', path, ev, same: listeners[path] && listeners[path].cb === cb }); },
                orderByChild(child) { return { equalTo(value) { ref._filter = (data) => { const out = {}; Object.keys(data || {}).forEach((k) => { if (data[k][child] === value) out[k] = data[k]; }); return Object.keys(out).length ? out : null; }; log.push({ op: 'query', path, child, value }); return ref; } }; }
            };
            return ref;
        }
    };
}

const PERMS = {
    p1: { uid: 'g1', status: 'Aprobado', notified: false, notified_admin: true },
    p2: { uid: 'g1', status: 'Pendiente', notified: false, notified_admin: false },
    p3: { uid: 'g2', status: 'Rechazado', notified: false, notified_admin: true },
    p4: { uid: 'g3', status: 'Pendiente', notified: true, notified_admin: false }
};

testAsync('markAllAsRead Admin/Supervisor: un solo update con los pendientes sin ver por el admin', async () => {
    for (const role of ['Admin', 'Supervisor']) {
        const db = fakeDb({ permissions: PERMS });
        const r = await createNotificationsRepository({ database: db }).markAllAsRead({ role, uid: 'x' });
        assert.equal(r.updated, 2);
        const updates = db.log.filter((l) => l.op === 'update');
        assert.equal(updates.length, 1);
        assert.deepEqual(updates[0].u, { 'p2/notified_admin': true, 'p4/notified_admin': true });
    }
});

testAsync('markAllAsRead Gestor: consulta solo sus permisos (orderByChild uid) y marca los ya respondidos', async () => {
    const db = fakeDb({ permissions: PERMS });
    const r = await createNotificationsRepository({ database: db }).markAllAsRead({ role: 'Gestor', uid: 'g1' });
    assert.equal(r.updated, 1);
    assert.deepEqual(db.log.find((l) => l.op === 'query'), { op: 'query', path: 'permissions', child: 'uid', value: 'g1' });
    assert.deepEqual(db.log.find((l) => l.op === 'update').u, { 'p1/notified': true });
});

testAsync('markAllAsRead Gestor sin uid en el usuario usa el uid de Auth; sin ninguno no hace nada; sin usuario no hace nada', async () => {
    const db = fakeDb({ permissions: PERMS });
    const viaAuth = await createNotificationsRepository({ database: db, getAuthUid: () => 'g2' }).markAllAsRead({ role: 'Gestor' });
    assert.equal(viaAuth.updated, 1);
    const db2 = fakeDb({ permissions: PERMS });
    assert.deepEqual(await createNotificationsRepository({ database: db2 }).markAllAsRead({ role: 'Gestor' }), { updated: 0 });
    assert.equal(db2.log.length, 0, 'sin uid no se consulta Firebase');
    assert.deepEqual(await createNotificationsRepository({ database: db2 }).markAllAsRead(null), { updated: 0 });
});

testAsync('markAllAsRead: sin permisos o sin nada por marcar no escribe', async () => {
    const empty = fakeDb({});
    assert.deepEqual(await createNotificationsRepository({ database: empty }).markAllAsRead({ role: 'Admin' }), { updated: 0 });
    assert.equal(empty.log.filter((l) => l.op === 'update').length, 0);
    const done = fakeDb({ permissions: { a: { uid: 'g1', status: 'Aprobado', notified: true } } });
    await createNotificationsRepository({ database: done }).markAllAsRead({ role: 'Gestor', uid: 'g1' });
    assert.equal(done.log.filter((l) => l.op === 'update').length, 0);
});

testAsync('shift_reports: lista con fb_id y lectura por id (sin fb_id, como el original); vacío = []', async () => {
    const db = fakeDb({ shift_reports: { a: { gestor: 'Ana' }, b: { gestor: 'Luis' } }, 'shift_reports/a': { gestor: 'Ana' } });
    const repo = createShiftReportsRepository({ database: db });
    assert.deepEqual(await repo.fetchAllShiftReports(), [{ gestor: 'Ana', fb_id: 'a' }, { gestor: 'Luis', fb_id: 'b' }]);
    assert.deepEqual(await repo.fetchShiftReportById('a'), { gestor: 'Ana' });
    assert.equal(await repo.fetchShiftReportById('zzz'), null);
    assert.deepEqual(await createShiftReportsRepository({ database: fakeDb({}) }).fetchAllShiftReports(), []);
});

test('nombres de gestores aprobados: solo Gestor aprobado, recortados, sin repetir y ordenados (app.js 5648-5655)', () => {
    const users = {
        a: { role: 'Gestor', approved: true, name: ' Zoe ' }, b: { role: 'Gestor', approved: true, name: 'Ana' },
        c: { role: 'Gestor', approved: false, name: 'Pendiente' }, d: { role: 'Admin', approved: true, name: 'Jefe' },
        e: { role: 'Gestor', approved: true, name: 'Zoe' }, f: null
    };
    assert.deepEqual(extractApprovedGestorNames(users), ['Ana', 'Zoe']);
    assert.deepEqual(extractApprovedGestorNames(null), []);
    assert.throws(() => extractApprovedGestorNames({ a: { role: 'Gestor', approved: true } }), TypeError, 'igual que el original: un gestor aprobado sin nombre rompe la lectura');
});

testAsync('monitoreo: escucha active_sessions (vacío = {}), propaga errores y permite dejar de escuchar', async () => {
    const db = fakeDb({ users: { a: { role: 'Gestor', approved: true, name: 'Ana' } } });
    const repo = createMonitoringRepository({ database: db });
    const got = []; const errs = [];
    const stop = repo.listenActiveSessions((s) => got.push(s), (e) => errs.push(e));
    db.listeners.active_sessions.cb(snap({ u1: { name: 'Ana' } }));
    db.listeners.active_sessions.cb(snap(null));
    db.listeners.active_sessions.errCb(new Error('permiso denegado ficticio'));
    assert.deepEqual(got, [{ u1: { name: 'Ana' } }, {}]);
    assert.equal(errs.length, 1);
    stop();
    assert.deepEqual(db.log.find((l) => l.op === 'off'), { op: 'off', path: 'active_sessions', ev: 'value', same: true });
    assert.deepEqual(await repo.fetchApprovedGestorNames(), ['Ana']);
    assert.deepEqual(await createMonitoringRepository({ database: fakeDb({}) }).fetchApprovedGestorNames(), []);
});

await summarizeAsync();
