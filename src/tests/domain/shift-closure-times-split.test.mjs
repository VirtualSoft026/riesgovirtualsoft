import { createRunner, assert } from '../test-harness.mjs';
import { calculateShiftClosureTimes } from '../../domain/shifts/shift-calculator.js';
import { buildClosureEmailTimeFields } from '../../domain/shifts/shift-report-builder.js';

/**
 * Cierre de turno con Pausa de Turno (2026-10-06). Espejo de los escenarios H1..H11 de
 * tests/e2e/cierre-horas-efectivas.e2e.cjs (que ejecuta el bloque real de app.js): aquí contra los
 * módulos puros.
 *
 * Decisión D1 (2026-10-06): horas efectivas = turno − almuerzo − desayuno − Pausa de Turno − inactividad; la
 * penalidad es informativa. H2 y H6 cambian A PROPÓSITO (antes restaban además la penalidad, que duplicaba el
 * exceso de almuerzo/desayuno): 7,92 h -> 8,25 h y 5,92 h -> 6,25 h. El resto de escenarios no cambia.
 */
const { test, summarize } = createRunner('shift-closure-times-split (RN: la pausa no es tiempo trabajado)');
const MIN = 60000;
const LOGIN = new Date('2026-10-06T08:00:00').getTime();

function close({ shiftMin, lunchMin = 0, breakfastMin = 0, splitMin = 0, inactMin = 0 }) {
    const t = calculateShiftClosureTimes({
        loginMs: LOGIN, endMs: LOGIN + shiftMin * MIN, lunchMs: lunchMin * MIN, breakfastMs: breakfastMin * MIN,
        splitShiftMs: splitMin * MIN, inactivityMins: inactMin
    });
    return { t, fields: Object.fromEntries(buildClosureEmailTimeFields(t, splitMin * MIN)), list: buildClosureEmailTimeFields(t, splitMin * MIN) };
}

test('H1: sin pausa, 8 h con 30 min de almuerzo = 7.50 h (sin regresión)', () => {
    assert.equal(close({ shiftMin: 480, lunchMin: 30 }).fields.Horas_Efectivas_Trabajadas, '7.50 hrs');
});
test('H2 (D1): sin pausa, la penalidad se informa igual (30 min) pero no se resta: 600-75-20-10 min = 8.25 h (antes 7.92 h)', () => {
    const f = close({ shiftMin: 600, lunchMin: 75, breakfastMin: 20, inactMin: 10 }).fields;
    assert.equal(f.Exceso_Pausas_Penalidad, '30 minutos');
    assert.equal(f.Horas_Efectivas_Trabajadas, '8.25 hrs');
});
test('H3: con pausa 180 min, 08:00-18:00 y almuerzo 30 = 6.50 h (antes 9.50 h)', () => {
    assert.equal(close({ shiftMin: 600, lunchMin: 30, splitMin: 180 }).fields.Horas_Efectivas_Trabajadas, '6.50 hrs');
});
test('H4: cada minuto de pausa resta exactamente 1/60 h (90 min = 1.50 h)', () => {
    const a = parseFloat(close({ shiftMin: 540 }).t.effectiveHours);
    const b = parseFloat(close({ shiftMin: 540, splitMin: 90 }).t.effectiveHours);
    assert.equal((a - b).toFixed(2), '1.50');
});
test('H5: la pausa NO altera la penalidad de conectividad', () => {
    const a = close({ shiftMin: 600, lunchMin: 75, inactMin: 10 }).t.penaltyMins;
    const b = close({ shiftMin: 600, lunchMin: 75, inactMin: 10, splitMin: 120 }).t.penaltyMins;
    assert.equal(a, b);
});
test('H6 (D1): combinado (pausa + almuerzo con exceso + desayuno + inactividad), cada uno una sola vez: 600-75-20-120-10 = 6.25 h (antes 5.92 h)', () => {
    assert.equal(close({ shiftMin: 600, lunchMin: 75, breakfastMin: 20, splitMin: 120, inactMin: 10 }).fields.Horas_Efectivas_Trabajadas, '6.25 hrs');
});
test('H7: nunca negativo (pausa mayor que el turno = 0.00)', () => {
    assert.equal(close({ shiftMin: 60, splitMin: 300 }).fields.Horas_Efectivas_Trabajadas, '0.00 hrs');
});
test('H8: el correo informa Tiempo_Pausa_Turno_Descontado cuando hubo pausa', () => {
    assert.equal(close({ shiftMin: 600, splitMin: 180 }).fields.Tiempo_Pausa_Turno_Descontado, '180 minutos');
});
test('H9: sin pausa el correo NO incluye el campo de pausa', () => {
    assert.equal('Tiempo_Pausa_Turno_Descontado' in close({ shiftMin: 480, lunchMin: 30 }).fields, false);
});
test('H10: campos del correo conservados y en el orden de app.js (la pausa va entre desayuno y penalidad)', () => {
    const names = close({ shiftMin: 480, lunchMin: 30, breakfastMin: 10, splitMin: 60 }).list.map(([k]) => k);
    assert.deepEqual(names, ['Tiempo_Almuerzo_Descontado', 'Tiempo_Desayuno_Descontado', 'Tiempo_Pausa_Turno_Descontado', 'Exceso_Pausas_Penalidad', 'Horas_Efectivas_Trabajadas']);
    const sin = close({ shiftMin: 480, lunchMin: 30 }).list.map(([k]) => k);
    assert.deepEqual(sin, ['Tiempo_Almuerzo_Descontado', 'Tiempo_Desayuno_Descontado', 'Exceso_Pausas_Penalidad', 'Horas_Efectivas_Trabajadas']);
});
test('H11: coherencia con el panel de reportes cuando no hay penalidad (turno - almuerzo - desayuno - pausa)', () => {
    const r = close({ shiftMin: 600, lunchMin: 30, breakfastMin: 10, splitMin: 150 });
    assert.equal(parseFloat(r.t.effectiveHours).toFixed(2), ((600 - 30 - 10 - 150) / 60).toFixed(2));
});
test('splitShiftMs omitido equivale a 0 (retrocompatible con el cálculo anterior)', () => {
    const a = calculateShiftClosureTimes({ loginMs: LOGIN, endMs: LOGIN + 480 * MIN, lunchMs: 30 * MIN, breakfastMs: 0, inactivityMins: 0 });
    assert.equal(a.effectiveHours, '7.50');
    assert.equal(a.splitShiftMinutes, 0);
});

summarize();
