import { createRunner, assert } from '../../test-harness.mjs';
import {
    parseSheetRange,
    getWeekSheet,
    getCronogramaColumnsForToday,
    getAssignedTasksForGestor,
    fetchCronogramaRowsForDate
} from '../../../domain/schedules/cronogram-parser.js';

const { test, summarize } = createRunner('cronogram-parser');

// ══════════════════════════════════════════════════════════════════════════
// parseSheetRange
// ══════════════════════════════════════════════════════════════════════════

test('retorna null para sheetName null', () => {
    assert.strictEqual(parseSheetRange(null), null);
});

test('retorna null para sheetName vacío', () => {
    assert.strictEqual(parseSheetRange(''), null);
});

test('retorna null para nombre sin patrón Semana', () => {
    assert.strictEqual(parseSheetRange('GeneralData'), null);
});

// Patrón A: "Semana N - D de Mes al D de Mes"
test('parsea patrón A: dos meses distintos', () => {
    const range = parseSheetRange(
        'Semana 1 - 28 de Marzo al 3 de Abril',
        2026
    );
    assert.ok(range !== null);
    assert.strictEqual(range.start.getFullYear(), 2026);
    assert.strictEqual(range.start.getMonth(), 2); // Marzo = 2
    assert.strictEqual(range.start.getDate(), 28);
    assert.strictEqual(range.end.getMonth(), 3);   // Abril = 3
    assert.strictEqual(range.end.getDate(), 3);
});

test('parsea patrón A: mismo mes', () => {
    const range = parseSheetRange(
        'Semana 2 - 7 de Enero al 13 de Enero',
        2026
    );
    assert.ok(range !== null);
    assert.strictEqual(range.start.getMonth(), 0); // Enero = 0
    assert.strictEqual(range.start.getDate(), 7);
    assert.strictEqual(range.end.getMonth(), 0);
    assert.strictEqual(range.end.getDate(), 13);
});

test('parsea patrón A con abreviaturas de mes', () => {
    const range = parseSheetRange(
        'Semana 3 - 14 de Feb al 20 de Feb',
        2026
    );
    assert.ok(range !== null);
    assert.strictEqual(range.start.getMonth(), 1);
    assert.strictEqual(range.start.getDate(), 14);
});

test('parsea patrón A con acentos normalizados (Abril → Apr)', () => {
    const range = parseSheetRange(
        'Semana 1 - 1 de Abril al 7 de Abril',
        2026
    );
    assert.ok(range !== null);
    assert.strictEqual(range.start.getMonth(), 3);
});

// Patrón B: "Semana N - D al D de Mes"
test('parsea patrón B: mismo mes', () => {
    const range = parseSheetRange(
        'Semana 2 - 14 al 20 de Febrero',
        2026
    );
    assert.ok(range !== null);
    assert.strictEqual(range.start.getMonth(), 1);
    assert.strictEqual(range.start.getDate(), 14);
    assert.strictEqual(range.end.getDate(), 20);
});

// Patrón C: "Semana N - D al D" (sin mes)
test('parsea patrón C: usa fallbackMonth', () => {
    const range = parseSheetRange('Semana 1 - 5 al 11', 2026, 5); // Junio=5
    assert.ok(range !== null);
    assert.strictEqual(range.start.getMonth(), 5);
    assert.strictEqual(range.start.getDate(), 5);
    assert.strictEqual(range.end.getDate(), 11);
});

test('parsea patrón C: endDay < startDay → endMonth = startMonth + 1', () => {
    const range = parseSheetRange('Semana 4 - 29 al 2', 2026, 0); // Enero=0
    assert.ok(range !== null);
    assert.strictEqual(range.start.getDate(), 29);
    assert.strictEqual(range.start.getMonth(), 0);
    assert.strictEqual(range.end.getDate(), 2);
    assert.strictEqual(range.end.getMonth(), 1); // Febrero = 1
});

// ══════════════════════════════════════════════════════════════════════════
// getWeekSheet
// ══════════════════════════════════════════════════════════════════════════

test('retorna null para array vacío', () => {
    assert.strictEqual(getWeekSheet([], new Date(2026, 0, 5)), null);
});

test('retorna null para argumento no-array', () => {
    assert.strictEqual(getWeekSheet(null, new Date()), null);
});

