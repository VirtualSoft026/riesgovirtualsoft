/**
 * Pruebas del Análisis Textual del Control Operativo: `operativo-analysis.js` (agregación) y
 * `operativo-analysis-view.js` (HTML determinista), con diferencial contra `generarAnalisisTextual()` LITERAL
 * de app.js 7025-7211 (varios escenarios, incluidos los bordes: sin datos, un solo gestor, todos en cero).
 *
 * Decisiones D5 y D9b (2026-10-06): el predeterminado de los módulos es ahora el comportamiento DECIDIDO. Las pruebas
 * diferenciales comparan contra app.js pasando las opciones EXPLÍCITAS del original (`corregirBugs: false`,
 * `legacyExcludedNames`); las pruebas "D5"/"D9b" afirman el comportamiento nuevo (diferencias intencionales).
 */
import { createRunner, assert } from '../test-harness.mjs';
import { computeAnalysisStats, resolveFiltroGestor, isDateIncludedInAnalysis } from '../../domain/analytics/operativo-analysis.js';
import { buildAnalysisHtml, ANALYSIS_NO_DATA_HTML } from '../../ui/views/operativo-analysis-view.js';
import { makeSide, SUPERVISORES } from '../helpers/kpi-harness.mjs';
import { makeRng, makeRawData } from '../helpers/kpi-test-env.mjs';
import { buildSupervisorDirectory } from '../../domain/schedules/supervisor-directory.js';

const { test, summarize } = createRunner('operativo-analysis (Análisis Textual del Control Operativo)');

const NOW = new Date(2026, 9, 6, 15, 0, 0).getTime();
const clone = (o) => JSON.parse(JSON.stringify(o));

/** Resultado del ORIGINAL (app.js 7025-7211) ejecutado con DOM simulado. */
function legacy(raw, selected, filtro, nowMs = NOW, dates = {}) {
    const side = makeSide('legacy', { nowMs, selected: { operativoGestorMultiSelect: selected }, filtroFecha: filtro, customStart: dates.start, customEnd: dates.end });
    side.window.controlOperativoRawData = clone(raw);
    let error = null;
    try { side.api.generarAnalisisTextual(); } catch (e) { error = e.constructor.name + ': ' + e.message; }
    const body = side.dom.getElementById('analysisModalBody');
    return { html: body.innerHTML, active: side.dom.getElementById('analysisModal').classList.contains('active'), error, alerts: side.alerts };
}

/**
 * Resultado de los módulos nuevos con las mismas entradas. Por defecto con las opciones EXPLÍCITAS del original
 * (`corregirBugs: false`, `legacyExcludedNames`); con `opts.decided` usa los predeterminados (D5/D9b) y el resto de
 * `opts` (p. ej. `supervisorDirectory`).
 */
function nuevo(raw, selected, filtro, nowMs = NOW, dates = {}, opts = {}) {
    const { decided = false, ...rest } = opts;
    const base = decided ? {} : { legacyExcludedNames: SUPERVISORES, corregirBugs: false };
    const analysis = computeAnalysisStats(clone(raw), {
        ...base, selectedGestores: selected, filtroFecha: filtro,
        dateStart: filtro === 'custom' ? dates.start : null, dateEnd: filtro === 'custom' ? dates.end : null, now: new Date(nowMs), ...rest
    });
    let html = '', error = null;
    try { html = buildAnalysisHtml(analysis, resolveFiltroGestor(selected), { ...base, ...rest }); } catch (e) { error = e.constructor.name + ': ' + e.message; }
    return { html, error, analysis };
}

function same(raw, selected, filtro, nowMs = NOW, dates = {}) {
    const a = legacy(raw, selected, filtro, nowMs, dates);
    const b = nuevo(raw, selected, filtro, nowMs, dates);
    assert.equal(b.error, a.error, `error distinto (${filtro}, ${JSON.stringify(selected)})`);
    if (!a.error) assert.equal(b.html, a.html, `HTML distinto (${filtro}, ${JSON.stringify(selected)})`);
    else assert.equal(a.html, '', 'con error el original no escribe el modal');
    return a;
}

const day = (extra) => ({ Retiros_Procesados: 10, Retiros_Aprobados: 9, Retiros_Rechazados: 1, ART_Desde_Creacion_Minutos: 600, ...extra });

