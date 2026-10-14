import { createRunner, assert } from '../../test-harness.mjs';
import {
    getScheduledGestoresCountForShift,
    getShiftForDate
} from '../../../domain/schedules/schedule-service.js';

const { test, summarize } = createRunner('schedule-service');

// ── Helpers ────────────────────────────────────────────────────────────────

/** Convierte una fecha UTC a serial Excel (días desde 30-dic-1899). */
function toSerial(year, month, day) {
    // month: 0-indexed
    return (Date.UTC(year, month, day) - Date.UTC(1899, 11, 30)) / 86400000;
}

/** Función identidad de turno para pruebas (rawShift → shiftName). */
const identityCategory = (shift) => shift;

// Datos base: bloque con serial de Lunes 5 oct 2026 y Martes 6 oct 2026
const SERIAL_MON = toSerial(2026, 9, 5); // lun 5-oct-2026
const SERIAL_TUE = toSerial(2026, 9, 6); // mar 6-oct-2026

// rows estándar: dateRow, dayRow, 3 gestores, fila vacía de parada
const buildRows = () => [
    [null, SERIAL_MON, SERIAL_TUE],   // 0: fila de fechas
    ['', 'Lunes', 'Martes'],          // 1: fila de nombres de día
    ['Ana Gómez', 'Mañana', 'Tarde'], // 2: gestor 1
    ['Luis Pérez', 'Tarde', 'Mañana'],// 3: gestor 2
    ['María López', 'Mañana', 'Descansa'], // 4
    ['', ''],                          // 5: fila vacía → parada
];

const BLOCKS = [{ startRow: 0 }];
const DATE_MON = new Date(2026, 9, 5); // local: lun 5-oct-2026

// ── getScheduledGestoresCountForShift: validación de args ─────────────────

test('retorna 0 si rows no es array', () => {
    const count = getScheduledGestoresCountForShift(
        'Mañana', null, BLOCKS, identityCategory, DATE_MON
    );
    assert.strictEqual(count, 0);
});

test('retorna 0 si scheduleBlocks está vacío', () => {
    const count = getScheduledGestoresCountForShift(
        'Mañana', buildRows(), [], identityCategory, DATE_MON
    );
    assert.strictEqual(count, 0);
});

test('retorna 0 si getShiftCategory no es función', () => {
    const count = getScheduledGestoresCountForShift(
        'Mañana', buildRows(), BLOCKS, null, DATE_MON
    );
    assert.strictEqual(count, 0);
});

// ── getScheduledGestoresCountForShift: conteo por fecha ───────────────────

test('cuenta gestores en turno Mañana para fecha encontrada por serial', () => {
    // Col 1 (Lunes): Ana='Mañana', Luis='Tarde', María='Mañana' → 2
    const count = getScheduledGestoresCountForShift(
        'Mañana', buildRows(), BLOCKS, identityCategory, DATE_MON
    );
    assert.strictEqual(count, 2);
});

test('cuenta gestores en turno Tarde para fecha encontrada por serial', () => {
    // Col 1 (Lunes): solo Luis='Tarde' → 1
    const count = getScheduledGestoresCountForShift(
        'Tarde', buildRows(), BLOCKS, identityCategory, DATE_MON
    );
    assert.strictEqual(count, 1);
});

test('cuenta gestores en Martes (segunda columna del serial)', () => {
    const DATE_TUE = new Date(2026, 9, 6);
    // Col 2 (Martes): Ana='Tarde', Luis='Mañana', María='Descansa'
    const count = getScheduledGestoresCountForShift(
        'Mañana', buildRows(), BLOCKS, identityCategory, DATE_TUE
    );
    assert.strictEqual(count, 1);
});

test('retorna 0 si ningún gestor tiene ese turno', () => {
    const count = getScheduledGestoresCountForShift(
        'Descansa', buildRows(), BLOCKS, identityCategory, DATE_MON
    );
    assert.strictEqual(count, 0);
});

