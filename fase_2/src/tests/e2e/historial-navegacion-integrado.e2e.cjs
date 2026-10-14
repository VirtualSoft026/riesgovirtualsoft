/**
 * Paridad del corte "Historial, perfil, navegación y monitoreo" (2026-10-06): las funciones REALES del app.js ORIGINAL
 * frente a las del app.js INTEGRADO del laboratorio (pasos/historial-navegacion.mjs) con el bundle real `RiskOps`,
 * ambas ejecutadas en un `vm` con DOM, Firebase y reloj simulados. Cada escenario se corre contra las dos versiones
 * y se compara el estado observable completo (HTML de tablas/tarjetas/modales, estilos, clases, alertas, errores,
 * lecturas/escrituras en Firebase, temporizadores).
 *
 * Se extrae de cada app.js el tramo contiguo desde "// Exportar Reporte a PDF" hasta "// --- Lógica del Portal de
 * Indicadores" (historial de turnos, notificaciones, perfil, barra lateral, Monitoreo). Las dependencias que app.js define
 * fuera de ese tramo (escapeHTML, normalizeName, getShiftCategory, tareas, ...) también son las funciones REALES de app.js.
 *
 * DIFERENCIA INTENCIONAL por la decisión D9b (2026-10-06): Monitoreo ya no excluye con `SUPERVISORES_NOMBRES` por
 * subcadena sino por ROL en `users` (UID de la sesión). Para seguir comparando lo demás, el ORIGINAL corre con un ORÁCULO:
 * `SUPERVISORES_NOMBRES` = nombres exactos de los usuarios Supervisor/Admin del árbol simulado (vacía si no hay `users`), y
 * de la traza de Firebase del integrado se retiran sus consultas `users` por rol (`orderByChild('role').equalTo(...)`). El
 * escenario "D9b" afirma, además, que con la lista fija REAL el original oculta a "Mariana" y el integrado no.
 *
 * Uso: node historial-navegacion-integrado.e2e.cjs <app.js original> <app.integrado.js> <riskops.bundle.js>
 *   (se ve cómo se obtienen en `node /tmp/riskops-integrate.mjs` y `node /tmp/riskops-bundle.mjs`).
 */
const fs = require('fs');
const vm = require('vm');

const [ORIG_PATH, INT_PATH, BUNDLE_PATH] = process.argv.slice(2);
if (!ORIG_PATH || !INT_PATH || !BUNDLE_PATH) { console.error('Uso: node historial-navegacion-integrado.e2e.cjs <app.js> <app.integrado.js> <bundle.js>'); process.exit(2); }
const lf = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const ORIG = lf(ORIG_PATH); const INT = lf(INT_PATH); const BUNDLE = fs.readFileSync(BUNDLE_PATH, 'utf8');

const START = '// Exportar Reporte a PDF\n';
const END = '// --- Lógica del Portal de Indicadores de Gestión (KPIs) ---';
function span(src) {
    const s = src === INT ? src.indexOf('// [LAB-INTEGRACION:HISTORIAL-NAVEGACION:INICIO]') : src.indexOf(START); const e = src.indexOf(END);
    if (s < 0 || e < 0 || e < s) throw new Error('No se encontró el tramo del corte en ' + (src === ORIG ? 'el original' : 'el integrado'));
    return src.slice(s, e);
}
function fn(src, header) {
    const s = src.indexOf(header);
    if (s < 0) throw new Error('No se encontró: ' + header);
    return src.slice(s, src.indexOf('\n}\n', s) + 3);
}
function between(src, a, b) { const s = src.indexOf(a); const e = src.indexOf(b, s); if (s < 0 || e < 0) throw new Error('No se encontró: ' + a); return src.slice(s, e + b.length); }

// Dependencias REALES de app.js que quedan fuera del tramo (se toman del original)
const PRELUDE = [
    "const SUPERVISORES_NOMBRES = ['Sara Santamaría', 'Sara Santamaria', 'Maria Sanchez', 'Camilo Espinosa', 'Oriana Borja', 'Sara', 'Maria', 'Camilo', 'Oriana'];",
    fn(ORIG, 'function escapeHTML('), fn(ORIG, 'function encodeInlineHandlerArg('),
    between(ORIG, 'const COMUNICADOS_PUBLISH_ROLES', 'window.canManageComunicados = canManageComunicados;'),
    fn(ORIG, 'function normalizeName('), fn(ORIG, 'function namesMatch('), fn(ORIG, 'function getShiftCategory('),
    fn(ORIG, 'function cleanText('), fn(ORIG, 'function normalizeTaskName('), fn(ORIG, 'function taskNamesMatch('),
    fn(ORIG, 'function canonicalTaskId('), fn(ORIG, 'function isLegacyGenericTaskName('),
    fn(ORIG, 'function resolveTaskDisplayName('), fn(ORIG, 'function reconcileScheduledTaskWithSession('), fn(ORIG, 'function buildTaskReportSummaryText('),
    fn(ORIG, 'function closeModal(')
].join('\n');