// ---------------------------------------------------------------- escenarios deterministas
test('resolveFiltroGestor: Todos / nombre / Varios', () => {
    assert.equal(resolveFiltroGestor([]), 'Todos');
    assert.equal(resolveFiltroGestor(['Ana']), 'Ana');
    assert.equal(resolveFiltroGestor(['Ana', 'Luis']), 'Varios');
});

test('sin datos cargados: el original avisa con alert y no abre el modal', () => {
    const side = makeSide('legacy', { nowMs: NOW });
    side.window.controlOperativoRawData = null;
    side.api.generarAnalisisTextual();
    assert.deepEqual(side.alerts, ['Aún no se han cargado los datos. Por favor, espera un momento o haz clic en Actualizar Datos.']);
    assert.equal(side.dom.getElementById('analysisModal').classList.contains('active'), false);
});

test('borde: JSON sin gestores / sin datos en el periodo -> mensaje "No hay suficientes datos"', () => {
    for (const raw of [{}, { Ana: {} }, { Ana: { '2026-10-05': day({ Retiros_Procesados: 0, Retiros_Aprobados: 0, Retiros_Rechazados: 0 }) } }, { Ana: { '2020-01-01': day() } }]) {
        const r = same(raw, [], 'today');
        assert.equal(r.html, ANALYSIS_NO_DATA_HTML);
        assert.equal(r.active, true);
    }
});

test('borde: todos en cero (retiros procesados = 0 en todos) -> mensaje de sin datos', () => {
    const zero = (o) => ({ Retiros_Procesados: 0, Retiros_Aprobados: 0, Retiros_Rechazados: 0, ART_Desde_Creacion_Minutos: 0, ...o });
    const raw = { Ana: { '2026-10-05': zero(), '2026-10-04': zero() }, Luis: { '2026-10-05': zero() } };
    for (const filtro of ['Todas', 'today', 'yesterday', '7', '30', 'thisMonth', 'lastMonth']) assert.equal(same(raw, [], filtro).html, ANALYSIS_NO_DATA_HTML);
    assert.equal(same(raw, ['Ana'], 'Todas').html, ANALYSIS_NO_DATA_HTML);
});

test('un solo gestor (reporte individual): tabla, porcentajes y cada aviso de ART (alto >1200, estable, excelente <900)', () => {
    for (const [art, texto] of [[1300, 'Área de Oportunidad'], [1200, 'Rendimiento Estable'], [900, 'Rendimiento Estable'], [899.99, 'Excelente Velocidad'], [0, 'Excelente Velocidad']]) {
        const raw = { 'Ana Pérez': { '2026-10-05': day({ ART_Desde_Creacion_Minutos: art }) } };
        const r = same(raw, ['Ana Pérez'], 'Todas');
        assert.ok(r.html.includes(texto), `ART ${art} debe mostrar "${texto}"`);
        assert.ok(r.html.includes('Reporte Individual: Ana Pérez'));
        assert.ok(r.html.includes('9 (90.0%)') && r.html.includes('1 (10.0%)'));
    }
});

test('un solo gestor con ART promedio solo de los días con ART > 0', () => {
    const raw = { Ana: { '2026-10-05': day({ ART_Desde_Creacion_Minutos: 100 }), '2026-10-04': day({ ART_Desde_Creacion_Minutos: 0 }), '2026-10-03': day({ ART_Desde_Creacion_Minutos: 300 }) } };
    const r = same(raw, ['Ana'], 'Todas');
    assert.ok(r.html.includes('200.00 min'));
});

test('equipo ("Todos"): volumen y ART con 1, 2 y 3+ gestores, y cuello de botella', () => {
    const uno = { Ana: { '2026-10-05': day() } };
    const dos = { Ana: { '2026-10-05': day({ Retiros_Procesados: 20 }) }, Luis: { '2026-10-05': day({ ART_Desde_Creacion_Minutos: 300 }) } };
    const tres = { ...dos, Marta: { '2026-10-05': day({ Retiros_Procesados: 5, ART_Desde_Creacion_Minutos: 1500 }) } };
    const sinArt = { Ana: { '2026-10-05': day({ ART_Desde_Creacion_Minutos: 0 }) }, Luis: { '2026-10-05': day({ ART_Desde_Creacion_Minutos: 0 }) } };
    for (const raw of [uno, dos, tres, sinArt]) same(raw, [], 'Todas');
    const h = same(tres, [], 'Todas').html;
    assert.ok(h.includes('Resumen Ejecutivo del Equipo') && h.includes('Cuello de Botella Detectado'));
    assert.ok(h.includes('<strong>Ana</strong> con 20 procesados. Le sigue'));
    assert.ok(!same(dos, [], 'Todas').html.includes('Cuello de Botella'));
});

