/**
 * W-26 (Fase 3, paso 3.0): lo que `main` tiene y la rama no.
 *
 *  1. Ids estables de las tareas del maestro (hash de Set + Tarea, rango 0-9999).
 *  2. Purga de tareas huérfanas también en Firebase (`active_sessions/{uid}/tasks`).
 *
 * Prueba diferencial contra la copia LITERAL del código de `main` (6ddef16, `loadExcelTasks()`).
 */
import { createRunner, assert } from '../test-harness.mjs';
import { createRng } from '../controllers/tareas-fake-dom.mjs';
import {
    assignMasterRowIds, reconcileGestorTaskCache, MASTER_TASK_ID_RANGE
} from '../../domain/tasks/task-catalog.js';
import { createTaskRepository } from '../../services/firebase/firebase-task-repository.js';

const { test, testAsync, summarizeAsync } = createRunner('W-26 ids estables y purga de huérfanas en Firebase (diferencial vs main)');

function canonicalTaskId(id) {
    return String(id);
}

function mainAssignIds(json) {
// --- copia LITERAL de main, app.js líneas 1364-1381 ---
        const usedMasterTaskIds = new Set();
        json.forEach((row) => {
            const set = row['Set '] || row['Set'] || 'Otros';
            const taskName = row['Tarea'] || '';
            const raw = `${String(set).trim().toLowerCase()}::${String(taskName).trim().toLowerCase()}`;
            let hash = 0;
            for (let i = 0; i < raw.length; i++) {
                hash = ((hash << 5) - hash) + raw.charCodeAt(i);
                hash |= 0;
            }
            // Rango 0-9999, separado del rango 10000-99999 de las tareas sintéticas
            // (generateDeterministicMockTaskId) para que nunca puedan coincidir.
            let candidate = Math.abs(hash) % 10000;
            while (usedMasterTaskIds.has(candidate)) {
                candidate = (candidate + 1) % 10000;
            }
            usedMasterTaskIds.add(candidate);
            row.id = candidate;
        });
    return json;
}

function mainPurge(processedRows, taskStateCache) {
// --- copia LITERAL de main, app.js líneas 1485-1495 ---
            const validAssignedIds = new Set(processedRows.map((row, index) => canonicalTaskId(row.id !== undefined ? row.id : index)));

            // Purgar tareas huérfanas o desactualizadas del caché local (evita que tareas de turnos pasados bloqueen el cierre)
            let cacheWasPurged = false;
            const purgedTaskIds = [];
            for (const cachedId in taskStateCache) {
                if (!validAssignedIds.has(cachedId) && !cachedId.startsWith('extra_')) {
                    delete taskStateCache[cachedId];
                    cacheWasPurged = true;
                    purgedTaskIds.push(cachedId);
                }
            }
    return { cacheWasPurged, purgedTaskIds };
}

const SETS = ['Casino', 'Deportes', 'Pagos', ' casino ', 'CASINO', '', undefined];
const TASKS = ['Revisar GGR', 'Revisar apuestas', 'Cuadre diario', 'revisar ggr ', 'Aprobación de retiros', '', 'Ñandú & Cía'];

function randomRows(rng, n) {
    const rows = [];

    for (let i = 0; i < n; i++) {
        const row = { Tarea: TASKS[Math.floor(rng() * TASKS.length)] };
        const set = SETS[Math.floor(rng() * SETS.length)];

        if (set !== undefined) row[rng() < 0.5 ? 'Set ' : 'Set'] = set;
        rows.push(row);
    }

    return rows;
}

test('assignMasterRowIds: mismos ids que main en 500 maestros aleatorios (con choques y filas repetidas)', () => {
    const rng = createRng(26);

    for (let i = 0; i < 500; i++) {
        const rows = randomRows(rng, Math.floor(rng() * 12));
        const ours = assignMasterRowIds(JSON.parse(JSON.stringify(rows))).map((r) => r.id);
        const theirs = mainAssignIds(JSON.parse(JSON.stringify(rows))).map((r) => r.id);

        assert.deepEqual(ours, theirs, `maestro ${i}`);
    }
});