const NOW = 1790000000000;

// ------------------------------------------------------------------ entorno simulado
function makeEl(id, extra) {
    let html = '';
    const o = { id, style: { display: '' }, innerText: '', textContent: '', value: '', className: '', children: [], parentElement: null, _c: new Set(), listeners: {}, src: '', alt: '', type: '', ...extra };
    Object.defineProperty(o, 'innerHTML', { get: () => html, set: (v) => { html = v; o.children = []; }, enumerable: true });
    o.classList = { add: (c) => o._c.add(c), remove: (c) => o._c.delete(c), contains: (c) => o._c.has(c) };
    o.appendChild = (c) => { o.children.push(c); c.parentElement = o; o.log && o.log.push(o.id + '<-' + c.id); return c; };
    o.removeChild = (c) => { o.children = o.children.filter((x) => x !== c); };
    o.remove = () => { if (o.parentElement) o.parentElement.removeChild(o); };
    o.addEventListener = (t, f) => { (o.listeners[t] = o.listeners[t] || []).push(f); };
    o.querySelector = () => null;
    o.closest = () => null;
    return o;
}

const IDS = ['monitoreoGrid', 'monitoreoSearchInput', 'filterShiftSelect', 'filterStatusSelect', 'timelineModal', 'timelineTableBody', 'timelineModalName',
    'monitoreoModal', 'monitoreoModalAvatar', 'monitoreoModalName', 'monitoreoModalInfo', 'monitoreoModalTasksList', 'filterFechaInput',
    'shiftDetailModalBody', 'exportPdfModalBtn', 'shiftDetailModal', 'notificationDropdown', 'profileModal', 'newPasswordInput', 'passwordChangeMsg',
    'modalProfileAvatar', 'modalProfileName', 'modalProfileRole', 'shiftReportsTableBody'];
const NAV_IDS = ['navWorkspace', 'navHorario', 'navTeletrabajo', 'navDocs', 'navPermisos', 'navComunicados', 'adminNavGroup', 'navAdminComunicados', 'navTurnos',
    'navAprobaciones', 'navMonitoreo', 'navTiempos', 'navConfigGestores', 'horarioGestorFilterContainer', 'teletrabajoGestorFilterContainer',
    'toggleLunchBtn', 'toggleBreakfastBtn', 'view-gestion-comunicados'];

/** @param {'orig'|'int'} which @param {{role?: string, tree?: object, auth?: object, withNav?: boolean}} opts */
/** Oráculo D9b: nombres EXACTOS de los usuarios con rol Supervisor/Admin del árbol (null = lista fija real de app.js). */
function supervisoresOraculo(tree, oraculo) {
    if (oraculo !== undefined) return oraculo;
    return Object.values(tree.users || {}).filter((u) => u && (u.role === 'Supervisor' || u.role === 'Admin') && u.name).map((u) => u.name.trim());
}

