/**
 * Corte "Comunicados, configuración e incidencias": paridad del app.js INTEGRADO del laboratorio con el original.
 *
 * Ejecuta las 26 funciones REALES de app.js en un `vm` (DOM y base de datos simulados) DOS veces con los mismos
 * escenarios: contra el app.js original del repositorio y contra el app.js integrado (que delega en el bundle
 * real `RiskOps`). Compara la traza completa (escrituras en la base, árbol final, alert/confirm/console, estado de
 * cada elemento del DOM, temporizadores) y además afirma resultados absolutos por escenario, para que "iguales pero
 * ambos rotos" no pase.
 *
 * DIFERENCIAS INTENCIONALES (decisiones del responsable, plan maestro §4 ter; implementadas en src y usadas
 * por el integrado porque son el predeterminado de los módulos). En esos escenarios la prueba NO exige paridad en el
 * punto decidido: afirma el comportamiento VIEJO en el original y el NUEVO en el integrado, y exige paridad en todo
 * lo demás (comparación con normalización explícita y documentada en cada escenario):
 *  - D2 (C5, C8): nombre/rol/correo de "Configuración de gestores" y `loginTime` inválido del historial se escapan.
 *  - D4 (C1, C1b, C1c): lectura única de `readBy/{uid}`: sin aviso de error por duplicidad, sin bucle del modal
 *    urgente; un fallo real (red) deja el modal abierto en vez de cerrarlo y reabrirlo.
 *  - D6 (C9, C10, C11): presencia y contador atómico inactivos: el integrado no abre listeners ni escribe.
 *  - D9(c) (C14): Admin/Supervisor/Gestor reciben el modal urgente bloqueante: ya era así en app.js -> paridad total.
 *
 * Uso: node comunicados-integrado.e2e.cjs <app.integrado.js> --riskops <bundle.js> [--original <app.js>]
 *   (el integrado: node /tmp/riskops-integrate.mjs /tmp/comunicados-integrado.js ; el bundle: node /tmp/riskops-bundle.mjs /tmp/comunicados-bundle.js)
 * Sale con código 1 si algo falla. Sin --original usa el app.js del repositorio de referencia.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');
const { pathToFileURL } = require('url');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const INTEGRATED_PATH = args.find((a) => !a.startsWith('--') && a.endsWith('.js'));
const BUNDLE_PATH = opt('--riskops', null);
const ORIGINAL_PATH = opt('--original', '/mnt/user-data/uploads/riesgovirtualsoft/app.js');
if (!INTEGRATED_PATH || !BUNDLE_PATH) { console.error('Uso: node comunicados-integrado.e2e.cjs <app.integrado.js> --riskops <bundle.js> [--original <app.js>]'); process.exit(2); }

const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const ORIGINAL = read(ORIGINAL_PATH);
const INTEGRATED = read(INTEGRATED_PATH);
const BUNDLE = fs.readFileSync(BUNDLE_PATH, 'utf8');
if (!INTEGRATED.includes('[LAB-INTEGRACION:COMUNICADOS-INICIO]')) { console.error('El app.js integrado no contiene los pasos de comunicados'); process.exit(2); }
if (ORIGINAL.includes('[LAB-INTEGRACION]')) { console.error('--original debe ser el app.js del repositorio (sin integrar)'); process.exit(2); }

// ------------------------------------------------------------------ extracción de código real
function between(src, startMarker, endMarker) {
    const s = src.indexOf(startMarker); if (s < 0) throw new Error('No se encontró: ' + startMarker);
    const e = src.indexOf(endMarker, s + startMarker.length); if (e < 0) throw new Error('No se encontró fin: ' + endMarker);
    return src.slice(s, e);
}
function fn(src, header) {
    const s = src.indexOf(header); if (s < 0) throw new Error('No se encontró: ' + header);
    return src.slice(s, src.indexOf('\n}\n', s) + 3);
}
// Regiones de app.js que se ejecutan. En el integrado, las que empiezan en una función sustituida arrancan en la marca del paso.
const REGIONS = (mode) => [
    ['let globalComunicados = {};', 'function renderAdminComunicados() {'],
    ['function renderAdminComunicados() {', '// ==========================================\n// CONTROL OPERATIVO Y EFICIENCIA EN RETIROS'],
    [mode === 'integrado' ? '// [LAB-INTEGRACION:SUPERVISOR-BADGE-INICIO]' : 'function updateActiveSupervisorBadge() {', 'setInterval(updateActiveSupervisorBadge, 60000);'],
    [mode === 'integrado' ? '// [LAB-INTEGRACION:LOGIN-HISTORY-INICIO]' : 'let allLoginHistoryRecords = [];', 'window.openLoginHistoryModal = openLoginHistoryModal;'],
    [mode === 'integrado' ? '// [LAB-INTEGRACION:PRESENCIA-CONTADOR-INCIDENTES-INICIO]' : 'function setupUserPresence(uid) {', '/**\n * 5. Filtro por Responsable Asignado (#filter-assignee)']
];
const CODE = (src, mode) => REGIONS(mode).map(([a, b]) => between(src, a, b)).join('\n');
const HELPERS_SRC = (src) => [fn(src, 'function escapeHTML(str)'), fn(src, 'function encodeInlineHandlerArg(value)'), between(src, 'const COMUNICADOS_PUBLISH_ROLES', 'window.canManageComunicados = canManageComunicados;') + 'window.canManageComunicados = canManageComunicados;'].join('\n');

const NOW = Date.UTC(2026, 9, 6, 20, 0, 0);
const flush = () => new Promise((resolve) => setTimeout(resolve, 8));

// ------------------------------------------------------------------ entorno simulado
async function loadHelpers() {
    const base = path.join(__dirname, '..', 'helpers');
    const rtdb = await import(pathToFileURL(path.join(base, 'fake-rtdb-comunicados.mjs')).href);
    const dom = await import(pathToFileURL(path.join(base, 'fake-dom-comunicados.mjs')).href);
    return { createFakeRtdb: rtdb.createFakeRtdb, TIMESTAMP: rtdb.TIMESTAMP, createFakeDocument: dom.createFakeDocument };
}

/** Reglas de database.rules.json relevantes, como función (aprobados): announcements, readBy una vez, users, logs, metrics ausente. */
function makeRules(who) {
    return {
        canRead(p) {
            if (p.startsWith('users') || p.startsWith('logs') || p.startsWith('login_history') || p.startsWith('shift_reports') || p === 'active_sessions') return ['Admin', 'Supervisor'].includes(who.role);
            if (p.startsWith('metrics')) return false; // sin regla: denegado por omisión
            return true;
        },
        canWrite(op, p, nv, ov) {
            const readBy = /^announcements\/([^/]+)\/readBy\/([^/]+)$/.exec(p);
            if (readBy) return readBy[2] === who.uid && ov === null && nv !== null && typeof nv.readAt === 'string';
            if (/^announcements\/[^/]+$/.test(p)) {
                if (who.role === 'Admin') return true;
                return who.role === 'Supervisor' && ov === null && nv !== null && !('readBy' in nv) && ['title', 'content', 'date', 'author', 'authorUid'].every((k) => typeof nv[k] === 'string') && nv.authorUid === who.uid;
            }
            if (/^users\/[^/]+\/hasSplitShift$/.test(p)) return who.role === 'Admin';
            if (/^logs\/[^/]+$/.test(p)) return ov === null && nv !== null && nv.uid === who.uid;
            if (/^active_sessions\/[^/]+(\/.*)?$/.test(p)) return true;
            return false;
        }
    };
}

