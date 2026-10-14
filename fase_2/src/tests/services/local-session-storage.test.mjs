import { createRunner, assert } from '../test-harness.mjs';
import { saveBreakState, loadBreakState, saveTimeline, loadTimeline, migrateFromLegacyStorage } from '../../services/storage/local-session-storage.js';
import { defaultState } from '../../domain/shifts/shift-calculator.js';

/**
 * Tests para saveBreakState(), loadBreakState(), saveTimeline(), loadTimeline()
 * y migrateFromLegacyStorage().
 *
 * Decisión P3 / Opción A (2026-10-13): local-session-storage.js separa
 * riskOps_breakState (9 campos de pausa) y riskOps_timeline (arreglo de eventos),
 * igual que app.js. migrateFromLegacyStorage() es no-op.
 *
 * Requiere mock de localStorage (Node no lo provee).
 * El mock se configura ANTES de llamar cualquier función exportada; como
 * local-session-storage.js solo accede a localStorage dentro de sus funciones
 * (no en el cuerpo del módulo), el mock está disponible en el momento justo.
 */

// ── Mock de localStorage ──────────────────────────────────────────────────────
const _store = new Map();
globalThis.localStorage = {
    getItem:    (key)        => _store.has(key) ? _store.get(key) : null,
    setItem:    (key, value) => _store.set(key, String(value)),
    removeItem: (key)        => _store.delete(key),
    clear:      ()           => _store.clear(),
};

function clearStorage() { _store.clear(); }

const { test, summarize } = createRunner('local-session-storage — save / load / timeline / migrate');

const BREAK_STATE_KEY  = 'riskOps_breakState';
const TIMELINE_KEY     = 'riskOps_timeline';

// ── saveBreakState ────────────────────────────────────────────────────────────

test('saveBreakState: persiste estado normalizado y lo devuelve', () => {
    clearStorage();
    const input  = { isLunchBreak: true, lunchStartTime: 1000, totalLunchTimeMs: 0 };
    const result = saveBreakState(input);
    assert.equal(result.isLunchBreak, true);
    assert.equal(result.lunchStartTime, 1000);

    const raw = JSON.parse(localStorage.getItem(BREAK_STATE_KEY));
    assert.equal(raw.isLunchBreak, true);
});

test('saveBreakState: el objeto retornado tiene todas las claves del estado por defecto', () => {
    clearStorage();
    const result = saveBreakState({});
    const keys   = Object.keys(defaultState());
    keys.forEach(k => assert.ok(Object.prototype.hasOwnProperty.call(result, k), `falta clave: ${k}`));
});

test('saveBreakState: ignora valores no numéricos en lunchStartTime', () => {
    clearStorage();
    const result = saveBreakState({ lunchStartTime: 'invalid' });
    assert.equal(result.lunchStartTime, null);
});

test('saveBreakState: acepta shiftTimeline con eventos y los clona', () => {
    clearStorage();
    const timeline = [{ type: 'Inactividad', start: 1000, end: 2000 }];
    const result   = saveBreakState({ shiftTimeline: timeline });
    assert.equal(result.shiftTimeline.length, 1);
    assert.equal(result.shiftTimeline[0].type, 'Inactividad');
    // Verificar que se clonó (no es la misma referencia)
    assert.notEqual(result.shiftTimeline, timeline);
});

test('saveBreakState: shiftTimeline no array se normaliza a []', () => {
    clearStorage();
    const result = saveBreakState({ shiftTimeline: 'no-es-array' });
    assert.deepEqual(result.shiftTimeline, []);
});

test('saveBreakState: isSplitShiftBreak solo acepta true literal', () => {
    clearStorage();
    const r1 = saveBreakState({ isSplitShiftBreak: 1 });
    assert.equal(r1.isSplitShiftBreak, false);
    const r2 = saveBreakState({ isSplitShiftBreak: true });
    assert.equal(r2.isSplitShiftBreak, true);
});

test('saveBreakState: error de escritura no lanza excepción (retorna estado normalizado)', () => {
    clearStorage();
    const originalSetItem = globalThis.localStorage.setItem;
    globalThis.localStorage.setItem = () => { throw new Error('cuota excedida'); };
    let result;
    assert.doesNotThrow(() => { result = saveBreakState({ isLunchBreak: true }); });
    assert.equal(result.isLunchBreak, true);
    globalThis.localStorage.setItem = originalSetItem;
});

test('saveBreakState: NO guarda shiftTimeline dentro de riskOps_breakState (Opción A)', () => {
    clearStorage();
    saveBreakState({ shiftTimeline: [{ type: 'Almuerzo', start: 1, end: 2 }] });
    const stored = JSON.parse(localStorage.getItem(BREAK_STATE_KEY));
    assert.equal(
        Object.prototype.hasOwnProperty.call(stored, 'shiftTimeline'),
        false,
        'riskOps_breakState no debe contener shiftTimeline'
    );
});

// ── loadBreakState ────────────────────────────────────────────────────────────

test('loadBreakState: devuelve defaultState cuando no hay nada guardado', () => {
    clearStorage();
    const result = loadBreakState();
    assert.deepEqual(result, defaultState());
});

test('loadBreakState: recupera un estado previamente guardado', () => {
    clearStorage();
    const input = { isLunchBreak: true, lunchStartTime: 5000, totalLunchTimeMs: 1000 };
    saveBreakState(input);
    const result = loadBreakState();
    assert.equal(result.isLunchBreak, true);
    assert.equal(result.lunchStartTime, 5000);
    assert.equal(result.totalLunchTimeMs, 1000);
});

