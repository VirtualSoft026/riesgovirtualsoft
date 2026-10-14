import { createRunner, assert } from '../test-harness.mjs';
import { createShiftReportsController, SHIFT_REPORTS_MESSAGES } from '../../controllers/shift-reports-controller.js';
import { createFakeDocument, createElement } from '../helpers/fake-dom-historial.mjs';

const { testAsync, test, summarizeAsync } = createRunner('shift-reports-controller (historial de turnos: carga, filtros, modal y PDF)');

const NOW = new Date(2026, 9, 6, 15, 30).getTime();
const DAY = 86400000;
const REPORTS = [
    { fb_id: 'a', gestor: 'Ana Pérez', rol: 'Gestor', timestamp: NOW - 3600000, horaInicio: 'x', horaFin: 'y', reporte: 'r\n=== BITÁCORA DE TIEMPOS ===\nAlmuerzo 12:00' },
    { fb_id: 'b', gestor: 'Luis Fuentes', rol: 'Gestor', timestamp: NOW - 10 * DAY },
    { fb_id: 'c', gestor: 'Ana Pérez', rol: 'Gestor', timestamp: NOW - 20 * DAY }
];

function setup({ reports = REPORTS, selected = [], fecha = '', worker, fetchById } = {}) {
    const alerts = []; const timers = []; const errors = []; const multi = { setups: [] };
    const tbody = createElement('shiftReportsTableBody');
    const wrap = createElement('wrap'); const wrap2 = createElement('wrap2');
    tbody.parentElement = wrap; wrap.parentElement = wrap2;
    const els = {
        shiftReportsTableBody: tbody, filterFechaInput: createElement('filterFechaInput', { value: fecha }),
        shiftDetailModalBody: createElement('shiftDetailModalBody'), exportPdfModalBtn: createElement('exportPdfModalBtn'), shiftDetailModal: createElement('shiftDetailModal')
    };
    const document = createFakeDocument(els);
    const repoCalls = [];
    const repository = {
        fetchAllShiftReports: async () => { repoCalls.push('all'); return reports.map((r) => ({ ...r })); },
        fetchShiftReportById: fetchById || (async (id) => { repoCalls.push('byId:' + id); return null; })
    };
    const ctl = createShiftReportsController({
        document, repository,
        setupCustomMultiSelect: (id, options, cb) => multi.setups.push({ id, options, cb }),
        getSelectedMultiSelectValues: () => selected,
        summarizeTasks: (r) => `\n[ FINALIZADA ] - Tarea de ${r.gestor}\nObservación: N/A\n`,
        getPdfWorker: worker === undefined ? () => null : worker,
        alert: (m) => alerts.push(m), now: () => NOW, setTimeout: (fn, ms) => timers.push({ fn, ms }), logger: { error: (...a) => errors.push(a) }
    });
    return { ctl, els, tbody, wrap2, document, alerts, timers, errors, multi, repoCalls };
}

testAsync('renderShiftReports: pinta "cargando", carga de Firebase, arma el multiselect y filtra por defecto (últimos 2 días)', async () => {
    const t = setup();
    const p = t.ctl.renderShiftReports();
    assert.ok(t.tbody.innerHTML.includes('Cargando historial de turnos...'));
    await p;
    assert.equal(t.multi.setups.length, 1);
    assert.equal(t.multi.setups[0].id, 'turnosGestorMultiSelect');
    assert.deepEqual(t.multi.setups[0].options, ['Ana Pérez', 'Luis Fuentes']);
    assert.equal((t.tbody.innerHTML.match(/<tr /g) || []).length, 1, 'solo el turno de hoy');
    assert.ok(t.tbody.innerHTML.includes('Ver Bitácora de Tiempos'));
    // el callback del multiselect vuelve a filtrar
    t.multi.setups[0].cb();
});

testAsync('footer informativo: sin filtros se muestra a los 50 ms con el conteo; con filtros se retira', async () => {
    const t = setup();
    await t.ctl.renderShiftReports();
    assert.ok(t.timers.every((x) => x.ms === 50));
    t.timers.at(-1).fn();
    const msg = t.wrap2.children[0];
    assert.equal(msg.id, 'shiftReportsMostrandoMsg');
    assert.ok(msg.innerText.startsWith('Mostrando turnos de los últimos 2 días (1 turnos).'));
    const withFilter = setup({ selected: ['Ana Pérez'] });
    await withFilter.ctl.renderShiftReports();
    assert.equal((withFilter.tbody.innerHTML.match(/<tr /g) || []).length, 2, 'con gestor explícito no aplica la ventana de 2 días');
    withFilter.timers.at(-1).fn();
    assert.equal(withFilter.wrap2.children.length, 0);
});

testAsync('sin resultados: mensaje según haya o no filtros explícitos', async () => {
    const t = setup({ fecha: '2020-01-01' });
    await t.ctl.renderShiftReports();
    assert.ok(t.tbody.innerHTML.includes('No hay historial de turnos registrados con los filtros seleccionados.'));
    const t2 = setup({ reports: [REPORTS[1]] });
    await t2.ctl.renderShiftReports();
    assert.ok(t2.tbody.innerHTML.includes('No hay turnos registrados en los últimos 2 días.'));
});

