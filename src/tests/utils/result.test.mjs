import { createRunner, assert } from '../test-harness.mjs';
import { ok, fail, ERROR_CODES } from '../../utils/result.js';

const { test, summarize } = createRunner('result.js');

test('ok() construye un resultado exitoso congelado', () => {
    const result = ok(42);

    assert.deepEqual(result, { ok: true, value: 42 });
    assert.ok(Object.isFrozen(result));
});

test('fail() construye un error con código, mensaje y causa', () => {
    const result = fail(ERROR_CODES.VALIDATION_ERROR, 'Campo requerido', { campo: 'nombre' });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'VALIDATION_ERROR');
    assert.equal(result.error.message, 'Campo requerido');
    assert.deepEqual(result.error.cause, { campo: 'nombre' });
});

test('fail() usa message="" y cause=null por defecto', () => {
    const result = fail(ERROR_CODES.NETWORK_ERROR);

    assert.equal(result.error.message, '');
    assert.equal(result.error.cause, null);
});

test('fail() devuelve un resultado y un error congelados', () => {
    const result = fail(ERROR_CODES.PERSISTENCE_ERROR, 'no se pudo guardar');

    assert.ok(Object.isFrozen(result));
    assert.ok(Object.isFrozen(result.error));
});

test('ERROR_CODES incluye los códigos usados por adapters y controladores, y está congelado', () => {
    assert.equal(ERROR_CODES.AUTH_REQUIRED, 'AUTH_REQUIRED');
    assert.equal(ERROR_CODES.PERMISSION_DENIED, 'PERMISSION_DENIED');
    assert.equal(ERROR_CODES.VALIDATION_ERROR, 'VALIDATION_ERROR');
    assert.equal(ERROR_CODES.NETWORK_ERROR, 'NETWORK_ERROR');
    assert.equal(ERROR_CODES.SOURCE_FORMAT_ERROR, 'SOURCE_FORMAT_ERROR');
    assert.equal(ERROR_CODES.PERSISTENCE_ERROR, 'PERSISTENCE_ERROR');
    assert.ok(Object.isFrozen(ERROR_CODES));
});

summarize();