test('loadBreakState: JSON malformado devuelve defaultState', () => {
    clearStorage();
    localStorage.setItem(BREAK_STATE_KEY, '{ no es json }');
    const result = loadBreakState();
    assert.deepEqual(result, defaultState());
});

test('loadBreakState: error de lectura no lanza excepción', () => {
    clearStorage();
    const originalGetItem = globalThis.localStorage.getItem;
    globalThis.localStorage.getItem = () => { throw new Error('acceso denegado'); };
    let result;
    assert.doesNotThrow(() => { result = loadBreakState(); });
    assert.deepEqual(result, defaultState());
    globalThis.localStorage.getItem = originalGetItem;
});

test('loadBreakState: shiftTimeline guardada en riskOps_timeline se recupera correctamente', () => {
    clearStorage();
    const timeline = [{ type: 'Desayuno', start: 100, end: 200 }];
    saveBreakState({ shiftTimeline: timeline });
    const result = loadBreakState();
    assert.equal(result.shiftTimeline.length, 1);
    assert.equal(result.shiftTimeline[0].type, 'Desayuno');
});

test('loadBreakState: normaliza un estado parcial guardado manualmente en riskOps_breakState', () => {
    clearStorage();
    // Guardamos sin shiftTimeline (simulando datos legacy parciales / app.js)
    localStorage.setItem(BREAK_STATE_KEY, JSON.stringify({ isLunchBreak: true }));
    const result = loadBreakState();
    assert.equal(result.isLunchBreak, true);
    assert.deepEqual(result.shiftTimeline, []);
});

test('saveBreakState + loadBreakState: round-trip completo con todos los campos', () => {
    clearStorage();
    const state = {
        isLunchBreak: false,
        lunchStartTime: null,
        totalLunchTimeMs: 18000,
        isBreakfastBreak: true,
        breakfastStartTime: 9000,
        totalBreakfastTimeMs: 0,
        isSplitShiftBreak: false,
        splitShiftStartTime: null,
        totalSplitShiftTimeMs: 0,
        shiftTimeline: [
            { type: 'Inactividad', start: 1000, end: 5000 },
            { type: 'Almuerzo', start: 6000, end: null },
        ]
    };
    saveBreakState(state);
    const loaded = loadBreakState();
    assert.equal(loaded.isBreakfastBreak, true);
    assert.equal(loaded.breakfastStartTime, 9000);
    assert.equal(loaded.totalLunchTimeMs, 18000);
    assert.equal(loaded.shiftTimeline.length, 2);
    assert.equal(loaded.shiftTimeline[0].type, 'Inactividad');
});

// ── saveTimeline / loadTimeline ───────────────────────────────────────────────

test('saveTimeline/loadTimeline: round-trip con eventos', () => {
    clearStorage();
    const events = [
        { type: 'Inactividad', start: 1000, end: 2000 },
        { type: 'Almuerzo', start: 3000, end: null }
    ];
    saveTimeline(events);
    const loaded = loadTimeline();
    assert.equal(loaded.length, 2);
    assert.equal(loaded[0].type, 'Inactividad');
    assert.equal(loaded[1].end, null);
});

test('loadTimeline: devuelve [] si riskOps_timeline no existe', () => {
    clearStorage();
    assert.deepEqual(loadTimeline(), []);
});

test('loadTimeline: devuelve [] ante JSON malformado, sin lanzar', () => {
    clearStorage();
    localStorage.setItem(TIMELINE_KEY, '{ malo }');
    let result;
    assert.doesNotThrow(() => { result = loadTimeline(); });
    assert.deepEqual(result, []);
});

test('saveTimeline: input no-array se guarda como []', () => {
    clearStorage();
    saveTimeline('no-es-array');
    const loaded = loadTimeline();
    assert.deepEqual(loaded, []);
});

test('saveTimeline: error de escritura no lanza excepción', () => {
    clearStorage();
    const originalSetItem = globalThis.localStorage.setItem;
    globalThis.localStorage.setItem = () => { throw new Error('cuota excedida'); };
    assert.doesNotThrow(() => saveTimeline([{ type: 'Almuerzo', start: 1, end: 2 }]));
    globalThis.localStorage.setItem = originalSetItem;
});

// ── migrateFromLegacyStorage (no-op — Opción A) ───────────────────────────────

test('migrateFromLegacyStorage: no lanza excepción (no-op)', () => {
    clearStorage();
    assert.doesNotThrow(() => migrateFromLegacyStorage());
});

test('migrateFromLegacyStorage: no modifica ninguna llave de localStorage (no-op)', () => {
    clearStorage();
    const events = [{ type: 'Inactividad', start: 1000, end: 2000 }];
    localStorage.setItem(TIMELINE_KEY, JSON.stringify(events));

    migrateFromLegacyStorage();

    // riskOps_timeline debe seguir intacta
    assert.equal(localStorage.getItem(TIMELINE_KEY), JSON.stringify(events));
    // riskOps_breakState no debe haber sido creada
    assert.equal(localStorage.getItem(BREAK_STATE_KEY), null);
});

test('migrateFromLegacyStorage: es idempotente (llamar dos veces no cambia nada)', () => {
    clearStorage();
    const events = [{ type: 'Desayuno', start: 100, end: 200 }];
    localStorage.setItem(TIMELINE_KEY, JSON.stringify(events));

    migrateFromLegacyStorage();
    migrateFromLegacyStorage();

    // Sigue sin tocar nada
    assert.equal(localStorage.getItem(TIMELINE_KEY), JSON.stringify(events));
    assert.equal(localStorage.getItem(BREAK_STATE_KEY), null);
});

summarize();
