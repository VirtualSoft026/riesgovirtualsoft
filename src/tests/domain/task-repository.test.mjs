import { createRunner, assert } from '../test-harness.mjs';
import { createFakeDatabase, createRng, createSerialTestAsync } from '../controllers/tareas-fake-dom.mjs';
import { createTaskRepository, resolveTaskTransaction } from '../../services/firebase/firebase-task-repository.js';
import { buildSessionMetadata } from '../../domain/tasks/task-session-sync.js';

const { test, testAsync: rawTestAsync, summarizeAsync } = createRunner('firebase-task-repository.js (persistencia de tareas del gestor; diferencial vs app.js)');

const testAsync = createSerialTestAsync(rawTestAsync); // las pruebas comparten estado global simulado: van en serie

// ======================================================================================================
// Entorno simulado para el código LITERAL de app.js (los globales que el original usa)
// ======================================================================================================
const NOW = 1_800_000_000_000;
const Date = { now: () => NOW };            // `Date.now()` fijo (el original estampa los registros legados)
let database = null;                         // `database` global de app.js
let storage = new Map();                     // localStorage simulado
let storageBroken = false;
const localStorage = {
    setItem(k, v) { if (storageBroken) throw new Error('QuotaExceededError'); storage.set(k, String(v)); },
    getItem(k) { return storage.has(k) ? storage.get(k) : null; }
};
let consoleErrors = [];
const console = { error: (...a) => consoleErrors.push(a.map(String).join(' ')), log() {}, warn() {} };


// --- copia LITERAL de app.js líneas 2241-2245 (persistTaskToActiveSession) ---
function persistTaskToActiveSession(uid, taskId, taskData) {
    if (!uid) return Promise.reject(new Error('MISSING_UID'));
    if (!taskId) return Promise.reject(new Error('MISSING_TASK_ID'));
    return database.ref(`active_sessions/${uid}/tasks/${taskId}`).update(taskData);
}

// --- copia LITERAL de app.js líneas 2256-2265 (fetchOwnActiveSessionTasks) ---
async function fetchOwnActiveSessionTasks(uid) {
    if (!uid) return { ok: false, tasks: {} };
    try {
        const snapshot = await database.ref(`active_sessions/${uid}/tasks`).once('value');
        return { ok: true, tasks: snapshot.exists() ? snapshot.val() : {} };
    } catch (e) {
        console.error('Error al recuperar el progreso remoto de tareas:', e);
        return { ok: false, tasks: {} };
    }
}

// --- copia LITERAL de app.js líneas 2301-2321 (computeLocalTaskMigrations: se reutiliza tal cual, no es de este corte) ---
function computeLocalTaskMigrations(mergedCache, remoteCache, now) {
    const remote = remoteCache || {};
    const migrations = [];
    Object.keys(mergedCache || {}).forEach((taskId) => {
        const mergedEntry = mergedCache[taskId];
        const remoteEntry = remote[taskId];
        const alreadyInSync = !!remoteEntry
            && mergedEntry.name === remoteEntry.name
            && mergedEntry.status === remoteEntry.status
            && mergedEntry.observation === remoteEntry.observation
            && mergedEntry.updatedAt === remoteEntry.updatedAt;
        if (alreadyInSync) return;

        // Registro legado sin updatedAt: se estampa ANTES de guardarlo.
        const record = typeof mergedEntry.updatedAt === 'number'
            ? mergedEntry
            : { ...mergedEntry, updatedAt: now };
        migrations.push({ taskId, record });
    });
    return migrations;
}

// --- copia LITERAL de app.js líneas 2332-2346 (persistTaskIfNotNewerRemote) ---
function persistTaskIfNotNewerRemote(uid, taskId, record) {
    if (!uid) return Promise.reject(new Error('MISSING_UID'));
    if (!taskId) return Promise.reject(new Error('MISSING_TASK_ID'));
    return database.ref(`active_sessions/${uid}/tasks/${taskId}`).transaction((currentValue) => {
        if (
            currentValue
            && typeof currentValue.updatedAt === 'number'
            && typeof record.updatedAt === 'number'
            && currentValue.updatedAt > record.updatedAt
        ) {
            return undefined; // Abortar: conservar la versión remota más reciente.
        }
        return record;
    });
}

