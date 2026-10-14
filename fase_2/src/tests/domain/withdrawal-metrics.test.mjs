import { createRunner, assert } from '../test-harness.mjs';
import { calculateEffectiveApprovalTime } from '../../domain/analytics/withdrawal-metrics.js';

/**
 * Prueba diferencial: calculateEffectiveApprovalTime() ya estaba migrada (sin prueba).
 * Se compara contra una copia LITERAL del algoritmo original para verificar equivalencia.
 *
 * Algoritmo: inicio de cálculo = MAX(creación, inicio de turno).
 * Resultado = (aprobación − inicio_cálculo) / 60 000, redondeado a 2 decimales, mínimo 0.
 */
const { test, summarize } = createRunner('withdrawal-metrics — calculateEffectiveApprovalTime');

// ── Copia LITERAL del algoritmo original para pruebas diferenciales ──────────
function legacyEffectiveApprovalTime(creacionTime, aprobacionTime, inicioTurnoTime) {
    if (!aprobacionTime) {
        return 0;
    }
    const creacionMs = new Date(creacionTime).getTime();
    const aprobacionMs = new Date(aprobacionTime).getTime();
    let inicioTurnoMs = inicioTurnoTime ? new Date(inicioTurnoTime).getTime() : 0;
    if (isNaN(creacionMs) || isNaN(aprobacionMs)) {
        return 0;
    }
    if (isNaN(inicioTurnoMs)) {
        inicioTurnoMs = 0;
    }
    const horaInicioCalculoMs = Math.max(creacionMs, inicioTurnoMs);
    const diffMins = (aprobacionMs - horaInicioCalculoMs) / 60000;
    return Math.max(0, Math.round(diffMins * 100) / 100);
}

// Generador pseudoaleatorio determinista (LCG) — mismo patrón que shift-closure-calculations.test.mjs
function makeRng(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}

const MIN = 60_000;                    // ms en un minuto
const BASE_MS = 1_700_000_000_000;    // 2023-11-14T22:13:20Z — base fija para casos fijos

// ── Guard clauses ─────────────────────────────────────────────────────────────

test('devuelve 0 cuando aprobacionTime es null', () => {
    assert.equal(calculateEffectiveApprovalTime(new Date(BASE_MS), null, null), 0);
});

test('devuelve 0 cuando aprobacionTime es undefined', () => {
    assert.equal(calculateEffectiveApprovalTime(new Date(BASE_MS), undefined, null), 0);
});

test('devuelve 0 cuando aprobacionTime es 0 (falsy)', () => {
    assert.equal(calculateEffectiveApprovalTime(new Date(BASE_MS), 0, null), 0);
});

test('devuelve 0 cuando aprobacionTime es string vacío', () => {
    assert.equal(calculateEffectiveApprovalTime(new Date(BASE_MS), '', null), 0);
});

test('devuelve 0 cuando creacionTime es fecha inválida', () => {
    assert.equal(
        calculateEffectiveApprovalTime('no-es-fecha', new Date(BASE_MS + 30 * MIN), null),
        0
    );
});

test('devuelve 0 cuando aprobacionTime es fecha inválida', () => {
    assert.equal(
        calculateEffectiveApprovalTime(new Date(BASE_MS), 'no-es-fecha', null),
        0
    );
});

// ── inicioTurnoTime inválido o ausente se trata como 0 (inicio de época) ─────

test('inicioTurnoTime inválida se trata como 0 — la creación gana como inicio de cálculo', () => {
    // inicioTurnoMs = 0 → horaInicio = MAX(BASE_MS, 0) = BASE_MS → diff = 30 min
    const r = calculateEffectiveApprovalTime(
        new Date(BASE_MS),
        new Date(BASE_MS + 30 * MIN),
        'fecha-invalida',
    );
    assert.equal(r, 30);
});

test('inicioTurnoTime null se trata como 0 — sin ajuste SLA', () => {
    const r = calculateEffectiveApprovalTime(
        new Date(BASE_MS),
        new Date(BASE_MS + 45 * MIN),
        null,
    );
    assert.equal(r, 45);
});

// ── Ajuste SLA: inicio de cálculo = MAX(creación, inicio de turno) ────────────

test('caso fijo: turno posterior a creación — el turno es el inicio de cálculo', () => {
    // creación: BASE_MS, turno: BASE_MS+10m, aprobación: BASE_MS+40m → diff = 30 min
    const r = calculateEffectiveApprovalTime(
        new Date(BASE_MS),
        new Date(BASE_MS + 40 * MIN),
        new Date(BASE_MS + 10 * MIN),
    );
    assert.equal(r, 30);
});