test('equipo: los supervisores se excluyen con "Todos" pero se incluyen si se seleccionan explícitamente', () => {
    const raw = { 'Oriana Borja': { '2026-10-05': day({ Retiros_Procesados: 99 }) }, 'Ana Pérez': { '2026-10-05': day() }, 'Sara Santamaría': { '2026-10-05': day({ Retiros_Procesados: 50 }) } };
    const t = same(raw, [], 'Todas');
    assert.ok(!t.html.includes('Oriana') && !t.html.includes('Sara'));
    const s = same(raw, ['Oriana Borja'], 'Todas');
    assert.ok(s.html.includes('Reporte Individual: Oriana Borja'));
    assert.equal(computeAnalysisStats(raw, { legacyExcludedNames: SUPERVISORES, selectedGestores: [], filtroFecha: 'Todas', now: new Date(NOW), corregirBugs: false }).excludedCount, 2);
});

test('HALLAZGO (comportamiento de producción): filtro "Varios" (2+ gestores seleccionados) -> TypeError, el modal no se abre', () => {
    const raw = { Ana: { '2026-10-05': day() }, Luis: { '2026-10-05': day() }, Vacio: { '2026-10-05': day({ Retiros_Procesados: 0 }) } };
    const varios = same(raw, ['Ana', 'Luis'], 'Todas');
    assert.match(varios.error, /^TypeError: Cannot read properties of undefined \(reading 'procesados'\)/);
    assert.equal(varios.active, false);
    // un solo gestor seleccionado SIN retiros no falla: no queda ningún gestor con datos => mensaje de "sin datos"
    const sinDatos = same(raw, ['Vacio'], 'Todas');
    assert.equal(sinDatos.error, null);
    assert.equal(sinDatos.html, ANALYSIS_NO_DATA_HTML);
});

test('D5 (predeterminado): 2+ gestores ("Varios") -> resumen del equipo SELECCIONADO, sin TypeError; sin datos -> mensaje; nombre escapado', () => {
    const raw = { Ana: { '2026-10-05': day() }, Luis: { '2026-10-05': day({ Retiros_Procesados: 30 }) }, Otro: { '2026-10-05': day({ Retiros_Procesados: 99 }) }, Vacio: { '2026-10-05': day({ Retiros_Procesados: 0 }) } };
    const v = nuevo(raw, ['Ana', 'Luis'], 'Todas', NOW, {}, { decided: true });
    assert.equal(v.error, null);
    assert.ok(v.html.includes('Resumen Ejecutivo del Equipo') && v.html.includes('<strong>Luis</strong> con 30 procesados') && !v.html.includes('Otro'));
    assert.ok(v.html.includes('volumen total de <strong>40 solicitudes</strong>'), 'el total suma solo a los seleccionados');
    const sd = nuevo(raw, ['Vacio'], 'Todas', NOW, {}, { decided: true });
    assert.equal(sd.html, ANALYSIS_NO_DATA_HTML);
    const xss = { '<img src=x onerror=alert(1)>': { '2026-10-05': day() } };
    assert.ok(nuevo(xss, ['<img src=x onerror=alert(1)>'], 'Todas', NOW, {}, { decided: true }).html.includes('Reporte Individual: &lt;img'));
    assert.ok(nuevo(xss, ['<img src=x onerror=alert(1)>'], 'Todas').html.includes('Reporte Individual: <img'), 'corregirBugs:false (original) no escapa');
    // con un gestor normal el texto del reporte individual es el mismo que el original
    assert.equal(nuevo(raw, ['Ana'], 'Todas', NOW, {}, { decided: true }).html, nuevo(raw, ['Ana'], 'Todas').html);
});

