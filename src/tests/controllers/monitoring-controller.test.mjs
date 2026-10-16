import { createRunner, assert } from '../test-harness.mjs';
import { createMonitoringController } from '../../controllers/monitoring-controller.js';
import { createFakeDocument, createElement } from '../helpers/fake-dom-historial.mjs';
import { buildSupervisorDirectory } from '../../domain/schedules/supervisor-directory.js';

const { test, testAsync, summarizeAsync } = createRunner('monitoring-controller (listener, tarjetas, bitácora, detalle y desplegable de gestores)');

const NOW = 1790000000000;

/** Directorio por defecto de estas pruebas (D9b): la sesión `b` es de una Supervisora en `users`. */
const DIR = buildSupervisorDirectory({ b: { name: 'Sara Santamaría', role: 'Supervisor' }, a: { name: 'Óscar Díaz', role: 'Gestor' } });

function setup({ sessions = {}, cronograma = false, assigned = [], directory = DIR, injectDirectory = true, fetchSupervisorUsers } = {}) {
    let state = sessions;
    const grid = createElement('monitoreoGrid');
    const search = createElement('monitoreoSearchInput');
    const shift = createElement('filterShiftSelect');
    const status = createElement('filterStatusSelect');
    const els = {
        monitoreoGrid: grid, monitoreoSearchInput: search, filterShiftSelect: shift, filterStatusSelect: status,
        timelineModal: createElement('timelineModal'), timelineTableBody: createElement('timelineTableBody'), timelineModalName: createElement('timelineModalName'),
        monitoreoModal: createElement('monitoreoModal'), monitoreoModalAvatar: createElement('monitoreoModalAvatar'), monitoreoModalName: createElement('monitoreoModalName'),
        monitoreoModalInfo: createElement('monitoreoModalInfo'), monitoreoModalTasksList: createElement('monitoreoModalTasksList')
    };
    const document = createFakeDocument(els);
    // las tarjetas necesitan querySelector('.monitoreo-avatar'): se simula un <img>
    const avatars = [];
    const origCreate = document.createElement;
    document.createElement = (tag) => {
        const el = origCreate(tag);
        const img = createElement('img', { src: '', alt: '' });
        avatars.push(img);
        el.querySelector = (sel) => (sel === '.monitoreo-avatar' ? img : null);
        return el;
    };
    const names = ['Ana', 'Luis'];
    let listener = null;
    const repository = {
        listenActiveSessions: (cb, errCb) => { listener = { cb, errCb }; return () => { listener = null; }; },
        fetchApprovedGestorNames: async () => names,
        ...(fetchSupervisorUsers ? { fetchSupervisorUsers } : {})
    };
    const errors = [];
    const ctl = createMonitoringController({
        document, repository, getSessions: () => state, setSessions: (s) => { state = s; },
        hasCronograma: () => cronograma, getAssignedTasksForGestor: () => assigned,
        reconcileTask: (name, tasks) => { const e = Object.values(tasks || {}).find((x) => x && x.name === name); return { status: (e && e.status) || 'Pendiente', observation: (e && e.observation) || '' }; },
        resolveTaskName: (k, e) => e.name || k, getShiftCategory: () => 'Mañana',
        ...(injectDirectory ? { supervisorDirectory: directory } : {}), now: () => NOW, logger: { error: (...a) => errors.push(a) }
    });
    return { ctl, els, grid, document, avatars, getListener: () => listener, getState: () => state, errors, names };
}

test('listener: guarda las sesiones y repinta; sin datos = {}; error se registra', () => {
    const t = setup();
    t.ctl.startActiveSessionsListener();
    t.getListener().cb({ u1: { name: 'Ana Pérez', shift: '8am - 4pm', status: 'En Línea', lastActive: NOW - 1000 } });
    assert.equal(t.grid.children.length, 1);
    t.getListener().cb({});
    assert.equal(t.grid.children.length, 0);
    assert.ok(t.grid.innerHTML.includes('No se encontraron gestores'));
    t.getListener().errCb(new Error('x'));
    assert.equal(t.errors[0][0], 'Error cargando monitoreo en tiempo real:');
});

test('tarjeta: "En Pausa de Turno" con latido reciente se ve En Pausa de Turno ⏸️ y filtra como NO en línea', () => {
    const t = setup({ sessions: { u1: { name: 'Ana Pérez', shift: '8am - 4pm', status: 'En Pausa de Turno', lastActive: NOW - 5000 } } });
    t.ctl.renderActiveSessionsDashboard();
    assert.equal(t.grid.children.length, 1);
    assert.equal(t.grid.children[0].className, 'monitoreo-card');
    assert.ok(t.grid.children[0].innerHTML.includes('En Pausa de Turno ⏸️'));
    t.els.filterStatusSelect.value = 'online';
    t.ctl.renderActiveSessionsDashboard();
    assert.equal(t.grid.children.length, 0);
    t.els.filterStatusSelect.value = 'offline';
    t.ctl.renderActiveSessionsDashboard();
    assert.equal(t.grid.children.length, 1);
});

