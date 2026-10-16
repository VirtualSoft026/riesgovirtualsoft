/**
 * Cierre de turno (W-17, paso 3.2): paridad de `handleEndShift()` entre el app.js INTEGRADO y dos oráculos.
 *
 *  - ORÁCULO EXACTO (`--oracle`, el app.js integrado justo antes de mover el cierre a
 *    `src/controllers/shift-closure-controller.js`): toda la observación debe ser idéntica, en el mismo orden:
 *    confirmaciones, alertas, errores y advertencias de consola, lecturas/escrituras a Firebase con su carga,
 *    `localStorage`, llamadas a `fetch` con sus campos del correo, cierre de sesión, redirección y estado del botón.
 *  - ORIGINAL PRE-INTEGRACIÓN (`--legacy`, fase_2/lab/referencia/app.pre-integracion.js): se compara el FLUJO
 *    (alertas, confirmaciones, consola, redirección, cierre de sesión, llamadas a fetch y rutas escritas). Diferencias
 *    DECLARADAS y excluidas: (1) horas y campos de tiempo, decisión D1 (cierre-horas-efectivas.e2e.cjs); (2) la
 *    limpieza de `localStorage` incluye `riskOps_usersData` desde el paso 3.1 (se compara solo la intersección con
 *    las cuatro claves del original).
 *
 * Los escenarios sin pausas abiertas se comparan contra el original pre-integración; los que cierran pausas
 * (toggles legados) solo contra el oráculo exacto.
 *
 * Uso: node cierre-turno-integrado.e2e.cjs <app.js integrado> --riskops <bundle.js> --oracle <app.before-w17.js> --legacy <app.pre-integracion.js>
 */
const fs = require('fs');
const vm = require('vm');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const APP = args.find((a) => !a.startsWith('--') && a.endsWith('.js') && a !== opt('--riskops') && a !== opt('--oracle') && a !== opt('--legacy'));
const BUNDLE_PATH = opt('--riskops');
const ORACLE_PATH = opt('--oracle');
const LEGACY_PATH = opt('--legacy');
if (!APP || !BUNDLE_PATH || !ORACLE_PATH || !LEGACY_PATH) {
    console.error('Uso: node cierre-turno-integrado.e2e.cjs <app.js> --riskops <bundle.js> --oracle <app.before-w17.js> --legacy <app.pre-integracion.js>');
    process.exit(2);
}
const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const SRC = read(APP);
const ORACLE = read(ORACLE_PATH);
const LEGACY = read(LEGACY_PATH);
const BUNDLE = fs.readFileSync(BUNDLE_PATH, 'utf8');

// ------------------------------------------------------------------ extracción de código real
function fn(src, header) {
    const s = src.indexOf(header);
    if (s < 0) throw new Error('No se encontró: ' + header);
    return src.slice(s, src.indexOf('\n}\n', s) + 3);
}
function optFn(src, header) { return src.indexOf(header) >= 0 ? fn(src, header) : ''; }
function line(src, prefix) {
    const s = src.indexOf(prefix);
    if (s < 0) return '';
    return src.slice(s, src.indexOf('\n', s) + 1);
}

// Helpers comunes (copias reales de app.js): escritura de la bitácora, nombres de tareas y cierre de SET.
function helpersFor(src, { legacy }) {
    const common = [
        optFn(src, 'function appendFormSubmitCc('),
        optFn(src, 'function buildTaskReportSummaryText('),
        optFn(src, 'function canonicalTaskId('),
        line(src, 'const RISKOPS_SESSION_STORAGE_KEYS'),
        optFn(src, 'function clearRiskOpsSessionStorage('),
    ];
    if (legacy) {
        return [
            line(src, 'const FORM_SUBMIT_CC'),
            optFn(src, 'function resolveTaskDisplayName('),
            ...common,
            optFn(src, 'function hasRealSetOptions('),
            optFn(src, 'function requiresSpecificSetSelection('),
            optFn(src, 'function restoreEndShiftButton('),
            optFn(src, 'async function persistShiftClosureCore('),
        ].join('\n');
    }
    return [
        ...common,
        optFn(src, 'function hasRealSetOptions('),
        optFn(src, 'function requiresSpecificSetSelection('),
        optFn(src, 'function restoreEndShiftButton('),
        optFn(src, 'async function persistShiftClosureCore('),
    ].join('\n');
}

