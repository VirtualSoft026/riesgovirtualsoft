import { createRunner, assert } from '../test-harness.mjs';
import { createShiftController, BLOCK_MESSAGE, BREAK_STATE_FIELDS } from '../../controllers/shift-controller.js';
import { defaultState } from '../../domain/shifts/shift-calculator.js';
import { BREAK_BUTTON_IDS } from '../../ui/components/break-button.js';

/**
 * Controlador de turno con un "navegador" simulado (botones, localStorage, línea de tiempo, Firebase).
 * Cubre los requisitos del plan maestro §4 bis: RN-1..RN-4 y los puntos 2 y 5 de la deuda.
 */
const { test, testAsync, summarizeAsync } = createRunner('shift-controller.js (RN-1..RN-4, deuda 2/4/5)');

const MIN = 60000;

function fakeButton() {
    const classes = new Set(['btn-outline']);
    return { innerHTML: 'default', style: { display: 'none' }, classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) }, has: (c) => classes.has(c) };
}

function setup({ user = { uid: 'u1', role: 'Gestor', hasSplitShift: true }, state = {}, syncImpl } = {}) {
    const env = {
        t: 1_000_000,
        user: user ? { ...user } : null,
        state: { ...defaultState(), ...state },
        buttons: { toggleBreakfastBtn: fakeButton(), toggleLunchBtn: fakeButton(), toggleSplitShiftBtn: fakeButton() },
        timeline: [], saves: 0, syncs: 0, activity: 0, blocked: [], warnings: [], reloads: 0, sidebar: 0, storageState: null
    };
    env.sync = syncImpl || (() => { env.syncs += 1; return Promise.resolve(); });
    env.controller = createShiftController({
        getUser: () => env.user,
        getState: () => env.state,
        applyState: (fields) => { Object.assign(env.state, fields); },
        reloadState: () => { env.reloads += 1; if (env.storageState) Object.assign(env.state, env.storageState); },
        setUserFlag: (v) => { env.user.hasSplitShift = v; },
        now: () => env.t,
        timeline: { push: (type, action) => env.timeline.push([type, action]) },
        storage: { saveBreakState: () => { env.saves += 1; } },
        sync: () => env.sync(),
        onActivity: () => { env.activity += 1; },
        ui: {
            getButton: (id) => env.buttons[id] || null,
            setSplitShiftVisible: (v) => { env.buttons.toggleSplitShiftBtn.style.display = v ? 'flex' : 'none'; },
            notifyBlocked: (reason, message) => env.blocked.push([reason, message]),
            setSyncWarning: (failed) => env.warnings.push(failed),
            refreshSidebar: () => { env.sidebar += 1; }
        },
        logger: { warn: () => {} }
    });
    return env;
}
const splitBtn = (e) => e.buttons.toggleSplitShiftBtn;

// ---------- RN-1 ----------
test('RN-1: gestor SIN flag no ve el botón (refresh/restore) y pulsarlo no inicia nada', () => {
    for (const hasSplitShift of [undefined, false]) {
        const e = setup({ user: { uid: 'u1', role: 'Gestor', ...(hasSplitShift === undefined ? {} : { hasSplitShift }) } });
        e.controller.restoreOnLoad();
        assert.equal(splitBtn(e).style.display, 'none');
        const r = e.controller.toggleSplitShift();
        assert.equal(r.blocked, true);
        assert.equal(r.blockedReason, 'SPLIT_SHIFT_NOT_ENABLED');
        assert.equal(e.state.isSplitShiftBreak, false);
        assert.deepEqual(e.timeline, []);
        assert.equal(e.saves, 0);
        assert.equal(e.syncs, 0);
        assert.equal(splitBtn(e).style.display, 'none');
        assert.deepEqual(e.blocked[0], ['SPLIT_SHIFT_NOT_ENABLED', BLOCK_MESSAGE.SPLIT_SHIFT_NOT_ENABLED]);
    }
});

test('RN-1: Almuerzo y Desayuno funcionan igual sin flag', () => {
    const e = setup({ user: { uid: 'u1', role: 'Gestor' } });
    assert.equal(e.controller.toggleLunch().action, 'start');
    assert.equal(e.state.isLunchBreak, true);
    e.t += 10 * MIN;
    assert.equal(e.controller.toggleLunch().action, 'end');
    assert.equal(e.state.totalLunchTimeMs, 10 * MIN);
    assert.equal(e.controller.toggleBreakfast().action, 'start');
});