test('tarjeta: avatar local con respaldo a ui-avatars si la imagen falla (una sola vez), alt con el nombre', () => {
    const t = setup({ sessions: { u1: { name: 'Luis Fuentes', shift: '8am - 4pm', status: 'En Línea', lastActive: NOW } } });
    t.ctl.renderActiveSessionsDashboard();
    const img = t.avatars[0];
    assert.equal(img.src, 'assets/src/img/Luis Fuentes.png');
    assert.equal(img.alt, 'Luis Fuentes');
    img.listeners.error[0]();
    assert.equal(img.src, 'https://ui-avatars.com/api/?name=Luis%20Fuentes&background=0D8ABC&color=fff');
});

test('filtros: búsqueda sin tildes, supervisores excluidos y sin sesiones muestra el estado vacío; no se muta la sesión recibida', () => {
    const sessions = {
        a: { name: 'Óscar Díaz', shift: '8am - 4pm', status: 'En Línea', lastActive: NOW },
        b: { name: 'Sara Santamaría', shift: '8am - 4pm', status: 'En Línea', lastActive: NOW },
        c: { name: 'Luis', shift: '8am - 4pm', status: 'En Línea', lastActive: NOW - 600000 }
    };
    const before = JSON.stringify(sessions);
    const t = setup({ sessions });
    t.els.monitoreoSearchInput.value = 'oscar';
    t.ctl.renderActiveSessionsDashboard();
    assert.equal(t.grid.children.length, 1);
    t.els.monitoreoSearchInput.value = '';
    t.ctl.renderActiveSessionsDashboard();
    assert.equal(t.grid.children.length, 2, 'Sara excluida (uid b con rol Supervisor en users)');
    assert.ok(t.grid.children[1].innerHTML.includes('Inactivo 💤'), 'sin latido por 10 min = Inactivo');
    assert.equal(JSON.stringify(sessions), before, 'las sesiones del estado compartido no se modifican');
});

test('sin monitoreoGrid en la página: no hace nada', () => {
    const t = setup();
    t.document.byId.delete('monitoreoGrid');
    assert.doesNotThrow(() => t.ctl.renderActiveSessionsDashboard());
});

test('bitácora: abre el modal con el nombre y las filas; sesión inexistente o sin modal no hace nada', () => {
    const t = setup({ sessions: { u1: { name: 'Ana', status: 'En Almuerzo', lastActive: NOW, timeline: [{ type: 'Almuerzo', start: NOW - 3600000, end: NOW - 1800000 }] } } });
    t.ctl.viewTimelineInMonitoreo('u1');
    assert.equal(t.els.timelineModalName.innerText, 'Ana');
    assert.ok(t.els.timelineTableBody.innerHTML.includes('Almuerzo'));
    assert.ok(t.els.timelineTableBody.innerHTML.includes('30 min'));
    assert.equal(t.els.timelineModal.classList.contains('active'), true);
    t.els.timelineModal._classes.clear();
    t.ctl.viewTimelineInMonitoreo('no-existe');
    assert.equal(t.els.timelineModal.classList.contains('active'), false);
});

test('bitácora: Inactividad en curso por pérdida de señal se agrega (el reloj es el inyectado)', () => {
    const t = setup({ sessions: { u1: { name: 'Ana', status: 'En Línea', lastActive: NOW - 600000, timeline: [] } } });
    t.ctl.viewTimelineInMonitoreo('u1');
    assert.ok(t.els.timelineTableBody.innerHTML.includes('Inactividad'));
    assert.ok(t.els.timelineTableBody.innerHTML.includes('En curso...'));
});

test('detalle de tareas: nombre, info, avatar con respaldo, tareas asignadas reconciliadas y extras', () => {
    const t = setup({
        cronograma: true, assigned: ['T1', 'T2'],
        sessions: { u1: { name: 'Ana Pérez', shift: '8am - 4pm', tasks: { T1: { name: 'T1', status: 'Finalizada', observation: 'hecho' }, extra_1: { name: 'Extra <x>', status: 'En Proceso' } } } }
    });
    t.ctl.openMonitoreoDetails('u1');
    assert.equal(t.els.monitoreoModalName.textContent, 'Detalle de Tareas: Ana Pérez');
    assert.ok(t.els.monitoreoModalInfo.textContent.startsWith('Turno: 8am - 4pm | Inicio: Pendiente'));
    const html = t.els.monitoreoModalTasksList.innerHTML;
    assert.ok(html.includes('monitoreo-task-badge completed') && html.includes('hecho'));
    assert.ok(html.includes('Extra &lt;x&gt;') && html.includes('Tarea extra agregada durante el turno.'));
    assert.ok(html.includes('monitoreo-task-badge pending'));
    assert.equal(t.els.monitoreoModal.classList.contains('active'), true);
    // fallo del avatar: onerror se desactiva y usa el respaldo
    const av = t.els.monitoreoModalAvatar;
    av.onerror.call(av);
    assert.equal(av.src, 'https://ui-avatars.com/api/?name=Ana%20P%C3%A9rez&background=0D8ABC&color=fff');
    assert.equal(av.onerror, null);
});

