import { createRunner, assert } from '../test-harness.mjs';
import { createFakeRtdb, TIMESTAMP } from '../helpers/fake-rtdb-comunicados.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRESENCE_ENABLED_BY_DEFAULT, createPresenceService } from '../../services/firebase/presence-service.js';
import { createApprovedCounterService } from '../../services/firebase/approved-counter-service.js';
import { APPROVED_COUNTER_ENABLED_BY_DEFAULT, APPROVED_COUNTER_PATH, nextApprovedCount } from '../../domain/analytics/approved-counter.js';
import { renderApprovedCount } from '../../ui/views/approved-count-view.js';

const { test, testAsync, summarizeAsync } = createRunner('presence-service + approved-counter (base simulada con transacciones y desconexiones; diferencial vs app.js 8654-8721)');

const flush = () => new Promise((resolve) => setTimeout(resolve, 5));

// ---- Copias LITERALES de app.js (database/firebase/renderActiveSessionsDashboard/updateApprovedCountUI como parámetros) ----

/** app.js 8658-8676 */
function legacySetupUserPresence(uid, { database, firebase }) {
    if (!uid || typeof database === 'undefined') return;
    const connectedRef = database.ref('.info/connected');
    const userSessionRef = database.ref(`active_sessions/${uid}`);

    connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
            userSessionRef.onDisconnect().update({
                status: 'offline',
                lastHeartbeat: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                userSessionRef.update({
                    status: 'online',
                    lastHeartbeat: firebase.database.ServerValue.TIMESTAMP
                });
            });
        }
    });
}

/** app.js 8678-8686 */
function legacyStartMonitoringPresence({ database, renderActiveSessionsDashboard }) {
    if (typeof database === 'undefined') return;
    database.ref('active_sessions').on('value', (snapshot) => {
        if (typeof renderActiveSessionsDashboard === 'function') {
            renderActiveSessionsDashboard();
        }
    });
}

/** app.js 8690-8708 */
function legacyIncrementApprovedWithdrawal(uid, amount = 1, { database, updateApprovedCountUI }) {
    if (typeof database === 'undefined') return;
    const counterRef = database.ref('metrics/approvedCount');
    counterRef.transaction((currentValue) => {
        return (currentValue || 0) + amount;
    }, (error, committed, snapshot) => {
        if (!error && committed) {
            updateApprovedCountUI(snapshot.val());
        }
    });
}
function legacyInitAtomicApprovedCounterListener({ database, updateApprovedCountUI }) {
    if (typeof database === 'undefined') return;
    database.ref('metrics/approvedCount').on('value', (snapshot) => {
        if (snapshot.exists()) {
            updateApprovedCountUI(snapshot.val());
        }
    });
}

/** app.js 8711-8720 (window.isFilteredByGestor y el DOM como parámetros). */
function legacyUpdateApprovedCountUI(count, { window, document, setTimeout }) {
    if (window.isFilteredByGestor) return;
    const countEl = document.getElementById('metric-approved-count');
    if (countEl) {
        countEl.textContent = count || 0;
        countEl.style.transform = 'scale(1.25)';
        setTimeout(() => countEl.style.transform = 'scale(1)', 300);
    }
}

function newDb(data = {}) {
    let t = 1700000000000;
    const db = createFakeRtdb({ data, clock: () => t });
    db.tick = (ms) => { t += ms; };
    return db;
}

// Nota D6: TODAS las pruebas de comportamiento de abajo pasan `enabled: true` EXPLÍCITO: demuestran que el
// comportamiento original (diferencial contra app.js) sigue disponible para cuando se reactive. El predeterminado
// (inactivo, sin tocar la base) se prueba en la sección "D6" al final.

// ===================================== PRESENCIA =====================================

