/**
 * Tareas, persistencia y ciclo de aplicación: paridad entre el app.js ORIGINAL y el app.js INTEGRADO del
 * laboratorio (2026-10-06).
 *
 * Ejecuta las funciones REALES de app.js (las que el paso `lab/integracion/pasos/tareas.mjs` conecta) en un `vm`
 * con DOM, Firebase (Realtime Database con la semántica de `update()` y `transaction()`), localStorage, `fetch`,
 * SheetJS, reloj y temporizadores simulados. Si el app.js recibido es el integrado (marcas [LAB-INTEGRACION]), las
 * funciones delegan en el bundle real `RiskOps` (--riskops). Con `--original <app.js del repo>` cada escenario se
 * ejecuta TAMBIÉN contra el original y se exige que TODO lo observable sea idéntico, en el MISMO orden: alertas,
 * errores de consola, lecturas y escrituras a Firebase (con su carga), escrituras a localStorage (el respaldo local
 * antes del intento remoto), llamadas a `fetch`, DOM resultante (antes y después de los temporizadores), estado
 * global (caché de tareas, catálogo, selección, horario) y errores.
 *
 * DIFERENCIA INTENCIONAL por la decisión D8 (2026-10-06): en el app.js INTEGRADO la tarjeta KPI del gestor muestra el
 * MISMO porcentaje que el latido (`formatProgress` = round(finalizadas/total*100)); el original sumaba dos porcentajes
 * redondeados (1+1 de 3: 66 % frente a 67 % del latido; 3+2 de 7: 72 % frente a 71 %). En la comparación de paridad
 * se normaliza SOLO el número del `<text class="percentage">` de la tarjeta; K1 y K5 afirman el valor decidido en el
 * integrado y el original en el original.
 *
 * Diferencias DOCUMENTADAS e inocuas, excluidas de la comparación:
 *  - `splitShiftStartTime` / `totalSplitShiftTimeMs` del latido y el aviso `#riskOpsSyncWarning`: los añade el
 *    controlador de turno (otro corte), no este;
 *  - `#scheduleGestorFilter` (app.js lo pide y no lo usa) y el log 'current user matched = true' por fila.
 *
 * Uso:
 *   node tareas-integrado.e2e.cjs <app.js del repo>                              (solo escenarios sobre el original)
 *   node tareas-integrado.e2e.cjs <app.integrado.js> --riskops <bundle.js> --original <app.js del repo>
 */
const fs = require('fs');
const vm = require('vm');
let assignMasterRowIds; // ESM: se carga en el arranque (ver más abajo)
const path = require('path');
const { pathToFileURL } = require('url');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const APP = args.find((a) => !a.startsWith('--') && a.endsWith('.js') && a !== opt('--riskops') && a !== opt('--original'));
if (!APP) { console.error('Uso: node tareas-integrado.e2e.cjs <app.js> [--riskops <bundle.js>] [--original <app.js del repo>]'); process.exit(2); }
const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const SRC = read(APP);
// W-26 (CF-0.4): el contrato de IDs estables de main/rama es assignMasterRowIds (hash de Set + Tarea).
// El original de referencia usaba row.id = idx; en la paridad se le aplica el mismo contrato (ver ORIGINAL_W26).
const BUNDLE = opt('--riskops') ? fs.readFileSync(opt('--riskops'), 'utf8') : null;
const ORIGINAL_SRC = opt('--original') ? read(opt('--original')) : null;
const ORIGINAL_W26 = ORIGINAL_SRC ? ORIGINAL_SRC.replace(/json\.forEach\(\(row, idx\) => \{\s*row\.id = idx;\s*\}\);/, '__assignW26Ids(json);') : null;
if (ORIGINAL_SRC && ORIGINAL_W26 === ORIGINAL_SRC) { console.error('no se aplicó el contrato W-26 al original: cambió el texto de referencia'); process.exit(2); }
const BRIDGE_MARK = '// [LAB-INTEGRACION] Puente app.js -> RiskOps (corte "tareas")';
const INTEGRATED = SRC.includes(BRIDGE_MARK);
if (INTEGRATED && !BUNDLE) { console.error('app.js integrado: falta --riskops <bundle>'); process.exit(2); }
if (INTEGRATED && !ORIGINAL_SRC) { console.error('app.js integrado: falta --original <app.js del repo> para comprobar la paridad'); process.exit(2); }

// ------------------------------------------------------------------ extracción de código real
function fn(src, header) {
    const s = src.indexOf(header);
    if (s < 0) throw new Error('No se encontró: ' + header);
    return src.slice(s, src.indexOf('\n}\n', s) + 3);
}
function between(src, startMarker, endMarker) {
    const s = src.indexOf(startMarker);
    if (s < 0) throw new Error('No se encontró: ' + startMarker);
    const e = src.indexOf(endMarker, s);
    if (e < 0) throw new Error('No se encontró fin: ' + endMarker);
    return src.slice(s, e);
}
function codeFor(src) {
    const integrated = src.includes(BRIDGE_MARK);
    const helpers = [
        // Integrado (paso 3.4): la global migrateLocalTasksToActiveSession se retiró de app.js (no tenía llamadas: la
        // migración la ejecuta el controlador). Este envoltorio de PRUEBA llama al mismo repositorio que llamaba el original.
        integrated ? 'async function migrateLocalTasksToActiveSession(uid, mergedCache, remoteCache) { return __tareasRepo().migrateLocalTasksToActiveSession(uid, mergedCache, remoteCache); }' : '',
        fn(src, 'function escapeHTML(str) {'),
        fn(src, 'function encodeInlineHandlerArg(value) {'),
        fn(src, 'function normalizeName(name) {'),
        src.includes('function normalizeTaskName(name) {') ? fn(src, 'function normalizeTaskName(name) {') : '',
        src.includes('function cleanText(text) {') ? fn(src, 'function cleanText(text) {') : '',
        fn(src, 'function namesMatch(name1, name2) {'),
        fn(src, 'function taskNamesMatch(cronTask, masterTask) {'),
        fn(src, 'function setNamesMatch(set1, set2) {'),
        src.includes('function excelToJSDate(serial) {') ? fn(src, 'function excelToJSDate(serial) {') : '',
        src.includes('function isSameDate(excelDate, jsDate) {') ? fn(src, 'function isSameDate(excelDate, jsDate) {') : '',
        fn(src, 'function getShiftForDate(rows, allScheduleBlocks, gestorName, date) {'),
        fn(src, 'function canonicalTaskId(id) {'),
        src.slice(src.indexOf('const privateGitHubDocs = {'), src.indexOf('\n}\n', src.indexOf('function getDocUrl(fileName) {')) + 3)
    ].join('\n');
    // bloque del controlador de turno (otro corte): el latido integrado lo usa para el estado de las pausas
    const shiftBlock = src.includes('// [LAB-INTEGRACION:INICIO]')
        ? between(src, '// [LAB-INTEGRACION:INICIO]', '// [LAB-INTEGRACION:FIN]') + '// [LAB-INTEGRACION:FIN]\n'
        : '';
    const regions = [
        between(src, integrated ? BRIDGE_MARK : '// Live Clock Logic', '// Update clock every second'),
        between(src, 'async function loadExcelTasks() {', '// --- Identidad can'),
        between(src, 'function persistTaskToActiveSession(uid, taskId, taskData) {', 'function syncActiveSessionToFirebase() {'),
        between(src, 'function syncActiveSessionToFirebase() {', 'function updateKPI() {'),
        between(src, 'function updateKPI() {', '// Task Status Buttons Interaction'),
        'async function __initAppStart() {' + between(src, 'async function initApp() {', '    // Theme logic').slice('async function initApp() {'.length) + '}\n',
        'function __initSaveBtn() {\n' + between(src, "    const saveTaskBtn = document.getElementById('saveTaskBtn');", "    const pForm = document.getElementById('permisosForm');") + '}\n'
    ].join('\n');

    return { helpers, shiftBlock, regions };
}

// ------------------------------------------------------------------ entorno simulado
const NOW = Date.UTC(2026, 9, 6, 15, 0, 0);
const serialOf = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const settle = async () => { for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setImmediate(resolve)); };

let H = null; // ayudantes de tareas-fake-dom.mjs (ESM), cargados al inicio
let NL = null; // normalizador de manejadores del original (legacy-action-migration.mjs, ESM)

/** Envuelve la base simulada: registra, EN ORDEN, cada lectura/escritura con su carga (junto a alertas y localStorage). */
function track(obj, label, ev) {
    return new Proxy(obj, {
        get(target, key) {
            const value = target[key];
            if (typeof value !== 'function') return value;

            return (...a) => {
                ev.push(['db', label, String(key), String(key) === 'update' ? clone(a[0]) : null]);
                const result = value.apply(target, a);

                return (result && typeof result === 'object' && typeof result.then !== 'function' && key !== 'val') ? track(result, `${label}.${String(key)}(${a.join(',')})`, ev) : result;
            };
        }
    });
}

