import { createRunner, assert } from '../test-harness.mjs';
import {
    excelToJSDate,
    parseExcelDate,
    readFirstSheetRows,
    hasMinimumRows,
    getCell,
    isSameDate
} from '../../utils/excel.js';

const { test, summarize } = createRunner('excel.js');

test('excelToJSDate convierte el serial 25569 exactamente al 1-ene-1970 (época Unix)', () => {
    // Constante conocida de conversión Excel->Unix: hay 25569 días entre el
    // 30-dic-1899 (época que usa esta función) y el 1-ene-1970.
    assert.equal(excelToJSDate(25569).getTime(), Date.UTC(1970, 0, 1));
});

test('excelToJSDate trata el serial 0 como vacío (0 es "falsy" en JS)', () => {
    // Documenta un límite real de la función: el serial 0 (30-dic-1899 en el
    // sistema de fechas de Excel) no se puede representar porque `!0` es true.
    assert.equal(excelToJSDate(0), null);
});

test('excelToJSDate devuelve null con valores no numéricos o vacíos', () => {
    assert.equal(excelToJSDate('abc'), null);
    assert.equal(excelToJSDate(null), null);
    assert.equal(excelToJSDate(undefined), null);
});

test('parseExcelDate interpreta fechas ISO (con guiones) directamente', () => {
    const parsed = parseExcelDate('2026-01-15');
    assert.equal(parsed.getUTCFullYear(), 2026);
    assert.equal(parsed.getUTCMonth(), 0);
    assert.equal(parsed.getUTCDate(), 15);
});

test('parseExcelDate con formato "DD/MM/YYYY" puede fallar si el día supera 12 (límite real conocido)', () => {
    // "15/01/2026" se interpreta como mes/día en JS y 15 no es un mes válido:
    // new Date(...) da Invalid Date y la función devuelve null.
    assert.equal(parseExcelDate('15/01/2026'), null);
});

test('parseExcelDate interpreta números como seriales de Excel', () => {
    const parsed = parseExcelDate(25569);
    assert.equal(parsed.getTime(), Date.UTC(1970, 0, 1));
});

test('parseExcelDate devuelve null para 0, vacío o texto no numérico', () => {
    assert.equal(parseExcelDate(0), null);
    assert.equal(parseExcelDate(''), null);
    assert.equal(parseExcelDate(null), null);
    assert.equal(parseExcelDate('no es una fecha'), null);
});

test('readFirstSheetRows lee la primera hoja con el formato de filas (header:1)', () => {
    const workbook = {
        SheetNames: ['Hoja1', 'Hoja2'],
        Sheets: { Hoja1: { marker: 'hoja-1' } }
    };
    let captured = null;
    const xlsx = {
        utils: {
            sheet_to_json: (worksheet, config) => {
                captured = { worksheet, config };
                return [['fila1'], ['fila2']];
            }
        }
    };

    const rows = readFirstSheetRows(workbook, xlsx);

    assert.deepEqual(rows, [['fila1'], ['fila2']]);
    assert.equal(captured.worksheet, workbook.Sheets.Hoja1);
    assert.deepEqual(captured.config, { header: 1, defval: '' });
});

test('readFirstSheetRows usa {defval: ""} cuando se pide asObjects', () => {
    const workbook = { SheetNames: ['Hoja1'], Sheets: { Hoja1: {} } };
    let capturedConfig = null;
    const xlsx = {
        utils: {
            sheet_to_json: (_worksheet, config) => {
                capturedConfig = config;
                return [];
            }
        }
    };

    readFirstSheetRows(workbook, xlsx, { asObjects: true });

    assert.deepEqual(capturedConfig, { defval: '' });
});

test('readFirstSheetRows devuelve null sin libro, sin hojas o sin la hoja referenciada', () => {
    assert.equal(readFirstSheetRows(null, {}), null);
    assert.equal(readFirstSheetRows({ SheetNames: [] }, {}), null);
    assert.equal(readFirstSheetRows({ SheetNames: ['Hoja1'], Sheets: {} }, {}), null);
});

test('hasMinimumRows exige al menos 3 filas por defecto y respeta el mínimo dado', () => {
    assert.equal(hasMinimumRows([1, 2, 3]), true);
    assert.equal(hasMinimumRows([1, 2]), false);
    assert.equal(hasMinimumRows([1, 2], 2), true);
    assert.equal(hasMinimumRows('no es un arreglo'), false);
    assert.equal(hasMinimumRows(null), false);
});

test('getCell devuelve el valor de la celda o el fallback si la fila/columna no existe', () => {
    const rows = [['a', 'b', 'c']];
    assert.equal(getCell(rows, 0, 1), 'b');
    assert.equal(getCell(rows, 0, 5, 'X'), 'X');
    assert.equal(getCell(rows, 5, 0, 'Y'), 'Y');
    assert.equal(getCell(null, 0, 0, 'Z'), 'Z');
});

test('isSameDate compara una fecha de Excel (UTC) con una fecha local de JS', () => {
    const excelDate = new Date(Date.UTC(2026, 0, 15));
    const sameJsDate = new Date(2026, 0, 15);
    const otherJsDate = new Date(2026, 0, 16);

    assert.equal(isSameDate(excelDate, sameJsDate), true);
    assert.equal(isSameDate(excelDate, otherJsDate), false);
    assert.equal(isSameDate(null, sameJsDate), false);
    assert.equal(isSameDate(excelDate, null), false);
});

summarize();