test('caso fijo: turno anterior a creación — la creación es el inicio de cálculo', () => {
    // creación: BASE_MS+20m, turno: BASE_MS, aprobación: BASE_MS+50m → diff = 30 min
    const r = calculateEffectiveApprovalTime(
        new Date(BASE_MS + 20 * MIN),
        new Date(BASE_MS + 50 * MIN),
        new Date(BASE_MS),
    );
    assert.equal(r, 30);
});

test('turno y creación simultáneos: diff = tiempo hasta aprobación', () => {
    const r = calculateEffectiveApprovalTime(
        new Date(BASE_MS),
        new Date(BASE_MS + 20 * MIN),
        new Date(BASE_MS),
    );
    assert.equal(r, 20);
});

// ── Piso en 0 ─────────────────────────────────────────────────────────────────

test('piso en 0: aprobación anterior a creación devuelve 0', () => {
    const r = calculateEffectiveApprovalTime(
        new Date(BASE_MS),
        new Date(BASE_MS - 5 * MIN),
        null,
    );
    assert.equal(r, 0);
});

test('piso en 0: aprobación anterior al inicio de turno devuelve 0', () => {
    // turno: BASE_MS+10m, aprobación: BASE_MS+5m → diff negativo → 0
    const r = calculateEffectiveApprovalTime(
        new Date(BASE_MS),
        new Date(BASE_MS + 5 * MIN),
        new Date(BASE_MS + 10 * MIN),
    );
    assert.equal(r, 0);
});

// ── Redondeo a 2 decimales ────────────────────────────────────────────────────

test('redondeo: 30 min + 20 s = 30.3333... → 30.33', () => {
    // Math.round(30.3333 * 100) / 100 = Math.round(3033.33) / 100 = 3033/100 = 30.33
    const r = calculateEffectiveApprovalTime(
        new Date(BASE_MS),
        new Date(BASE_MS + 30 * MIN + 20_000),
        null,
    );
    assert.equal(r, 30.33);
});

test('redondeo: 30 min + 30 s = 30.5 → 30.5 (exacto)', () => {
    const r = calculateEffectiveApprovalTime(
        new Date(BASE_MS),
        new Date(BASE_MS + 30 * MIN + 30_000),
        null,
    );
    assert.equal(r, 30.5);
});

test('redondeo: 0 min + 1 s = 0.0166... → 0.02', () => {
    const r = calculateEffectiveApprovalTime(
        new Date(BASE_MS),
        new Date(BASE_MS + 1_000),
        null,
    );
    assert.equal(r, 0.02);
});

// ── Polimorfismo de tipos de entrada ─────────────────────────────────────────

test('acepta timestamps como números (ms desde época)', () => {
    const r = calculateEffectiveApprovalTime(BASE_MS, BASE_MS + 60 * MIN, null);
    assert.equal(r, 60);
});

test('acepta strings ISO 8601', () => {
    const r = calculateEffectiveApprovalTime(
        new Date(BASE_MS).toISOString(),
        new Date(BASE_MS + 15 * MIN).toISOString(),
        null,
    );
    assert.equal(r, 15);
});

test('acepta objetos Date en los tres parámetros', () => {
    const r = calculateEffectiveApprovalTime(
        new Date(BASE_MS + 5 * MIN),
        new Date(BASE_MS + 65 * MIN),
        new Date(BASE_MS),
    );
    // horaInicio = MAX(BASE_MS+5m, BASE_MS) = BASE_MS+5m → diff = 60 min
    assert.equal(r, 60);
});

// ── Prueba diferencial (200 combinaciones aleatorias deterministas) ───────────

test('coincide con el algoritmo original en 200 combinaciones aleatorias', () => {
    const rng = makeRng(1337);
    for (let i = 0; i < 200; i += 1) {
        const creacionMs = BASE_MS + Math.floor(rng() * 8 * 60 * MIN);
        const deltaAprobacion = Math.floor(rng() * 120 * MIN) - 10 * MIN;
        const aprobacionMs = creacionMs + deltaAprobacion;
        const hasTurno = rng() > 0.3;
        const deltaTurno = Math.floor(rng() * 90 * MIN) - 30 * MIN;
        const inicioTurnoMs = hasTurno ? creacionMs + deltaTurno : null;

        // Variedad de tipos de entrada para mayor cobertura
        const creacion = i % 3 === 0 ? creacionMs : new Date(creacionMs);
        const aprobacion = rng() > 0.1
            ? (i % 3 === 1 ? aprobacionMs : new Date(aprobacionMs))
            : null;
        const inicioTurno = inicioTurnoMs !== null
            ? (i % 3 === 2 ? inicioTurnoMs : new Date(inicioTurnoMs))
            : null;

        assert.equal(
            calculateEffectiveApprovalTime(creacion, aprobacion, inicioTurno),
            legacyEffectiveApprovalTime(creacion, aprobacion, inicioTurno),
        );
    }
});

summarize();
