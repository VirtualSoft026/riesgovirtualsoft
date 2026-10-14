import { createRunner, assert } from '../test-harness.mjs';
import {
    sumInactivityMinutes,
    sumCleanInactivityMinutes,
    buildBitacoraText,
    buildShiftReportObject
} from '../../domain/shifts/shift-report-builder.js';

const { test, summarize } = createRunner('shift-report-builder.js');
const MIN = 60_000;
const fmt = (ms) => `t${ms / MIN}`;

test('sumInactivityMinutes: suma solo "Inactividad" y cuenta los eventos abiertos hasta el límite', () => {
    const events = [
        { type: 'Inactividad', start: 0, end: 2 * MIN },
        { type: 'Almuerzo', start: 0, end: 60 * MIN },
        { type: 'Inactividad', start: 10 * MIN, end: null }
    ];
    assert.equal(sumInactivityMinutes(events, 15 * MIN), 7);
});

test('sumInactivityMinutes: entrada inválida o vacía devuelve 0', () => {
    assert.equal(sumInactivityMinutes(null, 1), 0);
    assert.equal(sumInactivityMinutes([], 1), 0);
});

test('sumInactivityMinutes no redondea; sumCleanInactivityMinutes redondea a 1 decimal', () => {
    const events = [{ type: 'Inactividad', start: 0, end: 100_000 }]; // 1.666...
    assert.ok(Math.abs(sumInactivityMinutes(events, 0) - 1.6666666) < 1e-6);
    assert.equal(sumCleanInactivityMinutes(events, 0), 1.7);
});

test('buildBitacoraText: sin eventos devuelve el mensaje fijo', () => {
    assert.equal(buildBitacoraText([]), 'No se registraron pausas o inactividades.');
    assert.equal(buildBitacoraText(null), 'No se registraron pausas o inactividades.');
});

test('buildBitacoraText: una línea por evento, con salto de línea final', () => {
    const text = buildBitacoraText([{ type: 'Desayuno', start: 10 * MIN, end: 25 * MIN }], fmt);
    assert.equal(text, '- Desayuno: inicio t10 fin t25\n');
});

test('buildBitacoraText: evento sin fin muestra "No regresó"', () => {
    const text = buildBitacoraText([{ type: 'Inactividad', start: 5 * MIN, end: null }], fmt);
    assert.equal(text, '- Inactividad: inicio t5 fin No regresó\n');
});

test('buildBitacoraText: el formato por defecto es HH:MM en es-CO (dos dígitos)', () => {
    const text = buildBitacoraText([{ type: 'Almuerzo', start: Date.UTC(2026, 0, 1, 17, 5), end: Date.UTC(2026, 0, 1, 18, 5) }]);
    assert.match(text, /^- Almuerzo: inicio \d{1,2}:\d{2}.* fin \d{1,2}:\d{2}.*\n$/);
});

const baseInput = () => ({
    uid: 'u1',
    localUser: { name: 'Ana', role: 'Gestor', shift: '8am - 4pm' },
    loginDate: new Date(2026, 9, 3, 8, 0, 0),
    now: new Date(2026, 9, 3, 16, 0, 0),
    setSelectValue: 'SET A',
    report: 'R',
    tasks: { 1: { status: 'Finalizada' } },
    cleanTimeline: [{ type: 'Desayuno', start: 1, end: 2 }],
    penaltyMins: 3.5,
    cleanInactivityMins: 2.5,
    lunchMinutes: 45,
    breakfastMinutes: 10,
    totalSplitShiftTimeMs: 90_000
});

test('buildShiftReportObject: arma exactamente los 16 campos de shift_reports', () => {
    const o = buildShiftReportObject(baseInput());
    assert.deepEqual(Object.keys(o).sort(), [
        'gestor', 'horaFin', 'horaInicio', 'inactividadTotalMins', 'penalidadConectividadMins',
        'reporte', 'rol', 'setTrabajado', 'tasks', 'tiempoAlmuerzoMins', 'tiempoDesayunoMins',
        'tiempoPausaTurnoMins', 'timeline', 'timestamp', 'turnoProgramado', 'uid'
    ].sort());
    assert.equal(o.gestor, 'Ana');
    assert.equal(o.rol, 'Gestor');
    assert.equal(o.turnoProgramado, '8am - 4pm');
    assert.equal(o.setTrabajado, 'SET A');
    assert.equal(o.penalidadConectividadMins, 3.5);
    assert.equal(o.inactividadTotalMins, 2.5);
    assert.equal(o.tiempoAlmuerzoMins, 45);
    assert.equal(o.tiempoDesayunoMins, 10);
    assert.equal(o.tiempoPausaTurnoMins, 1.5);
    assert.equal(o.timestamp, new Date(2026, 9, 3, 16, 0, 0).getTime());
    assert.equal(o.horaInicio, baseInput().loginDate.toLocaleString());
    assert.equal(o.horaFin, baseInput().now.toLocaleString());
});

test('buildShiftReportObject: valores por defecto ("Por Asignar", "N/A", pausa de turno 0)', () => {
    const input = baseInput();
    input.localUser = { name: 'Ana', role: 'Gestor' };
    input.setSelectValue = undefined;
    input.totalSplitShiftTimeMs = 0;
    const o = buildShiftReportObject(input);
    assert.equal(o.turnoProgramado, 'Por Asignar');
    assert.equal(o.setTrabajado, 'N/A');
    assert.equal(o.tiempoPausaTurnoMins, 0);
});

test('buildShiftReportObject: un valor de SET "" se conserva (no se convierte en "N/A")', () => {
    const input = baseInput();
    input.setSelectValue = '';
    assert.equal(buildShiftReportObject(input).setTrabajado, '');
});

summarize();