// --- copia LITERAL de app.js líneas 2359-2384 (migrateLocalTasksToActiveSession) ---
async function migrateLocalTasksToActiveSession(uid, mergedCache, remoteCache) {
    if (!uid || !mergedCache) return { migrated: [], failed: [], skipped: [] };
    const migrations = computeLocalTaskMigrations(mergedCache, remoteCache, Date.now());
    const migrated = [];
    const failed = [];
    const skipped = [];
    for (const { taskId, record } of migrations) {
        mergedCache[taskId] = record;
        try {
            localStorage.setItem('riskOps_cache', JSON.stringify(mergedCache));
        } catch (e) { /* localStorage no disponible: el respaldo local es best-effort */ }

        try {
            const result = await persistTaskIfNotNewerRemote(uid, taskId, record);
            if (result && result.committed === false) {
                skipped.push(taskId);
            } else {
                migrated.push(taskId);
            }
        } catch (error) {
            console.error('Error al migrar una tarea local a Firebase durante la recuperación de sesión:', taskId, error);
            failed.push(taskId);
        }
    }
    return { migrated, failed, skipped };
}

// ======================================================================================================
// Utilidades de prueba
// ======================================================================================================
const UID = 'gestor1';
const TASKS_PATH = `active_sessions/${UID}/tasks`;
const clone = (v) => JSON.parse(JSON.stringify(v));

function newRepository(db) {
    return createTaskRepository({
        database: db,
        now: () => NOW,
        saveCache: (cache) => localStorage.setItem('riskOps_cache', JSON.stringify(cache)),
        logger: console
    });
}

function resetEnv() {
    storage = new Map();
    storageBroken = false;
    consoleErrors = [];
}

/** Ejecuta `migrate` con el código LITERAL de app.js y con el repositorio nuevo; devuelve ambas fotos. */
async function runMigrationBoth({ initialDb, localCache, remoteCache, dbOpts = {} }) {
    const shots = {};

    for (const mode of ['legacy', 'nuevo']) {
        resetEnv();
        const db = createFakeDatabase(initialDb, dbOpts);
        const merged = clone(localCache);
        let result;

        if (mode === 'legacy') {
            database = db;
            result = await migrateLocalTasksToActiveSession(UID, merged, clone(remoteCache));
        } else {
            result = await newRepository(db).migrateLocalTasksToActiveSession(UID, merged, clone(remoteCache));
        }

        shots[mode] = {
            result,
            remoteTasks: db.getAt(TASKS_PATH),
            merged,
            storedCache: storage.get('riskOps_cache') || null,
            errors: consoleErrors.length,
            ops: db.log.map((o) => `${o.op}:${o.path}`)
        };
    }

    return shots;
}

const rec = (name, status, updatedAt, observation = '') => (updatedAt === undefined ? { name, status, observation } : { name, status, observation, updatedAt });

// ======================================================================================================
// persistTaskToActiveSession
// ======================================================================================================
testAsync('persistTaskToActiveSession: sin uid o sin taskId rechaza con el mismo error que app.js', async () => {
    database = createFakeDatabase({});
    const repo = newRepository(createFakeDatabase({}));

    for (const [uid, taskId, code] of [['', 't1', 'MISSING_UID'], [null, 't1', 'MISSING_UID'], [UID, '', 'MISSING_TASK_ID'], [UID, undefined, 'MISSING_TASK_ID']]) {
        const legacy = await persistTaskToActiveSession(uid, taskId, {}).catch((e) => e.message);
        const nuevo = await repo.persistTaskToActiveSession(uid, taskId, {}).catch((e) => e.message);
        assert.equal(legacy, code);
        assert.equal(nuevo, code);
    }
});

