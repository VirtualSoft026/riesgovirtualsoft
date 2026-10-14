import { createRunner, assert } from '../test-harness.mjs';
import { createShiftActivityController } from '../../controllers/shift-activity-controller.js';

/**
 * Tests unitarios para shift-activity-controller.js.
 *
 * Cubre la migración de:
 *   - `applyIdleStateChange()` de app.js → `onIdleChange(isIdle)`
 *   - `updateActivity()`       de app.js → `onActivity()`
 *
 * Corte: "Detector de inactividad — shift-activity-controller"
 * Relacionado con plan-maestro §4.3, decisión D_SAC-T.
 * Tests: 953 anteriores + los de este archivo = paso 6 completado para este corte.
 */

const { test, summarizeAsync } = createRunner('shift-activity-controller.js');

// ─────────────────────────────────────────────────────────────────────────────
// Fábrica de entorno de prueba
// ─────────────────────────────────────────────────────────────────────────────

function setup({
    user = { uid: 'g1', role: 'Gestor', status: 'Activo' },
    onBreak = false,
    t = 1_000_000,
} = {}) {
    const env = {
        t,
        user: user ? { ...user } : null,
        onBreak,
        timeline: [],
        statusCalls: 0,
        syncCalls: 0,
        statusSets: [],
    };

    env.ctrl = createShiftActivityController({
        getUser: () => env.user,
        isOnBreak: () => env.onBreak,
        setUserStatus: (uid, status) => env.statusSets.push([uid, status]),
        pushTimelineEvent: (type, action) => env.timeline.push([type, action]),
        onStatusDisplay: () => { env.statusCalls += 1; },
        syncSession: () => { env.syncCalls += 1; },
        now: () => env.t,
        logger: { warn: () => {} },
    });

    return env;
}

// ─────────────────────────────────────────────────────────────────────────────
// getLastActivityTimestamp
// ─────────────────────────────────────────────────────────────────────────────

test('getLastActivityTimestamp: devuelve el timestamp inicial (now() al crear)', () => {
    const e = setup({ t: 5_000 });
    assert.equal(e.ctrl.getLastActivityTimestamp(), 5_000);
});

// ─────────────────────────────────────────────────────────────────────────────
// onActivity — siempre actualiza el timestamp
// ─────────────────────────────────────────────────────────────────────────────

test('onActivity: actualiza _lastActivityTimestamp aunque el usuario esté Activo', () => {
    const e = setup({ t: 1_000 });
    e.t = 2_000;
    e.ctrl.onActivity();
    assert.equal(e.ctrl.getLastActivityTimestamp(), 2_000);
    // No modifica estado ni línea de tiempo
    assert.equal(e.timeline.length, 0);
    assert.equal(e.statusCalls, 0);
    assert.equal(e.syncCalls, 0);
});

test('onActivity: actualiza timestamp si no hay usuario (no lanza)', () => {
    const e = setup({ user: null, t: 500 });
    e.t = 1_500;
    e.ctrl.onActivity();
    assert.equal(e.ctrl.getLastActivityTimestamp(), 1_500);
    assert.equal(e.timeline.length, 0);
});

test('onActivity: actualiza timestamp para rol no-Gestor sin cambiar estado', () => {
    const e = setup({ user: { uid: 's1', role: 'Supervisor', status: 'Activo' }, t: 100 });
    e.t = 200;
    e.ctrl.onActivity();
    assert.equal(e.ctrl.getLastActivityTimestamp(), 200);
    assert.equal(e.timeline.length, 0);
    assert.equal(e.statusCalls, 0);
});

test('onActivity: Gestor Inactivo → restaura a Activo con la secuencia completa de app.js', () => {
    const e = setup({ user: { uid: 'g1', role: 'Gestor', status: 'Inactivo' }, t: 1_000 });
    e.t = 2_000;
    e.ctrl.onActivity();

    // El usuario queda Activo en el objeto compartido
    assert.equal(e.user.status, 'Activo');
    // Línea de tiempo: Inactividad end
    assert.deepEqual(e.timeline, [['Inactividad', 'end']]);
    // setUserStatus invocado con el uid correcto
    assert.deepEqual(e.statusSets, [['g1', 'Activo']]);
    // Pantalla y sesión sincronizadas
    assert.equal(e.statusCalls, 1);
    assert.equal(e.syncCalls, 1);
    // Timestamp actualizado
    assert.equal(e.ctrl.getLastActivityTimestamp(), 2_000);
});