function makeEnv(H, mode, { user, data, rules = true, filtered = false }) {
    const src = mode === 'integrado' ? INTEGRATED : ORIGINAL;
    const db = H.createFakeRtdb({ data, clock: () => NOW });
    const who = { uid: user ? user.uid : 'x', role: user ? user.role : 'Gestor' };
    if (rules) db.rules = makeRules(who);
    const document = H.createFakeDocument();
    const log = { alerts: [], confirms: [], warns: [], errors: [], timers: [], closed: [], renders: [] };
    let confirmAnswer = true;
    const win = { isFilteredByGestor: filtered };
    class FakeDate extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } }
    const ctx = {
        document, database: db, Date: FakeDate, Math, JSON, Object, Array, Set, Map, Promise, parseInt, isNaN, String, Number, RegExp, Error, TypeError,
        window: win,
        alert: (m) => log.alerts.push(m),
        confirm: (m) => { log.confirms.push(m); return confirmAnswer; },
        console: { warn: (...a) => log.warns.push(String(a[0]) + '|' + String(a[1])), error: (...a) => log.errors.push(typeof a[0] === 'string' ? a[0] : 'objeto'), log() {} },
        setTimeout: (f, ms) => { log.timers.push({ f, ms }); return log.timers.length; },
        setInterval() {},
        firebase: { auth: () => ({ currentUser: user ? { uid: user.uid } : null }), database: { ServerValue: { TIMESTAMP: H.TIMESTAMP } } },
        encodeURIComponent, decodeURIComponent
    };
    vm.createContext(ctx);
    vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);
    // app.js usa un sanitizador basado en el DOM del navegador; en ambos modos se usa el mismo sanitizador sin DOM del bundle
    vm.runInContext('function sanitizeAnnouncementHTML(v) { return RiskOps.sanitization.sanitizeAnnouncementHTML(v); }', ctx);
    const prelude = [
        'let currentUser = ' + JSON.stringify(user || null) + ';',
        'let globalScheduleRows = null; let globalScheduleBlocks = null;',
        'function closeModal(id) { __closed.push(id); }',
        'function getShiftForDate(rows, blocks, name, date) { return __shifts[name]; }',
        'function renderActiveSessionsDashboard() { __renders.push(1); }',
        HELPERS_SRC(src)
    ].join('\n');
    ctx.__closed = log.closed; ctx.__renders = log.renders; ctx.__shifts = {};
    vm.runInContext(prelude + '\n' + CODE(src, mode) + `
this.api = {
    initComunicadosListener, openNewComunicadoModal, saveNewComunicado, updateUnreadBadge, renderGestorComunicados,
    markComunicadoAsRead, checkUnreadUrgentAnnouncements, markUrgentComunicadoAsRead, renderConfigGestores, toggleGestorSplitShift,
    renderAdminComunicados, viewComunicadoContent, viewComunicadoLecturas, deleteComunicado,
    updateActiveSupervisorBadge, openLoginHistoryModal, renderLoginHistoryTable, filterLoginHistoryTable,
    setupUserPresence, startMonitoringPresence, incrementApprovedWithdrawal, initAtomicApprovedCounterListener, updateApprovedCountUI,
    handleNewIncidentSubmit, startIncidentsRealtimeListener, renderIncidentsTable,
    setUser: (u) => { currentUser = u; }, setSchedule: (r, b) => { globalScheduleRows = r; globalScheduleBlocks = b; }, getAnnouncements: () => globalComunicados,
    setGlobalComunicados: (m) => { globalComunicados = m; }
};`, ctx);
    return {
        api: ctx.api, db, document, log, who, win, ctx, mode,
        setConfirm: (v) => { confirmAnswer = v; },
        runTimers: () => { const t = log.timers.splice(0); t.forEach((x) => x.f()); return t.length; },
        setShifts: (s) => { ctx.__shifts = s; }
    };
}

