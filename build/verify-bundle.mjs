import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = path.resolve(here, 'dist/riskops.bundle.js');
const source = fs.readFileSync(bundlePath, 'utf8');

// 1. Debe ser un script clásico: sin import/export a nivel de módulo.
assert.ok(!/^\s*(import|export)\s/m.test(source), 'el bundle contiene import/export');

// 2. Contexto de navegador simulado con temporizadores controlables.
const timers = [];
const storage = new Map();
class FakeIdleDetector extends EventTarget {
    static permission = 'granted';
    static async requestPermission() { return FakeIdleDetector.permission; }
    userState = 'active';
    screenState = 'unlocked';
    async start() { FakeIdleDetector.started = true; }
    emit(userState, screenState) { this.userState = userState; this.screenState = screenState; this.dispatchEvent(new Event('change')); }
}
FakeIdleDetector.instances = [];
const OriginalIdle = FakeIdleDetector;
class TrackedIdleDetector extends OriginalIdle { constructor() { super(); OriginalIdle.instances.push(this); } }
TrackedIdleDetector.requestPermission = OriginalIdle.requestPermission;

const window = { IdleDetector: TrackedIdleDetector };
const context = {
    window,
    document: { visibilityState: 'visible', hasFocus: () => true },
    navigator: { permissions: { query: async () => ({ state: FakeIdleDetector.permission }) } },
    localStorage: {
        getItem: (k) => (storage.has(k) ? storage.get(k) : null),
        setItem: (k, v) => storage.set(k, String(v)),
        removeItem: (k) => storage.delete(k)
    },
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].fn = null; },
    console,
    Event,
    EventTarget,
    FormData
};
window.window = window;
vm.createContext(context);

// Se ejecuta como Script clásico (no como módulo).
vm.runInContext(`${source}\nthis.RiskOps = RiskOps;`, context);
const R = context.RiskOps;
assert.ok(R && typeof R === 'object', 'no se creó el global RiskOps');
const expectedNamespaces = ['announcementCapabilities', 'shiftExpiration', 'timeMetrics', 'withdrawalMetrics', 'cronogramParser', 'scheduleService',
    'shiftCalculator', 'timelineService', 'taskReconciler', 'taskReport', 'taskService', 'docLinks', 'roles', 'routes', 'idleDetector', 'formSubmit',
    'localSessionStorage', 'multiSelect', 'constants', 'dateTime', 'excel', 'normalize', 'result', 'sanitization', 'validation',
    // Corte 2 del paso 6 y reglas de la Pausa de Turno (2026-10-06)
    'shiftController', 'activeSessionStatus', 'activeSessionPayload', 'breakStateOwnership', 'breakTransitions', 'shiftClosureRules',
    'shiftReportBuilder', 'splitShiftPolicy', 'breakButton'];
for (const ns of expectedNamespaces) assert.ok(R[ns], `falta el espacio de nombres ${ns}`);
// Los espacios de nombres declarados en src/entry.js y en cada src/entry-*.js (cortes del paso 6) deben estar TODOS en el bundle, ni uno más ni uno menos.
{
    const srcDir = path.resolve(here, '../src');
    const entryFiles = ['entry.js', ...fs.readdirSync(srcDir).filter((f) => /^entry-.+\.js$/.test(f)).sort()];
    const declared = new Set();
    for (const f of entryFiles) {
        for (const m of fs.readFileSync(path.join(srcDir, f), 'utf8').matchAll(/export\s+\*\s+as\s+([A-Za-z0-9_$]+)\s+from/g)) declared.add(m[1]);
    }
    for (const ns of expectedNamespaces) assert.ok(declared.has(ns), `el espacio ${ns} no está declarado en entry*.js`);
    const exported = new Set(Object.keys(R));
    assert.deepEqual([...exported].sort(), [...declared].sort(), 'el bundle y entry*.js no coinciden');
    for (const ns of declared) assert.ok(R[ns] && typeof R[ns] === 'object', `espacio de nombres vacío: ${ns}`);
    console.log(`Espacios de nombres: ${declared.size} (entry.js + ${entryFiles.length - 1} entry-*.js)`);
}
let checks = 2 + expectedNamespaces.length + 1;