/**
 * Cierre de dependencias (top-level) desde `seeds` dentro de `src`: funciones y constantes `const` de una
 * línea que el código incluido referencia por nombre (el estado `let` lo aporta el escenario). Solo para el original pre-integración, cuyas funciones
 * auxiliares son inline y no tienen envoltorio.
 */
function dependencyClosure(src, seeds) {
    const decl = new Map();
    const re = /^(?:async function|function|let|const|var) +([A-Za-z_$][\w$]*)/gm;
    let m;
    while ((m = re.exec(src)) !== null) {
        if (/^(?:let|var)/.test(m[0])) continue; // el estado global lo aporta el escenario, no el archivo
        const start = m.index;
        const isFn = /^(?:async )?function/.test(m[0]) || /^(?:async )?function/.test(src.slice(start, start + 40));
        const end = isFn ? src.indexOf('\n}\n', start) + 3 : src.indexOf('\n', start) + 1;
        if (!decl.has(m[1])) decl.set(m[1], src.slice(start, end));
    }
    const included = new Set();
    const queue = [...seeds];
    while (queue.length) {
        const name = queue.shift();
        if (included.has(name) || !decl.has(name)) continue;
        included.add(name);
        const code = decl.get(name);
        for (const other of decl.keys()) {
            if (!included.has(other) && new RegExp('\\b' + other.replace(/\$/g, '\\$') + '\\b').test(code)) queue.push(other);
        }
    }
    return [...included].map((n) => decl.get(n)).join('\n');
}

/** Código del cierre según la versión: el oráculo (cuerpo completo) o el integrado (envoltorio + __shiftClosure). */
function closureCode(src) {
    if (src.includes('let __labShiftClosure = null;')) {
        const wrapperLine = 'async function handleEndShift() { return __shiftClosure().handleEndShift(); }';
        const s = src.indexOf('let __labShiftClosure = null;');
        const e = src.indexOf(wrapperLine, s) + wrapperLine.length + 1;
        return src.slice(s, e);
    }
    return fn(src, 'async function handleEndShift() {');
}

/** `__shiftController` real (bundle) con el mismo cableado que app.js; los identificadores de pausas son globales. */
const SHIFT_CONTROLLER = (src) => optFn(src, 'function __shiftController() {').length
    ? 'let __labShiftController = null;\n' + fn(src, 'function __shiftController() {')
    : '';

// ------------------------------------------------------------------ entorno simulado
const NOW = Date.UTC(2026, 9, 6, 17, 0, 0);
const LOGIN = Date.UTC(2026, 9, 6, 8, 0, 0);
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

function errText(e) { return e && e.message ? e.message : String(e); }