// ── getScheduledGestoresCountForShift: fallback por nombre de día ──────────

test('fallback a nombre de día cuando la fecha no coincide con ningún serial', () => {
    // Fecha no está en el rango → fallback al último bloque, dayRow, busca 'Lunes'
    // dayRow = ['', 'Lunes', 'Martes'] → 'Lunes' en col 1
    // Gestores col 1: Ana='Mañana', Luis='Tarde', María='Mañana' → 2
    const FUTURE_DATE = new Date(2030, 0, 7); // lunes en el futuro
    const count = getScheduledGestoresCountForShift(
        'Mañana', buildRows(), BLOCKS, identityCategory, FUTURE_DATE
    );
    assert.strictEqual(count, 2);
});

test('fallback por getDay() cuando no encuentra nombre de día', () => {
    // rows sin nombres de día reconocibles; fecha = miércoles (getDay()=3)
    const rows = [
        [null, 1, 2],
        ['', 'X', 'Y', 'Z'],  // no contiene nombres de día estándar
        ['A', 'Mañana', 'Tarde', 'Mañana'],
        ['B', 'Tarde', 'Mañana', 'Tarde'],
    ];
    const WED = new Date(2030, 0, 9); // miércoles hipotético (getDay()=3)
    // fallback column = 3 → 'Z' column
    const count = getScheduledGestoresCountForShift(
        'Mañana', rows, [{ startRow: 0 }], identityCategory, WED
    );
    // col 3: A='Mañana', B='Tarde' → 1
    assert.strictEqual(count, 1);
});

// ── getShiftForDate: validación de args ───────────────────────────────────

test('getShiftForDate retorna "Por Asignar" si rows es null', () => {
    const shift = getShiftForDate(null, BLOCKS, 'Ana Gómez', DATE_MON);
    assert.strictEqual(shift, 'Por Asignar');
});

test('getShiftForDate retorna "Por Asignar" si scheduleBlocks vacío', () => {
    const shift = getShiftForDate(buildRows(), [], 'Ana Gómez', DATE_MON);
    assert.strictEqual(shift, 'Por Asignar');
});

// ── getShiftForDate: búsqueda por serial ──────────────────────────────────

test('getShiftForDate devuelve turno correcto para gestor encontrado por serial', () => {
    const shift = getShiftForDate(buildRows(), BLOCKS, 'Ana Gómez', DATE_MON);
    assert.strictEqual(shift, 'Mañana');
});

test('getShiftForDate devuelve turno para segundo gestor', () => {
    const shift = getShiftForDate(buildRows(), BLOCKS, 'Luis Pérez', DATE_MON);
    assert.strictEqual(shift, 'Tarde');
});

test('getShiftForDate devuelve "Descansa" si la celda está vacía', () => {
    const rows = [
        [null, SERIAL_MON],
        ['', 'Lunes'],
        ['Carlos Ruiz', ''],
    ];
    const shift = getShiftForDate(rows, [{ startRow: 0 }], 'Carlos Ruiz', DATE_MON);
    assert.strictEqual(shift, 'Descansa');
});

test('getShiftForDate retorna "Por Asignar" si el gestor no está en la lista', () => {
    const shift = getShiftForDate(buildRows(), BLOCKS, 'Gestor Fantasma', DATE_MON);
    assert.strictEqual(shift, 'Por Asignar');
});

// ── getShiftForDate: parada en fila de cabecera ───────────────────────────

test('getShiftForDate se detiene en fila con "GESTOR" como primer elemento', () => {
    const rows = [
        [null, SERIAL_MON],
        ['', 'Lunes'],
        ['GESTOR', 'Mañana'],  // cabecera → parada
        ['Ana Gómez', 'Tarde'],
    ];
    const shift = getShiftForDate(rows, [{ startRow: 0 }], 'Ana Gómez', DATE_MON);
    assert.strictEqual(shift, 'Por Asignar');
});

summarize();