testAsync('segunda llamada con datos precargados filtra de inmediato (sin fila de "cargando")', async () => {
    const t = setup();
    await t.ctl.renderShiftReports();
    const p = t.ctl.renderShiftReports();
    assert.ok(!t.tbody.innerHTML.includes('Cargando historial'), 'no se pinta el cargando');
    await p;
    assert.equal(t.repoCalls.filter((c) => c === 'all').length, 2);
});

testAsync('error de Firebase: se registra y se muestran los datos que hubiera (lista vacía) sin lanzar', async () => {
    const t = setup();
    const failing = createShiftReportsController({
        document: t.document, repository: { fetchAllShiftReports: async () => { throw new Error('sin permiso ficticio'); }, fetchShiftReportById: async () => null },
        setupCustomMultiSelect() {}, getSelectedMultiSelectValues: () => [], summarizeTasks: () => '', now: () => NOW, setTimeout() {}, logger: { error: (...a) => t.errors.push(a) }
    });
    await failing.renderShiftReports();
    assert.equal(t.errors[0][0], 'Error cargando historial de turnos:');
    assert.ok(t.tbody.innerHTML.includes('No hay turnos registrados'));
});

testAsync('modal "Ver Todo": rellena el cuerpo, ata el botón PDF al id y lo abre; id desconocido avisa', async () => {
    const t = setup();
    await t.ctl.renderShiftReports();
    t.ctl.openShiftDetailModal('a');
    assert.ok(t.els.shiftDetailModalBody.innerHTML.includes('Ana Pérez'));
    assert.equal(t.els.shiftDetailModal.classList.contains('active'), true);
    assert.equal(typeof t.els.exportPdfModalBtn.onclick, 'function');
    t.ctl.openShiftDetailModal('zzz');
    assert.deepEqual(t.alerts, [SHIFT_REPORTS_MESSAGES.NOT_FOUND_LOCAL]);
    assert.equal(SHIFT_REPORTS_MESSAGES.NOT_FOUND_LOCAL, 'No se encontró la información del turno.');
});

testAsync('exportShiftReport: con el motor de PDF genera el archivo con las opciones del original y limpia el contenedor temporal', async () => {
    const calls = [];
    const worker = { set(o) { calls.push(['set', o]); return this; }, from(el) { calls.push(['from', el]); return this; }, async save() { calls.push(['save']); } };
    const t = setup({ worker: () => worker });
    await t.ctl.renderShiftReports();
    await t.ctl.exportShiftReport('a');
    assert.equal(calls[0][0], 'set');
    assert.ok(/^Reporte_Turno_ana_p_rez_.*\.pdf$/.test(calls[0][1].filename), calls[0][1].filename);
    assert.equal(calls[0][1].jsPDF.format, 'a4');
    assert.ok(calls[1][1].innerHTML.includes('RISK MANAGER'));
    assert.equal(calls[1][1].style.startsWith('width: 750px'), true);
    assert.equal(t.document.body.children.length, 0, 'el contenedor se retira del body');
    assert.deepEqual(t.alerts, []);
});

testAsync('exportShiftReport: sin motor de PDF avisa "Cargando motor..."; reporte no encontrado en memoria se busca en Firebase y si no existe avisa', async () => {
    const t = setup();
    await t.ctl.renderShiftReports();
    await t.ctl.exportShiftReport('a');
    assert.deepEqual(t.alerts, [SHIFT_REPORTS_MESSAGES.PDF_ENGINE_LOADING]);
    t.alerts.length = 0;
    await t.ctl.exportShiftReport('nuevo');
    assert.deepEqual(t.repoCalls.filter((c) => c.startsWith('byId')), ['byId:nuevo']);
    assert.deepEqual(t.alerts, [SHIFT_REPORTS_MESSAGES.NOT_FOUND_DB]);
    assert.equal(SHIFT_REPORTS_MESSAGES.NOT_FOUND_DB, 'No se encontró el reporte en la base de datos.');
});

testAsync('exportShiftReport: reporte que solo existe en Firebase se exporta; si el motor falla avisa y registra (el contenedor queda, igual que el original)', async () => {
    const worker = { set() { return this; }, from() { return this; }, async save() { throw new Error('fallo ficticio'); } };
    const t = setup({ worker: () => worker, fetchById: async () => ({ gestor: 'Remoto', timestamp: NOW }) });
    await t.ctl.exportShiftReport('solo-remoto');
    assert.deepEqual(t.alerts, [SHIFT_REPORTS_MESSAGES.EXPORT_ERROR]);
    assert.equal(t.errors.length, 1);
    assert.equal(t.document.body.children.length, 1, 'comportamiento heredado: no hay finally que retire el contenedor');
});

test('sin tabla en la página no hace nada', () => {
    const t = setup();
    t.document.byId.delete('shiftReportsTableBody');
    assert.doesNotThrow(() => t.ctl.applyShiftReportsFilters());
});

await summarizeAsync();
