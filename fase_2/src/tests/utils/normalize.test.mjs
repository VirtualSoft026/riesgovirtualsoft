import { createRunner, assert } from '../test-harness.mjs';
import {
    normalizeName,
    namesMatch,
    cleanText,
    normalizeTaskName,
    taskNamesMatch,
    setNamesMatch
} from '../../utils/normalize.js';

const { test, summarize } = createRunner('normalize.js');

test('normalizeName quita acentos, espacios y pasa a minúsculas', () => {
    assert.equal(normalizeName('María José'), 'maria jose');
    assert.equal(normalizeName('  Pedro  '), 'pedro');
});

test('normalizeName devuelve "" con valores vacíos', () => {
    assert.equal(normalizeName(''), '');
    assert.equal(normalizeName(null), '');
    assert.equal(normalizeName(undefined), '');
});

test('namesMatch acepta un nombre parcial contenido en el nombre completo', () => {
    assert.equal(namesMatch('Juan Pérez', 'Juan Pérez García'), true);
});

test('namesMatch rechaza nombres distintos', () => {
    assert.equal(namesMatch('Juan', 'Pedro'), false);
});

test('namesMatch aplica la excepción documentada "Daniel" vs "Josue"', () => {
    // Regla de negocio explícita en el código: un nombre corto "Daniel" no
    // debe hacer match contra un nombre que contenga "Josue", aunque ambos
    // pasen por el mismo flujo de comparación por tokens.
    assert.equal(namesMatch('Daniel', 'Josue Alvarez'), false);
});

test('namesMatch devuelve false si algún nombre queda vacío tras filtrar tokens cortos', () => {
    // "Jo" tiene 2 caracteres y el filtro exige más de 2, así que no queda
    // ningún token para comparar.
    assert.equal(namesMatch('Jo', 'Josue'), false);
    assert.equal(namesMatch('', 'Juan'), false);
});

test('cleanText quita tildes, puntuación y colapsa espacios', () => {
    assert.equal(cleanText('Conciliación de Pasarelas!'), 'conciliacion de pasarelas');
});

test('cleanText devuelve "" con valores no-string o vacíos', () => {
    assert.equal(cleanText(123), '');
    assert.equal(cleanText(null), '');
    assert.equal(cleanText(''), '');
});

test('normalizeTaskName reconoce las variantes históricas de nombres de tarea', () => {
    assert.equal(normalizeTaskName('Conciliación de Pasarelas'), 'conciliacion de pasarelas');
    assert.equal(normalizeTaskName('Revisión de Billetera Usuarios'), 'revision de billetera usuarios pdv');
    assert.equal(normalizeTaskName('Revisión de Eventos Especiales'), 'revision de eventos');
});

test('normalizeTaskName deja igual (solo limpio) un nombre sin alias conocido', () => {
    assert.equal(normalizeTaskName('Otra tarea cualquiera'), 'otra tarea cualquiera');
});

test('taskNamesMatch reconoce coincidencia exacta tras normalizar', () => {
    assert.equal(taskNamesMatch('Tarea X', 'tarea x'), true);
});

test('taskNamesMatch aplica tolerancia difusa (longitud >= 15 y diferencia <= 6)', () => {
    const base = 'a'.repeat(20);

    assert.equal(taskNamesMatch(base + 'bcdefg', base), true); // diferencia de 6: coincide
    assert.equal(taskNamesMatch(base + 'bcdefgh', base), false); // diferencia de 7: no coincide
});

test('taskNamesMatch rechaza nombres cortos y distintos, y valores vacíos', () => {
    assert.equal(taskNamesMatch('Tarea A', 'Tarea B'), false);
    assert.equal(taskNamesMatch('', 'Tarea'), false);
});

test('setNamesMatch compara SETs por contención después de limpiar el texto', () => {
    assert.equal(setNamesMatch('SET 1', 'Set 1 Soporte'), true);
    assert.equal(setNamesMatch('SET 1', 'SET 2'), false);
    assert.equal(setNamesMatch(null, 'SET 1'), false);
});

summarize();