// 3. Paridad bundle vs. módulos ESM.
const SRC = path.resolve(here, '../src');
const esm = (p) => import(pathToFileURL(path.join(SRC, p)).href);
const dt = await esm('utils/date-time.js');
const tm = await esm('domain/analytics/time-metrics.js');
const ts = await esm('domain/shifts/timeline-service.js');
const sa = await esm('utils/sanitization.js');
const j = (v) => JSON.stringify(v);
for (const s of ['8:00 am - 5:00 pm', 'Tarde Set 1', 'Set 4', null]) { assert.equal(j(R.dateTime.parseShiftStart(s)), j(dt.parseShiftStart(s))); checks++; }
assert.equal(R.timeMetrics.getTardiness('6/16/2026, 8:20:00 a. m.', '8:00 am - 5:00 pm'), tm.getTardiness('6/16/2026, 8:20:00 a. m.', '8:00 am - 5:00 pm')); checks++;
const evs = [{ type: 'Inactividad', start: 0, end: 120000 }, { type: 'Almuerzo', start: 60000, end: 3660000 }];
assert.equal(j(R.timelineService.consolidateTimeline(evs, { defaultEndMs: 4000000 })), j(ts.consolidateTimeline(evs, { defaultEndMs: 4000000 }))); checks++;
assert.equal(R.sanitization.sanitizeAnnouncementHTML('<script>x</script><b onclick="a()">ok</b><a href="javascript:1">l</a>'), sa.sanitizeAnnouncementHTML('<script>x</script><b onclick="a()">ok</b><a href="javascript:1">l</a>')); checks++;
assert.ok(!R.sanitization.sanitizeAnnouncementHTML('<script>x</script><b onclick="a()">ok</b>').includes('script')); checks++;

// 3b. Paridad bundle vs. módulos ESM de las reglas de la Pausa de Turno (RN-1..RN-4).
{
    const bt = await esm('domain/shifts/break-transitions.js');
    const sc = await esm('domain/shifts/shift-calculator.js');
    const sp = await esm('domain/shifts/split-shift-policy.js');
    const ow = await esm('domain/shifts/break-state-ownership.js');
    const st = { ...sc.defaultState() };
    assert.equal(j(R.breakTransitions.toggleBreak(st, 'split', 1000)), j(bt.toggleBreak(st, 'split', 1000))); checks++;
    assert.equal(R.breakTransitions.toggleBreak(st, 'split', 1000).blockedReason, 'SPLIT_SHIFT_NOT_ENABLED'); checks++;
    assert.equal(j(R.breakTransitions.toggleBreak(st, 'split', 1000, { splitShiftEnabled: true })), j(bt.toggleBreak(st, 'split', 1000, { splitShiftEnabled: true }))); checks++;
    assert.equal(R.splitShiftPolicy.shouldShowSplitShiftButton({ role: 'Gestor', hasSplitShift: false }, { isSplitShiftBreak: true }), sp.shouldShowSplitShiftButton({ role: 'Gestor', hasSplitShift: false }, { isSplitShiftBreak: true })); checks++;
    const closure = { loginMs: 0, endMs: 600 * 60000, lunchMs: 30 * 60000, breakfastMs: 0, splitShiftMs: 180 * 60000, inactivityMins: 0 };
    assert.equal(R.shiftCalculator.calculateShiftClosureTimes(closure).effectiveHours, '6.50'); checks++;
    assert.equal(j(R.shiftCalculator.calculateShiftClosureTimes(closure)), j(sc.calculateShiftClosureTimes(closure))); checks++;
    assert.equal(j(R.breakStateOwnership.restoreBreakState(j(ow.serializeBreakState(st, 'u1')), 'u2')), j(ow.restoreBreakState(j(ow.serializeBreakState(st, 'u1')), 'u2'))); checks++;
    assert.equal(typeof R.shiftController.createShiftController, 'function'); checks++;
}