function makeEnv(which, { role = 'Supervisor', tree = {}, auth = { currentUser: null }, user, oraculo } = {}) {
    const dbLog = []; const alerts = []; const errors = []; const timers = []; const navLog = [];
    const els = new Map();
    for (const id of IDS.concat(NAV_IDS)) els.set(id, makeEl(id, { log: NAV_IDS.includes(id) ? navLog : undefined }));
    const sidebar = makeEl('.sidebar-nav', { log: navLog });
    // la tabla del historial vive dentro de dos contenedores (el pie informativo se agrega al abuelo)
    const wrap = makeEl('wrap'); const wrap2 = makeEl('wrap2');
    els.get('shiftReportsTableBody').parentElement = wrap; wrap.parentElement = wrap2;
    els.get('newPasswordInput').type = 'password'; els.get('newPasswordInput').value = 'valor-ficticio-123';
    const avatarSrc = makeEl('avatar', { src: 'avatar.png' });
    const body = makeEl('body');
    const document = {
        body,
        getElementById: (id) => (els.has(id) ? els.get(id) : null),
        querySelector: (sel) => (sel === '.sidebar-nav' ? sidebar : sel === '.user-profile .avatar' ? avatarSrc : null),
        createElement: (tag) => {
            const e = makeEl('<' + tag + '>'); const img = makeEl('img'); e._img = img;
            e.querySelector = (sel) => (sel === '.monitoreo-avatar' ? img : null);
            return e;
        },
        addEventListener() {}
    };
    function ref(path) {
        const r = {
            once: async (ev) => { dbLog.push(['once', path, r._q || null]); const v = r._q ? Object.fromEntries(Object.entries(tree[path] || {}).filter(([, x]) => x[r._q[0]] === r._q[1])) : tree[path]; return { exists: () => v !== undefined && v !== null && Object.keys(v).length > 0, val: () => v }; },
            update: async (u) => { dbLog.push(['update', path, JSON.parse(JSON.stringify(u))]); },
            on: (ev, cb, errCb) => { dbLog.push(['on', path, ev]); env.listener = { cb, errCb }; },
            orderByChild: (c) => ({ equalTo: (v) => { r._q = [c, v]; return r; } })
        };
        return r;
    }
    class FakeDate extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } }
    const pdfCalls = [];
    const window = { html2pdf: () => ({ set(o) { pdfCalls.push(['set', o]); return this; }, from(e) { pdfCalls.push(['from', e.innerHTML, e.style]); return this; }, async save() { pdfCalls.push(['save']); } }), addEventListener() {} };
    const ctx = {
        document, window, Date: FakeDate, Math, JSON, Object, Array, Set, Promise, parseInt, parseFloat, isNaN, String, Number, encodeURIComponent, decodeURIComponent, RegExp,
        database: { ref }, alert: (m) => alerts.push(m), setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; }, confirm: () => true,
        console: { error: (...a) => errors.push(a.map((x) => (x instanceof Error ? x.message : String(x)))), warn() {}, log() {} },
        firebase: { auth: () => auth },
        setupCustomMultiSelect: (id, opts, cb) => { dbLog.push(['multiselect', id, opts]); ctx._multiCb = cb; },
        getSelectedMultiSelectValues: () => ctx._selected || [],
        getAssignedTasksForGestor: (n, s) => ctx._assigned || [],
        localStorage: { getItem: () => null, setItem() {}, removeItem() {} }
    };
    vm.createContext(ctx);
    // En el navegador `window` ES el objeto global: los métodos asignados a window.* se resuelven como globales sueltos.
    Object.assign(ctx, window); ctx.window = ctx;
    if (which === 'int') vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);
    const lista = which === 'orig' ? supervisoresOraculo(tree, oraculo) : null;
    vm.runInContext(lista === null ? PRELUDE : PRELUDE.replace(/^const SUPERVISORES_NOMBRES = .*$/m, `const SUPERVISORES_NOMBRES = ${JSON.stringify(lista)}; // ORÁCULO D9b`), ctx);
    const u = user || { uid: 'g1', name: 'Ana Pérez', role, email: 'ana@virtualsoft.tech', shift: '8am - 4pm' };
    vm.runInContext('let currentUser = ' + JSON.stringify(u) + '; let globalCronogramaData = null;', ctx);
    vm.runInContext(span(which === 'orig' ? ORIG : INT) + `
this.api = {
  get exportShiftReport() { return window.exportShiftReport; }, renderShiftReports, applyShiftReportsFilters, get openShiftDetailModal() { return window.openShiftDetailModal; },
  toggleNotifications, markAllAsRead, openProfileModal, toggleProfilePassword, changePassword, alignAdministrativeControlsByRole, setupSidebar, updateNavigation,
  startActiveSessionsListener, renderActiveSessionsDashboard, viewTimelineInMonitoreo, get openMonitoreoDetails() { return window.openMonitoreoDetails; }, populateGestoresDropdown,
  setSessions: (s) => { allActiveSessions = s; }, getSessions: () => allActiveSessions, setCron: (v) => { globalCronogramaData = v; }, setUser: (v) => { currentUser = v; }
};`, ctx);
    const env = { ctx, api: ctx.api, els, sidebar, document, dbLog, alerts, errors, timers, navLog, pdfCalls, body, wrap2, window: ctx, listener: null };
    return env;
}