/** Base simulada + consultas de `permissions` (orderByChild/equalTo) y detalle por id. */
function withPermissions(db, permissions, failOnce) {
    const all = permissions || {};
    const mk = (filter) => ({
        orderByChild(key) { return { equalTo(value) { return mk((k, v) => v[key] === value); } }; },
        async once() {
            if (failOnce) throw new Error('permission_denied');
            const picked = {};
            Object.keys(all).forEach((k) => { if (!filter || filter(k, all[k])) picked[k] = all[k]; });
            const empty = Object.keys(picked).length === 0;

            return { exists: () => !empty, val: () => clone(picked) };
        }
    });

    return {
        data: db.data,
        log: db.log,
        ref(p) {
            if (p === 'permissions') return mk(null);
            if (/^permissions\//.test(p)) { const id = p.split('/')[1]; return { async once() { if (failOnce) throw new Error('x'); return { exists: () => !!all[id], val: () => clone(all[id]) }; } }; }

            return db.ref(p);
        }
    };
}

function snapshotElement(e) {
    return {
        id: e.id, className: e.className, classes: e.classList.toString(), innerHTML: e.innerHTML, textContent: e.textContent,
        value: e.value, disabled: e.disabled, readOnly: e.readOnly, placeholder: e.placeholder, style: { ...e.style }, children: e.children.map(snapshotElement)
    };
}

function el(tag, props, classes) {
    const e = new H.FakeElement(tag);
    Object.assign(e, props || {});
    (classes || []).forEach((c) => e.classList.add(c));

    return e;
}

/** Crea un contexto con las funciones reales de `src` cargadas. */
function createWorld(src, sc) {
    const ev = [];
    const timers = [];
    const lists = new Map();
    const storage = new Map();
    const storedUser = sc.storedUser === undefined ? sc.user : sc.storedUser;
    if (storedUser) storage.set('riskOps_currentUser', JSON.stringify(storedUser));
    Object.entries(sc.storage || {}).forEach(([k, v]) => storage.set(k, v));

    const doc = H.createFakeDocument(sc.docOpts || {});
    const setAll = (selector, elements) => { lists.set(selector, elements); return doc.setAll(selector, elements); };
    if (sc.docSetup) sc.docSetup(doc, setAll);

    const baseDb = H.createFakeDatabase(clone(sc.db || {}), sc.dbOpts || {});
    // cada llamada se registra (en orden, con su ruta) en `ev`, junto a alertas y localStorage
    const dbApi = {
        data: baseDb.data,
        log: baseDb.log,
        ref: (p) => track(withPermissions(baseDb, sc.permissions, sc.permissionsFail).ref(p), p, ev)
    };

    class FakeDate extends Date {
        constructor(...a) { if (a.length) super(...a); else super(NOW); }
        static now() { return NOW; }
    }

    const fetchPlan = sc.fetchPlan || {};
    const ctx = {
        document: doc,
        database: dbApi,
        Date: FakeDate,
        window: { idleDetectorGranted: !!sc.idleGranted, location: { href: '' } },
        alert: (m) => ev.push(['alert', m]),
        console: {
            error: (...a) => ev.push(['console.error', ...a.map((x) => (x && x.message) || String(x))]),
            log: (...a) => { const line = a.map(String).join(' '); if (line !== 'current user matched = true') ev.push(['console.log', line]); },
            warn() {}
        },
        firebase: { auth: () => { if (sc.authThrows) throw new Error('auth boom'); const uid = sc.authUid === undefined ? 'g1' : sc.authUid; return { currentUser: uid ? { uid } : null }; } },
        localStorage: {
            setItem: (k, v) => { if (sc.storageThrows) throw new Error('QuotaExceededError'); ev.push(['storage.set', k, v]); storage.set(k, String(v)); },
            getItem: (k) => (storage.has(k) ? storage.get(k) : null),
            removeItem: (k) => { storage.delete(k); }
        },
        setTimeout: (f, ms) => { timers.push({ fn: f, ms }); return 0; },
        fetch: async (url) => {
            ev.push(['fetch', url]);
            const key = Object.keys(fetchPlan).find((k) => url.startsWith(k));
            const plan = fetchPlan[key] || { ok: false, status: 404 };
            if (plan.throws) throw new Error(plan.throws);

            return { ok: plan.ok, status: plan.status === undefined ? (plan.ok ? 200 : 500) : plan.status, arrayBuffer: async () => plan.payload };
        },
        XLSX: {
            read(payload) { if (payload && payload.readThrows) throw new Error('XLSX corrupto'); return { SheetNames: ['Hoja1'], Sheets: { Hoja1: payload } }; },
            utils: { sheet_to_json: (ws) => clone(ws.rows) }
        },
        __cfg: { user: clone(sc.user === undefined ? null : sc.user), cache: clone(sc.cache || {}), allTasks: clone(sc.allTasks || []), activeId: sc.activeId === undefined ? null : sc.activeId, selected: clone(sc.selected || {}), assignments: clone(sc.assignments || []), globalIdle: !!sc.globalIdle, domIdle: !!sc.domIdle, schedule: clone(sc.schedule || null) },
        __ev: ev,
        __ms: {},
        __selectedTask: clone(sc.selectedTask === undefined ? null : sc.selectedTask),
        __settle: settle,
        __runTimers: () => { timers.splice(0).forEach((t) => { try { t.fn(); } catch (e) { ev.push(['timer-error', String(e && e.message)]); } }); }
    };
    vm.createContext(ctx);
    ctx.__assignW26Ids = assignMasterRowIds;
    if (src.includes(BRIDGE_MARK)) vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);
    // W-24 (paso 3.3): el respaldo DOM vive ahora en el puente (idle-detector-adapter), no en app.js. Con domIdle la pestaña
    // está visible y con foco, y la última actividad es antigua: el puente lo decide como lo hace app.js al arrancar.
    if (sc.domIdle && src.includes(BRIDGE_MARK)) {
        doc.visibilityState = 'visible';
        doc.hasFocus = () => true;
        vm.runInContext('RiskOps.idleDetector.initIdleDetector({ getLastActivityTimestamp: () => 0, autoStart: false });', ctx);
    }

    const { helpers, shiftBlock, regions } = codeFor(src);
    vm.runInContext(
        'let currentUser = __cfg.user; let taskStateCache = __cfg.cache; let allTasks = __cfg.allTasks; let currentActiveTaskId = __cfg.activeId; let currentSelectedTask = __selectedTask;\n' +
        'let globalScheduleRows = __cfg.schedule ? __cfg.schedule.rows : null; let globalScheduleBlocks = __cfg.schedule ? __cfg.schedule.blocks : null; let gestorCronogramaAssignments = null;\n' +
        'let lastSyncLoopTimestamp = 0; let globalIdleState = __cfg.globalIdle; let localStatus = "En Línea"; let shiftTimeline = [{ type: "Almuerzo", start: 1, end: 2 }];\n' +
        'let isLunchBreak = false, lunchStartTime = null, totalLunchTimeMs = 0, isBreakfastBreak = false, breakfastStartTime = null, totalBreakfastTimeMs = 0, isSplitShiftBreak = false, splitShiftStartTime = null, totalSplitShiftTimeMs = 0;\n' +
        'function loadBreakState() { __ev.push(["loadBreakState"]); }\n' +
        'function pushTimelineEvent(type, action) { __ev.push(["timeline", type, action]); }\n' +
        'function shouldApplyDomIdleFallback() { return __cfg.domIdle; }\n' +
        'function saveBreakState() {}\nfunction updateActivity() {}\nfunction setupSidebar() {}\n' +
        'async function loadCronogramaAssignments(name, shift) { __ev.push(["loadCronograma", name, shift]); gestorCronogramaAssignments = JSON.parse(JSON.stringify(__cfg.assignments)); }\n' +
        'function setupCustomMultiSelect(id, options, cb) { __ev.push(["multiSelect.setup", id, JSON.stringify(options)]); __ms[id] = cb; }\n' +
        'function getSelectedMultiSelectValues(id) { return __cfg.selected[id] || []; }\n' +
        helpers + '\n' + shiftBlock + '\n' + regions, ctx);

    return { ctx, doc, ev, timers, lists, storage, dbApi, baseDb };
}

const STATE_JS = 'JSON.stringify({ cache: taskStateCache, allTasks: allTasks, activeId: currentActiveTaskId, selectedTask: currentSelectedTask, scheduleRows: globalScheduleRows, scheduleBlocks: globalScheduleBlocks, user: currentUser, localStatus: localStatus, shiftTimeline: shiftTimeline, assignments: gestorCronogramaAssignments })';

function normalizeDoc(w) {
    const shot = H.snapshotDocument(w.doc);
    delete shot['#scheduleGestorFilter'];
    delete shot['#riskOpsSyncWarning'];
    const lists = {};
    [...w.lists.keys()].sort().forEach((k) => { lists[k] = w.lists.get(k).map(snapshotElement); });

    return { ...shot, __listas: lists };
}

const SHIFT_OWNED_KEYS = ['splitShiftStartTime', 'totalSplitShiftTimeMs'];
function stripShiftOwned(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const out = { ...obj };
    SHIFT_OWNED_KEYS.forEach((k) => delete out[k]);

    return out;
}

async function observe(src, sc) {
    const w = createWorld(src, sc);
    let thrown = null;
    let ret = null;
    try { ret = await vm.runInContext('(async () => {\n' + sc.run + '\n})()', w.ctx); } catch (e) { thrown = `${e && e.name}: ${e && e.message}`; }
    await settle();
    const before = normalizeDoc(w);
    const timerDelays = w.timers.map((t) => t.ms);
    w.ctx.__runTimers();
    await settle();
    const dbData = clone(w.baseDb.data);
    Object.keys(dbData.active_sessions || {}).forEach((uid) => { dbData.active_sessions[uid] = stripShiftOwned(dbData.active_sessions[uid]); });
    const ev = w.ev.map((e) => (e[0] === 'db' && /^active_sessions\/[^/]+$/.test(e[1]) && e[2] === 'update' ? ['db', e[1], e[2], stripShiftOwned(e[3])] : e));

    return {
        thrown, ret: ret === undefined ? null : clone(ret), ev: clone(ev), timerDelays, domBeforeTimers: before, domAfterTimers: normalizeDoc(w),
        state: JSON.parse(vm.runInContext(STATE_JS, w.ctx)), dbData, href: w.ctx.window.location.href
    };
}

// ------------------------------------------------------------------ datos
const GESTOR = { role: 'Gestor', uid: 'g1', name: 'Ana Prueba', email: 'ana@virtualsoft.tech', shift: '8am - 4pm', loginTime: '2026-10-06T12:00:00.000Z' };
const ADMIN = { role: 'Admin', uid: 'a1', name: 'Jefe', email: 'jefe@virtualsoft.tech' };
const rec = (name, status, observation, updatedAt) => ({ name, status, observation, updatedAt });
const TASKS = [
    { id: 0, Tarea: 'Revisar GGR casino', 'Detalle de Tarea': 'Detalle <b>0</b>', Horario: 'Durante el turno', 'Día': 'Diario', Instrucciones: 'Paso 1', 'Set ': 'Casino' },
    { id: 1, Tarea: 'Validar apuestas deportivas', 'Detalle de Tarea': '', Horario: '', 'Día': '', Instrucciones: '', 'Set ': 'Deportes' },
    { id: 'abc', Tarea: 'Tarea con id texto', 'Detalle de Tarea': 'x', Horario: 'h', 'Día': 'd', Instrucciones: 'i', 'Set ': 'Otros' }
];

function taskItems(setAll, total, completed, notDone) {
    setAll('.task-item', Array.from({ length: total }, () => el('div')));
    setAll('.task-item .status-completed', Array.from({ length: completed }, () => el('span')));
    setAll('.task-item .status-not-done', Array.from({ length: notDone }, () => el('span')));
}

