import { createRunner, assert } from '../test-harness.mjs';
import {
    computeEffectiveMinutes,
    formatEffectiveHours,
    resolveReportInactivityMinutes,
    computeSavedReportEffectiveMinutes,
    REPORT_INACTIVITY_SOURCE
} from '../../domain/shifts/effective-time.js';
import { calculateShiftClosureTimes, calculateEffectiveHours } from '../../domain/shifts/shift-calculator.js';
import { buildClosureEmailTimeFields, buildShiftReportObject, sumCleanInactivityMinutes } from '../../domain/shifts/shift-report-builder.js';
import { computeReportEffectiveMinutes } from '../../domain/shifts/shift-report-view.js';
import { consolidateTimeline } from '../../domain/shifts/timeline-service.js';

/**
 * Decisión D1 (2026-10-06): UNA fórmula de horas efectivas para el correo de cierre y el panel de reportes.
 *   Efectivas = turno − almuerzo − desayuno − Pausa de Turno − inactividad   (nunca negativo)
 * El exceso de almuerzo/desayuno ya no se resta dos veces; la penalidad se sigue calculando igual y es
 * informativa; la Pausa de Turno no genera penalidad (RN-4).
 */
const { test, summarize } = createRunner('shift-effective-time-d1 (fórmula única de horas efectivas: correo = panel)');
const MIN = 60000;
const LOGIN = new Date(2026, 9, 6, 8, 0, 0).getTime();

