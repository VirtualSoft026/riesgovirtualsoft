/**
 * Pruebas del controlador de KPIs y Control Operativo (`controllers/kpi-controller.js`) y de los módulos de
 * presentación que usa (`executive-report.js`, `kpi-task-details.js`, `operativo-table-view.js`).
 *
 * Diferencial: cada función se ejecuta en un entorno con las funciones LITERALES de app.js
 * (`helpers/kpi-legacy-app.mjs`, copia con números de línea de app.js 5676-8330) y en otro con
 * `createKpiController`, con reloj, DOM, Chart y Firebase simulados idénticos; se compara todo lo observable
 * (DOM, gráficas creadas, logs, alertas, impresión, estado global).
 */
import { createRunner, assert } from '../test-harness.mjs';
import { makeSide, observe, flushTimeouts, SUPERVISORES } from '../helpers/kpi-harness.mjs';
import { makeRng, makeRawData } from '../helpers/kpi-test-env.mjs';
import * as ER from '../../domain/analytics/executive-report.js';
import * as TD from '../../ui/components/kpi-task-details.js';
import * as TV from '../../ui/views/operativo-table-view.js';

const { test, testAsync, summarizeAsync } = createRunner('kpi-controller (orquestación de KPIs y Control Operativo)');

const NOW = new Date(2026, 9, 6, 15, 0, 0).getTime();
const clone = (o) => JSON.parse(JSON.stringify(o));
const MS = 'operativoGestorMultiSelect';

function pair(opts) {
    const mk = (kind) => {
        const side = makeSide(kind, { nowMs: NOW, ...clone(opts.side || {}) });
        if (opts.raw) side.window.controlOperativoRawData = clone(opts.raw);
        return side;
    };
    return { a: mk('legacy'), b: mk('new') };
}

/** Ejecuta `fn(side)` en ambos lados y exige la misma observación (y el mismo error, si lo hay). */
async function same(opts, fn) {
    const { a, b } = pair(opts);
    let ea = null, eb = null;
    try { await fn(a); } catch (e) { ea = e.constructor.name + ': ' + e.message; }
    try { await fn(b); } catch (e) { eb = e.constructor.name + ': ' + e.message; }
    assert.equal(eb, ea, 'error distinto');
    assert.deepEqual(observe(b), observe(a), 'estado observable distinto');
    return { a, b, error: ea };
}

const RAW = makeRawData(makeRng(11), { gestores: 6, dias: 35 });
const GESTORES = Object.keys(RAW);

// ------------------------------------------------------------------ toggleOperativoCustomDates
testAsync('diferencial vs app.js 7012-7016 (toggleOperativoCustomDates): custom muestra el contenedor, el resto lo oculta', async () => {
    for (const filtro of ['custom', 'Todas', 'today', '']) {
        const r = await same({ side: { filtroFecha: filtro } }, (s) => s.api.toggleOperativoCustomDates());
        assert.equal(r.b.dom.getElementById('operativoCustomDateContainer').style.display, filtro === 'custom' ? 'flex' : 'none');
    }
});

// ------------------------------------------------------------------ modal de detalle de tareas
const TASKS = {
    finalizadas: [{ name: 'Tarea <b>1</b>', date: '2026-10-05', type: 'adicional', observation: 'Obs "x" & y' }, { name: 'Dos', date: '2026-10-04', observation: '' }],
    no_realizadas: [{ name: 'N1', date: '2026-10-03', type: 'set', observation: "o'k" }],
    pendientes: []
};
testAsync('diferencial vs app.js 6419-6473 (openKpiTaskDetails) y 6475 (closeKpiTaskDetails): cada tipo, tipo desconocido y sin listas', async () => {
    for (const tipo of ['finalizadas', 'no_realizadas', 'pendientes', 'otro', undefined]) {
        const r = await same({ side: { kpiTaskLists: TASKS } }, (s) => s.api.openKpiTaskDetails(tipo));
        const abre = r.b.dom.getElementById('kpiTaskDetailsModal').classList.contains('active');
        assert.ok(abre, 'el modal se abre');
        await same({ side: { kpiTaskLists: TASKS } }, (s) => { s.api.openKpiTaskDetails(tipo); s.api.closeKpiTaskDetails(); });
    }
    const sin = await same({ side: { kpiTaskLists: null } }, (s) => s.api.openKpiTaskDetails('finalizadas'));
    assert.equal(sin.b.dom.getElementById('kpiTaskDetailsModal').classList.contains('active'), false, 'sin listas no se abre');
    await same({ side: { kpiTaskLists: TASKS } }, (s) => s.api.closeKpiTaskDetails());
});

