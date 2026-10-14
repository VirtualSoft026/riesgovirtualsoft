/**
 * Corte "KPIs, analítica y gráficas": paridad del app.js INTEGRADO del laboratorio con el original (2026-10-06).
 *
 * Ejecuta las funciones REALES de app.js (las que `lab/integracion/pasos/kpis.mjs` conecta) en un `vm` con DOM, Chart,
 * Firebase, `fetch`, reloj y temporizadores simulados, DOS veces con los mismos escenarios: contra el app.js original
 * del repositorio y contra el app.js integrado (que delega en el bundle real `RiskOps`). Compara todo lo observable:
 * DOM (antes y después de los temporizadores), filas de la tabla, gráficas creadas (con su configuración, comparando las
 * funciones por lo que devuelven), logs de consola, alertas, impresión, scroll, estado global y archivos pedidos a `fetch`.
 * Además afirma resultados absolutos por escenario ("iguales pero ambos rotos" no pasa) y que el integrado de verdad usa
 * el bundle (puente creado, funciones delegando).
 *
 * DIFERENCIAS INTENCIONALES por las decisiones D5 y D9b (plan maestro §4 ter, 2026-10-06). El integrado ya NO debe ser
 * idéntico al original en estos puntos, y la prueba afirma el comportamiento NUEVO:
 *  - D9b: el original excluye supervisores con `SUPERVISORES_NOMBRES` por SUBCADENA; el integrado, por ROL en `users`
 *    (nombre completo exacto). Para seguir comparando todo lo demás, el ORIGINAL se ejecuta con un ORÁCULO: su línea
 *    `const SUPERVISORES_NOMBRES = [...]` se sustituye por los nombres EXACTOS de los usuarios con rol Supervisor/Admin que
 *    el integrado llegó a leer (lista vacía si el escenario no lee `users`, porque sin directorio el integrado no excluye a
 *    nadie). Es equivalente porque ninguna llave de los datos contiene el nombre de otra persona. Los escenarios K15-D9b
 *    muestran la diferencia con la lista fija REAL (Mariana/Oriana ocultas en el original, visibles en el integrado).
 *  - D5: "Varios" (2+ gestores) ya no lanza TypeError (K9b), "mes anterior" el 31-mar es febrero (K16) y el turno
 *    nocturno se agrupa en su día operativo LOCAL (K17). Estos escenarios llevan `intencional: true`: no se exige
 *    igualdad, se afirma por modo lo que hace cada versión.
 * La zona horaria del proceso se fija en America/Bogota (UTC-5) al inicio, para que K17 sea determinista.
 *
 * Uso: node kpis-integrado.e2e.cjs <app.integrado.js> --riskops <bundle.js> [--original <app.js>]
 *   (el integrado: node /tmp/riskops-integrate.mjs /tmp/kpis-integrado.js ; el bundle: node /tmp/riskops-bundle.mjs /tmp/kpis-bundle.js)
 * Sale con código 1 si algo falla.
 */
process.env.TZ = 'America/Bogota'; // D5: zona fija (UTC-5) antes de crear cualquier fecha
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');
const { pathToFileURL } = require('url');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const INTEGRATED_PATH = args.find((a) => !a.startsWith('--') && a.endsWith('.js') && a !== opt('--riskops') && a !== opt('--original'));
const BUNDLE_PATH = opt('--riskops', null);
const ORIGINAL_PATH = opt('--original', '/mnt/user-data/uploads/riesgovirtualsoft/app.js');
if (!INTEGRATED_PATH || !BUNDLE_PATH) { console.error('Uso: node kpis-integrado.e2e.cjs <app.integrado.js> --riskops <bundle.js> [--original <app.js>]'); process.exit(2); }

const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const ORIGINAL = read(ORIGINAL_PATH);
const INTEGRATED = read(INTEGRATED_PATH);
const BUNDLE = fs.readFileSync(BUNDLE_PATH, 'utf8');
const MARK = '[LAB-INTEGRACION]';
const BRIDGE_MARK = '// [LAB-INTEGRACION] Puente app.js -> RiskOps (corte "kpis")';
if (!INTEGRATED.includes(BRIDGE_MARK)) { console.error('El app.js recibido no es el integrado del corte kpis (falta el puente).'); process.exit(2); }
if (ORIGINAL.includes(MARK)) { console.error('--original debe ser el app.js del repositorio, sin integrar.'); process.exit(2); }

const MS = 'operativoGestorMultiSelect';
const NOW = new Date(2026, 9, 6, 15, 0, 0).getTime();
const clone = (o) => JSON.parse(JSON.stringify(o));

// ------------------------------------------------------------------ extracción de código real
function between(src, startMarker, endMarker) {
    const s = src.indexOf(startMarker);
    if (s < 0) throw new Error('No se encontró: ' + startMarker);
    const e = src.indexOf(endMarker, s);
    if (e < 0) throw new Error('No se encontró fin: ' + endMarker);
    return src.slice(s, e);
}
function fn(src, header) {
    const s = src.indexOf(header);
    if (s < 0) throw new Error('No se encontró: ' + header);
    return src.slice(s, src.indexOf('\n}\n', s) + 3);
}
/** @param {string[]|null} oraculo lista que sustituye a SUPERVISORES_NOMBRES (solo en el original); null = la real. */
function codeFor(src, oraculo = null) {
    const supervisores = between(src, 'const SUPERVISORES_NOMBRES = [', '\n') + '\n';
    return [
        oraculo === null ? supervisores : `const SUPERVISORES_NOMBRES = ${JSON.stringify(oraculo)}; // ORÁCULO D9b (prueba)\n`,
        fn(src, 'function escapeHTML(str) {'),
        between(src, 'window.kpiUsersData = {}; // email -> name', 'async function calcularIndicadores() {'),
        between(src, '// Modal de Detalle de Tareas (KPIs)', '// Inicialización al cargar el DOM'),
        between(src, 'let controlOperativoCharts = {};', '// ==========================================\n// ACTIVE SUPERVISOR BADGE LOGIC')
    ].join('\n');
}
/** Cierre `parseTime` de calcularIndicadores (original: 20 líneas; integrado: una línea que delega). */
function parseTimeSnippet(src) {
    const s = src.indexOf('            const parseTime = (timeStr, baseDateMs) => {') >= 0
        ? src.indexOf('            const parseTime = (timeStr, baseDateMs) => {') : src.indexOf('            const parseTime = (timeStr, baseDateMs) => RiskOps');
    if (s < 0) throw new Error('No se encontró parseTime');
    const first = src.slice(s, src.indexOf('\n', s));
    if (first.includes('=> RiskOps')) return first + '\n';
    return src.slice(s, src.indexOf('                return NaN;\n            };\n', s) + '                return NaN;\n            };\n'.length);
}

