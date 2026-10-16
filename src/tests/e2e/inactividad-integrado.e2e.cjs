/**
 * Plan manual de inactividad (W-24, W-25; paso 3.3) ejecutado de forma automática sobre el app.js REAL.
 *
 * Cada escenario corre el bloque de inactividad de app.js (desde `let lastLocalActivityTimestamp` hasta la carga de
 * `currentUser`) dentro de un `vm` con reloj falso, IdleDetector falso, Permissions API falsa, documento falso y
 * base de datos falsa. Se observa todo lo que el usuario o Firebase verían: escrituras de estado, línea de tiempo,
 * banner de advertencia, alertas y banderas `window.idleDetectorGranted` / `window.idleDetectorStarted`.
 *
 * Con `--original <app.js del repo>` cada escenario se ejecuta TAMBIÉN contra el app.js anterior al paso 3.3 y se exige
 * que lo observable sea idéntico. No hay diferencias intencionales en este paso.
 *
 * Escenarios (plan manual, sección 5 del informe 2026-10-16-informe-fase3-paso-3-3.md):
 *   P1 permiso concedido: idle nativo y vuelta a activo.
 *   P2 permiso denegado: respaldo DOM tras 5 min sin actividad; la actividad restaura.
 *   P3 pestaña SIN FOCO: el respaldo DOM no actúa.
 *   P4 pestaña oculta: el respaldo DOM no actúa.
 *   P5 pausa de almuerzo: la inactividad nativa no se afirma.
 *   P6 solicitud manual concedida (alerta y banner oculto).
 *   P7 solicitud manual denegada (alerta y texto del banner).
 *   P8 bloqueo de pantalla: 10 s de gracia; volver a activo antes cancela.
 *   P9 rol Admin: no cambia el estado.
 *   P10 navegador sin IdleDetector: el banner avisa y el respaldo DOM funciona.
 *   P11 permiso concedido pero el arranque falla: aviso de reintento.
 *
 * Uso: node src/tests/e2e/inactividad-integrado.e2e.cjs <app.js integrado> --riskops <bundle.js> [--original <app.js pre-3.3>]
 */
const fs = require('fs');
const vm = require('vm');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const APP = args.find((a) => !a.startsWith('--') && a.endsWith('.js') && a !== opt('--riskops') && a !== opt('--original'));
const BUNDLE_PATH = opt('--riskops', null);
const ORIGINAL_PATH = opt('--original', null);
if (!APP || !BUNDLE_PATH) { console.error('Uso: node inactividad-integrado.e2e.cjs <app.js> --riskops <bundle.js> [--original <app.js pre-3.3>]'); process.exit(2); }

const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const BUNDLE = read(BUNDLE_PATH);
const SRC = read(APP);
const ORIGINAL_SRC = ORIGINAL_PATH ? read(ORIGINAL_PATH) : null;

/** Bloque de inactividad de app.js: desde el estado hasta la carga de currentUser. */
function slice(src) {
    const s = src.indexOf('let lastLocalActivityTimestamp = Date.now();');
    const e = src.indexOf('try {\n    currentUser = currentUserObj');
    if (s < 0 || e < 0 || e < s) throw new Error('No se encontró el bloque de inactividad en app.js');
    return src.slice(s, e);
}

const MIN = 60 * 1000;
const WARN_DEFAULT = 'Permiso de inactividad pendiente o denegado. RiskOps no podrá registrar automáticamente cuando bloquees la pantalla. Esto no impide finalizar el turno.';

