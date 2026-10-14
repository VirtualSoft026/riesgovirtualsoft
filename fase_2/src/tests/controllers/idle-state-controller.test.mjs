import { createRunner, assert } from '../test-harness.mjs';
import {
    resolveIdleStateChange,
    resolveActivityUpdate,
} from '../../controllers/idle-state-controller.js';

const { test, summarize } = createRunner('idle-state-controller — resolveIdleStateChange / resolveActivityUpdate');

const NOW              = 1_700_000_000_000;
const DOM_THRESHOLD_MS = 5 * 60 * 1000;   // 5 min — mismo que DOM_IDLE_FALLBACK_THRESHOLD_MS

// ── resolveIdleStateChange ────────────────────────────────────────────────────

// Gestores — transición Activo → Inactivo
test('Gestor Activo + isIdle=true → timelineAction=start, status=Inactivo, syncFirebase=true', () => {
    const result = resolveIdleStateChange(true, {
        userRole: 'Gestor', userStatus: 'Activo', isOnBreak: false, now: NOW
    });
    assert.equal(result.timelineAction,   'start');
    assert.equal(result.nextUserStatus,   'Inactivo');
    assert.equal(result.syncFirebase,     true);
});

// Gestores — transición Inactivo → Activo
test('Gestor Inactivo + isIdle=false → timelineAction=end, status=Activo, syncFirebase=true', () => {
    const result = resolveIdleStateChange(false, {
        userRole: 'Gestor', userStatus: 'Inactivo', isOnBreak: false, now: NOW
    });
    assert.equal(result.timelineAction,   'end');
    assert.equal(result.nextUserStatus,   'Activo');
    assert.equal(result.syncFirebase,     true);
});

// Sin efecto — ya estaba en el estado correcto
test('Gestor Activo + isIdle=false → sin efecto (ya activo)', () => {
    const result = resolveIdleStateChange(false, {
        userRole: 'Gestor', userStatus: 'Activo', isOnBreak: false, now: NOW
    });
    assert.equal(result.timelineAction,   null);
    assert.equal(result.nextUserStatus,   null);
    assert.equal(result.syncFirebase,     false);
});

test('Gestor Inactivo + isIdle=true → sin efecto (ya inactivo)', () => {
    const result = resolveIdleStateChange(true, {
        userRole: 'Gestor', userStatus: 'Inactivo', isOnBreak: false, now: NOW
    });
    assert.equal(result.timelineAction,   null);
    assert.equal(result.syncFirebase,     false);
});

// Pausas — el detector se ignora
test('Gestor en pausa + isIdle=true → sin efecto', () => {
    const result = resolveIdleStateChange(true, {
        userRole: 'Gestor', userStatus: 'Activo', isOnBreak: true, now: NOW
    });
    assert.equal(result.timelineAction,   null);
    assert.equal(result.nextUserStatus,   null);
});

test('Gestor en pausa + isIdle=false → sin efecto', () => {
    const result = resolveIdleStateChange(false, {
        userRole: 'Gestor', userStatus: 'Inactivo', isOnBreak: true, now: NOW
    });
    assert.equal(result.timelineAction,   null);
});

// Otros roles
test('Admin + isIdle=true → sin efecto (no es Gestor)', () => {
    const result = resolveIdleStateChange(true, {
        userRole: 'Admin', userStatus: 'Activo', isOnBreak: false, now: NOW
    });
    assert.equal(result.timelineAction,   null);
    assert.equal(result.syncFirebase,     false);
});

test('Supervisor + isIdle=false → sin efecto', () => {
    const result = resolveIdleStateChange(false, {
        userRole: 'Supervisor', userStatus: 'Inactivo', isOnBreak: false, now: NOW
    });
    assert.equal(result.timelineAction,   null);
});

test('userRole undefined → sin efecto', () => {
    const result = resolveIdleStateChange(true, {
        userRole: undefined, userStatus: 'Activo', isOnBreak: false, now: NOW
    });
    assert.equal(result.timelineAction,   null);
});

// ── resolveActivityUpdate ─────────────────────────────────────────────────────