// ------------------------------------------------------------------ entorno
let T; // utilidades de pruebas (ESM)

const SUPERVISORES = ['Sara Santamaría', 'Sara Santamaria', 'Maria Sanchez', 'Camilo Espinosa', 'Oriana Borja', 'Sara', 'Maria', 'Camilo', 'Oriana'];

/**
 * Oráculo D9b para el ORIGINAL: nombres exactos de los usuarios con rol Supervisor/Admin que el integrado leerá
 * (si el escenario no lee `users` o la lectura falla, lista vacía). `opts.supervisoresOraculo` lo fija a mano; `null` = la
 * lista fija REAL de app.js (escenarios que muestran la diferencia).
 */
function oraculoSupervisores(opts) {
    if (opts.supervisoresOraculo !== undefined) return opts.supervisoresOraculo;
    if (!opts.users || opts.usersFail) return [];
    return Object.values(opts.users).filter((u) => u && (u.role === 'Supervisor' || u.role === 'Admin') && u.name).map((u) => u.name.trim());
}

function makeEnv(mode, opts = {}) {
    const src = mode === 'integrado' ? INTEGRATED : ORIGINAL;
    const dom = T.makeDom({ missing: opts.missingDom || [] });
    const { FakeChart, log: chartLog } = T.makeFakeChart();
    const FixedDate = T.makeFixedDate(opts.nowMs || NOW);
    const logs = [], alerts = [], timeouts = [], scrolls = [], setups = [], fetched = [];
    const calc = { count: 0 };
    const selected = clone(opts.selected || {});
    const mk = (level) => (...a) => logs.push([level, ...a.map((x) => (x instanceof Error ? 'Error:' + x.message : x))]);
    const window = {
        location: { hostname: opts.hostname || 'riskops.example.com', protocol: 'https:' },
        print: () => timeouts.push({ printed: true }), scrollTo: (o) => scrolls.push(o)
    };

    dom.getElementById('filtroFechaOperativo').value = opts.filtroFecha || 'Todas';
    dom.getElementById('operativoDateStart').value = opts.customStart || '';
    dom.getElementById('operativoDateEnd').value = opts.customEnd || '';
    const sel = dom.getElementById('filtroFechaOperativo');
    sel.options = [{ text: 'Todas las fechas' }, { text: 'Hoy' }, { text: 'Ayer' }, { text: 'Personalizado' }];
    sel.selectedIndex = opts.selectedIndex === undefined ? 0 : opts.selectedIndex;
    dom.getElementById('qs:#tablaResumenOperativo').parentElement = { outerHTML: '<div id="tableWrapper"><table>…</table></div>' };
    dom.els.set('tablaResumenOperativo', dom.getElementById('qs:#tablaResumenOperativo'));
    ['printChart1', 'printChart2', 'printChart3', 'printChart4', 'printChart5'].forEach((id) => {
        if ((opts.missingDom || []).includes(id)) return;
        const img = dom.getElementById(id);
        img.parentElement = { style: {} };
        img.previousElementSibling = { style: {}, innerText: '' };
    });
    dom.getElementById('kpiGestorSelect').options = opts.kpiSelectOptions || [];

    const database = {
        ref: (p) => ({
            once: async () => {
                if (opts.usersFail && p === 'users') throw new Error('fallo users');
                if (opts.shiftFail && p === 'shift_reports') throw new Error('fallo shift_reports');
                const val = p === 'users' ? (opts.users === undefined ? null : opts.users) : (p === 'shift_reports' ? (opts.shiftReports === undefined ? null : opts.shiftReports) : null);
                return { exists: () => val !== null && val !== undefined, val: () => clone(val) };
            }
        })
    };
    const raw = opts.raw === undefined ? null : opts.raw;
    const fetchFn = async (url) => {
        fetched.push(String(url).replace(/\?v=\d+$/, '?v=T'));
        if (opts.dataFail) return { ok: false, json: async () => ({}) };
        if (String(url).startsWith('kpi_operativos_seed.json')) {
            if (opts.seedThrows) throw new Error('seed boom');
            const seed = opts.seed;
            return { ok: seed !== undefined && seed !== null, json: async () => clone(seed) };
        }
        return { ok: true, json: async () => clone(raw) };
    };

    const ctx = {
        window, document: dom, Chart: FakeChart, Date: FixedDate, database, fetch: fetchFn,
        alert: (m) => alerts.push(m), console: { log: mk('log'), warn: mk('warn'), error: mk('error') },
        setTimeout: (f, ms) => { timeouts.push({ f, ms }); return timeouts.length; },
        Math, JSON, Object, Array, Set, Map, Promise, parseInt, parseFloat, isNaN, isFinite, String, Number, RegExp, Error, TypeError, RangeError,
        encodeURIComponent, decodeURIComponent, Intl
    };
    if (opts.withDatalabels) ctx.ChartDataLabels = { id: 'datalabels-plugin' };
    vm.createContext(ctx);
    if (mode === 'integrado') vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);

    const prelude = `
function getSelectedMultiSelectValues(id) { return [...(__selected[id] || [])]; }
function setCustomMultiSelectValues(id, v) { __selected[id] = [...v]; }
function setupCustomMultiSelect(id, list, cb) { __setups.push({ id, list: [...list], hasCb: typeof cb === 'function' }); }
function calcularIndicadores() { __calc.count += 1; }
`;
    ctx.__selected = selected; ctx.__setups = setups; ctx.__calc = calc;
    window.kpiUsersData = opts.kpiUsersData ? clone(opts.kpiUsersData) : undefined; // el original lo inicializa con {}
    vm.runInContext(prelude + codeFor(src, mode === 'integrado' ? null : oraculoSupervisores(opts)) + `
this.api = {
    fetchKpiOperativosData, loadRetirosData, loadGestoresForKPIs, openKpiTaskDetails, closeKpiTaskDetails, destroyChart,
    toggleOperativoCustomDates, generarAnalisisTextual, generarReporteEjecutivoPDF, loadControlOperativoData,
    renderControlOperativoFiltered, renderControlOperativoCharts, drawPunctualDatesChart, drawChart, drawCombinedChart,
    drawCombinedChartDaily, drawScatterMatriz, getCharts: () => controlOperativoCharts,
    bridgeUsed: () => ${mode === 'integrado' ? '__labKpiController !== null' : 'false'}
};`, ctx);
    if (opts.kpiUsersData) window.kpiUsersData = clone(opts.kpiUsersData);
    else if (opts.kpiUsersData === undefined) window.kpiUsersData = {};
    if (opts.kpiTaskLists !== undefined) window.kpiTaskLists = opts.kpiTaskLists === null ? null : clone(opts.kpiTaskLists);
    if (raw !== null && opts.preloadRaw) window.controlOperativoRawData = clone(raw);
    return { mode, api: ctx.api, ctx, dom, window, logs, alerts, timeouts, scrolls, setups, fetched, calc, selected, chartLog };
}

