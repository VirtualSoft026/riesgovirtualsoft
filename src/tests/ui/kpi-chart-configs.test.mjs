/**
 * Pruebas de las configuraciones de Chart.js del Control Operativo (`ui/charts/operativo-chart-configs.js` y
 * `operativo-chart-plan.js`). Diferencial contra las funciones LITERALES de app.js (`drawChart`,
 * `drawPunctualDatesChart`, `drawCombinedChart`, `drawCombinedChartDaily`, `drawScatterMatriz`,
 * `destroyChart` y `renderControlOperativoCharts`, líneas 7003-8328) ejecutadas con un Chart simulado que
 * captura la configuración. Las funciones (formatter, callbacks) se comparan por lo que devuelven con un
 * conjunto de valores de prueba.
 */
import { createRunner, assert } from '../test-harness.mjs';
import * as C from '../../ui/charts/operativo-chart-configs.js';
import * as P from '../../ui/charts/operativo-chart-plan.js';
import { aggregateOperativoData, selectGlobalForCharts } from '../../domain/analytics/metrics-calculator.js';
import { makeSide, observe, SUPERVISORES } from '../helpers/kpi-harness.mjs';
import { makeRng, makeRawData, normalizeConfig, FORMAT_PROBES } from '../helpers/kpi-test-env.mjs';

const { test, summarize } = createRunner('operativo-chart-configs (gráficas del Control Operativo)');

const NOW = new Date(2026, 9, 6, 15, 0, 0).getTime();
const clone = (o) => JSON.parse(JSON.stringify(o));

/** Ejecuta `fnName(...args)` en el lado original y en el nuevo con los mismos datos y compara todo lo observable. */
function compare(fnName, args, opts = {}) {
    const mk = (kind) => {
        const side = makeSide(kind, { nowMs: NOW, withDatalabels: opts.withDatalabels, selected: opts.selected, missingDom: opts.missingDom });
        side.window.controlOperativoRawData = clone(opts.raw || {});
        if (opts.pre) opts.pre(side);
        return side;
    };
    const a = mk('legacy');
    const b = mk('new');
    let ea = null, eb = null;
    try { a.api[fnName](...clone(args)); } catch (e) { ea = e.constructor.name + ': ' + e.message; }
    try { b.api[fnName](...clone(args)); } catch (e) { eb = e.constructor.name + ': ' + e.message; }
    assert.equal(eb, ea, `${fnName}: error distinto`);
    assert.deepEqual(observe(b), observe(a), `${fnName}(${JSON.stringify(args).slice(0, 120)}): difiere del original`);
    return { a, b };
}

const GESTORES_DATA = {
    'Ana Pérez': { Retiros_Aprobados: 40, Retiros_Rechazados: 8, Tasa_Aprobacion_Dia: 5.33, Porcentaje_Rechazos: 16.67, Prom_Minutos_Tarde: 12.5, Prom_Inactividad_Diaria: 50, Retiros_Procesados: 48 },
    'Luis Gómez': { Retiros_Aprobados: 100, Retiros_Rechazados: 2, Tasa_Aprobacion_Dia: 14.3, Porcentaje_Rechazos: 1.96, Prom_Minutos_Tarde: 0, Prom_Inactividad_Diaria: 10, Retiros_Procesados: 102 },
    'María López': { Retiros_Aprobados: 7, Retiros_Rechazados: 3, Tasa_Aprobacion_Dia: 1, Porcentaje_Rechazos: 30, Prom_Minutos_Tarde: 3.25, Prom_Inactividad_Diaria: 25.5, Retiros_Procesados: 10 },
    'Zoe Ríos': { Retiros_Aprobados: 0, Retiros_Rechazados: 0, Tasa_Aprobacion_Dia: 0, Porcentaje_Rechazos: 0, Prom_Minutos_Tarde: 0, Prom_Inactividad_Diaria: 0, Retiros_Procesados: 0 }
};

