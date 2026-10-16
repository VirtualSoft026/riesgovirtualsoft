/**
 * Paridad de la tardanza y de los puntajes de «Control de Tiempos» (paso 3.4, W-28, DE-4 = a).
 *
 * `getTardiness` del dominio (analytics/time-metrics.js) debe devolver lo mismo que la función del original
 * (js/tiempos.js), que se ejecuta tal cual dentro de un `vm`. Se compara en una matriz de turnos, horas de ingreso y
 * permisos, incluidos los casos de frontera (cambio de medianoche, permisos que empiezan antes o después del turno,
 * formatos de hora con y sin a. m./p. m.). Los puntajes de tardanza e inactividad se comparan con los umbrales del
 * original en los valores de frontera.
 *
 * Se ejecuta con: node src/tests/domain/tiempos-tardanza.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRunner, assert } from '../test-harness.mjs';
import { getTardiness } from '../../domain/analytics/time-metrics.js';
import { scoreTardiness, scoreInactivity } from '../../domain/analytics/tiempos-report.js';

const { test, summarize } = createRunner('tardanza y puntajes de Control de Tiempos (paso 3.4)');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ORIGINAL_PATH = path.resolve(HERE, '../../../js/tiempos.js');
const ORIGINAL_SRC = fs.readFileSync(ORIGINAL_PATH, 'utf8').replace(/\r\n/g, '\n');

/** Carga el original en un vm y devuelve su `getTardiness` (declaración de nivel superior). */
function loadOriginalGetTardiness() {
    const ctx = {
        window: null,
        document: { getElementById: () => null, addEventListener() {} },
        console: { error() {}, log() {} }
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(`${ORIGINAL_SRC}\nthis.__getTardiness = getTardiness;`, ctx);
    return ctx.__getTardiness;
}

const originalGetTardiness = loadOriginalGetTardiness();

const SHIFTS = [
    '08:00 - 17:00', '8:00 am - 5:00 pm', '2:00 p. m. - 10:00 p. m.', '7:30 a. m.', 'Tarde Set 1', 'Tarde Set 2',
    'Sábado Set 1', 'Sábado Set 2', 'Domingo Set 3', 'Mañana', 'Set 1', 'Set 2', 'Set 3', 'Set 4', 'Soporte 2',
    'Descansa', 'Por Asignar', 'N/A', '', null, undefined, 'turno sin hora'
];

const LOGINS = [
    '16/10/2026, 8:20:00', '16/10/2026, 8:00:00', '16/10/2026, 7:55:00', '16/10/2026, 8:03:59',
    '6/16/2026, 2:05:00 p. m.', '6/16/2026, 12:05:00 a. m.', '16/10/2026, 23:50:00', '16/10/2026, 0:10:00',
    '16/10/2026, 6:00:00', '16/10/2026, 14:00:00', '', null, 'sin hora'
];

const PERMISOS = [
    [],
    [{ horaFin: '10:30', tipo: 'Permiso' }],
    [{ horaFin: '07:00', tipo: 'Permiso' }],
    [{ Hora_Fin: '9:15', tipo: 'Permiso' }],
    [{ horaFin: '8:00', tipo: 'Permiso' }],
    [{ tipo: 'Vacaciones' }],
    [{ tipo: 'Calamidad' }],
    [{ tipo: 'Falta Justificada' }],
    [{ horaFin: 'abc', tipo: 'Permiso' }],
    [{ horaFin: '10', tipo: 'Permiso' }],
    [{ horaFin: '10:30', tipo: 'Permiso' }, { tipo: 'Falta Justificada' }],
    [{ horaFin: '09:00' }, { horaFin: '06:00' }]
];

test('getTardiness del dominio = original en la matriz de turnos, ingresos y permisos', () => {
    let cases = 0;
    let withTardiness = 0;

    for (const shift of SHIFTS) {
        for (const login of LOGINS) {
            for (const permisos of PERMISOS) {
                const expected = originalGetTardiness(login, shift, JSON.parse(JSON.stringify(permisos)));
                const actual = getTardiness(login, shift, JSON.parse(JSON.stringify(permisos)));
                assert.equal(actual, expected, `distinto para turno "${shift}", ingreso "${login}", permisos ${JSON.stringify(permisos)}`);
                cases += 1;
                if (expected > 0) withTardiness += 1;
            }
        }
    }

    assert.equal(cases, SHIFTS.length * LOGINS.length * PERMISOS.length);
    assert.ok(withTardiness > 0, 'la matriz debe incluir casos con tardanza');
});

test('getTardiness sin permisos: el valor por defecto es []', () => {
    assert.equal(getTardiness('16/10/2026, 8:20:00', '08:00 - 17:00'), originalGetTardiness('16/10/2026, 8:20:00', '08:00 - 17:00'));
});

test('getTardiness: cruce de medianoche (ingreso 00:10 con turno de 23:00) cuenta como tardanza de 70 min', () => {
    const expected = originalGetTardiness('16/10/2026, 0:10:00', '23:00 - 07:00', []);
    assert.equal(getTardiness('16/10/2026, 0:10:00', '23:00 - 07:00', []), expected);
    assert.equal(expected, 70);
});

test('getTardiness: un permiso que termina después del inicio mueve el inicio del turno', () => {
    const permisos = [{ horaFin: '10:30', tipo: 'Permiso' }];
    assert.equal(getTardiness('16/10/2026, 10:45:00', '08:00 - 17:00', permisos), 15);
    assert.equal(getTardiness('16/10/2026, 10:45:00', '08:00 - 17:00', permisos), originalGetTardiness('16/10/2026, 10:45:00', '08:00 - 17:00', permisos));
});

test('scoreTardiness: umbrales 3 y 10 minutos, como el original', () => {
    assert.equal(scoreTardiness(0), 100);
    assert.equal(scoreTardiness(3), 100);
    assert.equal(scoreTardiness(3.01), 70);
    assert.equal(scoreTardiness(10), 70);
    assert.equal(scoreTardiness(10.01), 40);
});

test('scoreInactivity: umbrales 20 y 45 minutos, como el original', () => {
    assert.equal(scoreInactivity(0), 100);
    assert.equal(scoreInactivity(20), 100);
    assert.equal(scoreInactivity(20.01), 60);
    assert.equal(scoreInactivity(45), 60);
    assert.equal(scoreInactivity(45.01), 20);
});

summarize();
