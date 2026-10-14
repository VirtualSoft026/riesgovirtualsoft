import { createRunner, assert } from '../test-harness.mjs';
import { calculateEffectiveHours } from '../../domain/shifts/shift-calculator.js';

/**
 * Horas efectivas con Pausa de Turno (2026-10-06).
 * Regla de negocio confirmada: la Pausa de Turno NO cuenta como tiempo trabajado.
 * Se compara contra copias LITERALES de las fórmulas de app.js:
 *  - ORIGINAL (handleEndShift, antes del candidato): no resta la pausa.
 *  - CORREGIDA (candidato): resta totalSplitShiftTimeMs.
 */
const { test, summarize } = createRunner('shift-effective-hours-split (Pausa de Turno no es tiempo trabajado)');
const MIN = 60 * 1000;

function legacyOriginal(loginMs, endMs, lunchMs, breakfastMs, penal) {
    const effectiveShiftMs = (endMs - loginMs) - lunchMs - breakfastMs - (penal * 60 * 1000);
    return Math.max(0, (effectiveShiftMs / (1000 * 60 * 60))).toFixed(2);
}
function legacyCorrected(loginMs, endMs, lunchMs, breakfastMs, splitMs, penal) {
    const effectiveShiftMs = (endMs - loginMs) - lunchMs - breakfastMs - splitMs - (penal * 60 * 1000);
    return Math.max(0, (effectiveShiftMs / (1000 * 60 * 60))).toFixed(2);
}
function makeRng(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

test('sin splitShiftMs (omitido) el resultado es IDÉNTICO al original en 200 combinaciones (retrocompatibilidad)', () => {
    const rng = makeRng(11);
    for (let i = 0; i < 200; i += 1) {
        const loginMs = 1_000_000, endMs = loginMs + Math.floor(rng() * 10 * 60 * MIN);
        const lunchMs = Math.floor(rng() * 90 * MIN), breakfastMs = Math.floor(rng() * 30 * MIN);
        const penaltyMins = parseFloat((rng() * 120).toFixed(1));
        assert.equal(
            calculateEffectiveHours({ loginMs, endMs, lunchMs, breakfastMs, penaltyMins }),
            legacyOriginal(loginMs, endMs, lunchMs, breakfastMs, penaltyMins)
        );
    }
});

test('con splitShiftMs coincide con la fórmula corregida de app.js en 300 combinaciones', () => {
    const rng = makeRng(99);
    for (let i = 0; i < 300; i += 1) {
        const loginMs = 2_000_000, endMs = loginMs + Math.floor(rng() * 12 * 60 * MIN);
        const lunchMs = Math.floor(rng() * 90 * MIN), breakfastMs = Math.floor(rng() * 30 * MIN);
        const splitShiftMs = Math.floor(rng() * 240 * MIN);
        const penaltyMins = parseFloat((rng() * 120).toFixed(1));
        assert.equal(
            calculateEffectiveHours({ loginMs, endMs, lunchMs, breakfastMs, splitShiftMs, penaltyMins }),
            legacyCorrected(loginMs, endMs, lunchMs, breakfastMs, splitShiftMs, penaltyMins)
        );
    }
});

test('caso del informe: turno 08:00-18:00, almuerzo 30 min, pausa 180 min = 6.50 h (antes 9.50 h)', () => {
    const input = { loginMs: 0, endMs: 10 * 60 * MIN, lunchMs: 30 * MIN, breakfastMs: 0, penaltyMins: 0 };
    assert.equal(legacyOriginal(0, input.endMs, input.lunchMs, 0, 0), '9.50');
    assert.equal(calculateEffectiveHours({ ...input, splitShiftMs: 180 * MIN }), '6.50');
});

test('la pausa resta 1 a 1: cada minuto de pausa baja las horas efectivas en 1/60 h', () => {
    const base = { loginMs: 0, endMs: 9 * 60 * MIN, lunchMs: 0, breakfastMs: 0, penaltyMins: 0 };
    assert.equal(calculateEffectiveHours({ ...base, splitShiftMs: 0 }), '9.00');
    assert.equal(calculateEffectiveHours({ ...base, splitShiftMs: 60 * MIN }), '8.00');
    assert.equal(calculateEffectiveHours({ ...base, splitShiftMs: 90 * MIN }), '7.50');
});

test('la pausa NO genera penalidad por sí sola (la penalidad sigue viniendo de excesos e inactividad)', () => {
    const a = calculateEffectiveHours({ loginMs: 0, endMs: 8 * 60 * MIN, lunchMs: 0, breakfastMs: 0, splitShiftMs: 120 * MIN, penaltyMins: 0 });
    const b = calculateEffectiveHours({ loginMs: 0, endMs: 8 * 60 * MIN, lunchMs: 0, breakfastMs: 0, splitShiftMs: 120 * MIN, penaltyMins: 30 });
    assert.equal(a, '6.00');
    assert.equal(b, '5.50');
});

test('nunca devuelve negativo aunque la pausa supere al turno', () => {
    assert.equal(calculateEffectiveHours({ loginMs: 0, endMs: 60 * MIN, lunchMs: 0, breakfastMs: 0, splitShiftMs: 300 * MIN, penaltyMins: 0 }), '0.00');
});

test('splitShiftMs null o undefined se comporta como 0 (estado restaurado incompleto)', () => {
    const input = { loginMs: 0, endMs: 8 * 60 * MIN, lunchMs: 0, breakfastMs: 0, penaltyMins: 0 };
    assert.equal(calculateEffectiveHours({ ...input, splitShiftMs: undefined }), '8.00');
    assert.equal(calculateEffectiveHours({ ...input, splitShiftMs: null }), '8.00');
});

summarize();