const ev = (o, kind) => o.ev.filter((e) => e[0] === kind);
const dbWrites = (o) => o.ev.filter((e) => e[0] === 'db' && ['update', 'set', 'transaction'].includes(e[2]));
const ALERT = (o, i) => (ev(o, 'alert')[i] || [])[1];

// generadores con semilla (misma forma de datos que las pruebas diferenciales de controllers/task-loaders-controller.test.mjs)
function randomMaster(rng) {
    const sets = ['Casino', 'Deportes', 'Pagos & "Bonos"', "Retiros d'oro", 'Otros'];
    const names = ['Revisar GGR casino', 'Validar apuestas deportivas', 'Revisión de retiros pendientes', 'Control de bonos <CRM>', 'Alertas SEON de cuentas', 'Verificación de eventos en vivo', 'Tarea ñandú'];
    const rows = [];
    for (let i = 0; i < 2 + Math.floor(rng() * 9); i += 1) {
        const row = { Tarea: names[Math.floor(rng() * names.length)], 'Detalle de Tarea': 'detalle ' + i, Horario: 'Durante el turno', 'Día': 'Diario', Instrucciones: 'ins ' + i };
        const set = sets[Math.floor(rng() * sets.length)];
        if (rng() < 0.15) row.Set = set; else if (rng() < 0.9) row['Set '] = set;
        rows.push(row);
    }

    return rows;
}
function randomSchedule(rng, userName) {
    const rows = [['Horario 2026']];
    const gestores = [userName, 'Luis Fuentes', 'María López', "Pedro O'Neil", 'Sara <b>'];
    const shifts = ['8am - 4pm', '2pm - 10pm', 'Descansa', 'Vacaciones', 'Disponible', 'Dosponible', 'Familia', 'Incapacidad', 'Noche', '6am - 2pm', '', 'otra cosa'];
    const nBlocks = 1 + Math.floor(rng() * 3);
    const withToday = rng() < 0.6 ? Math.floor(rng() * nBlocks) : -1;
    for (let b = 0; b < nBlocks; b += 1) {
        const dateRow = [''];
        const dayRow = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        for (let d = 0; d < 7; d += 1) dateRow.push(rng() < 0.2 ? '2026-10-' + String(10 + b * 7 + d).padStart(2, '0') : serialOf(2026, 10, b === withToday ? 3 + d : 14 + 7 * b + d));
        rows.push(dateRow, dayRow);
        gestores.forEach((g) => { if (rng() < 0.85) { const row = [g]; for (let d = 0; d < 7; d += 1) row.push(rng() < 0.05 ? 8 : shifts[Math.floor(rng() * shifts.length)]); rows.push(row); } });
        rows.push(rng() < 0.5 ? [''] : ['GESTOR']);
    }

    return rows;
}
function randomTeleSheet(rng) {
    const rows = [];
    const gestores = ['Ana Prueba', 'Luis Fuentes', 'María López', 'Sara <b>', 'GESTOR'];
    for (let b = 0; b < 1 + Math.floor(rng() * 3); b += 1) {
        const col = rng() < 0.5 ? 0 : 3;
        const header = new Array(col).fill('');
        header.push(['Semana 1', 'Teletrabajo oct', '5/10', 'nada'][Math.floor(rng() * 4)], 'DÍA');
        rows.push(header);
        for (let r = 0; r < 1 + Math.floor(rng() * 5); r += 1) { const line = new Array(col).fill(''); line.push(gestores[Math.floor(rng() * gestores.length)], rng() < 0.5 ? 'Lunes' : (rng() < 0.5 ? 'nan' : '')); rows.push(line); }
        rows.push(['']);
    }

    return rows;
}
function randomPermissions(rng) {
    const data = {};
    const gestores = ['Ana Prueba', 'Luis Fuentes', "O'Neil <b>"];
    for (let i = 0; i < Math.floor(rng() * 7); i += 1) {
        data['-key' + i] = {
            id: 1760000000000 + Math.floor(rng() * 1e8), uid: rng() < 0.6 ? 'g1' : 'g2', gestor: gestores[Math.floor(rng() * 3)], tipo: 'Cita médica', fecha: '2026-10-07', horaInicio: '08:00', horaFin: '10:00', motivo: 'm <x>',
            status: ['Pendiente', 'Aprobado', 'Rechazado'][Math.floor(rng() * 3)], rejectionReason: rng() < 0.3 ? 'no & no' : undefined, horaSolicitud: rng() < 0.5 ? '06/10/2026 08:00:00' : undefined
        };
    }

    return data;
}

const rngOf = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

const kpiDom = (total, completed, notDone, withCard = true) => (doc, setAll) => { taskItems(setAll, total, completed, notDone); if (withCard) doc.querySelector('.kpi-card'); };
const statusButtons = (doc, setAll) => {
    setAll('.btn-status', [el('button', { textContent: 'Pendiente' }, ['btn-status', 'pending']), el('button', { textContent: 'En Proceso' }, ['btn-status', 'in-progress']), el('button', { textContent: ' Finalizada ' }, ['btn-status', 'completed']), el('button', { textContent: 'No Realizada' }, ['btn-status', 'not-done'])]);
};

// ------------------------------------------------------------------ escenarios: { id, name, ..., run, check(obs, eq, ok) }
const SCENARIOS = [];
const add = (s) => SCENARIOS.push(s);

// ---- reloj
add({ id: 'C1', name: 'updateClock: hora local HH:MM:SS en #liveClock', user: GESTOR, run: 'updateClock();', check(o, eq, ok) { ok(/^\d\d:\d\d:\d\d$/.test(o.domBeforeTimers['#liveClock'].textContent), 'formato de hora'); } });
add({ id: 'C2', name: 'updateClock: sin #liveClock no falla', user: GESTOR, docOpts: { missingIds: ['liveClock'] }, run: 'updateClock();', check(o, eq) { eq(o.thrown, null); } });

// ---- persistencia de una tarea
add({ id: 'R1', name: 'persistTaskToActiveSession escribe SOLO active_sessions/<uid>/tasks/<id> con update() y conserva las demás tareas', user: GESTOR, db: { active_sessions: { g1: { name: 'Ana', tasks: { 4: rec('otra', 'Finalizada', 'o', 5) } } } },
    run: "await persistTaskToActiveSession('g1', '5', { name: 'x', status: 'En Proceso', observation: 'o', updatedAt: 7 });", check(o, eq) {
        eq(dbWrites(o).map((e) => e[1] + ':' + e[2]), ['active_sessions/g1/tasks/5:update']);
        eq(Object.keys(o.dbData.active_sessions.g1.tasks).sort(), ['4', '5']); eq(o.dbData.active_sessions.g1.name, 'Ana');
    } });
add({ id: 'R2', name: 'persistTaskToActiveSession: sin uid o sin taskId rechaza ANTES de tocar Firebase', user: GESTOR,
    run: "const out = []; for (const [u, t] of [[null, '1'], ['g1', ''], ['g1', 0], ['', 'x']]) { try { await persistTaskToActiveSession(u, t, { a: 1 }); out.push('ok'); } catch (e) { out.push(e.message); } } return out;", check(o, eq) {
        eq(o.ret, ['MISSING_UID', 'MISSING_TASK_ID', 'MISSING_TASK_ID', 'MISSING_UID']); eq(o.ev.filter((e) => e[0] === 'db').length, 0);
    } });
add({ id: 'R3', name: 'persistTaskToActiveSession: el fallo remoto se propaga (jamás se convierte en éxito)', user: GESTOR, dbOpts: { failPaths: { 'active_sessions/g1/tasks/5': ['update'] }, errorCode: 'PERMISSION_DENIED' },
    run: "try { await persistTaskToActiveSession('g1', '5', { updatedAt: 1 }); return 'ok'; } catch (e) { return [e.message, e.code]; }", check(o, eq) { eq(o.ret, ['update fallido en active_sessions/g1/tasks/5', 'PERMISSION_DENIED']); } });

// ---- lectura del progreso remoto
add({ id: 'F1', name: 'fetchOwnActiveSessionTasks: devuelve {ok:true, tasks}', user: GESTOR, db: { active_sessions: { g1: { tasks: { 1: rec('a', 'Finalizada', 'o', 3) } } } }, run: "return await fetchOwnActiveSessionTasks('g1');", check(o, eq) { eq(o.ret, { ok: true, tasks: { 1: rec('a', 'Finalizada', 'o', 3) } }); } });
add({ id: 'F2', name: 'fetchOwnActiveSessionTasks: nodo vacío -> {ok:true, tasks:{}}', user: GESTOR, run: "return await fetchOwnActiveSessionTasks('g1');", check(o, eq) { eq(o.ret, { ok: true, tasks: {} }); } });
add({ id: 'F3', name: 'fetchOwnActiveSessionTasks: un fallo de lectura NUNCA se disfraza de remoto vacío ({ok:false}) y se registra', user: GESTOR, dbOpts: { failPaths: { 'active_sessions/g1/tasks': ['once'] } }, run: "return await fetchOwnActiveSessionTasks('g1');", check(o, eq) {
    eq(o.ret, { ok: false, tasks: {} }); eq(ev(o, 'console.error').length, 1); eq(ev(o, 'console.error')[0][1], 'Error al recuperar el progreso remoto de tareas:');
} });
add({ id: 'F4', name: 'fetchOwnActiveSessionTasks: sin uid -> {ok:false} sin leer', user: GESTOR, run: 'return await fetchOwnActiveSessionTasks(null);', check(o, eq) { eq(o.ret, { ok: false, tasks: {} }); eq(o.ev.filter((e) => e[0] === 'db').length, 0); } });

// ---- transacción condicional
const NEWER_DB = { active_sessions: { g1: { tasks: { newer: rec('n', 'Finalizada', 'remoto', 200), equal: rec('e', 'Finalizada', 'remoto', 100), older: rec('o', 'Finalizada', 'remoto', 50), legacy: { name: 'l', status: 'Finalizada' } } } } };
add({ id: 'N1', name: 'persistTaskIfNotNewerRemote: aborta si el remoto es ESTRICTAMENTE más reciente y conserva su valor', user: GESTOR, db: NEWER_DB,
    run: "const out = {}; for (const id of ['newer', 'equal', 'older', 'absent', 'legacy']) { out[id] = (await persistTaskIfNotNewerRemote('g1', id, { name: 'L', status: 'En Proceso', observation: 'local', updatedAt: 100 })).committed; } out.sinFecha = (await persistTaskIfNotNewerRemote('g1', 'newer', { name: 'L', status: 'x', observation: '' })).committed; return out;", check(o, eq) {
        eq(o.ret, { newer: false, equal: true, older: true, absent: true, legacy: true, sinFecha: true });
        eq(o.dbData.active_sessions.g1.tasks.legacy.observation, 'local');
    } });
