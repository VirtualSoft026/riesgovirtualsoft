/**
 * Pruebas del flujo "Pausa de Turno" condicionado al flag users/{uid}/hasSplitShift (2026-10-06).
 *
 * Verifica, con el código REAL de app.js ejecutado en un `vm` (DOM, localStorage y Firebase simulados):
 *   1. Un gestor SIN hasSplitShift no ve el botón "Pausa de Turno".
 *   2. Un gestor CON hasSplitShift lo ve y puede entrar/salir de "En Pausa de Turno".
 *   3. Lo que el gestor escribe en active_sessions llega bien a la vista del supervisor
 *      (renderActiveSessionsDashboard real) sin alterar Almuerzo ni Desayuno.
 *   + Reglas de base de datos: el gestor no puede activarse el flag solo.
 *
 * Las pruebas marcadas [BRECHA] describen comportamientos que HOY no cumplen el requisito;
 * se reportan aparte. Con --strict también hacen fallar la corrida (para validar un parche candidato).
 *
 * Uso: node src/tests/e2e/split-shift-flag.unit.cjs <app.js> [--strict] [--index <index.html>] [--rules <database.rules.json>] [--riskops <riskops.bundle.js>]
 *
 * Con el app.js INTEGRADO del laboratorio (marcas [LAB-INTEGRACION]) hay que pasar --riskops con el bundle compilado de
 * src/: así las mismas pruebas validan el refactor (RiskOps.shiftController) y no solo el parche candidato.
 */
const fs = require('fs');
const vm = require('vm');

const args = process.argv.slice(2);
const APP = args.find((a) => !a.startsWith('--') && a.endsWith('.js'));
const STRICT = args.includes('--strict');
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
if (!APP) { console.error('Uso: node split-shift-flag.unit.cjs <app.js> [--strict] [--index index.html] [--rules database.rules.json]'); process.exit(2); }
const SRC = fs.readFileSync(APP, 'utf8').replace(/\r\n/g, '\n');
const INDEX = opt('--index', null) ? fs.readFileSync(opt('--index'), 'utf8') : null;
const BUNDLE = opt('--riskops', null) ? fs.readFileSync(opt('--riskops'), 'utf8') : null;
const RULES = opt('--rules', null) ? JSON.parse(fs.readFileSync(opt('--rules'), 'utf8')) : null;

// ------------------------------------------------------------------ extracción de código real
function fn(header) {
    const s = SRC.indexOf(header);
    if (s < 0) throw new Error('No se encontró: ' + header);
    // Función de una sola línea (envoltorio `function f() { return ...; }`): no buscar el siguiente "}" de columna 0.
    const eol = SRC.indexOf('\n', s);
    const first = SRC.slice(s, eol);
    if (first.endsWith('}') && (first.match(/\{/g) || []).length === (first.match(/\}/g) || []).length) return SRC.slice(s, eol + 1);
    return SRC.slice(s, SRC.indexOf('\n}\n', s) + 3);
}
function between(startMarker, endMarker) {
    const s = SRC.indexOf(startMarker); if (s < 0) throw new Error('No se encontró: ' + startMarker);
    const e = SRC.indexOf(endMarker, s); if (e < 0) throw new Error('No se encontró fin: ' + endMarker);
    return SRC.slice(s, e + endMarker.length);
}
const STATE_BLOCK = between('let lastLocalActivityTimestamp', 'window.idleDetectorStarted = false;');
const INTEGRATED = SRC.includes('// [LAB-INTEGRACION:INICIO]');
if (INTEGRATED && !BUNDLE) { console.error('app.js integrado: falta --riskops <bundle>'); process.exit(2); }
// 2026-10-14: el paso de inactividad (lab/integracion/pasos/inactividad-shift-activity.mjs) agrega su propio
// bloque de ayudantes (__shiftActivityController), que updateActivity() y applyIdleStateChange() usan.
const ACTIVITY_HELPER = SRC.includes('// [LAB-INTEGRACION:ACTIVIDAD-INICIO]')
    ? '\n' + between('// [LAB-INTEGRACION:ACTIVIDAD-INICIO]', '// [LAB-INTEGRACION:ACTIVIDAD-FIN]')
    : '';