function snapshot(env) {
    const out = {};
    for (const [id, e] of env.els) {
        out[id] = { html: e.innerHTML, text: e.innerText, content: e.textContent, display: e.style.display, color: e.style.color || '', classes: [...e._c].sort(), value: e.value, src: e.src, type: e.type,
            hasOnclick: typeof e.onclick, children: e.children.map((c) => [c.className, c.innerHTML, c._img ? c._img.src + '|' + c._img.alt + '|' + Object.keys(c._img.listeners).join(',') : '', c.id, c.innerText, c.style && c.style.cssText || c.style]) };
    }
    out.__wrap2 = env.wrap2.children.map((c) => [c.id, c.innerText, c.style]);
    out.__body = env.body.children.map((c) => [c.innerHTML, c.style]);
    // D9b: el integrado consulta users por rol para el directorio de supervisores; esas lecturas no existen en el original
    out.__alerts = env.alerts; out.__errors = env.errors; out.__timers = env.timers.map((t) => t.ms);
    out.__db = env.dbLog.filter((e) => !(e[0] === 'once' && e[1] === 'users' && Array.isArray(e[2]) && e[2][0] === 'role'));
    out.__dbRoles = env.dbLog.filter((e) => e[0] === 'once' && e[1] === 'users' && Array.isArray(e[2]) && e[2][0] === 'role').length;
    out.__nav = env.navLog; out.__pdf = env.pdfCalls;
    return out;
}
async function drain(env) { for (let i = 0; i < 5; i++) { await new Promise((r) => setImmediate(r)); } const ts = env.timers.slice(); ts.forEach((t) => t.f()); await new Promise((r) => setImmediate(r)); }

// ------------------------------------------------------------------ escenarios
const tests = [];
const T = (name, opts, run) => tests.push({ name, opts, run });
const eq = (a, b, m) => { const x = JSON.stringify(a); const y = JSON.stringify(b); if (x !== y) throw new Error(`${m || 'distinto'}:\n   original  : ${y.slice(0, 600)}\n   integrado : ${x.slice(0, 600)}`); };

const SESSIONS = {
    u1: { name: 'Ana Pérez', email: 'ana@virtualsoft.tech', shift: '8am - 4pm', status: 'En Pausa de Turno', lastActive: NOW - 5000, loginTime: NOW - 7200000, totalTasks: 4, completedTasks: 2, notDoneTasks: 1,
        tasks: { T1: { name: 'Conciliar caja', status: 'Finalizada', observation: 'ok <b>' }, extra_1: { name: 'Extra <x>', status: 'En Proceso' } },
        timeline: [{ type: 'Pausa de Turno', start: NOW - 3600000, end: NOW - 1800000 }, { type: 'Almuerzo', start: NOW - 900000, end: NOW - 880000 }] },
    u2: { name: 'Luis Fuentes', email: 'luis@virtualsoft.tech', shift: '2pm - 10pm', status: 'En Línea', lastActive: NOW - 1000, loginTime: NOW - 600000, tasks: { T9: { name: 'Tarea 9', status: 'No Realizada' } } },
    u3: { name: 'Óscar Díaz', shift: '10pm - 6am', status: 'En Línea', lastActive: NOW - 600000, timeline: [] },
    u4: { name: 'Marilyn Jiménez', shift: '8am - 4pm', status: 'En Almuerzo', lastActive: NOW - 20000, loginTime: NOW - 9000000 },
    u5: { name: 'Sara Santamaría', shift: '8am - 4pm', status: 'En Línea', lastActive: NOW },
    u6: { name: 'Juan José Díaz', shift: 'Mañana', status: 'En Desayuno', lastActive: NOW - 3000, tasks: null },
    u7: null
};
const SESSIONS_JSON = JSON.stringify(SESSIONS);