test('detalle: sin tareas muestra el mensaje; sesión inexistente no abre nada', () => {
    const t = setup({ sessions: { u1: { name: 'Ana' } } });
    t.ctl.openMonitoreoDetails('u1');
    assert.ok(t.els.monitoreoModalTasksList.innerHTML.includes('Este gestor aún no tiene tareas asignadas en este turno.'));
    t.els.monitoreoModal._classes.clear();
    t.ctl.openMonitoreoDetails('zzz');
    assert.equal(t.els.monitoreoModal.classList.contains('active'), false);
});

testAsync('desplegable de gestores: opción "Todos" y un <option> por gestor aprobado; sin el elemento no hace nada; errores se registran', async () => {
    const t = setup();
    await t.ctl.populateGestoresDropdown();
    assert.equal(t.els.monitoreoSearchInput.innerHTML, '<option value="">Todos los Gestores</option>');
    assert.deepEqual(t.els.monitoreoSearchInput.children.map((o) => [o.value, o.textContent]), [['Ana', 'Ana'], ['Luis', 'Luis']]);

    const t2 = setup();
    t2.document.byId.delete('monitoreoSearchInput');
    await t2.ctl.populateGestoresDropdown();

    const failing = createMonitoringController({
        document: createFakeDocument({ monitoreoSearchInput: createElement('monitoreoSearchInput') }),
        repository: { listenActiveSessions() {}, fetchApprovedGestorNames: async () => { throw new Error('sin permiso ficticio'); } },
        getSessions: () => ({}), setSessions() {}, hasCronograma: () => false, getAssignedTasksForGestor: () => [], reconcileTask: () => ({}), resolveTaskName: () => '',
        getShiftCategory: () => '', logger: { error: (...a) => t.errors.push(a) }
    });
    await failing.populateGestoresDropdown();
    assert.equal(t.errors[0][0], 'Error populating gestores dropdown:');
});

// ------------------------------------------------------------------ D9b: directorio de supervisores por rol
const flush = () => new Promise((r) => setTimeout(r, 0));
const SESS = () => ({
    s1: { name: 'Maria Sanchez', shift: '8am - 4pm', status: 'En Línea', lastActive: NOW },
    g1: { name: 'Mariana Ruiz', shift: '8am - 4pm', status: 'En Línea', lastActive: NOW },
    g2: { name: 'Sara', shift: '8am - 4pm', status: 'En Línea', lastActive: NOW }
});

testAsync('D9b: sin directorio inyectado lo carga UNA vez del repositorio (solo Supervisor/Admin) y repinta; "Mariana" y "Sara" (Gestor) se ven', async () => {
    let calls = 0;
    const t = setup({ sessions: SESS(), injectDirectory: false, fetchSupervisorUsers: async () => { calls += 1; return { s1: { name: 'Maria Sanchez', role: 'Supervisor' } }; } });
    t.ctl.renderActiveSessionsDashboard();
    assert.equal(t.grid.children.length, 3, 'antes de cargar el directorio no se oculta a nadie');
    t.ctl.renderActiveSessionsDashboard();
    await flush();
    assert.equal(calls, 1, 'una sola lectura aunque se pinte dos veces');
    assert.equal(t.grid.children.length, 2, 'al llegar el directorio se repinta sin la supervisora');
    assert.ok(t.grid.children.every((c) => !c.innerHTML.includes('Maria Sanchez')));
    assert.ok(t.grid.children.some((c) => c.innerHTML.includes('Mariana Ruiz')), 'Mariana ya no queda oculta por contener "Maria"');
    assert.ok(t.grid.children.some((c) => c.innerHTML.includes('Sara')), 'una gestora llamada "Sara" se ve');
    assert.deepEqual([...t.ctl.getSupervisorDirectory().uids], ['s1']);
    t.ctl.startActiveSessionsListener();
    await flush();
    assert.equal(calls, 1, 'con el directorio cargado no se vuelve a leer');
});