function buildWorld(src, sc, { legacy }) {
    const rec = [];
    const storage = new Map();
    const storedUser = sc.storedUser === undefined ? sc.user : sc.storedUser;
    if (storedUser !== null && storedUser !== undefined) storage.set('riskOps_currentUser', typeof storedUser === 'string' ? storedUser : JSON.stringify(storedUser));
    if (sc.storedUser === null) storage.delete('riskOps_currentUser');
    Object.entries(sc.storage || {}).forEach(([k, v]) => storage.set(k, v));

    const style = () => ({});
    const elements = {
        endShiftBtn: { id: 'endShiftBtn', innerHTML: '<i class="bx bx-log-out-circle"></i> Finalizar Turno', disabled: false, style: style() },
        activeSetSelect: sc.set ? { id: 'activeSetSelect', value: sc.set.value, options: sc.set.options.map((o) => ({ value: o.value, disabled: !!o.disabled })), style: style() } : null,
        toggleSplitShiftBtn: { id: 'toggleSplitShiftBtn', style: style(), innerHTML: '' }
    };

    const ctx = {
        console: {
            error: (...a) => rec.push(['console.error', ...a.map((x) => (x && x.message !== undefined ? { message: x.message, code: x.code } : (x && typeof x === 'object' ? clone(x) : x)))]),
            warn: (...a) => rec.push(['console.warn', ...a.map((x) => (x && typeof x === 'object' ? clone(x) : x))]),
            log: (...a) => rec.push(['console.log', ...a.map(String)])
        },
        alert: (m) => {
            rec.push(['alert', m]);
            if (sc.alertThrowsOn && m.startsWith(sc.alertThrowsOn)) throw new Error('alert boom');
        },
        confirm: (m) => { rec.push(['confirm', m]); return sc.confirmAnswer !== false; },
        document: {
            getElementById: (id) => {
                if (sc.docThrowsOn === id) throw new Error('dom boom');
                return elements[id] || null;
            }
        },
        localStorage: {
            getItem: (k) => (storage.has(k) ? storage.get(k) : null),
            setItem: (k, v) => { rec.push(['storage.set', k]); storage.set(k, String(v)); },
            removeItem: (k) => { rec.push(['storage.remove', k]); storage.delete(k); }
        },
        firebase: {
            auth: () => ({
                currentUser: sc.authUid === undefined ? null : { uid: sc.authUid },
                signOut: () => {
                    rec.push(['signOut']);
                    return sc.signOutFail ? Promise.reject(Object.assign(new Error('signout boom'), { code: 'auth/network' })) : Promise.resolve();
                }
            }),
            database: { ServerValue: { TIMESTAMP: 'TS' } }
        },
        database: {
            ref: (p) => {
                const path = p || '';
                return {
                    key: 'PUSH1',
                    push() { rec.push(['db.push', path]); return { key: 'PUSH1' }; },
                    update(obj) {
                        rec.push(['db.update', path, clone(obj)]);
                        return sc.persistFail ? Promise.reject(Object.assign(new Error('db boom'), { code: 'PERMISSION_DENIED' })) : Promise.resolve();
                    },
                    set(v) { rec.push(['db.set', path, clone(v)]); return Promise.resolve(); },
                    remove() { rec.push(['db.remove', path]); return Promise.resolve(); }
                };
            }
        },
        window: { location: { href: '' } },
        fetch: async (url, init) => {
            rec.push(['fetch', url, init.method, init.headers, Array.from(init.body.entries())]);
            if (sc.fetchThrows) throw new Error('network down');

            return { ok: sc.fetchOk !== false, status: sc.fetchStatus === undefined ? 200 : sc.fetchStatus };
        },
        FormData,
        Date: class extends Date {
            constructor(...a) { if (a.length) super(...a); else super(NOW); }
            static now() { return NOW; }
        },
        Math, JSON, Object, Array, Promise, Set, Map, Number, String, Boolean, RegExp, Error, parseFloat, parseInt, Symbol,
        // Estado global de app.js
        currentUser: sc.currentUser === undefined ? null : clone(sc.currentUser),
        taskStateCache: clone(sc.cache === undefined ? {} : sc.cache),
        allTasks: clone(sc.allTasks === undefined ? [] : sc.allTasks),
        shiftTimeline: clone(sc.timeline === undefined ? [] : sc.timeline),
        totalSplitShiftTimeMs: sc.splitMs || 0,
        totalLunchTimeMs: sc.lunchMs || 0, totalBreakfastTimeMs: 0,
        isLunchBreak: !!sc.lunchOpen, lunchStartTime: sc.lunchOpen ? LOGIN + 2 * 3600000 : null,
        isBreakfastBreak: false, breakfastStartTime: null,
        isSplitShiftBreak: !!sc.splitOpen, splitShiftStartTime: sc.splitOpen ? LOGIN + 3 * 3600000 : null,
        localStatus: 'En Línea', lastSyncLoopTimestamp: 0, globalIdleState: false,
        // Stubs de funciones de app.js fuera del cierre (solo registran)
        pushTimelineEvent: (type, action) => rec.push(['timeline', type, action]),
        saveBreakState: () => rec.push(['saveBreakState']),
        loadBreakState: () => {},
        syncActiveSessionToFirebase: () => Promise.resolve(),
        updateActivity: () => {},
        setupSidebar: () => {},
        __labSetSyncWarning: () => {},
        currentAllTasksOrNull: () => null,
        warnUnresolvedTaskName: () => {},
        toggleLunchBreak: () => rec.push(['toggle', 'lunch']),
        toggleBreakfastBreak: () => rec.push(['toggle', 'breakfast']),
        toggleSplitShiftBreak: () => rec.push(['toggle', 'split']),
        __rec: rec
    };
    vm.createContext(ctx);
    vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);

    const code = legacy
        ? dependencyClosure(src, ['handleEndShift'])
        : [helpersFor(src, { legacy: false }), SHIFT_CONTROLLER(src), closureCode(src)].join('\n');
    vm.runInContext(code, ctx);
    return { ctx, rec, elements, storage };
}

/** Ejecuta `handleEndShift()` y devuelve la observación completa del escenario. */
async function observe(src, sc, opts) {
    const w = buildWorld(src, sc, opts);
    try {
        await vm.runInContext('handleEndShift()', w.ctx);
    } catch (e) {
        w.rec.push(['unhandled', errText(e)]);
    }
    await new Promise((r) => setImmediate(r));
    return {
        rec: w.rec,
        href: w.ctx.window.location.href,
        currentUser: w.ctx.currentUser,
        btn: { innerHTML: w.elements.endShiftBtn.innerHTML, disabled: w.elements.endShiftBtn.disabled },
        storage: [...w.storage.keys()].sort()
    };
}