for (const [fname, filters] of [
    ['sin filtros', {}], ['búsqueda "oscar"', { search: 'oscar' }], ['búsqueda por correo', { search: 'LUIS@' }], ['turno Tarde', { shift: 'Tarde' }],
    ['solo en línea', { status: 'online' }], ['solo fuera de línea', { status: 'offline' }], ['sin resultados', { search: 'nadie' }]
]) {
    for (const cron of [false, true]) {
        T(`Monitoreo: tarjetas (${fname}, cronograma ${cron ? 'cargado' : 'sin cargar'})`, {}, async (env) => {
            env.api.setSessions(JSON.parse(SESSIONS_JSON));
            env.api.setCron(cron ? [{ x: 1 }] : null); env.ctx._assigned = ['Conciliar caja', 'Tarea sin avance'];
            env.els.get('monitoreoSearchInput').value = filters.search || '';
            env.els.get('filterShiftSelect').value = filters.shift || '';
            env.els.get('filterStatusSelect').value = filters.status || '';
            env.api.renderActiveSessionsDashboard();
        });
    }
}
T('Monitoreo: el listener de active_sessions guarda las sesiones y repinta (con datos, vacío y error)', {}, async (env) => {
    env.api.startActiveSessionsListener();
    env.listener.cb({ exists: () => true, val: () => JSON.parse(SESSIONS_JSON) });
    env.api.setCron([{ x: 1 }]);
    env.listener.cb({ exists: () => false, val: () => null });
    env.listener.errCb(new Error('permiso denegado ficticio'));
});
T('Monitoreo: bitácora de cada sesión (pausas, glitches, inactividad en curso, sesión inexistente)', {}, async (env) => {
    env.api.setSessions(JSON.parse(SESSIONS_JSON));
    for (const uid of ['u1', 'u2', 'u3', 'u4', 'u6', 'zzz']) { env.api.viewTimelineInMonitoreo(uid); env.els.get('timelineModal')._c.clear(); }
    env.api.viewTimelineInMonitoreo('u3');
});
T('Monitoreo: detalle de tareas de cada sesión (asignadas, extras, directas, sin tareas)', {}, async (env) => {
    env.api.setSessions(JSON.parse(SESSIONS_JSON));
    env.ctx._assigned = ['Conciliar caja', 'Tarea sin avance'];
    for (const cron of [true, false]) {
        env.api.setCron(cron ? [{ x: 1 }] : null);
        for (const uid of ['u1', 'u2', 'u3', 'u4', 'zzz']) { env.api.openMonitoreoDetails(uid); env.els.get('monitoreoModal')._c.clear(); }
    }
    env.api.openMonitoreoDetails('u1');
    const av = env.els.get('monitoreoModalAvatar');
    if (av.onerror) av.onerror.call(av);
});
T('Monitoreo: desplegable de gestores (aprobados, sin nombre repetido) y fallo de lectura', { tree: { users: { a: { role: 'Gestor', approved: true, name: ' Zoe ' }, b: { role: 'Gestor', approved: true, name: 'Ana' }, c: { role: 'Gestor', approved: false, name: 'X' }, d: { role: 'Admin', approved: true, name: 'Jefe' }, e: { role: 'Gestor', approved: true, name: 'Zoe' } } } }, async (env) => {
    env.api.populateGestoresDropdown();
    await drain(env);
    const sel = env.els.get('monitoreoSearchInput');
    env.dbLog.push(['opciones', sel.innerHTML, sel.children.map((o) => o.value + '/' + o.textContent)]);
});