testAsync('persistTaskToActiveSession: escribe SOLO tasks/{taskId} y no toca las demás tareas (diferencial)', async () => {
    const initial = { active_sessions: { [UID]: { name: 'Ana', tasks: { a: rec('A', 'En Proceso', 100), b: rec('B', 'Finalizada', 150, 'ok') } } } };
    const dbLegacy = createFakeDatabase(initial);
    const dbNuevo = createFakeDatabase(initial);
    const record = rec('A', 'Finalizada', 200, 'hecho');

    database = dbLegacy;
    await persistTaskToActiveSession(UID, 'a', record);
    await newRepository(dbNuevo).persistTaskToActiveSession(UID, 'a', record);

    assert.deepEqual(dbNuevo.data, dbLegacy.data);
    assert.deepEqual(dbNuevo.getAt(`${TASKS_PATH}/b`), rec('B', 'Finalizada', 150, 'ok'));
    assert.deepEqual(dbNuevo.log.map((o) => `${o.op}:${o.path}`), [`update:${TASKS_PATH}/a`]);
});

testAsync('persistTaskToActiveSession: un fallo de Firebase se propaga con su código (nunca se vuelve éxito)', async () => {
    for (const code of ['PERMISSION_DENIED', 'NETWORK_ERROR']) {
        const failing = { [`${TASKS_PATH}/a`]: ['update'] };
        database = createFakeDatabase({}, { failPaths: failing, errorCode: code });
        const legacyError = await persistTaskToActiveSession(UID, 'a', {}).then(() => null, (e) => e);
        const nuevoError = await newRepository(createFakeDatabase({}, { failPaths: failing, errorCode: code })).persistTaskToActiveSession(UID, 'a', {}).then(() => null, (e) => e);

        assert.ok(legacyError && nuevoError, 'ambos deben rechazar');
        assert.equal(nuevoError.code, code);
        assert.equal(nuevoError.code, legacyError.code);
    }
});

// ======================================================================================================
// fetchOwnActiveSessionTasks
// ======================================================================================================
testAsync('fetchOwnActiveSessionTasks: datos, nodo vacío y sin uid (diferencial)', async () => {
    const withTasks = { active_sessions: { [UID]: { tasks: { a: rec('A', 'En Proceso', 1) } } } };

    for (const [initial, uid] of [[withTasks, UID], [{}, UID], [withTasks, ''], [withTasks, null]]) {
        database = createFakeDatabase(initial);
        const legacy = await fetchOwnActiveSessionTasks(uid);
        const nuevo = await newRepository(createFakeDatabase(initial)).fetchOwnActiveSessionTasks(uid);

        assert.deepEqual(nuevo, legacy);
    }

    assert.deepEqual(await newRepository(createFakeDatabase({})).fetchOwnActiveSessionTasks(UID), { ok: true, tasks: {} });
});

testAsync('fetchOwnActiveSessionTasks: un error de lectura NUNCA se disfraza de "no hay tareas" (ok:false)', async () => {
    const failing = { [TASKS_PATH]: ['once'] };
    resetEnv();
    database = createFakeDatabase({}, { failPaths: failing });
    const legacy = await fetchOwnActiveSessionTasks(UID);

    resetEnv();
    const nuevo = await newRepository(createFakeDatabase({}, { failPaths: failing })).fetchOwnActiveSessionTasks(UID);

    assert.deepEqual(nuevo, { ok: false, tasks: {} });
    assert.deepEqual(nuevo, legacy);
    assert.equal(consoleErrors.length, 1, 'el fallo queda registrado en consola');
});