test('assignMasterRowIds: el id no depende de la posición de la fila (insertar o reordenar no deja huérfano el progreso)', () => {
    const base = [
        { 'Set ': 'Casino', Tarea: 'Revisar GGR' },
        { 'Set ': 'Deportes', Tarea: 'Revisar apuestas' },
        { Set: 'Pagos', Tarea: 'Cuadre diario' }
    ];
    const ids = Object.fromEntries(assignMasterRowIds(JSON.parse(JSON.stringify(base))).map((r) => [r.Tarea, r.id]));
    const reordered = [{ 'Set ': 'Nuevo', Tarea: 'Fila insertada' }, base[2], base[0], base[1]].map((r) => ({ ...r }));
    const idsAfter = Object.fromEntries(assignMasterRowIds(reordered).map((r) => [r.Tarea, r.id]));

    assert.equal(idsAfter['Revisar GGR'], ids['Revisar GGR']);
    assert.equal(idsAfter['Revisar apuestas'], ids['Revisar apuestas']);
    assert.equal(idsAfter['Cuadre diario'], ids['Cuadre diario']);
    assert.ok(Object.values(idsAfter).every((id) => id >= 0 && id < MASTER_TASK_ID_RANGE));
});

test('reconcileGestorTaskCache: purga e ids purgados iguales a main; las extra_ nunca se purgan', () => {
    const rng = createRng(126);

    for (let i = 0; i < 300; i++) {
        const rows = randomRows(rng, Math.floor(rng() * 6));

        assignMasterRowIds(rows);

        const cache = {};

        [...rows.map((r) => String(r.id)), '9999', '10001', 'viejo', 'extra_1', 'extra_zz'].forEach((id) => {
            if (rng() < 0.5) cache[id] = { name: 'N' + id, status: 'Finalizada', observation: '', updatedAt: 1 };
        });

        const mainCache = JSON.parse(JSON.stringify(cache));
        const ourCache = JSON.parse(JSON.stringify(cache));
        const expected = mainPurge(rows, mainCache);
        const actual = reconcileGestorTaskCache(ourCache, rows, 5);

        assert.deepEqual(actual.purgedTaskIds, expected.purgedTaskIds, `escenario ${i}`);
        assert.equal(actual.cacheWasPurged, expected.cacheWasPurged);
        assert.ok(actual.purgedTaskIds.every((id) => !id.startsWith('extra_')));
    }
});

function createFakeDatabase({ fail = false } = {}) {
    const updates = [];

    return {
        updates,
        ref(path) {
            return {
                update(map) {
                    updates.push({ path: path === undefined ? '' : path, map });
                    return fail ? Promise.reject(new Error('PERMISSION_DENIED')) : Promise.resolve();
                }
            };
        }
    };
}

testAsync('removeActiveSessionTasks: una sola escritura multirruta con null por cada tarea purgada', async () => {
    const database = createFakeDatabase();
    const repository = createTaskRepository({ database });

    await repository.removeActiveSessionTasks('uid-1', ['12', '345']);

    assert.equal(database.updates.length, 1);
    assert.equal(database.updates[0].path, '');
    assert.deepEqual(database.updates[0].map, {
        'active_sessions/uid-1/tasks/12': null,
        'active_sessions/uid-1/tasks/345': null
    });
});

testAsync('removeActiveSessionTasks: sin uid o sin ids no escribe nada; un error de Firebase se propaga', async () => {
    const database = createFakeDatabase();
    const repository = createTaskRepository({ database });

    await repository.removeActiveSessionTasks('', ['1']);
    await repository.removeActiveSessionTasks('uid-1', []);
    await repository.removeActiveSessionTasks('uid-1', null);
    assert.equal(database.updates.length, 0);

    const failing = createTaskRepository({ database: createFakeDatabase({ fail: true }) });

    await assert.rejects(() => failing.removeActiveSessionTasks('uid-1', ['1']), /PERMISSION_DENIED/);
});

await summarizeAsync();