add({ id: 'N2', name: 'persistTaskIfNotNewerRemote: remoto más nuevo se conserva intacto', user: GESTOR, db: NEWER_DB, run: "return (await persistTaskIfNotNewerRemote('g1', 'newer', { name: 'L', status: 'En Proceso', observation: 'local', updatedAt: 100 })).committed;", check(o, eq) {
    eq(o.ret, false); eq(o.dbData.active_sessions.g1.tasks.newer, rec('n', 'Finalizada', 'remoto', 200));
} });
add({ id: 'N3', name: 'persistTaskIfNotNewerRemote: sin uid o taskId rechaza', user: GESTOR, run: "const out = []; for (const [u, t] of [[null, 'a'], ['g1', '']]) { try { await persistTaskIfNotNewerRemote(u, t, { updatedAt: 1 }); out.push('ok'); } catch (e) { out.push(e.message); } } return out;", check(o, eq) { eq(o.ret, ['MISSING_UID', 'MISSING_TASK_ID']); } });

// ---- migración puntual
const MIG_CACHE = { a: rec('A', 'Finalizada', 'local nueva', 300), b: rec('B', 'En Proceso', 'solo local', 10), c: rec('C', 'Finalizada', 'igual', 100) };
const MIG_DB = { active_sessions: { g1: { tasks: { a: rec('A', 'Pendiente', 'remota vieja', 50), c: rec('C', 'Finalizada', 'igual', 100) } } } };
add({ id: 'M1', name: 'migrateLocalTasksToActiveSession: respalda en localStorage ANTES de cada intento remoto y migra lo pendiente', user: GESTOR, cache: MIG_CACHE, db: MIG_DB,
    run: "const remote = (await fetchOwnActiveSessionTasks('g1')).tasks; return await migrateLocalTasksToActiveSession('g1', taskStateCache, remote);", check(o, eq, ok) {
        eq(o.ret.failed, []); ok(o.ret.migrated.length >= 1, 'debía migrar');
        const order = o.ev.filter((e) => e[0] === 'storage.set' || (e[0] === 'db' && e[2] === 'transaction')).map((e) => e[0]);
        ok(order[0] === 'storage.set', 'el respaldo local va primero'); ok(order.indexOf('storage.set') < order.indexOf('db'), 'respaldo antes del remoto');
    } });
add({ id: 'M2', name: 'migrateLocalTasksToActiveSession: un fallo individual no aborta el resto ni se reporta como éxito', user: GESTOR, cache: MIG_CACHE, db: MIG_DB, dbOpts: { failPaths: { 'active_sessions/g1/tasks/b': ['transaction'] } },
    run: "const remote = (await fetchOwnActiveSessionTasks('g1')).tasks; return await migrateLocalTasksToActiveSession('g1', taskStateCache, remote);", check(o, eq, ok) {
        eq(o.ret.failed, ['b']); ok(o.ret.migrated.includes('a'), 'a debía migrarse'); eq(ev(o, 'console.error').length, 1);
    } });
add({ id: 'M3', name: 'migrateLocalTasksToActiveSession: si otra pestaña escribió algo más nuevo, queda en "skipped" y el remoto no se pisa', user: GESTOR, cache: { a: rec('A', 'Finalizada', 'local', 300) }, db: { active_sessions: { g1: { tasks: { a: rec('A', 'Pendiente', 'vieja', 50) } } } },
    dbOpts: { beforeTransaction: (p, db) => { db.setAt(p, { name: 'A', status: 'Finalizada', observation: 'otra pestaña', updatedAt: 900 }); } },
    run: "const remote = (await fetchOwnActiveSessionTasks('g1')).tasks; return await migrateLocalTasksToActiveSession('g1', taskStateCache, remote);", check(o, eq) {
        eq(o.ret.skipped, ['a']); eq(o.dbData.active_sessions.g1.tasks.a.observation, 'otra pestaña');
    } });
add({ id: 'M4', name: 'migrateLocalTasksToActiveSession: localStorage lleno no impide la migración remota', user: GESTOR, cache: MIG_CACHE, db: MIG_DB, storageThrows: true,
    run: "const remote = (await fetchOwnActiveSessionTasks('g1')).tasks; return await migrateLocalTasksToActiveSession('g1', taskStateCache, remote);", check(o, eq, ok) { ok(o.ret.migrated.length >= 1, 'migró sin localStorage'); } });
add({ id: 'M5', name: 'migrateLocalTasksToActiveSession: sin uid o sin caché no hace nada', user: GESTOR, run: "return [await migrateLocalTasksToActiveSession(null, {}, {}), await migrateLocalTasksToActiveSession('g1', null, {})];", check(o, eq) {
    eq(o.ret, [{ migrated: [], failed: [], skipped: [] }, { migrated: [], failed: [], skipped: [] }]); eq(o.ev.length, 0);
} });

// ---- recuperación del progreso del Gestor
const REC_DB = { active_sessions: { g1: { tasks: { a: rec('A', 'Finalizada', 'remota nueva', 500), z: rec('Z', 'Finalizada', 'solo remota', 20) } } } };
const REC_CACHE = { a: rec('A', 'Pendiente', 'local vieja', 100), b: rec('B', 'En Proceso', 'solo local', 40) };
add({ id: 'V1', name: 'recoverGestorTaskProgress: fusiona (gana el updatedAt mayor), respalda y migra lo solo-local', user: GESTOR, cache: REC_CACHE, db: REC_DB, run: "const r = await recoverGestorTaskProgress('g1'); return r;", check(o, eq) {
    eq(o.ret, { status: 'OK', failedMigrationsCount: 0 }); eq(o.state.cache.a.observation, 'remota nueva'); eq(o.state.cache.z.observation, 'solo remota'); eq(o.dbData.active_sessions.g1.tasks.b.observation, 'solo local');
} });
add({ id: 'V2', name: 'recoverGestorTaskProgress: lectura remota fallida -> REMOTE_READ_FAILED, CERO escrituras (ni Firebase ni localStorage) y caché intacto', user: GESTOR, cache: REC_CACHE, db: REC_DB, dbOpts: { failPaths: { 'active_sessions/g1/tasks': ['once'] } }, run: "return await recoverGestorTaskProgress('g1');", check(o, eq) {
    eq(o.ret, { status: 'REMOTE_READ_FAILED', failedMigrationsCount: 0 }); eq(dbWrites(o).length, 0); eq(ev(o, 'storage.set').length, 0); eq(o.state.cache, REC_CACHE);
} });
add({ id: 'V3', name: 'recoverGestorTaskProgress: identidad distinta -> IDENTITY_MISMATCH, CERO escrituras remotas', user: GESTOR, cache: REC_CACHE, db: REC_DB, authUid: 'otro', run: "return await recoverGestorTaskProgress('g1');", check(o, eq) {
    eq(o.ret, { status: 'IDENTITY_MISMATCH', failedMigrationsCount: 0 }); eq(dbWrites(o).length, 0); eq(ev(o, 'console.error').length, 1);
} });
add({ id: 'V4', name: 'recoverGestorTaskProgress: sin usuario autenticado -> IDENTITY_MISMATCH', user: GESTOR, cache: REC_CACHE, db: REC_DB, authUid: null, run: "return await recoverGestorTaskProgress('g1');", check(o, eq) { eq(o.ret.status, 'IDENTITY_MISMATCH'); eq(dbWrites(o).length, 0); } });
add({ id: 'V5', name: 'recoverGestorTaskProgress: migraciones fallidas se cuentan', user: GESTOR, cache: REC_CACHE, db: REC_DB, dbOpts: { failPaths: { 'active_sessions/g1/tasks/b': ['transaction'] } }, run: "return await recoverGestorTaskProgress('g1');", check(o, eq) { eq(o.ret, { status: 'OK', failedMigrationsCount: 1 }); } });
add({ id: 'V6', name: 'recoverGestorTaskProgress: localStorage lleno no impide fusionar ni migrar', user: GESTOR, cache: REC_CACHE, db: REC_DB, storageThrows: true, run: "return await recoverGestorTaskProgress('g1');", check(o, eq) { eq(o.ret.status, 'OK'); } });
add({ id: 'V7', name: 'recoverGestorTaskProgress: otra pestaña escribe algo más nuevo durante la migración -> no se pisa', user: GESTOR, cache: { b: rec('B', 'En Proceso', 'local', 40) }, db: { active_sessions: { g1: { tasks: {} } } },
    dbOpts: { beforeTransaction: (p, db) => { db.setAt(p, rec('B', 'Finalizada', 'otra pestaña', 999)); } }, run: "return await recoverGestorTaskProgress('g1');", check(o, eq) { eq(o.dbData.active_sessions.g1.tasks.b.observation, 'otra pestaña'); } });

// ---- latido de sesión activa
const syncRun = 'return await syncActiveSessionToFirebase();';
add({ id: 'S1', name: 'latido: contadores y porcentaje del DOM; solo metadatos con update() (NUNCA "tasks")', user: GESTOR, docSetup: kpiDom(5, 2, 1), db: { active_sessions: { g1: { tasks: { 1: rec('a', 'Finalizada', 'o', 3) } } } }, run: syncRun, check(o, eq, ok) {
    const w = dbWrites(o); eq(w.length, 1); eq(w[0][1], 'active_sessions/g1'); eq(w[0][2], 'update');
    const p = w[0][3]; eq([p.totalTasks, p.completedTasks, p.notDoneTasks, p.finalizedTasks, p.percentage], [5, 2, 1, 3, 60]); eq(p.appVersion, 'v104');
    ok(!('tasks' in p), 'el latido no debe enviar tasks'); eq(Object.keys(o.dbData.active_sessions.g1.tasks), ['1']);
} });
add({ id: 'S2', name: 'latido: porcentaje del supervisor redondea finalizadas/total (1+1 de 3 = 67)', user: GESTOR, docSetup: kpiDom(3, 1, 1), run: syncRun, check(o, eq) { eq(dbWrites(o)[0][3].percentage, 67); } });
add({ id: 'S3', name: 'latido: sin tareas -> porcentaje 0', user: GESTOR, docSetup: kpiDom(0, 0, 0), run: syncRun, check(o, eq) { eq(dbWrites(o)[0][3].percentage, 0); } });
add({ id: 'S4', name: 'latido: usuario que no es Gestor, o sin uid, no escribe', user: ADMIN, run: "const a = await syncActiveSessionToFirebase(); currentUser = { role: 'Gestor' }; const b = await syncActiveSessionToFirebase(); currentUser = null; const c = await syncActiveSessionToFirebase(); return [a, b, c];", check(o, eq) { eq(dbWrites(o).length, 0); } });
add({ id: 'S5', name: 'latido: sesión cerrada en otra pestaña -> currentUser=null, redirige a login y no escribe', user: GESTOR, storedUser: null, run: syncRun, check(o, eq) { eq(o.state.user, null); eq(o.href, 'login.html'); eq(dbWrites(o).length, 0); } });
add({ id: 'S6', name: 'latido: inactividad por IdleDetector abre y cierra el evento en la bitácora (una sola vez cada uno)', user: GESTOR, docSetup: kpiDom(2, 0, 0), idleGranted: true, globalIdle: true,
    run: 'await syncActiveSessionToFirebase(); await syncActiveSessionToFirebase(); globalIdleState = false; await syncActiveSessionToFirebase(); await syncActiveSessionToFirebase(); return localStatus;', check(o, eq) {
        eq(ev(o, 'timeline'), [['timeline', 'Inactividad', 'start'], ['timeline', 'Inactividad', 'end']]); eq(o.ret, 'En Línea');
        eq(dbWrites(o).map((e) => e[3].status), ['Inactivo', 'Inactivo', 'En Línea', 'En Línea']);
    } });