// ======================================================================================================
// persistTaskIfNotNewerRemote (transacción condicional): carreras "remoto más nuevo"
// ======================================================================================================
test('resolveTaskTransaction: aborta solo si el remoto es ESTRICTAMENTE más nuevo (ambos numéricos)', () => {
    const r = rec('A', 'Finalizada', 200);

    assert.equal(resolveTaskTransaction(rec('A', 'En Proceso', 300), r), undefined, 'remoto más nuevo → abortar');
    assert.equal(resolveTaskTransaction(rec('A', 'En Proceso', 200), r), r, 'empate → gana el local');
    assert.equal(resolveTaskTransaction(rec('A', 'En Proceso', 100), r), r, 'remoto más viejo → local');
    assert.equal(resolveTaskTransaction(null, r), r, 'sin valor remoto → escribir');
    assert.equal(resolveTaskTransaction(rec('A', 'En Proceso', undefined), r), r, 'remoto legado sin updatedAt → local');
    const unstamped = rec('A', 'X', undefined);
    assert.equal(resolveTaskTransaction(rec('A', 'En Proceso', 999), unstamped), unstamped, 'local sin updatedAt → escribir');
    assert.equal(resolveTaskTransaction(rec('A', 'En Proceso', '999'), r), r, 'updatedAt no numérico en el remoto no cuenta');
});

testAsync('persistTaskIfNotNewerRemote: remoto más nuevo → committed:false y el remoto queda intacto (diferencial)', async () => {
    const remote = rec('A', 'Finalizada', 500, 'otra pestaña');
    const initial = { active_sessions: { [UID]: { tasks: { a: remote } } } };
    const local = rec('A', 'En Proceso', 400, 'viejo');

    const dbLegacy = createFakeDatabase(initial);
    database = dbLegacy;
    const legacy = await persistTaskIfNotNewerRemote(UID, 'a', local);

    const dbNuevo = createFakeDatabase(initial);
    const nuevo = await newRepository(dbNuevo).persistTaskIfNotNewerRemote(UID, 'a', local);

    assert.equal(nuevo.committed, false);
    assert.equal(legacy.committed, false);
    assert.deepEqual(dbNuevo.getAt(`${TASKS_PATH}/a`), remote);
    assert.deepEqual(dbNuevo.data, dbLegacy.data);
});

testAsync('persistTaskIfNotNewerRemote: otra pestaña escribe justo ANTES de la transacción → se conserva su versión', async () => {
    const newer = rec('A', 'Finalizada', 900, 'guardada desde otra pestaña');
    const hook = (path, { setAt }) => setAt(`${TASKS_PATH}/a`, newer);
    const db = createFakeDatabase({ active_sessions: { [UID]: { tasks: { a: rec('A', 'En Proceso', 100) } } } }, { beforeTransaction: hook });

    const result = await newRepository(db).persistTaskIfNotNewerRemote(UID, 'a', rec('A', 'En Proceso', 500, 'migración'));

    assert.equal(result.committed, false);
    assert.deepEqual(db.getAt(`${TASKS_PATH}/a`), newer);
});

testAsync('persistTaskIfNotNewerRemote: la suposición inicial del SDK (valor local nulo) no decide el resultado', async () => {
    const remote = rec('A', 'Finalizada', 700);
    const db = createFakeDatabase({ active_sessions: { [UID]: { tasks: { a: remote } } } }, { transactionGuess: null });
    const result = await newRepository(db).persistTaskIfNotNewerRemote(UID, 'a', rec('A', 'En Proceso', 600));

    assert.equal(result.committed, false);
    assert.deepEqual(db.getAt(`${TASKS_PATH}/a`), remote);
});

testAsync('persistTaskIfNotNewerRemote: sin uid o taskId rechaza; un fallo de red se propaga', async () => {
    const repo = newRepository(createFakeDatabase({}));

    assert.equal(await repo.persistTaskIfNotNewerRemote('', 'a', {}).catch((e) => e.message), 'MISSING_UID');
    assert.equal(await repo.persistTaskIfNotNewerRemote(UID, '', {}).catch((e) => e.message), 'MISSING_TASK_ID');

    const failing = newRepository(createFakeDatabase({}, { failPaths: { [`${TASKS_PATH}/a`]: ['transaction'] } }));
    const error = await failing.persistTaskIfNotNewerRemote(UID, 'a', rec('A', 'X', 1)).then(() => null, (e) => e);

    assert.ok(error, 'el fallo no se convierte en éxito');
});

