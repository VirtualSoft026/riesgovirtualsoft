import { createRunner, assert } from '../test-harness.mjs';
import {
    pushTimelineEvent,
    cleanupStoredTimeline,
    consolidateTimeline,
} from '../../domain/shifts/timeline-service.js';

const { test, summarize } = createRunner('timeline-service — pushTimelineEvent / cleanupStoredTimeline / consolidateTimeline');

// Constantes de tipo (en línea para no depender del módulo de constants en el arnés)
const INACTIVIDAD   = 'Inactividad';
const ALMUERZO      = 'Almuerzo';
const DESAYUNO      = 'Desayuno';
const PAUSA_TURNO   = 'Pausa de Turno';

const SEC = 1000;
const MIN = 60 * SEC;
const T0  = 1_700_000_000_000;

// ── pushTimelineEvent — acción 'start' ────────────────────────────────────────

test('start: agrega evento abierto al final del timeline', () => {
    const next = pushTimelineEvent([], INACTIVIDAD, 'start', T0);
    assert.equal(next.length, 1);
    assert.equal(next[0].type, INACTIVIDAD);
    assert.equal(next[0].start, T0);
    assert.equal(next[0].end, null);
});

test('start: cierra eventos abiertos previos antes de agregar el nuevo', () => {
    const initial = [{ type: ALMUERZO, start: T0 - 10 * MIN, end: null }];
    const next    = pushTimelineEvent(initial, INACTIVIDAD, 'start', T0);
    assert.equal(next.length, 2);
    assert.equal(next[0].end, T0);       // ALMUERZO cerrado
    assert.equal(next[1].type, INACTIVIDAD);
    assert.equal(next[1].end, null);     // nuevo abierto
});

test('start: no cierra eventos que ya estaban cerrados', () => {
    const initial = [{ type: ALMUERZO, start: T0 - 10 * MIN, end: T0 - 5 * MIN }];
    const next    = pushTimelineEvent(initial, INACTIVIDAD, 'start', T0);
    assert.equal(next[0].end, T0 - 5 * MIN); // sin cambio
});

test('start: con timeline null crea timeline vacío y agrega el evento', () => {
    const next = pushTimelineEvent(null, DESAYUNO, 'start', T0);
    assert.equal(next.length, 1);
    assert.equal(next[0].type, DESAYUNO);
});

test('start: no muta el array original', () => {
    const original = [{ type: ALMUERZO, start: T0 - MIN, end: null }];
    pushTimelineEvent(original, INACTIVIDAD, 'start', T0);
    assert.equal(original[0].end, null); // sin mutar
});

// ── pushTimelineEvent — acción 'end' ─────────────────────────────────────────

test('end: cierra el último evento abierto del tipo indicado', () => {
    const initial = [
        { type: INACTIVIDAD, start: T0 - 30 * MIN, end: null },
    ];
    const next = pushTimelineEvent(initial, INACTIVIDAD, 'end', T0);
    assert.equal(next[0].end, T0);
});

test('end: solo cierra el último evento abierto del tipo (no los ya cerrados)', () => {
    const initial = [
        { type: INACTIVIDAD, start: T0 - 60 * MIN, end: T0 - 50 * MIN },  // ya cerrado
        { type: INACTIVIDAD, start: T0 - 20 * MIN, end: null },             // abierto
    ];
    const next = pushTimelineEvent(initial, INACTIVIDAD, 'end', T0);
    assert.equal(next[0].end, T0 - 50 * MIN); // sin cambio
    assert.equal(next[1].end, T0);              // cerrado
});

test('end: no hace nada si no hay evento abierto del tipo', () => {
    const initial = [{ type: ALMUERZO, start: T0 - MIN, end: null }];
    const next    = pushTimelineEvent(initial, INACTIVIDAD, 'end', T0);
    assert.equal(next.length, 1);
    assert.equal(next[0].type, ALMUERZO);
    assert.equal(next[0].end, null); // ALMUERZO sigue abierto
});

test('end: con timeline vacío devuelve array vacío', () => {
    const next = pushTimelineEvent([], INACTIVIDAD, 'end', T0);
    assert.deepEqual(next, []);
});

