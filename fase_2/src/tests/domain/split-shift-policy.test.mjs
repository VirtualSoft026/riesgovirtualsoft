import { createRunner, assert } from '../test-harness.mjs';
import {
    SPLIT_SHIFT_BLOCK_REASON,
    isSplitShiftEnabled,
    shouldShowSplitShiftButton,
    canToggleSplitShiftBreak
} from '../../domain/shifts/split-shift-policy.js';
import { toggleBreak } from '../../domain/shifts/break-transitions.js';
import { defaultState } from '../../domain/shifts/shift-calculator.js';

/**
 * Política del flag `hasSplitShift` (RN-1, RN-2, RN-3), 2026-10-06.
 * Matriz de decisión: visibilidad del botón y permiso de alternar la Pausa de Turno.
 */
const { test, summarize } = createRunner('split-shift-policy (RN-1..RN-3)');

const gestor = (flag) => ({ role: 'Gestor', ...(flag === undefined ? {} : { hasSplitShift: flag }) });

test('isSplitShiftEnabled solo es true con hasSplitShift === true (estricto)', () => {
    assert.equal(isSplitShiftEnabled(gestor(true)), true);
    for (const v of [undefined, false, null, 'true', 1, 0, '']) assert.equal(isSplitShiftEnabled(gestor(v)), false);
    assert.equal(isSplitShiftEnabled(null), false);
    assert.equal(isSplitShiftEnabled(undefined), false);
});

test('RN-1: gestor SIN flag y sin pausa activa: no ve el botón y no puede iniciar la pausa', () => {
    for (const v of [undefined, false, null]) {
        assert.equal(shouldShowSplitShiftButton(gestor(v), { isSplitShiftBreak: false }), false);
        assert.equal(canToggleSplitShiftBreak(gestor(v), { isSplitShiftBreak: false }), false);
    }
    assert.equal(shouldShowSplitShiftButton(gestor(false)), false);
    assert.equal(canToggleSplitShiftBreak(gestor(false)), false);
});

test('RN-2: gestor CON flag: ve el botón y puede entrar y salir de la pausa', () => {
    assert.equal(shouldShowSplitShiftButton(gestor(true), { isSplitShiftBreak: false }), true);
    assert.equal(canToggleSplitShiftBreak(gestor(true), { isSplitShiftBreak: false }), true);
    assert.equal(shouldShowSplitShiftButton(gestor(true), { isSplitShiftBreak: true }), true);
    assert.equal(canToggleSplitShiftBreak(gestor(true), { isSplitShiftBreak: true }), true);
});

test('RN-3: pausa activa y flag revocado: el botón sigue visible y retomar se permite', () => {
    assert.equal(shouldShowSplitShiftButton(gestor(false), { isSplitShiftBreak: true }), true);
    assert.equal(canToggleSplitShiftBreak(gestor(false), { isSplitShiftBreak: true }), true);
    assert.equal(shouldShowSplitShiftButton(gestor(undefined), { isSplitShiftBreak: true }), true);
});

test('el botón es solo para el rol Gestor, aunque otro rol tenga el flag', () => {
    for (const role of ['Admin', 'Supervisor', 'Auditor', undefined]) {
        assert.equal(shouldShowSplitShiftButton({ role, hasSplitShift: true }, {}), false);
    }
});

test('sin usuario: nada visible ni permitido', () => {
    assert.equal(shouldShowSplitShiftButton(null, { isSplitShiftBreak: true }), false);
    assert.equal(canToggleSplitShiftBreak(null, { isSplitShiftBreak: true }), false);
    assert.equal(canToggleSplitShiftBreak(undefined), false);
});

test('SPLIT_SHIFT_BLOCK_REASON expone los motivos y está congelado', () => {
    assert.equal(SPLIT_SHIFT_BLOCK_REASON.OTHER_BREAK_ACTIVE, 'OTHER_BREAK_ACTIVE');
    assert.equal(SPLIT_SHIFT_BLOCK_REASON.SPLIT_SHIFT_NOT_ENABLED, 'SPLIT_SHIFT_NOT_ENABLED');
    assert.ok(Object.isFrozen(SPLIT_SHIFT_BLOCK_REASON));
});

test('coherencia: canToggle(false→iniciar) coincide con lo que exige toggleBreak (splitShiftEnabled)', () => {
    for (const flag of [undefined, false, true]) {
        const user = gestor(flag);
        const r = toggleBreak(defaultState(), 'split', 1000, { splitShiftEnabled: isSplitShiftEnabled(user) });
        assert.equal(!r.blocked, canToggleSplitShiftBreak(user, { isSplitShiftBreak: false }));
    }
});

summarize();