test('onActivity: NO verifica isOnBreak() — la pausa no bloquea la restauración a Activo', () => {
    // Contrato original conservado: onActivity siempre puede restaurar Activo
    const e = setup({ user: { uid: 'g1', role: 'Gestor', status: 'Inactivo' }, onBreak: true });
    e.ctrl.onActivity();
    assert.equal(e.user.status, 'Activo');
    assert.deepEqual(e.timeline, [['Inactividad', 'end']]);
});

// ─────────────────────────────────────────────────────────────────────────────
// onIdleChange(true) — marcar Inactivo
// ─────────────────────────────────────────────────────────────────────────────

test('onIdleChange(true): Gestor Activo → pasa a Inactivo con la secuencia de app.js', () => {
    const e = setup({ user: { uid: 'g1', role: 'Gestor', status: 'Activo' } });
    e.ctrl.onIdleChange(true);

    assert.equal(e.user.status, 'Inactivo');
    assert.deepEqual(e.timeline, [['Inactividad', 'start']]);
    assert.deepEqual(e.statusSets, [['g1', 'Inactivo']]);
    assert.equal(e.statusCalls, 1);
    assert.equal(e.syncCalls, 1);
});

test('onIdleChange(true): Gestor ya Inactivo → no actúa (idempotente)', () => {
    const e = setup({ user: { uid: 'g1', role: 'Gestor', status: 'Inactivo' } });
    e.ctrl.onIdleChange(true);

    assert.equal(e.user.status, 'Inactivo');
    assert.equal(e.timeline.length, 0);
    assert.equal(e.statusCalls, 0);
    assert.equal(e.syncCalls, 0);
});

test('onIdleChange(true): sin usuario → no actúa', () => {
    const e = setup({ user: null });
    e.ctrl.onIdleChange(true);
    assert.equal(e.timeline.length, 0);
    assert.equal(e.statusCalls, 0);
});

test('onIdleChange(true): rol no-Gestor → no actúa', () => {
    const e = setup({ user: { uid: 's1', role: 'Supervisor', status: 'Activo' } });
    e.ctrl.onIdleChange(true);
    assert.equal(e.user.status, 'Activo'); // sin cambio
    assert.equal(e.timeline.length, 0);
});

