import { createRunner, assert } from '../test-harness.mjs';
import {
    calculateConnectivityPenalty,
    calculateEffectiveHours
} from '../../domain/shifts/shift-calculator.js';
import { consolidateTimeline } from '../../domain/shifts/timeline-service.js';

/**
 * Prueba diferencial: estas tres piezas ya estaban migradas (sin prueba) y
 * cubren cálculos de handleEndShift(). Aquí se comparan contra una copia
 * LITERAL del algoritmo original de app.js (3743-3769 y 3782-3829).
 */
const { test, summarize } = createRunner('shift-closure-calculations (diferencial vs app.js)');

function legacyPenalty(totalLunchTimeMs, totalBreakfastTimeMs, inactividadMins) {
    const lunchMinutes = parseFloat((totalLunchTimeMs / (1000 * 60)).toFixed(1));
    const breakfastMinutes = parseFloat((totalBreakfastTimeMs / (1000 * 60)).toFixed(1));
    const extraLunch = Math.max(0, lunchMinutes - 60);
    const extraBreakfast = Math.max(0, breakfastMinutes - 15);
    const penalidadConectividadMins = parseFloat((extraLunch + extraBreakfast + inactividadMins).toFixed(1));
    return { lunchMinutes, breakfastMinutes, extraLunch, extraBreakfast, penalidadConectividadMins };
}

function legacyEffectiveHours(loginMs, endMs, lunchMs, breakfastMs, penal) {
    const totalShiftMs = endMs - loginMs;
    const effectiveShiftMs = totalShiftMs - lunchMs - breakfastMs - (penal * 60 * 1000);
    return Math.max(0, (effectiveShiftMs / (1000 * 60 * 60))).toFixed(2);
}

function legacyCleanTimeline(shiftTimeline, endMs) {
    let cleanTimeline = [];
    if (shiftTimeline && shiftTimeline.length > 0) {
        const breaks = shiftTimeline.filter(b => b.type === 'Desayuno' || b.type === 'Almuerzo' || b.type === 'Pausa de Turno');
        let sortedEvs = [...shiftTimeline].sort((a, b) => a.start - b.start);
        sortedEvs.forEach(ev => {
            let evStart = ev.start;
            let evEnd = ev.end || endMs;
            if (evEnd <= evStart) return;
            if (ev.type === 'Inactividad') {
                if (evEnd - evStart < 30000) return;
                let insideBreak = breaks.some(b => {
                    let bStart = b.start;
                    let bEnd = b.end || endMs;
                    return evStart >= bStart && evEnd <= bEnd;
                });
                if (insideBreak) return;
            }
            if (cleanTimeline.length === 0) {
                cleanTimeline.push({ type: ev.type, start: evStart, end: evEnd });
            } else {
                let prev = cleanTimeline[cleanTimeline.length - 1];
                if (prev.type === ev.type && evStart <= prev.end + 60000) {
                    prev.end = Math.max(prev.end, evEnd);
                } else if (evStart < prev.end) {
                    if (ev.type === 'Inactividad') {
                        if (evEnd > prev.end) {
                            evStart = prev.end;
                            if (evEnd - evStart >= 30000) {
                                cleanTimeline.push({ type: ev.type, start: evStart, end: evEnd });
                            }
                        }
                    } else {
                        cleanTimeline.push({ type: ev.type, start: evStart, end: evEnd });
                    }
                } else {
                    cleanTimeline.push({ type: ev.type, start: evStart, end: evEnd });
                }
            }
        });
    }
    return cleanTimeline;
}

// Generador pseudoaleatorio determinista (LCG) para repetir siempre los mismos casos.
function makeRng(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}

const MIN = 60_000;

test('calculateConnectivityPenalty coincide con el original en 200 combinaciones', () => {
    const rng = makeRng(42);
    for (let i = 0; i < 200; i += 1) {
        const lunchMs = Math.floor(rng() * 120 * MIN);
        const breakfastMs = Math.floor(rng() * 40 * MIN);
        const inactivity = rng() * 90;
        const legacy = legacyPenalty(lunchMs, breakfastMs, inactivity);
        const next = calculateConnectivityPenalty({ lunchMs, breakfastMs, inactivityMins: inactivity });
        assert.equal(next.lunchMinutes, legacy.lunchMinutes);
        assert.equal(next.breakfastMinutes, legacy.breakfastMinutes);
        assert.equal(next.extraLunch, legacy.extraLunch);
        assert.equal(next.extraBreakfast, legacy.extraBreakfast);
        assert.equal(next.penaltyMins, legacy.penalidadConectividadMins);
    }
});