testAsync('D9b: si la lectura del directorio falla se registra, no se oculta a nadie y no se reintenta en cada pintado (sí al reiniciar el listener)', async () => {
    let calls = 0;
    const t = setup({ sessions: SESS(), injectDirectory: false, fetchSupervisorUsers: async () => { calls += 1; throw new Error('permiso denegado ficticio'); } });
    t.ctl.renderActiveSessionsDashboard();
    await flush();
    t.ctl.renderActiveSessionsDashboard();
    await flush();
    assert.equal(calls, 1);
    assert.equal(t.grid.children.length, 3);
    assert.equal(t.errors[0][0], 'No se pudo leer el directorio de supervisores (users):');
    t.ctl.startActiveSessionsListener();
    await flush();
    assert.equal(calls, 2, 'el inicio del listener reintenta');
});

test('D9b: excludedNames (lista fija) se rechaza; legacyExcludedNames reproduce el original (oculta a "Mariana")', () => {
    assert.throws(() => setupWith({ excludedNames: ['Maria'] }), /excludedNames/);
    const legacy = setupWith({ legacyExcludedNames: ['Maria'] });
    legacy.ctl.renderActiveSessionsDashboard();
    assert.equal(legacy.grid.children.length, 1, 'el original oculta a Maria Sanchez Y a Mariana Ruiz');
});

test('listener: iniciar dos veces no duplica la suscripción; detener la libera una sola vez; se puede reiniciar', () => {
    let subs = 0; let offs = 0;
    const document = createFakeDocument({ monitoreoGrid: createElement('monitoreoGrid') });
    const ctl = createMonitoringController({
        document,
        repository: { listenActiveSessions: () => { subs += 1; return () => { offs += 1; }; }, fetchApprovedGestorNames: async () => [] },
        getSessions: () => ({}), setSessions() {}, hasCronograma: () => false, getAssignedTasksForGestor: () => [],
        reconcileTask: () => ({}), resolveTaskName: () => '', getShiftCategory: () => 'Mañana', now: () => NOW, logger: { error() {} },
        supervisorDirectory: DIR
    });
    assert.equal(ctl.isActiveSessionsListening(), false);
    const stop = ctl.startActiveSessionsListener();
    ctl.startActiveSessionsListener();
    assert.equal(subs, 1, 'la segunda llamada no abre otra suscripción');
    assert.equal(ctl.isActiveSessionsListening(), true);
    stop();
    assert.equal(offs, 1);
    assert.equal(ctl.isActiveSessionsListening(), false);
    ctl.stopActiveSessionsListener();
    assert.equal(offs, 1, 'detener dos veces no vuelve a desuscribir');
    ctl.startActiveSessionsListener();
    assert.equal(subs, 2, 'tras detener, iniciar abre una suscripción nueva');
});

test('XSS: nombre, correo, estado y tipo de bitácora con HTML se escapan en tarjeta, bitácora y detalle', () => {
    const payload = '<img src=x onerror="alert(1)">';
    const t = setup({ sessions: { u1: { name: payload, email: payload, shift: '8am - 4pm', status: 'En Línea', lastActive: NOW, timeline: [{ type: payload, start: NOW - 3600000, end: NOW - 1800000 }] } } });
    t.ctl.renderActiveSessionsDashboard();
    const card = t.grid.children[0].innerHTML;
    assert.ok(!card.includes('<img src=x'), 'la tarjeta no inyecta el marcado');
    assert.ok(card.includes('&lt;img'), 'la tarjeta muestra el texto escapado');
    t.ctl.viewTimelineInMonitoreo('u1');
    assert.ok(!t.els.timelineTableBody.innerHTML.includes('<img src=x'), 'la bitácora escapa el tipo');
    assert.ok(t.els.timelineTableBody.innerHTML.includes('&lt;img'));
    t.ctl.openMonitoreoDetails('u1');
    assert.equal(t.els.monitoreoModalName.textContent, 'Detalle de Tareas: ' + payload, 'el nombre del detalle se escribe como texto (textContent), no como HTML');
});

function setupWith(extra) {
    const grid = createElement('monitoreoGrid');
    const document = createFakeDocument({ monitoreoGrid: grid });
    const origCreate = document.createElement;
    document.createElement = (tag) => { const el = origCreate(tag); el.querySelector = () => null; return el; };
    const state = SESS();
    const ctl = createMonitoringController({
        document, repository: { listenActiveSessions() {}, fetchApprovedGestorNames: async () => [] },
        getSessions: () => state, setSessions() {}, hasCronograma: () => false, getAssignedTasksForGestor: () => [],
        reconcileTask: () => ({}), resolveTaskName: () => '', getShiftCategory: () => 'Mañana', now: () => NOW, logger: { error() {} }, ...extra
    });
    return { ctl, grid };
}

await summarizeAsync();
