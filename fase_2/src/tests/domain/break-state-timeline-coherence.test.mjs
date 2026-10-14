/**
 * Prueba de coherencia entre `riskOps_breakState` y `riskOps_timeline`.
 *
 * Contexto (ver fase_2/Docs/04-diagnostico-continuacion/diagnostico-integracion-y-evaluacion-plan.md
 * y fase_2/Docs/03-plan-migracion/plan-maestro-ejecucion.md §4, punto 2):
 *
 * Decisión P3 / Opción A aprobada (2026-10-13):
 * `local-session-storage.js` usa las DOS llaves por separado, exactamente como app.js:
 *   - `riskOps_breakState` → 9 campos de pausa (sin shiftTimeline)
 *   - `riskOps_timeline`   → arreglo de eventos (igual que el app.js de producción)
 *
 * Con esto se elimina la incompatibilidad de forma de datos documentada en el
 * informe de 2026-10-03. El riesgo B-1 queda resuelto.
 *
 * Esta suite tiene tres secciones:
 *
 *   A) Regresión del comportamiento correcto de local-session-storage.js y
 *      shift-calculator.js tras la Opción A. Incluye A8-A10 nuevos para
 *      saveTimeline/loadTimeline y el no-op de migrateFromLegacyStorage.
 *
 *   B) Verificación del comportamiento correcto (Opción A):
 *      B1 confirma que loadBreakState() lee riskOps_timeline y lo devuelve como
 *         shiftTimeline.
 *      B2 confirma que saveBreakState() escribe la línea de tiempo en riskOps_timeline
 *         (NO dentro de riskOps_breakState).
 *      B3 confirma que riskOps_breakState tiene exactamente 9 campos (sin shiftTimeline).
 *      Si cualquiera falla, hay una regresión de la Opción A.
 *
 *   C) Smoke tests de timeline-service.js (pushTimelineEvent). No sustituyen la
 *      verificación 1:1 contra app.js pendiente en plan-maestro-ejecucion.md §9 paso 3.
 *
 * Uso:
 *   node fase_2/src/tests/domain/break-state-timeline-coherence.test.mjs
 *
 * Sale con código 1 si falla alguna prueba (de cualquier sección).
 */
import { createRunner, assert } from '../test-harness.mjs';
import { defaultState, normalizeState } from '../../domain/shifts/shift-calculator.js';
import { pushTimelineEvent } from '../../domain/shifts/timeline-service.js';
import { saveBreakState, loadBreakState, saveTimeline, loadTimeline, migrateFromLegacyStorage } from '../../services/storage/local-session-storage.js';

const { test, summarize } = createRunner('break-state-timeline-coherence');

// ---------------------------------------------------------------------------
// Mock mínimo de localStorage (Node no lo expone por defecto).
// ---------------------------------------------------------------------------
function createLocalStorageMock({ throwOnSetItem = false } = {}) {
    const store = new Map();

    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            if (throwOnSetItem) {
                throw new Error('QuotaExceededError simulado');
            }
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        },
        clear() {
            store.clear();
        },
        // Acceso directo para que las pruebas lean/escriban datos a mano.
        _raw: store
    };
}

// ---------------------------------------------------------------------------
// Sección A — regresión del comportamiento correcto (Opción A)
// ---------------------------------------------------------------------------

test('A1. defaultState() incluye shiftTimeline: [] y los 9 campos de pausas en falso/0/null', () => {
    assert.deepEqual(defaultState(), {
        isLunchBreak: false,
        lunchStartTime: null,
        totalLunchTimeMs: 0,
        isBreakfastBreak: false,
        breakfastStartTime: null,
        totalBreakfastTimeMs: 0,
        isSplitShiftBreak: false,
        splitShiftStartTime: null,
        totalSplitShiftTimeMs: 0,
        shiftTimeline: []
    });
});

test('A2. normalizeState() sanea valores inválidos a los valores por defecto', () => {
    const result = normalizeState({
        isLunchBreak: 'si', // no es booleano estricto -> false
        lunchStartTime: 'ayer', // no finito -> null
        totalLunchTimeMs: -1, // Number.isFinite(-1) es true -> se conserva
        shiftTimeline: 'no-es-arreglo' // -> []
    });

    assert.equal(result.isLunchBreak, false);
    assert.equal(result.lunchStartTime, null);
    assert.equal(result.totalLunchTimeMs, -1);
    assert.deepEqual(result.shiftTimeline, []);
});