testAsync('presencia: al conectarse registra onDisconnect(offline) y marca online con lastHeartbeat del servidor', async () => {
    const db = newDb();
    createPresenceService({ enabled: true, database: db, serverTimestamp: TIMESTAMP }).setupUserPresence('u1');
    assert.equal(db.pendingDisconnectOps().length, 0, 'aún desconectado: no hace nada');
    db.setConnected(true);
    await flush();
    assert.deepEqual(db.pendingDisconnectOps(), [{ path: 'active_sessions/u1', op: 'update', value: { status: 'offline', lastHeartbeat: TIMESTAMP } }]);
    assert.deepEqual(db.snapshot('active_sessions/u1'), { status: 'online', lastHeartbeat: 1700000000000 });
});

testAsync('desconexión: la base ejecuta el onDisconnect y deja status "offline" con la hora del servidor; al reconectar vuelve a "online"', async () => {
    const db = newDb();
    createPresenceService({ enabled: true, database: db, serverTimestamp: TIMESTAMP }).setupUserPresence('u1');
    db.setConnected(true);
    await flush();
    db.tick(60000);
    db.simulateDisconnect();
    assert.deepEqual(db.snapshot('active_sessions/u1'), { status: 'offline', lastHeartbeat: 1700000060000 });
    assert.equal(db.pendingDisconnectOps().length, 0, 'el onDisconnect se consume');
    db.tick(30000);
    db.setConnected(true);
    await flush();
    assert.deepEqual(db.snapshot('active_sessions/u1'), { status: 'online', lastHeartbeat: 1700000090000 });
    assert.equal(db.pendingDisconnectOps().length, 1, 'se vuelve a registrar');
});

testAsync('diferencial: setupUserPresence produce la misma secuencia de escrituras y el mismo árbol que app.js (conectar, desconectar, reconectar)', async () => {
    const run = async (setup) => {
        const db = newDb({ active_sessions: { u1: { name: 'Ana', status: 'En Línea' } } });
        setup(db);
        db.setConnected(true); await flush();
        db.tick(1000); db.simulateDisconnect();
        db.tick(1000); db.setConnected(true); await flush();
        return { log: db.log, tree: db.raw(), pending: db.pendingDisconnectOps() };
    };
    const a = await run((db) => createPresenceService({ enabled: true, database: db, serverTimestamp: TIMESTAMP }).setupUserPresence('u1'));
    const b = await run((db) => legacySetupUserPresence('u1', { database: db, firebase: { database: { ServerValue: { TIMESTAMP } } } }));
    assert.deepEqual(a, b);
});

test('presencia: sin uid o sin base no hace nada (igual que app.js)', () => {
    const db = newDb();
    assert.equal(createPresenceService({ enabled: true, database: db, serverTimestamp: TIMESTAMP }).setupUserPresence(''), undefined);
    assert.equal(createPresenceService({ enabled: true, database: db, serverTimestamp: TIMESTAMP }).setupUserPresence(undefined), undefined);
    assert.equal(createPresenceService({ enabled: true, database: undefined, serverTimestamp: TIMESTAMP }).setupUserPresence('u1'), undefined);
    assert.equal(createPresenceService({ enabled: true, database: undefined, serverTimestamp: TIMESTAMP }).startMonitoringPresence(), undefined);
    assert.equal(db.listenerCount(), 0);
});

testAsync('presencia: se puede cancelar la suscripción a .info/connected', async () => {
    const db = newDb();
    const off = createPresenceService({ enabled: true, database: db, serverTimestamp: TIMESTAMP }).setupUserPresence('u1');
    assert.equal(db.listenerCount('.info/connected'), 1);
    off();
    assert.equal(db.listenerCount('.info/connected'), 0);
    db.setConnected(true); await flush();
    assert.equal(db.snapshot('active_sessions/u1'), null);
});

testAsync('HALLAZGO: la presencia escribe status "online"/"offline" y pisa "En Pausa de Turno" en cada reconexión', async () => {
    const db = newDb({ active_sessions: { u1: { name: 'Ana', status: 'En Pausa de Turno' } } });
    createPresenceService({ enabled: true, database: db, serverTimestamp: TIMESTAMP }).setupUserPresence('u1');
    db.setConnected(true); await flush();
    assert.equal(db.snapshot('active_sessions/u1/status'), 'online');
});