test('D5: 2, 3 y todos los gestores seleccionados + rango de fechas: cada métrica sale del historial filtrado (nada estático)', () => {
    const raw = {
        Ana: { '2026-10-05': day({ Retiros_Procesados: 10, Retiros_Aprobados: 9, Retiros_Rechazados: 1 }), '2026-08-01': day({ Retiros_Procesados: 500 }) },
        Luis: { '2026-10-04': day({ Retiros_Procesados: 20, Retiros_Aprobados: 15, Retiros_Rechazados: 5, ART_Desde_Creacion_Minutos: 300 }) },
        Marta: { '2026-10-06': day({ Retiros_Procesados: 5, Retiros_Aprobados: 5, Retiros_Rechazados: 0, ART_Desde_Creacion_Minutos: 1500 }) },
        Zoe: { '2026-10-06': day({ Retiros_Procesados: 1000 }) }
    };
    const dos = nuevo(raw, ['Ana', 'Luis'], '7', NOW, {}, { decided: true });
    assert.equal(dos.error, null);
    assert.deepEqual([dos.analysis.totalProcesados, dos.analysis.totalAprobados, dos.analysis.totalRechazados], [30, 24, 6], 'excluye el 1-ago de Ana y a los no seleccionados');
    assert.deepEqual(Object.keys(dos.analysis.gestoresStats), ['Ana', 'Luis']);
    const tres = nuevo(raw, ['Ana', 'Luis', 'Marta'], '7', NOW, {}, { decided: true });
    assert.equal(tres.analysis.totalProcesados, 35);
    assert.ok(tres.html.includes('Cuello de Botella Detectado') && tres.html.includes('<strong>Marta</strong>'));
    const ayer = nuevo(raw, ['Ana', 'Luis', 'Marta'], 'yesterday', NOW, {}, { decided: true });
    assert.equal(ayer.analysis.totalProcesados, 10, 'cambiar el rango cambia los totales');
    const custom = nuevo(raw, ['Ana', 'Zoe'], 'custom', NOW, { start: '2026-08-01', end: '2026-10-05' }, { decided: true });
    assert.equal(custom.analysis.totalProcesados, 510);
    // el original con 2+ gestores lanza TypeError (por eso esta prueba es una diferencia intencional por D5)
    assert.match(nuevo(raw, ['Ana', 'Luis'], '7').error, /^TypeError/);
});

test('D5: "mes anterior" = mes calendario previo completo los días 29, 30 y 31 (y años bisiestos); el original desbordaba', () => {
    const raw = { Ana: {
        '2025-12-31': day({ Retiros_Procesados: 1 }), '2026-01-31': day({ Retiros_Procesados: 2 }),
        '2026-02-01': day({ Retiros_Procesados: 4 }), '2026-02-28': day({ Retiros_Procesados: 8 }),
        '2026-03-01': day({ Retiros_Procesados: 16 }), '2026-03-10': day({ Retiros_Procesados: 32 }), '2026-03-31': day({ Retiros_Procesados: 64 }),
        '2026-04-30': day({ Retiros_Procesados: 128 }), '2026-05-31': day({ Retiros_Procesados: 256 }),
        '2028-02-01': day({ Retiros_Procesados: 1 }), '2028-02-29': day({ Retiros_Procesados: 2 }), '2028-03-01': day({ Retiros_Procesados: 4 }), '2028-03-31': day({ Retiros_Procesados: 8 })
    } };
    const proc = (y, m, d, opts) => { const r = nuevo(raw, [], 'lastMonth', new Date(y, m - 1, d, 12).getTime(), {}, opts); return r.analysis.gestoresStats.Ana ? r.analysis.gestoresStats.Ana.procesados : 0; };
    const D = { decided: true };
    for (const d of [29, 30, 31]) assert.equal(proc(2026, 3, d, D), 12, `${d}-mar-2026 -> febrero completo (1 y 28)`);
    assert.equal(proc(2026, 3, 31), 112, 'original 31-mar: "31-feb" = 3-mar -> cuenta MARZO');
    assert.equal(proc(2026, 3, 29), 112, 'original 29-mar (2026 no bisiesto): "29-feb" = 1-mar -> cuenta MARZO');
    assert.equal(proc(2026, 3, 28), 12, 'el 28 el original no desborda');
    assert.equal(proc(2026, 5, 31, D), 128, '31-may -> abril (30 días) completo');
    assert.equal(proc(2026, 5, 31), 256, 'original 31-may: "31-abr" = 1-may');
    assert.equal(proc(2026, 1, 31, D), 1, '31-ene -> diciembre del año anterior');
    for (const d of [29, 30, 31]) assert.equal(proc(2028, 3, d, D), 3, `${d}-mar-2028 (bisiesto) -> febrero completo incluido el 29`);
    assert.equal(proc(2028, 3, 29), 3, 'original 29-mar-2028: "29-feb" existe -> no desborda');
    assert.equal(proc(2028, 3, 30), 12, 'original 30-mar-2028: "30-feb" = 1-mar -> cuenta MARZO');
    // el reporte coincide con la tabla: misma regla que resolveOperativoRanges
    const hoy = new Date(2026, 9, 6, 12).getTime();
    const raw2 = { Ana: { '2026-09-10': day({ Retiros_Procesados: 4 }), '2026-10-02': day({ Retiros_Procesados: 6 }) } };
    assert.equal(nuevo(raw2, [], 'lastMonth', hoy).analysis.gestoresStats.Ana.procesados, 4);
    assert.equal(nuevo(raw2, [], 'lastMonth', hoy, {}, D).analysis.gestoresStats.Ana.procesados, 4);
});