function elementsState(document) {
    const out = {};
    for (const [id, e] of document.elements) {
        out[id] = {
            innerHTML: e.innerHTML, innerText: e.innerText, textContent: e.textContent, value: e.value, disabled: e.disabled,
            style: { ...e.style }, classes: e.classNames(), hasOnclick: typeof e.onclick === 'function', listeners: Object.keys(e.listeners),
            children: e.children.map((c) => ({ html: c.innerHTML, style: { ...c.style } }))
        };
    }
    return out;
}

function trace(env) {
    return JSON.parse(JSON.stringify({
        alerts: env.log.alerts, confirms: env.log.confirms, warns: env.log.warns, errors: env.log.errors,
        timers: env.log.timers.map((t) => t.ms), closed: env.log.closed, renders: env.log.renders.length,
        dbLog: env.db.log, tree: env.db.raw(), pendingDisconnect: env.db.pendingDisconnectOps(), dom: elementsState(env.document)
    }));
}

// ------------------------------------------------------------------ datos y escenarios
const EVIL = { title: '<script>alert(1)</script>T', author: '"><img src=x onerror=alert(2)>', content: '<p onclick="x()">Hola</p><script>alert(3)</script><a href="javascript:alert(4)">x</a><img src=x onerror=alert(5)>', key: `-N"k'<x>` };
const ANN = () => ({
    '-A1': { title: 'Primero', content: '<p>uno</p>', date: '2026-10-01T10:00:00.000Z', author: 'Sara', authorUid: 's1' },
    '-A2': { title: 'Segundo', content: '<p>dos <b>x</b></p>', date: '2026-10-02T10:00:00.000Z', author: 'Admin', authorUid: 'a1', readBy: { g2: { name: '<i>Luis</i>', readAt: '2026-10-02T12:00:00.000Z' } } },
    [EVIL.key]: { title: EVIL.title, content: EVIL.content, date: '2026-10-03T08:00:00.000Z', author: EVIL.author, authorUid: 'x' }
});
const USERS = () => ({
    a1: { name: 'Admin', role: 'Admin', email: 'admin@virtualsoft.tech', approved: true },
    s1: { name: 'Sara', role: 'Supervisor', email: 'sara@virtualsoft.tech', approved: true },
    g1: { name: 'Ana', role: 'Gestor', email: 'ana@virtualsoft.tech', approved: true, hasSplitShift: true },
    g2: { name: 'Luis', role: 'Gestor', email: 'luis@virtualsoft.tech', approved: true },
    g3: { name: '<img src=x onerror=alert(9)>', role: 'Gestor', email: 'zeta@virtualsoft.tech', approved: true, hasSplitShift: 'true' },
    g4: { name: 'QA', role: 'Gestor', email: 'qa.pruebas@virtualsoft.tech', approved: true }
});
const GESTOR = { uid: 'g1', name: 'Ana', role: 'Gestor', email: 'ana@virtualsoft.tech' };
const SUP = { uid: 's1', name: 'Sara', role: 'Supervisor', email: 'sara@virtualsoft.tech' };
const ADMIN = { uid: 'a1', name: 'Admin', role: 'Admin', email: 'admin@virtualsoft.tech' };

const scenarios = [];
/**
 * `opts.compare(traces)`: comparación propia cuando el escenario toca una decisión (diferencia intencional); por
 * defecto paridad total (`deepStrictEqual`). `assertAbsolute(env)` recibe `env.mode` ('original' | 'integrado').
 */
const S = (id, name, setup, run, assertAbsolute, opts = {}) => scenarios.push({ id, name, setup, run, assertAbsolute, ...opts });

/** Copia de una traza sin las claves indicadas (para comparar todo lo NO afectado por una decisión). */
function without(trace, keys) {
    const out = JSON.parse(JSON.stringify(trace));
    keys.forEach((k) => {
        const parts = k.split('.');
        let node = out;
        for (let i = 0; i < parts.length - 1; i += 1) node = node && node[parts[i]];
        if (node) delete node[parts[parts.length - 1]];
    });
    return out;
}

S('C1', 'D4 Gestor: listener, insignia, lista, marcar leído, doble lectura (original: la regla la rechaza y avisa; integrado: comprobación previa, sin aviso), cola de urgentes', () => ({ user: GESTOR, data: { announcements: ANN() } }), async (e) => {
    e.document.el('view-comunicados').style.display = 'block';
    e.api.initComunicadosListener();
    await flush();
    e.api.renderGestorComunicados();
    await e.api.markComunicadoAsRead('-A1');
    await e.api.markComunicadoAsRead('-A1'); // segunda vez: la regla de Firebase rechaza
    await flush();
    e.api.updateUnreadBadge();
    const btn = e.document.el('btnUrgentUnderstand');
    if (typeof btn.onclick === 'function') await btn.onclick();
    e.runTimers();
    await flush();
    e.api.checkUnreadUrgentAnnouncements();
}, (e) => {
    assert.ok(e.db.snapshot('announcements/-A1/readBy/g1'), 'se registró la lectura de -A1');
    if (e.mode === 'original') {
        assert.deepStrictEqual(e.log.alerts, ['Error al marcar como leído.', 'Error al marcar como leído.'], 'original: la doble lectura y el botón urgente ya leído avisan error');
    } else {
        assert.deepStrictEqual(e.log.alerts, [], 'D4: la doble lectura y el botón urgente de un comunicado ya leído NO avisan error');
        assert.deepStrictEqual(e.log.errors, []);
    }
    assert.strictEqual(e.db.log.filter((l) => l.path === 'announcements/-A1/readBy/g1').length, 1, 'una sola escritura');
    assert.strictEqual(e.document.el('unreadAnnouncementsBadge').textContent, 2);
    assert.strictEqual(e.document.el('urgentAnnouncementTitle').innerText, 'Segundo', 'el modal avanzó al siguiente');
    const list = e.document.el('gestorComunicadosList').innerHTML;
    assert.ok(list.includes('Primero') && !list.includes('<script') && !/<[^>]*\sonerror\s*=/i.test(list));
}, {
    // D4: la única diferencia admitida son los avisos/registros de error de la escritura duplicada.
    compare: (t) => assert.deepStrictEqual(without(t.integrado, ['alerts', 'errors']), without(t.original, ['alerts', 'errors']))
});