testAsync('HALLAZGO: tras cerrar el turno (sesión borrada) una desconexión RECREA active_sessions/{uid} como sesión fantasma {status, lastHeartbeat}', async () => {
    const db = newDb();
    createPresenceService({ enabled: true, database: db, serverTimestamp: TIMESTAMP }).setupUserPresence('u1');
    db.setConnected(true); await flush();
    await db.ref('active_sessions/u1').set(null); // handleEndShift borra la sesión
    assert.equal(db.snapshot('active_sessions/u1'), null);
    db.simulateDisconnect();
    assert.deepEqual(Object.keys(db.snapshot('active_sessions/u1')).sort(), ['lastHeartbeat', 'status']);
});

testAsync('presencia: si la base rechaza la escritura, onError (opcional) la recibe; sin onError el original deja la promesa sin atender', async () => {
    const db = newDb();
    db.rules = { canRead: () => true, canWrite: () => false };
    const errors = [];
    createPresenceService({ enabled: true, database: db, serverTimestamp: TIMESTAMP, onError: (e) => errors.push(e.code) }).setupUserPresence('u1');
    db.setConnected(true); await flush();
    assert.deepEqual(errors, ['PERMISSION_DENIED']);
});

testAsync('monitoreo: cada cambio de active_sessions invoca el repintado; se puede cancelar', async () => {
    const db = newDb();
    let renders = 0;
    const off = createPresenceService({ enabled: true, database: db, serverTimestamp: TIMESTAMP, onSessionsChanged: () => { renders += 1; } }).startMonitoringPresence();
    assert.equal(renders, 1, 'dispara al suscribirse (valor inicial)');
    await db.ref('active_sessions/u1').set({ name: 'Ana' });
    await db.ref('active_sessions/u1/status').set('En Línea');
    assert.equal(renders, 3);
    off();
    await db.ref('active_sessions/u2').set({ name: 'Luis' });
    assert.equal(renders, 3);
    // diferencial: igual número de repintados que app.js
    const db2 = newDb();
    let legacyRenders = 0;
    legacyStartMonitoringPresence({ database: db2, renderActiveSessionsDashboard: () => { legacyRenders += 1; } });
    await db2.ref('active_sessions/u1').set({ name: 'Ana' });
    await db2.ref('active_sessions/u1/status').set('En Línea');
    assert.equal(legacyRenders, 3);
    // sin función de repintado no falla
    createPresenceService({ enabled: true, database: newDb(), serverTimestamp: TIMESTAMP }).startMonitoringPresence();
});

// ===================================== CONTADOR =====================================

test('nextApprovedCount: null/ausente cuenta 0; suma el monto (1 por omisión)', () => {
    assert.equal(nextApprovedCount(null), 1);
    assert.equal(nextApprovedCount(undefined), 1);
    assert.equal(nextApprovedCount(0), 1);
    assert.equal(nextApprovedCount(41), 42);
    assert.equal(nextApprovedCount(10, 5), 15);
    assert.equal(nextApprovedCount(10, -3), 7);
    assert.ok(Number.isNaN(nextApprovedCount(1, undefined) - 2) === false);
    assert.equal(APPROVED_COUNTER_PATH, 'metrics/approvedCount');
});

testAsync('contador atómico: la transacción parte de null (suposición local), reintenta con el valor real y notifica el valor confirmado', async () => {
    const db = newDb({ metrics: { approvedCount: 41 } });
    const shown = [];
    createApprovedCounterService({ enabled: true, database: db, onCount: (v) => shown.push(v) }).incrementApprovedWithdrawal('u1');
    await flush();
    assert.equal(db.snapshot('metrics/approvedCount'), 42);
    assert.deepEqual(shown, [42]);
    assert.equal(db.log.find((l) => l.op === 'transaction').attempts, 2, 'reintentó con el valor real');
});