function observe(env) {
    const charts = env.api.getCharts();
    return JSON.parse(JSON.stringify({
        dom: T.snapshotDom(env.dom),
        rows: env.dom.getElementById('qs:#tablaResumenOperativo tbody').children.map((r) => ({ title: r.title, style: { ...r.style }, html: r.innerHTML, hasOnclick: typeof r.onclick === 'function' })),
        charts: Object.keys(charts).sort().map((id) => ({ id, destroyed: charts[id].destroyed, ctx: charts[id].ctx, config: T.normalizeConfig(charts[id].config) })),
        chartLog: env.chartLog,
        logs: env.logs, alerts: env.alerts, calc: env.calc.count, setups: env.setups, scrolls: env.scrolls,
        timeouts: env.timeouts.map((t) => (t.printed ? 'print' : { ms: t.ms })),
        selected: env.selected, raw: env.window.controlOperativoRawData, retiros: env.window.retirosGlobalData,
        kpiUsersData: env.window.kpiUsersData, fetched: env.fetched
    }, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v)));
}
const flushTimers = (env) => env.timeouts.filter((t) => typeof t.f === 'function').forEach((t) => { const f = t.f; t.f = null; f(); });
const macrotask = () => new Promise((r) => setTimeout(r, 0));

// ------------------------------------------------------------------ datos
const RAW = () => {
    const rng = T.makeRng(11);
    return T.makeRawData(rng, { gestores: 6, dias: 35 });
};
let GESTORES = []; // se calcula tras cargar las utilidades de prueba
const USERS = () => ({
    u1: { email: 'Oriana@x.com', name: ' Oriana Borja ', role: 'Gestor', approved: true },
    u2: { email: 'ana@x.com', name: 'Ana Pérez', role: 'Gestor', approved: true },
    u3: { email: 'daniel@x.com', name: 'Daniel Ríos', role: 'Gestor', approved: false },
    u4: { email: 'luis@x.com', name: 'Luis Alberto', role: 'Gestor', approved: true },
    u5: { email: 'sup@x.com', name: 'Marilyn Soto', role: 'Supervisor', approved: true },
    u6: { email: 'mari@x.com', name: 'Marilyn Soto', role: 'Gestor', approved: true }
});
const REPORTS = () => ({
    r1: { rol: 'Gestor', gestor: 'Ana Pérez', timestamp: NOW - 3600000, loginTime: NOW - 7200000, turnoProgramado: '8am - 4pm', tardanzaMins: 12, timeline: [{ type: 'Inactividad', start: NOW - 5000000, end: NOW - 4000000 }] },
    r2: { rol: 'Gestor', gestor: 'Nuevo Gestor', timestamp: NOW - 86400000, tardanzaMins: 0 },
    r3: { rol: 'Admin', gestor: 'Ana Pérez', timestamp: NOW - 86400000 }
});
const TASKS = () => ({
    finalizadas: [{ name: 'Tarea <b>1</b>', date: '2026-10-05', type: 'adicional', observation: 'Obs "x" & y' }, { name: 'Dos', date: '2026-10-04', observation: '' }],
    no_realizadas: [{ name: 'N1', date: '2026-10-03', type: 'set', observation: "o'k" }],
    pendientes: []
});
const GESTORES_DATA = {
    'Ana Pérez': { Retiros_Aprobados: 40, Retiros_Rechazados: 8, Tasa_Aprobacion_Dia: 5.33, Porcentaje_Rechazos: 16.67, Prom_Minutos_Tarde: 12.5, Prom_Inactividad_Diaria: 50, Retiros_Procesados: 48 },
    'Luis Gómez': { Retiros_Aprobados: 100, Retiros_Rechazados: 2, Tasa_Aprobacion_Dia: 14.3, Porcentaje_Rechazos: 1.96, Prom_Minutos_Tarde: 0, Prom_Inactividad_Diaria: 10, Retiros_Procesados: 102 },
    'Zoe Ríos': { Retiros_Aprobados: 0, Retiros_Rechazados: 0, Tasa_Aprobacion_Dia: 0, Porcentaje_Rechazos: 0, Prom_Minutos_Tarde: 0, Prom_Inactividad_Diaria: 0, Retiros_Procesados: 0 }
};

// ------------------------------------------------------------------ escenarios
const scenarios = [];
const S = (id, name, setup, run, assertAbsolute, opts = {}) => scenarios.push({ id, name, setup, run, assertAbsolute, ...opts });
const eq = (actual, expected, msg) => assert.deepStrictEqual(clone(actual), expected, msg); // los objetos del vm son de otro "realm": se comparan por valor
const asErr = async (f) => { try { await f(); return null; } catch (e) { return e.constructor.name + ': ' + e.message; } };

S('K1', 'fetchKpiOperativosData: producción, localhost con semilla, 127.0.0.1, semilla vacía, sin semilla y semilla que falla', () => [
    { hostname: 'riskops.example.com', raw: { A: {} }, seed: { S: {} } },
    { hostname: 'localhost', raw: { A: {} }, seed: { S: { '2026-10-01': { Retiros_Aprobados: 1 } } } },
    { hostname: '127.0.0.1', raw: { A: {} }, seed: { S: {} } },
    { hostname: 'localhost', raw: { A: {} }, seed: {} },
    { hostname: 'localhost', raw: { A: {} }, seed: null },
    { hostname: 'localhost', raw: { A: {} }, seedThrows: true },
    { hostname: 'riskops.example.com', raw: { A: {} }, dataFail: true }
], async (envs) => {
    const out = [];
    for (const env of envs) { let r; const e = await asErr(async () => { r = await env.api.fetchKpiOperativosData(); }); out.push({ r, e, fetched: env.fetched, logs: env.logs }); }
    return out;
}, (res) => {
    assert.deepStrictEqual(res[0].r, { A: {} }, 'producción ignora la semilla');
    eq(Object.keys(res[1].r), ['S'], 'localhost usa la semilla');
    assert.deepStrictEqual(res[1].fetched, ['kpi_operativos_seed.json?v=T']);
    assert.deepStrictEqual(res[3].fetched, ['kpi_operativos_seed.json?v=T', 'kpi_operativos_v2.json?v=T'], 'semilla vacía cae al archivo estándar');
    assert.ok(res[5].logs.some((l) => l[0] === 'warn'), 'una semilla que falla avisa y sigue');
    assert.ok(res[6].e.includes('No se pudo cargar kpi_operativos_v2.json'));
}, { bridgeless: true }); // delega directamente en RiskOps.kpiOperativosSource (no usa el controlador)