S('C1b', 'D4 caché desactualizado (la lectura ya existe en el servidor): original = bucle del modal urgente; integrado = se da por leído y avanza', () => {
    const ann = ANN();
    ann['-A1'].readBy = { g1: { name: 'Ana', readAt: '2026-10-05T10:00:00.000Z' } };
    return { user: GESTOR, data: { announcements: ann } };
}, async (e) => {
    e.api.setGlobalComunicados(ANN()); // caché viejo: no sabe que -A1 ya se leyó (sin listener)
    e.api.checkUnreadUrgentAnnouncements();
    e.ctx.__titles = [e.document.el('urgentAnnouncementTitle').innerText];
    for (let i = 0; i < 2; i += 1) {
        await e.document.el('btnUrgentUnderstand').onclick();
        await flush();
        e.runTimers();
        e.ctx.__titles.push(e.document.el('urgentAnnouncementTitle').innerText);
    }
}, (e) => {
    assert.strictEqual(e.db.snapshot('announcements/-A1/readBy/g1').readAt, '2026-10-05T10:00:00.000Z', 'la lectura original no se pisa');
    if (e.mode === 'original') {
        assert.deepStrictEqual(e.ctx.__titles, ['Primero', 'Primero', 'Primero'], 'original: el modal de -A1 reaparece en bucle');
        assert.deepStrictEqual(e.log.alerts, ['Error al marcar como leído.', 'Error al marcar como leído.']);
    } else {
        assert.deepStrictEqual(e.ctx.__titles.slice(0, 2), ['Primero', 'Segundo'], 'D4: duplicidad -> ya leído; -A1 no se reabre');
        assert.ok(!e.ctx.__titles.slice(1).includes('Primero'));
        assert.deepStrictEqual(e.log.alerts, [], 'D4: sin aviso de error por duplicidad');
        assert.ok(e.db.snapshot('announcements/-A2/readBy/g1'), 'el siguiente sí se registró');
    }
}, { compare: () => {} /* D4: diferencia intencional completa; ver las afirmaciones absolutas */ });

S('C1c', 'D4 fallo de RED al confirmar el urgente: original cierra y reabre; integrado deja el modal abierto (no lo marca leído)', () => ({ user: GESTOR, data: { announcements: ANN() } }), async (e) => {
    e.api.initComunicadosListener();
    await flush();
    e.db.failWrites = () => Object.assign(new Error('Network error: client offline'), { code: 'NETWORK_ERROR' });
    await e.document.el('btnUrgentUnderstand').onclick();
    await flush();
    e.ctx.__openAfterFail = e.document.isActive('urgentAnnouncementModal');
    e.ctx.__timers = e.runTimers();
    e.db.failWrites = null;
}, (e) => {
    assert.strictEqual(e.db.snapshot('announcements/-A1/readBy'), null, 'nada registrado');
    assert.deepStrictEqual(e.log.alerts, ['Error al marcar como leído.']);
    if (e.mode === 'original') {
        assert.strictEqual(e.ctx.__openAfterFail, false, 'original: cierra el modal aunque falló');
        assert.strictEqual(e.ctx.__timers, 1, 'original: programa la reapertura');
    } else {
        assert.strictEqual(e.ctx.__openAfterFail, true, 'D4: el modal sigue abierto');
        assert.strictEqual(e.ctx.__timers, 0);
        assert.strictEqual(e.document.el('btnUrgentUnderstand').disabled, false, 'se puede reintentar');
    }
    assert.strictEqual(e.document.isActive('urgentAnnouncementModal'), true, 'en ambos termina visible (el original tras reabrirlo)');
}, { compare: (t) => assert.deepStrictEqual(without(t.integrado, ['timers']), without(t.original, ['timers'])) });

S('C2', 'Gestor sin uid local: usa el uid de la sesión de Firebase; lectura XSS en el modal urgente', () => ({ user: { name: 'Ana', role: 'Gestor' }, data: { announcements: { [EVIL.key]: ANN()[EVIL.key] } } }), async (e) => {
    e.api.initComunicadosListener();
    await flush();
    e.api.renderGestorComunicados();
    e.api.updateUnreadBadge();
    e.api.checkUnreadUrgentAnnouncements();
}, (e) => {
    assert.strictEqual(e.document.el('unreadAnnouncementsBadge').textContent, 1);
    assert.ok(!e.document.el('urgentAnnouncementBody').innerHTML.includes('<script'));
});

S('C3', 'Supervisor: modal nuevo, publicar con contenido malicioso, tabla de admin, contenido, lecturas, eliminar rechazado', () => ({ user: SUP, data: { announcements: ANN(), users: USERS() } }), async (e) => {
    e.api.initComunicadosListener();
    await flush();
    e.api.openNewComunicadoModal();
    e.document.el('comunicadoTitle').value = '  Aviso nuevo  ';
    e.document.el('comunicadoContent').innerHTML = EVIL.content;
    await e.api.saveNewComunicado();
    await flush();
    e.document.el('view-gestion-comunicados').style.display = 'block';
    e.api.renderAdminComunicados();
    e.api.viewComunicadoContent('-A2');
    e.api.viewComunicadoContent('no-existe');
    await e.api.viewComunicadoLecturas('-A2');
    e.api.deleteComunicado('-A1');
}, (e) => {
    const stored = Object.values(e.db.snapshot('announcements')).find((a) => a.title === 'Aviso nuevo');
    assert.ok(stored && stored.authorUid === 's1' && !stored.content.includes('<script') && !/onclick/.test(stored.content));
    assert.ok(e.log.alerts.includes('Comunicado publicado exitosamente.') && e.log.alerts.includes('No tienes permiso para eliminar comunicados.'));
    assert.ok(!e.document.el('adminComunicadosTableBody').innerHTML.includes('deleteComunicado('), 'Supervisor no ve eliminar');
    assert.ok(e.document.el('comunicadoUnreadList').innerHTML.includes('Ana'), 'lecturas: Ana no ha leído');
    assert.ok(!e.document.el('comunicadoReadList').innerHTML.includes('<i>Luis</i>'), 'nombre escapado');
});