// ------------------------------------------------------------------ escenarios
const GESTOR = { name: 'Ana Prueba', role: 'Gestor', uid: 'g1', loginTime: new Date(LOGIN).toISOString(), loginLogId: 'LOG1' };
const ADMIN = { name: 'Admin Prueba', role: 'Admin', uid: 'a1', loginTime: new Date(LOGIN).toISOString(), loginLogId: 'LOG2' };
const ALL_OK = {
    allTasks: [{ id: 1, Tarea: 'T1', Set: 'SET1' }, { id: 2, Tarea: 'T2', Set: 'SET1' }],
    cache: { 1: { status: 'Finalizada', name: 'T1' }, 2: { status: 'No Realizada', name: 'T2' } }
};
const SET_OK = { options: [{ value: 'SET1' }, { value: 'Todos' }], value: 'SET1' };
const TIMELINE = [
    { type: 'Inactividad', start: LOGIN + 1 * 3600000, end: LOGIN + 1 * 3600000 + 45 * 60000 },
    { type: 'Almuerzo', start: LOGIN + 4 * 3600000, end: LOGIN + 4 * 3600000 + 30 * 60000 },
    { type: 'Inactividad', start: LOGIN + 4 * 3600000 + 5 * 60000, end: LOGIN + 4 * 3600000 + 10 * 60000 }
];

const SCENARIOS = [
    { id: 'C1', name: 'cierre correcto con correo entregado', user: GESTOR, ...ALL_OK, set: SET_OK, timeline: TIMELINE, legacy: true },
    { id: 'C2', name: 'cierre guardado; correo rechazado (HTTP 500)', user: GESTOR, ...ALL_OK, set: SET_OK, fetchOk: false, fetchStatus: 500, legacy: true },
    { id: 'C3', name: 'cierre guardado; correo con error de red', user: GESTOR, ...ALL_OK, set: SET_OK, fetchThrows: true, legacy: true },
    { id: 'C4', name: 'confirmación cancelada: no ocurre nada', user: GESTOR, ...ALL_OK, set: SET_OK, confirmAnswer: false, legacy: true },
    { id: 'C5', name: 'sin sesión local: alerta y botón restaurado', user: GESTOR, storedUser: null, ...ALL_OK, set: SET_OK, legacy: true },
    { id: 'C6', name: 'sesión local corrupta: cuenta como ausente', user: GESTOR, storedUser: '{no-json', ...ALL_OK, set: SET_OK, legacy: true },
    { id: 'C7', name: 'SET obligatorio sin elegir', user: GESTOR, ...ALL_OK, set: { options: [{ value: 'SET1' }], value: 'Todos' }, legacy: true },
    { id: 'C8', name: 'tareas sin gestionar (Gestor): se bloquea con el conteo', user: GESTOR, allTasks: ALL_OK.allTasks, cache: { 1: { status: 'En Proceso', name: 'T1' }, 2: { status: 'Finalizada', name: 'T2' } }, set: SET_OK, legacy: true },
    { id: 'C9', name: 'tarea extra sin gestionar cuenta en la validación', user: GESTOR, ...ALL_OK, cache: { ...ALL_OK.cache, extra_9: { status: 'Pendiente', name: 'Extra' } }, set: SET_OK, legacy: true },
    { id: 'C10', name: 'Admin no valida tareas: cierra con tareas pendientes', user: ADMIN, allTasks: ALL_OK.allTasks, cache: { 1: { status: 'En Proceso', name: 'T1' } }, set: null, legacy: true },
    { id: 'C11', name: 'falla al guardar: alerta, botón restaurado y sin correo', user: GESTOR, ...ALL_OK, set: SET_OK, persistFail: true, legacy: true },
    { id: 'C12', name: 'guardado; falla el cierre de sesión: redirección sin correo', user: GESTOR, ...ALL_OK, set: SET_OK, signOutFail: true, legacy: true },
    { id: 'C13', name: 'uid de respaldo: sesión en memoria', user: { ...GESTOR, uid: undefined }, currentUser: { ...GESTOR, uid: 'mem9' }, ...ALL_OK, set: SET_OK, legacy: true },
    { id: 'C14', name: 'uid de respaldo: sesión de Firebase', user: { ...GESTOR, uid: undefined }, currentUser: null, authUid: 'auth7', ...ALL_OK, set: SET_OK, legacy: true },
    { id: 'C15', name: 'error de DOM antes de guardar: error fatal con sesión activa', user: GESTOR, ...ALL_OK, docThrowsOn: 'activeSetSelect', legacy: true },
    { id: 'C16', name: 'alerta de éxito falla después de guardar: salida de emergencia', user: GESTOR, ...ALL_OK, set: SET_OK, alertThrowsOn: 'Turno finalizado correctamente y', legacy: false },
    { id: 'C17', name: 'pausas abiertas: se cierran antes de calcular', user: GESTOR, ...ALL_OK, set: SET_OK, lunchOpen: true, splitOpen: true, splitMs: 0, timeline: TIMELINE, legacy: false },
    { id: 'C18', name: 'sin pausas, con almuerzo acumulado', user: GESTOR, ...ALL_OK, set: SET_OK, lunchMs: 30 * 60000, timeline: TIMELINE, legacy: true }
];

