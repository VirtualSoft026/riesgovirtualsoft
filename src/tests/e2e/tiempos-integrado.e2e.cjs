/**
 * Paridad de «Control de Tiempos» (paso 3.4, W-28 y DE-4 = a): js/tiempos.js ORIGINAL frente al controlador nuevo
 * (RiskOps.tiemposController + tiemposView + tiemposReport), con el mismo DOM falso, la misma base de datos falsa,
 * el mismo reloj y el mismo Chart.js falso. Se comparan: textos y HTML de los KPI y de la tabla, opciones del selector,
 * visibilidad del rango personalizado, configuraciones de las cinco gráficas (con sus funciones), lecturas de Firebase
 * y cargas del horario.
 *
 * Uso: node src/tests/e2e/tiempos-integrado.e2e.cjs --riskops <riskops.bundle.js> --original <js/tiempos.js>
 */
const fs = require('fs');
const vm = require('vm');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const BUNDLE_PATH = opt('--riskops');
const ORIGINAL_PATH = opt('--original');
if (!BUNDLE_PATH || !ORIGINAL_PATH) {
    console.error('Uso: node tiempos-integrado.e2e.cjs --riskops <bundle.js> --original <js/tiempos.js>');
    process.exit(2);
}

const BUNDLE = fs.readFileSync(BUNDLE_PATH, 'utf8');
const ORIGINAL = fs.readFileSync(ORIGINAL_PATH, 'utf8').replace(/\r\n/g, '\n');
const NOW = new Date(2026, 9, 15, 15, 30, 0).getTime();
const DAY = 24 * 60 * 60 * 1000;

const SHIFT_IDS = ['tiemposDateFilter', 'tiemposDateStart', 'tiemposDateEnd', 'tiemposGestorFilter', 'tiemposCustomDateContainer',
    'tiemposLeaderboardBody', 'tiemposLeaderboardTitle', 'tiemposTotalDias', 'tiemposTotalMinsTarde', 'tiemposTotalMinsInact',
    'chartTopAlerta', 'chartTopExcelencia', 'chartTopInactividad', 'chartScatterCuadrantes'];

/** Elemento falso permisivo: propiedades, hijos, opciones, contexto de canvas y listeners. */
function fakeElement(id = '', tag = 'div') {
    const listeners = {};
    return {
        id, tagName: tag, value: '', textContent: '', innerHTML: '', style: {}, children: [], options: [], listeners,
        appendChild(child) {
            this.children.push(child);
            if (tag === 'select' || child.tagName === 'option') this.options.push(child);
            return child;
        },
        getContext: () => ({}),
        addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
        removeEventListener() {}
    };
}

/** Escenario: reportes, permisos, horario y filtros. */
function scenario(overrides) {
    return Object.assign({
        reports: {
            r1: { rol: 'Gestor', gestor: 'Ana Pérez Gómez', timestamp: NOW - DAY * 0.2, horaInicio: '16/10/2026, 8:20:00', turnoProgramado: '08:00 - 17:00', inactividadTotalMins: 30 },
            r2: { rol: 'Gestor', gestor: 'Ana Pérez Gómez', timestamp: NOW - DAY * 1.2, horaInicio: '15/10/2026, 7:55:00', turnoProgramado: '08:00 - 17:00', inactividadTotalMins: 10 },
            r3: { rol: 'Gestor', gestor: 'Luis Ruiz Mora', timestamp: NOW - DAY * 3, horaInicio: '12/10/2026, 2:20:00 p. m.', setTrabajado: 'Tarde Set 1', inactividadTotalMins: 60 },
            r4: { rol: 'Gestor', gestor: 'Luis Ruiz Mora', timestamp: NOW - DAY * 9, horaInicio: '06/10/2026, 8:05:00', turnoProgramado: 'Por Asignar', inactividadTotalMins: 50 },
            r5: { rol: 'Gestor', gestor: 'Carla Díaz', timestamp: NOW - DAY * 40, horaInicio: '15/09/2026, 9:00:00', turnoProgramado: '08:00 - 17:00', inactividadTotalMins: 5 },
            r6: { rol: 'Supervisor', gestor: 'Marta Solís', timestamp: NOW - DAY * 0.1, horaInicio: '16/10/2026, 6:00:00' },
            r7: { rol: 'Gestor', gestor: 'Ana Pérez Gómez', timestamp: NOW - DAY * 20, horaInicio: '24/09/2026, 10:30:00', turnoProgramado: '08:00 - 17:00', inactividadTotalMins: 90 }
        },
        permissions: {
            p1: { status: 'Aprobado', gestor: 'Luis Ruiz Mora', fecha: '2026-10-12', horaFin: '14:30', tipo: 'Permiso' },
            p2: { status: 'Pendiente', gestor: 'Ana Pérez Gómez', fecha: '2026-10-15', horaFin: '12:00', tipo: 'Permiso' }
        },
        schedule: { rows: [['x']], blocks: [{ gestor: 'Carla Díaz' }] },
        dateFilter: 'all', gestorFilter: 'all', custom: null, startStr: '', endStr: '',
        dbNull: false, loadedSchedule: false
    }, overrides);
}

