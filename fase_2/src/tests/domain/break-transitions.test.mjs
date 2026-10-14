import { createRunner, assert } from '../test-harness.mjs';
import { toggleBreak } from '../../domain/shifts/break-transitions.js';
import { defaultState } from '../../domain/shifts/shift-calculator.js';

// La Pausa de Turno solo se inicia con el flag hasSplitShift (RN-1); las demás pausas no dependen de él.
const ENABLED = { splitShiftEnabled: true };
const optsFor = (kind) => (kind === 'split' ? ENABLED : {});

const { test, summarize } = createRunner('break-transitions.js');

const T0 = 1_000_000;

const CASES = [
    { kind: 'breakfast', active: 'isBreakfastBreak', start: 'breakfastStartTime', total: 'totalBreakfastTimeMs', type: 'Desayuno', others: ['isLunchBreak', 'isSplitShiftBreak'] },
    { kind: 'lunch', active: 'isLunchBreak', start: 'lunchStartTime', total: 'totalLunchTimeMs', type: 'Almuerzo', others: ['isBreakfastBreak', 'isSplitShiftBreak'] },
    { kind: 'split', active: 'isSplitShiftBreak', start: 'splitShiftStartTime', total: 'totalSplitShiftTimeMs', type: 'Pausa de Turno', others: ['isBreakfastBreak', 'isLunchBreak'] }
];

for (const c of CASES) {
    test(`${c.kind}: iniciar marca activa, guarda hora de inicio y pide evento "${c.type}" start`, () => {
        const r = toggleBreak(defaultState(), c.kind, T0, optsFor(c.kind));
        assert.equal(r.blocked, false);
        assert.equal(r.blockedReason, null);
        assert.equal(r.action, 'start');
        assert.equal(r.state[c.active], true);
        assert.equal(r.state[c.start], T0);
        assert.deepEqual(r.timelineEvent, { type: c.type, action: 'start' });
        assert.deepEqual(r.effects, { saveState: true, syncFirebase: true, updateActivity: false });
    });

    test(`${c.kind}: terminar acumula el tiempo, limpia el inicio, pide evento end y updateActivity`, () => {
        const started = toggleBreak(defaultState(), c.kind, T0, optsFor(c.kind)).state;
        const r = toggleBreak(started, c.kind, T0 + 90_000, optsFor(c.kind));
        assert.equal(r.action, 'end');
        assert.equal(r.state[c.active], false);
        assert.equal(r.state[c.start], null);
        assert.equal(r.state[c.total], 90_000);
        assert.deepEqual(r.timelineEvent, { type: c.type, action: 'end' });
        assert.deepEqual(r.effects, { saveState: true, syncFirebase: true, updateActivity: true });
    });

    test(`${c.kind}: iniciar queda bloqueado si hay otra pausa activa (sin efectos ni cambios)`, () => {
        for (const other of c.others) {
            const state = { ...defaultState(), [other]: true };
            const r = toggleBreak(state, c.kind, T0, optsFor(c.kind));
            assert.equal(r.blocked, true);
            assert.equal(r.blockedReason, 'OTHER_BREAK_ACTIVE');
            assert.equal(r.action, null);
            assert.equal(r.timelineEvent, null);
            assert.deepEqual(r.effects, { saveState: false, syncFirebase: false, updateActivity: false });
            assert.equal(r.state[c.active], false);
        }
    });

    test(`${c.kind}: dos pausas del mismo tipo suman sus tiempos`, () => {
        const o = optsFor(c.kind);
        let s = toggleBreak(defaultState(), c.kind, T0, o).state;
        s = toggleBreak(s, c.kind, T0 + 60_000, o).state;
        s = toggleBreak(s, c.kind, T0 + 100_000, o).state;
        s = toggleBreak(s, c.kind, T0 + 130_000, o).state;
        assert.equal(s[c.total], 90_000);
    });
}

test('característica heredada: terminar una pausa activa SIN hora de inicio no suma tiempo (estado restaurado incompleto)', () => {
    // app.js: `if (breakfastStartTime) total += ...` — si la hora de inicio se perdió,
    // la pausa se cierra pero no se acumula nada. Se documenta, no se corrige.
    const state = { ...defaultState(), isBreakfastBreak: true, breakfastStartTime: null, totalBreakfastTimeMs: 5000 };
    const r = toggleBreak(state, 'breakfast', T0);
    assert.equal(r.state.totalBreakfastTimeMs, 5000);
    assert.equal(r.state.isBreakfastBreak, false);
});

test('no muta el estado recibido', () => {
    const state = defaultState();
    const snapshot = JSON.stringify(state);
    toggleBreak(state, 'lunch', T0);
    assert.equal(JSON.stringify(state), snapshot);
});

