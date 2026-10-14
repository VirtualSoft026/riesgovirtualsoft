import { createRunner, assert } from '../test-harness.mjs';
import {
    isNonEmptyString,
    isFiniteNumber,
    isValidDate,
    isOneOf,
    findMissingFields
} from '../../utils/validation.js';

const { test, summarize } = createRunner('validation.js');

test('isNonEmptyString exige texto no vacío tras recortar espacios', () => {
    assert.equal(isNonEmptyString('hola'), true);
    assert.equal(isNonEmptyString('   '), false);
    assert.equal(isNonEmptyString(''), false);
    assert.equal(isNonEmptyString(123), false);
    assert.equal(isNonEmptyString(null), false);
});

test('isFiniteNumber exige un número finito real (no texto, no Infinity, no NaN)', () => {
    assert.equal(isFiniteNumber(42), true);
    assert.equal(isFiniteNumber(0), true);
    assert.equal(isFiniteNumber(NaN), false);
    assert.equal(isFiniteNumber(Infinity), false);
    assert.equal(isFiniteNumber('42'), false);
});

test('isValidDate exige una instancia de Date válida (no un string de fecha)', () => {
    assert.equal(isValidDate(new Date()), true);
    assert.equal(isValidDate(new Date('fecha-invalida')), false);
    assert.equal(isValidDate('2026-01-01'), false);
    assert.equal(isValidDate(null), false);
});

test('isOneOf acepta arreglos y Sets como lista de valores permitidos', () => {
    assert.equal(isOneOf('b', ['a', 'b', 'c']), true);
    assert.equal(isOneOf('x', ['a', 'b']), false);
    assert.equal(isOneOf(2, new Set([1, 2, 3])), true);
});

test('findMissingFields detecta undefined, null y "" como campos faltantes', () => {
    const faltantes = findMissingFields({ a: 1, b: '', c: null }, ['a', 'b', 'c', 'd']);

    assert.deepEqual(faltantes, ['b', 'c', 'd']);
});

test('findMissingFields trata un origen null/undefined como objeto vacío', () => {
    assert.deepEqual(findMissingFields(null, ['x', 'y']), ['x', 'y']);
    assert.deepEqual(findMissingFields(undefined, ['x']), ['x']);
});

test('findMissingFields devuelve un arreglo vacío cuando no falta nada', () => {
    assert.deepEqual(findMissingFields({ a: 1, b: 'texto' }, ['a', 'b']), []);
});

summarize();
