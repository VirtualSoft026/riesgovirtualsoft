/**
 * Paridad del chequeo de turno al iniciar sesión (paso 3.4, W-29): la búsqueda nueva (`findShiftStringForUser` +
 * `evaluateShiftExpiration`) debe dar el mismo veredicto que `checkShiftExpirationOnLogin()` de login.js, el original.
 *
 * El original se ejecuta tal cual, dentro de un `vm` con reloj fijo, Excel falso y fetch falso. Se compara en una
 * matriz de nombres, turnos y horas. Se ejecuta con: node src/tests/domain/login-shift-lookup.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRunner, assert } from '../test-harness.mjs';
import { findShiftStringForUser, parseExcelDate, normalizeShiftName } from '../../domain/auth/login-shift-lookup.js';
import { evaluateShiftExpiration } from '../../domain/auth/shift-expiration.js';

const { test, summarize } = createRunner('chequeo de turno al iniciar sesión (paso 3.4)');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LOGIN_JS = path.resolve(HERE, '../../../login.js');
const LEGACY_SRC = fs.readFileSync(LOGIN_JS, 'utf8').replace(/\r\n/g, '\n');
const LEGACY_FN = LEGACY_SRC.slice(
    LEGACY_SRC.indexOf('async function checkShiftExpirationOnLogin('),
    LEGACY_SRC.indexOf('// Alert if opened as file')
);

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

/** Serial de Excel para el día local `d` (medianoche UTC del mismo año/mes/día). */
function serialFor(d) {
    return (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EXCEL_EPOCH_MS) / 86400000;
}

/** Hoja de prueba: bloque de hoy (fila de fechas + fila Lunes/Martes) y los turnos de tres personas. */
function buildRows(now, shifts) {
    const serial = serialFor(now);
    return [
        ['Semana', serial, serial + 1],
        ['GESTOR', 'Lunes', 'Martes'],
        ['Ana Pérez', shifts.ana, 'Descansa'],
        ['Luis Gómez', shifts.luis, 'Por Asignar'],
        ['Carla Ruiz', shifts.carla, 'Descansa'],
        ['GESTOR', 'Fin', '']
    ];
}

/** Ejecuta el chequeo original de login.js con reloj, Excel y fetch falsos. */
async function legacyExpired(dbUser, rows, now) {
    class FakeDate extends Date {
        constructor(...args) { if (args.length) super(...args); else super(now.getTime()); }
        static now() { return now.getTime(); }
    }
    const ctx = {
        Date: FakeDate,
        console: { error() {} },
        encodeURI,
        fetch: async () => ({ ok: true, arrayBuffer: async () => rows }),
        XLSX: {
            read: (payload) => ({ SheetNames: ['S'], Sheets: { S: payload } }),
            utils: { sheet_to_json: (ws) => ws }
        }
    };
    vm.createContext(ctx);
    vm.runInContext(`${LEGACY_FN}\nthis.check = checkShiftExpirationOnLogin;`, ctx);
    const result = await ctx.check(dbUser);

    return result.expired === true;
}

/** Veredicto nuevo: búsqueda pura + expiración del dominio. */
function newExpired(name, rows, now) {
    const shiftStr = findShiftStringForUser(rows, name, now);
    return evaluateShiftExpiration(shiftStr, now).expired === true;
}

test('parseExcelDate: serial numérico y texto con fecha; basura da null', () => {
    assert.ok(parseExcelDate(46000) instanceof Date);
    assert.equal(parseExcelDate('2026-10-15') instanceof Date, true);
    assert.equal(parseExcelDate('Lunes'), null);
    assert.equal(parseExcelDate(''), null);
});

test('normalizeShiftName quita acentos, mayúsculas y espacios', () => {
    assert.equal(normalizeShiftName('  Ana Pérez '), 'ana perez');
});

test('findShiftStringForUser: el turno del usuario en la columna de hoy', () => {
    const now = new Date(2026, 9, 15, 10, 0, 0);
    const rows = buildRows(now, { ana: '08:00 - 17:00', luis: '22:00 - 06:00', carla: 'Descansa' });
    assert.equal(findShiftStringForUser(rows, 'Ana Perez', now), '08:00 - 17:00');
    assert.equal(findShiftStringForUser(rows, 'Nadie', now), '');
});

test('findShiftStringForUser: sin bloque para hoy devuelve cadena vacía', () => {
    const now = new Date(2026, 9, 15, 10, 0, 0);
    const other = new Date(2026, 0, 1, 10, 0, 0);
    const rows = buildRows(other, { ana: '08:00 - 17:00', luis: '', carla: '' });
    assert.equal(findShiftStringForUser(rows, 'Ana Perez', now), '');
});

test('paridad con login.js: 3 nombres x 8 turnos x 5 horas = 120 casos', async () => {
    const shiftValues = ['08:00 - 17:00', '22:00 - 06:00', '3:00 pm - 11:00 pm', '9 am - 5 pm', 'Descansa', 'Por Asignar', '', 'sin guion'];
    const hours = [7, 12, 18, 23, 2];
    const names = ['Ana Pérez', 'Luis Gómez', 'Nadie'];
    let cases = 0;
    let expiredCount = 0;

    for (const hour of hours) {
        const now = new Date(2026, 9, 15, hour, 30, 0);
        for (const shift of shiftValues) {
            const rows = buildRows(now, { ana: shift, luis: shift, carla: shift });
            for (const name of names) {
                const legacy = await legacyExpired({ name, role: 'Gestor' }, rows, now);
                const current = newExpired(name, rows, now);
                assert.equal(current, legacy, `distinto para ${name} / "${shift}" / ${hour}:30`);
                cases += 1;
                if (legacy) expiredCount += 1;
            }
        }
    }

    assert.equal(cases, 120);
    assert.ok(expiredCount > 0, 'la matriz debe incluir turnos vencidos');
});

summarize();