// ------------------------------------------------------------------ drawChart
test('diferencial vs app.js 8033-8083 (drawChart): barras verticales y horizontales, con y sin ChartDataLabels', () => {
    for (const withDatalabels of [false, true]) {
        compare('drawChart', ['chartInactividad', 'bar', ['A', 'B'], [1, 2.5], 'Minutos', ['rgba(1)', 'rgba(2)'], ['rgba(1)', 'rgba(2)']], { withDatalabels });
        compare('drawChart', ['chartTardanzasPeores', 'bar', ['A'], [0], 'Min', ['c'], ['b'], { indexAxis: 'y' }], { withDatalabels });
        compare('drawChart', ['chartTardanzasPeores', 'bar', [], [], 'Vacío', [], []], { withDatalabels });
    }
});

test('diferencial vs app.js 8033-8083 (drawChart): extraOptions con datalabels propios, escalas, maxBarThickness y layout que pisa el de defecto', () => {
    // JSON no conserva funciones: se arma el mismo `extraOptions` en cada lado con una fábrica
    for (const kind of ['legacy', 'new']) {
        const side = makeSide(kind, { nowMs: NOW });
        const extra = { maxBarThickness: 36, plugins: { datalabels: { formatter: (v) => `+${v}m`, anchor: 'end' } }, scales: { y: { beginAtZero: true } } };
        side.api.drawChart('chartTardanzasPeores', 'bar', ['x', 'y'], [3, 4], 'Minutos Tarde', ['r', 'g'], ['r', 'g'], extra);
        side.__obs = observe(side);
        if (kind === 'legacy') globalThis.__kpiLegacyObs = side.__obs; else assert.deepEqual(side.__obs, globalThis.__kpiLegacyObs);
    }
    compare('drawChart', ['chartInactividad', 'line', ['x'], [3], 'L', 'red', 'blue', { layout: { padding: 5 }, indexAxis: 'y', plugins: { legend: { display: false } } }]);
    compare('drawChart', ['chartInactividad', 'bar', ['x'], [3], 'L', 'red', 'blue', { plugins: { datalabels: null } }]);
});

test('drawChart: el formateador muestra "0 min" para 0, enteros sin decimales y decimales con 2 (es-CO)', () => {
    const f = C.formatBarValue;
    assert.equal(f(0), '0 min');
    assert.equal(f('0'), '0 min');
    assert.equal(f(12), '12');
    assert.equal(f(12.5), '12,50');
    assert.equal(f(1234.567), '1.234,57');
    assert.equal(f('7'), '7');
});

test('buildBarChartConfig no muta extraOptions (el original sí agregaba plugins.datalabels sobre el objeto recibido)', () => {
    const extra = { indexAxis: 'y' };
    const cfg = C.buildBarChartConfig({ type: 'bar', labels: ['a'], dataArr: [1], labelStr: 'x', bgColor: 'c', borderColor: 'b', extraOptions: extra });
    assert.deepEqual(extra, { indexAxis: 'y' });
    assert.ok(cfg.options.plugins.datalabels);
    assert.equal(cfg.options.layout.padding.right, 40);
});

// ------------------------------------------------------------------ drawPunctualDatesChart
test('diferencial vs app.js 7972-8031 (drawPunctualDatesChart): ignora dataArr y bgColors recibidos', () => {
    for (const withDatalabels of [false, true]) {
        compare('drawPunctualDatesChart', ['chartTardanzasMejores', ['2026-10-01', '2026-10-02'], [0, 0], ['rojo', 'azul']], { withDatalabels });
        compare('drawPunctualDatesChart', ['chartTardanzasMejores', [], [], []], { withDatalabels });
    }
    const cfg = C.buildPunctualDatesChartConfig({ dates: ['a', 'b', 'c'] });
    assert.deepEqual(cfg.data.datasets[0].data, [100, 100, 100]);
    assert.equal(cfg.data.datasets[0].backgroundColor, 'rgba(103, 194, 58, 0.8)');
});

// ------------------------------------------------------------------ drawCombinedChart / Daily
test('diferencial vs app.js 8085-8150 (drawCombinedChart): barras apiladas por gestor + línea de tasa', () => {
    for (const withDatalabels of [false, true]) {
        compare('drawCombinedChart', ['chartEficiencia', Object.keys(GESTORES_DATA), GESTORES_DATA], { withDatalabels });
    }
    compare('drawCombinedChart', ['chartEficiencia', [], {}]);
    // gestor ausente en data => el original lanza TypeError; el nuevo también
    compare('drawCombinedChart', ['chartEficiencia', ['No existe'], GESTORES_DATA]);
});