test('kpi-task-details: cabecera por tipo (null si es desconocido) y lista vacía', () => {
    assert.equal(TD.getKpiTaskDetailsHeader('finalizadas').title, 'Tareas Finalizadas');
    assert.equal(TD.getKpiTaskDetailsHeader('no_realizadas').iconColor, 'var(--danger)');
    assert.equal(TD.getKpiTaskDetailsHeader('pendientes').iconClass, 'bx bx-time');
    assert.equal(TD.getKpiTaskDetailsHeader('toString'), null, 'no hereda propiedades de Object');
    assert.equal(TD.buildKpiTaskListHtml([]), TD.KPI_TASKS_EMPTY_HTML);
    assert.equal(TD.buildKpiTaskListHtml(null), TD.KPI_TASKS_EMPTY_HTML);
    assert.ok(TD.buildKpiTaskCardHtml({ name: '<i>', date: 'd', type: 'adicional', observation: 'o' }).includes('&lt;i&gt;'));
});

// ------------------------------------------------------------------ renderControlOperativoFiltered
testAsync('diferencial vs app.js 7481-7735 (renderControlOperativoFiltered): sin datos cargados no hace nada', async () => {
    await same({}, (s) => s.api.renderControlOperativoFiltered());
});

testAsync('diferencial vs app.js 7481-7735: periodos x selecciones (tabla, widgets, gráficas y anillos)', async () => {
    const selecciones = [[], [GESTORES[0]], [GESTORES[0], GESTORES[1]], ['Oriana Borja'], ['Nadie']];
    for (const filtro of ['Todas', 'today', 'yesterday', '7', '30', 'thisMonth', 'lastMonth']) {
        for (const sel of selecciones) {
            await same({ raw: RAW, side: { filtroFecha: filtro, selected: { [MS]: sel } } }, (s) => s.api.renderControlOperativoFiltered());
        }
    }
    await same({ raw: RAW, side: { filtroFecha: 'custom', customStart: '2026-09-20', customEnd: '2026-10-02', selected: { [MS]: [] } } }, (s) => s.api.renderControlOperativoFiltered());
    await same({ raw: RAW, side: { filtroFecha: 'custom', customStart: '', customEnd: '' } }, (s) => s.api.renderControlOperativoFiltered());
});

testAsync('diferencial vs app.js 7660-7690: clic en una fila filtra por ese gestor; un segundo clic quita el filtro; ambos hacen scroll', async () => {
    const r = await same({ raw: RAW, side: { filtroFecha: 'Todas' } }, (s) => {
        s.api.renderControlOperativoFiltered();
        const rows = () => s.dom.getElementById('qs:#tablaResumenOperativo tbody').children;
        rows()[0].onclick();
        s.__afterFirst = clone(s.selected);
        rows()[0].onclick();
    });
    assert.deepEqual(r.b.__afterFirst[MS].length, 1);
    assert.deepEqual(r.b.selected[MS], [], 'el segundo clic sobre el mismo gestor deselecciona');
    assert.equal(r.b.scrolls.length, 2);
    assert.deepEqual(r.b.scrolls[0], { top: 0, behavior: 'smooth' });
});

testAsync('diferencial vs app.js 7695-7716: hover de la fila cambia el fondo', async () => {
    for (const kind of ['legacy', 'new']) {
        const s = makeSide(kind, { nowMs: NOW, raw: null });
        s.window.controlOperativoRawData = clone(RAW);
        s.api.renderControlOperativoFiltered();
        const tr = s.dom.getElementById('qs:#tablaResumenOperativo tbody').children[0];
        tr.onmouseover();
        const over = tr.style.background;
        tr.onmouseout();
        assert.equal(over, 'var(--bg-secondary, #f8f9fa)');
        assert.equal(tr.style.background, 'transparent');
    }
});

test('operativo-table-view: fila y widget de ART', () => {
    const html = TV.buildOperativoRowHtml({ gestor: '<Ana>', Retiros_Aprobados: 3, Retiros_Rechazados: 1, Retiros_Procesados: 4, Porcentaje_Rechazos: 25, Tasa_Aprobacion_Dia: 1.5 });
    assert.ok(html.includes('&lt;Ana&gt;'));
    assert.ok(html.includes('>25%</td>'));
    assert.equal(TV.buildOperativoArtWidgetHtml('12.5'), '12.5<span style="font-size: 16px; font-weight: 600; margin-left: 4px;">min</span>');
});