testAsync('contador: contador inexistente arranca en 1; el monto se respeta; varias llamadas seguidas se acumulan sin perder ninguna', async () => {
    const db = newDb();
    const shown = [];
    const svc = createApprovedCounterService({ enabled: true, database: db, onCount: (v) => shown.push(v) });
    svc.incrementApprovedWithdrawal('u1');
    svc.incrementApprovedWithdrawal('u2', 3);
    svc.incrementApprovedWithdrawal('u3');
    await flush();
    assert.equal(db.snapshot('metrics/approvedCount'), 5);
    assert.deepEqual(shown, [1, 4, 5]);
});

testAsync('diferencial: incremento + listener producen los mismos valores, el mismo estado y las mismas escrituras que app.js', async () => {
    const run = async (make) => {
        const db = newDb({ metrics: { approvedCount: 7 } });
        const shown = [];
        const api = make(db, (v) => shown.push(v));
        api.listen();
        api.inc('u', 1); api.inc('u', 5); api.inc('u', 2);
        await flush();
        return { shown, value: db.snapshot('metrics/approvedCount'), log: db.log, listeners: db.listenerCount('metrics/approvedCount') };
    };
    const a = await run((db, onCount) => { const s = createApprovedCounterService({ enabled: true, database: db, onCount }); return { listen: () => s.initAtomicApprovedCounterListener(), inc: (u, n) => s.incrementApprovedWithdrawal(u, n) }; });
    const b = await run((db, onCount) => ({ listen: () => legacyInitAtomicApprovedCounterListener({ database: db, updateApprovedCountUI: onCount }), inc: (u, n) => legacyIncrementApprovedWithdrawal(u, n, { database: db, updateApprovedCountUI: onCount }) }));
    assert.deepEqual(a, b);
    assert.equal(a.value, 15);
});

testAsync('HALLAZGO: database.rules.json no define "metrics": la base deniega por omisión y ni el incremento ni el listener funcionan (no hay UI)', async () => {
    const db = newDb({ metrics: { approvedCount: 3 } });
    db.rules = { canRead: (p) => !p.startsWith('metrics'), canWrite: (op, p) => !p.startsWith('metrics') };
    const shown = [];
    const svc = createApprovedCounterService({ enabled: true, database: db, onCount: (v) => shown.push(v) });
    svc.initAtomicApprovedCounterListener();
    svc.incrementApprovedWithdrawal('u1');
    await flush();
    assert.deepEqual(shown, []);
    assert.equal(db.snapshot('metrics/approvedCount'), 3);
});

testAsync('listener del contador: solo notifica si el nodo existe; cancelable', async () => {
    const db = newDb();
    const shown = [];
    const off = createApprovedCounterService({ enabled: true, database: db, onCount: (v) => shown.push(v) }).initAtomicApprovedCounterListener();
    assert.deepEqual(shown, []);
    await db.ref('metrics/approvedCount').set(9);
    assert.deepEqual(shown, [9]);
    off();
    await db.ref('metrics/approvedCount').set(10);
    assert.deepEqual(shown, [9]);
    assert.equal(createApprovedCounterService({ enabled: true, database: undefined, onCount() {} }).initAtomicApprovedCounterListener(), undefined);
    createApprovedCounterService({ enabled: true, database: undefined, onCount() {} }).incrementApprovedWithdrawal('u');
});

test('diferencial: pintado del contador (filtrado, sin elemento, valor 0/null, animación de 300 ms) igual que updateApprovedCountUI', () => {
    for (const isFiltered of [false, true, undefined]) {
        for (const count of [0, null, undefined, 7, '12']) {
            for (const hasEl of [true, false]) {
                const mk = () => ({ textContent: 'ini', style: { transform: '' } });
                const e1 = hasEl ? mk() : null; const e2 = hasEl ? mk() : null;
                const t1 = []; const t2 = [];
                renderApprovedCount({ count, isFiltered, element: e1, schedule: (fn, ms) => t1.push([fn, ms]) });
                legacyUpdateApprovedCountUI(count, { window: { isFilteredByGestor: isFiltered }, document: { getElementById: () => e2 }, setTimeout: (fn, ms) => t2.push([fn, ms]) });
                assert.deepEqual(e1, e2);
                assert.deepEqual(t1.map((t) => t[1]), t2.map((t) => t[1]));
                t1.forEach(([fn]) => fn()); t2.forEach(([fn]) => fn());
                assert.deepEqual(e1, e2);
            }
        }
    }
    const el = { textContent: '', style: { transform: '' } };
    assert.equal(renderApprovedCount({ count: 5, isFiltered: true, element: el }), false);
    assert.equal(el.textContent, '', 'filtrado por gestor: no se pisa el valor');
});

