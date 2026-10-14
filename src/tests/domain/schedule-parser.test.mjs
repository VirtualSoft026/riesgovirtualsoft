import { createRunner, assert } from '../test-harness.mjs';
import { getShiftCategory } from '../../domain/schedules/schedule-parser.js';

const { test, summarize } = createRunner('schedule-parser.js');

test('getShiftCategory devuelve "" con valores vacíos', () => {
    assert.equal(getShiftCategory(''), '');
    assert.equal(getShiftCategory(null), '');
    assert.equal(getShiftCategory(undefined), '');
});

test('getShiftCategory reconoce "Mañana" con o sin tilde', () => {
    assert.equal(getShiftCategory('Mañana'), 'Mañana');
    assert.equal(getShiftCategory('Manana'), 'Mañana');
    assert.equal(getShiftCategory('Turno Mañana 1'), 'Mañana');
});

test('getShiftCategory reconoce "Tarde" por substring', () => {
    assert.equal(getShiftCategory('Tarde'), 'Tarde');
    assert.equal(getShiftCategory('Turno de la Tarde'), 'Tarde');
});

test('getShiftCategory reconoce "Noche" por substring', () => {
    assert.equal(getShiftCategory('Noche'), 'Noche');
});

test('getShiftCategory reconoce "Master" por substring, antes de intentar parsear hora', () => {
    assert.equal(getShiftCategory('Master'), 'Master');
    assert.equal(getShiftCategory('Turno Master 2'), 'Master');
});

test('getShiftCategory clasifica rangos de hora por la hora de inicio (am)', () => {
    // 6am-14am (exclusivo) -> Mañana
    assert.equal(getShiftCategory('8am - 4pm'), 'Mañana');
    assert.equal(getShiftCategory('6am - 2pm'), 'Mañana');
});

test('getShiftCategory clasifica rangos de hora por la hora de inicio (pm, 12-13h)', () => {
    // 12pm y 1pm caen en la franja 14<=h<22? No: 12pm->12h, 1pm->13h, ambas <14 -> Mañana.
    assert.equal(getShiftCategory('12pm - 8pm'), 'Mañana');
    assert.equal(getShiftCategory('1pm - 9pm'), 'Mañana');
});

test('getShiftCategory clasifica rangos de hora por la hora de inicio (tarde, 14-21h)', () => {
    assert.equal(getShiftCategory('3pm - 11pm'), 'Tarde');
    assert.equal(getShiftCategory('9pm - 5am'), 'Tarde');
});

test('getShiftCategory clasifica como "Noche" cualquier hora de inicio fuera de Mañana/Tarde', () => {
    // Característica, no bug: 10pm -> 22h, fuera de [6,14) y [14,22) -> cae al
    // "return Noche" final de app.js, igual que cualquier hora de inicio no
    // cubierta por las dos franjas explícitas (p. ej. medianoche).
    assert.equal(getShiftCategory('10pm - 6am'), 'Noche');
    assert.equal(getShiftCategory('12am - 8am'), 'Noche');
});

test('getShiftCategory normaliza "am"/"pm" al mediodía y medianoche (12am=0h, 12pm=12h)', () => {
    assert.equal(getShiftCategory('12am - 8am'), 'Noche'); // 12am -> 0h -> Noche
    assert.equal(getShiftCategory('12pm - 8pm'), 'Mañana'); // 12pm -> 12h -> Mañana
});

test('getShiftCategory devuelve "" si el texto no matchea ninguna palabra clave ni rango de hora', () => {
    assert.equal(getShiftCategory('Descansa'), '');
    assert.equal(getShiftCategory('Por Asignar'), '');
    assert.equal(getShiftCategory('Vacaciones'), '');
});

summarize();
