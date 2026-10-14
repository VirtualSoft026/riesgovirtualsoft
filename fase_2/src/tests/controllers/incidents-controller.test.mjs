import { createRunner, assert } from '../test-harness.mjs';
import { createFakeRtdb } from '../helpers/fake-rtdb-comunicados.mjs';
import { createFakeDocument } from '../helpers/fake-dom-comunicados.mjs';
import { createIncidentRepository } from '../../services/firebase/firebase-incident-repository.js';
import { createIncidentsController } from '../../controllers/incidents-controller.js';
import { INCIDENT_MESSAGES } from '../../domain/incidents/incident-service.js';
import { escapeHTML } from '../../utils/sanitization.js';

const { test, testAsync, summarizeAsync } = createRunner('incidents-controller (novedades con base y DOM simulados)');

const NOW = 1790000000000;

/** Reglas de `logs` de database.rules.json: lee Admin/Supervisor; crea cualquier aprobado solo si el nodo es nuevo y uid === auth.uid. */
function logsRules(roleOf, authUidOf) {
    return {
        canRead: (path) => !path.startsWith('logs') || ['Admin', 'Supervisor'].includes(roleOf()),
        canWrite: (op, path, newValue, oldValue) => /^logs\/[^/]+$/.test(path) && oldValue === null && newValue !== null && newValue.uid === authUidOf()
    };
}

function setup({ user = { uid: 'g1', name: 'Ana', email: 'ana@virtualsoft.tech', role: 'Gestor' }, authUser, data = {} } = {}) {
    const db = createFakeRtdb({ data });
    const document = createFakeDocument();
    const alerts = [];
    const errors = [];
    const state = { user, authUser: authUser === undefined ? (user ? { uid: user.uid } : null) : authUser };
    db.rules = logsRules(() => state.user && state.user.role, () => state.authUser && state.authUser.uid);
    const controller = createIncidentsController({
        repository: createIncidentRepository({ database: db }),
        document,
        getUser: () => state.user,
        getAuthUser: () => state.authUser,
        now: () => NOW,
        alert: (m) => alerts.push(m),
        logger: { error: (...a) => errors.push(a) }
    });
    return { db, document, controller, alerts, errors, state };
}

function fillForm(document, { type = '', title = '', assignee = '', detail = '' }) {
    document.el('incidentType').value = type;
    document.el('incidentTitle').value = title;
    document.el('incidentAssignee').value = assignee;
    document.el('incidentDetail').value = detail;
}

const event = () => { const e = { prevented: false, preventDefault() { e.prevented = true; } }; return e; };

testAsync('enviar: crea la novedad en logs con el payload exacto, limpia el formulario y avisa', async () => {
    const t = setup();
    fillForm(t.document, { type: 'Soporte', title: '  Caída del sistema ', assignee: ' Luis ', detail: ' No carga ' });
    let reset = 0;
    t.document.el('incidentForm').reset = () => { reset += 1; };
    const e = event();
    await t.controller.handleSubmit(e);
    assert.equal(e.prevented, true);
    const [stored] = Object.values(t.db.snapshot('logs'));
    assert.deepEqual(stored, { uid: 'g1', type: 'Soporte', title: 'Caída del sistema', assignedTo: 'Luis', detail: 'No carga', reportedBy: 'Ana', reportedByEmail: 'ana@virtualsoft.tech', timestamp: NOW, status: 'Abierto' });
    assert.equal(reset, 1);
    assert.deepEqual(t.alerts, [INCIDENT_MESSAGES.REGISTERED]);
});

testAsync('enviar: tipo vacío -> "Novedad Operativa"; responsable vacío -> nombre del usuario', async () => {
    const t = setup();
    fillForm(t.document, { title: 'T', detail: 'D' });
    await t.controller.handleSubmit(event());
    const [stored] = Object.values(t.db.snapshot('logs'));
    assert.equal(stored.type, 'Novedad Operativa');
    assert.equal(stored.assignedTo, 'Ana');
});

testAsync('enviar sin sesión local: avisa y no escribe; con título o detalle vacío: avisa y no escribe', async () => {
    const t = setup({ user: null });
    fillForm(t.document, { title: 'T', detail: 'D' });
    await t.controller.handleSubmit(event());
    assert.deepEqual(t.alerts, [INCIDENT_MESSAGES.LOGIN_REQUIRED]);
    assert.equal(t.db.snapshot('logs'), null);
    const u = setup();
    fillForm(u.document, { title: '   ', detail: 'D' });
    await u.controller.handleSubmit(event());
    fillForm(u.document, { title: 'T', detail: '' });
    await u.controller.handleSubmit(event());
    assert.deepEqual(u.alerts, [INCIDENT_MESSAGES.MISSING_FIELDS, INCIDENT_MESSAGES.MISSING_FIELDS]);
    assert.equal(u.db.snapshot('logs'), null);
});