test('D9b (predeterminado): con "Todos" se excluye por ROL (nombre completo exacto); "Mariana" ya no queda oculta', () => {
    const raw = {
        'Mariana Ruiz': { '2026-10-05': day({ Retiros_Procesados: 40 }) }, 'Maria Sanchez': { '2026-10-05': day({ Retiros_Procesados: 70 }) },
        'Sara Santamaría': { '2026-10-05': day({ Retiros_Procesados: 50 }) }, 'Oriana Borja': { '2026-10-05': day({ Retiros_Procesados: 9 }) },
        'Ana Pérez': { '2026-10-05': day() }
    };
    const supervisorDirectory = buildSupervisorDirectory({
        s1: { name: 'María Sánchez', role: 'Supervisor' }, s2: { name: 'Sara Santamaria', role: 'Admin' },
        g1: { name: 'Mariana Ruiz', role: 'Gestor' }, g2: { name: 'Oriana Borja', role: 'Gestor' }
    });
    const nuevoD = nuevo(raw, [], 'Todas', NOW, {}, { decided: true, supervisorDirectory });
    assert.deepEqual(Object.keys(nuevoD.analysis.gestoresStats).sort(), ['Ana Pérez', 'Mariana Ruiz', 'Oriana Borja']);
    assert.equal(nuevoD.analysis.excludedCount, 2);
    assert.ok(nuevoD.html.includes('<strong>Mariana Ruiz</strong> con 40 procesados'), 'Mariana lidera el volumen y se ve');
    const original = nuevo(raw, [], 'Todas');
    assert.deepEqual(Object.keys(original.analysis.gestoresStats), ['Ana Pérez'], 'el original oculta a Mariana ("Maria") y a Oriana');
    assert.equal(nuevo(raw, [], 'Todas', NOW, {}, { decided: true }).analysis.excludedCount, 0, 'sin directorio no se excluye a nadie');
    assert.throws(() => computeAnalysisStats(raw, { excludedNames: SUPERVISORES, selectedGestores: [], filtroFecha: 'Todas', now: new Date(NOW) }), /excludedNames ya no se admite/);
    assert.throws(() => computeAnalysisStats(raw, { supervisorDirectory: ['Sara'], selectedGestores: [], filtroFecha: 'Todas', now: new Date(NOW) }), /legacyExcludedNames/);
});

test('HALLAZGO conservado SOLO con corregirBugs:false: "mes anterior" desborda el 31 (31-mar -> 3-mar) y cuenta marzo; diferencial', () => {
    const now = new Date(2026, 2, 31, 12, 0).getTime();
    const raw = { Ana: { '2026-03-10': day({ Retiros_Procesados: 7 }), '2026-02-10': day({ Retiros_Procesados: 3 }) } };
    const prod = nuevo(raw, [], 'lastMonth', now);
    assert.equal(prod.analysis.gestoresStats.Ana.procesados, 7, 'original: toma marzo (el mes en curso)');
    assert.equal(same(raw, [], 'lastMonth', now).html, prod.html);
    assert.equal(nuevo(raw, [], 'lastMonth', now, {}, { decided: true }).analysis.gestoresStats.Ana.procesados, 3, 'decidido: febrero');
});

test('periodo personalizado: rango inclusivo; sin una de las fechas no filtra nada (igual que el original)', () => {
    const raw = { Ana: { '2026-10-01': day({ Retiros_Procesados: 1 }), '2026-10-05': day({ Retiros_Procesados: 2 }), '2026-10-09': day({ Retiros_Procesados: 4 }) } };
    assert.equal(same(raw, [], 'custom', NOW, { start: '2026-10-01', end: '2026-10-05' }).html.includes('3 solicitudes'), true);
    assert.equal(same(raw, [], 'custom', NOW, { start: '', end: '2026-10-05' }).html.includes('7 solicitudes'), true);
    same(raw, [], 'custom', NOW, { start: '2026-10-09', end: '2026-10-01' });
});