add({ id: 'S7', name: 'latido: respaldo por DOM (sin IdleDetector) marca Inactivo', user: GESTOR, domIdle: true, docSetup: kpiDom(1, 0, 0), run: syncRun, check(o, eq) { eq(dbWrites(o)[0][3].status, 'Inactivo'); eq(ev(o, 'timeline').length, 1); } });
add({ id: 'S8', name: 'latido: fallo de Firebase -> la Promise real se rechaza y se registra el error', user: GESTOR, docSetup: kpiDom(1, 0, 0), dbOpts: { failPaths: { 'active_sessions/g1': ['update'] } }, run: syncRun, check(o, eq) {
    ok1(o.thrown && o.thrown.includes('update fallido'), 'debía rechazarse'); eq(ev(o, 'console.error')[0][1], 'Error syncing active session via SDK:');
} });
add({ id: 'S9', name: 'latido: bitácora nula -> [] y sin loginTime usa la hora actual', user: { role: 'Gestor', uid: 'g1', name: 'Ana', email: 'a@x' }, docSetup: kpiDom(1, 1, 0), run: 'shiftTimeline = null; return await syncActiveSessionToFirebase();', check(o, eq) {
    const p = dbWrites(o)[0][3]; eq(p.timeline, []); eq(p.loginTime, '2026-10-06T15:00:00.000Z'); eq(p.shift, 'Por Asignar');
} });
add({ id: 'S10', name: 'latido: con bitácora y Pausa de Turno en curso el estado y los contadores coinciden con el original', user: Object.assign({}, GESTOR, { hasSplitShift: true }), docSetup: kpiDom(4, 1, 2), run: 'isSplitShiftBreak = true; splitShiftStartTime = 1000; return await syncActiveSessionToFirebase();', check(o, eq) { eq(dbWrites(o)[0][3].status, 'En Pausa de Turno'); } });
function ok1(c, m) { if (!c) throw new Error(m); }

// ---- KPI
const kpiScenario = (id, name, user, total, completed, notDone, withCard, extra) => add(Object.assign({ id, name, user, docSetup: kpiDom(total, completed, notDone, withCard), run: 'updateKPI();' }, extra));
kpiScenario('K1', 'updateKPI (Gestor, 7 tareas: 3 realizadas, 2 no realizadas): tarjeta y latido [D8: integrado 71 % = latido; original 72 %]', GESTOR, 7, 3, 2, true, { check(o, eq, ok) {
    const html = o.domBeforeTimers['.kpi-card'].innerHTML;
    ok(html.includes(INTEGRATED ? '>71%</text>' : '>72%</text>') && html.includes('<strong>7</strong> Asignadas') && html.includes('<strong>2</strong> Pendientes'), 'tarjeta');
    eq(dbWrites(o).length, 1); eq(dbWrites(o)[0][3].percentage, 71);
} });
kpiScenario('K2', 'updateKPI (Admin): pinta la tarjeta y NO sincroniza', ADMIN, 4, 1, 1, true, { check(o, eq) { eq(dbWrites(o).length, 0); } });
kpiScenario('K3', 'updateKPI: sin .kpi-card un Gestor igual sincroniza', GESTOR, 2, 0, 0, false, { docOpts: { missingSelectors: ['.kpi-card'] }, check(o, eq) { eq(dbWrites(o).length, 1); } });
kpiScenario('K4', 'updateKPI: sin tareas -> 0 %', GESTOR, 0, 0, 0, true, {});
kpiScenario('K5', 'updateKPI: 1 + 1 de 3 -> D8: tarjeta 67 % = latido 67 % en el integrado (el original pintaba 33 % + 33 % = 66 %)', GESTOR, 3, 1, 1, true, { check(o, eq, ok) {
    const html = o.domBeforeTimers['.kpi-card'].innerHTML;
    if (INTEGRATED) { ok(html.includes('>67%</text>') && !html.includes('>66%</text>'), 'KPI 67 %'); } else { ok(html.includes('>66%</text>'), 'KPI 66 % (original)'); }
    eq(dbWrites(o)[0][3].percentage, 67);
} });
kpiScenario('K7', 'updateKPI: sin tareas -> tarjeta 0 % y latido 0 (D8, total = 0)', GESTOR, 0, 0, 0, true, { check(o, eq, ok) { ok(o.domBeforeTimers['.kpi-card'].innerHTML.includes('>0%</text>'), 'KPI 0 %'); eq(dbWrites(o)[0][3].percentage, 0); } });
kpiScenario('K6', 'updateKPI: Gestor con latido que falla no lanza (el error ya se registra)', GESTOR, 2, 1, 0, true, { dbOpts: { failPaths: { 'active_sessions/g1': ['update'] } } });

// ---- árbol, documentos y selección
add({ id: 'T1', name: 'toggleTree alterna "open" y el hermano "show"; sin hermano no falla', user: GESTOR, docSetup: (doc) => { const sib = el('div'); const a = el('div'); a.nextElementSibling = sib; const b = el('div'); doc.byId.set('t-a', a); doc.byId.set('t-sib', sib); doc.byId.set('t-b', b); },
    run: "const tt = typeof __tareasWorkspace === 'function' ? (el) => __tareasWorkspace().toggleTree(el) : toggleTree; const a = document.getElementById('t-a'); const b = document.getElementById('t-b'); tt(a); tt(b); const first = [a.classList.contains('open'), document.getElementById('t-sib').classList.contains('show')]; tt(a); return [first, a.classList.contains('open'), b.classList.contains('open')];", check(o, eq) { eq(o.ret, [[true, true], false, true]); } });
add({ id: 'D1', name: 'renderQuickDocs: sin tarea lista todos los documentos; con palabra clave destaca el sugerido', user: GESTOR,
    run: "const out = []; for (const n of [null, '', 'Validar GGR', 'apuestas', 'Retiros', 'jineteo', 'Eliminación de cuentas', 'bonos CRM', 'eventos deportivos', 'eventos', 'SEON', 'sin coincidencia']) { renderQuickDocs(n); out.push(document.getElementById('quickDocsList').innerHTML); } return out;", check(o, eq, ok) {
        ok(o.ret[2].includes('Sugerido para esta tarea') && o.ret[0].includes('Validación SEON') && !o.ret[0].includes('Sugerido'), 'destacado');
    } });
add({ id: 'D2', name: 'renderQuickDocs: sin #quickDocsList no falla', user: GESTOR, docOpts: { missingIds: ['quickDocsList'] }, run: "renderQuickDocs('GGR');", check(o, eq) { eq(o.thrown, null); } });
const TREE_SETS = { 'Set 10': [{ id: 3, name: 'Tarea <diez>' }], 'Set 2': [{ id: 1, name: "O'Neil \"x\"" }, { id: 'a b', name: 'Con espacio' }], Otros: [{ id: 'extra_1', name: '[EXTRA] z' }], Casino: [{ id: 0, name: 'Revisar GGR' }] };
add({ id: 'A1', name: 'renderTree: orden de Sets, escape de nombres, estado desde el caché, KPI y latido', user: GESTOR, cache: { 0: rec('Revisar GGR', 'Finalizada', 'o', 1), 1: rec('x', 'No Realizada', 'o', 2), 3: rec('t', 'En Proceso', '', 3) }, docSetup: (doc, setAll) => { taskItems(setAll, 4, 1, 1); doc.querySelector('.tree-container'); doc.querySelector('.kpi-card'); },
    run: `renderTree(${JSON.stringify(TREE_SETS)});`, check(o, eq, ok) {
        const tree = o.domBeforeTimers['.tree-container']; eq(tree.children.length, 4); ok(tree.children[0].innerHTML.includes('Set 2') || tree.children[0].innerHTML.length > 0, 'hijos'); eq(dbWrites(o).length, 1);
    } });
add({ id: 'A2', name: 'renderTree: un solo Set se expande solo', user: ADMIN, docSetup: (doc) => { doc.querySelector('.tree-container'); doc.querySelector('.kpi-card'); }, run: "renderTree({ 'Set 1': [{ id: 0, name: 'Única' }] });", check(o, eq, ok) { ok(/open|show/.test(o.domBeforeTimers['.tree-container'].children[0].innerHTML), 'expandido'); } });
add({ id: 'A3', name: 'renderTree: sin contenedor no hace nada (ni KPI)', user: GESTOR, docOpts: { missingSelectors: ['.tree-container'] }, run: "renderTree({ 'Set 1': [{ id: 0, name: 'X' }] });", check(o, eq) { eq(dbWrites(o).length, 0); } });
add({ id: 'A4', name: 'renderTree: sin Sets deja el contenedor vacío y actualiza el KPI', user: ADMIN, docSetup: (doc) => { doc.querySelector('.tree-container'); doc.querySelector('.kpi-card'); }, run: 'renderTree({});', check(o, eq) { eq(o.domBeforeTimers['.tree-container'].children.length, 0); } });