test('diferencial vs app.js 8152-8216 (drawCombinedChartDaily): series por fecha de un gestor', () => {
    const raw = {
        'Ana Pérez': {
            '2026-10-01': { Retiros_Aprobados: 10, Retiros_Rechazados: 1 }, '2026-10-02': { Retiros_Aprobados: 0, Retiros_Rechazados: 4 }, '2026-10-04': {}
        }
    };
    const fechas = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
    for (const withDatalabels of [false, true]) {
        compare('drawCombinedChartDaily', ['chartEficiencia', fechas, 'Ana Pérez'], { raw, withDatalabels });
    }
    compare('drawCombinedChartDaily', ['chartEficiencia', fechas, 'Otro'], { raw });
    compare('drawCombinedChartDaily', ['chartEficiencia', [], 'Ana Pérez'], { raw });
});

test('HALLAZGO: en drawCombinedChartDaily la serie "Aprobaciones del Día" repite exactamente los Aprobados', () => {
    const raw = { G: { d1: { Retiros_Aprobados: 5, Retiros_Rechazados: 2 }, d2: { Retiros_Aprobados: 1 } } };
    const s = C.buildCombinedDailySeries(['d1', 'd2', 'd3'], raw, 'G');
    assert.deepEqual(s.aprobadosData, [5, 1, 0]);
    assert.deepEqual(s.tasaData, s.aprobadosData);
    assert.deepEqual(s.rechazadosData, [2, 0, 0]);
});

// ------------------------------------------------------------------ drawScatterMatriz
test('diferencial vs app.js 8218-8328 (drawScatterMatriz): ranking global de % de rechazos', () => {
    for (const withDatalabels of [false, true]) {
        compare('drawScatterMatriz', ['chartMatrizFuga', Object.keys(GESTORES_DATA), GESTORES_DATA, true], { withDatalabels });
    }
    compare('drawScatterMatriz', ['chartMatrizFuga', Object.keys(GESTORES_DATA), GESTORES_DATA]);
    compare('drawScatterMatriz', ['chartMatrizFuga', [], {}, true]);
    const sinPct = { A: { Retiros_Aprobados: 1 }, B: { Porcentaje_Rechazos: 7 }, C: { Porcentaje_Rechazos: 2.5 }, D: { Porcentaje_Rechazos: 2 }, E: { Porcentaje_Rechazos: 5 } };
    compare('drawScatterMatriz', ['chartMatrizFuga', Object.keys(sinPct), sinPct, true]);
});

test('drawScatterMatriz: colores por umbral (>5 rojo, >2 ámbar, resto verde) justo en los bordes', () => {
    assert.equal(C.rechazosColor(5.01), 'rgba(245, 108, 108, 0.8)');
    assert.equal(C.rechazosColor(5), 'rgba(230, 162, 60, 0.8)');
    assert.equal(C.rechazosColor(2.01), 'rgba(230, 162, 60, 0.8)');
    assert.equal(C.rechazosColor(2), 'rgba(103, 194, 58, 0.8)');
    assert.equal(C.rechazosColor(0), 'rgba(103, 194, 58, 0.8)');
});

test('diferencial vs app.js 8218-8328 (drawScatterMatriz): un gestor, con números, textos "%", NaN, ausente y sin gestores', () => {
    const casos = [
        [['Ana'], { Ana: { Tasa_Aprobacion_Dia: 5.5, Porcentaje_Rechazos: 3.2 } }],
        [['Ana'], { Ana: { Tasa_Aprobacion_Dia: '5.5%', Porcentaje_Rechazos: '3.2%' } }],
        [['Ana'], { Ana: { Tasa_Aprobacion_Dia: 'abc', Porcentaje_Rechazos: undefined } }],
        [['Ana'], { Ana: {} }],
        [['Ana'], {}],
        [[], {}],
        [['Ana', 'Luis'], { Ana: { Tasa_Aprobacion_Dia: 1, Porcentaje_Rechazos: 2 }, Luis: { Tasa_Aprobacion_Dia: 9, Porcentaje_Rechazos: 9 } }]
    ];
    for (const withDatalabels of [false, true]) for (const [g, d] of casos) compare('drawScatterMatriz', ['chartMatrizFuga', g, d, false], { withDatalabels });
});

