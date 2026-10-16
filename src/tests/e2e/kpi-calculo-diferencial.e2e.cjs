/**
 * Prueba diferencial de calcularIndicadores (paso 3.3, KPIs / W-16 y W-42):
 *   ORÁCULO   = el cuerpo legacy de calcularIndicadores() extraído de fase_2/lab/referencia/app.pre-paso-3-3-kpi.js
 *   INTEGRADO = RiskOps.kpiController.createKpiController(...).calcularIndicadores() del bundle
 * Ambos corren sobre el mismo fixture, con el mismo DOM simulado, la misma lectura de Firebase y los mismos
 * relojes de temporizador. Se comparan TODOS los elementos del DOM tocados, el estado global
 * (kpiTaskLists, kpiBitacoraHTML, isFilteredByGestor, controlOperativoRawData) y las advertencias.
 * Uso:
 *   node src/tests/e2e/kpi-calculo-diferencial.e2e.cjs --riskops riskops.bundle.js --oracle fase_2/lab/referencia/app.pre-paso-3-3-kpi.js
 * No modifica ningún archivo. Sale con 1 si alguna comparación difiere.
 */
const fs = require('fs'); const vm = require('vm');
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const BUNDLE_PATH = flag('--riskops'); const ORACLE_PATH = flag('--oracle');
if (!BUNDLE_PATH || !ORACLE_PATH) { console.error('Uso: --riskops <bundle> --oracle <app.pre-paso-3-3-kpi.js>'); process.exit(2); }
const BUNDLE = fs.readFileSync(BUNDLE_PATH, 'utf8');
const ORACLE = fs.readFileSync(ORACLE_PATH, 'utf8').replace(/\r\n/g, '\n');

// ---- cuerpo legacy (oráculo) ----------------------------------------------------------------
const legacyStart = ORACLE.indexOf('async function calcularIndicadores() {');
if (legacyStart < 0) throw new Error('El oráculo no contiene calcularIndicadores()');
const LEGACY_FN = ORACLE.slice(legacyStart, ORACLE.indexOf('\n}\n', legacyStart) + 3);

// ---- DOM simulado ---------------------------------------------------------------------------
const ELEMENT_IDS = [
    'kpiTotalFinalizadas', 'kpiTotalNoRealizadas', 'kpiTotalPendientes', 'kpiTurnosAnalizados', 'kpiDuracionPromedio',
    'kpiTiempoInactivo', 'kpiRetirosPenalidadCard', 'kpiPenalidadRetiros', 'kpiDemoraPromedioText', 'metric-approved-count',
    'metric-approved-title', 'kpiRetirosRechazados', 'kpiBitacoraTitle', 'kpiBitacoraInlineCard', 'kpiBitacoraInlineList',
    'kpiResultsContainer', 'filtroFechaOperativo', 'operativoDateStart', 'operativoDateEnd',
    'kpiScoreRingActividades', 'kpiScoreTextActividades', 'kpiVerdictBadgeActividades',
    'kpiScoreRingConectividad', 'kpiScoreTextConectividad', 'kpiVerdictBadgeConectividad',
    'kpiScoreRingRetiros', 'kpiScoreTextRetiros', 'kpiVerdictBadgeRetiros'
];
function makeDom(scn) {
    const els = {};
    for (const id of ELEMENT_IDS) {
        els[id] = { id, textContent: '', innerHTML: '', value: '', style: {}, classes: [] };
    }
    els.filtroFechaOperativo.value = scn.periodValue;
    els.operativoDateStart.value = scn.customStart || '';
    els.operativoDateEnd.value = scn.customEnd || '';
    els.kpiRetirosPenalidadCard.classes.push('retiros-card');
    els.kpiRendimientoRetiros = { id: 'kpiRendimientoRetiros', style: {}, classes: ['retiros-card'] };
    return {
        byId: (id) => (els[id] !== undefined ? els[id] : null),
        qsa: (sel) => (sel === '.retiros-card' ? Object.values(els).filter((e) => e.classes.includes('retiros-card')) : []),
        all: els
    };
}
function snapshotDom(dom) {
    const out = {};
    for (const [id, el] of Object.entries(dom.all)) {
        out[id] = { textContent: el.textContent, innerHTML: el.innerHTML, style: { ...el.style }, value: el.value };
    }
    return out;
}