/** DOM y base de datos falsos con los elementos de index.html que usa la vista. */
function makeWorld(sc) {
    const byId = {};
    SHIFT_IDS.forEach((id) => { byId[id] = fakeElement(id, id === 'tiemposGestorFilter' ? 'select' : 'div'); });
    byId.tiemposDateFilter.value = sc.dateFilter;
    byId.tiemposGestorFilter.value = sc.gestorFilter;
    byId.tiemposDateStart.value = sc.startStr;
    byId.tiemposDateEnd.value = sc.endStr;
    byId.tiemposGestorFilter.options.push(fakeElement('opt0', 'option'));
    byId.tiemposGestorFilter.options[0].value = 'all';

    const doc = {
        getElementById: (id) => byId[id] || null,
        createElement: (tag) => fakeElement('', tag),
        addEventListener() {}, removeEventListener() {}
    };

    const reads = [];
    const database = {
        ref(path) {
            return {
                once: async () => {
                    reads.push(path);
                    if (path === 'shift_reports') return { val: () => (sc.dbNull ? null : sc.reports) };
                    return { val: () => sc.permissions };
                }
            };
        }
    };

    const charts = [];
    const Chart = function (ctx, cfg) { charts.push(cfg); return { destroy() {} }; };
    Chart.register = () => {};

    return { byId, doc, database, charts, Chart, reads };
}

/** Serializa para comparar: las funciones se comparan por su código (con espacios normalizados). */
function ser(value) {
    return JSON.stringify(value, (key, v) => (typeof v === 'function' ? `[fn] ${v.toString().replace(/\s+/g, ' ').replace(/"/g, "'")}` : v));
}

/**
 * Normaliza solo lo que no cambia el render: el espacio entre etiquetas del innerHTML (sangría de las plantillas) y
 * las comillas dobles de las funciones (equivalentes en JavaScript). Cualquier otra diferencia sigue fallando.
 */
function normHtml(html) {
    return String(html).replace(/>\s+/g, '>').replace(/\s+</g, '<').trim();
}

/** Foto del DOM relevante. */
function snapshot(world) {
    const out = {};
    for (const id of SHIFT_IDS) {
        const el = world.byId[id];
        out[id] = {
            textContent: el.textContent, innerHTML: normHtml(el.innerHTML), value: el.value, display: el.style.display,
            options: el.options.map((o) => [o.value, o.textContent]),
            children: el.children.map((c) => [c.tagName, normHtml(c.innerHTML)])
        };
    }
    return out;
}

