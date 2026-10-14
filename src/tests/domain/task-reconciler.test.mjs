import { createRunner, assert } from '../test-harness.mjs';
import {
    mergeTaskCaches,
    computeLocalTaskMigrations,
    reconcileScheduledTaskWithSession,
} from '../../domain/tasks/task-reconciler.js';

const { test, summarize } = createRunner('task-reconciler');

const NOW = 1_700_000_000_000;

// ── mergeTaskCaches ───────────────────────────────────────────────────────────

test('localCache null + remoteCache con entradas → devuelve copia del remote', () => {
    const remote = { t1: { name: 'A', updatedAt: NOW } };
    const merged = mergeTaskCaches(null, remote);
    assert.equal(merged.t1.name, 'A');
});

test('localCache con entradas + remoteCache null → devuelve copia del local', () => {
    const local  = { t1: { name: 'A', updatedAt: NOW } };
    const merged = mergeTaskCaches(local, null);
    assert.equal(merged.t1.name, 'A');
});

test('ambos null → devuelve {}', () => {
    const merged = mergeTaskCaches(null, null);
    assert.deepEqual(merged, {});
});

test('remote estrictamente más nuevo reemplaza local', () => {
    const local  = { t1: { name: 'Local',  updatedAt: NOW - 1000 } };
    const remote = { t1: { name: 'Remote', updatedAt: NOW } };
    const merged = mergeTaskCaches(local, remote);
    assert.equal(merged.t1.name, 'Remote');
});

test('mismo updatedAt → local gana (empate)', () => {
    const local  = { t1: { name: 'Local',  updatedAt: NOW } };
    const remote = { t1: { name: 'Remote', updatedAt: NOW } };
    const merged = mergeTaskCaches(local, remote);
    assert.equal(merged.t1.name, 'Local');
});

test('local más nuevo → local gana', () => {
    const local  = { t1: { name: 'Local',  updatedAt: NOW } };
    const remote = { t1: { name: 'Remote', updatedAt: NOW - 1000 } };
    const merged = mergeTaskCaches(local, remote);
    assert.equal(merged.t1.name, 'Local');
});

test('entrada solo en remote → se agrega al merged', () => {
    const local  = { t1: { name: 'A', updatedAt: NOW } };
    const remote = { t2: { name: 'B', updatedAt: NOW } };
    const merged = mergeTaskCaches(local, remote);
    assert.equal(merged.t1.name, 'A');
    assert.equal(merged.t2.name, 'B');
});

test('entrada solo en local → se conserva', () => {
    const local  = { t1: { name: 'Solo local', updatedAt: NOW } };
    const remote = {};
    const merged = mergeTaskCaches(local, remote);
    assert.equal(merged.t1.name, 'Solo local');
});

test('remote sin updatedAt → local gana (legacy entry)', () => {
    const local  = { t1: { name: 'Local',  updatedAt: NOW } };
    const remote = { t1: { name: 'Remote' } };          // sin updatedAt
    const merged = mergeTaskCaches(local, remote);
    assert.equal(merged.t1.name, 'Local');
});

test('local sin updatedAt + remote sin updatedAt → local gana', () => {
    const local  = { t1: { name: 'Local' } };
    const remote = { t1: { name: 'Remote' } };
    const merged = mergeTaskCaches(local, remote);
    assert.equal(merged.t1.name, 'Local');
});

test('no muta los objetos de entrada', () => {
    const local  = { t1: { name: 'A', updatedAt: NOW - 1000 } };
    const remote = { t1: { name: 'B', updatedAt: NOW } };
    mergeTaskCaches(local, remote);
    assert.equal(local.t1.name,  'A');
    assert.equal(remote.t1.name, 'B');
});

// ── computeLocalTaskMigrations ────────────────────────────────────────────────

test('tarea sin updatedAt → se estampa con now', () => {
    const merged  = { t1: { name: 'A', status: 'Pendiente', observation: '' } };
    const results = computeLocalTaskMigrations(merged, {}, NOW);
    assert.equal(results.length, 1);
    assert.equal(results[0].record.updatedAt, NOW);
});

test('tarea que ya existe idéntica en remote → se omite', () => {
    const entry  = { name: 'A', status: 'Pendiente', observation: '', updatedAt: NOW };
    const merged = { t1: entry };
    const remote = { t1: { ...entry } };
    const results = computeLocalTaskMigrations(merged, remote, NOW);
    assert.equal(results.length, 0);
});