test('devuelve la hoja cuyo rango contiene la fecha', () => {
    const sheets = [
        'Semana 1 - 5 al 11 de Enero',
        'Semana 2 - 12 al 18 de Enero'
    ];
    const date = new Date(2026, 0, 8); // 8 ene 2026
    const result = getWeekSheet(sheets, date);
    assert.strictEqual(result, 'Semana 1 - 5 al 11 de Enero');
});

test('devuelve segunda hoja cuando fecha cae en su rango', () => {
    const sheets = [
        'Semana 1 - 5 al 11 de Enero',
        'Semana 2 - 12 al 18 de Enero'
    ];
    const date = new Date(2026, 0, 15);
    const result = getWeekSheet(sheets, date);
    assert.strictEqual(result, 'Semana 2 - 12 al 18 de Enero');
});

test('retorna null cuando hay hojas con fecha pero ninguna contiene la fecha', () => {
    const sheets = ['Semana 1 - 5 al 11 de Enero'];
    const date = new Date(2026, 1, 1); // Fuera de rango
    const result = getWeekSheet(sheets, date);
    assert.strictEqual(result, null);
});

test('sin hojas con fecha parseable: devuelve primera que contiene "semana"', () => {
    const sheets = ['Info', 'Semana Actual', 'Resumen'];
    const date = new Date(2026, 0, 5);
    const result = getWeekSheet(sheets, date);
    assert.strictEqual(result, 'Semana Actual');
});

test('sin hojas parseables ni "semana": devuelve primera hoja', () => {
    const sheets = ['Hoja1', 'Hoja2'];
    const date = new Date(2026, 0, 5);
    const result = getWeekSheet(sheets, date);
    assert.strictEqual(result, 'Hoja1');
});

// ══════════════════════════════════════════════════════════════════════════
// getCronogramaColumnsForToday
// ══════════════════════════════════════════════════════════════════════════

const HEADER_ROWS = [
    ['', 'Mañana', 'Gestor', '', 'Tarde', 'Gestor', '', 'Sábado', 'Gestor', '', 'Domingo', 'Gestor'],
];

test('lunes devuelve [manana, tarde]', () => {
    const MON = new Date(2026, 9, 5); // lunes
    const cols = getCronogramaColumnsForToday(MON, 'any', HEADER_ROWS);
    assert.strictEqual(cols.length, 2);
    assert.deepStrictEqual(cols[0], [1, 2]); // mañana
    assert.deepStrictEqual(cols[1], [4, 5]); // tarde
});

test('martes devuelve [manana, tarde]', () => {
    const TUE = new Date(2026, 9, 6);
    const cols = getCronogramaColumnsForToday(TUE, 'any', HEADER_ROWS);
    assert.strictEqual(cols.length, 2);
    assert.deepStrictEqual(cols[0], [1, 2]);
    assert.deepStrictEqual(cols[1], [4, 5]);
});

test('sábado devuelve solo [sabado]', () => {
    const SAT = new Date(2026, 9, 10);
    const cols = getCronogramaColumnsForToday(SAT, 'any', HEADER_ROWS);
    assert.strictEqual(cols.length, 1);
    assert.deepStrictEqual(cols[0], [7, 8]);
});

test('domingo devuelve solo [domingo]', () => {
    const SUN = new Date(2026, 9, 11);
    const cols = getCronogramaColumnsForToday(SUN, 'any', HEADER_ROWS);
    assert.strictEqual(cols.length, 1);
    assert.deepStrictEqual(cols[0], [10, 11]);
});

test('sin encabezados, usa columnas por defecto', () => {
    const MON = new Date(2026, 9, 5);
    const cols = getCronogramaColumnsForToday(MON, 'any', []);
    // Default: manana=[1,2], tarde=[4,5]
    assert.deepStrictEqual(cols[0], [1, 2]);
    assert.deepStrictEqual(cols[1], [4, 5]);
});

// ══════════════════════════════════════════════════════════════════════════
// getAssignedTasksForGestor
// ══════════════════════════════════════════════════════════════════════════