test('onIdleChange(true): guard de pausa — isOnBreak() true → no actúa aunque esté Activo', () => {
    const e = setup({ user: { uid: 'g1', role: 'Gestor', status: 'Activo' }, onBreak: true });
    e.ctrl.onIdleChange(true);

    assert.equal(e.user.status, 'Activo'); // no cambia
    assert.equal(e.timeline.length, 0);
    assert.equal(e.statusCalls, 0);
    assert.equal(e.syncCalls, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// onIdleChange(false) — restaurar Activo
// ─────────────────────────────────────────────────────────────────────────────

test('onIdleChange(false): Gestor Inactivo → restaura a Activo con la secuencia de app.js', () => {
    const e = setup({ user: { uid: 'g1', role: 'Gestor', status: 'Inactivo' }, t: 3_000 });
    e.t = 4_000;
    e.ctrl.onIdleChange(false);

    assert.equal(e.user.status, 'Activo');
    assert.deepEqual(e.timeline, [['Inactividad', 'end']]);
    assert.deepEqual(e.statusSets, [['g1', 'Activo']]);
    assert.equal(e.statusCalls, 1);
    assert.equal(e.syncCalls, 1);
    // _lastActivityTimestamp se actualiza al restaurar
    assert.equal(e.ctrl.getLastActivityTimestamp(), 4_000);
});

test('onIdleChange(false): Gestor ya Activo → no actúa (idempotente)', () => {
    const e = setup({ user: { uid: 'g1', role: 'Gestor', status: 'Activo' } });
    e.ctrl.onIdleChange(false);

    assert.equal(e.user.status, 'Activo');
    assert.equal(e.timeline.length, 0);
    assert.equal(e.statusCalls, 0);
});

test('onIdleChange(false): sin usuario → no actúa', () => {
    const e = setup({ user: null });
    e.ctrl.onIdleChange(false);
    assert.equal(e.timeline.length, 0);
});

test('onIdleChange(false): rol no-Gestor → no actúa', () => {
    const e = setup({ user: { uid: 's1', role: 'Supervisor', status: 'Inactivo' } });
    e.ctrl.onIdleChange(false);
    assert.equal(e.user.status, 'Inactivo'); // sin cambio
    assert.equal(e.timeline.length, 0);
});

test('onIdleChange(false) en pausa: sin efecto, igual que app.js (la pausa bloquea ambas transiciones)', () => {
    // 2026-10-14: corregida la expectativa. applyIdleStateChange() de app.js (líneas 517-537) hace
    // `if (isLunchBreak || isBreakfastBreak || isSplitShiftBreak) return;` ANTES de evaluar la dirección, así que
    // en pausa tampoco restaura a Activo. Coincide con la verificación 1:1 de idle-state-controller (2026-10-13).
    const e = setup({ user: { uid: 'g1', role: 'Gestor', status: 'Inactivo' }, onBreak: true });
    e.ctrl.onIdleChange(false);
    assert.equal(e.user.status, 'Inactivo');
    assert.deepEqual(e.timeline, []);
});

// ─────────────────────────────────────────────────────────────────────────────
// Secuencias combinadas
// ─────────────────────────────────────────────────────────────────────────────

test('ciclo completo: Activo → Inactivo (idle) → Activo (actividad DOM)', () => {
    const e = setup({ user: { uid: 'g1', role: 'Gestor', status: 'Activo' }, t: 1_000 });

    // IdleDetector dispara inactividad
    e.ctrl.onIdleChange(true);
    assert.equal(e.user.status, 'Inactivo');
    assert.deepEqual(e.timeline, [['Inactividad', 'start']]);
    assert.equal(e.syncCalls, 1);

    // Usuario mueve el mouse → onActivity lo restaura
    e.t = 5_000;
    e.ctrl.onActivity();
    assert.equal(e.user.status, 'Activo');
    assert.deepEqual(e.timeline, [['Inactividad', 'start'], ['Inactividad', 'end']]);
    assert.equal(e.syncCalls, 2);
    assert.equal(e.ctrl.getLastActivityTimestamp(), 5_000);
});

test('ciclo completo: Activo → Inactivo (idle) → Activo (IdleDetector recupera actividad)', () => {
    const e = setup({ user: { uid: 'g1', role: 'Gestor', status: 'Activo' }, t: 1_000 });

    e.ctrl.onIdleChange(true);
    assert.equal(e.user.status, 'Inactivo');

    e.t = 8_000;
    e.ctrl.onIdleChange(false);
    assert.equal(e.user.status, 'Activo');
    assert.deepEqual(e.timeline, [['Inactividad', 'start'], ['Inactividad', 'end']]);
    assert.equal(e.statusCalls, 2);
    assert.equal(e.syncCalls, 2);
    assert.equal(e.ctrl.getLastActivityTimestamp(), 8_000);
});

test('pausa activa: idle no marca Inactivo, pero la actividad DOM sí restaura si ya estaba Inactivo', () => {
    const e = setup({ user: { uid: 'g1', role: 'Gestor', status: 'Activo' }, onBreak: true });

    // Durante la pausa, idle se ignora
    e.ctrl.onIdleChange(true);
    assert.equal(e.user.status, 'Activo');
    assert.equal(e.timeline.length, 0);

    // Si por alguna razón el usuario llega en estado Inactivo con pausa activa,
    // la actividad DOM aún puede restaurarlo
    e.user.status = 'Inactivo';
    e.ctrl.onActivity();
    assert.equal(e.user.status, 'Activo');
    assert.deepEqual(e.timeline, [['Inactividad', 'end']]);
});

test('mutación local de user.status: los cambios del controlador se reflejan en el mismo objeto', () => {
    // app.js muta el objeto usuario compartido; el controlador mantiene ese contrato
    const user = { uid: 'g1', role: 'Gestor', status: 'Activo' };
    const e = setup({ user });
    // setup hace {...user}, así que comprobamos con el objeto que nos devuelve e.user
    e.ctrl.onIdleChange(true);
    assert.equal(e.user.status, 'Inactivo');
    e.ctrl.onIdleChange(false);
    assert.equal(e.user.status, 'Activo');
});

await summarizeAsync();