test('isDateIncludedInAnalysis (original, corregirBugs:false): today/yesterday/7/30 (sin tope superior)/thisMonth', () => {
    const today = new Date(2026, 9, 6); today.setHours(0, 0, 0, 0);
    const c = (filtroFecha, date) => isDateIncludedInAnalysis(date, { filtroFecha, isCustom: false, dateStart: null, dateEnd: null, today, corregirBugs: false });
    assert.equal(c('today', '2026-10-06'), true);
    assert.equal(c('today', '2026-10-05'), false);
    assert.equal(c('yesterday', '2026-10-05'), true);
    assert.equal(c('7', '2026-09-29'), true);
    assert.equal(c('7', '2026-09-28'), false);
    assert.equal(c('7', '2026-12-31'), true, 'una fecha futura entra en "7 días" (sin tope superior), a diferencia de aggregateOperativoData');
    assert.equal(c('30', '2026-09-06'), true);
    assert.equal(c('30', '2026-09-05'), false);
    assert.equal(c('thisMonth', '2026-10-31'), true);
    assert.equal(c('thisMonth', '2025-10-05'), false);
    assert.equal(c('Todas', '1999-01-01'), true);
});

test('D5: isDateIncludedInAnalysis usa el MISMO rango que la tabla (cerrado hasta hoy; personalizado incompleto = nada)', () => {
    const today = new Date(2026, 9, 6); today.setHours(0, 0, 0, 0);
    const c = (filtroFecha, date, extra = {}) => isDateIncludedInAnalysis(date, { filtroFecha, isCustom: filtroFecha === 'custom', dateStart: null, dateEnd: null, today, ...extra });
    assert.equal(c('7', '2026-09-29'), true);
    assert.equal(c('7', '2026-09-28'), false);
    assert.equal(c('7', '2026-12-31'), false, 'una fecha futura ya no entra en "últimos 7 días"');
    assert.equal(c('30', '2026-09-06'), true);
    assert.equal(c('lastMonth', '2026-09-30'), true);
    assert.equal(c('lastMonth', '2026-10-01'), false);
    assert.equal(c('custom', '2026-10-01', { dateStart: '2026-10-01', dateEnd: '2026-10-03' }), true);
    assert.equal(c('custom', '2026-10-04', { dateStart: '2026-10-01', dateEnd: '2026-10-03' }), false);
    assert.equal(c('custom', '2026-10-01', { dateStart: '', dateEnd: '2026-10-03' }), false, 'personalizado sin ambas fechas: nada (como la tabla)');
    assert.equal(c('Todas', '1999-01-01'), true);
});

// ---------------------------------------------------------------- diferencial aleatorio
test('diferencial vs app.js 7025-7211: 25 conjuntos aleatorios x 8 periodos x 5 selecciones (HTML idéntico o mismo error)', () => {
    const FILTROS = ['Todas', 'today', 'yesterday', '7', '30', 'thisMonth', 'lastMonth', 'custom'];
    const NOWS = [NOW, new Date(2026, 0, 31, 9).getTime(), new Date(2026, 2, 1, 0, 5).getTime(), new Date(2026, 11, 30, 23, 0).getTime(), new Date(2026, 4, 31, 10).getTime()];
    let casos = 0, conError = 0, conHtml = 0;
    for (let seed = 1; seed <= 25; seed++) {
        const nowMs = NOWS[seed % NOWS.length];
        const rng = makeRng(seed * 104729);
        const raw = makeRawData(rng, { gestores: 7, dias: 60, baseMs: nowMs });
        const nombres = Object.keys(raw);
        for (const filtro of FILTROS) {
            for (const sel of [[], [nombres[0]], [nombres[1], nombres[2]], ['Gestor Inexistente'], nombres.slice(0, 1).concat(['Oriana Borja'])]) {
                const dates = { start: new Date(nowMs - 25 * 86400000).toISOString().split('T')[0], end: new Date(nowMs - 4 * 86400000).toISOString().split('T')[0] };
                const a = same(raw, sel, filtro, nowMs, dates);
                casos += 1;
                if (a.error) conError += 1; else conHtml += 1;
            }
        }
    }
    assert.equal(casos, 25 * 8 * 5);
    assert.ok(conHtml > 200 && conError > 10, `cobertura: ${conHtml} con HTML, ${conError} con error`);
});

summarize();