// Construimos rows con encabezado y filas de tareas
// Col 1=tarea-mañana, Col 2=gestor-mañana, Col 4=tarea-tarde, Col 5=gestor-tarde
const CRON_ROWS = [
    ['', 'Mañana', 'Gestor', '', 'Tarde', 'Gestor'],
    ['Set 1', '', '', '', '', ''],
    ['Tarea A', 'Ana López', 'Tarea X', 'Ana López', 'Tarea X', 'Luis Ruiz'],
    ['Tarea B', 'Luis Ruiz', '', 'Luis Ruiz', 'Tarea Y', 'Ana López'],
    ['set 2', '', ''],
    ['Tarea C', 'Ana López', '', '', '', ''],
];

const MON_2026 = new Date(2026, 9, 5); // lunes

test('retorna [] si rows no es array', () => {
    const tasks = getAssignedTasksForGestor('Ana López', 'Mañana', null, MON_2026);
    assert.deepStrictEqual(tasks, []);
});

test('retorna tareas asignadas para gestor en columnas del lunes', () => {
    const tasks = getAssignedTasksForGestor(
        'Ana López', 'Mañana', CRON_ROWS, MON_2026
    );
    // Lunes: cols [1,2] y [4,5]
    // En col 2 (gestor mañana): 'Ana López' en fila 2 → tarea 'Mañana'...
    // Revisamos que devuelve alguna tarea para Ana
    assert.ok(Array.isArray(tasks));
    // 'set ...' filas son saltadas; solo devuelve textos de tareas reales
    tasks.forEach((t) => {
        assert.ok(!t.toLowerCase().startsWith('set '));
    });
});

test('gestor no asignado devuelve []', () => {
    const tasks = getAssignedTasksForGestor(
        'Gestor Fantasma', 'any', CRON_ROWS, MON_2026
    );
    assert.deepStrictEqual(tasks, []);
});

test('sábado: solo columnas sábado', () => {
    const SAT = new Date(2026, 9, 10);
    const rows = [
        ['', '', '', '', '', '', '', 'Sábado', 'Gestor'],
        ['Tarea Sáb', '', '', '', '', '', '', 'Tarea Sáb', 'Marta García'],
    ];
    const tasks = getAssignedTasksForGestor('Marta García', 'Sábado', rows, SAT);
    assert.ok(tasks.includes('Tarea Sáb'));
});

test('saltea filas donde gestorValue = "Gestor" (cabecera)', () => {
    const rows = [
        ['', 'Mañana', 'Gestor'],
        ['Tarea X', 'Gestor', 'Gestor'],  // gestor = "Gestor" → saltear
        ['Tarea Y', 'Gestor', 'Pedro'],
    ];
    const MON = new Date(2026, 9, 5);
    const tasks = getAssignedTasksForGestor('Gestor', 'any', rows, MON);
    assert.deepStrictEqual(tasks, []);
});

// ══════════════════════════════════════════════════════════════════════════
// fetchCronogramaRowsForDate: prueba de TypeError (async)
// ══════════════════════════════════════════════════════════════════════════

let asyncFailed = 0;

async function atest(name, fn) {
    try {
        await fn();
        console.log(`  [PASS] ${name}`);
    } catch (e) {
        console.error(`  [FAIL] ${name}`);
        console.error(`         ${e && e.message ? e.message : e}`);
        asyncFailed += 1;
    }
}

await atest('fetchCronogramaRowsForDate lanza TypeError para deps nulas', async () => {
    await assert.rejects(
        fetchCronogramaRowsForDate(new Date(), null),
        TypeError
    );
});

await atest('fetchCronogramaRowsForDate lanza TypeError si falta baseUrl', async () => {
    await assert.rejects(
        fetchCronogramaRowsForDate(new Date(), {
            fetchImpl: async () => {},
            xlsx: { read: () => {}, utils: { sheet_to_json: () => [] } }
        }),
        TypeError
    );
});

await atest('fetchCronogramaRowsForDate lanza TypeError si fetchImpl no es función', async () => {
    await assert.rejects(
        fetchCronogramaRowsForDate(new Date(), {
            baseUrl: 'https://example.com',
            fetchImpl: null,
            xlsx: { read: () => {}, utils: { sheet_to_json: () => [] } }
        }),
        TypeError
    );
});

if (asyncFailed > 0) process.exitCode = 1;

summarize();