test('end: cierra el último cuando hay varios abiertos del mismo tipo', () => {
    const initial = [
        { type: INACTIVIDAD, start: T0 - 40 * MIN, end: null },
        { type: INACTIVIDAD, start: T0 - 10 * MIN, end: null },
    ];
    const next = pushTimelineEvent(initial, INACTIVIDAD, 'end', T0);
    assert.equal(next[0].end, null); // primero sigue abierto
    assert.equal(next[1].end, T0);  // último se cierra
});

test('end: no muta el array original', () => {
    const original = [{ type: INACTIVIDAD, start: T0 - MIN, end: null }];
    pushTimelineEvent(original, INACTIVIDAD, 'end', T0);
    assert.equal(original[0].end, null);
});

// ── cleanupStoredTimeline ─────────────────────────────────────────────────────

test('cleanup: array vacío devuelve timeline vacío y changed=false', () => {
    const { timeline, changed } = cleanupStoredTimeline([], T0);
    assert.deepEqual(timeline, []);
    assert.equal(changed, false);
});

test('cleanup: null se trata como array vacío', () => {
    const { timeline } = cleanupStoredTimeline(null, T0);
    assert.deepEqual(timeline, []);
});

test('cleanup: eventos de pausa (no inactividad) se conservan siempre', () => {
    const events = [
        { type: ALMUERZO,    start: T0,        end: T0 + 60 * MIN },
        { type: DESAYUNO,    start: T0 + MIN,  end: T0 + 20 * MIN },
        { type: PAUSA_TURNO, start: T0 + 2*MIN, end: T0 + 30 * MIN },
    ];
    const { timeline, changed } = cleanupStoredTimeline(events, T0 + 90 * MIN);
    assert.equal(timeline.length, 3);
    assert.equal(changed, false);
});

test('cleanup: inactividad < 30 s se descarta', () => {
    const events = [{ type: INACTIVIDAD, start: T0, end: T0 + 20 * SEC }];
    const { timeline, changed } = cleanupStoredTimeline(events, T0 + MIN);
    assert.equal(timeline.length, 0);
    assert.equal(changed, true);
});

test('cleanup: inactividad ≥ 30 s se conserva', () => {
    const events = [{ type: INACTIVIDAD, start: T0, end: T0 + 30 * SEC }];
    const { timeline } = cleanupStoredTimeline(events, T0 + MIN);
    assert.equal(timeline.length, 1);
});

test('cleanup: inactividad dentro de un almuerzo se descarta', () => {
    const events = [
        { type: ALMUERZO,    start: T0,               end: T0 + 60 * MIN },
        { type: INACTIVIDAD, start: T0 + 5 * MIN,    end: T0 + 35 * MIN },  // dentro del almuerzo
    ];
    const { timeline } = cleanupStoredTimeline(events, T0 + 90 * MIN);
    assert.equal(timeline.length, 1);
    assert.equal(timeline[0].type, ALMUERZO);
});

test('cleanup: inactividad fuera de pausas se conserva', () => {
    const events = [
        { type: ALMUERZO,    start: T0 + 30 * MIN, end: T0 + 90 * MIN },
        { type: INACTIVIDAD, start: T0 + 5 * MIN,  end: T0 + 10 * MIN },  // FUERA del almuerzo
    ];
    const { timeline } = cleanupStoredTimeline(events, T0 + 90 * MIN);
    assert.equal(timeline.length, 2);
});

test('cleanup: inactividad abierta se cierra con nowMs y changed=true', () => {
    const events = [{ type: INACTIVIDAD, start: T0, end: null }];
    const { timeline, changed } = cleanupStoredTimeline(events, T0 + 2 * MIN);
    assert.equal(timeline[0].end, T0 + 2 * MIN);
    assert.equal(changed, true);
});

test('cleanup: no muta los eventos de entrada', () => {
    const events = [{ type: INACTIVIDAD, start: T0, end: null }];
    cleanupStoredTimeline(events, T0 + 2 * MIN);
    assert.equal(events[0].end, null); // sin mutar
});

// ── consolidateTimeline ───────────────────────────────────────────────────────

test('consolidate: array vacío devuelve []', () => {
    const result = consolidateTimeline([], { defaultEndMs: T0 + 60 * MIN });
    assert.deepEqual(result, []);
});