// ---------- RN-2 ----------
test('RN-2: con flag el botón se ve, entra y sale de la pausa; efectos en el orden de app.js', () => {
    const e = setup();
    e.controller.restoreOnLoad();
    assert.equal(splitBtn(e).style.display, 'flex');

    const a = e.controller.toggleSplitShift();
    assert.equal(a.action, 'start');
    assert.equal(e.state.isSplitShiftBreak, true);
    assert.equal(e.state.splitShiftStartTime, 1_000_000);
    assert.deepEqual(e.timeline, [['Pausa de Turno', 'start']]);
    assert.equal(e.saves, 1);
    assert.equal(e.syncs, 1);
    assert.equal(e.activity, 0);
    assert.equal(splitBtn(e).innerHTML, "<i class='bx bx-check-circle'></i> Retomar Turno");
    assert.equal(splitBtn(e).has('btn-outline'), false);

    e.t += 3 * 60 * MIN;
    const b = e.controller.toggleSplitShift();
    assert.equal(b.action, 'end');
    assert.equal(e.state.isSplitShiftBreak, false);
    assert.equal(e.state.totalSplitShiftTimeMs, 180 * MIN);
    assert.deepEqual(e.timeline[1], ['Pausa de Turno', 'end']);
    assert.equal(e.activity, 1);
    assert.equal(e.syncs, 2);
    assert.equal(splitBtn(e).innerHTML, "<i class='bx bx-pause-circle'></i> Pausa de Turno");
    assert.equal(splitBtn(e).has('btn-outline'), true);
});

test('RN-2: no se puede iniciar la pausa con almuerzo/desayuno activo (mensaje original), ni al revés', () => {
    const e = setup({ state: { isLunchBreak: true, lunchStartTime: 1 } });
    const r = e.controller.toggleSplitShift();
    assert.equal(r.blockedReason, 'OTHER_BREAK_ACTIVE');
    assert.equal(e.blocked[0][1], 'Debes volver del descanso actual primero.');
    assert.equal(e.state.isSplitShiftBreak, false);

    const e2 = setup({ state: { isSplitShiftBreak: true, splitShiftStartTime: 1 } });
    assert.equal(e2.controller.toggleLunch().blockedReason, 'OTHER_BREAK_ACTIVE');
    assert.equal(e2.controller.toggleBreakfast().blockedReason, 'OTHER_BREAK_ACTIVE');
});

// ---------- RN-3 ----------
test('RN-3: flag revocado a mitad de la pausa: el botón sigue visible y Retomar funciona', () => {
    const e = setup();
    e.controller.toggleSplitShift();
    const flag = e.controller.handleFlagChange(false);
    assert.equal(flag.changed, true);
    assert.equal(flag.visible, true);
    assert.equal(splitBtn(e).style.display, 'flex');
    e.t += 30 * MIN;
    const r = e.controller.toggleSplitShift();
    assert.equal(r.blocked, false);
    assert.equal(r.action, 'end');
    assert.equal(e.state.totalSplitShiftTimeMs, 30 * MIN);
    assert.equal(splitBtn(e).style.display, 'none'); // ya sin pausa y sin flag: se oculta
});

test('RN-3: recarga con la pausa en curso y sin flag: botón visible con estilo de pausa activa', () => {
    const e = setup({ user: { uid: 'u1', role: 'Gestor', hasSplitShift: false }, state: { isSplitShiftBreak: true, splitShiftStartTime: 5 } });
    e.controller.restoreOnLoad();
    assert.equal(splitBtn(e).style.display, 'flex');
    assert.equal(splitBtn(e).innerHTML, "<i class='bx bx-check-circle'></i> Retomar Turno");
    assert.equal(e.buttons.toggleLunchBtn.innerHTML, 'default'); // solo se pintan las pausas en curso
});

test('flag activado en vivo: el botón aparece y se refresca la barra lateral; mismo valor no hace nada', () => {
    const e = setup({ user: { uid: 'u1', role: 'Gestor', hasSplitShift: false } });
    const a = e.controller.handleFlagChange(true);
    assert.deepEqual(a, { changed: true, visible: true });
    assert.equal(splitBtn(e).style.display, 'flex');
    assert.equal(e.sidebar, 1);
    const b = e.controller.handleFlagChange(true);
    assert.equal(b.changed, false);
    assert.equal(e.sidebar, 1);
    assert.equal(e.controller.handleFlagChange(null).changed, true); // null → false (estricto)
    assert.equal(splitBtn(e).style.display, 'none');
});

