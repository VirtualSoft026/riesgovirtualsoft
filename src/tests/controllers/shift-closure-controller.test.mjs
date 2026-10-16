import { createRunner, assert } from '../test-harness.mjs';
import { createShiftClosureController, SHIFT_CLOSE_MESSAGES, SHIFT_CLOSE_EMAIL_ENDPOINT } from '../../controllers/shift-closure-controller.js';

/**
 * Cierre de turno (W-17): `handleEndShift()` con dependencias simuladas. Verifica el ORDEN de las operaciones
 * (guardar antes de limpiar, limpiar antes de cerrar sesión, correo al final), las alertas exactas y las ramas de
 * error. La paridad con app.js se verifica en `cierre-turno-integrado.e2e.cjs`.
 */
const { test, testAsync, summarizeAsync } = createRunner('shift-closure-controller.js (W-17: orden, alertas y ramas de error)');

const LOGIN = Date.UTC(2026, 9, 6, 8, 0, 0);
const NOW = Date.UTC(2026, 9, 6, 17, 0, 0);
const GESTOR = { name: 'Ana Prueba', role: 'Gestor', uid: 'g1', loginTime: new Date(LOGIN).toISOString(), loginLogId: 'LOG1' };

/** Navegador y Firebase simulados. Cada operación se anota en `log`, en orden. */
function makeDeps(over = {}) {
    const log = [];
    const btn = { innerHTML: '<i>Finalizar</i>', disabled: false };
    const setSelect = over.setSelect === undefined ? { value: 'SET1', options: [{ value: 'SET1', disabled: false }, { value: 'Todos', disabled: false }] } : over.setSelect;
    let currentUser = over.currentUser === undefined ? { uid: 'mem', name: 'Mem' } : over.currentUser;
    const deps = {
        log,
        btn,
        get currentUser() { return currentUser; },
        doc: {
            getElementById: (id) => {
                if (over.docThrows === id) throw new Error('dom boom');
                if (id === 'endShiftBtn') return btn;
                if (id === 'activeSetSelect') return setSelect;
                return null;
            }
        },
        confirm: (m) => { log.push(['confirm', m]); return over.confirm !== false; },
        alert: (m) => {
            log.push(['alert', m]);
            if (over.alertThrowsOn && m.startsWith(over.alertThrowsOn)) throw new Error('alert boom');
        },
        redirectToLogin: () => log.push(['redirect']),
        readStoredUserRaw: () => (over.storedUser === undefined ? JSON.stringify(GESTOR) : over.storedUser),
        getUser: () => currentUser,
        clearUser: () => { currentUser = null; log.push(['clearUser']); },
        getTaskCache: () => (over.cache === undefined ? { 1: { status: 'Finalizada', name: 'T1' } } : over.cache),
        getAllTasks: () => (over.allTasks === undefined ? [{ id: 1, Tarea: 'T1' }] : over.allTasks),
        getTimeline: () => over.timeline || [],
        getSplitShiftTotalMs: () => 0,
        shift: {
            closeOpenBreaks: () => { log.push(['closeOpenBreaks']); return []; },
            computeShiftClosure: ({ loginMs, endMs }) => {
                log.push(['computeShiftClosure']);
                return { times: { lunchMinutes: 0, breakfastMinutes: 0, penaltyMins: 0 }, emailFields: [['Horas_Efectivas_Trabajadas', String(((endMs - loginMs) / 3600000).toFixed(2))]] };
            }
        },
        buildTaskReport: () => 'RESUMEN',
        persistShiftClosure: async (uid, loginLogId, obj) => {
            log.push(['persist', uid, loginLogId, Object.keys(obj).sort()]);
            if (over.persistFails) throw Object.assign(new Error('db boom'), { code: 'PERMISSION_DENIED' });
        },
        restoreButton: (b, prev) => { log.push(['restore', prev]); b.innerHTML = prev; b.disabled = false; },
        clearSessionStorage: () => {
            log.push(['clearSessionStorage']);
            if (over.clearThrows) throw new Error('storage boom');
        },
        getAuthUid: () => (over.authUid === undefined ? null : over.authUid),
        signOut: async () => {
            log.push(['signOut']);
            if (over.signOutFails) throw Object.assign(new Error('signout boom'), { code: 'auth/network' });
        },
        appendFormSubmitCc: (fd) => { fd.append('_cc', 'sup@x'); return fd; },
        createFormData: () => new FormData(),
        fetchFn: async (url, init) => {
            log.push(['fetch', url, init.method]);
            if (over.fetchThrows) throw new Error('network down');

            return { ok: over.fetchOk !== false, status: over.fetchStatus === undefined ? 200 : over.fetchStatus };
        },
        now: () => NOW,
        logger: {
            error: (...a) => log.push(['error', ...a.map((x) => (x && x.message !== undefined ? x.message : x))]),
            warn: (...a) => log.push(['warn', ...a.map((x) => (x && typeof x === 'object' ? { status: x.status, message: x.message } : x))])
        }
    };
    return deps;
}

