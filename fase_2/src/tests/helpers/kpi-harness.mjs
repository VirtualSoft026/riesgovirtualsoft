/**
 * Arnés de comparación "original vs. módulos nuevos" para el corte de KPIs: construye DOS entornos idénticos
 * (reloj fijo, DOM, Chart y Firebase simulados), uno con las funciones LITERALES de app.js
 * (`kpi-legacy-app.mjs`) y otro con `createKpiController` de `src/`, y permite comparar todo lo observable:
 * DOM, gráficas creadas (con sus configuraciones), registros de consola, alertas, impresión y estado global.
 *
 * Decisiones D5/D9b (2026-10-06): el controlador nuevo ya usa por defecto el comportamiento DECIDIDO (rango de fechas
 * corregido, "Varios" sin TypeError, día operativo local, supervisores por rol). Para seguir comparando contra la copia
 * literal de app.js, el lado 'new' se crea por defecto con las opciones EXPLÍCITAS del comportamiento original
 * (`corregirBugs: false`, `fechaLocal: false`, `legacyExcludedNames: SUPERVISORES`). Con `opts.decided: true` se crea
 * con los predeterminados (comportamiento decidido), y `opts.supervisoresLegacy` permite cambiar la lista que recibe la
 * copia literal (oráculo: la lista exacta de los usuarios con rol Supervisor/Admin).
 */
import { createLegacyKpi } from './kpi-legacy-app.mjs';
import { createKpiController } from '../../controllers/kpi-controller.js';
import { fetchKpiOperativosData, detectLocalEnvironment } from '../../services/external/kpi-operativos-source.js';
import { makeDom, makeFakeChart, makeFixedDate, snapshotDom, normalizeConfig } from './kpi-test-env.mjs';

export const SUPERVISORES = ['Sara Santamaría', 'Sara Santamaria', 'Maria Sanchez', 'Camilo Espinosa', 'Oriana Borja', 'Sara', 'Maria', 'Camilo', 'Oriana'];