test('tarea con status diferente al remote → se incluye', () => {
    const merged = { t1: { name: 'A', status: 'Finalizada',  observation: '', updatedAt: NOW } };
    const remote = { t1: { name: 'A', status: 'Pendiente',   observation: '', updatedAt: NOW } };
    const results = computeLocalTaskMigrations(merged, remote, NOW);
    assert.equal(results.length, 1);
    assert.equal(results[0].taskId, 't1');
});

test('tarea ausente en remote → se incluye', () => {
    const merged  = { t1: { name: 'A', status: 'Pendiente', observation: '', updatedAt: NOW } };
    const results = computeLocalTaskMigrations(merged, {}, NOW);
    assert.equal(results.length, 1);
    assert.equal(results[0].taskId, 't1');
});

test('mergedCache null → devuelve []', () => {
    const results = computeLocalTaskMigrations(null, {}, NOW);
    assert.deepEqual(results, []);
});

test('remoteCache null se trata como {} (todas las entradas van a migración)', () => {
    const merged  = { t1: { name: 'X', status: 'Pendiente', observation: '', updatedAt: NOW } };
    const results = computeLocalTaskMigrations(merged, null, NOW);
    assert.equal(results.length, 1);
});

test('tarea con updatedAt conserva su propio updatedAt (no se reemplaza con now)', () => {
    const original = NOW - 5000;
    const merged   = { t1: { name: 'A', status: 'Pendiente', observation: '', updatedAt: original } };
    const results  = computeLocalTaskMigrations(merged, {}, NOW);
    assert.equal(results[0].record.updatedAt, original);
});

// ── reconcileScheduledTaskWithSession ─────────────────────────────────────────

test('nombre exacto en sesión → devuelve su estado y observación', () => {
    const session = {
        '1': { name: 'Gestión de permisos', status: 'Finalizada', observation: 'Completo' }
    };
    const result = reconcileScheduledTaskWithSession('Gestión de permisos', session);
    assert.equal(result.status, 'Finalizada');
    assert.equal(result.observation, 'Completo');
});

test('nombre fuzzy → coincide si normalización lo empareja', () => {
    // taskNamesMatch normaliza y compara; "revision de eventos" vs "Revisión de Eventos"
    const session = {
        '5': { name: 'Revisión de Eventos', status: 'Finalizada', observation: '' }
    };
    const result = reconcileScheduledTaskWithSession('revision de eventos', session);
    assert.equal(result.status, 'Finalizada');
});

test('sin coincidencia → Pendiente, observación vacía', () => {
    const session = {
        '1': { name: 'Auditoría diaria', status: 'Finalizada', observation: 'OK' }
    };
    const result = reconcileScheduledTaskWithSession('Monitoreo de sistemas', session);
    assert.equal(result.status, 'Pendiente');
    assert.equal(result.observation, '');
});

test('sessionTasks null → Pendiente, observación vacía', () => {
    const result = reconcileScheduledTaskWithSession('Cualquier tarea', null);
    assert.equal(result.status, 'Pendiente');
    assert.equal(result.observation, '');
});

test('sessionTasks vacío → Pendiente, observación vacía', () => {
    const result = reconcileScheduledTaskWithSession('Cualquier tarea', {});
    assert.equal(result.status, 'Pendiente');
    assert.equal(result.observation, '');
});

test('entradas con clave extra_ se omiten en la reconciliación', () => {
    // Las tareas extra no pueden coincidir con las del cronograma
    const session = {
        'extra_1': { name: 'Gestión de permisos', status: 'Finalizada', observation: '' }
    };
    const result = reconcileScheduledTaskWithSession('Gestión de permisos', session);
    assert.equal(result.status, 'Pendiente'); // extra_ ignorada → no coincide
});

test('entry null dentro de session se omite sin lanzar error', () => {
    const session = {
        '1': null,
        '2': { name: 'Revisión de logs', status: 'En Proceso', observation: '' }
    };
    assert.doesNotThrow(() => {
        const result = reconcileScheduledTaskWithSession('Revisión de logs', session);
        assert.equal(result.status, 'En Proceso');
    });
});

test('usa catálogo para resolver nombre legacy antes de comparar', () => {
    const catalog = [{ id: 3, Tarea: 'Conciliación de pasarelas' }];
    const session = {
        '3': { name: 'Tarea 3', status: 'Finalizada', observation: 'OK' }
    };
    const result = reconcileScheduledTaskWithSession(
        'Conciliación de pasarelas', session, catalog
    );
    assert.equal(result.status, 'Finalizada');
});

test('status faltante en entry → usa "Pendiente" por defecto', () => {
    const session = {
        '1': { name: 'Revisión de logs', observation: 'Nada' } // sin status
    };
    const result = reconcileScheduledTaskWithSession('Revisión de logs', session);
    assert.equal(result.status, 'Pendiente');
});

summarize();
