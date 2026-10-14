/**
 * Modales, tarea extra, aprobación de usuarios y permisos: paridad entre el app.js ORIGINAL y el app.js INTEGRADO
 * del laboratorio (2026-10-06).
 *
 * Ejecuta las funciones REALES de app.js (3975-4448) en un `vm` con DOM, Firebase, alert/confirm, reloj y
 * temporizadores simulados. Si el app.js recibido es el integrado (marcadores [LAB-INTEGRACION:MODALES-PERMISOS]),
 * el bloque delega en el bundle real `RiskOps.approvalsController` (--riskops). Con `--original <app.js del repo>`
 * cada escenario se ejecuta TAMBIÉN contra el original y se exige que TODO lo observable sea idéntico: alertas y
 * confirmaciones en orden, lecturas y escrituras a Firebase, HTML/estilos del DOM (antes y después de los
 * temporizadores de 100 ms), caché local y errores.
 *
 * DIFERENCIAS INTENCIONALES (decisiones del responsable, plan maestro §4 ter, 2026-10-06). Los escenarios con
 * `decision` afirman el comportamiento NUEVO sobre el app.js integrado (`check`) y el comportamiento VIEJO sobre el
 * original (`checkOriginal`); en ellos la paridad se reemplaza por "diferencia intencional confirmada":
 *  - D7 (doble clic): U12 y P10 -> una sola escritura/alerta en el integrado (el original escribe dos veces).
 *  - D7 (rol en el cliente): S1 (Supervisor no aprueba usuarios) y S2 (Gestor no decide permisos) -> sin escritura.
 *  - D2 (XSS): X1 -> el rol se escapa en la insignia (el original lo inserta crudo).
 *  - D9a (rechazados): R1 (opción "Rechazados" en el selector y filas con Revertir/Aprobar) y R2 (`revertRejectedUser`
 *    escribe `{approved:false, rejectionReason:null}`; en el original la función no existe).
 * El resto de escenarios sigue exigiendo paridad total con el original.
 *
 * Uso:
 *   node modales-permisos-integrado.e2e.cjs <app.js del repo>                       (solo escenarios sobre el original)
 *   node modales-permisos-integrado.e2e.cjs <app.integrado.js> --riskops <bundle.js> --original <app.js del repo>
 */
const fs = require('fs');
const vm = require('vm');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const APP = args.find((a) => !a.startsWith('--') && a.endsWith('.js') && a !== opt('--riskops') && a !== opt('--original'));
if (!APP) { console.error('Uso: node modales-permisos-integrado.e2e.cjs <app.js> [--riskops <bundle.js>] [--original <app.js del repo>]'); process.exit(2); }
const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const SRC = read(APP);
const BUNDLE = opt('--riskops') ? fs.readFileSync(opt('--riskops'), 'utf8') : null;
const ORIGINAL_SRC = opt('--original') ? read(opt('--original')) : null;
const MARK_START = '// [LAB-INTEGRACION:MODALES-PERMISOS:INICIO]';
const MARK_END = '// [LAB-INTEGRACION:MODALES-PERMISOS:FIN]';
const INTEGRATED = SRC.includes(MARK_START);
if (INTEGRATED && !BUNDLE) { console.error('app.js integrado: falta --riskops <bundle>'); process.exit(2); }

// ------------------------------------------------------------------ extracción de código real
function fn(src, header) {
    const s = src.indexOf(header);
    if (s < 0) throw new Error('No se encontró: ' + header);
    return src.slice(s, src.indexOf('\n}\n', s) + 3);
}
function between(src, startMarker, endMarker, inclusiveEnd) {
    const s = src.indexOf(startMarker);
    if (s < 0) throw new Error('No se encontró: ' + startMarker);
    const e = src.indexOf(endMarker, s);
    if (e < 0) throw new Error('No se encontró fin: ' + endMarker);
    return src.slice(s, inclusiveEnd ? e + endMarker.length : e);
}
function codeFor(src) {
    const helpers = [
        fn(src, 'function escapeHTML(str) {'),
        fn(src, 'function encodeInlineHandlerArg(value) {'),
        fn(src, 'function normalizeName(name) {'),
        fn(src, 'function persistTaskToActiveSession(uid, taskId, taskData) {'),
        'let pendingExtraTaskId = null;\nlet isSavingExtraTask = false;'
    ].join('\n');
    const region = src.includes(MARK_START)
        ? between(src, MARK_START, MARK_END, true)
        : between(src, '// Modal Logic\nfunction openExceptionModal() {', '// Exportar Reporte a PDF', false);

    return { helpers, region };
}

// ------------------------------------------------------------------ entorno simulado
const BASE_MS = Date.parse('2026-10-06T12:00:00.000Z');