test('solo el rol Gestor ve el botón aunque otro rol tenga el flag', () => {
    const e = setup({ user: { uid: 'u9', role: 'Supervisor', hasSplitShift: true } });
    assert.equal(e.controller.refreshSplitShiftButton(), false);
});

// ---------- Deuda punto 2: evento storage ----------
test('storage: otra pestaña inicia la pausa → se recarga el estado y se repintan botones y visibilidad', () => {
    const e = setup({ user: { uid: 'u1', role: 'Gestor', hasSplitShift: false } });
    e.storageState = { isSplitShiftBreak: true, splitShiftStartTime: 77 };
    assert.equal(e.controller.handleStorageChange('riskOps_breakState'), true);
    assert.equal(e.reloads, 1);
    assert.equal(splitBtn(e).innerHTML, "<i class='bx bx-check-circle'></i> Retomar Turno");
    assert.equal(splitBtn(e).style.display, 'flex');
    e.storageState = { isSplitShiftBreak: false, splitShiftStartTime: null };
    e.controller.handleStorageChange('riskOps_breakState');
    assert.equal(splitBtn(e).innerHTML, "<i class='bx bx-pause-circle'></i> Pausa de Turno");
    assert.equal(splitBtn(e).style.display, 'none');
});

test('storage: otras llaves se ignoran', () => {
    const e = setup();
    assert.equal(e.controller.handleStorageChange('riskOps_theme'), false);
    assert.equal(e.reloads, 0);
});

// ---------- Deuda punto 5: fallo de sincronización ----------
testAsync('sincronización fallida: se avisa (setSyncWarning true) sin lanzar y se limpia al recuperarse', async () => {
    let fail = true;
    const e = setup({ syncImpl: () => (fail ? Promise.reject(new Error('offline')) : Promise.resolve()) });
    const r = e.controller.toggleLunch();
    const out = await r.syncPromise;
    assert.equal(out.ok, false);
    assert.deepEqual(e.warnings, [true]);
    assert.equal(e.state.isLunchBreak, true); // el estado local no se revierte; el latido reintenta
    fail = false;
    const r2 = e.controller.toggleLunch();
    assert.equal((await r2.syncPromise).ok, true);
    assert.deepEqual(e.warnings, [true, false]);
});

testAsync('sync que lanza de forma síncrona también se contiene', async () => {
    const e = setup({ syncImpl: () => { throw new Error('boom'); } });
    const out = await e.controller.toggleLunch().syncPromise;
    assert.equal(out.ok, false);
    assert.equal(e.state.isLunchBreak, true);
});

// ---------- Cierre de turno ----------
test('cierre: cierra pausas abiertas (incluida la Pausa de Turno sin flag) y acumula sus tiempos', () => {
    const e = setup({ user: { uid: 'u1', role: 'Gestor', hasSplitShift: false }, state: { isSplitShiftBreak: true, splitShiftStartTime: 1_000_000 } });
    e.t += 120 * MIN;
    const closed = e.controller.closeOpenBreaks();
    assert.deepEqual(closed, ['split']);
    assert.equal(e.state.totalSplitShiftTimeMs, 120 * MIN);
    assert.equal(e.state.isSplitShiftBreak, false);
});

test('cierre: RN-4 con pausa de 180 min el cálculo da 6.50 h y el correo informa la pausa', () => {
    const e = setup({ state: { totalLunchTimeMs: 30 * MIN, totalSplitShiftTimeMs: 180 * MIN } });
    const login = new Date('2026-10-06T08:00:00').getTime();
    const { times, emailFields } = e.controller.computeShiftClosure({ loginMs: login, endMs: login + 600 * MIN, inactivityMins: 0 });
    assert.equal(times.effectiveHours, '6.50');
    const f = Object.fromEntries(emailFields);
    assert.equal(f.Tiempo_Pausa_Turno_Descontado, '180 minutos');
    assert.equal(f.Horas_Efectivas_Trabajadas, '6.50 hrs');
});

test('cierre: sin pausa el correo no trae el campo de pausa y el cálculo es el de siempre (7.50 h)', () => {
    const e = setup({ state: { totalLunchTimeMs: 30 * MIN } });
    const login = new Date('2026-10-06T08:00:00').getTime();
    const { emailFields } = e.controller.computeShiftClosure({ loginMs: login, endMs: login + 480 * MIN, inactivityMins: 0 });
    const f = Object.fromEntries(emailFields);
    assert.equal('Tiempo_Pausa_Turno_Descontado' in f, false);
    assert.equal(f.Horas_Efectivas_Trabajadas, '7.50 hrs');
});

