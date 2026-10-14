/**
 * Tests para fetchScheduleWorkbook() y findGestorShiftForDate()
 * en fase_2/src/services/files/xlsx-schedule-adapter.js
 *
 * Cobertura (6 casos del plan-maestro + 2 bordes):
 *   C1 — happy path: workbook correcto, usuario encontrado, turno devuelto
 *   C2 — 404 al descargar el Excel → lanza Error
 *   C3 — error de red (fetchFn rechaza) → re-lanza el error
 *   C4 — usuario no encontrado en el sheet → null
 *   C5 — turno con formato horario no estándar ("9am-5pm") → devuelto tal cual
 *   C6 — nombre con diacríticos ("José Díaz" ↔ "jose diaz") → normalización OK
 *   B1 — workbook vacío o inválido → null (borde)
 *   B2 — fecha sin columna en el encabezado → null (borde)
 *
 * Ejecutar:
 *   node fase_2/src/tests/services/xlsx-schedule-adapter.test.mjs
 */

import { createRunner, assert } from '../test-harness.mjs';
import {
    fetchScheduleWorkbook,
    findGestorShiftForDate,
} from '../../services/files/xlsx-schedule-adapter.js';

const { testAsync, summarizeAsync } = createRunner(
    'xlsx-schedule-adapter — fetchScheduleWorkbook / findGestorShiftForDate'
);

// ── Helpers de mocks ─────────────────────────────────────────────────────────────

/**
 * Construye un mock de la librería SheetJS que devuelve `rows` como resultado
 * de sheet_to_json, independientemente del buffer que se le pase.
 * @param {Array<Array<string>>} rows
 */
function makeXLSXMock(rows) {
    return {
        read: () => ({
            SheetNames: ['Horario'],
            Sheets: { Horario: {} },
        }),
        utils: {
            sheet_to_json: () => rows,
        },
    };
}

/** fetchFn que simula HTTP 200 con un ArrayBuffer vacío. */
function makeFetchOk() {
    return () =>
        Promise.resolve({
            ok: true,
            status: 200,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        });
}

/** fetchFn que simula HTTP 404. */
function makeFetch404() {
    return () =>
        Promise.resolve({
            ok: false,
            status: 404,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        });
}

/** fetchFn que rechaza (fallo de red antes de recibir respuesta). */
function makeFetchNetworkError(msg = 'Network request failed') {
    return () => Promise.reject(new Error(msg));
}

// ── Datos de referencia ───────────────────────────────────────────────────────────

// Encabezado: nombre + tres fechas en formato "M/D/YYYY" (igual que login.js original)
// Filas: nombre del gestor + turno por fecha
const REFERENCE_ROWS = [
    ['Nombre',        '10/1/2026',   '10/2/2026',   '10/3/2026'],
    ['Luis Fuentes',  '8am - 4pm',   'Descansa',    'Por Asignar'],
    ['Jose Diaz',     '7am - 3pm',   '8am - 4pm',   'Descansa'],
    ['Maria Lopez',   'Descansa',    '9am - 5pm',   '7am - 3pm'],
];

const DATE_OCT_01 = new Date(2026, 9, 1);  // 01 oct 2026
const DATE_OCT_02 = new Date(2026, 9, 2);  // 02 oct 2026

// ── C1 — Happy path ───────────────────────────────────────────────────────────────

testAsync('C1a: fetchScheduleWorkbook — descarga y parsea el workbook correctamente', async () => {
    const wb = await fetchScheduleWorkbook('Horario/test.xlsx', {
        fetchFn: makeFetchOk(),
        XLSX:    makeXLSXMock(REFERENCE_ROWS),
    });

    assert.ok(Array.isArray(wb.rows), 'wb.rows debe ser un array');
    assert.equal(wb.rows.length, REFERENCE_ROWS.length, 'número de filas debe coincidir');
    assert.equal(wb.rows[0][0], 'Nombre', 'primera celda del encabezado debe ser "Nombre"');
});

testAsync('C1b: findGestorShiftForDate — usuario encontrado devuelve el turno correcto', async () => {
    const wb = await fetchScheduleWorkbook('Horario/test.xlsx', {
        fetchFn: makeFetchOk(),
        XLSX:    makeXLSXMock(REFERENCE_ROWS),
    });

    const shift = findGestorShiftForDate(wb, 'Luis Fuentes', DATE_OCT_01);
    assert.equal(shift, '8am - 4pm', 'turno del 01/10/2026 para Luis Fuentes debe ser "8am - 4pm"');
});

testAsync('C1c: findGestorShiftForDate — segunda fecha del mismo gestor', async () => {
    const wb = await fetchScheduleWorkbook('Horario/test.xlsx', {
        fetchFn: makeFetchOk(),
        XLSX:    makeXLSXMock(REFERENCE_ROWS),
    });

    const shift = findGestorShiftForDate(wb, 'Luis Fuentes', DATE_OCT_02);
    assert.equal(shift, 'Descansa', 'turno del 02/10/2026 para Luis Fuentes debe ser "Descansa"');
});

// ── C2 — HTTP 404 ─────────────────────────────────────────────────────────────────

testAsync('C2: fetchScheduleWorkbook — HTTP 404 lanza Error con el código en el mensaje', async () => {
    await assert.rejects(
        () => fetchScheduleWorkbook('Horario/inexistente.xlsx', {
            fetchFn: makeFetch404(),
            XLSX:    makeXLSXMock([]),
        }),
        (err) => {
            assert.ok(err instanceof Error, 'el error debe ser instancia de Error');
            assert.ok(
                err.message.includes('404'),
                `el mensaje debe incluir "404"; recibido: "${err.message}"`
            );
            return true;
        }
    );
});