// ===================================== D6: INACTIVO Y AISLADO POR DEFECTO =====================================

/**
 * Base "espía": registra CUALQUIER acceso (ref, on, once, set, update, transaction, onDisconnect...) sobre la base
 * simulada real, para demostrar que el predeterminado no abre conexiones ni consume cuota.
 */
function spyDb(data = {}) {
    const db = newDb(data);
    const calls = [];
    const wrapRef = (ref) => new Proxy(ref, {
        get(target, prop) {
            const value = target[prop];
            if (typeof value !== 'function') return value;
            return (...args) => {
                calls.push(`${String(prop)}:${target.path}`);
                const out = value.apply(target, args);
                return out && typeof out === 'object' && 'path' in out ? wrapRef(out) : out;
            };
        }
    });
    const spy = { ref: (p) => { calls.push(`ref:${p}`); return wrapRef(db.ref(p)); } };
    return { db, spy, calls };
}

testAsync('D6 predeterminado: presencia y contador NO tocan la base (ni ref, ni on, ni set/update, ni transaction, ni onDisconnect)', async () => {
    const { db, spy, calls } = spyDb({ active_sessions: { u1: { name: 'Ana', status: 'En Pausa de Turno' } }, metrics: { approvedCount: 7 } });
    const shown = [];
    let renders = 0;
    const presence = createPresenceService({ database: spy, serverTimestamp: TIMESTAMP, onSessionsChanged: () => { renders += 1; } });
    const counter = createApprovedCounterService({ database: spy, onCount: (v) => shown.push(v) });
    assert.equal(presence.enabled, false);
    assert.equal(counter.enabled, false);
    assert.equal(presence.setupUserPresence('u1'), undefined);
    assert.equal(presence.startMonitoringPresence(), undefined);
    assert.equal(counter.initAtomicApprovedCounterListener(), undefined);
    assert.equal(counter.incrementApprovedWithdrawal('u1'), undefined);
    counter.incrementApprovedWithdrawal('u1', 5);
    db.setConnected(true); await flush();
    db.simulateDisconnect(); db.setConnected(true); await flush();
    await db.ref('active_sessions/u2').set({ name: 'Luis' });
    assert.deepEqual(calls, [], 'ningún acceso a la base');
    assert.equal(db.listenerCount(), 0, 'sin listeners');
    assert.deepEqual(db.pendingDisconnectOps(), [], 'sin onDisconnect');
    assert.ok(!db.log.some((l) => l.op === 'transaction' || l.path.startsWith('metrics') || l.op.startsWith('onDisconnect')), 'sin transacciones ni escrituras de presencia');
    assert.equal(db.snapshot('active_sessions/u1/status'), 'En Pausa de Turno', 'el estado de Monitoreo no se pisa');
    assert.equal(db.snapshot('metrics/approvedCount'), 7);
    assert.deepEqual(shown, []);
    assert.equal(renders, 0);
});