const selectDom = (doc, setAll) => {
    statusButtons(doc, setAll); doc.querySelector('.btn-status.pending'); doc.getElementById('currentTaskTitle'); doc.getElementById('taskObservation'); doc.getElementById('taskTarget');
    setAll('.task-item', [el('div', {}, ['active']), el('div', {}, ['active', 'otro'])]);
};
add({ id: 'X1', name: 'selectTask (Gestor, tarea con progreso): título, nota, botón activo y documento sugerido', user: GESTOR, allTasks: TASKS, cache: { 0: rec('Revisar GGR casino', 'Finalizada', 'nota previa', 9) }, docSetup: selectDom, run: "window.selectTask('0', { currentTarget: document.getElementById('taskTarget') });", check(o, eq, ok) {
    eq(o.domBeforeTimers['#currentTaskTitle'].textContent, 'Revisar GGR casino'); eq(o.domBeforeTimers['#taskObservation'].value, 'nota previa'); eq(o.state.activeId, '0'); ok(o.domBeforeTimers['#taskTarget'].classes.includes('active'), 'objetivo activo');
} });
add({ id: 'X2', name: 'selectTask (Gestor, sin progreso): limpia la nota y marca "Pendiente"', user: GESTOR, allTasks: TASKS, cache: {}, docSetup: selectDom, run: "document.getElementById('taskObservation').value = 'sobrante'; window.selectTask(1, { currentTarget: document.getElementById('taskTarget') });", check(o, eq) { eq(o.domBeforeTimers['#taskObservation'].value, ''); eq(o.state.activeId, '1'); } });
add({ id: 'X3', name: 'selectTask (Gestor, estado guardado desconocido): cae en "Pendiente"', user: GESTOR, allTasks: TASKS, cache: { 0: rec('x', 'Estado raro', 'n', 9) }, docSetup: selectDom, run: "window.selectTask('0', {});", check(o, eq) { eq(o.domBeforeTimers['#taskObservation'].value, 'n'); } });
add({ id: 'X4', name: 'selectTask (Admin / Supervisor): muestra detalle e instrucciones y no toca los botones', user: ADMIN, allTasks: TASKS, docSetup: selectDom, run: "window.selectTask('0', { currentTarget: document.getElementById('taskTarget') }); currentUser = { role: 'Supervisor' }; window.selectTask('1', {});", check(o, eq, ok) { ok(o.domBeforeTimers['#taskObservation'].value.startsWith('Detalle: Sin detalle'), 'detalle de la 2.ª tarea'); } });
add({ id: 'X5', name: 'selectTask: id inexistente limpia la selección', user: GESTOR, allTasks: TASKS, activeId: '0', selectedTask: TASKS[0], docSetup: selectDom, run: "window.selectTask('999', { currentTarget: document.getElementById('taskTarget') });", check(o, eq) {
    eq(o.state.selectedTask, null); eq(o.state.activeId, null); eq(o.domBeforeTimers['#currentTaskTitle'].textContent, 'Selecciona una tarea');
} });
add({ id: 'X6', name: 'selectTask: id de texto y sin evento ni elementos opcionales', user: GESTOR, allTasks: TASKS, docOpts: { missingIds: ['currentTaskTitle', 'taskObservation'] }, docSetup: selectDom, run: "window.selectTask('abc');", check(o, eq) { eq(o.state.activeId, 'abc'); } });

// ---- cargadores de datos (semillas fijas)
const MASTER_URL = 'Tareas%20Riesgo/';
add({ id: 'L1', name: 'loadExcelTasks: Admin, árbol y selector de Set (cambio de selector)', user: ADMIN, fetchPlan: { [MASTER_URL]: { ok: true, payload: { rows: randomMaster(rngOf(11)) } } }, docSetup: (doc) => { doc.querySelector('.tree-container'); doc.getElementById('activeSetSelect'); doc.querySelector('.kpi-card'); },
    run: "await loadExcelTasks(); const s = document.getElementById('activeSetSelect'); const sets = [...new Set(allTasks.map((t) => t['Set '] || t['Set'] || 'Otros'))].sort(); s.fire('change', { target: { value: 'Todos' } }); if (sets[0]) s.fire('change', { target: { value: sets[0] } }); return allTasks.length;", check(o, eq, ok) { ok(o.ret > 0, 'tareas'); } });
for (let i = 0; i < 12; i += 1) {
    const rng = rngOf(100 + i);
    const rows = randomMaster(rng);
    const assignments = [];
    rows.forEach((r) => { if (rng() < 0.5) assignments.push({ task: r.Tarea, set: r['Set '] || r.Set || 'Otros' }); });
    if (rng() < 0.5) assignments.push({ task: 'Tarea solo en cronograma', set: 'Casino' });
    const cache = {};
    if (rng() < 0.7) cache['0'] = rec('x', 'Finalizada', 'o', 5);
    if (rng() < 0.5) cache['999'] = rec('huérfana', 'Finalizada', '', 7);
    if (rng() < 0.4) cache.extra_1 = rec('[EXTRA] z', 'Finalizada', '', 8);
    add({ id: 'L2.' + (i + 1), name: `loadExcelTasks: Gestor con cronograma (semilla ${100 + i}): filtra, genera tareas del cronograma, purga huérfanas y migra "En Proceso"`, user: GESTOR, assignments, cache,
        db: { active_sessions: { g1: { tasks: { 0: rec('x', 'Pendiente', '', 99) } } } }, fetchPlan: { [MASTER_URL]: { ok: true, payload: { rows } } }, docSetup: (doc) => { doc.querySelector('.tree-container'); doc.getElementById('activeSetSelect'); doc.querySelector('.kpi-card'); },
        run: "await loadExcelTasks(); return allTasks.length;" });
}
add({ id: 'L3', name: 'loadExcelTasks: errores (HTTP, Excel corrupto, red caída) muestran el mismo mensaje', user: ADMIN, docSetup: (doc) => { doc.querySelector('.tree-container'); }, fetchPlan: { [MASTER_URL]: { ok: false, status: 503 } },
    run: "await loadExcelTasks(); return document.querySelector('.tree-container').innerHTML;", check(o, eq, ok) { ok(o.ret.includes('Error cargando tareas: Error HTTP 503'), 'mensaje'); } });
add({ id: 'L4', name: 'loadExcelTasks: Excel corrupto', user: ADMIN, docSetup: (doc) => { doc.querySelector('.tree-container'); }, fetchPlan: { [MASTER_URL]: { ok: true, payload: { readThrows: true } } }, run: 'await loadExcelTasks();' });
add({ id: 'L5', name: 'loadExcelTasks: red caída', user: ADMIN, docSetup: (doc) => { doc.querySelector('.tree-container'); }, fetchPlan: { [MASTER_URL]: { throws: 'Failed to fetch <red>' } }, run: 'await loadExcelTasks();' });
add({ id: 'L6', name: 'loadExcelTasks: sin contenedor ni selector no falla', user: ADMIN, docOpts: { missingSelectors: ['.tree-container'], missingIds: ['activeSetSelect'] }, fetchPlan: { [MASTER_URL]: { ok: true, payload: { rows: randomMaster(rngOf(5)) } } }, run: 'await loadExcelTasks();' });

for (let i = 0; i < 10; i += 1) {
    const rng = rngOf(300 + i);
    const userName = ['Ana Prueba', 'Luis Fuentes', 'Nadie Conocido'][Math.floor(rng() * 3)];
    const user = [{ role: 'Gestor', uid: 'g1', name: userName, shift: 'Por Asignar' }, { role: 'Admin', uid: 'a1', name: userName }, { role: 'Gestor', uid: 'g1', name: userName, shift: '8am - 4pm' }][Math.floor(rng() * 3)];
    const rows = randomSchedule(rng, 'Ana Prueba');
    add({ id: 'H' + (i + 1), name: `loadSchedule (semilla ${300 + i}): bloques, semana por defecto, selectores, tabla y efectos sobre el usuario`, user, selected: rng() < 0.3 ? { scheduleGestorMultiSelect: ['Luis Fuentes', 'ana prueba'] } : {},
        fetchPlan: { 'Horario/': { ok: true, payload: { rows } }, [MASTER_URL]: { ok: true, payload: { rows: [{ 'Set ': 'Casino', Tarea: 'T' }] } } },
        docSetup: (doc) => { ['weekSelector', 'scheduleTableHead', 'scheduleTableBody'].forEach((id) => doc.getElementById(id)); doc.querySelector('.shift-badge'); doc.querySelector('.tree-container'); },
        run: "await loadSchedule(); await __settle(); const w = document.getElementById('weekSelector'); if (w && globalScheduleBlocks && globalScheduleBlocks.length > 1) w.fire('change', { target: { value: String(globalScheduleBlocks[0].startRow) } }); if (__ms.scheduleGestorMultiSelect) { __cfg.selected.scheduleGestorMultiSelect = ['María López']; __ms.scheduleGestorMultiSelect(); } return globalScheduleBlocks ? globalScheduleBlocks.length : 0;" });
}
add({ id: 'H11', name: 'loadSchedule: hoja sin bloques y falla de red', user: ADMIN, fetchPlan: { 'Horario/': { ok: true, payload: { rows: [['a'], ['b']] } }, [MASTER_URL]: { ok: true, payload: { rows: [] } } }, docSetup: (doc) => { doc.getElementById('weekSelector'); }, run: 'await loadSchedule();' });
add({ id: 'H12', name: 'loadSchedule: error HTTP', user: ADMIN, fetchPlan: { 'Horario/': { ok: false, status: 404 } }, run: 'await loadSchedule();' });

for (let i = 0; i < 8; i += 1) {
    const rng = rngOf(500 + i);
    const user = [{ role: 'Gestor', uid: 'g1', name: 'Ana Prueba' }, ADMIN][Math.floor(rng() * 2)];
    add({ id: 'W' + (i + 1), name: `loadTeletrabajo (semilla ${500 + i}): bloques, selector y tabla`, user, fetchPlan: { 'Teletrabajo/': { ok: true, payload: { rows: randomTeleSheet(rng) } } }, selected: rng() < 0.3 ? { teletrabajoGestorMultiSelect: ['Luis Fuentes'] } : {},
        docSetup: (doc) => { ['teletrabajoWeekSelector', 'teletrabajoTableHead', 'teletrabajoTableBody'].forEach((id) => doc.getElementById(id)); },
        run: "loadTeletrabajo(); await __settle(); const w = document.getElementById('teletrabajoWeekSelector'); if (w) w.fire('change', { target: { value: '0' } }); if (__ms.teletrabajoGestorMultiSelect) { __cfg.selected.teletrabajoGestorMultiSelect = ['María López']; __ms.teletrabajoGestorMultiSelect(); }" });
}
add({ id: 'W9', name: 'loadTeletrabajo: error HTTP muestra la fila de error', user: ADMIN, fetchPlan: { 'Teletrabajo/': { ok: false, status: 404 } }, docSetup: (doc) => { doc.getElementById('teletrabajoTableBody'); }, run: 'loadTeletrabajo(); await __settle();', check(o, eq, ok) { ok(o.domBeforeTimers['#teletrabajoTableBody'].innerHTML.includes('No se pudo cargar Teletrabajo.xlsx'), 'mensaje'); } });