S('K2', 'loadRetirosData: éxito y error', () => [{ raw: { A: { '2026-10-05': { Retiros_Aprobados: 1 } }, B: {} } }, { raw: {}, dataFail: true }],
    async (envs) => { for (const env of envs) await env.api.loadRetirosData(); },
    (_, envs) => {
        eq(Object.keys(envs[0].window.retirosGlobalData), ['A', 'B']);
        assert.strictEqual(envs[0].window.controlOperativoRawData, envs[0].window.retirosGlobalData);
        assert.strictEqual(envs[1].window.retirosGlobalData, null);
    });

S('K3', 'loadGestoresForKPIs: llena el desplegable, no recarga si ya está lleno, tolera fallos y usuarios sin nombre', () => [
    { users: USERS() }, { users: USERS(), kpiSelectOptions: [{}, {}, {}] }, { users: null }, { users: USERS(), usersFail: true },
    { users: { a: { email: 'a@x.com', role: 'Gestor', approved: true } } }
], async (envs) => { for (const env of envs) { env.__ret = env.api.loadGestoresForKPIs(); await macrotask(); await macrotask(); } },
(_, envs) => {
    const sel = envs[0].dom.getElementById('kpiGestorSelect');
    assert.deepStrictEqual(sel.children.map((c) => c.value), ['Luis Alberto', 'Marilyn Soto', 'Oriana Borja']);
    assert.strictEqual(envs[0].calc.count, 1, 'dispara calcularIndicadores');
    assert.strictEqual(envs[1].dom.getElementById('kpiGestorSelect').children.length, 0, 'ya cargado: no toca nada');
    assert.strictEqual(envs[0].__ret, undefined, 'devuelve undefined como el original');
    assert.ok(envs[4].logs.some((l) => l[0] === 'error' && String(l[1]).includes('Error populating KPI gestores dropdown')));
});

S('K4', 'parseTime (cierre de calcularIndicadores): 4000 entradas con semilla + particulares', () => null, async () => {
    const out = {};
    const T0 = Date.UTC(2026, 9, 6, 12);
    for (const mode of ['original', 'integrado']) {
        const src = mode === 'integrado' ? INTEGRATED : ORIGINAL;
        const ctx = { Date: T.makeFixedDate(NOW), Math, parseInt, isNaN, String, Number };
        vm.createContext(ctx);
        if (mode === 'integrado') vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);
        vm.runInContext('function __mk() {\n' + parseTimeSnippet(src) + '\nreturn parseTime; }\nthis.parseTime = __mk();', ctx);
        const rng = T.makeRng(7);
        const res = [];
        const meridianos = ['', ' AM', ' PM', ' a. m.', ' p. m.', ' a.m.', ' p.m.', 'am', 'pm', ' P. M.'];
        for (let i = 0; i < 4000; i++) {
            const h = Math.floor(rng() * 14), m = Math.floor(rng() * 70);
            const s = rng() < 0.1 ? `${h}:${String(m).padStart(2, '0')}:${Math.floor(rng() * 60)}` : `${h}:${String(m).padStart(2, '0')}`;
            res.push(String(ctx.parseTime(s + meridianos[Math.floor(rng() * meridianos.length)], T0 + Math.floor(rng() * 5) * 86400000)));
        }
        for (const raro of ['', null, undefined, 12, 'abc', '10/6/2026, 3:05:00 p. m.', '2026-10-05T08:00:00', '5', 'Mon Oct 05 2026 08:00:00 GMT-0500', '13:45 PM', '12:30 AM']) res.push(String(ctx.parseTime(raro, T0)));
        out[mode] = res;
    }
    return out;
}, (res) => {
    assert.strictEqual(res.original.length, 4011);
    assert.ok(res.original.some((x) => x !== 'NaN'), 'hay horas válidas');
    assert.deepStrictEqual(res.integrado, res.original, 'parseTime integrado = parseTime original en todas las entradas');
});

S('K5', 'openKpiTaskDetails/closeKpiTaskDetails: cada tipo, tipo desconocido, sin listas, cierre', () => [
    { kpiTaskLists: TASKS() }, { kpiTaskLists: TASKS() }, { kpiTaskLists: TASKS() }, { kpiTaskLists: TASKS() }, { kpiTaskLists: null }
], async (envs) => {
    const tipos = ['finalizadas', 'no_realizadas', 'pendientes', 'otro', 'finalizadas'];
    envs.forEach((env, i) => env.api.openKpiTaskDetails(tipos[i]));
    envs[0].api.closeKpiTaskDetails();
}, (_, envs) => {
    assert.strictEqual(envs[0].dom.getElementById('kpiTaskDetailsModal').classList.contains('active'), false, 'cerrado');
    assert.strictEqual(envs[1].dom.getElementById('kpiModalTitle').textContent, 'Tareas No Realizadas');
    assert.ok(envs[1].dom.getElementById('kpiModalTaskList').innerHTML.includes('N1'));
    assert.ok(envs[2].dom.getElementById('kpiModalTaskList').innerHTML.includes('No hay tareas en este estado.'));
    assert.ok(envs[3].dom.getElementById('kpiTaskDetailsModal').classList.contains('active'));
    assert.strictEqual(envs[4].dom.getElementById('kpiTaskDetailsModal').classList.contains('active'), false, 'sin listas no abre');
});

S('K6', 'toggleOperativoCustomDates y destroyChart', () => [{ filtroFecha: 'custom' }, { filtroFecha: 'Todas' }], async (envs) => {
    envs.forEach((e) => e.api.toggleOperativoCustomDates());
    const e = envs[0];
    e.api.drawChart('chartInactividad', 'bar', ['A'], [1], 'Min', 'c', 'b');
    e.api.destroyChart('chartInactividad');
    e.api.destroyChart('noExiste');
}, (_, envs) => {
    assert.strictEqual(envs[0].dom.getElementById('operativoCustomDateContainer').style.display, 'flex');
    assert.strictEqual(envs[1].dom.getElementById('operativoCustomDateContainer').style.display, 'none');
    eq(Object.keys(envs[0].api.getCharts()), [], 'destroyChart retira del registro de app.js');
});