// nextTimestamp siempre se actualiza a now
test('siempre devuelve nextTimestamp=now sin importar el rol', () => {
    const result = resolveActivityUpdate({
        userRole: 'Gestor', userStatus: 'Activo', lastTimestamp: NOW - 1000, now: NOW
    });
    assert.equal(result.nextTimestamp, NOW);
});

// Gestor Inactivo → Activo al detectar actividad
test('Gestor Inactivo → transiciona a Activo con timelineAction=end', () => {
    const result = resolveActivityUpdate({
        userRole: 'Gestor', userStatus: 'Inactivo', lastTimestamp: NOW - 1000, now: NOW
    });
    assert.equal(result.nextUserStatus, 'Activo');
    assert.equal(result.timelineAction, 'end');
    assert.equal(result.syncFirebase,   true);
});

// Gestor Activo con tiempo dentro del umbral → sin transición
test('Gestor Activo dentro del umbral → sin transición (actividad normal)', () => {
    const result = resolveActivityUpdate({
        userRole: 'Gestor',
        userStatus: 'Activo',
        lastTimestamp: NOW - 1000,  // 1 s antes — muy dentro del umbral
        now: NOW,
        idleThresholdMs: DOM_THRESHOLD_MS,
    });
    assert.equal(result.nextUserStatus, null);
    assert.equal(result.timelineAction, null);
    assert.equal(result.syncFirebase,   false);
});

// Gestor Activo pero pasó más tiempo del umbral (browser throttling)
test('Gestor Activo + tiempo > umbral → transiciona a Activo (browser throttling)', () => {
    const result = resolveActivityUpdate({
        userRole: 'Gestor',
        userStatus: 'Activo',
        lastTimestamp: NOW - DOM_THRESHOLD_MS - 1,  // supera el umbral por 1 ms
        now: NOW,
        idleThresholdMs: DOM_THRESHOLD_MS,
    });
    assert.equal(result.nextUserStatus, 'Activo');
    assert.equal(result.timelineAction, 'end');
    assert.equal(result.syncFirebase,   true);
});

// Justo en el borde: tiempo === umbral → NO supera (timeSinceLast > threshold, no ≥)
test('tiempo exactamente igual al umbral → sin transición (borde estricto)', () => {
    const result = resolveActivityUpdate({
        userRole: 'Gestor',
        userStatus: 'Activo',
        lastTimestamp: NOW - DOM_THRESHOLD_MS,  // exactamente igual al umbral
        now: NOW,
        idleThresholdMs: DOM_THRESHOLD_MS,
    });
    assert.equal(result.nextUserStatus, null);
    assert.equal(result.timelineAction, null);
});

// Otros roles
test('Admin → no transiciona (no es Gestor)', () => {
    const result = resolveActivityUpdate({
        userRole: 'Admin', userStatus: 'Inactivo', lastTimestamp: NOW - 1000, now: NOW
    });
    assert.equal(result.nextUserStatus, null);
    assert.equal(result.timelineAction, null);
    assert.equal(result.nextTimestamp,  NOW); // timestamp sí se actualiza
});

test('Supervisor + tiempo > umbral → no transiciona', () => {
    const result = resolveActivityUpdate({
        userRole: 'Supervisor',
        userStatus: 'Activo',
        lastTimestamp: NOW - DOM_THRESHOLD_MS - 5000,
        now: NOW,
        idleThresholdMs: DOM_THRESHOLD_MS,
    });
    assert.equal(result.nextUserStatus, null);
    assert.equal(result.syncFirebase,   false);
});

// idleThresholdMs personalizable
test('umbral personalizado (2 min) → detecta inactividad a los 2 min y 1 ms', () => {
    const result = resolveActivityUpdate({
        userRole: 'Gestor',
        userStatus: 'Activo',
        lastTimestamp: NOW - 2 * 60 * 1000 - 1,
        now: NOW,
        idleThresholdMs: 2 * 60 * 1000,
    });
    assert.equal(result.nextUserStatus, 'Activo');
    assert.equal(result.timelineAction, 'end');
});

summarize();
