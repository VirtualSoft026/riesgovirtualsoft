import { createRunner, assert } from '../test-harness.mjs';
import {
    normalizeMeridiem,
    to24Hour,
    parseClockTime,
    parseTimeFromLocaleString,
    parseShiftStart,
    parseShiftRange,
    toMinutesOfDay,
    minutesBetweenWrappingMidnight,
    parseTimeToMs
} from '../../utils/date-time.js';

const { test, summarize } = createRunner('date-time.js');

test('normalizeMeridiem reconoce "p. m." y "AM" con puntos y mayúsculas', () => {
    assert.equal(normalizeMeridiem('p. m.'), 'pm');
    assert.equal(normalizeMeridiem('AM'), 'am');
    assert.equal(normalizeMeridiem('a.m.'), 'am');
});

test('normalizeMeridiem devuelve null para valores vacíos o irreconocibles', () => {
    assert.equal(normalizeMeridiem(''), null);
    assert.equal(normalizeMeridiem(null), null);
    assert.equal(normalizeMeridiem('xyz'), null);
});

test('to24Hour convierte mediodía y medianoche correctamente', () => {
    assert.equal(to24Hour(8, 'pm'), 20);
    assert.equal(to24Hour(12, 'pm'), 12); // 12 pm ya es mediodía, no se suma
    assert.equal(to24Hour(12, 'am'), 0);  // 12 am es medianoche
    assert.equal(to24Hour(9, 'am'), 9);
    assert.equal(to24Hour(9, null), 9);
});

test('parseClockTime admite "8", "8:30" y "10:15 p. m."', () => {
    assert.deepEqual(parseClockTime('8'), { h: 8, min: 0 });
    assert.deepEqual(parseClockTime('8:30'), { h: 8, min: 30 });
    assert.deepEqual(parseClockTime('10:15 p. m.'), { h: 22, min: 15 });
});

test('parseClockTime devuelve null con valores vacíos (incluido el 0 numérico)', () => {
    assert.equal(parseClockTime(''), null);
    assert.equal(parseClockTime(undefined), null);
    // Documenta el comportamiento real: 0 es "falsy" en JS, así que la
    // función lo trata igual que un valor vacío en vez de "00:00".
    assert.equal(parseClockTime(0), null);
});

test('parseTimeFromLocaleString lee la hora de un string local con y sin meridiano', () => {
    assert.deepEqual(parseTimeFromLocaleString('16/6/2026, 14:05:00'), { h: 14, min: 5 });
    assert.deepEqual(parseTimeFromLocaleString('6/16/2026, 2:05:00 p. m.'), { h: 14, min: 5 });
    assert.equal(parseTimeFromLocaleString(null), null);
    assert.equal(parseTimeFromLocaleString('sin hora aquí'), null);
});

test('parseShiftStart respeta un horario explícito "8:00 am - 5:00 pm"', () => {
    assert.deepEqual(parseShiftStart('8:00 am - 5:00 pm'), { h: 8, min: 0 });
});

test('parseShiftStart usa las convenciones históricas de SET cuando no hay hora explícita', () => {
    assert.deepEqual(parseShiftStart('Tarde Set 1'), { h: 15, min: 0 });
    assert.deepEqual(parseShiftStart('Tarde Soporte 2'), { h: 19, min: 0 });
    assert.deepEqual(parseShiftStart('Sábado Set 2'), { h: 15, min: 0 });
    assert.deepEqual(parseShiftStart('Domingo Set 3'), { h: 19, min: 0 });
    assert.deepEqual(parseShiftStart('Mañana'), { h: 8, min: 0 });
    assert.deepEqual(parseShiftStart('Soporte 1'), { h: 8, min: 0 });
    assert.deepEqual(parseShiftStart('Set 4'), { h: 22, min: 0 });
});

test('parseShiftStart devuelve null para texto vacío o no reconocido', () => {
    assert.equal(parseShiftStart(''), null);
    assert.equal(parseShiftStart('Turno fantasma'), null);
});

test('parseShiftRange separa inicio y fin, y exige un fin parseable', () => {
    assert.deepEqual(parseShiftRange('8:00 am - 5:00 pm'), {
        start: { h: 8, min: 0 },
        end: { h: 17, min: 0 }
    });
    assert.equal(parseShiftRange('solo inicio sin guion'), null);
    assert.equal(parseShiftRange('8:00 am -'), null);
});

test('toMinutesOfDay convierte horas y minutos a minutos desde medianoche', () => {
    assert.equal(toMinutesOfDay({ h: 1, min: 30 }), 90);
    assert.equal(toMinutesOfDay({ h: 0, min: 0 }), 0);
    assert.equal(toMinutesOfDay({ h: 23, min: 59 }), 1439);
});

test('minutesBetweenWrappingMidnight suma un día cuando el fin es antes del inicio', () => {
    assert.equal(minutesBetweenWrappingMidnight(0, 30 * 60000), 30);
    // 40 000 ms antes que 100 000 ms: diferencia negativa, se envuelve a 1439 min
    assert.equal(minutesBetweenWrappingMidnight(100000, 40000), 1439);
});

test('parseTimeToMs interpreta fechas completas directamente', () => {
    const ms = parseTimeToMs('2026-01-15T10:30:00', 0);
    assert.equal(new Date(ms).getUTCFullYear(), 2026);
});

test('parseTimeToMs aplica "HH:MM AM/PM" sobre la fecha base cuando no hay fecha completa', () => {
    const base = new Date(2026, 0, 15).getTime();

    const pm = parseTimeToMs('2:15 PM', base);
    const pmDate = new Date(pm);
    assert.equal(pmDate.getHours(), 14);
    assert.equal(pmDate.getMinutes(), 15);

    const am = parseTimeToMs('10:30 a. m.', base);
    const amDate = new Date(am);
    assert.equal(amDate.getHours(), 10);
    assert.equal(amDate.getMinutes(), 30);
});

test('parseTimeToMs devuelve NaN cuando no puede interpretar el valor', () => {
    assert.ok(Number.isNaN(parseTimeToMs('no es una fecha', 0)));
});

summarize();