S('K7', 'renderControlOperativoFiltered: 7 periodos x 5 selecciones (tabla, widgets, anillos y gráficas)', () => {
    const out = [];
    const selecciones = [[], [GESTORES[0]], [GESTORES[0], GESTORES[1]], ['Oriana Borja'], ['Nadie']];
    for (const filtro of ['Todas', 'today', 'yesterday', '7', '30', 'thisMonth', 'lastMonth'])
        for (const sel of selecciones) out.push({ raw: RAW(), preloadRaw: true, filtroFecha: filtro, selected: { [MS]: sel }, withDatalabels: out.length % 2 === 0 });
    out.push({ raw: RAW(), preloadRaw: true, filtroFecha: 'custom', customStart: '2026-09-20', customEnd: '2026-10-02' });
    out.push({ raw: RAW(), preloadRaw: true, filtroFecha: 'custom', customStart: '', customEnd: '' });
    out.push({ raw: RAW(), preloadRaw: false }); // sin datos cargados: no hace nada
    return out;
}, async (envs) => { for (const env of envs) env.api.renderControlOperativoFiltered(); }, (_, envs) => {
    const e = envs[0];
    assert.ok(e.dom.getElementById('qs:#tablaResumenOperativo tbody').children.length > 0, 'hay filas');
    assert.ok(Object.keys(e.api.getCharts()).length >= 5, 'se dibujaron las gráficas');
    assert.strictEqual(e.calc.count, 1);
    assert.strictEqual(envs[envs.length - 1].calc.count, 0, 'sin datos no recalcula');
});

S('K8', 'clic en una fila: filtra por el gestor; segundo clic quita el filtro; hover', () => [{ raw: RAW(), preloadRaw: true }], async ([env]) => {
    env.api.renderControlOperativoFiltered();
    const rows = () => env.dom.getElementById('qs:#tablaResumenOperativo tbody').children;
    const nombre = rows()[0].innerHTML;
    env.__after1 = [...env.selected[MS] || []]; // antes del clic
    rows()[0].onmouseover(); env.__over = rows()[0].style.background; rows()[0].onmouseout();
    rows()[0].onclick();
    env.__after = [...env.selected[MS]];
    rows()[0].onclick();
    env.__nombre = nombre;
}, (_, [env]) => {
    assert.strictEqual(env.__after.length, 1);
    eq(env.selected[MS], []);
    assert.strictEqual(env.scrolls.length, 2);
    assert.strictEqual(env.__over, 'var(--bg-secondary, #f8f9fa)');
});

S('K9', 'generarAnalisisTextual: sin datos, global, un gestor y periodo personalizado ("Varios" pasa a K9b por D5)', () => [
    { filtroFecha: '30' }, { raw: RAW(), preloadRaw: true, filtroFecha: '30' }, { raw: RAW(), preloadRaw: true, selected: { [MS]: [GESTORES[1]] } },
    { raw: RAW(), preloadRaw: true, filtroFecha: 'custom', customStart: '2026-09-25', customEnd: '2026-10-03' }
], async (envs) => { for (const env of envs) env.__err = await asErr(() => env.api.generarAnalisisTextual()); },
(_, envs) => {
    assert.ok(envs[0].alerts[0].startsWith('Aún no se han cargado los datos.'));
    assert.ok(envs[1].dom.getElementById('analysisModalBody').innerHTML.length > 100);
    assert.ok(envs[1].dom.getElementById('analysisModal').classList.contains('active'));
});

S('K9b', 'D5 (DIFERENCIA INTENCIONAL): "Varios" (2 y 3 gestores) — original lanza TypeError; integrado muestra el resumen de los seleccionados', () => [
    { raw: RAW(), preloadRaw: true, selected: { [MS]: [GESTORES[0], GESTORES[1]] } },
    { raw: RAW(), preloadRaw: true, filtroFecha: '30', selected: { [MS]: [GESTORES[0], GESTORES[1], GESTORES[2]] } }
], async (envs) => { for (const env of envs) env.__err = await asErr(() => env.api.generarAnalisisTextual()); },
(_, envs) => {
    for (const env of envs) {
        const html = env.dom.getElementById('analysisModalBody').innerHTML;
        if (env.mode === 'original') {
            assert.ok(env.__err && env.__err.startsWith('TypeError'), 'original: TypeError');
            assert.strictEqual(env.dom.getElementById('analysisModal').classList.contains('active'), false);
        } else {
            assert.strictEqual(env.__err, null, 'integrado: sin error');
            assert.ok(env.dom.getElementById('analysisModal').classList.contains('active'), 'integrado: el modal se abre');
            assert.ok(html.includes('Resumen Ejecutivo del Equipo'), 'resumen del equipo seleccionado');
            const otros = GESTORES.filter((g) => !env.selected[MS].includes(g));
            assert.ok(otros.every((g) => !html.includes(g)), 'solo aparecen gestores seleccionados');
        }
    }
}, { intencional: true });

S('K10', 'generarReporteEjecutivoPDF: informe con todas las gráficas, custom, sin gráficas y con imágenes ausentes; imprime a los 800 ms', () => [
    { raw: RAW(), preloadRaw: true }, { raw: RAW(), preloadRaw: true, selectedIndex: 1 },
    { raw: RAW(), preloadRaw: true, filtroFecha: 'custom', selectedIndex: 3, customStart: '2026-09-01', customEnd: '2026-09-30', selected: { [MS]: [GESTORES[0], GESTORES[2]] } },
    { raw: RAW(), preloadRaw: true, filtroFecha: 'custom', selectedIndex: 3 },
    { raw: RAW(), preloadRaw: true, missingDom: ['printChart2', 'printChart5'] },
    { raw: RAW(), preloadRaw: true, missingDom: ['printTableContainer'] }
], async (envs) => {
    for (let i = 0; i < envs.length; i++) {
        const env = envs[i];
        // i === 2 tiene 2 gestores: su análisis ("Varios") difiere a propósito por D5 (ver K9b); aquí solo se prueba el informe
        if (i !== 3) { env.api.renderControlOperativoFiltered(); if (i !== 2) env.__err = await asErr(() => env.api.generarAnalisisTextual()); }
        env.api.generarReporteEjecutivoPDF();
        env.__ms = env.timeouts.map((t) => (t.printed ? 'print' : t.ms));
        flushTimers(env);
    }
}, (_, envs) => {
    assert.deepStrictEqual(envs[0].__ms, [800]);
    assert.ok(envs[0].timeouts.some((t) => t.printed), 'se llamó a window.print');
    assert.ok(envs[0].dom.getElementById('printReportMeta').innerText.startsWith('Fecha de generación: '));
    assert.ok(envs[0].dom.getElementById('printChart1').src.startsWith('data:image/png;base64,'), 'gráfica capturada');
    assert.ok(envs[3].dom.getElementById('printReportMeta').innerText.includes('Personalizado (Inicio a Fin)'));
    assert.strictEqual(envs[3].dom.getElementById('printChart1').style.display, 'none', 'sin gráficas dibujadas la imagen se oculta');
    assert.ok(envs[0].dom.getElementById('printTableContainer').innerHTML.includes('Resumen de Retiros por Gestor'));
});