/** Ejecuta el original (js/tiempos.js) con escenario dado. */
async function runOriginal(sc) {
    const world = makeWorld(sc);
    class FakeDate extends Date {
        constructor(...a) { if (a.length) super(...a); else super(NOW); }
        static now() { return NOW; }
    }
    const RiskOpsRef = { sanitization: null };
    const ctx = {
        document: world.doc, database: world.database, Chart: world.Chart, ChartDataLabels: undefined,
        Date: FakeDate, console: { error() {}, log() {} },
        escapeHTML: (v) => RiskOpsRef.sanitization.escapeHTML(v),
        getShiftForDate: (rows, blocks, name, date) => RiskOpsRef.scheduleService.getShiftForDate(rows, blocks, name, date),
        globalScheduleRows: sc.schedule.rows, globalScheduleBlocks: sc.schedule.blocks,
        loadSchedule: async () => { sc.loadedSchedule = true; ctx.globalScheduleRows = sc.schedule.rows; ctx.globalScheduleBlocks = sc.schedule.blocks; }
    };
    ctx.RiskOps = null;
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);
    RiskOpsRef.sanitization = ctx.RiskOps.sanitization;
    RiskOpsRef.scheduleService = ctx.RiskOps.scheduleService;
    vm.runInContext(ORIGINAL + '\nthis.__load = loadTiemposMetrics; this.__toggle = window.toggleTiemposCustomDates;', ctx);
    await ctx.__load();
    return { snap: snapshot(world), charts: world.charts, reads: world.reads, loaded: sc.loadedSchedule };
}

/** Ejecuta el controlador nuevo con el mismo escenario. */
async function runNew(sc) {
    const world = makeWorld(sc);
    const ctx = { console: { error() {}, log() {} } };
    vm.createContext(ctx);
    vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);
    const RO = ctx.RiskOps;
    const view = RO.tiemposView.createTiemposView({
        doc: world.doc, Chart: world.Chart, ChartDataLabels: undefined,
        escapeHTML: (v) => RO.sanitization.escapeHTML(v)
    });
    const schedule = { rows: sc.schedule.rows, blocks: sc.schedule.blocks };
    let loaded = false;
    const controller = RO.tiemposController.createTiemposController({
        doc: world.doc, database: world.database,
        ensureSchedule: async () => { loaded = true; schedule.rows = sc.schedule.rows; schedule.blocks = sc.schedule.blocks; },
        getSchedule: () => ({ rows: schedule.rows, blocks: schedule.blocks }),
        getShift: RO.scheduleService.getShiftForDate,
        view, now: () => new Date(NOW), logger: { error() {} }
    });
    await controller.load();
    return { snap: snapshot(world), charts: world.charts, reads: world.reads, loaded };
}

const MATRIZ = [];
for (const dateFilter of ['all', 'today', 'yesterday', '7', '30', 'thisMonth', 'lastMonth', 'custom']) {
    for (const gestorFilter of ['all', 'Ana Pérez Gómez', 'Luis Ruiz Mora']) {
        MATRIZ.push({ name: `filtro ${dateFilter} / gestor ${gestorFilter}`, dateFilter, gestorFilter, startStr: '2026-10-01', endStr: '2026-10-14' });
    }
}
MATRIZ.push({ name: 'sin reportes', dbNull: true });
MATRIZ.push({ name: 'horario ya cargado', schedule: { rows: [['y']], blocks: [] } });
MATRIZ.push({ name: 'rango personalizado sin fechas', dateFilter: 'custom' });

let pass = 0;
let fail = 0;