// ------------------------------------------------------------------ D9b: supervisores por ROL (UID) en Monitoreo
const USERS_D9B = { u5: { name: 'Sara Santamaría', role: 'Supervisor', approved: true }, s9: { name: 'Maria Sanchez', role: 'Admin', approved: true }, m1: { name: 'Mariana Ruiz', role: 'Gestor', approved: true }, u2: { name: 'Luis Fuentes', role: 'Gestor', approved: true } };
const SESSIONS_D9B = () => Object.assign(JSON.parse(SESSIONS_JSON), {
    m1: { name: 'Mariana Ruiz', email: 'mariana@virtualsoft.tech', shift: '8am - 4pm', status: 'En Línea', lastActive: NOW - 1000 },
    o1: { name: 'Oriana Borja', shift: '2pm - 10pm', status: 'En Línea', lastActive: NOW - 1000 },
    s9: { name: 'Maria Sanchez', shift: '8am - 4pm', status: 'En Línea', lastActive: NOW - 1000 }
});
const tarjetas = (env) => env.els.get('monitoreoGrid').children.map((c) => (c._img ? c._img.alt : ''));
T('Monitoreo D9b: con users (Sara=Supervisor u5, Maria Sanchez=Admin s9) se ocultan por UID; paridad con el original usando la lista EXACTA (oráculo)', { tree: { users: USERS_D9B } }, async (env) => {
    env.api.setSessions(SESSIONS_D9B());
    env.api.renderActiveSessionsDashboard();
    await drain(env);
    env.dbLog.push(['tarjetas', tarjetas(env)]);
    const t = tarjetas(env);
    if (!t.includes('Mariana Ruiz') || !t.includes('Oriana Borja') || t.includes('Sara Santamaría') || t.includes('Maria Sanchez')) throw new Error('D9b: tarjetas inesperadas ' + t);
});
T('Monitoreo D9b (DIFERENCIA INTENCIONAL): con la lista fija REAL el original oculta a Mariana, Oriana y a toda "Sara"/"Maria"; el integrado solo a los UID con rol', { tree: { users: USERS_D9B }, oraculo: null, intencional: true }, async (env) => {
    env.api.setSessions(SESSIONS_D9B());
    env.api.startActiveSessionsListener();
    env.listener.cb({ exists: () => true, val: () => SESSIONS_D9B() });
    await drain(env);
    env.__tarjetas = tarjetas(env);
});
const D9B_CHECK = (o, i, envs) => {
    const [eo, ei] = envs;
    if (eo.__tarjetas.includes('Mariana Ruiz') || eo.__tarjetas.includes('Oriana Borja')) throw new Error('el original debería ocultar a Mariana y Oriana: ' + eo.__tarjetas);
    for (const n of ['Mariana Ruiz', 'Oriana Borja', 'Ana Pérez']) if (!ei.__tarjetas.includes(n)) throw new Error('el integrado debe mostrar a ' + n + ': ' + ei.__tarjetas);
    for (const n of ['Sara Santamaría', 'Maria Sanchez']) if (ei.__tarjetas.includes(n)) throw new Error('el integrado debe ocultar a ' + n);
    if (i.__dbRoles !== 2) throw new Error('el integrado consulta users por rol (Supervisor y Admin) una sola vez: ' + i.__dbRoles);
};

const REPORTS = {
    r1: { gestor: 'Ana Pérez', rol: 'Gestor', setTrabajado: 'SET "A"', horaInicio: '6/10/2026, 8:00:00 a. m.', horaFin: '6/10/2026, 5:00:00 p. m.', tiempoAlmuerzoMins: 30, tiempoDesayunoMins: 0, inactividadTotalMins: 12.5, timestamp: NOW - 3600000,
        tasks: { T1: { name: 'Conciliar caja', status: 'Finalizada', observation: 'ok' }, extra_1: { name: 'Extra <x>', status: 'No Realizada' } }, reporte: 'Resumen\n=== BITÁCORA DE TIEMPOS ===\nAlmuerzo 12:00 - 12:30\nAlmuerzo 12:00 - 12:30\nInactividad <b>x</b>' },
    r2: { gestor: 'Luis Fuentes', rol: 'Gestor', horaInicio: 'x', timestamp: NOW - 10 * 86400000, reporte: '[ FINALIZADA ] - Tarea 5\n=== BITÁCORA DE TIEMPOS ===\n' },
    r3: { gestor: 'Óscar Díaz', rol: 'Supervisor', timestamp: NOW - 86400000, reporte: 'solo texto' },
    r4: { gestor: 'Ana Pérez', timestamp: undefined, horaInicio: '2026-10-06 08:00' }
};
for (const [fname, sel, fecha] of [['sin filtros', [], ''], ['gestor Ana', ['ana perez'], ''], ['fecha de hoy', [], '2026-10-06'], ['gestor + fecha sin resultados', ['Luis Fuentes'], '2026-10-06']]) {
    T(`Historial de turnos: cargar, filtrar y abrir el modal (${fname})`, { tree: { shift_reports: REPORTS } }, async (env) => {
        env.ctx._selected = sel; env.els.get('filterFechaInput').value = fecha;
        await env.api.renderShiftReports();
        env.timers.forEach((t) => t.f());
        env.api.applyShiftReportsFilters();
        env.ctx._multiCb && env.ctx._multiCb();
        // En app.js openShiftDetailModal solo existe tras un filtrado con filas (está anidada por una llave mal colocada): se llama solo si hay filas.
        const hasRows = env.els.get('shiftReportsTableBody').innerHTML.includes('Ver Todo');
        for (const id of (hasRows ? ['r1', 'r2', 'zzz'] : [])) { env.api.openShiftDetailModal(id); env.els.get('shiftDetailModal')._c.clear(); }
        env.els.get('exportPdfModalBtn').onclick && await env.els.get('exportPdfModalBtn').onclick();
    });
}
T('Historial de turnos: exportar a PDF (en memoria, solo en Firebase, inexistente, sin motor, motor que falla)', { tree: { shift_reports: REPORTS, 'shift_reports/solo': { gestor: 'Remoto <b>', timestamp: NOW, tasks: { T1: { name: 'Conciliar caja', status: 'Finalizada' } } } } }, async (env) => {
    env.ctx._selected = ['Ana Pérez'];
    await env.api.renderShiftReports();
    await env.api.exportShiftReport('r1');
    await env.api.exportShiftReport('solo');
    await env.api.exportShiftReport('no-existe');
    env.window.html2pdf = undefined;
    await env.api.exportShiftReport('r1');
    env.window.html2pdf = () => ({ set() { return this; }, from() { return this; }, async save() { throw new Error('motor roto ficticio'); } });
    await env.api.exportShiftReport('r1');
});
T('Historial de turnos: error de lectura de Firebase se registra y no rompe', { tree: {} }, async (env) => {
    env.ctx.database.ref = () => ({ once: async () => { throw new Error('sin permiso ficticio'); } });
    await env.api.renderShiftReports();
    env.timers.forEach((t) => t.f());
});