S('K11', 'loadControlOperativoData: éxito, sin base de usuarios, usuarios ya cargados, fallos de lectura y de datos', () => [
    { raw: RAW(), users: USERS(), shiftReports: REPORTS() }, { raw: RAW(), users: null, shiftReports: null },
    { raw: RAW(), users: USERS(), shiftReports: REPORTS(), kpiUsersData: { 'x@x.com': 'X' } },
    { raw: RAW(), users: USERS(), shiftReports: REPORTS(), usersFail: true }, { raw: RAW(), users: USERS(), shiftReports: REPORTS(), shiftFail: true },
    { raw: RAW(), dataFail: true }, { raw: RAW(), users: USERS(), shiftReports: { r1: { rol: 'Gestor', gestor: 'Ana Pérez', timestamp: 'x' } } }
], async (envs) => { for (const env of envs) await env.api.loadControlOperativoData(); }, (_, envs) => {
    assert.strictEqual(envs[0].setups.length, 1);
    assert.strictEqual(envs[0].setups[0].id, MS);
    assert.ok(Object.keys(envs[0].window.controlOperativoRawData).includes('Nuevo Gestor'), 'un gestor nuevo de shift_reports entra al JSON');
    assert.strictEqual(envs[0].window.kpiUsersData['oriana@x.com'], 'Oriana Borja');
    assert.ok(envs[5].alerts[0].startsWith('Error cargando datos operativos. Detalle: '));
    assert.ok(envs[3].logs.some((l) => l[0] === 'error' && String(l[1]).includes('Error fetching shift_reports')));
});

S('K12', 'drawChart / drawPunctualDatesChart / drawCombinedChart / drawCombinedChartDaily / drawScatterMatriz directos (con y sin datalabels)', () => [
    { withDatalabels: false, raw: RAW(), preloadRaw: true }, { withDatalabels: true, raw: RAW(), preloadRaw: true }
], async (envs) => {
    for (const env of envs) {
        const a = env.api;
        a.drawChart('chartInactividad', 'bar', ['A', 'B'], [1, 2.5], 'Minutos', ['rgba(1)', 'rgba(2)'], ['rgba(1)', 'rgba(2)']);
        a.drawChart('chartTardanzasPeores', 'bar', ['A'], [0], 'Min', ['c'], ['b'], { indexAxis: 'y' });
        a.drawChart('chartInactividad', 'line', ['x'], [3], 'L', 'red', 'blue', { layout: { padding: 5 }, plugins: { legend: { display: false } } });
        a.drawPunctualDatesChart('chartTardanzasMejores', ['2026-10-01', '2026-10-02'], [0, 0], ['rojo', 'azul']);
        a.drawCombinedChart('chartEficiencia', Object.keys(GESTORES_DATA), clone(GESTORES_DATA));
        env.__e1 = await asErr(() => a.drawCombinedChart('chartEficiencia', ['No existe'], clone(GESTORES_DATA))); // destruye la anterior y luego falla
        a.drawCombinedChart('chartEficiencia', Object.keys(GESTORES_DATA), clone(GESTORES_DATA));
        const fechas = Object.keys(env.window.controlOperativoRawData[GESTORES[0]] || {}).sort().slice(0, 10);
        a.drawCombinedChartDaily('chartAprobacionesDia', fechas, GESTORES[0]);
        a.drawCombinedChartDaily('chartAprobacionesDia', fechas, 'Otro');
        a.drawScatterMatriz('chartMatrizFuga', Object.keys(GESTORES_DATA), clone(GESTORES_DATA), true);
        a.drawScatterMatriz('chartMatrizFuga', ['Ana Pérez'], clone(GESTORES_DATA), false);
        env.__e2 = await asErr(() => a.drawChart('noExisteEnDom', 'bar', [], [], 'x', 'c', 'b'));
    }
}, (_, envs) => {
    const charts = envs[0].api.getCharts();
    assert.ok(['chartInactividad', 'chartTardanzasPeores', 'chartTardanzasMejores', 'chartEficiencia', 'chartAprobacionesDia', 'chartMatrizFuga'].every((k) => charts[k]), 'las 6 gráficas registradas en el MISMO registro de app.js');
    assert.ok(envs[0].__e1 && envs[0].__e1.startsWith('TypeError'), 'datos faltantes: TypeError como el original');
    assert.ok(envs[0].chartLog.some((l) => l.op === 'destroy'), 'redibujar destruye la gráfica anterior');
});

S('K13', 'renderControlOperativoCharts directo: global, un gestor y varios', () => [
    { raw: RAW(), preloadRaw: true, selected: { [MS]: [] } }, { raw: RAW(), preloadRaw: true, selected: { [MS]: [GESTORES[0]] } },
    { raw: RAW(), preloadRaw: true, selected: { [MS]: [GESTORES[0], GESTORES[1]] }, missingDom: ['titleInactividad', 'titleMatrizFuga'] }
], async (envs) => {
    const tags = ['Todos', GESTORES[0], '2 Gestores'];
    envs.forEach((env, i) => {
        const daily = {};
        Object.entries(env.window.controlOperativoRawData).forEach(([g, dias]) => { daily[g] = dias; });
        env.api.renderControlOperativoCharts(clone(GESTORES_DATA), (() => { const d = {}; Object.keys(env.window.controlOperativoRawData[GESTORES[0]] || {}).slice(0, 8).sort().forEach((f) => { d[f] = { Retiros_Aprobados: 3, Retiros_Rechazados: 1, Retiros_Procesados: 4, Tasa_Aprobacion_Dia: 3, Minutos_Tarde: 0 }; }); return d; })(), tags[i]);
    });
}, (_, envs) => {
    assert.ok(Object.keys(envs[0].api.getCharts()).length >= 5);
});