function escapeHTMLLegacy(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/**
 * @param {{
 *   nowMs: number, raw?: object, users?: object|null, shiftReports?: object|null, selected?: Object<string, string[]>,
 *   filtroFecha?: string, customStart?: string, customEnd?: string, hostname?: string, seed?: object|null,
 *   missingDom?: string[], withDatalabels?: boolean, usersFail?: boolean, dataFail?: boolean,
 *   decided?: boolean, supervisoresLegacy?: string[], timeZone?: string
 * }} opts
 */
export function makeSide(kind, opts) {
    const { nowMs, raw = null, users = null, shiftReports = null } = opts;
    const dom = makeDom({ missing: opts.missingDom || [] });
    const { FakeChart, instances, log: chartLog } = makeFakeChart();
    const FixedDate = makeFixedDate(nowMs);
    const logs = [];
    const alerts = [];
    const timeouts = [];
    const scrolls = [];
    const setups = [];
    const calc = { count: 0 };
    const fetched = [];
    const selected = JSON.parse(JSON.stringify(opts.selected || {}));
    const ChartDataLabels = opts.withDatalabels ? { id: 'datalabels-plugin' } : undefined;

    const mk = (level) => (...args) => logs.push([level, ...args.map(a => (a instanceof Error ? 'Error:' + a.message : a))]);
    const console_ = { log: mk('log'), warn: mk('warn'), error: mk('error') };

    const window = {
        location: { hostname: opts.hostname || 'riskops.example.com', protocol: 'https:' },
        controlOperativoRawData: null, retirosGlobalData: null, kpiUsersData: opts.kpiUsersData || {},
        kpiTaskLists: opts.kpiTaskLists === undefined ? { finalizadas: [], no_realizadas: [], pendientes: [] } : opts.kpiTaskLists,
        print: () => timeouts.push({ printed: true }), scrollTo: (o) => scrolls.push(o)
    };

    dom.getElementById('filtroFechaOperativo').value = opts.filtroFecha || 'Todas';
    dom.getElementById('operativoDateStart').value = opts.customStart || '';
    dom.getElementById('operativoDateEnd').value = opts.customEnd || '';
    const sel = dom.getElementById('filtroFechaOperativo');
    sel.options = [{ text: 'Todas las fechas' }, { text: 'Hoy' }, { text: 'Ayer' }, { text: 'Personalizado' }];
    sel.selectedIndex = opts.selectedIndex === undefined ? 0 : opts.selectedIndex;
    const table = dom.getElementById('tablaResumenOperativo');
    table.parentElement = { outerHTML: '<div id="tableWrapper"><table>…</table></div>' };
    ['printChart1', 'printChart2', 'printChart3', 'printChart4', 'printChart5'].forEach(id => {
        if ((opts.missingDom || []).includes(id)) return;
        const img = dom.getElementById(id);
        img.parentElement = { style: {} };
        img.previousElementSibling = { style: {}, innerText: '' };
    });
    dom.getElementById('kpiGestorSelect').options = opts.kpiSelectOptions || [];

    const database = {
        ref: (path) => ({
            once: async () => {
                if (opts.usersFail && path === 'users') throw new Error('fallo users');
                if (opts.shiftFail && path === 'shift_reports') throw new Error('fallo shift_reports');
                const val = path === 'users' ? users : (path === 'shift_reports' ? shiftReports : null);
                return { exists: () => val !== null && val !== undefined, val: () => JSON.parse(JSON.stringify(val)) };
            }
        })
    };

    const fetchFn = async (url) => {
        fetched.push(url.replace(/\?v=\d+$/, '?v=T'));
        if (opts.dataFail) return { ok: false, json: async () => ({}) };
        const isSeed = url.startsWith('kpi_operativos_seed.json');
        if (isSeed) {
            if (opts.seedThrows) throw new Error('seed boom');
            const seed = opts.seed;
            return { ok: seed !== undefined && seed !== null, json: async () => JSON.parse(JSON.stringify(seed)) };
        }
        return { ok: true, json: async () => JSON.parse(JSON.stringify(raw)) };
    };

    const getSelected = (id) => [...(selected[id] || [])];
    const setSelected = (id, v) => { selected[id] = [...v]; };
    const setupMultiSelect = (id, list, cb) => { setups.push({ id, list: [...list], hasCb: typeof cb === 'function' }); };
    const recalc = () => { calc.count += 1; };

    const side = { kind, dom, window, logs, alerts, timeouts, scrolls, setups, calc, fetched, selected, instances, chartLog, FakeChart, FixedDate, database };

    if (kind === 'legacy') {
        const legacy = createLegacyKpi({
            window, document: dom, Chart: FakeChart, ChartDataLabels, Date: FixedDate, database, fetch: fetchFn, alert: (m) => alerts.push(m),
            console: console_, setTimeout: (fn, ms) => timeouts.push({ fn, ms, legacy: true }), SUPERVISORES_NOMBRES: opts.supervisoresLegacy || SUPERVISORES,
            escapeHTML: escapeHTMLLegacy, getSelectedMultiSelectValues: getSelected, setCustomMultiSelectValues: setSelected,
            setupCustomMultiSelect: setupMultiSelect, calcularIndicadores: recalc
        });
        side.api = legacy;
        side.charts = legacy.getCharts();
    } else {
        const charts = {};
        const controller = createKpiController({
            getEl: (id) => dom.getElementById(id), querySelector: (s) => dom.querySelector(s), createElement: (t) => dom.createElement(t),
            state: window, chartRegistry: charts, ChartClass: FakeChart, datalabelsPlugin: ChartDataLabels === undefined ? {} : ChartDataLabels,
            fetchKpiData: () => fetchKpiOperativosData({
                fetchFn, isLocal: detectLocalEnvironment(window), now: () => new FixedDate().getTime(), logger: console_
            }),
            database: opts.noDatabase ? null : database, getSelectedGestores: getSelected, setSelectedGestores: setSelected,
            setupMultiSelect, recalcularIndicadores: recalc, now: () => new FixedDate(),
            ...(opts.decided
                ? (opts.timeZone ? { timeZone: opts.timeZone } : {})
                : { corregirBugs: false, fechaLocal: false, legacyExcludedNames: SUPERVISORES }),
            alert: (m) => alerts.push(m), print: () => window.print(),
            setTimeout: (fn, ms) => timeouts.push({ fn, ms, legacy: false }), scrollToTop: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
            logger: console_
        });
        side.api = controller;
        side.charts = charts;
    }
    return side;
}

/** Todo lo observable de un lado, listo para `assert.deepEqual` entre el original y el nuevo. */
export function observe(side) {
    return {
        dom: snapshotDom(side.dom),
        rows: side.dom.getElementById('qs:#tablaResumenOperativo tbody').children.map(r => ({ title: r.title, style: { ...r.style }, html: r.innerHTML, hasOnclick: typeof r.onclick === 'function' })),
        charts: Object.keys(side.charts).sort().map(id => ({ id, destroyed: side.charts[id].destroyed, ctx: side.charts[id].ctx, config: normalizeConfig(side.charts[id].config) })),
        chartLog: side.chartLog,
        logs: JSON.parse(JSON.stringify(side.logs, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v))),
        alerts: side.alerts,
        calc: side.calc.count,
        setups: side.setups,
        scrolls: side.scrolls,
        printed: side.timeouts.map(t => (t.printed ? 'print' : { ms: t.ms })),
        selected: side.selected,
        raw: JSON.parse(JSON.stringify(side.window.controlOperativoRawData)),
        retiros: JSON.parse(JSON.stringify(side.window.retirosGlobalData)),
        kpiUsersData: side.window.kpiUsersData,
        fetched: side.fetched
    };
}

/** Ejecuta los temporizadores pendientes (el original llama a `window.print` tras 800 ms). */
export function flushTimeouts(side) {
    side.timeouts.filter(t => typeof t.fn === 'function').forEach(t => { const f = t.fn; t.fn = null; f(); });
}