// ======================================================================================================
// migrateLocalTasksToActiveSession
// ======================================================================================================
testAsync('migrate: caso base (ausente en remoto, local más nuevo, remoto más nuevo, igual) — diferencial', async () => {
    const localCache = {
        ausente: rec('Ausente', 'En Proceso', 100),
        localNuevo: rec('LocalNuevo', 'Finalizada', 300, 'l'),
        remotoNuevo: rec('RemotoNuevo', 'En Proceso', 100, 'l'),
        igual: rec('Igual', 'No Realizada', 250, 'x'),
        legado: rec('Legado', 'En Proceso', undefined)
    };
    const remoteCache = {
        localNuevo: rec('LocalNuevo', 'En Proceso', 200, 'r'),
        remotoNuevo: rec('RemotoNuevo', 'Finalizada', 400, 'r'),
        igual: rec('Igual', 'No Realizada', 250, 'x')
    };
    const shots = await runMigrationBoth({ initialDb: { active_sessions: { [UID]: { tasks: remoteCache } } }, localCache, remoteCache });

    assert.deepEqual(shots.nuevo, shots.legacy);
    assert.deepEqual(shots.nuevo.result.migrated.sort(), ['ausente', 'legado', 'localNuevo']);
    assert.deepEqual(shots.nuevo.result.skipped, ['remotoNuevo']);
    assert.deepEqual(shots.nuevo.result.failed, []);
    assert.equal(shots.nuevo.remoteTasks.legado.updatedAt, NOW, 'el registro legado se estampa con la hora actual');
    assert.equal(shots.nuevo.remoteTasks.remotoNuevo.status, 'Finalizada', 'el remoto más nuevo se conserva');
});

testAsync('migrate: el respaldo local se guarda ANTES del intento remoto y sobrevive a un fallo de red', async () => {
    const localCache = { a: rec('A', 'En Proceso', 100), b: rec('B', 'Finalizada', undefined, 'obs') };
    const failing = { [`${TASKS_PATH}/a`]: ['transaction'], [`${TASKS_PATH}/b`]: ['transaction'] };
    const shots = await runMigrationBoth({ initialDb: {}, localCache, remoteCache: {}, dbOpts: { failPaths: failing } });

    assert.deepEqual(shots.nuevo, shots.legacy);
    assert.deepEqual(shots.nuevo.result.failed.sort(), ['a', 'b']);
    assert.deepEqual(shots.nuevo.result.migrated, []);
    const stored = JSON.parse(shots.nuevo.storedCache);
    assert.equal(stored.b.updatedAt, NOW, 'el registro estampado quedó en el respaldo local pese al fallo remoto');
    assert.equal(shots.nuevo.remoteTasks, null, 'no se escribió nada en Firebase');
    assert.equal(shots.nuevo.errors, 2);
});

testAsync('migrate: al abrir cada transacción remota, el registro estampado YA está en el respaldo local', async () => {
    resetEnv();
    const seenBeforeRemote = [];
    const db = createFakeDatabase({}, {
        beforeTransaction: (path) => {
            const cached = JSON.parse(storage.get('riskOps_cache') || '{}');
            const taskId = path.split('/').pop();
            seenBeforeRemote.push(cached[taskId] ? cached[taskId].updatedAt : null);
        }
    });

    await newRepository(db).migrateLocalTasksToActiveSession(UID, { x: rec('X', 'En Proceso', undefined), y: rec('Y', 'Finalizada', 5) }, {});

    assert.deepEqual(seenBeforeRemote, [NOW, 5]);
});