test('flujo completo: pausa de 2 h con flag + cierre = horas efectivas sin esas 2 h', () => {
    const e = setup();
    const login = e.t;
    e.t += 60 * MIN; e.controller.toggleSplitShift();
    e.t += 120 * MIN; e.controller.toggleSplitShift();
    e.t += 180 * MIN;
    const { times } = e.controller.computeShiftClosure({ loginMs: login, endMs: e.t, inactivityMins: 0 });
    assert.equal(times.effectiveHours, '4.00'); // 6 h - 2 h
});

test('cierre D1: resta la inactividad CONSOLIDADA (cleanInactivityMins) y no la penalidad; la penalidad usa la inactividad en vivo', () => {
    // 10 h; almuerzo 75 (exceso 15), desayuno 20 (exceso 5), pausa 120; inactividad en vivo 25 (incluye 15 dentro del almuerzo), consolidada 10
    const e = setup({ state: { totalLunchTimeMs: 75 * MIN, totalBreakfastTimeMs: 20 * MIN, totalSplitShiftTimeMs: 120 * MIN } });
    const login = new Date('2026-10-06T08:00:00').getTime();
    const { times, emailFields } = e.controller.computeShiftClosure({ loginMs: login, endMs: login + 600 * MIN, inactivityMins: 25, cleanInactivityMins: 10 });
    const f = Object.fromEntries(emailFields);
    assert.equal(f.Exceso_Pausas_Penalidad, '45 minutos', 'penalidad informativa: 15 + 5 + 25 (cálculo sin cambios)');
    assert.equal(f.Horas_Efectivas_Trabajadas, '6.25 hrs', '600 - 75 - 20 - 120 - 10 = 375 min');
    assert.equal(times.inactivityDeductedMins, 10);
    // sin cleanInactivityMins se resta la inactividad en vivo
    assert.equal(e.controller.computeShiftClosure({ loginMs: login, endMs: login + 600 * MIN, inactivityMins: 25 }).times.effectiveHours, '6.00');
});

// ---------- Latido ----------
test('latido: describeLiveSession trae estado y campos de la Pausa de Turno', () => {
    const e = setup();
    assert.deepEqual(e.controller.describeLiveSession(false), { status: 'En Línea', splitShiftStartTime: null, totalSplitShiftTimeMs: 0 });
    e.controller.toggleSplitShift();
    assert.deepEqual(e.controller.describeLiveSession(true), { status: 'En Pausa de Turno', splitShiftStartTime: 1_000_000, totalSplitShiftTimeMs: 0 });
});

// ---------- Contrato ----------
test('sin usuario: nada se ejecuta (guarda `if (!currentUser) return` de app.js)', () => {
    const e = setup({ user: null });
    const r = e.controller.toggleLunch();
    assert.equal(r.blocked, true);
    assert.equal(e.saves, 0);
    assert.equal(e.syncs, 0);
});

test('applyState solo recibe los 9 campos de pausas (no la línea de tiempo)', () => {
    const e = setup({ state: { shiftTimeline: [{ type: 'x' }] } });
    let received = null;
    const c = createShiftController({
        getUser: () => e.user, getState: () => e.state, applyState: (f) => { received = f; }, now: () => 5,
        timeline: { push() {} }, storage: { saveBreakState() {} }, sync: () => undefined,
        ui: { getButton: () => null, setSplitShiftVisible() {} }
    });
    c.toggleLunch();
    assert.deepEqual(Object.keys(received).sort(), [...BREAK_STATE_FIELDS].sort());
});

test('los IDs de botón usados son los de index.html', () => {
    const e = setup();
    const seen = [];
    const c = createShiftController({
        getUser: () => e.user, getState: () => e.state, applyState() {}, now: () => 5,
        timeline: { push() {} }, storage: { saveBreakState() {} }, sync: () => undefined,
        ui: { getButton: (id) => { seen.push(id); return null; }, setSplitShiftVisible() {} }
    });
    c.toggleLunch(); c.toggleBreakfast(); c.toggleSplitShift();
    assert.deepEqual(seen.filter((v, i) => seen.indexOf(v) === i).sort(), Object.values(BREAK_BUTTON_IDS).sort());
});

await summarizeAsync();