// ------------------------------------------------------------------ generarAnalisisTextual (orquestación)
testAsync('diferencial vs app.js 7025-7211 (generarAnalisisTextual) a través del controlador: sin datos, global, un gestor, custom', async () => {
    await same({}, (s) => s.api.generarAnalisisTextual());
    await same({ raw: RAW, side: { filtroFecha: '30' } }, (s) => s.api.generarAnalisisTextual());
    await same({ raw: RAW, side: { filtroFecha: 'Todas', selected: { [MS]: [GESTORES[1]] } } }, (s) => s.api.generarAnalisisTextual());
    await same({ raw: RAW, side: { filtroFecha: 'custom', customStart: '2026-09-25', customEnd: '2026-10-03' } }, (s) => s.api.generarAnalisisTextual());
    const multi = await same({ raw: RAW, side: { selected: { [MS]: [GESTORES[0], GESTORES[1]] } } }, (s) => s.api.generarAnalisisTextual());
    assert.ok(multi.error && multi.error.startsWith('TypeError'), 'HALLAZGO conservado: "Varios" lanza TypeError');
});

// ------------------------------------------------------------------ generarReporteEjecutivoPDF
function prepararInforme(s) {
    s.api.renderControlOperativoFiltered();
    s.api.generarAnalisisTextual();
}

testAsync('diferencial vs app.js 7216-7290 (generarReporteEjecutivoPDF): informe con todas las gráficas, impresión a los 800 ms', async () => {
    for (const selectedIndex of [0, 1, 3]) {
        const r = await same({ raw: RAW, side: { filtroFecha: selectedIndex === 3 ? 'custom' : 'Todas', selectedIndex, customStart: '2026-09-01', customEnd: '2026-09-30' } }, (s) => {
            prepararInforme(s);
            s.api.generarReporteEjecutivoPDF();
            s.__before = s.timeouts.map(t => (t.printed ? 'print' : t.ms));
            flushTimeouts(s);
        });
        assert.deepEqual(r.b.__before, [800]);
        assert.ok(r.b.timeouts.some(t => t.printed), 'se llamó a window.print');
        assert.ok(r.b.dom.getElementById('printReportMeta').innerText.startsWith('Fecha de generación: '));
    }
});

testAsync('diferencial vs app.js 7216-7290: periodo personalizado sin fechas ("Inicio a Fin"), gestores seleccionados y gráficas ausentes', async () => {
    await same({ raw: RAW, side: { filtroFecha: 'custom', selectedIndex: 3, selected: { [MS]: [GESTORES[0], GESTORES[2]] } } }, (s) => { prepararInforme(s); });
    const r = await same({ raw: RAW, side: { filtroFecha: 'custom', selectedIndex: 3, selected: { [MS]: [GESTORES[0]] } } }, (s) => { s.api.generarReporteEjecutivoPDF(); });
    assert.ok(r.b.dom.getElementById('printReportMeta').innerText.includes('Personalizado (Inicio a Fin)'));
    // sin gráficas dibujadas todavía: las imágenes se ocultan
    assert.equal(r.b.dom.getElementById('printChart1').style.display, 'none');
});

testAsync('diferencial vs app.js 7216-7290: falta alguna imagen de impresión (ids ausentes del DOM)', async () => {
    await same({ raw: RAW, side: { missingDom: ['printChart2', 'printChart5'] } }, (s) => { s.api.renderControlOperativoFiltered(); s.api.generarReporteEjecutivoPDF(); });
    await same({ raw: RAW, side: { missingDom: ['printTableContainer'] } }, (s) => { s.api.renderControlOperativoFiltered(); s.api.generarReporteEjecutivoPDF(); });
});

test('executive-report: textos y plan de gráficas', () => {
    assert.equal(ER.buildReportGestorText([]), 'Todos los gestores');
    assert.equal(ER.buildReportGestorText(['A', 'B']), 'A, B');
    assert.equal(ER.buildReportPeriodoText({ selectedOptionText: 'Hoy', value: 'today' }), 'Hoy');
    assert.equal(ER.buildReportPeriodoText({ selectedOptionText: 'x', value: 'custom', customStart: '2026-01-01', customEnd: '' }), 'Personalizado (2026-01-01 a Fin)');
    assert.equal(ER.buildReportMetaText({ generatedAtText: 'T', gestorText: 'G', periodoText: 'P' }), 'Fecha de generación: T | Gestor(es): G | Periodo: P');
    assert.equal(ER.PRINT_DELAY_MS, 800);
    const plan = ER.planReportCharts({ chartInactividad: {} }, (id) => id !== 'printChart4');
    assert.deepEqual(plan.map(p => [p.imgId, p.action]), [['printChart5', 'hide'], ['printChart1', 'hide'], ['printChart2', 'hide'], ['printChart3', 'capture'], ['printChart4', 'skip']]);
    assert.ok(ER.buildReportTableHtml('<table></table>').endsWith('<table></table>'));
});