for (let i = 0; i < 8; i += 1) {
    const rng = rngOf(700 + i);
    const user = [GESTOR, { role: 'Gestor', name: 'Luis Fuentes' }, ADMIN, { role: 'Supervisor', name: 'S' }][Math.floor(rng() * 4)];
    add({ id: 'P' + (i + 1), name: `loadPermisos (semilla ${700 + i}): consulta por rol, filtro de privacidad, orden y HTML`, user, authUid: rng() < 0.2 ? null : 'g1', permissions: randomPermissions(rng), permissionsFail: rng() < 0.15, docSetup: (doc) => { doc.getElementById('historicoPermisosList'); },
        run: "await loadPermisos(); const first = Object.keys(document.getElementById('historicoPermisosList') ? { x: 1 } : {}); return first.length;" });
}
add({ id: 'P9', name: 'openPermisoDetailModal: usa la lista cargada por loadPermisos (detalle completo y modal activo)', user: ADMIN, permissions: { '-k1': { id: 1760000000001, uid: 'g1', gestor: "O'Neil <b>", tipo: 'Cita médica', fecha: '2026-10-07', horaInicio: '08:00', horaFin: '10:00', motivo: 'm <x>', status: 'Rechazado', rejectionReason: 'no & no', horaSolicitud: '06/10/2026 08:00:00' } },
    docSetup: (doc) => { ['historicoPermisosList', 'permDetailContent', 'permDetailModal'].forEach((id) => doc.getElementById(id)); }, run: "await loadPermisos(); await window.openPermisoDetailModal('-k1'); await window.openPermisoDetailModal('no-existe');", check(o, eq, ok) { ok(o.domBeforeTimers['#permDetailModal'].classes.includes('active'), 'modal'); } });

// ---- arranque de initApp (secuencia de datos) y botón de guardar
const NO_NET = { 'Horario/': { ok: false, status: 404 }, [MASTER_URL]: { ok: false, status: 404 }, 'Teletrabajo/': { ok: false, status: 404 } };
const initRun = '__initAppStart(); await __settle(); await __settle();';
add({ id: 'I1', name: 'initApp (inicio): Gestor con lectura remota fallida -> UNA alerta de "no se pudo verificar", luego horario, tareas, teletrabajo, permisos y documentos EN ESE ORDEN', user: GESTOR, cache: REC_CACHE, db: REC_DB, dbOpts: { failPaths: { 'active_sessions/g1/tasks': ['once'] } }, fetchPlan: NO_NET,
    docSetup: (doc) => { doc.getElementById('quickDocsList'); doc.querySelector('.tree-container'); }, run: initRun, check(o, eq, ok) {
        eq(ev(o, 'alert').length, 1); ok(ALERT(o, 0).startsWith('No se pudo verificar el progreso remoto de tareas en el servidor.'), 'alerta'); eq(dbWrites(o).length, 0);
        eq(ev(o, 'fetch').map((e) => e[1].split('?')[0]), ['Horario/Horario%202026.xlsx', 'Tareas%20Riesgo/Tareas%20de%20Riesgo.xlsx', 'Teletrabajo/Teletrabajo.xlsx']);
    } });
add({ id: 'I2', name: 'initApp (inicio): Gestor con migración que falla -> alerta con el número de tareas sin sincronizar', user: GESTOR, cache: REC_CACHE, db: REC_DB, dbOpts: { failPaths: { 'active_sessions/g1/tasks/b': ['transaction'] } }, fetchPlan: NO_NET, docSetup: (doc) => { doc.getElementById('quickDocsList'); }, run: initRun, check(o, eq, ok) {
    ok(ALERT(o, 0).includes('el progreso local de 1 tarea(s)'), 'alerta de migración');
} });
add({ id: 'I3', name: 'initApp (inicio): Gestor con recuperación correcta -> sin alertas', user: GESTOR, cache: REC_CACHE, db: REC_DB, fetchPlan: NO_NET, docSetup: (doc) => { doc.getElementById('quickDocsList'); }, run: initRun, check(o, eq) { eq(ev(o, 'alert').length, 0); } });
add({ id: 'I4', name: 'initApp (inicio): Admin no recupera progreso (cero lecturas de tareas remotas)', user: ADMIN, fetchPlan: NO_NET, docSetup: (doc) => { doc.getElementById('quickDocsList'); }, run: initRun, check(o, eq) {
    eq(o.ev.filter((e) => e[0] === 'db' && /active_sessions/.test(e[1])).length, 0);
} });
add({ id: 'I5', name: 'initApp (inicio): un fallo inesperado en la recuperación se registra y el arranque continúa', user: GESTOR, authThrows: true, cache: REC_CACHE, db: REC_DB, fetchPlan: NO_NET, docSetup: (doc) => { doc.getElementById('quickDocsList'); }, run: initRun, check(o, eq, ok) {
    ok(ev(o, 'console.error').some((e) => e[1] === 'No se pudo recuperar el progreso remoto de tareas al iniciar:'), 'registro'); eq(ev(o, 'fetch').length, 3);
} });
add({ id: 'I6', name: 'initApp (inicio): Gestor sin uid no recupera', user: { role: 'Gestor', name: 'Ana' }, fetchPlan: NO_NET, docSetup: (doc) => { doc.getElementById('quickDocsList'); }, run: initRun, check(o, eq) { eq(dbWrites(o).length, 0); } });

const saveDom = (opts) => (doc, setAll) => {
    const o = Object.assign({ status: 'Finalizada', cls: ['completed'], obs: 'Detalle de la gestión' }, opts);
    doc.getElementById('saveTaskBtn').innerHTML = '<i>Guardar</i>';
    const active = doc.querySelector('.btn-status.active'); if (active) { active.textContent = o.status; o.cls.forEach((c) => active.classList.add(c)); } doc.getElementById('taskObservation').value = o.obs;
    const visual = doc.querySelector('.task-item.active .task-status'); visual.classList.add('status-pending'); taskItems(setAll, 3, 1, 0); doc.querySelector('.kpi-card');
};
const saveBase = { user: GESTOR, activeId: '0', selectedTask: TASKS[0], cache: {}, docSetup: saveDom() };
const clickRun = "__initSaveBtn(); const btn = document.getElementById('saveTaskBtn'); btn.fire('click'); await __settle();";
add(Object.assign({ id: 'G1', name: 'guardar progreso: éxito -> respaldo local, update por tarea, botón "Guardado", observación limpia, estado visual y KPI', run: clickRun }, saveBase, { check(o, eq, ok) {
    eq(o.dbData.active_sessions.g1.tasks['0'].status, 'Finalizada'); eq(o.dbData.active_sessions.g1.tasks['0'].name, 'Revisar GGR casino'); eq(ev(o, 'storage.set').length, 1); eq(ev(o, 'alert').length, 0);
    ok(o.domBeforeTimers['#saveTaskBtn'].innerHTML.includes('Guardado Exitosamente'), 'botón'); eq(o.domBeforeTimers['#taskObservation'].value, ''); eq(o.timerDelays, [2000]);
    ok(o.domBeforeTimers['.task-item.active .task-status'].classes.includes('status-completed'), 'estado visual'); eq(o.state.cache['0'].observation, 'Detalle de la gestión');
    const order = o.ev.filter((e) => e[0] === 'storage.set' || (e[0] === 'db' && e[2] === 'update')).map((e) => e[0]); eq(order.slice(0, 2), ['storage.set', 'db']);
} }));
add(Object.assign({ id: 'G2', name: 'guardar progreso: permiso denegado -> aviso de permiso, respaldo local conservado, botón de error', run: clickRun }, saveBase, { dbOpts: { failPaths: { 'active_sessions/g1/tasks/0': ['update'] }, errorCode: 'PERMISSION_DENIED' }, check(o, eq, ok) {
    ok(ALERT(o, 0).startsWith('No tienes permiso para guardar esta tarea'), 'alerta'); eq(o.state.cache['0'].status, 'Finalizada'); eq(o.timerDelays, [2500]); eq(o.domBeforeTimers['#taskObservation'].value, 'Detalle de la gestión');
} }));
add(Object.assign({ id: 'G3', name: 'guardar progreso: error de red -> aviso genérico con respaldo local', run: clickRun }, saveBase, { dbOpts: { failPaths: { 'active_sessions/g1/tasks/0': ['update'] } }, check(o, eq, ok) { ok(ALERT(o, 0).startsWith('No se pudo guardar el progreso en el servidor.'), 'alerta'); } }));
add(Object.assign({ id: 'G4', name: 'guardar progreso: validaciones en orden (sin tarea, sin sesión, identidad distinta, id inválido, selección no resuelta)', run: "__initSaveBtn(); const btn = document.getElementById('saveTaskBtn'); const click = async () => { btn.fire('click'); await __settle(); };\n" +
    "currentActiveTaskId = null; await click(); currentActiveTaskId = '0';\n" +
    "document.getElementById('taskObservation').value = '   '; await click(); document.getElementById('taskObservation').value = 'nota';\n" +
    "currentUser = { uid: 'otro' }; await click(); currentUser = { uid: 'g1', role: 'Gestor' };\n" +
    "currentActiveTaskId = 'a.b'; await click(); currentActiveTaskId = '0';\n" +
    "currentSelectedTask = null; await click(); currentSelectedTask = { id: 99, Tarea: 'otra' }; await click();" }, saveBase, { check(o, eq) {
    eq(ev(o, 'alert').map((e) => e[1].slice(0, 20)), ['Selecciona una tarea', 'OBLIGATORIO: Debes d', 'No se pudo verificar', 'La tarea seleccionad', 'No se pudo confirmar', 'No se pudo confirmar']); eq(dbWrites(o).length, 0);
} }));
add(Object.assign({ id: 'G5', name: 'guardar progreso: sin estado seleccionado y sin sesión de Firebase', run: "__initSaveBtn(); const btn = document.getElementById('saveTaskBtn'); btn.fire('click'); await __settle();" }, saveBase, { docOpts: { missingSelectors: ['.btn-status.active'] }, check(o, eq) { eq(ALERT(o, 0), 'Selecciona un estado antes de guardar el progreso.'); eq(dbWrites(o).length, 0); } }));
add(Object.assign({ id: 'G6', name: 'guardar progreso: sin sesión de Firebase', run: "__initSaveBtn(); document.getElementById('saveTaskBtn').fire('click'); await __settle();" }, saveBase, { authUid: null, check(o, eq) { eq(ALERT(o, 0), 'Tu sesión expiró. Vuelve a iniciar sesión para guardar el progreso.'); eq(dbWrites(o).length, 0); } }));
add(Object.assign({ id: 'G7', name: 'guardar progreso: doble clic -> la segunda pulsación se ignora mientras guarda', run: "__initSaveBtn(); const btn = document.getElementById('saveTaskBtn'); btn.fire('click'); btn.fire('click'); await __settle();" }, saveBase, { check(o, eq) {
    eq(dbWrites(o).filter((e) => e[2] === 'update' && /tasks\/0$/.test(e[1])).length, 1);
} }));
add(Object.assign({ id: 'G8', name: 'guardar progreso: localStorage lleno no impide guardar en Firebase', run: clickRun }, saveBase, { storageThrows: true, check(o, eq) { eq(o.dbData.active_sessions.g1.tasks['0'].status, 'Finalizada'); } }));
add(Object.assign({ id: 'G9', name: 'guardar progreso: No Realizada y En Proceso marcan su clase visual', run: clickRun }, saveBase, { docSetup: saveDom({ status: 'No Realizada', cls: ['not-done'] }), check(o, eq, ok) { ok(o.domBeforeTimers['.task-item.active .task-status'].classes.includes('status-not-done'), 'clase'); } }));