const HELPER = INTEGRATED ? between('// [LAB-INTEGRACION:INICIO]', '// [LAB-INTEGRACION:FIN]') + ACTIVITY_HELPER : '';
const LISTENER = between("database.ref(`users/${currentUser.uid}/hasSplitShift`).on('value'", '\n            });');

// [LAB-INTEGRACION] W-19 (paso 3.2): el latido pasa por el envoltorio __sessionSync() (app.js) y el repositorio __tareasRepo().
// Si app.js integrado trae esas piezas, se cargan junto con el latido para probar el camino real y no el código heredado.
// [LAB-INTEGRACION] W-20 (paso 3.4): setupSidebar delega en __appRouter() (RiskOps.appRouter); su fábrica entra en el tramo.
const APP_ROUTER_BLOCK = SRC.includes('let __labAppRouter = null;') ? between('let __labAppRouter = null;', 'return __labAppRouter;\n}') : '';

const SESSION_SYNC_BLOCKS = [
    SRC.includes('let __labTaskRepository = null;') ? between('let __labTaskRepository = null;', 'return __labTaskRepository;\n}') : '',
    SRC.includes('function __labSetSyncWarning(') ? fn('function __labSetSyncWarning(') : '',
    SRC.includes('let __labSessionSync = null;') ? between('let __labSessionSync = null;', 'return __labSessionSync;\n}') : ''
].join('\n');