T('Notificaciones: abrir/cerrar el desplegable', {}, async (env) => { for (let i = 0; i < 3; i++) env.api.toggleNotifications(); });
const PERMS = { p1: { uid: 'g1', status: 'Aprobado', notified: false, notified_admin: true }, p2: { uid: 'g1', status: 'Pendiente', notified: false, notified_admin: false }, p3: { uid: 'g2', status: 'Rechazado', notified: false, notified_admin: true }, p4: { uid: 'g3', status: 'Pendiente', notified: true, notified_admin: false } };
for (const role of ['Admin', 'Supervisor', 'Gestor']) {
    T(`Notificaciones: marcar todas como leídas (${role})`, { role, tree: { permissions: PERMS } }, async (env) => { await env.api.markAllAsRead(); });
}
T('Notificaciones: Gestor sin uid en el usuario usa el uid de Firebase Auth; sin ninguno no hace nada', { user: { name: 'Ana', role: 'Gestor' }, tree: { permissions: PERMS }, auth: { currentUser: { uid: 'g2' } } }, async (env) => { await env.api.markAllAsRead(); });
T('Notificaciones: Gestor sin ningún uid no consulta Firebase', { user: { name: 'Ana', role: 'Gestor' }, tree: { permissions: PERMS } }, async (env) => { await env.api.markAllAsRead(); });

T('Perfil: abrir el modal, mostrar/ocultar contraseña', {}, async (env) => {
    env.els.get('passwordChangeMsg').style.display = 'block';
    env.api.openProfileModal();
    const icon = makeEl('icon'); icon._c.add('bx-show');
    env.api.toggleProfilePassword(icon); env.dbLog.push(['icono1', [...icon._c].sort(), env.els.get('newPasswordInput').type]);
    env.api.toggleProfilePassword(icon); env.dbLog.push(['icono2', [...icon._c].sort(), env.els.get('newPasswordInput').type]);
});
const authWith = (impl) => ({ currentUser: { updatePassword: impl } });
T('Perfil: cambiar contraseña (campo vacío)', { auth: authWith(async () => {}) }, async (env) => { env.els.get('newPasswordInput').value = '   '; await env.api.changePassword(); });
T('Perfil: cambiar contraseña (éxito: cierra el modal a los 2 s)', {}, async (env) => {
    const got = []; env.ctx.firebase.auth = () => ({ currentUser: { updatePassword: async (p) => { got.push(p); } } });
    env.els.get('profileModal')._c.add('active');
    await env.api.changePassword(); env.dbLog.push(['recibida', got]);
    env.timers.forEach((t) => t.f());
});
T('Perfil: cambiar contraseña (sin sesión de Auth)', {}, async (env) => { await env.api.changePassword(); });
for (const code of ['auth/requires-recent-login', 'auth/weak-password', 'auth/otro']) {
    T(`Perfil: cambiar contraseña (error ${code})`, {}, async (env) => {
        env.ctx.firebase.auth = () => ({ currentUser: { updatePassword: async () => { throw Object.assign(new Error('fallo ficticio'), { code }); } } });
        await env.api.changePassword();
        env.timers.forEach((t) => t.f());
    });
}