testAsync('enviar: usa el uid de la sesión de Firebase si el usuario local no lo trae; sin ninguno falla con aviso de error', async () => {
    const t = setup({ user: { name: 'Ana', role: 'Gestor' }, authUser: { uid: 'f1' } });
    fillForm(t.document, { title: 'T', detail: 'D' });
    await t.controller.handleSubmit(event());
    assert.equal(Object.values(t.db.snapshot('logs'))[0].uid, 'f1');
    const n = setup({ user: { name: 'Ana', role: 'Gestor' }, authUser: null });
    fillForm(n.document, { title: 'T', detail: 'D' });
    await n.controller.handleSubmit(event());
    assert.deepEqual(n.alerts, [INCIDENT_MESSAGES.REGISTER_ERROR]);
    assert.equal(n.errors[0][0], 'Error registrando novedad en /logs:');
});

testAsync('enviar: si la base lo rechaza (uid local distinto del de la sesión) avisa "Ocurrió un error..." y NO limpia el formulario', async () => {
    const t = setup({ user: { uid: 'viejo', name: 'Ana', role: 'Gestor' }, authUser: { uid: 'nuevo' } });
    fillForm(t.document, { title: 'T', detail: 'D' });
    let reset = 0;
    t.document.el('incidentForm').reset = () => { reset += 1; };
    await t.controller.handleSubmit(event());
    assert.deepEqual(t.alerts, [INCIDENT_MESSAGES.REGISTER_ERROR]);
    assert.equal(reset, 0);
    assert.equal(t.db.snapshot('logs'), null);
});

testAsync('enviar: no se puede sobrescribir una novedad existente (la regla exige nodo nuevo) y cada envío crea una clave distinta', async () => {
    const t = setup();
    fillForm(t.document, { title: 'T', detail: 'D' });
    await t.controller.handleSubmit(event());
    await t.controller.handleSubmit(event());
    assert.equal(Object.keys(t.db.snapshot('logs')).length, 2);
    await assert.rejects(() => t.db.ref('logs/' + Object.keys(t.db.snapshot('logs'))[0]).set({ uid: 'g1', title: 'pisada' }));
});

testAsync('enviar con usuario sin nombre: el SDK rechaza `undefined` (reportedBy) y se avisa (comportamiento original)', async () => {
    const t = setup({ user: { uid: 'g1', role: 'Gestor' } });
    fillForm(t.document, { title: 'T', detail: 'D', assignee: 'Luis' });
    await t.controller.handleSubmit(event());
    assert.deepEqual(t.alerts, [INCIDENT_MESSAGES.REGISTER_ERROR]);
});

testAsync('listener: Supervisor ve en vivo las últimas 50 novedades, la más reciente primero; el gestor que envía no las recibe (regla de lectura)', async () => {
    const sup = setup({ user: { uid: 's1', name: 'Sara', role: 'Supervisor' } });
    const data = {};
    for (let i = 1; i <= 60; i += 1) data[`k${String(i).padStart(2, '0')}`] = { uid: 'g1', title: `T${i}`, detail: 'D', type: 'Soporte', timestamp: i, status: 'Abierto' };
    for (const [k, v] of Object.entries(data)) await sup.db.ref(`logs/${k}`).set({ ...v, uid: 's1' });
    const off = sup.controller.startListener();
    const rows = sup.document.el('incidentsTableBody').innerHTML.split('<tr ').length - 1;
    assert.equal(rows, 50);
    const html = sup.document.el('incidentsTableBody').innerHTML;
    assert.ok(html.indexOf('T60') < html.indexOf('T11') && !html.includes('>T10<'), 'primero el más reciente; se descartan los 10 más antiguos');
    await sup.db.ref('logs/nuevo').set({ uid: 's1', title: 'RECIENTE', detail: 'D', timestamp: 999, status: 'Abierto' });
    assert.ok(sup.document.el('incidentsTableBody').innerHTML.indexOf('RECIENTE') < sup.document.el('incidentsTableBody').innerHTML.indexOf('T60'));
    off();
    assert.equal(sup.db.listenerCount('logs'), 0);

    const g = setup({ data: { logs: { a: { uid: 'x', title: 'secreto', timestamp: 1 } } } });
    g.controller.startListener();
    assert.equal(g.document.el('incidentsTableBody').innerHTML, '', 'un Gestor no puede leer logs: la base no le entrega nada (hallazgo: el original no maneja el error)');
});

test('renderTable: vacío muestra el mensaje; sin tabla en la página no falla; con XSS queda escapado', () => {
    const t = setup();
    t.controller.renderTable([]);
    assert.ok(t.document.el('incidentsTableBody').innerHTML.includes('No hay novedades ni incidentes registrados.'));
    t.controller.renderTable([{ title: '<script>alert(1)</script>', detail: '<img src=x onerror=alert(2)>', type: 'x', status: 'Abierto' }]);
    assert.ok(!t.document.el('incidentsTableBody').innerHTML.includes('<script') && !t.document.el('incidentsTableBody').innerHTML.includes('<img'));
    const m = setup();
    m.document.getElementById = () => null;
    m.controller.renderTable([{ title: 'x' }]);
});

await summarizeAsync();