test('A3. normalizeState() copia shiftTimeline por valor, no por referencia', () => {
    const original = [{ type: 'Almuerzo', start: 1, end: 2 }];
    const result = normalizeState({ shiftTimeline: original });

    result.shiftTimeline[0].end = 999;

    assert.equal(original[0].end, 2, 'mutar el resultado no debe afectar el arreglo original');
});

test('A4. saveBreakState()/loadBreakState() hacen round-trip fiel, incluido shiftTimeline', () => {
    globalThis.localStorage = createLocalStorageMock();

    const state = {
        isLunchBreak: true,
        lunchStartTime: 1000,
        totalLunchTimeMs: 2000,
        isBreakfastBreak: false,
        breakfastStartTime: null,
        totalBreakfastTimeMs: 0,
        isSplitShiftBreak: false,
        splitShiftStartTime: null,
        totalSplitShiftTimeMs: 0,
        shiftTimeline: [{ type: 'Almuerzo', start: 1000, end: null }]
    };

    saveBreakState(state);
    const loaded = loadBreakState();

    assert.deepEqual(loaded, state);
});

test('A5. loadBreakState() devuelve defaultState() si la llave no existe', () => {
    globalThis.localStorage = createLocalStorageMock();

    assert.deepEqual(loadBreakState(), defaultState());
});

test('A6. loadBreakState() devuelve defaultState() ante JSON corrupto en riskOps_breakState, sin lanzar', () => {
    const mock = createLocalStorageMock();
    mock._raw.set('riskOps_breakState', '{esto no es JSON válido');
    globalThis.localStorage = mock;

    assert.deepEqual(loadBreakState(), defaultState());
});

test('A7. saveBreakState() contiene el error si localStorage.setItem lanza (p. ej. cuota excedida)', () => {
    globalThis.localStorage = createLocalStorageMock({ throwOnSetItem: true });

    assert.doesNotThrow(() => saveBreakState(defaultState()));
});

test('A8. saveTimeline/loadTimeline: round-trip con eventos reales', () => {
    globalThis.localStorage = createLocalStorageMock();

    const events = [
        { type: 'Almuerzo', start: 1696300000000, end: 1696303600000 },
        { type: 'Inactividad', start: 1696304000000, end: null }
    ];

    saveTimeline(events);
    const loaded = loadTimeline();

    assert.equal(loaded.length, 2);
    assert.equal(loaded[0].type, 'Almuerzo');
    assert.equal(loaded[1].type, 'Inactividad');
    assert.equal(loaded[1].end, null);
});

test('A9. loadTimeline() devuelve [] cuando riskOps_timeline no existe', () => {
    globalThis.localStorage = createLocalStorageMock();

    assert.deepEqual(loadTimeline(), []);
});

test('A10. migrateFromLegacyStorage() es un no-op: no lanza, no modifica ninguna llave', () => {
    const mock = createLocalStorageMock();
    const events = [{ type: 'Inactividad', start: 100, end: 200 }];
    mock._raw.set('riskOps_timeline', JSON.stringify(events));
    globalThis.localStorage = mock;

    // No debe lanzar
    assert.doesNotThrow(() => migrateFromLegacyStorage());

    // riskOps_timeline intacta (no la consumió)
    assert.equal(mock._raw.get('riskOps_timeline'), JSON.stringify(events));

    // riskOps_breakState no fue creada
    assert.equal(mock._raw.get('riskOps_breakState'), undefined);
});

// ---------------------------------------------------------------------------
// Sección B — verificación de la corrección Opción A
// (Si cualquiera falla, hay una regresión de la Opción A)
// ---------------------------------------------------------------------------

test('B1 [OPCIÓN A]. loadBreakState() lee riskOps_timeline y lo devuelve como shiftTimeline', () => {
    const mock = createLocalStorageMock();

    // riskOps_breakState con solo los 9 campos de pausa (forma de app.js)
    mock._raw.set('riskOps_breakState', JSON.stringify({
        isLunchBreak: false,
        lunchStartTime: null,
        totalLunchTimeMs: 1800000,
        isBreakfastBreak: false,
        breakfastStartTime: null,
        totalBreakfastTimeMs: 0,
        isSplitShiftBreak: false,
        splitShiftStartTime: null,
        totalSplitShiftTimeMs: 0
    }));

    // riskOps_timeline con eventos reales (forma de app.js)
    const timelineReal = [
        { type: 'Almuerzo', start: 1696300000000, end: 1696303600000 },
        { type: 'Inactividad', start: 1696304000000, end: 1696304100000 }
    ];
    mock._raw.set('riskOps_timeline', JSON.stringify(timelineReal));
    globalThis.localStorage = mock;

    const loaded = loadBreakState();

    // Con Opción A, la línea de tiempo real debe aparecer en shiftTimeline.
    assert.equal(loaded.shiftTimeline.length, 2, 'loadBreakState() debe leer riskOps_timeline como shiftTimeline');
    assert.equal(loaded.shiftTimeline[0].type, 'Almuerzo');
    assert.equal(loaded.shiftTimeline[1].type, 'Inactividad');
    assert.equal(loaded.totalLunchTimeMs, 1800000);
});