const names = (log) => log.map((e) => e[0]);
const alerts = (log) => log.filter((e) => e[0] === 'alert').map((e) => e[1]);

test('confirmación cancelada: no ocurre nada', () => {
    const d = makeDeps({ confirm: false });
    const c = createShiftClosureController(d);
    return c.handleEndShift().then(() => {
        assert.deepEqual(names(d.log), ['confirm']);
        assert.equal(d.log[0][1], SHIFT_CLOSE_MESSAGES.CONFIRM);
    });
});

testAsync('cierre correcto: orden exacto de operaciones y redirección final', async () => {
    const d = makeDeps();
    await createShiftClosureController(d).handleEndShift();
    assert.deepEqual(names(d.log), [
        'confirm', 'closeOpenBreaks', 'computeShiftClosure', 'persist', 'clearSessionStorage', 'clearUser', 'signOut', 'fetch', 'alert', 'redirect'
    ]);
    assert.equal(d.log.find((e) => e[0] === 'persist')[1], 'g1');
    assert.equal(d.log.find((e) => e[0] === 'persist')[2], 'LOG1');
    assert.equal(alerts(d.log)[0], SHIFT_CLOSE_MESSAGES.DONE_WITH_EMAIL);
    assert.equal(d.log.find((e) => e[0] === 'fetch')[1], SHIFT_CLOSE_EMAIL_ENDPOINT);
});

testAsync('la persistencia ocurre ANTES de limpiar la sesión y el correo nunca va antes del cierre', async () => {
    const d = makeDeps();
    await createShiftClosureController(d).handleEndShift();
    const i = (n) => names(d.log).indexOf(n);
    assert.ok(i('persist') < i('clearSessionStorage'));
    assert.ok(i('clearSessionStorage') < i('signOut'));
    assert.ok(i('persist') < i('fetch'));
});

testAsync('SET obligatorio sin elegir: alerta y sin cerrar pausas ni escribir', async () => {
    const d = makeDeps({ setSelect: { value: 'Todos', options: [{ value: 'SET1', disabled: false }] } });
    await createShiftClosureController(d).handleEndShift();
    assert.deepEqual(alerts(d.log), [SHIFT_CLOSE_MESSAGES.SET_REQUIRED]);
    assert.ok(!names(d.log).includes('closeOpenBreaks') && !names(d.log).includes('persist'));
});

testAsync('tareas sin gestionar (Gestor): alerta con el conteo, sin cambiar el botón', async () => {
    const d = makeDeps({
        allTasks: [{ id: 1, Tarea: 'T1' }, { id: 2, Tarea: 'T2' }],
        cache: { 1: { status: 'En Proceso', name: 'T1' }, 2: { status: 'Finalizada', name: 'T2' } }
    });
    await createShiftClosureController(d).handleEndShift();
    assert.deepEqual(alerts(d.log), [SHIFT_CLOSE_MESSAGES.UNMANAGED_TASKS(1)]);
    assert.equal(d.btn.disabled, false);
    assert.ok(!names(d.log).includes('persist'));
});

testAsync('tarea extra sin gestionar cuenta en la validación', async () => {
    const d = makeDeps({ cache: { 1: { status: 'Finalizada', name: 'T1' }, extra_7: { status: 'Pendiente', name: 'Extra' } } });
    await createShiftClosureController(d).handleEndShift();
    assert.deepEqual(alerts(d.log), [SHIFT_CLOSE_MESSAGES.UNMANAGED_TASKS(1)]);
});

testAsync('Admin no valida tareas: cierra con tareas pendientes', async () => {
    const d = makeDeps({
        currentUser: null,
        storedUser: JSON.stringify({ ...GESTOR, role: 'Admin', uid: 'a1', loginLogId: 'LOG2' }),
        cache: { 1: { status: 'En Proceso', name: 'T1' } }
    });
    await createShiftClosureController(d).handleEndShift();
    assert.equal(alerts(d.log)[0], SHIFT_CLOSE_MESSAGES.DONE_WITH_EMAIL);
    assert.equal(d.log.find((e) => e[0] === 'persist')[1], 'a1');
});

testAsync('sin sesión local: alerta de reporte y botón restaurado', async () => {
    const d = makeDeps({ storedUser: null });
    await createShiftClosureController(d).handleEndShift();
    assert.equal(alerts(d.log)[0], 'No fue posible finalizar el turno: ' + 'No se encontró la sesión local necesaria para generar el reporte.' + '\n\nLa sesión se mantiene activa para que puedas intentar nuevamente.');
    assert.ok(names(d.log).includes('restore'));
    assert.ok(!names(d.log).includes('persist'));
});

testAsync('sesión local corrupta cuenta como ausente (no lanza)', async () => {
    const d = makeDeps({ storedUser: '{roto' });
    await createShiftClosureController(d).handleEndShift();
    assert.ok(alerts(d.log)[0].includes('No se encontró la sesión local'));
});