// ── C3 — Error de red ─────────────────────────────────────────────────────────────

testAsync('C3: fetchScheduleWorkbook — error de red (fetch rechazado) re-lanza el error', async () => {
    await assert.rejects(
        () => fetchScheduleWorkbook('Horario/test.xlsx', {
            fetchFn: makeFetchNetworkError('Network request failed'),
            XLSX:    makeXLSXMock([]),
        }),
        /Network request failed/
    );
});

// ── C4 — Usuario no encontrado ────────────────────────────────────────────────────

testAsync('C4: findGestorShiftForDate — gestor no encontrado en el sheet devuelve null', async () => {
    const wb = await fetchScheduleWorkbook('Horario/test.xlsx', {
        fetchFn: makeFetchOk(),
        XLSX:    makeXLSXMock(REFERENCE_ROWS),
    });

    const shift = findGestorShiftForDate(wb, 'Gestor Inexistente', DATE_OCT_01);
    assert.equal(shift, null, 'debe devolver null cuando el gestor no existe en el sheet');
});

// ── C5 — Formato horario no estándar ──────────────────────────────────────────────

testAsync('C5: findGestorShiftForDate — turno con formato no estándar se devuelve sin modificar', async () => {
    // "9am-5pm" (sin espacios alrededor del guión) vs el estándar "9am - 5pm"
    const rowsNonStdShift = [
        ['Nombre',       '10/2/2026'],
        ['Maria Lopez',  '9am-5pm'],
    ];
    const wb = await fetchScheduleWorkbook('Horario/test.xlsx', {
        fetchFn: makeFetchOk(),
        XLSX:    makeXLSXMock(rowsNonStdShift),
    });

    const shift = findGestorShiftForDate(wb, 'Maria Lopez', DATE_OCT_02);
    assert.equal(shift, '9am-5pm', 'formato no estándar debe devolverse exactamente como está en el Excel');
});

// ── C6 — Nombre con diacríticos ───────────────────────────────────────────────────

testAsync('C6a: findGestorShiftForDate — búsqueda sin tildes encuentra fila con tildes en el sheet', async () => {
    // En el Excel el nombre tiene tildes; la búsqueda viene sin tildes (desde Firebase)
    const rowsWithAccents = [
        ['Nombre',      '10/1/2026'],
        ['José Díaz',   '6am - 2pm'],
        ['María López', 'Descansa'],
    ];
    const wb = await fetchScheduleWorkbook('Horario/test.xlsx', {
        fetchFn: makeFetchOk(),
        XLSX:    makeXLSXMock(rowsWithAccents),
    });

    const shift = findGestorShiftForDate(wb, 'jose diaz', DATE_OCT_01);
    assert.equal(
        shift,
        '6am - 2pm',
        '"jose diaz" (sin tildes) debe encontrar "José Díaz" (con tildes) en el sheet'
    );
});

testAsync('C6b: findGestorShiftForDate — búsqueda con tildes también funciona', async () => {
    const rowsWithAccents = [
        ['Nombre',      '10/1/2026'],
        ['José Díaz',   '6am - 2pm'],
    ];
    const wb = await fetchScheduleWorkbook('Horario/test.xlsx', {
        fetchFn: makeFetchOk(),
        XLSX:    makeXLSXMock(rowsWithAccents),
    });

    const shift = findGestorShiftForDate(wb, 'José Díaz', DATE_OCT_01);
    assert.equal(
        shift,
        '6am - 2pm',
        '"José Díaz" (con tildes) debe encontrarse cuando el sheet también tiene tildes'
    );
});

testAsync('C6c: findGestorShiftForDate — búsqueda con tildes encuentra fila sin tildes en el sheet', async () => {
    // En el Excel el nombre NO tiene tildes; la búsqueda viene con tildes
    const rowsWithoutAccents = [
        ['Nombre',     '10/1/2026'],
        ['jose diaz',  '7am - 3pm'],
    ];
    const wb = await fetchScheduleWorkbook('Horario/test.xlsx', {
        fetchFn: makeFetchOk(),
        XLSX:    makeXLSXMock(rowsWithoutAccents),
    });

    const shift = findGestorShiftForDate(wb, 'José Díaz', DATE_OCT_01);
    assert.equal(
        shift,
        '7am - 3pm',
        '"José Díaz" (con tildes) debe encontrar "jose diaz" (sin tildes) en el sheet'
    );
});

// ── Bordes ────────────────────────────────────────────────────────────────────────

testAsync('B1: findGestorShiftForDate — workbook nulo o vacío devuelve null', async () => {
    assert.equal(findGestorShiftForDate(null, 'Luis Fuentes', DATE_OCT_01), null,
        'null → null');
    assert.equal(findGestorShiftForDate({ rows: [] }, 'Luis Fuentes', DATE_OCT_01), null,
        'sin filas → null');
    assert.equal(findGestorShiftForDate({ rows: [['Nombre']] }, 'Luis Fuentes', DATE_OCT_01), null,
        'solo encabezado, sin filas de datos → null');
});

testAsync('B2: findGestorShiftForDate — fecha sin columna en el encabezado devuelve null', async () => {
    const wb = await fetchScheduleWorkbook('Horario/test.xlsx', {
        fetchFn: makeFetchOk(),
        XLSX:    makeXLSXMock(REFERENCE_ROWS),
    });

    // 31 de diciembre 2026 no aparece en el encabezado
    const dateNotInSheet = new Date(2026, 11, 31);
    const shift = findGestorShiftForDate(wb, 'Luis Fuentes', dateNotInSheet);
    assert.equal(shift, null, 'fecha fuera del encabezado → null');
});

// ── Cierre ─────────────────────────────────────────────────────────────────────────

await summarizeAsync();