/** Ejecuta un escenario y devuelve lo observable. */
async function run(src, scenario) {
    // ---- reloj falso
    let now = 1_800_000_000_000;
    const timers = [];
    let timerId = 1;
    const addTimer = (fn, ms, repeat) => { const t = { id: timerId++, due: now + ms, ms, fn, repeat }; timers.push(t); return t.id; };
    const clearTimer = (id) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); };
    const advance = (ms) => {
        const end = now + ms;
        for (;;) {
            timers.sort((a, b) => a.due - b.due || a.id - b.id);
            const next = timers[0];
            if (!next || next.due > end) break;
            now = next.due;
            if (next.repeat) next.due += next.ms; else timers.shift();
            if (!next.repeat) { /* ya retirado */ }
            next.fn();
        }
        now = end;
    };
    const flush = async () => { for (let i = 0; i < 20; i += 1) await new Promise((r) => setImmediate(r)); };

    // ---- documento y ventana falsos
    const log = [];
    const docListeners = {};
    const winListeners = {};
    const addTo = (bag) => (type, fn) => { (bag[type] = bag[type] || new Set()).add(fn); };
    const removeFrom = (bag) => (type, fn) => { if (bag[type]) bag[type].delete(fn); };
    const warning = { style: { display: 'none' } };
    const warningText = { textContent: WARN_DEFAULT };
    const document = {
        visibilityState: scenario.visibility || 'visible',
        hasFocus: () => scenario.focus !== false,
        addEventListener: addTo(docListeners),
        removeEventListener: removeFrom(docListeners),
        getElementById: (id) => (id === 'idleDetectorWarning' ? warning : id === 'idleDetectorWarningText' ? warningText : null),
        querySelector: () => null,
    };

    // ---- IdleDetector y Permissions API falsos
    let detector = null;
    const IdleDetector = scenario.noIdleApi ? undefined : class {
        constructor() { this.screenState = 'unlocked'; this.userState = 'active'; this.listeners = []; detector = this; }
        addEventListener(type, fn) { if (type === 'change') this.listeners.push(fn); }
        async start() { if (scenario.startFails) throw new Error('boom'); return undefined; }
        static async requestPermission() { return scenario.requestResult; }
    };
    const emitNative = (userState, screenState = 'unlocked') => {
        if (!detector) throw new Error('no hay IdleDetector activo');
        detector.userState = userState; detector.screenState = screenState;
        detector.listeners.forEach((fn) => fn());
    };

    const alerts = [];
    const dbWrites = [];
    const ctx = {
        console: { log() {}, warn() {}, error(...a) { log.push(['console.error', String(a[0])]); } },
        setTimeout: (fn, ms) => addTimer(fn, ms, false),
        clearTimeout: clearTimer,
        setInterval: (fn, ms) => addTimer(fn, ms, true),
        clearInterval: clearTimer,
        setImmediate, Promise, JSON, Math, Number, String, Array, Object, Set, Map, Error, TypeError, RegExp, Symbol,
        navigator: { permissions: { query: async () => ({ state: scenario.permission || 'prompt' }) } },
        document,
        alert: (m) => alerts.push(m),
        confirm: () => true,
        localStorage: { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } },
        database: { ref: (path) => ({ set: (v) => { dbWrites.push([path, v]); return Promise.resolve(); }, update: () => Promise.resolve(), on: () => {} }) },
        updateStatusDisplay: () => log.push(['display']),
        syncActiveSessionToFirebase: () => log.push(['sync']),
        Date: class extends Date { static now() { return now; } constructor(...a) { if (a.length) super(...a); else super(now); } },
    };
    if (IdleDetector) ctx.IdleDetector = IdleDetector;
    ctx.window = ctx;
    ctx.addEventListener = addTo(winListeners);
    ctx.removeEventListener = removeFrom(winListeners);
    ctx.idleSupported = !scenario.noIdleApi;
    vm.createContext(ctx);

    // ---- bundle + bloque de app.js
    vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);
    vm.runInContext(
        'let currentUser = ' + JSON.stringify(scenario.user) + ';\n' +
        'function updateActivityAtStart() {}\n' +
        slice(src),
        ctx
    );

    // ---- pasos del escenario
    const api = {
        flush, advance, emitNative,
        focus(v) { ctx.document.hasFocus = () => v; },
        dispatch(type) { (docListeners[type] || new Set()).forEach((fn) => fn({ type })); },
        winDispatch(type) { (winListeners[type] || new Set()).forEach((fn) => fn({ type })); },
        setBreak(name, v) { vm.runInContext(`${name} = ${v};`, ctx); },
        manual: async () => { await ctx.window.requestIdlePermissionManual(); await flush(); },
    };
    await flush();
    if (scenario.steps) await scenario.steps(api);
    await flush();

    const state = vm.runInContext('({ g: globalIdleState, flags: [window.idleDetectorGranted, window.idleDetectorStarted], timeline: shiftTimeline.map(e => [e.type, e.end === null ? "abierto" : "cerrado"]) })', ctx);
    return {
        status: scenario.user.status === undefined ? undefined : scenario.user.status,
        userStatus: vm.runInContext('currentUser.status', ctx),
        dbWrites,
        timeline: state.timeline,
        globalIdle: state.g,
        flags: state.flags,
        alerts,
        warningDisplay: warning.style.display,
        warningText: warningText.textContent,
        log,
        docListeners: Object.fromEntries(Object.entries(docListeners).map(([k, v]) => [k, v.size])),
        winListeners: Object.fromEntries(Object.entries(winListeners).map(([k, v]) => [k, v.size])),
        timers: timers.length,
    };
}