for (const role of ['Admin', 'Supervisor', 'Gestor', 'Auditor']) {
    T(`Barra lateral: setupSidebar completa — orden por rol y botones de pausa (${role})`, { role }, async (env) => {
        env.api.setupSidebar();
        env.api.updateNavigation();
    });
    T(`Controles administrativos: alignAdministrativeControlsByRole (${role})`, { role }, async (env) => {
        const mk = (id, extra) => { const e = makeEl(id, extra); env.els.set(id, e); return e; };
        const title = mk('t'); const filterPanel = mk('fp', { previousElementSibling: title }); const tablePanel = mk('tp');
        mk('pendingUsersTableBody', { closest: () => tablePanel }); mk('filterAprobacionesSearch', { closest: () => filterPanel });
        env.api.alignAdministrativeControlsByRole();
    });
}
T('Barra lateral: sin usuario (currentUser null) cae en el orden del Gestor y alinea sin fallar', {}, async (env) => { env.api.setUser(null); env.api.setupSidebar(); });

// comprobaciones estructurales del integrado
const structural = [
    ['el integrado delega con el bundle (marcadores y llamadas a RiskOps)', () => {
        for (const needle of ['[LAB-INTEGRACION:HISTORIAL-NAVEGACION:INICIO]', 'RiskOps.shiftReportsController.createShiftReportsController', 'RiskOps.appRouter.createAppRouter({ document, getUser: () => currentUser }).applyRoleNavigation(sidebarNav)', "typeof RiskOps !== 'undefined' && typeof __histNav === 'function'"]) {
            if (!INT.includes(needle)) throw new Error('falta: ' + needle);
        }
    }],
    ['no se tocó el bloque del botón de Pausa de Turno ni las anclas del controlador de turno', () => {
        if (!INT.includes("__shiftController().refreshSplitShiftButton(); // [LAB-INTEGRACION] visible con flag o con pausa en curso")) throw new Error('el ancla de la barra lateral ya no está');
        if ((INT.match(/refreshSplitShiftButton\(\)/g) || []).length < 2) throw new Error('faltan las dos llamadas del controlador de turno');
    }],
    ['el global allShiftReports y el cuerpo original del historial ya no están en el integrado', () => {
        if (span(INT).includes('allShiftReports')) throw new Error('allShiftReports sigue en el tramo');
        if (span(INT).includes("database.ref('shift_reports')")) throw new Error('el historial sigue leyendo Firebase en app.js');
    }]
];

(async () => {
    console.log('=== PARIDAD ORIGINAL vs INTEGRADO — HISTORIAL, PERFIL, NAVEGACIÓN Y MONITOREO ===');
    console.log(`original: ${ORIG_PATH}\nintegrado: ${INT_PATH}\nbundle: ${BUNDLE_PATH}\n${new Date().toISOString()}`);
    let pass = 0, fail = 0;
    for (const t of tests) {
        try {
            const snaps = []; const envs = [];
            for (const which of ['orig', 'int']) {
                const env = makeEnv(which, t.opts);
                await t.run(env);
                await drain(env);
                snaps.push(snapshot(env)); envs.push(env);
            }
            if (t.opts.intencional) { D9B_CHECK(snaps[0], snaps[1], envs); pass++; console.log('  [PASS] ' + t.name); continue; }
            delete snaps[0].__dbRoles; delete snaps[1].__dbRoles;
            // la comparación recorre todas las claves: el primer desacuerdo se reporta con su ruta
            const [o, i] = snaps;
            for (const k of Object.keys(o)) eq(i[k], o[k], `diferencia en "${k}"`);
            const nonEmpty = JSON.stringify(o).length;
            if (nonEmpty < 200) throw new Error('el escenario no produjo estado observable (' + nonEmpty + ' bytes)');
            pass++; console.log('  [PASS] ' + t.name);
        } catch (e) { fail++; console.log('  [FAIL] ' + t.name + '\n         -> ' + e.message); }
    }
    for (const [name, run] of structural) {
        try { run(); pass++; console.log('  [PASS] ' + name); } catch (e) { fail++; console.log('  [FAIL] ' + name + '\n         -> ' + e.message); }
    }
    console.log('\n=== RESUMEN ===');
    console.log(`Pasan: ${pass} | Fallan: ${fail} | Total: ${pass + fail}`);
    console.log(fail === 0 ? 'RESULTADO: PARIDAD COMPLETA' : 'RESULTADO: HAY DIFERENCIAS');
    process.exitCode = fail === 0 ? 0 : 1;
})();