// ------------------------------------------------------------------ entorno simulado
function makeEnv({ flag, role = 'Gestor', started = Date.now() }) {
    const store = new Map();
    const writes = []; const alerts = []; const listeners = {};
    let nowMs = started;
    class FakeDate extends Date { constructor(...a) { if (a.length) super(...a); else super(nowMs); } static now() { return nowMs; } }
    const els = new Map();
    const elem = (id, display) => {
        const style = { display: display === undefined ? '' : display };
        return { id, style, innerHTML: '', textContent: '', disabled: false, children: [],
            classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
            appendChild() {}, insertBefore() {}, removeChild() {}, setAttribute() {}, addEventListener() {},
            querySelector: () => null, querySelectorAll: () => [], remove() {}, closest: () => null };
    };
    const get = (id) => { if (!els.has(id)) els.set(id, elem(id, ['toggleSplitShiftBtn', 'navConfigGestores'].includes(id) ? 'none' : '')); return els.get(id); };
    const document = {
        getElementById: get, querySelector: () => elem('q'), querySelectorAll: () => [], addEventListener() {},
        createElement: () => elem('c'), visibilityState: 'visible', hasFocus: () => true, body: elem('body')
    };
    const database = {
        ref: (path) => ({
            update: (obj) => { writes.push({ path, op: 'update', data: JSON.parse(JSON.stringify(obj)) }); return Promise.resolve(); },
            set: (v) => { writes.push({ path, op: 'set', data: v }); return Promise.resolve(); },
            remove: () => Promise.resolve(),
            on: (ev, cb) => { listeners[path] = cb; },
            onDisconnect: () => ({ update() {} })
        })
    };
    const user = { uid: 'g1', role, name: 'Ana Prueba', email: 'ana@virtualsoft.tech', shift: '8am - 4pm', loginTime: new Date(started).toISOString(), status: 'Activo' };
    if (flag !== undefined) user.hasSplitShift = flag;
    store.set('riskOps_currentUser', JSON.stringify(user));
    const ctx = {
        document, database, Date: FakeDate, Math, JSON, console, setInterval() {}, setTimeout() {}, Promise, Object, Array,
        alert: (m) => alerts.push(m), confirm: () => true,
        localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
        window: { addEventListener() {}, location: {}, idleDetectorGranted: false },
        firebase: { database: { ServerValue: { TIMESTAMP: 0 } } }
    };
    vm.createContext(ctx);
    if (BUNDLE) vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);
    const setupSidebarSrc = fn('function setupSidebar()');
    vm.runInContext([
        'let currentUser = JSON.parse(localStorage.getItem("riskOps_currentUser"));',
        (SRC.includes('const COMUNICADOS_PUBLISH_ROLES') ? between('const COMUNICADOS_PUBLISH_ROLES', 'window.canManageComunicados = canManageComunicados;') : between('function canPublishComunicados(', 'window.canManageComunicados = canManageComunicados;')),
        STATE_BLOCK, HELPER, fn('function saveBreakState()'), fn('function loadBreakState()'),
        'let shiftTimeline = []; let localStatus = "En Línea";',
        fn('function pushTimelineEvent('), fn('function updateActivity()'),
        fn('function toggleSplitShiftBreak()'), fn('function toggleBreakfastBreak()'), fn('function toggleLunchBreak()'),
        SESSION_SYNC_BLOCKS, APP_ROUTER_BLOCK, fn('function syncActiveSessionToFirebase()'), fn('function updateNavigation()'), setupSidebarSrc,
        'function alignAdministrativeControlsByRole(){}',
        // La suscripción real al flag (se ejecuta tal cual, dentro de la condición del original)
        'if (currentUser.uid && currentUser.role === "Gestor") {\n' + LISTENER + '\n}',
        'this.api = { toggleSplit: toggleSplitShiftBreak, toggleLunch: toggleLunchBreak, toggleBreakfast: toggleBreakfastBreak, sync: syncActiveSessionToFirebase, updateNavigation, setupSidebar, ' +
        'state: () => ({ split: isSplitShiftBreak, lunch: isLunchBreak, breakfast: isBreakfastBreak, totalSplit: totalSplitShiftTimeMs }), user: () => currentUser, timeline: () => shiftTimeline };'
    ].join('\n'), ctx);
    return {
        ctx, api: ctx.api, store, writes, alerts, listeners, get, advance: (ms) => { nowMs += ms; }, now: () => nowMs,
        btn: () => get('toggleSplitShiftBtn'),
        lastStatus: () => { const w = writes.filter((x) => x.path === 'active_sessions/g1').pop(); return w && w.data.status; },
        lastPayload: () => { const w = writes.filter((x) => x.path === 'active_sessions/g1').pop(); return w && w.data; },
        snapshotFlag: (v) => listeners['users/g1/hasSplitShift']({ val: () => v })
    };
}

// Vista del supervisor: renderActiveSessionsDashboard REAL alimentado con el payload que el gestor escribió
function supervisorLabel(payload, nowMs) {
    const cards = []; const grid = { innerHTML: '', appendChild(c) { cards.push(c); } };
    const ctx = {
        document: { getElementById: (id) => id === 'monitoreoGrid' ? grid : null, createElement: () => ({ className: '', innerHTML: '', querySelector: () => null }) },
        allActiveSessions: { g1: JSON.parse(JSON.stringify(payload)) }, SUPERVISORES_NOMBRES: [], availableAvatars: [], globalCronogramaData: null,
        Date: class extends Date { static now() { return nowMs; } },
        normalizeName: (s) => String(s || '').toLowerCase(), namesMatch: () => false, getShiftCategory: () => 'Mañana', calculateShiftDelay: () => '',
        escapeHTML: (s) => String(s), encodeInlineHandlerArg: (s) => String(s), reconcileScheduledTaskWithSession: () => ({ status: 'Pendiente' }),
        getAssignedTasksForGestor: () => [], encodeURIComponent
    };
    vm.createContext(ctx);
    if (!BUNDLE) throw new Error('supervisorLabel requiere --riskops (el envoltorio de Monitoreo delega en el bundle)');
    vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);
    // Monitoreo (W-18): app.js delega en RiskOps.monitoringController; aquí se cablea con el mismo repositorio falso.
    ctx.__histNav = () => ({ monitoring: ctx.RiskOps.monitoringController.createMonitoringController({
        document: ctx.document, repository: { listenActiveSessions: () => () => {}, fetchApprovedGestorNames: async () => [] },
        getSessions: () => ctx.allActiveSessions, setSessions: (s) => { ctx.allActiveSessions = s; }, hasCronograma: () => false,
        getAssignedTasksForGestor: () => [], reconcileTask: () => ({ status: 'Pendiente', observation: '' }), resolveTaskName: (k) => k,
        getShiftCategory: () => 'Mañana', supervisorDirectory: null, avatars: [], now: () => nowMs, logger: console }) });
    vm.runInContext(fn('function renderActiveSessionsDashboard()') + '\nthis.f = renderActiveSessionsDashboard;', ctx); ctx.f();
    const m = (cards[0] ? cards[0].innerHTML : '').match(/status-indicator-badge[^>]*>\s*<div[^>]*><\/div>\s*([^\n<]+)/);
    return m ? m[1].trim() : '(sin tarjeta)';
}