// ------------------------------------------------------------------ destroyChart
test('diferencial vs app.js 7003-7008 (destroyChart): destruye y retira del registro; id inexistente no hace nada', () => {
    const pre = (side) => { side.api.drawChart('chartInactividad', 'bar', ['a'], [1], 'x', 'c', 'b'); };
    const { a, b } = compare('destroyChart', ['chartInactividad'], { pre });
    assert.deepEqual(Object.keys(a.charts), []);
    assert.deepEqual(Object.keys(b.charts), []);
    compare('destroyChart', ['noExiste']);
});

test('redibujar una gráfica destruye la anterior antes de crear la nueva (igual que el original)', () => {
    const pre = (side) => { side.api.drawChart('chartInactividad', 'bar', ['a'], [1], 'x', 'c', 'b'); };
    const { a, b } = compare('drawChart', ['chartInactividad', 'bar', ['z'], [9], 'y', 'c2', 'b2'], { pre });
    assert.deepEqual(b.chartLog.map(l => l.op), ['new', 'destroy', 'new']);
    assert.deepEqual(a.chartLog.map(l => l.op), ['new', 'destroy', 'new']);
});

// ------------------------------------------------------------------ renderControlOperativoCharts (plan)
function globalesDe(raw, periodo, selectedGestores = []) {
    const { aggregatedDataGlobal, dailyData } = aggregateOperativoData(raw, { selectedGestores, selectedFecha: periodo, now: new Date(NOW) });
    return { data: selectGlobalForCharts(aggregatedDataGlobal, null, { legacyExcludedNames: SUPERVISORES }), dailyData }; // diferencial: lista fija explícita (D9b)
}

test('diferencial vs app.js 7737-7970 (renderControlOperativoCharts): vista global con datos y con el equipo 100 % puntual', () => {
    const rng = makeRng(31337);
    const raw = makeRawData(rng, { gestores: 8, dias: 40, baseMs: NOW });
    const { data, dailyData } = globalesDe(raw, 'Todas');
    for (const withDatalabels of [false, true]) {
        compare('renderControlOperativoCharts', [data, dailyData, 'Todos'], { raw, withDatalabels });
        compare('renderControlOperativoCharts', [data, dailyData, '3 Gestores'], { raw, withDatalabels });
    }
    // equipo 100 % puntual: nadie con Prom_Minutos_Tarde > 0
    const puntual = clone(data); Object.values(puntual).forEach(d => { d.Prom_Minutos_Tarde = 0; });
    const { a } = compare('renderControlOperativoCharts', [puntual, dailyData, 'Todos'], { raw });
    assert.equal(a.charts.chartTardanzasPeores.config.data.labels[0], 'Equipo 100% Puntual');
    // sin datos
    compare('renderControlOperativoCharts', [{}, {}, 'Todos'], { raw });
});

test('diferencial vs app.js 7737-7970: un solo gestor (con llegadas tarde, sin ellas, sin conexiones a tiempo, nombre con acentos y desconocido)', () => {
    const raw = {
        'Ana Pérez': {
            '2026-10-01': { Dias_Laborados: 1, Minutos_Tarde_Total: 0, Retiros_Aprobados: 5, Retiros_Rechazados: 1, Minutos_Inactividad_Total: 10 },
            '2026-10-02': { Dias_Laborados: 1, Minutos_Tarde_Total: 25, Retiros_Aprobados: 7, Retiros_Rechazados: 0, Minutos_Inactividad_Total: 30 },
            '2026-10-03': { Dias_Laborados: 1, Minutos_Tarde_Total: 0, Retiros_Aprobados: 2, Retiros_Rechazados: 2, Minutos_Inactividad_Total: 60 }
        },
        'Luis Gómez': { '2026-10-01': { Dias_Laborados: 1, Minutos_Tarde_Total: 0, Retiros_Aprobados: 1, Minutos_Inactividad_Total: 5 } },
        'Marta Ríos': { '2026-10-01': { Dias_Laborados: 1, Minutos_Tarde_Total: 15, Retiros_Aprobados: 1, Minutos_Inactividad_Total: 5 } }
    };
    const casos = [
        ['Ana Pérez', ['Ana Pérez']], ['ana perez', ['ana perez']], ['Luis Gómez', ['Luis Gómez']], ['Marta Ríos', ['Marta Ríos']],
        ['Desconocido', ['Desconocido']], ['Ana', ['Ana']], ['Ana Pérez', []]
    ];
    for (const [nombre, sel] of casos) {
        const { data, dailyData } = globalesDe(raw, 'Todas', sel);
        for (const withDatalabels of [false, true]) compare('renderControlOperativoCharts', [data, dailyData, nombre], { raw, selected: { operativoGestorMultiSelect: sel }, withDatalabels });
    }
});