// ---- lecturas y fixtures --------------------------------------------------------------------
function makeDatabase(shiftReports) {
    return { ref: (path) => ({ once: async () => ({
        exists: () => shiftReports !== null && path === 'shift_reports',
        val: () => (path === 'shift_reports' ? shiftReports : null)
    }) }) };
}
const clone = (v) => JSON.parse(JSON.stringify(v));

function buildScenario(scn) {
    return scn;
}

// ---- oráculo: cuerpo legacy dentro de un contexto vm --------------------------------------
function runLegacy(scn, shiftReports, raw) {
    const dom = makeDom(scn);
    const warns = []; const errs = []; const timers = [];
    const riskops = (() => { const c = vm.createContext({}); vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', c); return c.RiskOps; })();
    const ctx = {
        document: { getElementById: dom.byId, querySelectorAll: dom.qsa },
        getSelectedMultiSelectValues: () => clone(scn.selected),
        database: makeDatabase(shiftReports),
        escapeHTML: (s) => riskops.sanitization.escapeHTML(s),
        isLegacyGenericTaskName: (n) => riskops.taskReport.isLegacyGenericTaskName(n),
        resolveTaskDisplayName: (k, e) => riskops.taskReport.resolveTaskDisplayName(k, e, null, () => {}),
        fetchKpiOperativosData: async () => { if (raw === 'fail') throw new Error('fallo ficticio'); return clone(raw); },
        RiskOps: riskops,
        currentUser: scn.user,
        setTimeout: (fn) => timers.push(fn),
        console: { log() {}, warn: (...a) => warns.push(a.join(' ')), error: (...a) => errs.push(a.map(String).join(' ')) },
        Date, Math, JSON, Object, Array, String, Number, Boolean, Error, Promise,
        window: null
    };
    ctx.window = ctx;
    if (scn.preloadRaw) ctx.controlOperativoRawData = clone(raw);
    else ctx.controlOperativoRawData = null;
    ctx.kpiTaskLists = { finalizadas: [], no_realizadas: [], pendientes: [] };
    ctx.kpiBitacoraHTML = '';
    vm.createContext(ctx);
    vm.runInContext(LEGACY_FN + '\nthis.calcularIndicadores = calcularIndicadores;', ctx);
    return { ctx, dom, warns, errs, timers };
}

// ---- integrado: controlador del bundle -------------------------------------------------------
function runIntegrated(scn, shiftReports, raw) {
    const dom = makeDom(scn);
    const warns = []; const errs = []; const timers = [];
    const c = vm.createContext({}); vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', c);
    const R = c.RiskOps;
    const state = {
        controlOperativoRawData: scn.preloadRaw ? clone(raw) : null,
        retirosGlobalData: null, kpiUsersData: {},
        kpiTaskLists: { finalizadas: [], no_realizadas: [], pendientes: [] }, kpiBitacoraHTML: ''
    };
    const ctl = R.kpiController.createKpiController({
        getEl: dom.byId, querySelectorAll: dom.qsa,
        state, chartRegistry: {}, ChartClass: function () {},
        fetchKpiData: async () => { if (raw === 'fail') throw new Error('fallo ficticio'); return clone(raw); },
        database: makeDatabase(shiftReports),
        getSelectedGestores: () => clone(scn.selected),
        getUser: () => scn.user,
        resolveTaskDisplayName: (k, e) => R.taskReport.resolveTaskDisplayName(k, e, null, () => {}),
        isLegacyGenericTaskName: (n) => R.taskReport.isLegacyGenericTaskName(n),
        setTimeout: (fn) => timers.push(fn),
        logger: { log() {}, warn: (...a) => warns.push(a.join(' ')), error: (...a) => errs.push(a.map(String).join(' ')) }
    });
    return { ctl, state, dom, warns, errs, timers };
}

function flush(timers) { while (timers.length) timers.shift()(); }

// ---- fixtures -----------------------------------------------------------------------------
const DAY = 86400000;
function at(daysAgo, hour, minute = 0) {
    const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(hour, minute, 0, 0); return d.getTime();
}
function localYMD(daysAgo) {
    const d = new Date(); d.setDate(d.getDate() - daysAgo);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function rawOperativo() {
    return {
        'Ana Pérez': {
            [localYMD(0)]: { Retiros_Aprobados: 3, Retiros_Rechazados: 1, Tiempo_Total_Desde_Creacion_Segundos: 3600, Retiros_Procesados: 2 },
            [localYMD(2)]: { Retiros_Aprobados: 1, Retiros_Rechazados: 0, Tiempo_Total_Desde_Creacion_Segundos: 2400, Retiros_Procesados: 1 }
        },
        'Luis López': {
            [localYMD(1)]: { Retiros_Aprobados: 5, Retiros_Rechazados: 2, Tiempo_Total_Desde_Creacion_Segundos: 9000, Retiros_Procesados: 3 },
            [localYMD(9)]: { Retiros_Aprobados: 2, Retiros_Rechazados: 0, Tiempo_Total_Desde_Creacion_Segundos: 600, Retiros_Procesados: 1 }
        },
        'Oriana Borja': { [localYMD(0)]: { Retiros_Aprobados: 1, Retiros_Rechazados: 0, Tiempo_Total_Desde_Creacion_Segundos: 0, Retiros_Procesados: 0 } }
    };
}
function reportesFixture() {
    return {
        r1: {
            gestor: 'Ana María Pérez', timestamp: at(0, 14, 30), loginTime: at(0, 8, 2), horaInicio: '08:02 a. m.', horaFin: '04:10 p. m.',
            turnoProgramado: '8am - 4pm', status: 'Finalizado', tiempoAlmuerzoMins: 45, tiempoDesayunoMins: 10, tiempoPausaTurnoMins: 0,
            inactividadTotalMins: 12, penalidadConectividadMins: 3,
            timeline: [
                { type: 'Desayuno', start: at(0, 9, 0), end: at(0, 9, 10) },
                { type: 'Almuerzo', start: at(0, 12, 0), end: at(0, 12, 45) },
                { type: 'Inactividad', start: at(0, 10, 0), end: at(0, 10, 0) + 20000 },
                { type: 'Inactividad', start: at(0, 10, 30), end: at(0, 10, 42) },
                { type: 'Inactividad', start: at(0, 12, 20), end: at(0, 12, 30) },
                { type: 'Inactividad', start: at(0, 11, 0), end: at(0, 11, 8) }
            ],
            tasks: {
                t1: { status: 'finalizada', name: 'Revisión de cuentas', type: 'Operativa', observation: 'OK' },
                t2: { status: 'no_realizada', name: 'Tarea 7', type: 'Operativa' },
                t3: { status: 'pendiente', name: 'Conciliación', type: 'Admin' },
                extra_1: { status: 'finalizada', name: 'Extra [EXTRA] apoyo', type: 'Extra', observation: '' }
            }
        },
        r2: {
            gestor: 'Luis López', timestamp: at(1, 15, 5), loginTime: at(1, 15, 0), horaInicio: '3:00 PM', horaFin: '11:20 PM',
            turnoProgramado: '3pm - 11pm', status: 'Finalizado', tiempoAlmuerzoMins: 30, tiempoDesayunoMins: 0, tiempoPausaTurnoMins: 15,
            penalidadConectividadMins: 0,
            timeline: [
                { type: 'Almuerzo', start: at(1, 18, 0), end: at(1, 18, 30) },
                { type: 'Pausa de Turno', start: at(1, 20, 0), end: at(1, 20, 15) },
                { type: 'Inactividad', start: at(1, 18, 10), end: at(1, 18, 25) },
                { type: 'Inactividad', start: at(1, 21, 0), end: at(1, 21, 40) }
            ],
            tasks: { a: { status: 'finalizada', name: 'Llamadas', type: 'Operativa' }, b: { status: 'en proceso', name: 'Verificación', type: 'Operativa' } }
        },
        r3: {
            gestor: 'Ana Pérez', timestamp: at(2, 9, 0), horaInicio: '2026-10-13T08:00:00', horaFin: '2026-10-13T12:00:00',
            turnoProgramado: '8am - 4pm', status: 'Finalizado', inactividadTotalMins: 500,
            reporte: '=== BITÁCORA DE TIEMPOS ===\n[finalizada] - Cierre diario\nObservación: listo\n[no_realizada] - Tarea sin nombre\n[pendiente] - Pendiente X',
            tasks: undefined
        },
        r4: {
            gestor: 'Oriana Borja', timestamp: at(0, 7, 0), loginTime: at(0, 6, 0), horaInicio: '6:00 AM', horaFin: '1:00 PM',
            turnoProgramado: '8am - 4pm', status: 'En Línea', tiempoAlmuerzoMins: 0, tiempoDesayunoMins: 0, tiempoPausaTurnoMins: 0,
            tasks: { z: { status: 'finalizada', name: 'Tarea 2', type: 'Operativa' } },
            timeline: [{ type: 'Inactividad', start: at(0, 6, 30), end: null }]
        },
        r5_sin_fecha: { gestor: 'Luis López', horaInicio: '8:00 AM', horaFin: '9:00 AM', turnoProgramado: '8am - 4pm', tasks: { q: { status: 'pendiente', name: 'Sin fecha' } } },
        r7_entrada_tarde: {
            gestor: 'Ana Pérez', timestamp: at(0, 11, 0), loginTime: at(0, 11, 0), horaInicio: '11:00 AM', horaFin: '12:00 PM',
            turnoProgramado: '8am - 4pm', status: 'Finalizado', tiempoAlmuerzoMins: 0, tiempoDesayunoMins: 0, tiempoPausaTurnoMins: 0,
            timeline: [], tasks: { w: { status: 'finalizada', name: 'Turno tarde', type: 'Operativa' } }
        },
        r6_fuera_de_horario: {
            gestor: 'Luis López', timestamp: at(0, 23, 50), loginTime: at(0, 23, 50), horaInicio: '11:50 PM', horaFin: '02:00 AM',
            turnoProgramado: '8am - 4pm', status: 'Finalizado', penalidadConectividadMins: 9,
            timeline: [{ type: 'Inactividad', start: at(0, 23, 55), end: at(0, 23, 56) + 600000 }]
        }
    };
}

const REPORTES = reportesFixture();
const TODOS = Object.values(REPORTES);
const SCENARIOS = [];
const PERIODS = [['Todas', 'Todas'], ['today', 'today'], ['yesterday', 'yesterday'], ['7', '7'], ['30', '30'], ['thisMonth', 'thisMonth'], ['lastMonth', 'lastMonth']];
const SELECTIONS = [
    { nombre: 'todos', selected: [] },
    { nombre: 'uno exacto', selected: ['Ana Pérez'] },
    { nombre: 'uno parcial', selected: ['Ana Pérez Vargas'] },
    { nombre: 'varios', selected: ['Ana Pérez', 'Luis López'] }
];
const USERS = [{ role: 'Admin' }, { role: 'Supervisor' }, { role: 'Gestor' }];
for (const [pv, label] of PERIODS) for (const sel of SELECTIONS) for (const user of USERS) {
    SCENARIOS.push({ nombre: `${label} · ${sel.nombre} · ${user.role}`, periodValue: pv, selected: sel.selected, user, preloadRaw: true, data: 'todos' });
}
SCENARIOS.push({ nombre: 'custom 3 días · todos · Admin', periodValue: 'custom', customStart: localYMD(3), customEnd: localYMD(1), selected: [], user: { role: 'Admin' }, preloadRaw: true, data: 'todos' });
SCENARIOS.push({ nombre: 'custom mal definido', periodValue: 'custom', customStart: '', customEnd: '', selected: [], user: { role: 'Admin' }, preloadRaw: true, data: 'todos' });
SCENARIOS.push({ nombre: 'retiros: promedio 14,5 min (justo bajo el umbral)', periodValue: 'Todas', selected: [], user: { role: 'Admin' }, preloadRaw: true, data: 'todos',
    rawOverride: { 'Ana Pérez': { [localYMD(0)]: { Retiros_Aprobados: 1, Retiros_Rechazados: 0, Tiempo_Total_Desde_Creacion_Segundos: 870, Retiros_Procesados: 1 } } } });
SCENARIOS.push({ nombre: 'retiros: promedio 15,0 min (en el umbral)', periodValue: 'Todas', selected: [], user: { role: 'Admin' }, preloadRaw: true, data: 'todos',
    rawOverride: { 'Ana Pérez': { [localYMD(0)]: { Retiros_Aprobados: 1, Retiros_Rechazados: 0, Tiempo_Total_Desde_Creacion_Segundos: 900, Retiros_Procesados: 1 } } } });
SCENARIOS.push({ nombre: 'sin reportes · Admin', periodValue: 'Todas', selected: [], user: { role: 'Admin' }, preloadRaw: true, data: 'vacio' });
SCENARIOS.push({ nombre: 'sin datos operativos (carga fallida)', periodValue: '7', selected: [], user: { role: 'Admin' }, preloadRaw: false, data: 'todos', raw: 'fail' });
SCENARIOS.push({ nombre: 'carga perezosa de operativos (sin precargar)', periodValue: '30', selected: ['Luis López'], user: { role: 'Supervisor' }, preloadRaw: false, data: 'todos' });

// ---- comparación ----------------------------------------------------------------------------
let failed = 0; let total = 0;
function same(label, a, b, diffs) {
    total += 1;
    const sa = JSON.stringify(a); const sb = JSON.stringify(b);
    if (sa !== sb) { failed += 1; diffs.push(`${label}\n     oráculo:   ${sa.slice(0, 300)}\n     integrado: ${sb.slice(0, 300)}`); }
}
function compareScenario(scn) {
    const raw = scn.raw === 'fail' ? 'fail' : (scn.rawOverride || rawOperativo());
    const shiftReports = scn.data === 'vacio' ? null : clone(REPORTES);
    const shiftRaw = scn.data === 'vacio' ? null : shiftReports;
    const legacy = runLegacy(scn, shiftRaw ? clone(shiftRaw) : null, raw);
    const integ = runIntegrated(scn, shiftRaw ? clone(shiftRaw) : null, raw);
    const diffs = [];
    return (async () => {
        await legacy.ctx.calcularIndicadores();
        await integ.ctl.calcularIndicadores();
        flush(legacy.timers); flush(integ.timers);
        same('DOM completo', snapshotDom(legacy.dom), snapshotDom(integ.dom), diffs);
        same('kpiTaskLists', legacy.ctx.kpiTaskLists, integ.state.kpiTaskLists, diffs);
        same('kpiBitacoraHTML', legacy.ctx.kpiBitacoraHTML, integ.state.kpiBitacoraHTML, diffs);
        same('isFilteredByGestor', legacy.ctx.isFilteredByGestor === undefined ? null : legacy.ctx.isFilteredByGestor, integ.state.isFilteredByGestor === undefined ? null : integ.state.isFilteredByGestor, diffs);
        same('controlOperativoRawData cargado', legacy.ctx.controlOperativoRawData ? Object.keys(legacy.ctx.controlOperativoRawData) : null, integ.state.controlOperativoRawData ? Object.keys(integ.state.controlOperativoRawData) : null, diffs);
        same('advertencias (warn)', legacy.warns, integ.warns, diffs);
        same('errores (error)', legacy.errs.map((e) => e.split(' ')[0]), integ.errs.map((e) => e.split(' ')[0]), diffs);
        return diffs;
    })();
}

(async () => {
    console.log('=== DIFERENCIAL calcularIndicadores: oráculo legacy vs RiskOps.kpiController ===');
    for (const scn of SCENARIOS) {
        const diffs = await compareScenario(scn);
        const ok = diffs.length === 0;
        console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${scn.nombre}`);
        for (const d of diffs) console.log('     - ' + d);
        if (!ok) failed += 0;
    }
    console.log(`\nResultado: ${total - failed} de ${total} comparaciones iguales, ${failed} diferentes.`);
    process.exitCode = failed ? 1 : 0;
})();