test('calculateConnectivityPenalty: caso fijo — 75 min de almuerzo, 20 de desayuno, 10 de inactividad = 30 de penalidad', () => {
    const r = calculateConnectivityPenalty({ lunchMs: 75 * MIN, breakfastMs: 20 * MIN, inactivityMins: 10 });
    assert.equal(r.extraLunch, 15);
    assert.equal(r.extraBreakfast, 5);
    assert.equal(r.penaltyMins, 30);
});

test('calculateEffectiveHours coincide con el original en 200 combinaciones (incluye el piso en 0)', () => {
    const rng = makeRng(7);
    for (let i = 0; i < 200; i += 1) {
        const loginMs = 1_000_000;
        const endMs = loginMs + Math.floor(rng() * 10 * 60 * MIN);
        const lunchMs = Math.floor(rng() * 90 * MIN);
        const breakfastMs = Math.floor(rng() * 30 * MIN);
        const penaltyMins = parseFloat((rng() * 120).toFixed(1));
        assert.equal(
            calculateEffectiveHours({ loginMs, endMs, lunchMs, breakfastMs, penaltyMins }),
            legacyEffectiveHours(loginMs, endMs, lunchMs, breakfastMs, penaltyMins)
        );
    }
});

test('calculateEffectiveHours: caso fijo — turno de 8 h con 45 min de pausas y 15 de penalidad = 7.00 h', () => {
    assert.equal(
        calculateEffectiveHours({ loginMs: 0, endMs: 8 * 60 * MIN, lunchMs: 30 * MIN, breakfastMs: 15 * MIN, penaltyMins: 15 }),
        '7.00'
    );
});

test('calculateEffectiveHours: nunca devuelve negativo', () => {
    assert.equal(calculateEffectiveHours({ loginMs: 0, endMs: MIN, lunchMs: 60 * MIN, breakfastMs: 0, penaltyMins: 0 }), '0.00');
});

test('consolidateTimeline (3 tipos de pausa) coincide con el original en 300 líneas de tiempo aleatorias', () => {
    const rng = makeRng(2026);
    const types = ['Inactividad', 'Inactividad', 'Desayuno', 'Almuerzo', 'Pausa de Turno'];
    for (let i = 0; i < 300; i += 1) {
        const endMs = 10_000_000;
        const n = Math.floor(rng() * 8);
        const events = [];
        for (let j = 0; j < n; j += 1) {
            const start = Math.floor(rng() * 9_000_000);
            const open = rng() < 0.2;
            const end = open ? null : start + Math.floor(rng() * 40 * MIN) - 2 * MIN;
            events.push({ type: types[Math.floor(rng() * types.length)], start, end });
        }
        assert.deepEqual(
            consolidateTimeline(events, { defaultEndMs: endMs }),
            legacyCleanTimeline(events, endMs)
        );
    }
});

test('consolidateTimeline: línea de tiempo vacía o nula devuelve []', () => {
    assert.deepEqual(consolidateTimeline([], { defaultEndMs: 1 }), []);
    assert.deepEqual(consolidateTimeline(null, { defaultEndMs: 1 }), []);
});

test('consolidateTimeline: descarta inactividad < 30 s y la que cae dentro de una pausa', () => {
    const events = [
        { type: 'Almuerzo', start: 0, end: 60 * MIN },
        { type: 'Inactividad', start: 10 * MIN, end: 20 * MIN },
        { type: 'Inactividad', start: 70 * MIN, end: 70 * MIN + 10_000 }
    ];
    assert.deepEqual(consolidateTimeline(events, { defaultEndMs: 100 * MIN }), [
        { type: 'Almuerzo', start: 0, end: 60 * MIN }
    ]);
});

summarize();