test('D6: solo `enabled: true` (booleano) activa; false, "true", 1 u omitido quedan inactivos; las constantes por defecto son false', () => {
    assert.equal(PRESENCE_ENABLED_BY_DEFAULT, false);
    assert.equal(APPROVED_COUNTER_ENABLED_BY_DEFAULT, false);
    for (const enabled of [undefined, false, 'true', 1, null, {}]) {
        const { spy, calls } = spyDb();
        const p = createPresenceService({ database: spy, serverTimestamp: TIMESTAMP, enabled });
        const c = createApprovedCounterService({ database: spy, onCount() {}, enabled });
        p.setupUserPresence('u1'); p.startMonitoringPresence(); c.initAtomicApprovedCounterListener(); c.incrementApprovedWithdrawal('u1');
        assert.deepEqual(calls, [], `enabled=${JSON.stringify(enabled)}`);
        assert.equal(p.enabled || c.enabled, false);
    }
    const { spy, calls } = spyDb();
    createPresenceService({ database: spy, serverTimestamp: TIMESTAMP, enabled: true }).startMonitoringPresence();
    createApprovedCounterService({ database: spy, onCount() {}, enabled: true }).initAtomicApprovedCounterListener();
    assert.deepEqual(calls, ['ref:active_sessions', 'on:active_sessions', 'ref:metrics/approvedCount', 'on:metrics/approvedCount'], 'con enabled: true vuelve el comportamiento original');
});

testAsync('D6 diferencial: con `enabled: true` la secuencia completa (presencia + contador) sigue idéntica a app.js; con el predeterminado no hay ninguna escritura', async () => {
    const run = async (make) => {
        const db = newDb({ active_sessions: { u1: { name: 'Ana', status: 'En Línea' } }, metrics: { approvedCount: 2 } });
        const shown = [];
        make(db, (v) => shown.push(v));
        db.setConnected(true); await flush();
        db.tick(1000); db.simulateDisconnect();
        db.setConnected(true); await flush();
        return { shown, log: db.log, tree: db.raw(), pending: db.pendingDisconnectOps(), listeners: db.listenerCount() };
    };
    const svc = (enabled) => (db, onCount) => {
        const p = createPresenceService({ database: db, serverTimestamp: TIMESTAMP, ...(enabled === undefined ? {} : { enabled }) });
        const c = createApprovedCounterService({ database: db, onCount, ...(enabled === undefined ? {} : { enabled }) });
        p.setupUserPresence('u1'); p.startMonitoringPresence(); c.initAtomicApprovedCounterListener(); c.incrementApprovedWithdrawal('u1', 3);
    };
    const legacy = await run((db, onCount) => {
        legacySetupUserPresence('u1', { database: db, firebase: { database: { ServerValue: { TIMESTAMP } } } });
        legacyStartMonitoringPresence({ database: db, renderActiveSessionsDashboard() {} });
        legacyInitAtomicApprovedCounterListener({ database: db, updateApprovedCountUI: onCount });
        legacyIncrementApprovedWithdrawal('u1', 3, { database: db, updateApprovedCountUI: onCount });
    });
    assert.deepEqual(await run(svc(true)), legacy, 'enabled: true == app.js');
    const inactive = await run(svc(undefined));
    assert.deepEqual(inactive.log, [], 'predeterminado: cero escrituras');
    assert.equal(inactive.listeners, 0);
    assert.deepEqual(inactive.shown, []);
    assert.ok(legacy.log.length > 0 && legacy.listeners > 0, 'el original sí escribe y escucha (la diferencia es intencional: D6)');
});

test('D6 aislamiento estático: ningún módulo de src (fuera de las pruebas) crea los servicios de presencia/contador; solo el bundle los expone', () => {
    const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
    const files = [];
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) { if (entry.name !== 'tests' && entry.name !== 'node_modules') walk(full); } else if (/\.(m?js)$/.test(entry.name)) files.push(full);
        }
    };
    walk(srcDir);
    const offenders = files.filter((f) => !/presence-service\.js$|approved-counter-service\.js$|approved-counter\.js$|entry[^/]*\.js$/.test(f))
        .filter((f) => /from\s+['"][^'"]*(presence-service|approved-counter-service)\.js['"]|create(Presence|ApprovedCounter)Service\s*\(/.test(fs.readFileSync(f, 'utf8')));
    assert.deepEqual(offenders.map((f) => path.relative(srcDir, f)), []);
});

await summarizeAsync();