testAsync('migrate: un fallo individual NO aborta el resto de la migración', async () => {
    const localCache = { a: rec('A', 'En Proceso', 1), b: rec('B', 'En Proceso', 2), c: rec('C', 'En Proceso', 3) };
    const shots = await runMigrationBoth({ initialDb: {}, localCache, remoteCache: {}, dbOpts: { failPaths: { [`${TASKS_PATH}/b`]: ['transaction'] } } });

    assert.deepEqual(shots.nuevo, shots.legacy);
    assert.deepEqual(shots.nuevo.result, { migrated: ['a', 'c'], failed: ['b'], skipped: [] });
    assert.deepEqual(Object.keys(shots.nuevo.remoteTasks).sort(), ['a', 'c']);
});

testAsync('migrate: localStorage roto no impide migrar (el respaldo local es best-effort)', async () => {
    resetEnv();
    storageBroken = true;
    const db = createFakeDatabase({});
    const result = await newRepository(db).migrateLocalTasksToActiveSession(UID, { a: rec('A', 'En Proceso', 1) }, {});

    assert.deepEqual(result, { migrated: ['a'], failed: [], skipped: [] });
    assert.ok(db.getAt(`${TASKS_PATH}/a`));
});

testAsync('migrate: es idempotente (una segunda corrida con el remoto ya igual no escribe nada)', async () => {
    const db = createFakeDatabase({});
    const repo = newRepository(db);
    const cache = { a: rec('A', 'En Proceso', 100), b: rec('B', 'Finalizada', 200, 'x') };

    await repo.migrateLocalTasksToActiveSession(UID, clone(cache), {});
    const remote = db.getAt(TASKS_PATH);
    const writesBefore = db.log.length;
    const second = await repo.migrateLocalTasksToActiveSession(UID, clone(remote), remote);

    assert.deepEqual(second, { migrated: [], failed: [], skipped: [] });
    assert.equal(db.log.length, writesBefore, 'cero operaciones remotas en la segunda corrida');
});

testAsync('migrate: sin uid o sin caché no hace nada (diferencial)', async () => {
    const db = createFakeDatabase({});
    const repo = newRepository(db);

    assert.deepEqual(await repo.migrateLocalTasksToActiveSession('', { a: rec('A', 'X', 1) }, {}), { migrated: [], failed: [], skipped: [] });
    assert.deepEqual(await repo.migrateLocalTasksToActiveSession(UID, null, {}), { migrated: [], failed: [], skipped: [] });
    assert.deepEqual(await migrateLocalTasksToActiveSession('', {}, {}), { migrated: [], failed: [], skipped: [] });
    assert.equal(db.log.length, 0);
});

testAsync('migrate: 300 escenarios aleatorios con semilla (updatedAt mixtos, remoto que cambia durante la migración, fallos de red) — diferencial', async () => {
    const rng = createRng(20261006);
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    const stamps = [undefined, 50, 100, 100, 200, 300];
    const statuses = ['En Proceso', 'Finalizada', 'No Realizada', 'Pendiente'];
    let skippedSeen = 0;
    let failedSeen = 0;

    for (let i = 0; i < 300; i++) {
        const localCache = {};
        const remoteCache = {};
        const serverNow = {};
        const failPaths = {};

        ids.forEach((id) => {
            if (rng() < 0.7) localCache[id] = rec('T' + id, pick(statuses), pick(stamps), rng() < 0.5 ? 'obs' : '');
            if (rng() < 0.6) remoteCache[id] = rec('T' + id, pick(statuses), pick(stamps), rng() < 0.5 ? 'obs' : '');
            // El servidor puede haber cambiado desde que se leyó remoteCache (carrera con otra pestaña)
            if (remoteCache[id]) serverNow[id] = rng() < 0.3 ? rec('T' + id, 'Finalizada', pick([150, 250, 400]), 'otra pestaña') : clone(remoteCache[id]);
            if (rng() < 0.15) failPaths[`${TASKS_PATH}/${id}`] = ['transaction'];
        });

        const initialDb = Object.keys(serverNow).length ? { active_sessions: { [UID]: { tasks: serverNow } } } : {};
        const shots = await runMigrationBoth({ initialDb, localCache, remoteCache, dbOpts: { failPaths } });

        assert.deepEqual(shots.nuevo, shots.legacy, `escenario ${i}`);
        skippedSeen += shots.nuevo.result.skipped.length;
        failedSeen += shots.nuevo.result.failed.length;
    }

    assert.ok(skippedSeen > 20 && failedSeen > 20, `la muestra cubre carreras y fallos (skipped=${skippedSeen}, failed=${failedSeen})`);
});