testAsync('falla al guardar: alerta, botón restaurado, sin limpiar, sin cerrar sesión ni correo', async () => {
    const d = makeDeps({ persistFails: true });
    await createShiftClosureController(d).handleEndShift();
    assert.deepEqual(alerts(d.log), [SHIFT_CLOSE_MESSAGES.SAVE_FAILED]);
    assert.ok(d.log.some((e) => e[0] === 'error' && e[1] === 'CORE_SHIFT_CLOSE_FAILED'));
    for (const n of ['clearSessionStorage', 'clearUser', 'signOut', 'fetch', 'redirect']) {
        assert.ok(!names(d.log).includes(n), `no debe ocurrir ${n}`);
    }
    assert.equal(d.btn.disabled, false);
});

testAsync('cierre guardado; falla cerrar sesión: alerta, redirección y sin correo', async () => {
    const d = makeDeps({ signOutFails: true });
    await createShiftClosureController(d).handleEndShift();
    assert.deepEqual(alerts(d.log), [SHIFT_CLOSE_MESSAGES.SIGNOUT_AFTER_SAVE_FAILED]);
    assert.ok(d.log.some((e) => e[0] === 'error' && e[1] === 'SHIFT_SIGNOUT_FAILED'));
    assert.ok(!names(d.log).includes('fetch'));
    assert.equal(names(d.log).at(-1), 'redirect');
});

testAsync('cierre guardado; correo rechazado (HTTP 500): aviso sin correo y redirección', async () => {
    const d = makeDeps({ fetchOk: false, fetchStatus: 500 });
    await createShiftClosureController(d).handleEndShift();
    assert.equal(alerts(d.log)[0], SHIFT_CLOSE_MESSAGES.DONE_WITHOUT_EMAIL);
    assert.deepEqual(d.log.find((e) => e[0] === 'warn'), ['warn', 'EMAIL_NOTIFICATION_FAILED', { status: 500, message: null }]);
    assert.equal(names(d.log).at(-1), 'redirect');
});

testAsync('cierre guardado; correo con error de red: el cierre no se revierte', async () => {
    const d = makeDeps({ fetchThrows: true });
    await createShiftClosureController(d).handleEndShift();
    assert.equal(alerts(d.log)[0], SHIFT_CLOSE_MESSAGES.DONE_WITHOUT_EMAIL);
    assert.ok(names(d.log).includes('persist') && names(d.log).includes('signOut'));
});

testAsync('error después de guardar (alerta de éxito falla): salida de emergencia con cierre de sesión', async () => {
    const d = makeDeps({ alertThrowsOn: SHIFT_CLOSE_MESSAGES.DONE_WITH_EMAIL.slice(0, 20) });
    await createShiftClosureController(d).handleEndShift();
    assert.equal(names(d.log).filter((n) => n === 'signOut').length, 2);
    assert.ok(alerts(d.log).includes(SHIFT_CLOSE_MESSAGES.EXIT_FAILED_AFTER_SAVE));
    assert.equal(names(d.log).at(-1), 'redirect');
});

testAsync('error de DOM antes de guardar: error fatal, sesión activa y botón restaurado', async () => {
    const d = makeDeps({ docThrows: 'activeSetSelect' });
    await createShiftClosureController(d).handleEndShift();
    assert.ok(alerts(d.log)[0].startsWith('No fue posible finalizar el turno: dom boom'));
    assert.ok(!names(d.log).includes('persist') && !names(d.log).includes('clearUser'));
    assert.ok(names(d.log).includes('restore'));
});

testAsync('uid: el de la sesión local manda; luego la sesión en memoria; luego Firebase', async () => {
    const dLocal = makeDeps({ currentUser: { uid: 'mem' }, authUid: 'auth' });
    await createShiftClosureController(dLocal).handleEndShift();
    assert.equal(dLocal.log.find((e) => e[0] === 'persist')[1], 'g1');

    const noUid = JSON.stringify({ ...GESTOR, uid: undefined });
    const dMem = makeDeps({ storedUser: noUid, currentUser: { uid: 'mem' }, authUid: 'auth' });
    await createShiftClosureController(dMem).handleEndShift();
    assert.equal(dMem.log.find((e) => e[0] === 'persist')[1], 'mem');

    const dAuth = makeDeps({ storedUser: noUid, currentUser: null, authUid: 'auth' });
    await createShiftClosureController(dAuth).handleEndShift();
    assert.equal(dAuth.log.find((e) => e[0] === 'persist')[1], 'auth');
});

testAsync('sin pausas abiertas en la línea de tiempo: el cálculo recibe los minutos del turno', async () => {
    let seen;
    const d = makeDeps();
    d.shift.computeShiftClosure = (input) => { seen = input; return { times: { lunchMinutes: 0, breakfastMinutes: 0, penaltyMins: 0 }, emailFields: [] }; };
    await createShiftClosureController(d).handleEndShift();
    assert.equal(seen.loginMs, LOGIN);
    assert.equal(seen.endMs, NOW);
});

await summarizeAsync();