// ------------------------------------------------------------------ diferencias declaradas (no se ocultan)
// Cada una se verifica con evidencia; si la evidencia no se cumple, la paridad sigue fallando.
// W-26 (CF-0.4): los IDs ya se comparan con el contrato de la rama (ver ORIGINAL_W26).
// L2.x: la rama purga de Firebase las tareas huérfanas (CF-0.4 la describe como comportamiento de main).
//        Se exige que TODA diferencia del estado final sea esa purga y que las escrituras no-Firebase sean iguales.
// H5/H6: el original lanza TypeError en normalizeName con entradas que no son texto; la rama no (Decisión 1).
function diferenciaDeclarada(id, obs, orig) {
    const nodb = (ev) => JSON.stringify(ev.filter((e) => e[0] !== 'db'));
    const flat = (o, p = '') => { const out = {}; if (o && typeof o === 'object') { for (const k of Object.keys(o)) Object.assign(out, flat(o[k], (p ? p + '/' : '') + k)); } else out[p] = JSON.stringify(o); return out; };
    if (/^L2\./.test(id)) {
        if (nodb(obs.ev) !== nodb(orig.ev)) return null;
        const fi = flat(obs.dbData); const fo = flat(orig.dbData);
        const soloOriginal = Object.keys(fo).filter((k) => !(k in fi));
        const soloIntegrado = Object.keys(fi).filter((k) => !(k in fo));
        const distintos = Object.keys(fi).filter((k) => (k in fo) && fi[k] !== fo[k]);
        const purgadas = obs.ev.filter((e) => e[0] === 'db' && e[3] && typeof e[3] === 'object').flatMap((e) => Object.keys(e[3]).filter((k) => e[3][k] === null));
        const cubiertas = soloOriginal.every((k) => purgadas.some((p) => k === p || k.startsWith(p + '/')));
        if (soloIntegrado.length || distintos.length || !cubiertas) return null;
        return `purga remota de tareas huérfanas (${purgadas.join(', ')}); resto del estado y escrituras locales iguales (CF-0.4)`;
    }
    if (id === 'H5' || id === 'H6') {
        const err = 'name.normalize is not a function';
        const origErr = JSON.stringify(orig.ev).includes(err);
        const integErr = JSON.stringify(obs.ev).includes(err);
        if (origErr && !integErr) return 'normalizeName tolerante a entradas que no son texto; el original lanzaba TypeError (Decisión 1)';
        return null;
    }
    return null;
}

// ------------------------------------------------------------------ ejecución
(async () => {
    H = await import(pathToFileURL(path.join(__dirname, '..', 'controllers', 'tareas-fake-dom.mjs')).href);
    NL = await import(pathToFileURL(path.join(__dirname, '..', 'helpers', 'legacy-action-migration.mjs')).href);
    ({ assignMasterRowIds } = await import(pathToFileURL(path.join(__dirname, '..', '..', 'domain', 'tasks', 'task-catalog.js')).href));
    console.log('=== TAREAS, PERSISTENCIA Y CICLO DE APLICACIÓN: ' + (INTEGRATED ? 'app.js INTEGRADO (RiskOps.taskController / taskRepository / taskLoadersController)' : 'app.js ORIGINAL') + ' ===');
    console.log(`app.js: ${APP}${ORIGINAL_SRC ? ' | paridad contra el original' : ''} | ${new Date().toISOString()}`);
    let pass = 0; let fail = 0;
    const report = (good, label, detail) => { if (good) { pass += 1; console.log(`  [PASS] ${label}`); } else { fail += 1; console.error(`  [FAIL] ${label}\n         ${detail}`); } };
    const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || 'distinto'}: esperado ${JSON.stringify(b)}, obtenido ${JSON.stringify(a)}`); };
    const ok = (c, m) => { if (!c) throw new Error(m || 'falso'); };

    if (INTEGRATED) {
        const names = ['updateClock', 'persistTaskToActiveSession', 'fetchOwnActiveSessionTasks', 'persistTaskIfNotNewerRemote', 'syncActiveSessionToFirebase', 'updateKPI', 'renderQuickDocs', 'renderTree', 'recoverGestorTaskProgress', 'loadExcelTasks', 'loadSchedule', 'loadTeletrabajo', 'loadPermisos'];
        const w = createWorld(SRC, { user: GESTOR });
        report(!/function toggleTree\(/.test(SRC) && vm.runInContext("typeof toggleTree === 'undefined'", w.ctx), 'integración W-50: app.js ya no declara toggleTree (el encabezado del árbol se expande por data-action)', 'sigue declarada');
        report(names.every((n) => vm.runInContext(`typeof ${n} === 'function'`, w.ctx)) && vm.runInContext("typeof window.selectTask === 'function' && typeof window.openPermisoDetailModal === 'function'", w.ctx),
            'integración: las funciones siguen siendo globales con el mismo nombre (los onclick del HTML generado y de index.html las resuelven)', 'falta alguna');
        report(!/function migrateLocalTasksToActiveSession\(/.test(SRC) && !/function (normalizeTaskName|excelToJSDate|isSameDate)\(/.test(SRC),
            'integración (paso 3.4): app.js ya no declara migrateLocalTasksToActiveSession, normalizeTaskName, excelToJSDate ni isSameDate (zombis sin llamadas)', 'siguen declaradas');
        report(!SRC.includes('active_sessions/${uid}/tasks') && SRC.includes('RiskOps.taskRepository.createTaskRepository'),
            'integración: app.js ya no escribe tareas en Firebase por su cuenta (delega en RiskOps.taskRepository)', 'quedan escrituras originales');
        // El latido es el envoltorio __sessionSync() -> createSessionSyncController (task-controller.js); el payload
        // lo arma buildSessionMetadata (sin "tasks") y el repositorio lo escribe con update(). Sin código heredado de app.js.
        const sessionBlock = SRC.slice(SRC.indexOf('let __labSessionSync = null;'), SRC.indexOf('function syncActiveSessionToFirebase() {'));
        report(sessionBlock.includes('RiskOps.taskController.createSessionSyncController') && sessionBlock.includes('__tareasRepo().syncSessionMetadata(uid, metadata)') && !/\btasks\s*:/.test(sessionBlock),
            'integración: el latido delega en createSessionSyncController y el envoltorio de app.js no escribe "tasks"', 'el envoltorio del latido cambió');
        report((SRC.match(/\[LAB-INTEGRACION\]/g) || []).length >= 20, 'integración: los reemplazos del corte llevan la marca [LAB-INTEGRACION]', 'faltan marcas');
    }

    for (const sc of SCENARIOS) {
        try {
            const obs = await observe(SRC, sc);
            if (sc.check) { try { sc.check(obs, eq, ok); report(true, `${sc.id} ${sc.name}`, ''); } catch (e) { report(false, `${sc.id} ${sc.name}`, e.message); } } else report(true, `${sc.id} ${sc.name}`, '');
            if (ORIGINAL_SRC) {
                const orig = await observe(ORIGINAL_W26, sc);
                try {
                    // D8: se normaliza solo el número del porcentaje de la tarjeta KPI (diferencia intencional, ver cabecera)
                    const d8 = (v) => JSON.stringify(v).replace(/(class=\\"percentage\\"[^>]*>)\d+%/g, '$1__%');
                    // W-50: el encabezado del árbol va por delegación (data-action) en el integrado; el original conserva onclick.
                    // Paso 3.4: el original lleva onclick en línea; se lleva a la forma delegada con el normalizador general.
                    const w50 = (v) => d8(NL.normalizeLegacyActions(v)).replace(/onclick=\\"toggleTree\(this\)\\"/g, 'data-action=\\"toggle-tree\\"');
                    if (d8(obs) !== w50(orig)) {
                        const motivo = diferenciaDeclarada(sc.id, obs, orig);
                        if (!motivo) {
                            const keys = Object.keys(obs).filter((k) => d8(obs[k]) !== w50(orig[k]));
                            throw new Error('difiere en: ' + keys.join(', ') + '\n         integrado: ' + JSON.stringify(obs[keys[0]]).slice(0, 400) + '\n         original:  ' + JSON.stringify(orig[keys[0]]).slice(0, 400));
                        }
                        report(true, `${sc.id} paridad con el original — diferencia INTENCIONAL: ${motivo}`, '');
                        continue;
                    }
                    report(true, `${sc.id} paridad con el original`, '');
                } catch (e) { report(false, `${sc.id} paridad con el original`, e.message); }
            }
        } catch (e) { report(false, `${sc.id} ${sc.name}`, e.stack || e.message); }
    }

    console.log(`\nResultado: ${pass} pasaron, ${fail} fallaron.`);
    process.exit(fail > 0 ? 1 : 0);
})();