// Campos del flujo comparables con el original pre-integración (excluye horas, D1, y el contenido de la base).
function flowOf(o) {
    const pick = (r) => r;
    const writes = o.rec.filter((r) => r[0] === 'db.update').map((r) => ['db.update', r[1], Object.keys(r[2]).sort()]);
    const fetches = o.rec.filter((r) => r[0] === 'fetch').map((r) => ['fetch', r[1], r[2], r[3]]);
    const storageRemoved = o.rec.filter((r) => r[0] === 'storage.remove').map((r) => r[1]).filter((k) => ['riskOps_currentUser', 'riskOps_cache', 'riskOps_breakState', 'riskOps_timeline'].includes(k));
    const rest = o.rec.filter((r) => !['db.update', 'fetch', 'storage.remove', 'db.push', 'db.set', 'db.remove', 'timeline', 'saveBreakState'].includes(r[0])).map(pick);
    return { rest, writes, fetches, storageRemoved, href: o.href, btn: o.btn, currentUser: o.currentUser };
}

const tests = [];
const T = (id, name, fnTest) => tests.push({ id, name, run: fnTest });
const eq = (a, b, m) => { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error(`${m || 'distinto'}\n    oráculo:  ${y}\n    integrado: ${x}`); };
const ok = (c, m) => { if (!c) throw new Error(m || 'falso'); };