// ------------------------------------------------------------------ carga de datos
const USERS = {
    u1: { email: 'Oriana@x.com', name: ' Oriana Borja ', role: 'Gestor', approved: true },
    u2: { email: 'ana@x.com', name: 'Ana Pérez', role: 'Gestor', approved: true }
};
const REPORTS = {
    r1: { rol: 'Gestor', gestor: 'Ana Pérez', timestamp: NOW - 3600000, loginTime: NOW - 7200000, turnoProgramado: '8am - 4pm', tardanzaMins: 12, timeline: [{ type: 'Inactividad', start: NOW - 5000000, end: NOW - 4000000 }] },
    r2: { rol: 'Gestor', gestor: 'Nuevo Gestor', timestamp: NOW - 86400000, tardanzaMins: 0 }
};

testAsync('diferencial vs app.js 7292-7479 (loadControlOperativoData): éxito con usuarios y reportes de turno', async () => {
    const r = await same({ side: { raw: RAW, users: USERS, shiftReports: REPORTS } }, (s) => s.api.loadControlOperativoData());
    assert.ok(r.b.setups.length === 1 && r.b.setups[0].id === MS);
});

testAsync('diferencial vs app.js 7292-7479: sin base de datos, sin usuarios/reportes, usuarios ya cargados y fallos', async () => {
    await same({ side: { raw: RAW, noDatabase: true } }, (s) => s.api.loadControlOperativoData());
    await same({ side: { raw: RAW, users: null, shiftReports: null } }, (s) => s.api.loadControlOperativoData());
    await same({ side: { raw: RAW, users: USERS, shiftReports: REPORTS, kpiUsersData: { 'x@x.com': 'X' } } }, (s) => s.api.loadControlOperativoData());
    await same({ side: { raw: RAW, users: USERS, shiftReports: REPORTS, usersFail: true } }, (s) => s.api.loadControlOperativoData());
    await same({ side: { raw: RAW, users: USERS, shiftReports: REPORTS, shiftFail: true } }, (s) => s.api.loadControlOperativoData());
    const e = await same({ side: { raw: RAW, dataFail: true } }, (s) => s.api.loadControlOperativoData());
    assert.equal(e.b.alerts.length, 1);
    assert.ok(e.b.alerts[0].startsWith('Error cargando datos operativos. Detalle: '));
});

testAsync('diferencial vs app.js 5716-5775 (loadGestoresForKPIs): llena el desplegable una vez, no recarga y tolera fallos', async () => {
    const lleno = [{}, {}, {}];
    for (const side of [
        { users: USERS, kpiSelectOptions: [] }, { users: USERS, kpiSelectOptions: lleno }, { users: null, kpiSelectOptions: [] },
        { users: USERS, usersFail: true, kpiSelectOptions: [] }, { users: { a: { email: 'a@x.com', role: 'Gestor', approved: true } }, kpiSelectOptions: [] }
    ]) {
        await same({ side }, async (s) => { await s.api.loadGestoresForKPIs(); await new Promise(r => setTimeout(r, 0)); });
    }
});

testAsync('loadGestoresForKPIs: sin el desplegable en el DOM no hace nada y resuelve (app.js 5717-5718)', async () => {
    const { createKpiController } = await import('../../controllers/kpi-controller.js');
    const c = createKpiController({ getEl: () => null, state: {}, chartRegistry: {}, getSelectedGestores: () => [], fetchKpiData: async () => ({}) });
    assert.equal(await c.loadGestoresForKPIs(), undefined);
});