(async () => {
    console.log('=== CONTROL DE TIEMPOS — js/tiempos.js original frente a tiemposController (paso 3.4) ===');

    for (const item of MATRIZ) {
        const base = scenario({
            dateFilter: item.dateFilter || 'all', gestorFilter: item.gestorFilter || 'all',
            startStr: item.startStr || '', endStr: item.endStr || '', dbNull: !!item.dbNull,
            schedule: item.schedule || { rows: null, blocks: null }
        });
        const copy = () => JSON.parse(JSON.stringify(base));

        try {
            const orig = await runOriginal(copy());
            const next = await runNew(copy());

            const sameDom = ser(orig.snap) === ser(next.snap);
            const sameCharts = ser(orig.charts) === ser(next.charts);
            const sameReads = ser(orig.reads) === ser(next.reads);
            const sameLoad = orig.loaded === next.loaded;

            const ok = sameDom && sameCharts && sameReads && sameLoad;
            if (ok) {
                pass += 1;
                console.log(`  [PASS] ${item.name}: DOM, gráficas (${orig.charts.length}), lecturas (${orig.reads.length}) y horario idénticos`);
            } else {
                fail += 1;
                const parts = [];
                if (!sameDom) parts.push('DOM');
                if (!sameCharts) parts.push('gráficas');
                if (!sameReads) parts.push('lecturas');
                if (!sameLoad) parts.push('carga del horario');
                console.error(`  [FAIL] ${item.name}: difiere en ${parts.join(', ')}`);
                if (process.env.TIEMPOS_DIAG) {
                    const a = JSON.stringify(orig.snap, null, 1).split('\n');
                    const b = JSON.stringify(next.snap, null, 1).split('\n');
                    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
                        if (a[i] !== b[i]) { console.error(`      DOM orig: ${a[i]}\n      DOM new : ${b[i]}`); break; }
                    }
                    const sa = ser(orig.charts);
                    const sb = ser(next.charts);
                    if (sa !== sb) {
                        let k = 0;
                        while (k < sa.length && sa[k] === sb[k]) k += 1;
                        console.error(`      CH orig@${k}: ...${sa.slice(Math.max(0, k - 120), k + 160)}\n      CH new @${k}: ...${sb.slice(Math.max(0, k - 120), k + 160)}`);
                    }
                }
            }
        } catch (e) {
            fail += 1;
            console.error(`  [FAIL] ${item.name}: ${e.stack || e.message}`);
        }
    }

    // Cambio del filtro de fecha (onchange original): solo la visibilidad del rango personalizado, sin lecturas.
    const toggleOriginal = (dateFilter) => {
        const world = makeWorld(scenario({ dateFilter }));
        const ctx = { window: null, document: world.doc, console: { error() {}, log() {} } };
        ctx.window = ctx;
        vm.createContext(ctx);
        vm.runInContext(ORIGINAL + '\nthis.__toggle = window.toggleTiemposCustomDates;', ctx);
        ctx.__toggle();
        return world.byId.tiemposCustomDateContainer.style.display;
    };
    const toggleNew = (dateFilter) => {
        const world = makeWorld(scenario({ dateFilter }));
        const ctx = { console: { error() {}, log() {} } };
        vm.createContext(ctx);
        vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);
        const controller = ctx.RiskOps.tiemposController.createTiemposController({
            doc: world.doc, database: world.database,
            ensureSchedule: async () => {}, getSchedule: () => ({ rows: null, blocks: null }),
            getShift: () => '', view: { renderTotals() {}, renderDashboard() {} },
            now: () => new Date(NOW), logger: { error() {} }
        });
        controller.toggleCustomDates();
        return world.byId.tiemposCustomDateContainer.style.display;
    };
    for (const dateFilter of ['all', 'today', 'custom', 'lastMonth']) {
        const a = toggleOriginal(dateFilter);
        const b = toggleNew(dateFilter);
        if (a === b) {
            pass += 1;
            console.log(`  [PASS] cambio de filtro «${dateFilter}»: rango personalizado «${b}» igual al original`);
        } else {
            fail += 1;
            console.error(`  [FAIL] cambio de filtro «${dateFilter}»: original «${a}», nuevo «${b}»`);
        }
    }

    console.log(`\nPasan: ${pass} | Fallan: ${fail} | Total: ${pass + fail}`);
    console.log(fail === 0 ? 'RESULTADO: TODO CUMPLIDO' : 'RESULTADO: HAY FALLAS');
    process.exit(fail === 0 ? 0 : 1);
})();