const GESTOR = { uid: 'g1', role: 'Gestor', status: 'Activo', name: 'Ana' };
const ADMIN = { uid: 'a1', role: 'Admin', status: 'Activo', name: 'Admin' };

const SCENARIOS = [
    { id: 'P1', name: 'permiso concedido: idle nativo y vuelta a activo', user: GESTOR, permission: 'granted', steps: async (a) => {
        a.emitNative('idle'); await a.flush(); a.emitNative('active'); await a.flush(); } },
    { id: 'P2', name: 'permiso denegado: respaldo DOM tras 5 min sin actividad; el mousemove restaura', user: GESTOR, permission: 'denied', steps: async (a) => {
        a.advance(6 * MIN); await a.flush(); a.dispatch('mousemove'); await a.flush(); } },
    { id: 'P3', name: 'pestaña SIN FOCO: el respaldo DOM no actúa aunque pasen 10 min', user: GESTOR, permission: 'denied', focus: false, steps: async (a) => {
        a.advance(10 * MIN); await a.flush(); } },
    { id: 'P4', name: 'pestaña oculta: el respaldo DOM no actúa', user: GESTOR, permission: 'denied', visibility: 'hidden', steps: async (a) => {
        a.advance(10 * MIN); await a.flush(); } },
    { id: 'P5', name: 'pausa de almuerzo: la inactividad nativa no se afirma', user: GESTOR, permission: 'granted', steps: async (a) => {
        a.setBreak('isLunchBreak', true); a.emitNative('idle'); await a.flush(); } },
    { id: 'P6', name: 'solicitud manual concedida: alerta y banner oculto', user: GESTOR, permission: 'prompt', requestResult: 'granted', steps: async (a) => {
        await a.manual(); } },
    { id: 'P7', name: 'solicitud manual denegada: alerta y texto del banner', user: GESTOR, permission: 'prompt', requestResult: 'denied', steps: async (a) => {
        await a.manual(); } },
    { id: 'P8', name: 'bloqueo de pantalla: 10 s de gracia; volver a activo antes cancela', user: GESTOR, permission: 'granted', steps: async (a) => {
        a.emitNative('active', 'locked'); a.advance(5000); a.emitNative('active', 'unlocked'); a.advance(20000); await a.flush();
        a.emitNative('active', 'locked'); a.advance(11000); await a.flush(); } },
    { id: 'P9', name: 'rol Admin: no cambia el estado con el detector nativo', user: ADMIN, permission: 'granted', steps: async (a) => {
        a.emitNative('idle'); await a.flush(); } },
    { id: 'P10', name: 'navegador sin IdleDetector: el banner avisa y el respaldo DOM funciona', user: GESTOR, noIdleApi: true, steps: async (a) => {
        a.advance(6 * MIN); await a.flush(); } },
    { id: 'P11', name: 'permiso concedido pero el arranque falla: aviso de reintento', user: GESTOR, permission: 'granted', startFails: true, steps: async (a) => {
        a.advance(6 * MIN); await a.flush(); } },
];