test('B2 [OPCIÓN A]. saveBreakState() escribe la línea de tiempo en riskOps_timeline, NO dentro de riskOps_breakState', () => {
    const mock = createLocalStorageMock();
    globalThis.localStorage = mock;

    const timeline = [{ type: 'Desayuno', start: 10, end: 20 }];
    saveBreakState({ ...defaultState(), shiftTimeline: timeline });

    // riskOps_timeline debe tener el arreglo de eventos
    const storedTimeline = JSON.parse(mock._raw.get('riskOps_timeline'));
    assert.equal(Array.isArray(storedTimeline), true);
    assert.equal(storedTimeline.length, 1);
    assert.equal(storedTimeline[0].type, 'Desayuno');

    // riskOps_breakState NO debe contener shiftTimeline
    const storedBreakState = JSON.parse(mock._raw.get('riskOps_breakState'));
    assert.equal(
        Object.prototype.hasOwnProperty.call(storedBreakState, 'shiftTimeline'),
        false,
        'riskOps_breakState no debe contener shiftTimeline (Opción A: llaves separadas)'
    );
});

test('B3 [OPCIÓN A]. riskOps_breakState tiene exactamente 9 campos (sin shiftTimeline)', () => {
    const mock = createLocalStorageMock();
    globalThis.localStorage = mock;

    saveBreakState(defaultState());

    const storedBreakState = JSON.parse(mock._raw.get('riskOps_breakState'));
    const keys = Object.keys(storedBreakState);

    const expected9 = [
        'isLunchBreak', 'lunchStartTime', 'totalLunchTimeMs',
        'isBreakfastBreak', 'breakfastStartTime', 'totalBreakfastTimeMs',
        'isSplitShiftBreak', 'splitShiftStartTime', 'totalSplitShiftTimeMs'
    ];

    assert.equal(keys.length, 9, `riskOps_breakState debe tener 9 campos; tiene ${keys.length}: ${keys.join(', ')}`);
    expected9.forEach(k => {
        assert.ok(
            Object.prototype.hasOwnProperty.call(storedBreakState, k),
            `riskOps_breakState debe incluir el campo '${k}'`
        );
    });
});

// ---------------------------------------------------------------------------
// Sección C — smoke tests de timeline-service.js
// ---------------------------------------------------------------------------

test('C1. pushTimelineEvent("start", ...) cierra eventos abiertos y abre uno nuevo', () => {
    const before = [{ type: 'Almuerzo', start: 100, end: null }];
    const after = pushTimelineEvent(before, 'Inactividad', 'start', 200);

    assert.equal(after[0].end, 200, 'el evento previo sin cerrar debe cerrarse al abrir uno nuevo');
    assert.deepEqual(after[1], { type: 'Inactividad', start: 200, end: null });
    assert.equal(before[0].end, null, 'la entrada original no debe mutarse');
});

test('C2. pushTimelineEvent("end", ...) cierra el último evento abierto de ese tipo', () => {
    const before = [
        { type: 'Inactividad', start: 100, end: null },
        { type: 'Almuerzo', start: 150, end: null }
    ];
    const after = pushTimelineEvent(before, 'Almuerzo', 'end', 300);

    assert.equal(after[1].end, 300);
    assert.equal(after[0].end, null, 'un evento de otro tipo no debe cerrarse');
});

const { failed } = summarize();

if (failed > 0) {
    console.error(
        '\n[ATENCIÓN] Si las fallas son en la Sección B, hay una regresión de la ' +
        'Opción A: local-session-storage.js dejó de separar las llaves riskOps_breakState ' +
        'y riskOps_timeline. Verificar el último cambio en ese archivo y en shift-calculator.js.'
    );
    process.exit(1);
}
