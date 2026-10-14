import { createRunner, assert } from '../test-harness.mjs';
import { serializeBreakState, restoreBreakState, BREAK_STATE_RESTORE } from '../../domain/shifts/break-state-ownership.js';
import { defaultState } from '../../domain/shifts/shift-calculator.js';

/**
 * Hallazgo 2 de la revisión del 2026-10-06: `riskOps_breakState` es global y no pertenece a un usuario
 * (app.js 315-339). Aquí se prueba la solución: `ownerUid` dentro del mismo objeto.
 */
const { test, summarize } = createRunner('break-state-ownership (estado de pausas por usuario)');

const PAUSED = { ...defaultState(), isSplitShiftBreak: true, splitShiftStartTime: 5000, totalSplitShiftTimeMs: 1200, totalLunchTimeMs: 300 };

test('guardar incluye ownerUid y NO incluye shiftTimeline (vive en riskOps_timeline)', () => {
    const s = serializeBreakState(PAUSED, 'u1');
    assert.equal(s.ownerUid, 'u1');
    assert.equal('shiftTimeline' in s, false);
    assert.equal(s.isSplitShiftBreak, true);
    assert.equal(s.totalSplitShiftTimeMs, 1200);
});

test('guardar sin uid no agrega ownerUid', () => {
    assert.equal('ownerUid' in serializeBreakState(PAUSED, null), false);
});

test('el objeto guardado conserva los 9 campos que ya guardaba saveBreakState() de app.js', () => {
    const keys = Object.keys(serializeBreakState(PAUSED, 'u1')).filter((k) => k !== 'ownerUid').sort();
    assert.deepEqual(keys, ['breakfastStartTime', 'isBreakfastBreak', 'isLunchBreak', 'isSplitShiftBreak', 'lunchStartTime', 'splitShiftStartTime', 'totalBreakfastTimeMs', 'totalLunchTimeMs', 'totalSplitShiftTimeMs']);
});

test('ida y vuelta con el mismo usuario restaura la pausa y los acumulados', () => {
    const raw = JSON.stringify(serializeBreakState(PAUSED, 'u1'));
    const r = restoreBreakState(raw, 'u1');
    assert.equal(r.status, BREAK_STATE_RESTORE.OWNED);
    assert.equal(r.discarded, false);
    assert.equal(r.state.isSplitShiftBreak, true);
    assert.equal(r.state.splitShiftStartTime, 5000);
    assert.equal(r.state.totalLunchTimeMs, 300);
});

test('otro usuario en el mismo navegador NO hereda pausas ni acumulados (hallazgo 2)', () => {
    const raw = JSON.stringify(serializeBreakState(PAUSED, 'u1'));
    const r = restoreBreakState(raw, 'u2');
    assert.equal(r.status, BREAK_STATE_RESTORE.OTHER_OWNER);
    assert.equal(r.discarded, true);
    assert.deepEqual(r.state, defaultState());
});

test('estado antiguo SIN ownerUid (guardado por la versión actual de app.js) se acepta como LEGACY', () => {
    const legacy = JSON.stringify({ isSplitShiftBreak: true, splitShiftStartTime: 5000, totalSplitShiftTimeMs: 1200 });
    const r = restoreBreakState(legacy, 'u1');
    assert.equal(r.status, BREAK_STATE_RESTORE.LEGACY);
    assert.equal(r.state.isSplitShiftBreak, true);
    assert.equal(r.discarded, false);
});

test('sin uid conocido se acepta el estado (no se puede comparar dueño)', () => {
    const r = restoreBreakState(JSON.stringify(serializeBreakState(PAUSED, 'u1')), null);
    assert.equal(r.discarded, false);
    assert.equal(r.state.isSplitShiftBreak, true);
});

test('vacío, JSON inválido y valores no-objeto devuelven el estado por defecto', () => {
    for (const raw of [null, undefined, '']) assert.equal(restoreBreakState(raw, 'u1').status, BREAK_STATE_RESTORE.EMPTY);
    for (const raw of ['{no json', '[1,2]', '"x"', '7', 'null']) {
        const r = restoreBreakState(raw, 'u1');
        assert.equal(r.status, BREAK_STATE_RESTORE.INVALID);
        assert.deepEqual(r.state, defaultState());
    }
});

test('acepta también un objeto ya parseado', () => {
    assert.equal(restoreBreakState(serializeBreakState(PAUSED, 'u1'), 'u1').state.isSplitShiftBreak, true);
});

test('campos corruptos se normalizan (no numéricos → 0/null)', () => {
    const r = restoreBreakState({ ownerUid: 'u1', totalLunchTimeMs: 'abc', lunchStartTime: 'x', isLunchBreak: 'yes' }, 'u1');
    assert.equal(r.state.totalLunchTimeMs, 0);
    assert.equal(r.state.lunchStartTime, null);
    assert.equal(r.state.isLunchBreak, false);
});

summarize();
