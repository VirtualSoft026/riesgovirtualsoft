import { createRunner, assert } from '../test-harness.mjs';
import {
    hasRealSetOptions,
    requiresSpecificSetSelection,
    listUnmanagedTasks,
    shouldValidateManagedTasks
} from '../../domain/shifts/shift-closure-rules.js';

const { test, summarize } = createRunner('shift-closure-rules.js');

const opt = (value, disabled = false) => ({ value, disabled });

test('hasRealSetOptions: false sin select o sin options', () => {
    assert.equal(hasRealSetOptions(null), false);
    assert.equal(hasRealSetOptions({}), false);
});

test('hasRealSetOptions: ignora "", "Todos" y deshabilitadas', () => {
    assert.equal(hasRealSetOptions({ options: [opt(''), opt('Todos'), opt('SET A', true)] }), false);
});

test('hasRealSetOptions: true con al menos una opción real habilitada', () => {
    assert.equal(hasRealSetOptions({ options: [opt(''), opt('Todos'), opt('SET A')] }), true);
});

test('requiresSpecificSetSelection: exige elegir si hay opciones reales y el valor es "" o "Todos"', () => {
    const options = [opt(''), opt('Todos'), opt('SET A')];
    assert.equal(requiresSpecificSetSelection({ options, value: '' }), true);
    assert.equal(requiresSpecificSetSelection({ options, value: 'Todos' }), true);
    assert.equal(requiresSpecificSetSelection({ options, value: 'SET A' }), false);
});

test('requiresSpecificSetSelection: no exige nada si no hay opciones reales', () => {
    assert.equal(requiresSpecificSetSelection({ options: [opt('')], value: '' }), false);
    assert.equal(requiresSpecificSetSelection(null), false);
});

test('shouldValidateManagedTasks: solo Gestor con caché de tareas', () => {
    assert.equal(shouldValidateManagedTasks({ role: 'Gestor' }, {}), true);
    assert.equal(shouldValidateManagedTasks({ role: 'Supervisor' }, {}), false);
    assert.equal(shouldValidateManagedTasks({ role: 'Gestor' }, null), false);
    assert.equal(shouldValidateManagedTasks(null, {}), false);
});

test('listUnmanagedTasks: con catálogo, acepta Finalizada y No Realizada en cualquier formato', () => {
    const allTasks = [
        { id: 1, Tarea: 'A' },
        { id: 2, Tarea: 'B' },
        { id: 3, Tarea: 'C' },
        { id: 4, Tarea: 'D' }
    ];
    const taskStateCache = {
        1: { status: 'Finalizada' },
        2: { status: 'no_realizada' },
        3: { status: 'En Proceso' }
        // 4 ausente
    };
    assert.deepEqual(listUnmanagedTasks({ allTasks, taskStateCache }), ['C', 'D']);
});

test('listUnmanagedTasks: nombre de respaldo = entry.name, luego el id canónico', () => {
    const allTasks = [{ id: 7 }, { id: 8 }];
    const taskStateCache = { 7: { status: 'Pendiente', name: 'Nombre en caché' } };
    assert.deepEqual(listUnmanagedTasks({ allTasks, taskStateCache }), ['Nombre en caché', '8']);
});

test('listUnmanagedTasks: las tareas extra pendientes se agregan al final', () => {
    const allTasks = [{ id: 1, Tarea: 'A' }];
    const taskStateCache = {
        1: { status: 'Finalizada' },
        extra_1: { status: 'En Proceso', name: 'Extra 1' },
        extra_2: { status: 'Finalizada', name: 'Extra 2' }
    };
    assert.deepEqual(listUnmanagedTasks({ allTasks, taskStateCache }), ['Extra 1']);
});

test('listUnmanagedTasks: sin catálogo (allTasks no es arreglo) revisa el caché completo', () => {
    const taskStateCache = {
        10: { status: 'Pendiente', name: 'Diez' },
        11: { status: 'Finalizada' },
        extra_5: { status: 'Pendiente' }
    };
    assert.deepEqual(listUnmanagedTasks({ allTasks: undefined, taskStateCache }), ['Diez', 'extra_5']);
});

test('listUnmanagedTasks: todo gestionado devuelve arreglo vacío', () => {
    assert.deepEqual(
        listUnmanagedTasks({ allTasks: [{ id: 1, Tarea: 'A' }], taskStateCache: { 1: { status: 'FINALIZADA' } } }),
        []
    );
});

summarize();