// ------------------------------------------------------------------ D9b / D5: comportamiento decidido
const RAW_D9B = () => {
    const dia = (ap, re) => ({ Retiros_Aprobados: ap, Retiros_Rechazados: re, Retiros_Procesados: ap + re, Dias_Laborados: 1, Tiempo_Total_Desde_Creacion_Segundos: 3600, Minutos_Inactividad_Total: 10 });
    return {
        'Ana Pérez': { '2026-10-05': dia(10, 1) }, 'Mariana Ruiz': { '2026-10-05': dia(30, 2) }, 'Oriana Borja': { '2026-10-04': dia(12, 0) },
        'Sara Santamaría': { '2026-10-05': dia(50, 5) }, 'Camilo Espinosa': { '2026-10-03': dia(8, 1) }, 'Luis Gómez': { '2026-10-02': dia(5, 0) }
    };
};
const USERS_D9B = () => ({
    s1: { email: 'sara@x.com', name: 'Sara Santamaría', role: 'Supervisor', approved: true },
    a1: { email: 'camilo@x.com', name: 'Camilo Espinosa', role: 'Admin', approved: true },
    g1: { email: 'mariana@x.com', name: 'Mariana Ruiz', role: 'Gestor', approved: true },
    g2: { email: 'oriana@x.com', name: 'Oriana Borja', role: 'Gestor', approved: true },
    g3: { email: 'ana@x.com', name: 'Ana Pérez', role: 'Gestor', approved: true }
});
const etiquetas = (env) => JSON.stringify(Object.values(env.api.getCharts()).map((c) => c.config && c.config.data && c.config.data.labels));

S('K14', 'D9b: loadControlOperativoData deriva supervisores por ROL de users; paridad con el original usando la lista EXACTA (oráculo)', () => [
    { raw: RAW_D9B(), users: USERS_D9B(), shiftReports: null }, { raw: RAW_D9B(), users: USERS_D9B(), shiftReports: null, filtroFecha: '7' }
], async (envs) => {
    for (const env of envs) { await env.api.loadControlOperativoData(); env.__err = await asErr(() => env.api.generarAnalisisTextual()); }
}, (_, envs) => {
    const e = envs[0];
    assert.ok(etiquetas(e).includes('Mariana Ruiz') && etiquetas(e).includes('Oriana Borja'), 'Mariana y Oriana (Gestoras en users) entran a los rankings');
    assert.ok(!etiquetas(e).includes('Sara Santamar') && !etiquetas(e).includes('Camilo'), 'Supervisor y Admin fuera de los rankings');
    const html = e.dom.getElementById('analysisModalBody').innerHTML;
    assert.ok(html.includes('<strong>Mariana Ruiz</strong>') && !html.includes('Sara Santamar'), 'el análisis ("Todos") tampoco oculta a Mariana');
});

S('K15-D9b', 'D9b (DIFERENCIA INTENCIONAL): con la lista fija REAL el original oculta a "Mariana" y "Oriana"; el integrado no', () => [
    { raw: RAW_D9B(), users: USERS_D9B(), shiftReports: null, supervisoresOraculo: null }
], async (envs) => { for (const env of envs) await env.api.loadControlOperativoData(); }, (_, envs) => {
    const e = envs[0];
    if (e.mode === 'original') {
        assert.ok(!etiquetas(e).includes('Mariana Ruiz') && !etiquetas(e).includes('Oriana Borja'), 'original: subcadena "Maria"/"Oriana"');
    } else {
        assert.ok(etiquetas(e).includes('Mariana Ruiz') && etiquetas(e).includes('Oriana Borja'), 'integrado: por rol');
        assert.ok(!etiquetas(e).includes('Sara Santamar') && !etiquetas(e).includes('Camilo'));
    }
}, { intencional: true });

S('K16', 'D5 (DIFERENCIA INTENCIONAL): "mes anterior" el 29/30/31-mar = febrero completo en el integrado; el original desborda a marzo', () => [29, 30, 31].map((dia) => ({
    nowMs: new Date(2026, 2, dia, 12).getTime(), filtroFecha: 'lastMonth', preloadRaw: true,
    raw: { 'Ana Pérez': { '2026-02-01': { Retiros_Procesados: 3, Retiros_Aprobados: 3, ART_Desde_Creacion_Minutos: 10 }, '2026-02-28': { Retiros_Procesados: 4, Retiros_Aprobados: 4 }, '2026-03-10': { Retiros_Procesados: 70, Retiros_Aprobados: 70 } } }
})), async (envs) => { for (const env of envs) { env.api.generarAnalisisTextual(); env.api.renderControlOperativoFiltered(); } }, (_, envs) => {
    for (const env of envs) {
        const html = env.dom.getElementById('analysisModalBody').innerHTML;
        const esperado = env.mode === 'original' ? '70 solicitudes' : '7 solicitudes';
        assert.ok(html.includes(`volumen total de <strong>${esperado}</strong>`), `${env.mode}: ${esperado}`);
        assert.strictEqual(String(env.dom.getElementById('operativoWidgetTotal').textContent), '7', 'la tabla ya usaba febrero en ambos');
    }
}, { intencional: true });

S('K17', 'D5 (DIFERENCIA INTENCIONAL): turno 22:00-06:00 en UTC-5 queda en su día operativo local (integrado); el original lo pasa al día siguiente (UTC)', () => [{
    raw: { 'Ana Pérez': {} }, users: USERS_D9B(),
    shiftReports: {
        n1: { rol: 'Gestor', gestor: 'Ana Pérez', loginTime: Date.UTC(2026, 9, 5, 3), timestamp: Date.UTC(2026, 9, 5, 11), tardanzaMins: 0, inactividadTotalMins: 15 },
        n2: { rol: 'Gestor', gestor: 'Mariana Ruiz', horaInicio: '4/10/2026, 10:00:00 p. m.', timestamp: Date.UTC(2026, 9, 5, 11), tardanzaMins: 0 },
        n3: { rol: 'Gestor', gestor: 'Luis Gómez', timestamp: Date.UTC(2026, 9, 5, 4, 30), tardanzaMins: 0 }
    }
}], async (envs) => { for (const env of envs) await env.api.loadControlOperativoData(); }, (_, envs) => {
    const raw = envs[0].window.controlOperativoRawData;
    const dias = (g) => Object.keys(raw[g] || {});
    assert.strictEqual(new Date(Date.UTC(2026, 9, 5, 3)).getTimezoneOffset(), 300, 'el proceso corre en UTC-5');
    if (envs[0].mode === 'original') {
        assert.deepStrictEqual([dias('Ana Pérez'), dias('Mariana Ruiz'), dias('Luis Gómez')], [['2026-10-05'], ['2026-10-05'], ['2026-10-05']], 'original: fecha UTC del cierre');
    } else {
        assert.deepStrictEqual([dias('Ana Pérez'), dias('Mariana Ruiz'), dias('Luis Gómez')], [['2026-10-04'], ['2026-10-04'], ['2026-10-04']], 'integrado: día local de inicio (o del cierre a las 23:30 local)');
    }
}, { intencional: true });