(async () => {
    console.log('=== PLAN MANUAL DE INACTIVIDAD (W-24, W-25; paso 3.3) — app.js ' + (ORIGINAL_SRC ? '| paridad contra el app.js previo al paso 3.3' : '') + ' ===');
    let pass = 0; let fail = 0;
    const report = (good, label, detail) => { if (good) { pass += 1; console.log(`  [PASS] ${label}`); } else { fail += 1; console.error(`  [FAIL] ${label}\n         ${detail}`); } };
    const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || 'distinto'}: esperado ${JSON.stringify(b)}, obtenido ${JSON.stringify(a)}`); };

    // Expectativas absolutas del comportamiento (independientes de la paridad).
    const EXPECT = {
        P1: (o) => { eq(o.dbWrites.map((w) => w[1]), ['Inactivo', 'Activo'], 'escrituras de estado'); eq(o.timeline, [['Inactividad', 'cerrado']], 'línea de tiempo: un intervalo cerrado'); eq(o.warningDisplay, 'none', 'banner tras conceder'); eq(o.flags, [true, true], 'banderas'); },
        P2: (o) => { eq(o.dbWrites.map((w) => w[1]), ['Inactivo', 'Activo'], 'respaldo DOM y restauración'); eq(o.warningText, WARN_DEFAULT, 'texto del banner'); eq(o.warningDisplay, 'flex', 'banner visible'); },
        P3: (o) => { eq(o.dbWrites, [], 'sin foco no se escribe'); eq(o.timeline, [], 'sin línea de tiempo'); },
        P4: (o) => { eq(o.dbWrites, [], 'pestaña oculta no escribe'); },
        P5: (o) => { eq(o.dbWrites, [], 'con pausa no se afirma inactividad'); },
        P6: (o) => { eq(o.alerts, ['¡Permiso otorgado! RiskOps ahora podrá registrar tu inactividad correctamente.'], 'alerta de concesión'); eq(o.warningDisplay, 'none', 'banner oculto'); eq(o.flags, [true, true], 'banderas'); },
        P7: (o) => { eq(o.alerts, ['El permiso no pudo activarse. Revisa los permisos del sitio en el navegador. Esto no impide finalizar tu turno.'], 'alerta de denegación'); eq(o.warningText, 'Permiso de inactividad denegado. Esto no impide finalizar el turno.', 'texto del banner'); eq(o.flags, [false, false], 'banderas'); },
        P8: (o) => { eq(o.dbWrites.map((w) => w[1]), ['Inactivo'], 'el bloqueo corto se cancela; el bloqueo de 10 s escribe una sola vez'); eq(o.timeline, [['Inactividad', 'abierto']], 'un intervalo abierto'); },
        P9: (o) => { eq(o.dbWrites, [], 'Admin no cambia estado'); },
        P10: (o) => { eq(o.warningText, 'Tu navegador no admite el permiso de inactividad. Esto no impide finalizar el turno.', 'aviso de navegador'); eq(o.dbWrites.map((w) => w[1]), ['Inactivo'], 'respaldo DOM funciona sin detector'); },
        P11: (o) => { eq(o.warningText, 'El permiso está otorgado, pero el detector de inactividad no pudo iniciarse. Usa el botón para reintentar.', 'aviso de reintento'); eq(o.flags, [false, false], 'banderas'); },
    };

    for (const sc of SCENARIOS) {
        try {
            const obs = await run(SRC, sc);
            try { EXPECT[sc.id](obs, eq); report(true, `${sc.id} ${sc.name}`, ''); } catch (e) { report(false, `${sc.id} ${sc.name}`, e.message); }

            if (ORIGINAL_SRC) {
                const orig = await run(ORIGINAL_SRC, sc);
                const same = JSON.stringify(obs) === JSON.stringify(orig);
                report(same, `${sc.id} paridad con el app.js previo al paso 3.3`, same ? '' : 'difiere: integrado=' + JSON.stringify(obs).slice(0, 300) + ' original=' + JSON.stringify(orig).slice(0, 300));
            }
        } catch (e) { report(false, `${sc.id} ${sc.name}`, e.stack || e.message); }
    }

    console.log(`\nPasan: ${pass} | Fallan: ${fail} | Total: ${pass + fail}`);
    console.log(fail === 0 ? 'RESULTADO: TODO CUMPLIDO' : 'RESULTADO: HAY FALLAS');
    process.exit(fail === 0 ? 0 : 1);
})();