test('diferencial vs app.js 7737-7970: varias selecciones ("2 Gestores") y títulos ausentes en el DOM (los null-checks)', () => {
    const rng = makeRng(99);
    const raw = makeRawData(rng, { gestores: 6, dias: 30, baseMs: NOW });
    const nombres = Object.keys(raw);
    const sel = [nombres[0], nombres[1].toLowerCase()];
    const { data, dailyData } = globalesDe(raw, 'Todas', sel);
    compare('renderControlOperativoCharts', [data, dailyData, '2 Gestores'], { raw, selected: { operativoGestorMultiSelect: sel } });
    compare('renderControlOperativoCharts', [data, dailyData, 'Todos'], { raw, missingDom: ['titleTardanzasPeores', 'titleTardanzasMejores', 'titleInactividad', 'titleEficiencia', 'titleMatrizFuga'] });
});

test('diferencial vs app.js 7737-7970: 40 combinaciones aleatorias (periodo x selección) con datos sintéticos', () => {
    let n = 0;
    for (let seed = 1; seed <= 10; seed++) {
        const rng = makeRng(seed * 55);
        const raw = makeRawData(rng, { gestores: 7, dias: 50, baseMs: NOW });
        const nombres = Object.keys(raw);
        for (const sel of [[], [nombres[0]], [nombres[1], nombres[2]], ['Nadie']]) {
            const periodo = ['Todas', '7', '30', 'thisMonth'][n % 4];
            const { data, dailyData } = globalesDe(raw, periodo, sel);
            const label = sel.length === 0 ? 'Todos' : (sel.length === 1 ? sel[0] : `${sel.length} Gestores`);
            compare('renderControlOperativoCharts', [data, dailyData, label], { raw, selected: { operativoGestorMultiSelect: sel }, withDatalabels: n % 2 === 0 });
            n += 1;
        }
    }
    assert.equal(n, 40);
});

test('plan: orden de las gráficas, tipos y títulos con nombre escapado', () => {
    const raw = { 'A<b>': { '2026-10-01': { Dias_Laborados: 1, Minutos_Tarde_Total: 0, Retiros_Aprobados: 1 } } };
    const global = P.buildControlOperativoChartPlan({ data: GESTORES_DATA, dailyData: { '2026-10-01': { Aprobados: 1, Rechazados: 0 } }, selectedGestor: 'Todos', selectedGestoresList: [], rawData: raw });
    assert.deepEqual(global.charts.map(c => c.id), ['chartTardanzasPeores', 'chartTardanzasMejores', 'chartInactividad', 'chartAprobacionesDia', 'chartEficiencia', 'chartMatrizFuga']);
    assert.deepEqual(global.charts.map(c => c.kind), ['bar', 'bar', 'bar', 'aprobacionesDia', 'combined', 'scatter']);
    const uno = P.buildControlOperativoChartPlan({ data: {}, dailyData: { '2026-10-01': { Aprobados: 1, Rechazados: 0 } }, selectedGestor: 'A<b>', selectedGestoresList: ['A<b>'], rawData: raw });
    assert.deepEqual(uno.charts.map(c => c.kind), ['bar', 'punctual', 'bar', 'aprobacionesDia', 'combinedDaily', 'scatter']);
    assert.ok(uno.titles.peores.includes('A&lt;b&gt;'));
    assert.equal(uno.isGlobal, false);
});

test('el normalizador ejercita las funciones de formato de la configuración (red de seguridad de las pruebas)', () => {
    const cfg = normalizeConfig(C.buildBarChartConfig({ type: 'bar', labels: ['a'], dataArr: [1], labelStr: 'x', bgColor: 'c', borderColor: 'b' }));
    assert.equal(cfg.options.plugins.datalabels.formatter.__fn.length, FORMAT_PROBES.length);
    assert.equal(cfg.options.plugins.datalabels.formatter.__fn[0], '0 min');
});

summarize();