// ------------------------------------------------------------------ ejecución
let pass = 0, fail = 0;
const record = (ok, name, err) => {
    if (ok) { pass++; console.log('  [PASS] ' + name); } else { fail++; console.log('  [FAIL] ' + name + (err ? '\n         ' + String(err && err.stack ? err.stack.split('\n').slice(0, 6).join('\n         ') : err) : '')); }
};

(async () => {
    T = Object.assign({}, await import(pathToFileURL(path.join(__dirname, '../helpers/kpi-test-env.mjs')).href));
    GESTORES = Object.keys(RAW());
    console.log('KPIs, analítica y gráficas: app.js integrado (bundle real) vs app.js original\n');

    try {
        const marcados = (INTEGRATED.match(/\[LAB-INTEGRACION\] Puente app\.js -> RiskOps \(corte "kpis"\)/g) || []).length;
        assert.strictEqual(marcados, 1, 'un único puente del corte kpis');
        const funcs = ['fetchKpiOperativosData', 'loadRetirosData', 'loadGestoresForKPIs', 'openKpiTaskDetails', 'closeKpiTaskDetails', 'destroyChart', 'toggleOperativoCustomDates', 'generarAnalisisTextual', 'generarReporteEjecutivoPDF', 'loadControlOperativoData', 'renderControlOperativoFiltered', 'renderControlOperativoCharts', 'drawPunctualDatesChart', 'drawChart', 'drawCombinedChart', 'drawCombinedChartDaily', 'drawScatterMatriz'];
        for (const f of funcs) {
            const re = new RegExp('^(async )?function ' + f + '\\(', 'm');
            const m = INTEGRATED.match(re);
            assert.ok(m, `la función ${f} sigue declarada en el integrado (los onclick/otros bloques la resuelven)`);
            const cuerpo = INTEGRATED.slice(m.index, m.index + 700).split('\n').slice(0, 3).join('\n');
            assert.ok(cuerpo.includes('__kpiController()') || cuerpo.includes('RiskOps.'), `la función ${f} delega en RiskOps`);
            assert.ok(!ORIGINAL.slice(ORIGINAL.search(re), ORIGINAL.search(re) + 700).split('\n').slice(0, 3).join('\n').includes('RiskOps'), `el original de ${f} no usa RiskOps`);
        }
        assert.ok(INTEGRATED.includes('const parseTime = (timeStr, baseDateMs) => RiskOps.kpiMetrics.parseTime(timeStr, baseDateMs);'), 'parseTime delega');
        record(true, `las ${funcs.length} funciones + parseTime siguen declaradas y delegan en RiskOps (nombre y firma conservados)`);
    } catch (err) { record(false, 'las funciones siguen declaradas y delegan en RiskOps', err); }

    try {
        const ctx = vm.createContext({});
        vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);
        const nombres = ['kpiMetrics', 'kpiService', 'kpiOperativoAnalysis', 'kpiExecutiveReport', 'kpiOperativosSource', 'kpiRepository', 'kpiTaskDetails', 'kpiAnalysisView', 'kpiOperativoTableView', 'kpiChartConfigs', 'kpiChartPlan', 'kpiController'];
        for (const n of nombres) assert.ok(ctx.RiskOps[n] && Object.keys(ctx.RiskOps[n]).length > 0, `RiskOps.${n}`);
        record(true, `el bundle expone los ${nombres.length} espacios de nombres del corte`);
    } catch (err) { record(false, 'el bundle expone los espacios de nombres del corte', err); }

    for (const sc of scenarios) {
        try {
            const cfg = sc.setup();
            const result = {};
            for (const mode of ['original', 'integrado']) {
                const own = clone(cfg === null ? [] : cfg);
                const envs = (cfg === null ? [] : (Array.isArray(own) ? own : [own])).map((o) => makeEnv(mode, o));
                const out = await sc.run(envs);
                if (typeof sc.assertAbsolute === 'function') {
                    try { sc.assertAbsolute(out, envs); } catch (err) { throw new Error(`[${mode}] resultado absoluto: ${err.message}`); }
                }
                if (sc.intencional) { await macrotask(); result[mode] = 'intencional'; if (mode === 'integrado' && envs.length) assert.ok(envs.some((e) => e.api.bridgeUsed()), 'el integrado usó el puente RiskOps.kpiController'); continue; }
                await macrotask();
                result[mode] = { out: out === undefined ? null : JSON.parse(JSON.stringify(out === undefined ? null : out, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v))), obs: envs.map(observe), extra: envs.map((e) => [e.__ret === undefined ? 'undef' : 'val', e.__after, e.__over, e.__ms, e.__err, e.__e1, e.__e2]) };
                if (mode === 'integrado' && envs.length && !sc.bridgeless) assert.ok(envs.some((e) => e.api.bridgeUsed()), 'el integrado usó el puente RiskOps.kpiController');
            }
            assert.deepStrictEqual(result.integrado, result.original);
            record(true, `${sc.id} ${sc.name}`);
        } catch (err) { record(false, `${sc.id} ${sc.name}`, err); }
    }

    console.log('\n=== RESUMEN ===');
    console.log(`Pasan: ${pass} | Fallan: ${fail} | Total: ${pass + fail}`);
    const intencionales = scenarios.filter((x) => x.intencional).length;
    console.log(fail === 0 ? `RESULTADO: TODO CUMPLIDO (paridad en ${scenarios.length - intencionales} escenarios; ${intencionales} con diferencia INTENCIONAL por D5/D9b afirmada por modo)` : 'RESULTADO: HAY FALLAS');
    process.exitCode = fail === 0 ? 0 : 1;
})();