function createFakeDom() {
    const elements = new Map();
    function makeElement(id, props) {
        const el = {
            id, style: {}, value: '', innerHTML: '', innerText: '', disabled: false, parentElement: null, children: [], classes: new Set(),
            classList: { add: (c) => el.classes.add(c), remove: (c) => el.classes.delete(c), contains: (c) => el.classes.has(c) },
            appendChild(child) { el.children.push(child); child.parentElement = el; if (child.id) elements.set(child.id, child); return child; },
            remove() {
                if (el.parentElement) { el.parentElement.children = el.parentElement.children.filter((c) => c !== el); el.parentElement = null; }
                if (el.id && elements.get(el.id) === el) elements.delete(el.id);
            }
        };
        return Object.assign(el, props || {});
    }
    const doc = {
        getElementById: (id) => elements.get(id) || null,
        createElement: () => makeElement('', {}),
        querySelectorAll: (sel) => (sel === '.btn-status' ? [...elements.values()].filter((e) => e.isStatusButton) : []),
        querySelector: (sel) => (sel === '.btn-status.not-done' ? ([...elements.values()].find((e) => e.isStatusButton && e.isNotDone) || null) : null)
    };
    return {
        doc,
        add(id, props) { const el = makeElement(id, props); elements.set(id, el); return el; },
        nest(child, parent) { child.parentElement = parent; parent.children.push(child); },
        snapshot() {
            return [...elements.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map((e) => ({
                id: e.id, style: typeof e.style === 'string' ? e.style : { ...e.style }, value: e.value, innerHTML: e.innerHTML, innerText: e.innerText,
                disabled: e.disabled, classes: [...e.classes].sort(), parent: e.parentElement ? e.parentElement.id : null, children: e.children.map((c) => c.id)
            }));
        }
    };
}

function createFakeDatabase(tree, failOn) {
    const calls = [];
    const fails = (op, path) => failOn.some((f) => f.op === op && (f.path === undefined || f.path === path));
    return {
        calls,
        ref(path) {
            return {
                once(event) {
                    calls.push({ op: 'once', path, event });
                    if (fails('once', path)) return Promise.reject(new Error('PERMISSION_DENIED'));
                    const value = tree[path] === undefined ? null : tree[path];
                    return Promise.resolve({ exists: () => value !== null, val: () => value });
                },
                update(data) {
                    calls.push({ op: 'update', path, data: JSON.parse(JSON.stringify(data)) });
                    if (fails('update', path)) return Promise.reject(Object.assign(new Error('permission_denied'), { code: 'PERMISSION_DENIED' }));
                    return Promise.resolve();
                }
            };
        }
    };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

/** Crea un contexto con las funciones reales de `src` cargadas. */
function createWorld(src, scenario) {
    const dom = createFakeDom();
    const database = createFakeDatabase(JSON.parse(JSON.stringify(scenario.tree || {})), scenario.failOn || []);
    const log = []; const timers = []; const storage = [];
    let tick = 0;
    class FakeDate extends Date {
        constructor(...a) { if (a.length) super(...a); else super(BASE_MS + (tick++) * 1000); }
        static now() { return BASE_MS + (tick++) * 1000; }
    }
    const usersBody = dom.add('pendingUsersTableBody'); const permsBody = dom.add('pendingPermissionsTableBody');
    [usersBody, permsBody].forEach((tbody, i) => { const table = dom.add('table' + i); const panel = dom.add('panel' + i); dom.nest(tbody, table); dom.nest(table, panel); });
    dom.add('filterAprobacionesSearch'); dom.add('filterAprobacionesStatus', { value: 'Todos' });
    if (scenario.dom) scenario.dom(dom);

    const ctx = {
        document: dom.doc, database, Date: FakeDate, window: {}, Math, JSON, Promise, Object, String, Array, Set, Error, RegExp, TypeError, encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN,
        alert: (m) => log.push(['alert', m]),
        confirm: (m) => { log.push(['confirm', m]); return scenario.confirm !== false; },
        setTimeout: (f, ms) => { timers.push({ fn: f, ms }); },
        firebase: { auth: () => ({ currentUser: scenario.authUser === undefined ? { uid: 'g1' } : scenario.authUser }) },
        localStorage: { setItem: (k, v) => { if (scenario.storageThrows) throw new Error('QuotaExceeded'); storage.push([k, v]); } },
        console: { error: (...a) => log.push(['console.error', ...a.map((x) => (x && x.message) || String(x))]), log() {}, warn() {} },
        __cfg: { currentUser: scenario.currentUser === undefined ? { uid: 'g1', role: 'Admin' } : scenario.currentUser },
        __log: log
    };
    vm.createContext(ctx);
    if (src.includes(MARK_START)) vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);
    const { helpers, region } = codeFor(src);
    vm.runInContext(
        'let currentUser = __cfg.currentUser; let taskStateCache = {};\n' +
        'function loadPermisos() { __log.push(["loadPermisos"]); }\nfunction updateKPI() { __log.push(["updateKPI"]); }\n' +
        helpers + '\n' + region, ctx);

    return { ctx, dom, database, log, timers, storage };
}

async function observe(src, scenario) {
    const w = createWorld(src, scenario);
    let thrown = null;
    try { await vm.runInContext('(async () => {\n' + scenario.run + '\n})()', w.ctx); } catch (e) { thrown = `${e && e.name}: ${e && e.message}`; }
    await settle();
    const before = w.dom.snapshot();
    const timerDelays = w.timers.map((t) => t.ms);
    w.timers.splice(0).forEach((t) => t.fn());
    await settle();
    const cache = JSON.parse(vm.runInContext('JSON.stringify(taskStateCache)', w.ctx));
    return { thrown, log: JSON.parse(JSON.stringify(w.log)), calls: w.database.calls, domBeforeTimers: before, timerDelays, domAfterTimers: w.dom.snapshot(), storage: w.storage, cache, world: w };
}

// ------------------------------------------------------------------ datos
const U = (id, extra) => ({ [id]: Object.assign({ name: 'Ana Gómez', email: `${id}@virtualsoft.tech`, role: 'Gestor', approved: false, registrationDate: '2026-10-01T10:00:00.000Z' }, extra) });
const USERS_SMALL = { users: Object.assign({}, U('u1'), U('u2', { approved: true, approvalDate: '2026-10-02T09:30:00.000Z', registrationDate: '2026-09-30T08:00:00.000Z' }), U('u3', { approved: 'Rechazado' }), U('u4', { email: 'maria.sanchez@virtualsoft.tech', approved: true }), U("o'neil<b>", { name: "O'Neil <b>" })) };
const USERS_MANY = { users: {} };
for (let i = 1; i <= 9; i += 1) Object.assign(USERS_MANY.users, U('m' + i, { approved: i % 3 === 0, registrationDate: `2026-09-${10 + i}T10:00:00.000Z`, name: 'Gestor ' + i }));
const P = (id, extra) => ({ [id]: Object.assign({ uid: 'g', gestor: 'Ana Gómez', tipo: 'Cita médica', fecha: '2026-10-10', horaInicio: '08:00', horaFin: '10:00', motivo: 'Control', status: 'Pendiente', id: BASE_MS + Number(String(id).replace(/\D/g, '') || 0) }, extra) });
const PERMS_SMALL = { permissions: Object.assign({}, P('p1'), P('p2', { fecha: '2026-10-12', horaSolicitud: '9:00 a. m.' }), P('p3', { status: 'Aprobado', rejectionReason: 'ok' }), P('p4', { status: 'Rechazado', rejectionReason: 'Sin soporte' })) };
const PERMS_MANY = { permissions: {} };
for (let i = 1; i <= 8; i += 1) Object.assign(PERMS_MANY.permissions, P('q' + i, { fecha: `2026-10-${10 + i}` }));
const permBoxes = (reasonApprove, reasonReject) => (dom) => {
    dom.add('perm-action-btns-p1', { style: { display: 'flex' } }); dom.add('perm-approve-box-p1', { style: { display: 'none' } }); dom.add('perm-approve-reason-p1', { value: reasonApprove });
    dom.add('perm-reject-box-p1', { style: { display: 'none' } }); dom.add('perm-reason-p1', { value: reasonReject });
};
const userBoxes = (reason) => (dom) => { dom.add('user-action-btns-u1', { style: { display: 'flex' } }); dom.add('user-reject-box-u1', { style: { display: 'none' } }); dom.add('user-reason-u1', { value: reason }); };
const exceptionDom = (o) => (dom) => {
    const x = Object.assign({ value: '', selectedIndex: 0, details: '' }, o);
    dom.add('exceptionReason', { value: x.value, selectedIndex: x.selectedIndex, options: [{ text: 'Seleccione una razón' }, { text: 'Sistema Caído' }, { text: 'Otro' }] });
    dom.add('exceptionDetails', { value: x.details }); dom.add('taskObservation', { value: '' }); dom.add('exceptionModal', { classes: new Set(['active']) });
    dom.add('btnPendiente', { isStatusButton: true, classes: new Set(['active']) }); dom.add('btnNoRealizada', { isStatusButton: true, isNotDone: true });
};
const extraDom = (o) => (dom) => {
    const x = Object.assign({ name: 'Revisión especial', status: 'En Proceso', obs: 'Detalle de la gestión' }, o);
    dom.add('extraTaskModal', { classes: new Set(['active']) }); dom.add('extraTaskName', { value: x.name }); dom.add('extraTaskStatus', { value: x.status });
    dom.add('extraTaskObs', { value: x.obs }); dom.add('saveExtraTaskBtn', { innerHTML: '<i>Guardar</i>' });
};

// ------------------------------------------------------------------ escenarios: { id, name, tree, dom, run, check(obs, eq, ok) }
const ALERT = (o, i) => (o.log.filter((e) => e[0] === 'alert')[i] || [])[1];
const updates = (o) => o.calls.filter((c) => c.op === 'update');
const tbodyHtml = (o, id) => o.world.dom.doc.getElementById(id).innerHTML;
const rows = (html) => (html.match(/<tr /g) || []).length;

const SCENARIOS = [
    { id: 'U1', name: 'renderPendingUsers: lista pequeña (oculta rechazados y a la administradora; escapa el nombre)', tree: USERS_SMALL, run: 'await renderPendingUsers();', check(o, eq, ok) {
        const html = tbodyHtml(o, 'pendingUsersTableBody');
        ok(html.includes('approveUser(decodeURIComponent(') && html.includes('Ana Gómez'), 'faltan filas');
        ok(!html.includes('u3@virtualsoft') && !html.includes('maria.sanchez'), 'rechazado o administradora visibles');
        ok(html.includes('O&#039;Neil &lt;b&gt;'), 'nombre sin escapar');
    } },
    { id: 'U2', name: 'renderPendingUsers: más de 5 sin filtros recorta a 5 y el aviso aparece tras 100 ms', tree: USERS_MANY, run: 'await renderPendingUsers();', check(o, eq) {
        eq(o.timerDelays.join(','), '100'); eq(rows(tbodyHtml(o, 'pendingUsersTableBody')), 5);
        eq(o.world.dom.doc.getElementById('pendingMostrandoMsg').innerText, 'Mostrando los 5 registros más recientes de 9 en total. Usa los filtros arriba para buscar más.');
    } },
    { id: 'U3', name: 'renderPendingUsers: con búsqueda no recorta y retira el aviso', tree: USERS_MANY, dom: (dom) => { dom.add('filterAprobacionesSearch', { value: 'gestor' }); }, run: 'await renderPendingUsers();', check(o, eq, ok) {
        eq(rows(tbodyHtml(o, 'pendingUsersTableBody')), 9); ok(!o.world.dom.doc.getElementById('pendingMostrandoMsg'), 'el aviso debía retirarse');
    } },
    { id: 'U4', name: 'renderPendingUsers: sin datos o con fallo de lectura muestra "No hay usuarios que coincidan"', tree: {}, failOn: [{ op: 'once', path: 'users' }], run: 'await renderPendingUsers();', check(o, eq, ok) {
        ok(tbodyHtml(o, 'pendingUsersTableBody').includes('No hay usuarios que coincidan con los filtros.'), 'falta mensaje'); ok(o.log.some((e) => e[0] === 'console.error'), 'no se registró el error');
    } },
    { id: 'U5', name: 'approveUser: confirma, escribe {approved:true, approvalDate}, avisa y recarga', tree: USERS_SMALL, run: "await approveUser('u1');", check(o, eq) {
        eq(o.log[0][1], '¿Estás seguro de aprobar el acceso para este usuario?'); eq(ALERT(o, 0), 'Usuario aprobado exitosamente. Ahora puede iniciar sesión.');
        eq(updates(o), [{ op: 'update', path: 'users/u1', data: { approved: true, approvalDate: '2026-10-06T12:00:00.000Z' } }]);
        eq(o.calls.filter((c) => c.op === 'once').length, 1, 'debía leer users UNA vez para recargar la tabla (no hubo carga previa)');
    } },
    { id: 'U6', name: 'approveUser: si se cancela el confirm no escribe', tree: USERS_SMALL, confirm: false, run: "await approveUser('u1');", check(o, eq) { eq(o.calls.length, 0); eq(o.log.length, 1); } },
    { id: 'U7', name: 'approveUser: fallo de Firebase -> "Error al contactar al servidor" y no recarga', tree: USERS_SMALL, failOn: [{ op: 'update' }], run: "await approveUser('u1');", check(o, eq) {
        eq(ALERT(o, 0), 'Error al contactar al servidor'); eq(o.calls.filter((c) => c.op === 'once').length, 0);
    } },
    { id: 'U8', name: 'confirmRejectUser: motivo vacío (o solo espacios) -> aviso y sin escritura', tree: USERS_SMALL, dom: userBoxes('   '), run: "await confirmRejectUser('u1');", check(o, eq) {
        eq(ALERT(o, 0), 'Debes escribir un motivo de rechazo.'); eq(updates(o).length, 0);
    } },
    { id: 'U9', name: 'confirmRejectUser: motivo válido -> {approved:"Rechazado", rejectionReason} y mensaje de éxito', tree: USERS_SMALL, dom: userBoxes('  Datos incompletos '), run: "await confirmRejectUser('u1');", check(o, eq) {
        eq(updates(o), [{ op: 'update', path: 'users/u1', data: { approved: 'Rechazado', rejectionReason: 'Datos incompletos' } }]); eq(ALERT(o, 0), 'Usuario rechazado exitosamente.');
    } },
    { id: 'U10', name: 'confirmRejectUser: fallo de Firebase -> error genérico', tree: USERS_SMALL, dom: userBoxes('x'), failOn: [{ op: 'update' }], run: "await confirmRejectUser('u1');", check(o, eq) { eq(ALERT(o, 0), 'Error al contactar al servidor'); } },
    { id: 'U11', name: 'cajas de usuario: mostrar y cancelar (cancelar vacía el motivo)', dom: userBoxes('previo'), run: "showUserRejectBox('u1'); cancelRejectUser('u1');", check(o, eq) {
        const d = o.world.dom.doc; eq(d.getElementById('user-action-btns-u1').style.display, 'flex'); eq(d.getElementById('user-reject-box-u1').style.display, 'none'); eq(d.getElementById('user-reason-u1').value, '');
    } },
    { id: 'U12', decision: 'D7', name: 'doble clic en Aprobar usuario: UNA confirmación y UNA escritura (original: dos)', tree: USERS_SMALL, run: "await Promise.all([approveUser('u1'), approveUser('u1')]);", check(o, eq) {
        eq(updates(o).length, 1); eq(o.log.filter((e) => e[0] === 'confirm').length, 1); eq(o.log.filter((e) => e[0] === 'alert').length, 1);
    }, checkOriginal(o, eq) {
        eq(updates(o).length, 2); eq(o.log.filter((e) => e[0] === 'confirm').length, 2);
    } },
    { id: 'P1', name: 'renderPendingPermissions: pendientes recientes primero, sin historial si no existe la tabla', tree: PERMS_SMALL, run: 'await renderPendingPermissions();', check(o, eq, ok) {
        const html = tbodyHtml(o, 'pendingPermissionsTableBody'); eq(rows(html), 2); ok(html.indexOf('perm-action-btns-p2') < html.indexOf('perm-action-btns-p1'), 'orden incorrecto');
        ok(html.includes('showPermApproveBox(decodeURIComponent(') && html.includes('9:00 a. m.'), 'faltan botones u hora');
    } },
    { id: 'P2', name: 'renderPendingPermissions: con tabla de historial pinta los procesados', tree: PERMS_SMALL, dom: (dom) => { dom.add('historyPermissionsTableBody'); }, run: 'await renderPendingPermissions();', check(o, eq, ok) {
        const html = tbodyHtml(o, 'historyPermissionsTableBody'); eq(rows(html), 2); ok(html.includes('Aprobado') && html.includes('Sin soporte'), 'faltan estados o motivo');
    } },
    { id: 'P3', name: 'renderPendingPermissions: más de 5 recorta y avisa "de 8 pendientes"', tree: PERMS_MANY, run: 'await renderPendingPermissions();', check(o, eq) {
        eq(rows(tbodyHtml(o, 'pendingPermissionsTableBody')), 5); eq(o.world.dom.doc.getElementById('pendingPermsMostrandoMsg').innerText, 'Mostrando los 5 permisos más recientes de 8 pendientes.');
    } },
    { id: 'P4', name: 'renderPendingPermissions: sin pendientes -> mensaje (y el historial NO se pinta)', tree: { permissions: Object.assign({}, P('h1', { status: 'Aprobado' })) }, dom: (dom) => { dom.add('historyPermissionsTableBody'); }, run: 'await renderPendingPermissions();', check(o, eq, ok) {
        ok(tbodyHtml(o, 'pendingPermissionsTableBody').includes('No hay permisos pendientes de aprobación.'), 'falta mensaje'); eq(tbodyHtml(o, 'historyPermissionsTableBody'), '');
    } },
    { id: 'P5', name: 'confirmApprovePerm: sin observación guarda "Aprobado sin observaciones adicionales"', tree: PERMS_SMALL, dom: permBoxes('  ', ''), run: "await confirmApprovePerm('p1');", check(o, eq) {
        eq(updates(o), [{ op: 'update', path: 'permissions/p1', data: { status: 'Aprobado', notified: false, rejectionReason: 'Aprobado sin observaciones adicionales' } }]);
        eq(ALERT(o, 0), 'Permiso Aprobado exitosamente.'); eq(o.log.filter((e) => e[0] === 'loadPermisos').length, 1);
    } },
    { id: 'P6', name: 'confirmRejectPerm: motivo vacío -> aviso; válido -> {status:"Rechazado", notified:false, rejectionReason}', tree: PERMS_SMALL, dom: permBoxes('', ' '), run: "await confirmRejectPerm('p1'); document.getElementById('perm-reason-p1').value = ' Sin soporte '; await confirmRejectPerm('p1');", check(o, eq) {
        eq(ALERT(o, 0), 'Debes escribir un motivo de rechazo.');
        eq(updates(o), [{ op: 'update', path: 'permissions/p1', data: { status: 'Rechazado', notified: false, rejectionReason: 'Sin soporte' } }]); eq(ALERT(o, 1), 'Permiso Rechazado exitosamente.');
    } },
    { id: 'P7', name: 'updatePermissionStatus: fallo de Firebase -> error genérico y sin recargas', tree: PERMS_SMALL, failOn: [{ op: 'update' }], run: "await updatePermissionStatus('p1', 'Aprobado', 'x');", check(o, eq) {
        eq(ALERT(o, 0), 'Error al contactar al servidor'); eq(o.log.filter((e) => e[0] === 'loadPermisos').length, 0);
    } },
    { id: 'P8', name: 'updatePermissionStatus: sin motivo no escribe rejectionReason', tree: PERMS_SMALL, run: "await updatePermissionStatus('p1', 'Aprobado');", check(o, eq) {
        eq(updates(o)[0].data, { status: 'Aprobado', notified: false });
    } },
    { id: 'P9', name: 'cajas de permiso: aprobar y rechazar (mostrar/cancelar)', dom: permBoxes('a', 'r'), run: "showPermApproveBox('p1'); cancelApprovePerm('p1'); showPermRejectBox('p1'); cancelRejectPerm('p1'); showPermApproveBox('p1');", check(o, eq) {
        const d = o.world.dom.doc; eq(d.getElementById('perm-approve-box-p1').style.display, 'flex'); eq(d.getElementById('perm-action-btns-p1').style.display, 'none'); eq(d.getElementById('perm-reason-p1').value, ''); eq(d.getElementById('perm-approve-reason-p1').value, ''); /* cancelApprovePerm vacía el campo (app.js 4419) y la última llamada solo muestra la caja */
    } },
    { id: 'P10', decision: 'D7', name: 'doble clic en confirmar rechazo de permiso: UNA escritura y UNA alerta (original: dos)', tree: PERMS_SMALL, dom: permBoxes('', 'x'), run: "await Promise.all([confirmRejectPerm('p1'), confirmRejectPerm('p1')]);", check(o, eq) {
        eq(updates(o).length, 1); eq(o.log.filter((e) => e[0] === 'alert').length, 1);
    }, checkOriginal(o, eq) {
        eq(updates(o).length, 2); eq(o.log.filter((e) => e[0] === 'alert').length, 2);
    } },
    { id: 'S1', decision: 'D7', name: 'rol en el cliente: un Supervisor NO aprueba usuarios (sin confirm ni escritura; original: escribe y Firebase lo rechazaría)', tree: USERS_SMALL, currentUser: { uid: 's1', role: 'Supervisor' }, run: "await approveUser('u1');", check(o, eq) {
        eq(updates(o).length, 0); eq(o.log.filter((e) => e[0] === 'confirm').length, 0); eq(ALERT(o, 0), 'No tienes permiso para realizar esta acción.');
    }, checkOriginal(o, eq) {
        eq(updates(o).length, 1);
    } },
    { id: 'S2', decision: 'D7', name: 'rol en el cliente: un Gestor NO aprueba ni rechaza permisos (original: escribe)', tree: PERMS_SMALL, dom: permBoxes('ok', 'no'), currentUser: { uid: 'g1', role: 'Gestor' }, run: "await confirmApprovePerm('p1'); await confirmRejectPerm('p1');", check(o, eq) {
        eq(updates(o).length, 0); eq(o.log.filter((e) => e[0] === 'alert').map((e) => e[1]), ['No tienes permiso para realizar esta acción.', 'No tienes permiso para realizar esta acción.']);
    }, checkOriginal(o, eq) {
        eq(updates(o).length, 2);
    } },
    { id: 'X1', decision: 'D2', name: 'XSS: rol <img src=x onerror=...> y <script> se ESCAPAN en la insignia (original: crudo)', tree: { users: Object.assign({}, U('x1', { role: '<img src=x onerror=alert(1)>' }), U('x2', { approved: true, role: '<script>alert(1)</script>' }), U('x3', { role: '" onmouseover="alert(1)' })) }, run: 'await renderPendingUsers();', check(o, eq, ok) {
        const html = tbodyHtml(o, 'pendingUsersTableBody');
        ok(!/<img|<script/i.test(html), 'etiqueta inyectada'); ok(!html.includes('" onmouseover="'), 'atributo inyectado');
        ok(html.includes('&lt;img src=x onerror=alert(1)&gt;') && html.includes('&lt;script&gt;alert(1)&lt;/script&gt;') && html.includes('&quot; onmouseover=&quot;alert(1)'), 'falta el texto escapado');
    }, checkOriginal(o, eq, ok) {
        const html = tbodyHtml(o, 'pendingUsersTableBody'); ok(html.includes('<img src=x onerror=alert(1)>') && html.includes('<script>alert(1)</script>'), 'el original inserta el rol crudo');
    } },
    { id: 'R1', decision: 'D9a', name: 'Rechazados: el selector recibe la opción "Rechazados" y con ese filtro se listan los rechazados con Revertir/Aprobar', tree: { users: Object.assign({}, USERS_SMALL.users, U('u3', { approved: 'Rechazado', rejectionReason: 'Datos <b>incompletos</b>', name: 'Rita' })) }, dom: (dom) => {
        const options = [{ value: 'Todos' }, { value: 'Pendiente' }, { value: 'Aprobado' }];
        dom.add('filterAprobacionesStatus', { value: 'Rechazado', options, appendChild(child) { options.push(child); return child; } });
    }, run: 'await renderPendingUsers();', check(o, eq, ok) {
        const opts = o.world.dom.doc.getElementById('filterAprobacionesStatus').options;
        eq(opts.map((x) => x.value), ['Todos', 'Pendiente', 'Aprobado', 'Rechazado']); eq(opts[3].textContent, 'Rechazados');
        const html = tbodyHtml(o, 'pendingUsersTableBody'); eq(rows(html), 1);
        ok(html.includes('Rita') && html.includes('Motivo: Datos &lt;b&gt;incompletos&lt;/b&gt;'), 'falta el rechazado o su motivo escapado');
        ok(html.includes(`revertRejectedUser(decodeURIComponent('u3'))`) && html.includes(`approveUser(decodeURIComponent('u3'))`), 'faltan los botones Revertir/Aprobar');
    }, checkOriginal(o, eq, ok) {
        eq(o.world.dom.doc.getElementById('filterAprobacionesStatus').options.length, 3);
        ok(!tbodyHtml(o, 'pendingUsersTableBody').includes('Rita'), 'el original no muestra rechazados');
    } },
    { id: 'R2', decision: 'D9a', name: 'Rechazados: revertRejectedUser confirma, escribe {approved:false, rejectionReason:null}, avisa y recarga (no existe en el original)', tree: USERS_SMALL, run: "await revertRejectedUser('u3');", check(o, eq) {
        eq(o.thrown, null); eq(o.log[0], ['confirm', '¿Deseas revertir el rechazo y devolver este usuario a "Pendiente de aprobación"?']);
        eq(updates(o), [{ op: 'update', path: 'users/u3', data: { approved: false, rejectionReason: null } }]);
        eq(ALERT(o, 0), 'Rechazo revertido: el usuario volvió a "Pendiente de aprobación".'); eq(o.calls.filter((c) => c.op === 'once').length, 1);
    }, checkOriginal(o, eq, ok) {
        ok(/ReferenceError: revertRejectedUser is not defined/.test(o.thrown || ''), 'el original no tiene la función: ' + o.thrown); eq(o.calls.length, 0);
    } },
    { id: 'M1', name: 'confirmException: sin razón / sin detalle / completo (vuelca el texto y cierra el modal)', dom: exceptionDom({}), run: "confirmException(); document.getElementById('exceptionReason').value = 'Sistema Caído'; document.getElementById('exceptionReason').selectedIndex = 1; confirmException(); document.getElementById('exceptionDetails').value = '  VPN caída '; confirmException();", check(o, eq) {
        eq(ALERT(o, 0), 'Por favor seleccione una razón principal.'); eq(ALERT(o, 1), 'Por favor detalle el problema obligatoriamente.');
        eq(o.world.dom.doc.getElementById('taskObservation').value, 'Excepción: Sistema Caído - VPN caída'); eq(o.world.dom.doc.getElementById('exceptionModal').classes.has('active'), false);
    } },
    { id: 'M2', name: 'openExceptionModal abre el modal, marca "No Realizada" y limpia; closeModal lo cierra (id inexistente no falla)', dom: exceptionDom({ value: 'Otro', details: 'viejo' }), run: "document.getElementById('exceptionModal').classes.delete('active'); openExceptionModal(); globalThis.__abierto = document.getElementById('exceptionModal').classes.has('active'); closeModal('noExiste'); closeModal('exceptionModal');", check(o, eq) {
        const d = o.world.dom.doc; eq(vm.runInContext('globalThis.__abierto', o.world.ctx), true); eq(d.getElementById('exceptionReason').value, ''); eq(d.getElementById('exceptionDetails').value, ''); eq(d.getElementById('btnNoRealizada').classes.has('active'), true); eq(d.getElementById('btnPendiente').classes.has('active'), false); eq(d.getElementById('exceptionModal').classes.has('active'), false);
    } },
    { id: 'E1', name: 'openExtraTaskModal limpia el formulario y fija "Finalizada"', dom: extraDom({ name: 'x', obs: 'y', status: 'Pendiente' }), run: 'openExtraTaskModal();', check(o, eq) {
        const d = o.world.dom.doc; eq(d.getElementById('extraTaskName').value, ''); eq(d.getElementById('extraTaskStatus').value, 'Finalizada'); eq(d.getElementById('extraTaskObs').value, '');
    } },
    { id: 'E2', name: 'saveExtraTask: nombre vacío, observación vacía y sin sesión', dom: extraDom({ name: ' ' }), run: "await saveExtraTask(); document.getElementById('extraTaskName').value = 'T'; document.getElementById('extraTaskObs').value = ''; await saveExtraTask(); document.getElementById('extraTaskObs').value = 'o'; await saveExtraTask();", authUser: null, check(o, eq) {
        eq(ALERT(o, 0), 'OBLIGATORIO: Debes ingresar el nombre de la tarea extra.'); eq(ALERT(o, 1), 'OBLIGATORIO: Debes detallar la gestión realizada en las Notas Técnicas.'); eq(ALERT(o, 2), 'Tu sesión expiró. Vuelve a iniciar sesión para guardar la tarea extra.'); eq(updates(o).length, 0);
    } },
    { id: 'E3', name: 'saveExtraTask: identidad distinta -> "No se pudo verificar tu identidad"', dom: extraDom({}), currentUser: { uid: 'otro' }, run: 'await saveExtraTask();', check(o, eq) { eq(ALERT(o, 0), 'No se pudo verificar tu identidad. Vuelve a iniciar sesión para guardar la tarea extra.'); } },
    { id: 'E4', name: 'saveExtraTask: éxito guarda en active_sessions/<uid>/tasks/extra_<ms>, respalda en localStorage, actualiza KPI y cierra', dom: extraDom({ name: ' Revisión ', obs: ' Nota ' }), run: 'await saveExtraTask();', check(o, eq, ok) {
        const u = updates(o)[0]; ok(/^active_sessions\/g1\/tasks\/extra_\d+$/.test(u.path), 'ruta ' + u.path); eq(u.data.name, '[EXTRA] Revisión'); eq(u.data.observation, 'Nota'); eq(u.data.status, 'En Proceso');
        eq(o.storage.length, 1); eq(o.storage[0][0], 'riskOps_cache'); ok(Object.keys(o.cache)[0].startsWith('extra_'), 'caché sin la tarea'); ok(o.log.some((e) => e[0] === 'updateKPI'), 'no actualizó KPI');
        eq(ALERT(o, 0), 'Tarea Adicional "Revisión" agregada exitosamente y se incluirá en tu reporte de turno.'); eq(o.world.dom.doc.getElementById('extraTaskModal').classes.has('active'), false); eq(o.world.dom.doc.getElementById('saveExtraTaskBtn').innerHTML, '<i>Guardar</i>');
    } },
    { id: 'E5', name: 'saveExtraTask: permiso denegado -> mensaje de permiso, botón restaurado, modal abierto', dom: extraDom({}), failOn: [{ op: 'update' }], run: 'await saveExtraTask();', check(o, eq) {
        eq(ALERT(o, 0), 'No tienes permiso para guardar esta tarea extra. Contacta a tu supervisor.'); eq(o.world.dom.doc.getElementById('saveExtraTaskBtn').disabled, false); eq(o.world.dom.doc.getElementById('extraTaskModal').classes.has('active'), true);
    } },
    { id: 'E6', name: 'saveExtraTask: el reintento tras un fallo REUTILIZA la llave; reabrir el modal genera otra', dom: extraDom({}), failOn: [{ op: 'update' }], run: 'await saveExtraTask(); await saveExtraTask(); openExtraTaskModal(); document.getElementById("extraTaskName").value = "N"; document.getElementById("extraTaskObs").value = "O"; await saveExtraTask();', check(o, eq) {
        const paths = updates(o).map((c) => c.path); eq(paths[0], paths[1], 'el reintento debía reutilizar la llave'); eq(paths[2] === paths[0], false, 'tras reabrir debía ser una llave nueva');
    } },
    { id: 'E7', name: 'saveExtraTask: doble clic -> la segunda llamada se ignora mientras guarda; localStorage lleno no impide guardar', dom: extraDom({}), storageThrows: true, run: 'await Promise.all([saveExtraTask(), saveExtraTask()]);', check(o, eq) {
        eq(updates(o).length, 1); eq(o.log.filter((e) => e[0] === 'alert').length, 1); eq(o.storage.length, 0);
    } },
    { id: 'E8', name: 'saveExtraTask: error genérico -> "No se pudo guardar... respaldado localmente"', dom: extraDom({}), run: "database.ref = () => ({ update: () => Promise.reject(new Error('network down')) }); await saveExtraTask();", check(o, eq) {
        eq(ALERT(o, 0), 'No se pudo guardar la tarea extra en el servidor. El cambio quedó respaldado localmente; intenta guardar de nuevo.');
    } }
];

// ------------------------------------------------------------------ ejecución
(async () => {
    console.log('=== MODALES, TAREA EXTRA, USUARIOS Y PERMISOS: ' + (INTEGRATED ? 'app.js INTEGRADO (RiskOps.approvalsController)' : 'app.js ORIGINAL') + ' ===');
    console.log(`app.js: ${APP}${ORIGINAL_SRC ? ' | paridad contra el original' : ''} | ${new Date().toISOString()}`);
    let pass = 0; let fail = 0;
    const report = (good, label, detail) => { if (good) { pass += 1; console.log(`  [PASS] ${label}`); } else { fail += 1; console.error(`  [FAIL] ${label}\n         ${detail}`); } };
    const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || 'distinto'}: esperado ${JSON.stringify(b)}, obtenido ${JSON.stringify(a)}`); };
    const ok = (c, m) => { if (!c) throw new Error(m || 'falso'); };

    if (INTEGRATED) {
        const names = ['openExceptionModal', 'closeModal', 'confirmException', 'openExtraTaskModal', 'saveExtraTask', 'renderPendingUsers', 'approveUser', 'showUserRejectBox', 'cancelRejectUser', 'confirmRejectUser', 'renderPendingPermissions', 'showPermRejectBox', 'cancelRejectPerm', 'confirmRejectPerm', 'showPermApproveBox', 'cancelApprovePerm', 'confirmApprovePerm', 'updatePermissionStatus'];
        const w = createWorld(SRC, {});
        report(names.every((n) => vm.runInContext(`typeof ${n} === 'function'`, w.ctx)), 'integración: las 18 funciones siguen siendo globales (los onclick de index.html y del HTML generado las resuelven)', 'falta alguna');
        report(vm.runInContext(`typeof revertRejectedUser === 'function'`, w.ctx), 'integración D9a: la global nueva revertRejectedUser existe (botón "Revertir" de la vista Rechazados)', 'falta revertRejectedUser');
        report(!/APPROVALS_LEGACY_OPTIONS|preventDuplicates:\s*false|enforcePolicy:\s*false|escapeRole:\s*false|showRejectedUsers:\s*false/.test(between(SRC, MARK_START, MARK_END, true)),
            'integración D2/D7/D9a: el paso del lab NO apaga ninguna decisión (usa los valores por defecto del controlador)', 'el bloque integrado pasa opciones legacy');
        report(!/database\.ref\('users\/' \+ userId\)/.test(SRC) && !/database\.ref\('permissions\/' \+ fb_id\)/.test(SRC) && SRC.includes('RiskOps.approvalsController.createApprovalsController'),
            'integración: el original ya no escribe en Firebase por su cuenta (delega en el bundle)', 'quedan escrituras originales');
    }

    for (const scenario of SCENARIOS) {
        try {
            const obs = await observe(SRC, scenario);
            // Sobre el original (sin integrar), un escenario de decisión afirma el comportamiento VIEJO.
            const check = scenario.decision && !INTEGRATED ? scenario.checkOriginal : scenario.check;
            try { check(obs, eq, ok); report(true, `${scenario.id} ${scenario.name}`, ''); } catch (e) { report(false, `${scenario.id} ${scenario.name}`, e.message); }
            if (ORIGINAL_SRC) {
                const orig = await observe(ORIGINAL_SRC, scenario);
                const strip = (o) => { const { world, ...rest } = o; return rest; };
                if (scenario.decision) {
                    // Diferencia INTENCIONAL (decisión del responsable): el original conserva el comportamiento viejo
                    // y el integrado difiere de él.
                    try {
                        scenario.checkOriginal(orig, eq, ok);
                        if (JSON.stringify(strip(obs)) === JSON.stringify(strip(orig))) throw new Error('el integrado debía diferir del original');
                        report(true, `${scenario.id} diferencia intencional ${scenario.decision} confirmada (original = comportamiento anterior)`, '');
                    } catch (e) { report(false, `${scenario.id} diferencia intencional ${scenario.decision}`, e.message); }
                    continue;
                }
                try {
                    if (JSON.stringify(strip(obs)) !== JSON.stringify(strip(orig))) {
                        const keys = Object.keys(strip(obs)).filter((k) => JSON.stringify(obs[k]) !== JSON.stringify(orig[k]));
                        throw new Error('difiere en: ' + keys.join(', ') + '\n         integrado: ' + JSON.stringify(obs[keys[0]]).slice(0, 300) + '\n         original:  ' + JSON.stringify(orig[keys[0]]).slice(0, 300));
                    }
                    report(true, `${scenario.id} paridad con el original`, '');
                } catch (e) { report(false, `${scenario.id} paridad con el original`, e.message); }
            }
        } catch (e) { report(false, `${scenario.id} ${scenario.name}`, e.stack || e.message); }
    }

    console.log(`\nResultado: ${pass} pasaron, ${fail} fallaron.`);
    process.exit(fail > 0 ? 1 : 0);
})();