// ------------------------------------------------------------------ D5 / D9b: comportamiento DECIDIDO (predeterminado)
/** Lado nuevo con los predeterminados (sin opciones heredadas). */
function decided(opts) {
    const side = makeSide('new', { nowMs: NOW, decided: true, ...clone(opts.side || {}) });
    if (opts.raw) side.window.controlOperativoRawData = clone(opts.raw);
    return side;
}
const d1 = (extra) => ({ Retiros_Aprobados: 9, Retiros_Rechazados: 1, Retiros_Procesados: 10, Dias_Laborados: 1, Tiempo_Total_Desde_Creacion_Segundos: 600, ...extra });
const RAW_SUP = {
    'Ana Pérez': { '2026-10-05': d1(), '2026-10-01': d1({ Retiros_Aprobados: 20, Retiros_Procesados: 21 }) },
    'Mariana Ruiz': { '2026-10-05': d1({ Retiros_Aprobados: 30, Retiros_Procesados: 31 }) },
    'Maria Sanchez': { '2026-10-05': d1({ Retiros_Aprobados: 50, Retiros_Procesados: 51 }) },
    'Oriana Borja': { '2026-10-04': d1() }
};
const USERS_SUP = {
    s1: { email: 'maria@x.com', name: 'Maria Sanchez', role: 'Supervisor', approved: true },
    a1: { email: 'jefe@x.com', name: 'Jefe General', role: 'Admin', approved: true },
    g1: { email: 'mariana@x.com', name: 'Mariana Ruiz', role: 'Gestor', approved: true },
    g2: { email: 'oriana@x.com', name: 'Oriana Borja', role: 'Gestor', approved: true },
    g3: { email: 'ana@x.com', name: 'Ana Pérez', role: 'Gestor', approved: true }
};

testAsync('D9b a través del controlador: el directorio sale de la MISMA lectura de users; los rankings excluyen por rol y "Mariana" se ve', async () => {
    const reads = [];
    const b = decided({ side: { raw: RAW_SUP, users: USERS_SUP, shiftReports: null } });
    const ref = b.database.ref; b.database.ref = (p) => { reads.push(p); return ref(p); };
    await b.api.loadControlOperativoData();
    assert.deepEqual(reads, ['users', 'shift_reports'], 'una sola lectura de users (y ninguna de contadores globales)');
    assert.deepEqual([...b.api.getSupervisorDirectory().uids].sort(), ['a1', 's1']);
    // oráculo: el original con SUPERVISORES_NOMBRES = nombres EXACTOS de los usuarios con rol (sin subcadenas entre ellos)
    const a = makeSide('legacy', { nowMs: NOW, raw: RAW_SUP, users: USERS_SUP, supervisoresLegacy: ['Maria Sanchez', 'Jefe General'] });
    await a.api.loadControlOperativoData();
    assert.deepEqual(observe(b), observe(a), 'mismo resultado que el original con la lista exacta derivada de users');
    const labels = JSON.stringify(observe(b).charts.map((c) => c.config && c.config.data && c.config.data.labels));
    assert.ok(labels.includes('Mariana Ruiz') && labels.includes('Oriana Borja'), 'Mariana (y Oriana, Gestora en users) entran a los rankings');
    assert.ok(!labels.includes('Maria Sanchez'), 'la supervisora no entra a los rankings');
    // el original con la lista fija por subcadena ocultaba a Mariana y a Oriana
    const fija = makeSide('legacy', { nowMs: NOW, raw: RAW_SUP, users: USERS_SUP });
    await fija.api.loadControlOperativoData();
    const labelsFija = JSON.stringify(observe(fija).charts.map((c) => c.config && c.config.data && c.config.data.labels));
    assert.ok(!labelsFija.includes('Mariana Ruiz') && !labelsFija.includes('Oriana Borja'));
});

testAsync('D9b: loadGestoresForKPIs también deriva el directorio; con kpiUsersData ya cargado se lee users solo para el directorio', async () => {
    const b = decided({ side: { raw: RAW_SUP, users: USERS_SUP } });
    await b.api.loadGestoresForKPIs(); await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual([...b.api.getSupervisorDirectory().uids].sort(), ['a1', 's1']);
    const c = decided({ side: { raw: RAW_SUP, users: USERS_SUP, kpiUsersData: { 'x@x.com': 'X' } } });
    await c.api.loadControlOperativoData();
    assert.deepEqual(c.window.kpiUsersData, { 'x@x.com': 'X' }, 'no pisa el mapa ya cargado');
    assert.ok(c.api.getSupervisorDirectory(), 'pero sí construye el directorio');
    const { createKpiController } = await import('../../controllers/kpi-controller.js');
    assert.throws(() => createKpiController({ getEl: () => null, state: {}, chartRegistry: {}, getSelectedGestores: () => [], excludedNames: ['Sara'], fetchKpiData: async () => ({}) }), /excludedNames/);
});