test('consolidate: null devuelve []', () => {
    const result = consolidateTimeline(null, { defaultEndMs: T0 + 60 * MIN });
    assert.deepEqual(result, []);
});

test('consolidate: evento abierto se cierra con defaultEndMs', () => {
    const events = [{ type: INACTIVIDAD, start: T0, end: null }];
    const result = consolidateTimeline(events, { defaultEndMs: T0 + 30 * MIN });
    assert.equal(result[0].end, T0 + 30 * MIN);
});

test('consolidate: inactividad < 30 s se descarta', () => {
    const events = [{ type: INACTIVIDAD, start: T0, end: T0 + 20 * SEC }];
    const result = consolidateTimeline(events, { defaultEndMs: T0 + 60 * MIN });
    assert.deepEqual(result, []);
});

test('consolidate: eventos del mismo tipo a ≤ 60 s de distancia se fusionan', () => {
    const events = [
        { type: INACTIVIDAD, start: T0,          end: T0 + 2 * MIN },
        { type: INACTIVIDAD, start: T0 + 2 * MIN + 30 * SEC, end: T0 + 5 * MIN }, // 30 s después → ≤ 60 s → fusionar
    ];
    const result = consolidateTimeline(events, { defaultEndMs: T0 + 10 * MIN });
    assert.equal(result.length, 1);
    assert.equal(result[0].start, T0);
    assert.equal(result[0].end, T0 + 5 * MIN);
});

test('consolidate: eventos del mismo tipo a > 60 s de distancia NO se fusionan', () => {
    const events = [
        { type: INACTIVIDAD, start: T0,        end: T0 + 2 * MIN },
        { type: INACTIVIDAD, start: T0 + 4 * MIN, end: T0 + 7 * MIN }, // 2 min después → > 60 s → no fusionar
    ];
    const result = consolidateTimeline(events, { defaultEndMs: T0 + 10 * MIN });
    assert.equal(result.length, 2);
});

test('consolidate: inactividad completamente dentro de una pausa se descarta', () => {
    const events = [
        { type: ALMUERZO,    start: T0,              end: T0 + 60 * MIN },
        { type: INACTIVIDAD, start: T0 + 10 * MIN, end: T0 + 40 * MIN },
    ];
    const result = consolidateTimeline(events, { defaultEndMs: T0 + 90 * MIN });
    assert.equal(result.length, 1);
    assert.equal(result[0].type, ALMUERZO);
});

test('consolidate: inactividad solapada con pausa se recorta al final de la pausa', () => {
    const events = [
        { type: ALMUERZO,    start: T0,              end: T0 + 60 * MIN },
        { type: INACTIVIDAD, start: T0 + 50 * MIN, end: T0 + 80 * MIN }, // solapa almuerzo
    ];
    const result = consolidateTimeline(events, { defaultEndMs: T0 + 120 * MIN });
    // La parte de inactividad dentro del almuerzo (50→60 min) se descarta,
    // el fragmento 60→80 min (20 min ≥ 30 s) sobrevive
    const inac = result.find(e => e.type === INACTIVIDAD);
    assert.ok(inac, 'debe quedar fragmento de inactividad fuera del almuerzo');
    assert.ok(inac.start >= T0 + 60 * MIN, 'el fragmento debe empezar al final del almuerzo');
});

test('consolidate: preserva el orden cronológico con eventos mezclados', () => {
    const events = [
        { type: INACTIVIDAD, start: T0 + 20 * MIN, end: T0 + 25 * MIN },
        { type: ALMUERZO,    start: T0 + 5 * MIN,  end: T0 + 15 * MIN },
    ];
    const result = consolidateTimeline(events, { defaultEndMs: T0 + 60 * MIN });
    assert.equal(result[0].type, ALMUERZO);
    assert.equal(result[1].type, INACTIVIDAD);
});

test('consolidate: evento con end ≤ start se descarta', () => {
    const events = [{ type: INACTIVIDAD, start: T0 + 5 * MIN, end: T0 }];
    const result = consolidateTimeline(events, { defaultEndMs: T0 + 60 * MIN });
    assert.deepEqual(result, []);
});

summarize();