// 4. IdleDetector dentro del bundle: vigilancia continua y comunicación con callbacks.
const idleEvents = [];
const warnings = [];
const idle = R.idleDetector;
let lastActivity = Date.now();
const started = await idle.initIdleDetector({
    onIdleChange: (isIdle) => idleEvents.push(isIdle),
    onWarning: (visible, message) => warnings.push([visible, message]),
    getLastActivityTimestamp: () => lastActivity
});
assert.equal(started, true, 'el detector no arrancó con el permiso concedido'); checks++;
assert.equal(OriginalIdle.instances.length, 1); checks++;
const detector = OriginalIdle.instances[0];
assert.deepEqual(warnings.at(-1), [false, undefined]); checks++;

detector.emit('idle', 'unlocked');
assert.deepEqual(idleEvents, [true], 'inactividad nativa no notificada'); checks++;
detector.emit('active', 'unlocked');
assert.deepEqual(idleEvents, [true, false], 'regreso a actividad no notificado'); checks++;

// Pantalla bloqueada: espera 10 s de gracia antes de notificar.
detector.emit('active', 'locked');
assert.equal(idleEvents.length, 2, 'notificó antes del periodo de gracia'); checks++;
assert.equal(timers.at(-1).ms, 10000); checks++;
timers.at(-1).fn();
assert.deepEqual(idleEvents, [true, false, true], 'bloqueo no notificado tras la gracia'); checks++;
detector.emit('active', 'unlocked');
assert.deepEqual(idleEvents, [true, false, true, false]); checks++;

// Con detector nativo concedido el fallback DOM se desactiva; sin él, actúa a los 5 min.
assert.equal(idle.shouldApplyDomIdleFallback(Date.now() + 6 * 60000), false, 'fallback activo con detector nativo'); checks++;

// Instancia limpia (nuevo contexto) para probar el fallback sin detector nativo.
const context2 = { ...context, window: { }, navigator: { permissions: { query: async () => ({ state: 'denied' }) } } };
context2.window.window = context2.window;
vm.createContext(context2);
vm.runInContext(`${source}\nthis.RiskOps = RiskOps;`, context2);
const idle2 = context2.RiskOps.idleDetector;
const w2 = [];
const t0 = Date.now();
assert.equal(await idle2.initIdleDetector({ onWarning: (v, m) => w2.push([v, m]), getLastActivityTimestamp: () => t0 }), false); checks++;
assert.equal(idle2.shouldApplyDomIdleFallback(t0 + 4 * 60000), false); checks++;
assert.equal(idle2.shouldApplyDomIdleFallback(t0 + 6 * 60000), true, 'el fallback DOM no se activa a los 5 min'); checks++;
context2.document = { visibilityState: 'hidden', hasFocus: () => true };
assert.equal(idle2.shouldApplyDomIdleFallback(t0 + 6 * 60000), false, 'pestaña oculta no debe activar el fallback'); checks++;
context2.document = { visibilityState: 'visible', hasFocus: () => false };
assert.equal(idle2.shouldApplyDomIdleFallback(t0 + 6 * 60000), false, 'ventana sin foco no debe activar el fallback'); checks++;

// 5. Persistencia del estado de pausas a través del bundle.
const saved = R.localSessionStorage.saveBreakState({ isLunchBreak: true, lunchStartTime: 5, shiftTimeline: [{ type: 'Almuerzo', start: 5, end: null }] });
assert.equal(saved.isLunchBreak, true);
assert.equal(storage.get('riskOps_breakState') !== undefined, true);
assert.equal(R.localSessionStorage.loadBreakState().lunchStartTime, 5); checks += 3;

console.log(`BUNDLE_VERIFY=PASS (${checks} comprobaciones, ${(source.length / 1024).toFixed(1)} KB)`);
