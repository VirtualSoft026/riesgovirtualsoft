import { createRunner, assert } from '../test-harness.mjs';
import { resolveLiveStatus, buildBreakPayloadFields } from '../../domain/shifts/active-session-payload.js';
import { resolveSessionDisplay } from '../../domain/analytics/active-session-status.js';

const { test, summarize } = createRunner('active-session-payload (latido: estado y campos de la Pausa de Turno)');

/** Copia LITERAL del bloque de app.js 2426-2436 (estado del latido). */
function legacyStatus({ isSplitShiftBreak, isLunchBreak, isBreakfastBreak }, isInactive) {
    let currentStatus = 'Activo';
    if (isSplitShiftBreak) currentStatus = 'En Pausa de Turno';
    else if (isLunchBreak) currentStatus = 'En Almuerzo';
    else if (isBreakfastBreak) currentStatus = 'En Desayuno';
    else if (isInactive) currentStatus = 'Inactivo';
    else currentStatus = 'En Línea';
    return currentStatus;
}

test('diferencial vs app.js: las 32 combinaciones de pausas × inactividad dan el mismo estado', () => {
    const bools = [false, true];
    let n = 0;
    for (const s of bools) for (const l of bools) for (const b of bools) for (const i of bools) for (const _ of [0, 1]) {
        const st = { isSplitShiftBreak: s, isLunchBreak: l, isBreakfastBreak: b };
        assert.equal(resolveLiveStatus(st, i), legacyStatus(st, i));
        n += 1;
    }
    assert.equal(n, 32);
});

test('prioridad: Pausa de Turno > Almuerzo > Desayuno > Inactivo > En Línea', () => {
    assert.equal(resolveLiveStatus({ isSplitShiftBreak: true, isLunchBreak: true, isBreakfastBreak: true }, true), 'En Pausa de Turno');
    assert.equal(resolveLiveStatus({ isLunchBreak: true, isBreakfastBreak: true }, true), 'En Almuerzo');
    assert.equal(resolveLiveStatus({ isBreakfastBreak: true }, true), 'En Desayuno');
    assert.equal(resolveLiveStatus({}, true), 'Inactivo');
    assert.equal(resolveLiveStatus({}, false), 'En Línea');
    assert.equal(resolveLiveStatus(undefined, false), 'En Línea');
});

test('el estado del latido es reconocido por la vista del supervisor (contrato escritor→lector)', () => {
    for (const [st, inactive, expected] of [
        [{ isSplitShiftBreak: true }, false, 'En Pausa de Turno ⏸️'],
        [{ isLunchBreak: true }, false, 'En Almuerzo/Cena 🍽️'],
        [{ isBreakfastBreak: true }, false, 'En Desayuno ☕'],
        [{}, true, 'Inactivo 💤'],
        [{}, false, 'En Línea']
    ]) {
        const status = resolveLiveStatus(st, inactive);
        assert.equal(resolveSessionDisplay({ status, lastActive: 1000 }, 2000).displayStatus, expected);
    }
});

test('en pausa: el latido lleva la hora de inicio y el acumulado', () => {
    const f = buildBreakPayloadFields({ isSplitShiftBreak: true, splitShiftStartTime: 5000, totalSplitShiftTimeMs: 90000 });
    assert.deepEqual(f, { splitShiftStartTime: 5000, totalSplitShiftTimeMs: 90000 });
});

test('sin pausa: la hora de inicio va en null (limpia el dato en Firebase) y el acumulado se conserva', () => {
    const f = buildBreakPayloadFields({ isSplitShiftBreak: false, splitShiftStartTime: null, totalSplitShiftTimeMs: 90000 });
    assert.deepEqual(f, { splitShiftStartTime: null, totalSplitShiftTimeMs: 90000 });
});

test('estado ausente o corrupto no produce undefined ni NaN (Firebase rechaza undefined)', () => {
    for (const st of [undefined, null, {}, { totalSplitShiftTimeMs: 'x', isSplitShiftBreak: true, splitShiftStartTime: 'y' }]) {
        const f = buildBreakPayloadFields(st);
        assert.deepEqual(f, { splitShiftStartTime: null, totalSplitShiftTimeMs: 0 });
    }
});

summarize();