// ======================================================================================================
// El latido NUNCA pisa tareas (comentario de app.js 2455-2465)
// ======================================================================================================
const COUNTERS = { totalTasks: 4, finalized: 1, completedTasks: 1, notDoneTasks: 0, percentage: 25 };

test('buildSessionMetadata: nunca incluye `tasks`, ni siquiera si el usuario local trae un campo tasks', () => {
    const user = { name: 'Ana', email: 'ana@x.co', shift: '8am - 4pm', tasks: { a: { status: 'viejo' } }, uid: UID };
    const payload = buildSessionMetadata({ user, loginTime: 'L', lastActive: 5, status: 'En Línea', counters: COUNTERS, timeline: null });

    assert.ok(!('tasks' in payload));
    assert.deepEqual(Object.keys(payload).sort(), ['appVersion', 'completedTasks', 'email', 'finalizedTasks', 'lastActive', 'loginTime', 'name', 'notDoneTasks', 'percentage', 'shift', 'status', 'timeline', 'totalTasks']);
    assert.deepEqual(payload.timeline, []);
    assert.equal(payload.shift, '8am - 4pm');
    assert.equal(buildSessionMetadata({ user: { name: 'x' }, loginTime: 'L', lastActive: 1, status: 's', counters: COUNTERS }).shift, 'Por Asignar');
});

testAsync('latido tras guardar una tarea: un latido con datos viejos no pisa la tarea recién guardada', async () => {
    const db = createFakeDatabase({ active_sessions: { [UID]: { name: 'Ana', status: 'En Línea', totalTasks: 4 } } });
    const repo = newRepository(db);
    const saved = rec('Revisar GGR', 'Finalizada', 777, 'listo');

    await repo.persistTaskToActiveSession(UID, 'a', saved);
    // Latido calculado ANTES del guardado (snapshot viejo del DOM/estado): no contiene tasks
    const stale = buildSessionMetadata({ user: { name: 'Ana', email: 'a@x.co', uid: UID }, loginTime: 'L', lastActive: 1, status: 'En Línea', counters: { ...COUNTERS, percentage: 0 }, timeline: [] });
    await repo.syncSessionMetadata(UID, stale);

    assert.deepEqual(db.getAt(`${TASKS_PATH}/a`), saved, 'la tarea guardada sigue intacta');
    assert.equal(db.getAt(`active_sessions/${UID}/percentage`), 0, 'el latido sí actualizó sus metadatos');
    assert.deepEqual(db.log.filter((o) => o.op === 'update').map((o) => o.path), [`${TASKS_PATH}/a`, `active_sessions/${UID}`]);
    assert.ok(!db.log.some((o) => o.op === 'set'), 'ningún set() pisa nodos completos');
});

testAsync('syncSessionMetadata: devuelve la Promise real (rechazada si falla) y registra el error', async () => {
    resetEnv();
    const db = createFakeDatabase({}, { failPaths: { [`active_sessions/${UID}`]: ['update'] } });
    const error = await newRepository(db).syncSessionMetadata(UID, { name: 'x' }).then(() => null, (e) => e);

    assert.ok(error, 'el fallo no se oculta');
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(consoleErrors.length, 1);
});

await summarizeAsync();