testAsync('D5 a través del controlador: 2+ gestores abre el análisis (antes TypeError) con el resumen de los seleccionados', async () => {
    const b = decided({ raw: RAW_SUP, side: { filtroFecha: '7', selected: { [MS]: ['Ana Pérez', 'Mariana Ruiz'] } } });
    b.api.generarAnalisisTextual();
    const html = b.dom.getElementById('analysisModalBody').innerHTML;
    assert.ok(b.dom.getElementById('analysisModal').classList.contains('active'));
    assert.ok(html.includes('Resumen Ejecutivo del Equipo') && html.includes('volumen total de <strong>62 solicitudes</strong>'), html.slice(0, 300));
    assert.ok(!html.includes('Maria Sanchez') && !html.includes('Oriana'));
    const a = makeSide('legacy', { nowMs: NOW, filtroFecha: '7', selected: { [MS]: ['Ana Pérez', 'Mariana Ruiz'] } });
    a.window.controlOperativoRawData = clone(RAW_SUP);
    assert.throws(() => a.api.generarAnalisisTextual(), TypeError, 'original: TypeError (diferencia intencional por D5)');
});

testAsync('D5: los KPIs salen del historial FILTRADO por rango y gestores (tabla, tarjetas y análisis); nada sale de un contador global', async () => {
    const sumar = (raw, gestores, desde, hasta) => {
        let ap = 0, re = 0;
        for (const g of gestores) for (const [f, d] of Object.entries(raw[g] || {})) if (f >= desde && f <= hasta) { ap += d.Retiros_Aprobados || 0; re += d.Retiros_Rechazados || 0; }
        return { ap, re, total: ap + re };
    };
    for (const [filtro, desde, hasta] of [['7', '2026-09-29', '2026-10-06'], ['yesterday', '2026-10-05', '2026-10-05'], ['Todas', '0000', '9999'], ['lastMonth', '2026-09-01', '2026-09-30']]) {
        for (const sel of [[GESTORES[0]], [GESTORES[0], GESTORES[1]], [GESTORES[1], GESTORES[2], GESTORES[3]]]) {
            const b = decided({ raw: RAW, side: { filtroFecha: filtro, selected: { [MS]: sel } } });
            b.api.renderControlOperativoFiltered();
            const e = sumar(RAW, sel, desde, hasta);
            assert.equal(b.dom.getElementById('operativoWidgetAprobados').textContent, e.ap, `${filtro} ${sel}`);
            assert.equal(b.dom.getElementById('operativoWidgetRechazados').textContent, e.re);
            assert.equal(b.dom.getElementById('operativoWidgetTotal').textContent, e.total);
            b.api.generarAnalisisTextual();
            const html = b.dom.getElementById('analysisModalBody').innerHTML;
            if (e.total > 0 && sel.length > 1) assert.ok(html.includes(`volumen total de <strong>`), 'análisis abierto');
        }
    }
});

testAsync('D5 a través del controlador: el turno nocturno (22:00-06:00, UTC-5) se agrupa en su día operativo local', async () => {
    const bog = (d, h) => Date.UTC(2026, 9, d, h + 5);
    const reports = { n1: { rol: 'Gestor', gestor: 'Ana Pérez', loginTime: bog(4, 22), timestamp: bog(5, 6), tardanzaMins: 0, inactividadTotalMins: 30 } };
    const b = decided({ side: { raw: { 'Ana Pérez': {} }, users: USERS_SUP, shiftReports: reports, timeZone: 'America/Bogota' } });
    await b.api.loadControlOperativoData();
    assert.deepEqual(Object.keys(b.window.controlOperativoRawData['Ana Pérez']), ['2026-10-04']);
    const a = makeSide('legacy', { nowMs: NOW, raw: { 'Ana Pérez': {} }, users: USERS_SUP, shiftReports: reports });
    await a.api.loadControlOperativoData();
    assert.deepEqual(Object.keys(a.window.controlOperativoRawData['Ana Pérez']), ['2026-10-05'], 'original: UTC del cierre');
});

testAsync('diferencial vs app.js 5704-5714 (loadRetirosData): éxito y error a través del controlador', async () => {
    await same({ side: { raw: RAW } }, (s) => s.api.loadRetirosData());
    await same({ side: { raw: RAW, dataFail: true } }, (s) => s.api.loadRetirosData());
});

const r = await summarizeAsync();
if (r.failed > 0) process.exitCode = 1;