(async () => {
    console.log('=== CIERRE DE TURNO (W-17) — PARIDAD INTEGRADO vs ORÁCULOS ===');
    console.log(`app.js: ${APP} | oráculo exacto: ${ORACLE_PATH} | original pre-integración: ${LEGACY_PATH} | ${new Date().toISOString()}`);
    let pass = 0, fail = 0;
    const report = (passed, name, detail) => {
        if (passed) { pass++; console.log(`  [PASS] ${name}`); } else { fail++; console.log(`  [FAIL] ${name}\n         -> ${detail}`); }
    };

    for (const sc of SCENARIOS) {
        // 1) Oráculo exacto: observación completa idéntica.
        try {
            const integrated = await observe(SRC, sc, { legacy: false });
            const oracle = await observe(ORACLE, sc, { legacy: false });
            const same = JSON.stringify(integrated) === JSON.stringify(oracle);
            report(same, `${sc.id} ${sc.name} — idéntico al oráculo exacto (alertas, consola, Firebase, fetch, sesión, botón)`,
                same ? '' : `diferencia: integrado=${JSON.stringify(integrated).slice(0, 600)}\n         oráculo=${JSON.stringify(oracle).slice(0, 600)}`);
        } catch (e) {
            report(false, `${sc.id} ${sc.name} — idéntico al oráculo exacto`, errText(e));
        }

        // 2) Original pre-integración: flujo observable (solo escenarios sin pausas abiertas).
        if (sc.legacy) {
            try {
                const integrated = await observe(SRC, sc, { legacy: false });
                const legacy = await observe(LEGACY, sc, { legacy: true });
                const fi = flowOf(integrated), fl = flowOf(legacy);
                const same = JSON.stringify(fi) === JSON.stringify(fl);
                report(same, `${sc.id} ${sc.name} — flujo igual al original pre-integración`,
                    same ? '' : `integrado=${JSON.stringify(fi).slice(0, 700)}\n         original=${JSON.stringify(fl).slice(0, 700)}`);
            } catch (e) {
                report(false, `${sc.id} ${sc.name} — flujo igual al original pre-integración`, errText(e));
            }
        }
    }

    // Afirmaciones de negocio sobre el integrado (no solo paridad).
    const expectAlert = async (sc, pattern, label) => {
        const o = await observe(SRC, sc, { legacy: false });
        const alerts = o.rec.filter((r) => r[0] === 'alert').map((r) => r[1]);
        ok(alerts.some((m) => pattern.test(m)), `${label}: alertas = ${JSON.stringify(alerts)}`);
        return o;
    };
    const claims = [
        ['A1', 'sin sesión local muestra el aviso de reporte', () => expectAlert({ ...SCENARIOS[4] }, /No fue posible finalizar el turno: No se encontró la sesión local/, 'A1')],
        ['A2', 'cierre correcto escribe el reporte y la sesión activa en UNA escritura multirruta', async () => {
            const o = await observe(SRC, SCENARIOS[0], { legacy: false });
            const writes = o.rec.filter((r) => r[0] === 'db.update' && r[1] === '');
            ok(writes.length === 1, `escrituras raíz = ${writes.length}`);
            const keys = Object.keys(writes[0][2]);
            ok(keys.some((k) => k.startsWith('shift_reports/')) && keys.includes('active_sessions/g1') && keys.includes('login_logs/LOG1/logoutTime'), `rutas = ${JSON.stringify(keys)}`);
            ok(writes[0][2]['active_sessions/g1'] === null, 'la sesión activa se borra');
        }],
        ['A3', 'la sesión local se borra DESPUÉS de persistir (orden de seguridad)', async () => {
            const o = await observe(SRC, SCENARIOS[0], { legacy: false });
            const iWrite = o.rec.findIndex((r) => r[0] === 'db.update');
            const iRemove = o.rec.findIndex((r) => r[0] === 'storage.remove');
            ok(iWrite >= 0 && iRemove > iWrite, `escritura=${iWrite} limpieza=${iRemove}`);
        }],
        ['A4', 'si falla la persistencia no se borra la sesión, no hay correo y el botón se restaura', async () => {
            const o = await observe(SRC, SCENARIOS[10], { legacy: false });
            ok(!o.rec.some((r) => r[0] === 'storage.remove'), 'se borró la sesión sin guardar');
            ok(!o.rec.some((r) => r[0] === 'fetch'), 'se envió correo sin guardar');
            ok(!o.rec.some((r) => r[0] === 'signOut'), 'se cerró sesión sin guardar');
            ok(o.btn.disabled === false && o.btn.innerHTML.includes('Finalizar Turno'), 'botón no restaurado');
            ok(o.rec.some((r) => r[0] === 'alert' && /no quedó guardado/.test(r[1])), 'falta alerta de no guardado');
        }],
        ['A5', 'el correo siempre se intenta con la copia de supervisión (_cc) y el asunto del gestor', async () => {
            const o = await observe(SRC, SCENARIOS[0], { legacy: false });
            const f = o.rec.find((r) => r[0] === 'fetch');
            ok(f && f[1] === 'https://formsubmit.co/ajax/maria.sanchez@virtualsoft.tech', `url = ${f && f[1]}`);
            const cc = f[4].filter((e) => e[0] === '_cc').map((e) => e[1]);
            ok(cc.length === 1 && cc[0] === 'sara.santamaria@virtualsoft.tech,oriana.borja@virtualsoft.tech', `cc = ${JSON.stringify(cc)}`);
            ok(f[4].some((e) => e[0] === '_subject' && e[1] === 'Reporte de Turno: Ana Prueba'), 'falta asunto');
        }],
        ['A6', 'el Gestor con tarea sin gestionar no cierra y no toca el botón', async () => {
            const o = await observe(SRC, SCENARIOS[7], { legacy: false });
            ok(!o.rec.some((r) => r[0] === 'db.update'), 'escribió con tareas pendientes');
            ok(o.btn.disabled === false, 'botón deshabilitado sin cerrar');
        }]
    ];
    for (const c of claims) {
        try { await c[2](); report(true, `${c[0]} ${c[1]}`, ''); } catch (e) { report(false, `${c[0]} ${c[1]}`, errText(e)); }
    }

    console.log('\n=== RESUMEN ===');
    console.log(`Pasan: ${pass} | Fallan: ${fail} | Total: ${pass + fail}`);
    console.log(fail === 0 ? 'RESULTADO: TODO CUMPLIDO' : 'RESULTADO: HAY FALLAS');
    process.exitCode = fail === 0 ? 0 : 1;
})();