// ------------------------------------------------------------------ pruebas
const tests = [];
const T = (id, req, name, gap, run) => tests.push({ id, req, name, gap, run });
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m || 'distinto'}: esperado ${JSON.stringify(b)}, obtenido ${JSON.stringify(a)}`); };
const ok = (c, m) => { if (!c) throw new Error(m || 'falso'); };

// ---- Requisito 1: sin flag no se ve la opción
T('R1.1', 1, 'index.html: el botón nace oculto (display:none) para todos', false, () => {
    if (!INDEX) return 'OMITIDA (falta --index)';
    const m = INDEX.match(/<button id="toggleSplitShiftBtn"[^>]*>/); ok(m, 'no se encontró el botón');
    ok(/display:\s*none/.test(m[0]), 'el botón no nace con display:none');
});
for (const [n, label, flag] of [[2, 'sin el campo hasSplitShift', undefined], [3, 'con hasSplitShift=false', false], [4, 'con hasSplitShift="true" (texto, no booleano)', 'true']]) {
    T('R1.' + n, 1, `Gestor ${label}: setupSidebar NO muestra el botón`, false, () => {
        const e = makeEnv({ flag }); e.api.setupSidebar(); eq(e.btn().style.display, 'none');
    });
}
T('R1.A', 1, 'Gestor sin flag: updateNavigation mantiene el botón oculto', false, () => { const e = makeEnv({ flag: false }); e.api.updateNavigation(); eq(e.btn().style.display, 'none'); });
T('R1.B', 1, 'Gestor sin flag: la suscripción en vivo (valor null/false) lo mantiene oculto', false, () => {
    const e = makeEnv({ flag: undefined }); e.snapshotFlag(null); eq(e.btn().style.display, 'none'); e.snapshotFlag(false); eq(e.btn().style.display, 'none');
});
T('R1.C', 1, 'Admin y Supervisor nunca ven el botón (aunque tuvieran el campo en true)', false, () => {
    for (const role of ['Admin', 'Supervisor']) { const e = makeEnv({ flag: true, role }); e.api.setupSidebar(); eq(e.btn().style.display, 'none', role); }
});
T('R1.D', 1, 'Reglas: el gestor NO puede escribir su propio hasSplitShift (users/$uid solo Admin o alta inicial)', false, () => {
    if (!RULES) return 'OMITIDA (falta --rules)';
    const w = RULES.rules.users.$uid['.write'];
    ok(/role'\)\.val\(\) === 'Admin'/.test(w), 'la regla de escritura no exige Admin');
    ok(/!data\.exists\(\) && newData\.exists\(\)/.test(w), 'se esperaba que solo el alta inicial (no existe aún) fuera la excepción');
    ok(!RULES.rules.users.$uid.hasSplitShift, 'no debe existir una regla propia que abra la escritura de hasSplitShift');
});
T('R1.E', 1, "Solo el rol Admin ve 'Config. Gestores' (donde se activa el flag), y las reglas también lo exigen", false, () => {
    const a = makeEnv({ flag: false, role: 'Admin' }); a.api.setupSidebar(); eq(a.get('navConfigGestores').style.display, 'flex', 'Admin');
    for (const role of ['Supervisor', 'Gestor']) { const e = makeEnv({ flag: false, role }); e.api.setupSidebar(); eq(e.get('navConfigGestores').style.display, 'none', role); }
});

// ---- Requisito 2: con flag sí
T('R2.1', 2, 'Gestor con hasSplitShift=true: setupSidebar muestra el botón', false, () => { const e = makeEnv({ flag: true }); e.api.setupSidebar(); eq(e.btn().style.display, 'flex'); });
T('R2.2', 2, 'Activación en vivo: el supervisor/admin enciende el flag y el botón aparece sin recargar', false, () => {
    const e = makeEnv({ flag: undefined }); e.snapshotFlag(true); eq(e.btn().style.display, 'flex'); eq(e.api.user().hasSplitShift, true);
    eq(JSON.parse(e.store.get('riskOps_currentUser')).hasSplitShift, true, 'persistencia en localStorage');
});
T('R2.3', 2, 'Desactivación en vivo (sin pausa activa): el botón desaparece', false, () => {
    const e = makeEnv({ flag: true }); e.api.setupSidebar(); e.snapshotFlag(false); eq(e.btn().style.display, 'none');
});
T('R2.4', 2, 'Con flag: Pausa de Turno cambia el estado a "En Pausa de Turno" en active_sessions', false, () => {
    const e = makeEnv({ flag: true }); e.api.toggleSplit();
    eq(e.api.state().split, true); eq(e.lastStatus(), 'En Pausa de Turno');
    const ev = e.api.timeline().filter((x) => x.type === 'Pausa de Turno'); eq(ev.length, 1); eq(ev[0].end, null, 'evento abierto');
});
T('R2.5', 2, 'Con flag: "Retomar Turno" vuelve a "En Línea", cierra el evento y acumula el tiempo', false, () => {
    const e = makeEnv({ flag: true }); e.api.toggleSplit(); e.advance(20 * 60000); e.api.toggleSplit();
    eq(e.api.state().split, false); eq(e.lastStatus(), 'En Línea'); eq(e.api.state().totalSplit, 20 * 60000, 'ms acumulados');
    ok(e.api.timeline().find((x) => x.type === 'Pausa de Turno').end !== null, 'evento sin cerrar');
});
T('R2.6', 2, 'El estado de pausa sobrevive a un refresco (riskOps_breakState) y el botón muestra "Retomar Turno" (6503)', false, () => {
    const e = makeEnv({ flag: true }); e.api.toggleSplit();
    const saved = JSON.parse(e.store.get('riskOps_breakState')); eq(saved.isSplitShiftBreak, true); ok(saved.splitShiftStartTime > 0);
    if (INTEGRATED) {
        // app.js integrado: la restauración la hace RiskOps.shiftController.restoreOnLoad() (se ejecuta de verdad)
        ok(SRC.includes('__shiftController().restoreOnLoad();'), 'falta la llamada a restoreOnLoad() en la carga de página');
        vm.runInContext('__shiftController().restoreOnLoad()', e.ctx);
        ok(String(e.get('toggleSplitShiftBtn').innerHTML).includes('Retomar Turno'), 'restoreOnLoad() no pintó "Retomar Turno"');
        return;
    }
    const labelRestore = SRC.includes("btnSplitShift.innerHTML = \"<i class='bx bx-check-circle'></i> Retomar Turno\"");
    ok(labelRestore, 'falta la restauración del texto "Retomar Turno" tras refrescar');
});

// ---- Requisito 3: supervisor y compatibilidad con Almuerzo/Desayuno
T('R3.1', 3, 'Cadena completa gestor → active_sessions → vista del supervisor: entrar y salir de Pausa de Turno', false, () => {
    const e = makeEnv({ flag: true });
    e.api.toggleSplit(); eq(supervisorLabel(e.lastPayload(), e.now()), 'En Pausa de Turno ⏸️', 'al entrar');
    e.advance(10 * 60000); // 10 min sin latido: no debe degradarse
    eq(supervisorLabel(e.lastPayload(), e.now()), 'En Pausa de Turno ⏸️', 'pausa larga sin latido');
    e.api.toggleSplit(); eq(supervisorLabel(e.lastPayload(), e.now()), 'En Línea', 'al salir');
});
T('R3.2', 3, 'Almuerzo y Desayuno siguen reflejándose igual en la vista del supervisor', false, () => {
    const e = makeEnv({ flag: true });
    e.api.toggleLunch(); eq(e.lastStatus(), 'En Almuerzo'); eq(supervisorLabel(e.lastPayload(), e.now()), 'En Almuerzo/Cena 🍽️');
    e.api.toggleLunch(); eq(e.lastStatus(), 'En Línea');
    e.api.toggleBreakfast(); eq(e.lastStatus(), 'En Desayuno'); eq(supervisorLabel(e.lastPayload(), e.now()), 'En Desayuno ☕');
    e.api.toggleBreakfast(); eq(e.lastStatus(), 'En Línea');
});
T('R3.3', 3, 'Exclusión mutua: en Pausa no se puede tomar Almuerzo ni Desayuno (y viceversa); el estado no se contamina', false, () => {
    const e = makeEnv({ flag: true });
    e.api.toggleSplit(); e.api.toggleLunch(); e.api.toggleBreakfast();
    eq(e.alerts.length, 2, 'avisos'); eq(e.api.state().lunch, false); eq(e.api.state().breakfast, false); eq(e.lastStatus(), 'En Pausa de Turno');
    e.api.toggleSplit(); e.api.toggleLunch(); e.api.toggleSplit();
    eq(e.alerts.length, 3, 'Pausa bloqueada durante el almuerzo'); eq(e.api.state().split, false); eq(e.lastStatus(), 'En Almuerzo');
});
T('R3.4', 3, 'Secuencia Pausa → Almuerzo → Desayuno: 3 eventos cerrados, cada estado visible a su tiempo', false, () => {
    const e = makeEnv({ flag: true }); const seen = [];
    e.api.toggleSplit(); seen.push(supervisorLabel(e.lastPayload(), e.now())); e.advance(60000); e.api.toggleSplit();
    e.api.toggleLunch(); seen.push(supervisorLabel(e.lastPayload(), e.now())); e.advance(60000); e.api.toggleLunch();
    e.api.toggleBreakfast(); seen.push(supervisorLabel(e.lastPayload(), e.now())); e.advance(60000); e.api.toggleBreakfast();
    eq(seen.join(' | '), 'En Pausa de Turno ⏸️ | En Almuerzo/Cena 🍽️ | En Desayuno ☕');
    const tl = e.api.timeline().filter((x) => ['Pausa de Turno', 'Almuerzo', 'Desayuno'].includes(x.type));
    eq(tl.length, 3); ok(tl.every((x) => x.end !== null), 'hay eventos sin cerrar'); eq(supervisorLabel(e.lastPayload(), e.now()), 'En Línea');
});

// ---- Brechas (comportamientos que hoy no cumplen el requisito)
T('B1', 1, '[BRECHA] Sin flag, la función toggleSplitShiftBreak() NO debe iniciar una pausa (hoy solo el botón oculto lo impide)', true, () => {
    const e = makeEnv({ flag: false }); e.api.toggleSplit();
    eq(e.api.state().split, false, 'isSplitShiftBreak tras invocar la función sin flag');
    ok(e.lastStatus() !== 'En Pausa de Turno', 'se escribió "En Pausa de Turno" en active_sessions');
});
T('B2', 2, '[BRECHA] Si el flag se revoca MIENTRAS el gestor está en pausa, el botón "Retomar Turno" debe seguir visible', true, () => {
    const e = makeEnv({ flag: true }); e.api.setupSidebar(); e.api.toggleSplit(); e.snapshotFlag(false);
    eq(e.btn().style.display, 'flex', "display del botón con la pausa activa y flag=false");
});
T('B3', 3, '[BRECHA] Flag revocado en plena pausa: el gestor no debe quedar bloqueado para Almuerzo/Desayuno', true, () => {
    const e = makeEnv({ flag: true }); e.api.setupSidebar(); e.api.toggleSplit(); e.snapshotFlag(false);
    // Si el botón de retomar queda oculto, la única salida sería Almuerzo/Desayuno, que están bloqueados por la pausa.
    const canResume = e.btn().style.display !== 'none';
    const lunchBlocked = (() => { const n = e.alerts.length; e.api.toggleLunch(); return e.alerts.length > n; })();
    ok(canResume || !lunchBlocked, 'sin botón para retomar y con Almuerzo/Desayuno bloqueados');
});
T('B4', 2, '[BRECHA] Tras un refresco con pausa activa y flag revocado, el botón "Retomar Turno" debe estar visible', true, () => {
    const e = makeEnv({ flag: true }); e.api.toggleSplit();
    const e2 = makeEnv({ flag: false }); // nueva carga: flag falso en el servidor
    e2.store.set('riskOps_breakState', e.store.get('riskOps_breakState'));
    vm.runInContext('loadBreakState()', e2.ctx);
    e2.api.setupSidebar(); e2.snapshotFlag(false);
    eq(e2.api.state().split, true, 'pausa restaurada');
    eq(e2.btn().style.display, 'flex', 'botón visible con pausa restaurada');
});

// ------------------------------------------------------------------ ejecución
(async () => {
    console.log('=== FLAG hasSplitShift + PAUSA DE TURNO — PRUEBAS ===');
    console.log(`app.js: ${APP} | modo: ${STRICT ? 'ESTRICTO (las brechas también fallan)' : 'informativo (las brechas se reportan aparte)'} | ${new Date().toISOString()}`);
    let failed = 0, gaps = 0, skipped = 0, passed = 0;
    for (const req of [1, 2, 3]) {
        console.log('\n--- Requisito ' + req + ({ 1: ': sin hasSplitShift NO se ve la opción', 2: ': con hasSplitShift SÍ se ve y cambia el estado', 3: ': el supervisor lo refleja sin dañar Almuerzo/Desayuno' }[req]));
        for (const t of tests.filter((x) => x.req === req)) {
            try {
                const r = await t.run();
                if (typeof r === 'string' && r.startsWith('OMITIDA')) { skipped++; console.log(`  [SKIP] ${t.id} ${t.name} (${r})`); }
                else { passed++; console.log(`  [PASS] ${t.id} ${t.name}`); }
            } catch (err) {
                if (t.gap) { gaps++; if (STRICT) failed++; console.log(`  [${STRICT ? 'FAIL' : 'BRECHA'}] ${t.id} ${t.name}\n         -> ${err.message}`); }
                else { failed++; console.log(`  [FAIL] ${t.id} ${t.name}\n         -> ${err.message}`); }
            }
        }
    }
    console.log('\n=== RESUMEN ===');
    console.log(`Pasan: ${passed} | Fallan: ${failed - (STRICT ? gaps : 0)} | Brechas abiertas: ${gaps} | Omitidas: ${skipped} | Total: ${tests.length}`);
    const good = failed === 0;
    console.log(good ? (gaps ? 'RESULTADO: REQUISITOS CUMPLIDOS EN EL FLUJO NORMAL; HAY BRECHAS ABIERTAS (ver arriba)' : 'RESULTADO: TODO CUMPLIDO') : 'RESULTADO: HAY FALLAS');
    process.exitCode = good ? 0 : 1;
})();