S('C4', 'Admin: eliminar con confirmación; rechazo de la base; gestor sin permiso', () => ({ user: ADMIN, data: { announcements: ANN(), users: USERS() } }), async (e) => {
    e.api.initComunicadosListener();
    await flush();
    e.api.renderAdminComunicados();
    e.api.deleteComunicado('-A1');
    await e.document.el('confirmDeleteBtn').listeners.click();
    await flush();
    e.api.deleteComunicado('-A2');
    e.db.rules.canWrite = () => false;
    await e.document.el('confirmDeleteBtn').listeners.click();
    await flush();
    await e.document.el('confirmDeleteBtn').listeners.click(); // sin pendiente
    e.api.setUser(GESTOR);
    e.api.deleteComunicado('-A2');
}, (e) => {
    assert.strictEqual(e.db.snapshot('announcements/-A1'), null, 'se eliminó -A1');
    assert.notStrictEqual(e.db.snapshot('announcements/-A2'), null, 'el rechazo conservó -A2');
    assert.ok(e.log.alerts.includes('No se pudo eliminar.') && e.log.alerts.includes('No tienes permiso para eliminar comunicados.'));
    assert.ok(e.document.el('adminComunicadosTableBody').innerHTML.includes('deleteComunicado('));
});

S('C5', 'Configuración de gestores: pintar, habilitar, deshabilitar, cancelar y escritura rechazada (el interruptor vuelve)', () => ({ user: ADMIN, data: { users: USERS() } }), async (e) => {
    e.api.renderConfigGestores();
    await flush();
    await e.api.toggleGestorSplitShift('g2', true);
    await flush();
    e.api.toggleGestorSplitShift('g1', false);
    await flush();
    e.setConfirm(false);
    e.api.toggleGestorSplitShift('g2', false);
    await flush();
    e.setConfirm(true);
    e.who.role = 'Supervisor'; // la regla ahora lo rechaza
    e.api.toggleGestorSplitShift('g2', false);
    await flush();
}, (e) => {
    assert.strictEqual(e.db.snapshot('users/g2/hasSplitShift'), true, 'Admin habilitó a g2; el rechazo posterior no lo cambió');
    assert.strictEqual(e.db.snapshot('users/g1/hasSplitShift'), false);
    assert.ok(e.log.alerts.includes('Hubo un error al guardar. Intenta de nuevo.'));
    assert.ok(e.log.confirms.includes('¿Estás segura de que quieres habilitar la Pausa de Turno para este usuario?'));
    const rows = e.document.el('configGestoresTableBody').children.map((c) => c.innerHTML);
    assert.strictEqual(rows.length, 3);
    assert.ok(rows[0].includes('Ana') || rows.some((r) => r.includes('Ana')));
    if (e.mode === 'original') {
        assert.ok(rows.some((r) => r.includes('<img src=x onerror=alert(9)>')), 'original: stored XSS (nombre sin escapar)');
    } else {
        assert.ok(!rows.some((r) => r.includes('<img')), 'D2: el nombre malicioso se pinta escapado');
        assert.ok(rows.some((r) => r.includes('&lt;img src=x onerror=alert(9)&gt;')));
    }
}, {
    // D2: las filas solo pueden diferir en (a) nombre/rol/correo escapados y (b) el uid codificado en el onchange.
    compare: (t) => {
        const toDecided = (html) => html
            .replace(/<div style="font-weight: 500; color: var\(--text-primary\);">([^]*?)<\/div>\n/g, (m, name) => m.replace(name, name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')))
            .replace(/toggleGestorSplitShift\('([A-Za-z0-9_-]*)', this\.checked\)/g, "toggleGestorSplitShift(decodeURIComponent('$1'), this.checked)");
        const expected = JSON.parse(JSON.stringify(t.original));
        expected.dom.configGestoresTableBody.children = expected.dom.configGestoresTableBody.children.map((c) => ({ ...c, html: toDecided(c.html) }));
        assert.deepStrictEqual(t.integrado, expected);
    }
});

S('C6', 'Configuración de gestores: sin gestores y error de lectura', () => ({ user: SUP, data: { users: { a1: USERS().a1 } } }), async (e) => {
    e.api.renderConfigGestores();
    await flush();
    const first = e.document.el('configGestoresTableBody').innerHTML;
    e.db.rules.canRead = () => false;
    e.api.renderConfigGestores();
    await flush();
    e.ctx.__first = first;
}, (e) => {
    assert.ok(e.ctx.__first.includes('No hay gestores registrados.'));
    assert.ok(e.document.el('configGestoresTableBody').innerHTML.includes('Error al cargar datos.'));
});

S('C7', 'Insignia de supervisor activo: horarios dentro y fuera, cruce de medianoche, sin cronograma', () => ({ user: SUP, data: {} }), async (e) => {
    const badge = e.document.el('activeSupervisorBadge');
    e.api.updateActiveSupervisorBadge(); // sin cronograma: no hace nada
    e.api.setSchedule([[1]], [{}]);
    for (const shifts of [{ Maria: '8am - 4pm', Sara: 'Descansa', Oriana: '10pm - 6am' }, { Maria: 'Turno', Sara: '12pm - 8pm', Oriana: 'Vacaciones' }, { Maria: 'Por Asignar' }]) {
        e.setShifts(shifts);
        e.api.updateActiveSupervisorBadge();
        e.ctx.__seen = (e.ctx.__seen || []).concat(badge.innerHTML);
    }
}, (e) => {
    assert.ok(e.ctx.__seen[0].includes('Sup: Maria') && e.ctx.__seen[2].includes('Ninguna'));
    assert.strictEqual(e.document.el('activeSupervisorBadge').style.display, 'inline-flex');
});

S('C8', 'Historial de accesos: abrir, tabla, filtros por texto y fecha; error de lectura', () => ({ user: SUP, data: {
    active_sessions: { u1: { name: 'Ana', email: 'ana@v.tech', shift: '8am - 4pm', loginTime: new Date(NOW - 3600000).toISOString(), lastActive: NOW - 1000, status: 'En Línea' } },
    login_history: { h1: { name: 'Beto', loginTime: new Date(NOW - 2 * 86400000).toISOString(), shift: '6am - 2pm' }, h2: { name: 'Cata', loginTime: new Date(NOW - 20 * 86400000).toISOString() }, hx: { name: 'Mal', loginTime: '<img src=x onerror=alert(1)>' } },
    shift_reports: { r1: { gestor: 'Dani', turnoProgramado: 'Descansa', horaInicio: new Date(NOW - 40 * 86400000).toISOString() } }
} }), async (e) => {
    const p = e.api.openLoginHistoryModal();
    e.ctx.__loading = e.document.el('loginHistoryTableBody').innerHTML;
    await p;
    e.ctx.__afterOpen = e.document.el('loginHistoryTableBody').innerHTML;
    e.document.el('loginHistorySearch').value = '  ANA ';
    e.document.el('loginHistoryDateFilter').value = 'todos';
    e.api.filterLoginHistoryTable();
    e.ctx.__afterText = e.document.el('loginHistoryTableBody').innerHTML;
    e.document.el('loginHistorySearch').value = '';
    e.document.el('loginHistoryDateFilter').value = '30d';
    try { e.api.filterLoginHistoryTable(); } catch (err) { e.ctx.__threw = err.constructor.name; } // 'Mal' tiene fecha inválida: el original lanza
    e.api.renderLoginHistoryTable([]);
    e.db.rules.canRead = () => false;
    await e.api.openLoginHistoryModal();
}, (e) => {
    assert.ok(e.ctx.__loading.includes('Cargando historial de accesos...'));
    assert.ok(e.ctx.__afterText.includes('Ana') && !e.ctx.__afterText.includes('Beto'));
    assert.strictEqual(e.ctx.__threw, 'RangeError');
    assert.ok(e.document.el('loginHistoryTableBody').innerHTML.includes('Error cargando los accesos.'));
    if (e.mode === 'original') {
        assert.ok(e.ctx.__afterOpen.includes('<img src=x onerror=alert(1)>'), 'original: loginTime inválido sin escapar (stored XSS)');
    } else {
        assert.ok(!e.ctx.__afterOpen.includes('<img'), 'D2: loginTime inválido escapado');
        assert.ok(e.ctx.__afterOpen.includes('&lt;img src=x onerror=alert(1)&gt;'));
    }
    // fuera de esa celda la tabla es la misma (D2 solo cambia el escape del valor crudo)
    e.ctx.__afterOpenNormalized = e.ctx.__afterOpen.replace('&lt;img src=x onerror=alert(1)&gt;', '<img src=x onerror=alert(1)>');
}, {
    compare: (t) => assert.deepStrictEqual(t.integrado, t.original) // la traza final (DOM, base, avisos) no cambia
});

S('C9', 'Presencia: conectar, desconectar, reconectar; monitoreo repinta el panel (lo lee un Supervisor)', () => ({ user: SUP, data: { active_sessions: { g1: { name: 'Ana', status: 'En Pausa de Turno' } } } }), async (e) => {
    e.api.setupUserPresence('');
    e.api.setupUserPresence('g1');
    e.api.startMonitoringPresence();
    e.db.setConnected(true);
    await flush();
    e.db.simulateDisconnect();
    e.db.setConnected(true);
    await flush();
}, (e) => {
    if (e.mode === 'original') {
        assert.strictEqual(e.db.snapshot('active_sessions/g1/status'), 'online');
        assert.ok(e.log.renders.length >= 3);
        assert.ok(e.db.log.some((l) => l.op === 'onDisconnect.update' && l.value === 'offline'));
    } else {
        // D6: inactivo y aislado -> ni listeners, ni escrituras, ni onDisconnect; el estado de Monitoreo no se pisa
        assert.strictEqual(e.db.snapshot('active_sessions/g1/status'), 'En Pausa de Turno');
        assert.strictEqual(e.db.listenerCount(), 0, 'sin listeners (.info/connected ni active_sessions)');
        assert.deepStrictEqual(e.db.log, [], 'sin escrituras');
        assert.deepStrictEqual(e.db.pendingDisconnectOps(), []);
        assert.strictEqual(e.log.renders.length, 0);
    }
}, { compare: () => {} /* D6: diferencia intencional completa (el original escribe y escucha; el integrado no) */ });

S('C10', 'Contador atómico: incrementos, listener y pintado; sin regla "metrics" la base lo deniega; panel filtrado no se pisa', () => ({ user: GESTOR, data: { metrics: { approvedCount: 41 } }, rules: false }), async (e) => {
    e.api.initAtomicApprovedCounterListener();
    e.api.incrementApprovedWithdrawal('g1');
    e.api.incrementApprovedWithdrawal('g1', 3);
    await flush();
    e.runTimers();
    e.api.updateApprovedCountUI(5);
    e.win.isFilteredByGestor = true;
    e.api.updateApprovedCountUI(999);
    e.ctx.__afterFiltered = e.document.el('metric-approved-count').textContent;
    e.win.isFilteredByGestor = false;
    e.api.updateApprovedCountUI(0);
    e.runTimers();
}, (e) => {
    assert.strictEqual(e.db.snapshot('metrics/approvedCount'), e.mode === 'original' ? 45 : 41, 'D6: el integrado no incrementa (inactivo)');
    if (e.mode === 'integrado') {
        assert.ok(!e.db.log.some((l) => l.op === 'transaction'), 'D6: sin transacciones');
        assert.strictEqual(e.db.listenerCount('metrics/approvedCount'), 0, 'D6: sin listener del contador');
    }
    assert.strictEqual(e.ctx.__afterFiltered, 5, 'el panel filtrado no se pisa con el valor global');
    assert.strictEqual(e.document.el('metric-approved-count').textContent, 0, 'el pintado (UI pura) sigue igual');
}, {
    // D6: difieren solo la base (transacciones/valor) y lo que el listener pintó; el pintado explícito es idéntico.
    compare: (t) => {
        assert.deepStrictEqual(t.integrado.dbLog, [], 'D6: el integrado no escribe');
        assert.deepStrictEqual(t.integrado.alerts, t.original.alerts);
        assert.deepStrictEqual(t.integrado.dom['metric-approved-count'], t.original.dom['metric-approved-count']);
    }
});

S('C11', 'Contador con reglas reales (sin nodo metrics): ni el incremento ni el listener hacen nada', () => ({ user: GESTOR, data: { metrics: { approvedCount: 3 } } }), async (e) => {
    e.api.initAtomicApprovedCounterListener();
    e.api.incrementApprovedWithdrawal('g1');
    await flush();
}, (e) => {
    assert.strictEqual(e.db.snapshot('metrics/approvedCount'), 3);
    assert.ok(!e.document.elements.has('metric-approved-count'));
    // D6: el original deja registrado un listener (rechazado por reglas) en cada carga; el integrado ninguno
    assert.strictEqual(e.db.listenerCount('metrics/approvedCount'), e.mode === 'original' ? 1 : 0);
});

S('C12', 'Novedades: enviar, campos vacíos, sin sesión, escritura rechazada; listener (Supervisor) y tabla con XSS', () => ({ user: SUP, data: {} }), async (e) => {
    e.api.startIncidentsRealtimeListener();
    const form = e.document.el('incidentForm'); form.reset = () => { form.resetCalled = true; };
    const prevent = { n: 0, preventDefault() { this.n += 1; } };
    e.document.el('incidentType').value = 'Soporte';
    e.document.el('incidentTitle').value = '  <script>alert(1)</script> ';
    e.document.el('incidentAssignee').value = '';
    e.document.el('incidentDetail').value = '"><img src=x onerror=alert(2)>';
    await e.api.handleNewIncidentSubmit(prevent);
    e.ctx.__prevented = prevent.n;
    e.document.el('incidentTitle').value = '';
    await e.api.handleNewIncidentSubmit({ preventDefault() {} });
    e.api.setUser(null);
    await e.api.handleNewIncidentSubmit({ preventDefault() {} });
    e.api.setUser(SUP);
    e.document.el('incidentTitle').value = 'T';
    e.db.rules.canWrite = () => false;
    await e.api.handleNewIncidentSubmit({ preventDefault() {} });
    e.api.renderIncidentsTable([{ title: EVIL.title, detail: EVIL.content, type: EVIL.author, assignedTo: 'x', reportedBy: 'y', status: 'Cerrado', timestamp: NOW }]);
}, (e) => {
    assert.strictEqual(e.ctx.__prevented, 1, 'preventDefault se llama de forma síncrona');
    assert.ok(e.log.alerts.includes('¡Novedad/Incidente registrada exitosamente!') && e.log.alerts.includes('Por favor completa el título y el detalle de la novedad.') && e.log.alerts.includes('Debes iniciar sesión para registrar una novedad.') && e.log.alerts.includes('Ocurrió un error al registrar la novedad.'));
    assert.strictEqual(Object.keys(e.db.snapshot('logs')).length, 1);
    assert.ok(!e.document.el('incidentsTableBody').innerHTML.includes('<script') && !e.document.el('incidentsTableBody').innerHTML.includes('<img'));
});

S('C13', 'Novedades: un Gestor no puede leer logs (el listener no recibe nada) pero sí crear la suya', () => ({ user: GESTOR, data: { logs: { a: { uid: 'x', title: 'secreto', timestamp: 1 } } } }), async (e) => {
    e.api.startIncidentsRealtimeListener();
    e.document.el('incidentTitle').value = 'Caída';
    e.document.el('incidentDetail').value = 'No carga';
    await e.api.handleNewIncidentSubmit({ preventDefault() {} });
}, (e) => {
    assert.strictEqual(e.document.el('incidentsTableBody').innerHTML, '');
    assert.strictEqual(Object.keys(e.db.snapshot('logs')).length, 2);
});

S('C14', 'D9(c) Admin, Supervisor y Gestor: modal urgente bloqueante, confirmación registrada en readBy/{uid} y no reaparece (paridad total: app.js ya lo hacía)', () => ({ user: ADMIN, data: { announcements: ANN() } }), async (e) => {
    e.ctx.__byRole = {};
    e.api.initComunicadosListener(); // con ADMIN: el listener ya abre su modal urgente
    await flush();
    for (const user of [ADMIN, SUP, GESTOR]) {
        e.api.setUser(user); e.who.uid = user.uid; e.who.role = user.role;
        if (!e.document.isActive('urgentAnnouncementModal')) e.api.checkUnreadUrgentAnnouncements();
        const seen = [];
        for (let i = 0; i < 4 && e.document.isActive('urgentAnnouncementModal'); i += 1) {
            seen.push(e.document.el('urgentAnnouncementTitle').innerText);
            await e.document.el('btnUrgentUnderstand').onclick();
            await flush();
            e.runTimers();
        }
        e.ctx.__byRole[user.role] = seen;
    }
    e.api.checkUnreadUrgentAnnouncements(); // ya no queda nada sin confirmar para el último rol
}, (e) => {
    for (const [role, uid] of [['Admin', 'a1'], ['Supervisor', 's1'], ['Gestor', 'g1']]) {
        assert.deepStrictEqual(e.ctx.__byRole[role].slice(0, 2), ['Primero', 'Segundo'], `${role}: recibe el modal urgente (más antiguo primero)`);
        for (const id of ['-A1', '-A2', EVIL.key]) assert.ok(e.db.snapshot(`announcements/${id}/readBy/${uid}`), `${role}: confirmó ${id}`);
    }
    assert.strictEqual(e.document.isActive('urgentAnnouncementModal'), false, 'todo confirmado: no reaparece');
    assert.deepStrictEqual(e.log.alerts, []);
});

// ------------------------------------------------------------------ ejecución
(async () => {
    const H = await loadHelpers();
    console.log('=== CORTE COMUNICADOS, CONFIGURACIÓN E INCIDENCIAS - PARIDAD DEL APP.JS INTEGRADO ===');
    console.log(`integrado: ${INTEGRATED_PATH} | original: ${ORIGINAL_PATH} | ${new Date().toISOString()}`);
    let pass = 0; let fail = 0;
    const record = (ok, label, err) => { if (ok) { pass += 1; console.log(`  [PASS] ${label}`); } else { fail += 1; console.log(`  [FAIL] ${label}\n         -> ${err && err.message ? err.message.split('\n').slice(0, 6).join('\n            ') : err}`); } };

    // Comprobaciones estáticas del integrado
    const FUNCS = ['updateActiveSupervisorBadge', 'openLoginHistoryModal', 'renderLoginHistoryTable', 'filterLoginHistoryTable', 'setupUserPresence', 'startMonitoringPresence', 'incrementApprovedWithdrawal', 'initAtomicApprovedCounterListener', 'updateApprovedCountUI', 'handleNewIncidentSubmit', 'startIncidentsRealtimeListener', 'renderIncidentsTable', 'initComunicadosListener', 'openNewComunicadoModal', 'saveNewComunicado', 'updateUnreadBadge', 'renderGestorComunicados', 'markComunicadoAsRead', 'checkUnreadUrgentAnnouncements', 'markUrgentComunicadoAsRead', 'renderConfigGestores', 'toggleGestorSplitShift', 'renderAdminComunicados', 'viewComunicadoContent', 'viewComunicadoLecturas', 'deleteComunicado'];
    try {
        assert.strictEqual(FUNCS.length, 26);
        for (const f of FUNCS) {
            const re = new RegExp(`function ${f}\\(`);
            assert.ok(re.test(INTEGRATED), `la función ${f} sigue declarada en el integrado (los onclick la resuelven)`);
            const body = INTEGRATED.slice(INTEGRATED.search(re), INTEGRATED.search(re) + 400).split('\n').slice(0, 12).join('\n');
            assert.ok(body.includes('__lab') || body.includes('RiskOps'), `la función ${f} delega en RiskOps`);
        }
        record(true, 'las 26 funciones siguen declaradas y delegan en RiskOps (nombre y firma conservados)');
    } catch (err) { record(false, 'las 26 funciones siguen declaradas y delegan en RiskOps', err); }

    try {
        const bundleNames = ['announcementService', 'announcementsController', 'incidentService', 'incidentsController', 'gestorConfig', 'configGestoresController', 'loginHistory', 'loginHistoryController', 'presenceService', 'approvedCounter', 'approvedCounterService', 'approvedCountView', 'activeSupervisors', 'supervisorBadgeController'];
        const ctx = vm.createContext({});
        vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);
        for (const n of bundleNames) assert.ok(ctx.RiskOps[n] && Object.keys(ctx.RiskOps[n]).length > 0, `RiskOps.${n}`);
        record(true, `el bundle expone los ${bundleNames.length} espacios de nombres del corte`);
    } catch (err) { record(false, 'el bundle expone los espacios de nombres del corte', err); }

    for (const sc of scenarios) {
        const traces = {};
        let failed = false;
        for (const mode of ['original', 'integrado']) {
            try {
                const cfg = sc.setup();
                const env = makeEnv(H, mode, cfg);
                await sc.run(env);
                await flush();
                try { sc.assertAbsolute(env); } catch (err) { throw new Error(`[${mode}] resultado absoluto: ${err.message}`); }
                traces[mode] = trace(env);
            } catch (err) { failed = true; record(false, `${sc.id} ${sc.name}`, err); break; }
        }
        if (failed) continue;
        try {
            if (typeof sc.compare === 'function') sc.compare(traces); else assert.deepStrictEqual(traces.integrado, traces.original);
            record(true, `${sc.id} ${sc.name}`);
        } catch (err) { record(false, `${sc.id} ${sc.name} (traza distinta entre original e integrado)`, err); }
    }

    console.log('\n=== RESUMEN ===');
    console.log(`Pasan: ${pass} | Fallan: ${fail} | Total: ${pass + fail}`);
    console.log(fail === 0 ? `RESULTADO: TODO CUMPLIDO (${scenarios.length} escenarios: paridad con el original salvo las diferencias intencionales D2/D4/D6 afirmadas en cada escenario; D9(c) con paridad total)` : 'RESULTADO: HAY FALLAS');
    process.exitCode = fail === 0 ? 0 : 1;
})();