test('un tipo de pausa desconocido lanza error', () => {
    assert.throws(() => toggleBreak(defaultState(), 'siesta', T0), /desconocido/);
});

// --- Regla de negocio hasSplitShift (RN-1, RN-2, RN-3) — 2026-10-06 ---

const BLOCKED_NO_EFFECTS = { saveState: false, syncFirebase: false, updateActivity: false };

test('RN-1: iniciar la Pausa de Turno SIN flag queda bloqueado con motivo SPLIT_SHIFT_NOT_ENABLED (sin efectos)', () => {
    for (const opts of [undefined, {}, { splitShiftEnabled: false }, { splitShiftEnabled: 'true' }, { splitShiftEnabled: 1 }]) {
        const r = opts === undefined ? toggleBreak(defaultState(), 'split', T0) : toggleBreak(defaultState(), 'split', T0, opts);
        assert.equal(r.blocked, true);
        assert.equal(r.blockedReason, 'SPLIT_SHIFT_NOT_ENABLED');
        assert.equal(r.action, null);
        assert.equal(r.timelineEvent, null);
        assert.deepEqual(r.effects, BLOCKED_NO_EFFECTS);
        assert.equal(r.state.isSplitShiftBreak, false);
        assert.equal(r.state.splitShiftStartTime, null);
    }
});

test('RN-2: iniciar la Pausa de Turno CON flag (=== true) la inicia', () => {
    const r = toggleBreak(defaultState(), 'split', T0, { splitShiftEnabled: true });
    assert.equal(r.blocked, false);
    assert.equal(r.action, 'start');
    assert.equal(r.state.isSplitShiftBreak, true);
});

test('RN-3: retomar (terminar) la pausa SIEMPRE se permite, aunque el flag ya no esté (revocado a mitad de la pausa / recarga)', () => {
    const started = toggleBreak(defaultState(), 'split', T0, ENABLED).state;
    for (const opts of [undefined, {}, { splitShiftEnabled: false }]) {
        const r = opts === undefined ? toggleBreak(started, 'split', T0 + 120_000) : toggleBreak(started, 'split', T0 + 120_000, opts);
        assert.equal(r.blocked, false);
        assert.equal(r.action, 'end');
        assert.equal(r.state.isSplitShiftBreak, false);
        assert.equal(r.state.totalSplitShiftTimeMs, 120_000);
        assert.deepEqual(r.effects, { saveState: true, syncFirebase: true, updateActivity: true });
    }
});

test('Almuerzo y desayuno NO dependen del flag: se inician y terminan igual con o sin splitShiftEnabled', () => {
    for (const kind of ['breakfast', 'lunch']) {
        for (const opts of [undefined, { splitShiftEnabled: false }, { splitShiftEnabled: true }]) {
            const a = opts === undefined ? toggleBreak(defaultState(), kind, T0) : toggleBreak(defaultState(), kind, T0, opts);
            assert.equal(a.blocked, false);
            assert.equal(a.action, 'start');
            const b = opts === undefined ? toggleBreak(a.state, kind, T0 + 30_000) : toggleBreak(a.state, kind, T0 + 30_000, opts);
            assert.equal(b.action, 'end');
        }
    }
});

test('con el flag y otra pausa activa el motivo es OTHER_BREAK_ACTIVE; sin flag y otra pausa activa gana SPLIT_SHIFT_NOT_ENABLED', () => {
    const lunch = { ...defaultState(), isLunchBreak: true };
    assert.equal(toggleBreak(lunch, 'split', T0, ENABLED).blockedReason, 'OTHER_BREAK_ACTIVE');
    assert.equal(toggleBreak(lunch, 'split', T0, {}).blockedReason, 'SPLIT_SHIFT_NOT_ENABLED');
});

test('con la pausa de turno activa, almuerzo y desayuno siguen bloqueados (OTHER_BREAK_ACTIVE), con o sin flag', () => {
    const split = { ...defaultState(), isSplitShiftBreak: true, splitShiftStartTime: T0 };
    for (const kind of ['breakfast', 'lunch']) {
        for (const opts of [{}, ENABLED]) {
            const r = toggleBreak(split, kind, T0 + 1000, opts);
            assert.equal(r.blocked, true);
            assert.equal(r.blockedReason, 'OTHER_BREAK_ACTIVE');
        }
    }
});

test('bloqueo por flag no muta el estado recibido', () => {
    const state = defaultState();
    const snapshot = JSON.stringify(state);
    toggleBreak(state, 'split', T0, {});
    assert.equal(JSON.stringify(state), snapshot);
});

summarize();
