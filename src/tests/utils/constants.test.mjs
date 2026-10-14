import { createRunner, assert } from '../test-harness.mjs';
import {
    STORAGE_KEYS,
    USER_STATUS,
    PERMISSION_STATUS,
    TASK_STATUS,
    TIMELINE_EVENT,
    NATIVE_IDLE_THRESHOLD_MS,
    MAX_SHIFT_DURATION_MS,
    EXTRA_TASK_KEY_PREFIX
} from '../../utils/constants.js';

const { test, summarize } = createRunner('constants.js');

test('STORAGE_KEYS conserva las claves de localStorage usadas hoy en app.js', () => {
    assert.equal(STORAGE_KEYS.CURRENT_USER, 'riskOps_currentUser');
    assert.equal(STORAGE_KEYS.CACHE, 'riskOps_cache');
    assert.equal(STORAGE_KEYS.BREAK_STATE, 'riskOps_breakState');
    assert.equal(STORAGE_KEYS.TIMELINE, 'riskOps_timeline');
});

test('los catálogos de estado quedan congelados (Object.freeze)', () => {
    assert.ok(Object.isFrozen(STORAGE_KEYS));
    assert.ok(Object.isFrozen(USER_STATUS));
    assert.ok(Object.isFrozen(PERMISSION_STATUS));
    assert.ok(Object.isFrozen(TASK_STATUS));
    assert.ok(Object.isFrozen(TIMELINE_EVENT));
});

test('intentar mutar un catálogo congelado no cambia su valor', () => {
    const before = TASK_STATUS.PENDING;

    assert.throws(() => {
        TASK_STATUS.PENDING = 'Otra cosa';
    }, TypeError);

    assert.equal(TASK_STATUS.PENDING, before);
});

test('TASK_STATUS cubre los cuatro estados usados por el cierre de turno', () => {
    assert.equal(TASK_STATUS.PENDING, 'Pendiente');
    assert.equal(TASK_STATUS.IN_PROGRESS, 'En Proceso');
    assert.equal(TASK_STATUS.DONE, 'Finalizada');
    assert.equal(TASK_STATUS.NOT_DONE, 'No Realizada');
});

test('los umbrales de tiempo son números positivos y consistentes entre sí', () => {
    assert.ok(NATIVE_IDLE_THRESHOLD_MS > 0);
    assert.ok(MAX_SHIFT_DURATION_MS > NATIVE_IDLE_THRESHOLD_MS);
});

test('EXTRA_TASK_KEY_PREFIX mantiene el prefijo esperado', () => {
    assert.equal(EXTRA_TASK_KEY_PREFIX, 'extra_');
});

summarize();