function makeRng(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

/** Cierre completo con los módulos (lo que hace handleEndShift integrado) y reporte guardado resultante. */
function closeShift({ shiftMin, lunchMin = 0, breakfastMin = 0, splitMin = 0, timeline = [] }) {
    const endMs = LOGIN + shiftMin * MIN;
    const rawInactivity = timeline.filter((e) => e.type === 'Inactividad').reduce((acc, e) => acc + ((e.end || endMs) - e.start) / MIN, 0);
    const clean = consolidateTimeline(timeline, { defaultEndMs: endMs });
    const cleanInactivity = sumCleanInactivityMinutes(clean, endMs);
    const times = calculateShiftClosureTimes({
        loginMs: LOGIN, endMs, lunchMs: lunchMin * MIN, breakfastMs: breakfastMin * MIN, splitShiftMs: splitMin * MIN,
        inactivityMins: rawInactivity, effectiveInactivityMins: cleanInactivity
    });
    const report = buildShiftReportObject({
        uid: 'u1', localUser: { name: 'Ana', role: 'Gestor' }, loginDate: new Date(LOGIN), now: new Date(endMs),
        setSelectValue: 'Set 1', report: 'r', tasks: {}, cleanTimeline: clean, penaltyMins: times.penaltyMins,
        cleanInactivityMins: cleanInactivity, lunchMinutes: times.lunchMinutes, breakfastMinutes: times.breakfastMinutes,
        totalSplitShiftTimeMs: splitMin * MIN
    });
    // El panel parsea horaInicio/horaFin (toLocaleString); se usan ISO para que la prueba no dependa del locale
    report.horaInicio = new Date(LOGIN).toISOString();
    report.horaFin = new Date(endMs).toISOString();
    const fields = Object.fromEntries(buildClosureEmailTimeFields(times, splitMin * MIN));

    return { times, report, fields, panelMinutes: computeReportEffectiveMinutes(report, { nowMs: endMs }) };
}

const inact = (fromMin, toMin) => ({ type: 'Inactividad', start: LOGIN + fromMin * MIN, end: LOGIN + toMin * MIN });
const brk = (type, fromMin, toMin) => ({ type, start: LOGIN + fromMin * MIN, end: LOGIN + toMin * MIN });

// ---------------------------------------------------------------- fórmula pura
test('computeEffectiveMinutes: turno − almuerzo − desayuno − pausa − inactividad', () => {
    assert.equal(computeEffectiveMinutes({ shiftMinutes: 600, lunchMinutes: 75, breakfastMinutes: 20, splitShiftMinutes: 120, inactivityMinutes: 10 }), 375);
    assert.equal(computeEffectiveMinutes({ shiftMinutes: 480 }), 480);
});

test('computeEffectiveMinutes: nunca negativo; null/undefined/NaN/texto no numérico cuentan como 0; texto numérico se interpreta', () => {
    assert.equal(computeEffectiveMinutes({ shiftMinutes: 60, splitShiftMinutes: 300 }), 0);
    assert.equal(computeEffectiveMinutes({ shiftMinutes: 100, lunchMinutes: null, breakfastMinutes: undefined, splitShiftMinutes: NaN, inactivityMinutes: 'x' }), 100);
    assert.equal(computeEffectiveMinutes({ shiftMinutes: 100, lunchMinutes: '30' }), 70);
    assert.equal(computeEffectiveMinutes({ shiftMinutes: undefined, lunchMinutes: 10 }), 0);
});

test('formatEffectiveHours: 2 decimales, piso en 0', () => {
    assert.equal(formatEffectiveHours(390), '6.50');
    assert.equal(formatEffectiveHours(475), '7.92');
    assert.equal(formatEffectiveHours(-5), '0.00');
    assert.equal(formatEffectiveHours(undefined), '0.00');
});

// ---------------------------------------------------------------- inactividad de reportes guardados
test('resolveReportInactivityMinutes: usa inactividadTotalMins cuando existe (aunque haya penalidad)', () => {
    assert.deepEqual(resolveReportInactivityMinutes({ inactividadTotalMins: 12.5, penalidadConectividadMins: 99 }), { minutes: 12.5, source: REPORT_INACTIVITY_SOURCE.STORED });
    assert.deepEqual(resolveReportInactivityMinutes({ inactividadTotalMins: 0, penalidadConectividadMins: 40 }), { minutes: 0, source: REPORT_INACTIVITY_SOURCE.STORED });
});

test('resolveReportInactivityMinutes: reporte antiguo -> penalidad − exceso de almuerzo (>60) − exceso de desayuno (>15), piso 0, 1 decimal', () => {
    const r = (o) => resolveReportInactivityMinutes(o);
    assert.deepEqual(r({ penalidadConectividadMins: 30, tiempoAlmuerzoMins: 75, tiempoDesayunoMins: 20 }), { minutes: 10, source: REPORT_INACTIVITY_SOURCE.DERIVED_FROM_PENALTY });
    assert.equal(r({ penalidadConectividadMins: 12.3, tiempoAlmuerzoMins: 45 }).minutes, 12.3, 'sin excesos: toda la penalidad es inactividad');
    assert.equal(r({ penalidadConectividadMins: 20, tiempoAlmuerzoMins: 80 }).minutes, 0, 'toda la penalidad es exceso de almuerzo');
    assert.equal(r({ penalidadConectividadMins: 5, tiempoAlmuerzoMins: 90 }).minutes, 0, 'datos incoherentes: piso en 0');
    assert.equal(r({ penalidadConectividadMins: 20.2, tiempoAlmuerzoMins: 60.1, tiempoDesayunoMins: 15.1 }).minutes, 20);
});

test('resolveReportInactivityMinutes: sin inactividad ni penalidad -> 0 (sin-dato); valores no numéricos se ignoran', () => {
    assert.deepEqual(resolveReportInactivityMinutes({}), { minutes: 0, source: REPORT_INACTIVITY_SOURCE.NONE });
    assert.deepEqual(resolveReportInactivityMinutes(null), { minutes: 0, source: REPORT_INACTIVITY_SOURCE.NONE });
    assert.equal(resolveReportInactivityMinutes({ inactividadTotalMins: 'x', penalidadConectividadMins: 7 }).source, REPORT_INACTIVITY_SOURCE.DERIVED_FROM_PENALTY);
    assert.equal(resolveReportInactivityMinutes({ inactividadTotalMins: null }).source, REPORT_INACTIVITY_SOURCE.NONE);
});

test('computeSavedReportEffectiveMinutes: campos del reporte con la fórmula única', () => {
    assert.equal(computeSavedReportEffectiveMinutes({ tiempoAlmuerzoMins: 30, tiempoPausaTurnoMins: 180, inactividadTotalMins: 0 }, 600), 390);
    assert.equal(computeSavedReportEffectiveMinutes({ tiempoAlmuerzoMins: 75, tiempoDesayunoMins: 20, penalidadConectividadMins: 30 }, 600), 495);
    assert.equal(computeSavedReportEffectiveMinutes(undefined, 60), 60);
});

// ---------------------------------------------------------------- cierre (correo)
test('cierre: ejemplo del plan — 08:00-18:00, almuerzo 30, pausa 180, sin inactividad = 6.50 h (correo y panel)', () => {
    const r = closeShift({ shiftMin: 600, lunchMin: 30, splitMin: 180 });
    assert.equal(r.fields.Horas_Efectivas_Trabajadas, '6.50 hrs');
    assert.equal(r.fields.Tiempo_Pausa_Turno_Descontado, '180 minutos');
    assert.equal(r.fields.Exceso_Pausas_Penalidad, '0 minutos');
    assert.equal(r.panelMinutes, 390);
});

test('cierre: el exceso de almuerzo NO se resta dos veces (10 h con 75 min de almuerzo = 525 min = 8.75 h; antes 8.50 h)', () => {
    const r = closeShift({ shiftMin: 600, lunchMin: 75 });
    assert.equal(r.fields.Exceso_Pausas_Penalidad, '15 minutos', 'la penalidad se sigue informando');
    assert.equal(r.fields.Horas_Efectivas_Trabajadas, '8.75 hrs');
    assert.equal(calculateEffectiveHours({ loginMs: 0, endMs: 600 * MIN, lunchMs: 75 * MIN, breakfastMs: 0, penaltyMins: 15 }), '8.50', 'fórmula anterior (app.js)');
});

test('cierre: el exceso de desayuno NO se resta dos veces (8 h con 25 min de desayuno = 455 min = 7.58 h; antes 7.42 h)', () => {
    const r = closeShift({ shiftMin: 480, breakfastMin: 25 });
    assert.equal(r.fields.Exceso_Pausas_Penalidad, '10 minutos');
    assert.equal(r.fields.Horas_Efectivas_Trabajadas, '7.58 hrs');
});

test('cierre: la inactividad SÍ se resta (una vez): 10 h con 30 min de inactividad = 9.50 h', () => {
    const r = closeShift({ shiftMin: 600, timeline: [inact(100, 130)] });
    assert.equal(r.fields.Exceso_Pausas_Penalidad, '30 minutos');
    assert.equal(r.fields.Horas_Efectivas_Trabajadas, '9.50 hrs');
    assert.equal(r.report.inactividadTotalMins, 30);
    assert.equal(r.panelMinutes, 570);
});

test('cierre: la Pausa de Turno no genera penalidad (RN-4) y se resta de las horas', () => {
    const a = closeShift({ shiftMin: 600, lunchMin: 75, timeline: [inact(100, 110)] });
    const b = closeShift({ shiftMin: 600, lunchMin: 75, splitMin: 120, timeline: [inact(100, 110)] });
    assert.equal(a.times.penaltyMins, b.times.penaltyMins);
    assert.equal((parseFloat(a.times.effectiveHours) - parseFloat(b.times.effectiveHours)).toFixed(2), '2.00');
});

test('cierre: inactividad dentro del almuerzo cuenta en la penalidad (como antes) pero NO se resta otra vez de las horas', () => {
    // almuerzo 240-300 (60 min) con 20 min de inactividad dentro; la bitácora consolidada la descarta
    const r = closeShift({ shiftMin: 600, lunchMin: 60, timeline: [brk('Almuerzo', 240, 300), inact(250, 270)] });
    assert.equal(r.times.penaltyMins, 20, 'la penalidad no cambia su cálculo (bitácora en vivo)');
    assert.equal(r.report.inactividadTotalMins, 0, 'la inactividad guardada (consolidada) es 0');
    assert.equal(r.fields.Horas_Efectivas_Trabajadas, '9.00 hrs', '600 - 60');
    assert.equal(r.panelMinutes, 540);
});

test('cierre: sin effectiveInactivityMins se resta inactivityMins (compatibilidad del parámetro)', () => {
    const t = calculateShiftClosureTimes({ loginMs: 0, endMs: 600 * MIN, lunchMs: 0, breakfastMs: 0, inactivityMins: 30 });
    assert.equal(t.effectiveHours, '9.50');
    assert.equal(t.inactivityDeductedMins, 30);
    const u = calculateShiftClosureTimes({ loginMs: 0, endMs: 600 * MIN, lunchMs: 0, breakfastMs: 0 });
    assert.equal(u.effectiveHours, '10.00', 'sin inactividad informada');
});

test('cierre: nunca negativo', () => {
    assert.equal(closeShift({ shiftMin: 60, splitMin: 30, lunchMin: 40, timeline: [inact(5, 50)] }).fields.Horas_Efectivas_Trabajadas, '0.00 hrs');
});

test('el correo conserva los mismos campos y el mismo orden (la penalidad sigue apareciendo)', () => {
    const names = Object.keys(closeShift({ shiftMin: 480, lunchMin: 30, breakfastMin: 10, splitMin: 60 }).fields);
    assert.deepEqual(names, ['Tiempo_Almuerzo_Descontado', 'Tiempo_Desayuno_Descontado', 'Tiempo_Pausa_Turno_Descontado', 'Exceso_Pausas_Penalidad', 'Horas_Efectivas_Trabajadas']);
});

test('el reporte guardado trae todo lo que el panel necesita (inactividadTotalMins ya se guarda; no hace falta campo nuevo)', () => {
    const r = closeShift({ shiftMin: 600, lunchMin: 70, breakfastMin: 16, splitMin: 30, timeline: [inact(400, 412)] }).report;
    ['tiempoAlmuerzoMins', 'tiempoDesayunoMins', 'tiempoPausaTurnoMins', 'inactividadTotalMins', 'penalidadConectividadMins'].forEach((k) => {
        assert.equal(typeof r[k], 'number', k);
    });
});

test('COHERENCIA: correo y panel dan las mismas horas en 400 cierres aleatorios (pausas, excesos, inactividad dentro y fuera de pausas)', () => {
    const rng = makeRng(2026);
    for (let i = 0; i < 400; i++) {
        const shiftMin = 60 + Math.floor(rng() * 660);
        const lunchMin = Math.floor(rng() * 100);
        const breakfastMin = Math.floor(rng() * 30);
        const splitMin = rng() < 0.4 ? Math.floor(rng() * 240) : 0;
        const timeline = [];
        if (lunchMin) timeline.push(brk('Almuerzo', 200, 200 + lunchMin));
        const n = Math.floor(rng() * 4);
        for (let k = 0; k < n; k++) { const s = Math.floor(rng() * shiftMin); timeline.push(inact(s, Math.min(shiftMin, s + 1 + Math.floor(rng() * 40)))); }
        const r = closeShift({ shiftMin, lunchMin, breakfastMin, splitMin, timeline });
        const panelHours = (r.panelMinutes / 60).toFixed(2);
        // El reporte guarda los minutos redondeados a 1 decimal; con minutos enteros la igualdad es exacta
        assert.equal(panelHours, r.times.effectiveHours, JSON.stringify({ shiftMin, lunchMin, breakfastMin, splitMin, timeline: timeline.length }));
    }
});

summarize();
