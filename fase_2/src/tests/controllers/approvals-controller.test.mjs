import { createRunner, assert } from '../test-harness.mjs';
import { APPROVALS_LEGACY_OPTIONS, createApprovalsController, createModalsController } from '../../controllers/approvals-controller.js';
import { createApprovalsRepository } from '../../services/firebase/firebase-approvals-repository.js';
import { createOriginalApp } from './approvals-original.mjs';
import { createFakeDatabase, createFakeDom, createRng } from './approvals-fakes.mjs';

/**
 * Prueba DIFERENCIAL del controlador de aprobaciones y de modales: cada escenario se ejecuta contra el código
 * ORIGINAL de app.js (copia literal en `approvals-original.mjs`, 3975-4448) y contra el controlador nuevo, cada uno
 * en su propio "mundo" (DOM, base de datos, alert/confirm y reloj simulados), y se compara TODO lo observable:
 * alertas y confirmaciones en orden, lecturas/escrituras a Firebase, HTML y estilos del DOM (antes y después de los
 * temporizadores de 100 ms), y fallos. Después, pruebas propias de las opciones explícitas (doble clic, política).
 *
 * Desde las decisiones D2/D7/D9a (2026-10-06) el controlador trae encendidas por defecto `escapeRole`,
 * `preventDuplicates`, `enforcePolicy` y `showRejectedUsers`. La comparación diferencial contra app.js pasa por eso
 * EXPLÍCITAMENTE `APPROVALS_LEGACY_OPTIONS` (`world.modern()`); el comportamiento decidido se prueba con
 * `world.decided()` (valores por defecto) en `approvals-decisiones.test.mjs`.
 */
const { test, testAsync, summarizeAsync } = createRunner('approvals-controller.js (diferencial vs app.js 3975-4448 + opciones propias)');

const BASE_MS = Date.parse('2026-10-06T12:00:00.000Z');

function makeWorld({ tree = {}, failOn = [], confirmAnswer = true, authUser, currentUser, storageThrows = false, persistFails = null, dom: domSetup } = {}) {
    const dom = createFakeDom();
    const database = createFakeDatabase(JSON.parse(JSON.stringify(tree)), { failOn });
    const log = [];
    const timers = [];
    const storage = [];
    let tick = 0;

    class FakeDate extends Date {
        constructor(...args) {
            if (args.length) super(...args);
            else super(BASE_MS + (tick++) * 1000);
        }

        static now() {
            return BASE_MS + (tick++) * 1000;
        }
    }

    const persistTaskToActiveSession = (uid, taskId, taskData) => { // app.js 2241-2245, literal
        if (!uid) return Promise.reject(new Error('MISSING_UID'));
        if (!taskId) return Promise.reject(new Error('MISSING_TASK_ID'));
        return database.ref(`active_sessions/${uid}/tasks/${taskId}`).update(taskData);
    };

    const world = {
        dom, database, log, timers, storage, FakeDate,
        taskStateCache: {},
        setupTimers: () => timers,
        flushTimers() {
            const pending = timers.splice(0, timers.length);
            pending.forEach((t) => t.fn());
        },
        env: {
            document: dom.doc,
            database,
            alert: (m) => log.push(['alert', m]),
            confirm: (m) => { log.push(['confirm', m]); return confirmAnswer; },
            setTimeout: (fn, ms) => { timers.push({ fn, ms }); },
            Date: FakeDate,
            firebase: { auth: () => ({ currentUser: authUser }) },
            localStorage: {
                setItem: (k, v) => {
                    if (storageThrows) throw new Error('QuotaExceeded');
                    storage.push([k, v]);
                }
            },
            loadPermisos: () => { log.push(['loadPermisos']); },
            persistTaskToActiveSession: persistFails
                ? (uid, id, rec) => { log.push(['persist', uid, id, rec]); return Promise.reject(persistFails); }
                : (uid, id, rec) => { log.push(['persist', uid, id, rec]); return persistTaskToActiveSession(uid, id, rec); },
            updateKPI: () => { log.push(['updateKPI']); },
            console: { error: (...a) => log.push(['console.error', ...a.map((x) => (x && x.message) || String(x))]) },
            currentUser
        }
    };

    // Elementos comunes de las vistas
    const usersBody = dom.add('pendingUsersTableBody');
    const permsBody = dom.add('pendingPermissionsTableBody');
    [usersBody, permsBody].forEach((tbody, i) => {
        const table = dom.add('table' + i);
        const panel = dom.add('panel' + i);
        dom.nest(tbody, table);
        dom.nest(table, panel);
    });
    dom.add('filterAprobacionesSearch');
    dom.add('filterAprobacionesStatus', { value: 'Todos' });
    if (domSetup) domSetup(dom);

    world.original = () => createOriginalApp({ ...world.env, taskStateCache: world.taskStateCache });
    /** Controlador con las opciones LEGACY explícitas (paridad con app.js) salvo lo que `extra` sobrescriba. */
    world.modern = (extra = {}) => world.build({ ...APPROVALS_LEGACY_OPTIONS, ...extra });
    /** Controlador con los valores POR DEFECTO (decisiones D2/D7/D9a encendidas). */
    world.decided = (extra = {}) => world.build(extra);
    world.build = (extra = {}) => {
        const repository = createApprovalsRepository({ database });
        const approvals = createApprovalsController({
            doc: dom.doc,
            repository,
            alert: world.env.alert,
            confirm: world.env.confirm,
            now: () => new FakeDate(),
            schedule: world.env.setTimeout,
            logger: world.env.console,
            onPermissionUpdated: world.env.loadPermisos,
            ...extra
        });
        const modals = createModalsController({
            doc: dom.doc,
            alert: world.env.alert,
            now: () => FakeDate.now(),
            logger: world.env.console,
            getAuthUser: () => authUser,
            getCurrentUser: () => currentUser,
            persistTask: world.env.persistTaskToActiveSession,
            getTaskCache: () => world.taskStateCache,
            storage: world.env.localStorage,
            updateKPI: world.env.updateKPI
        });

        return { ...approvals, ...modals, state: modals };
    };

    return world;
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

async function observe(world, action) {
    let thrown = null;
    try {
        await action();
    } catch (error) {
        thrown = `${error && error.name}: ${error && error.message}`;
    }
    await settle();
    const before = world.dom.snapshot();
    const timerDelays = world.timers.map((t) => t.ms);
    world.flushTimers();
    await settle();

    return {
        thrown,
        log: world.log,
        calls: world.database.calls,
        domBeforeTimers: before,
        timerDelays,
        domAfterTimers: world.dom.snapshot(),
        storage: world.storage,
        cache: world.taskStateCache
    };
}

/** Ejecuta `action(api, world)` contra el original y contra el controlador nuevo y devuelve ambos resultados. */
async function runBoth(options, action) {
    const a = makeWorld(options);
    const b = makeWorld(options);
    const original = await observe(a, () => action(a.original(), a));
    const modern = await observe(b, () => action(b.modern(options.modernExtra), b));

    return { original, modern };
}

async function expectSame(name, options, action) {
    testAsync(name, async () => {
        const { original, modern } = await runBoth(options, action);

        assert.deepEqual(modern, original);
    });
}

// ---------------------------------------------------------------------------------------------
// Datos de ejemplo
// ---------------------------------------------------------------------------------------------
const U = (id, extra) => ({ [id]: { name: 'Ana Gómez', email: `${id}@virtualsoft.tech`, role: 'Gestor', approved: false, registrationDate: '2026-10-01T10:00:00.000Z', ...extra } });

const USERS_SMALL = {
    users: {
        ...U('u1'), ...U('u2', { approved: true, approvalDate: '2026-10-02T09:30:00.000Z', registrationDate: '2026-09-30T08:00:00.000Z' }),
        ...U('u3', { approved: 'Rechazado', rejectionReason: 'x' }),
        ...U('u4', { email: 'maria.sanchez@virtualsoft.tech', approved: true, name: 'María Sánchez' }),
        ...U('o\'neil<b>', { name: 'O\'Neil <b>"x"</b>', role: 'Gestor' })
    }
};

const USERS_MANY = { users: {} };
for (let i = 1; i <= 9; i += 1) {
    Object.assign(USERS_MANY.users, U('m' + i, { approved: i % 3 === 0, registrationDate: `2026-09-${String(10 + i).padStart(2, '0')}T10:00:00.000Z`, name: i === 4 ? 'Ánge Lópéz' : 'Gestor ' + i }));
}

const NOW_P = BASE_MS;
const P = (id, extra) => ({ [id]: { uid: 'g', gestor: 'Ana Gómez', tipo: 'Cita médica', fecha: '2026-10-10', horaInicio: '08:00', horaFin: '10:00', motivo: 'Control', status: 'Pendiente', id: NOW_P + Number(String(id).replace(/\D/g, '') || 0), ...extra } });

const PERMS_SMALL = {
    permissions: {
        ...P('p1'), ...P('p2', { fecha: '2026-10-12', horaSolicitud: '9:00 a. m.' }),
        ...P('p3', { status: 'Aprobado', rejectionReason: 'Aprobado sin observaciones adicionales' }),
        ...P('p4', { status: 'Rechazado', rejectionReason: 'Sin soporte <script>' }),
        ...P('p5', { motivo: '', id: undefined })
    }
};

const PERMS_MANY = { permissions: {} };
for (let i = 1; i <= 8; i += 1) Object.assign(PERMS_MANY.permissions, P('q' + i, { fecha: `2026-10-${String(i + 10).padStart(2, '0')}` }));

// ---------------------------------------------------------------------------------------------
// renderPendingUsers
// ---------------------------------------------------------------------------------------------
expectSame('renderPendingUsers: sin nodo users muestra "No hay usuarios que coincidan"', { tree: {} }, (api) => api.renderPendingUsers());
expectSame('renderPendingUsers: lista pequeña (pendiente, aprobado, rechazado oculto, administradora oculta, id con comillas)', { tree: USERS_SMALL }, (api) => api.renderPendingUsers());
expectSame('renderPendingUsers: más de 5 sin filtros recorta a 5 y agrega el aviso tras 100 ms', { tree: USERS_MANY }, (api) => api.renderPendingUsers());
expectSame('renderPendingUsers: dos renders seguidos reemplazan el aviso (no lo duplican)', { tree: USERS_MANY }, async (api, world) => {
    await api.renderPendingUsers();
    world.flushTimers();
    await api.renderPendingUsers();
});
expectSame('renderPendingUsers: con búsqueda "gestor 1" (sin recorte, quita el aviso)', {
    tree: USERS_MANY,
    dom: (dom) => { dom.add('filterAprobacionesSearch', { value: ' Gestor 1 ' }); }
}, (api) => api.renderPendingUsers());
expectSame('renderPendingUsers: filtro de estado Pendiente', {
    tree: USERS_MANY,
    dom: (dom) => { dom.add('filterAprobacionesStatus', { value: 'Pendiente' }); }
}, (api) => api.renderPendingUsers());
expectSame('renderPendingUsers: filtro de estado Aprobado + búsqueda con acentos "ange"', {
    tree: USERS_MANY,
    dom: (dom) => { dom.add('filterAprobacionesStatus', { value: 'Aprobado' }); dom.add('filterAprobacionesSearch', { value: 'ANGE' }); }
}, (api) => api.renderPendingUsers());
expectSame('renderPendingUsers: filtros que no coinciden con nadie', {
    tree: USERS_SMALL,
    dom: (dom) => { dom.add('filterAprobacionesSearch', { value: 'zzz' }); }
}, (api) => api.renderPendingUsers());
expectSame('renderPendingUsers: sin controles de filtro en el DOM usa Todos y vacío', {
    tree: USERS_SMALL,
    dom: (dom) => { dom.add('filterAprobacionesSearch'); }
}, (api) => api.renderPendingUsers());
expectSame('renderPendingUsers: falla la lectura de Firebase -> registra el error y muestra la tabla vacía', {
    tree: USERS_SMALL, failOn: [{ op: 'once', path: 'users' }]
}, (api) => api.renderPendingUsers());
expectSame('renderPendingUsers: usuarios sin nombre/rol/fechas y fecha inválida', {
    tree: { users: { a: { approved: false }, b: { approved: true, registrationDate: 'garbage', approvalDate: 'garbage', name: null, email: null, role: 'Admin' } } }
}, (api) => api.renderPendingUsers());

testAsync('renderPendingUsers: sin el <tbody> no hace nada (ni lee Firebase)', async () => {
    const { original, modern } = await runBoth({ tree: USERS_SMALL, dom: (dom) => { dom.add('pendingUsersTableBody'); } }, async (api, world) => {
        world.dom.doc.getElementById('pendingUsersTableBody').remove();
        await api.renderPendingUsers();
    });

    assert.deepEqual(modern, original);
    assert.equal(modern.calls.length, 0);
});

testAsync('renderPendingUsers: aleatorio con semilla (80 conjuntos de usuarios y filtros) idéntico al original', async () => {
    const rng = createRng(20261006);
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const names = ['Ana Gómez', 'Luis Pérez', 'Ángela Ñúñez', 'o\'brien <i>', 'MARÍA', '', null];
    const approvedValues = [true, false, 'Rechazado', undefined, null, 'true'];
    const dates = ['2026-10-01T10:00:00.000Z', '2025-01-15T00:00:00Z', 'garbage', '', undefined, 1760000000000];

    for (let n = 0; n < 80; n += 1) {
        const count = Math.floor(rng() * 12);
        const users = {};
        for (let i = 0; i < count; i += 1) {
            users['k' + i + pick(['', '\'', '&', 'é'])] = {
                name: pick(names), email: pick(['a@virtualsoft.tech', 'maria.sanchez@virtualsoft.tech', 'B@x.com', undefined]),
                role: pick(['Gestor', 'Admin', 'Supervisor']), approved: pick(approvedValues),
                registrationDate: pick(dates), approvalDate: pick(dates)
            };
        }
        const search = pick(['', '', 'ana', 'ÁNGELA', 'zz', ' o\'b ', 'virtualsoft']);
        const status = pick(['Todos', 'Todos', 'Pendiente', 'Aprobado']);
        const options = { tree: { users }, dom: (dom) => { dom.add('filterAprobacionesSearch', { value: search }); dom.add('filterAprobacionesStatus', { value: status }); } };
        const { original, modern } = await runBoth(options, (api) => api.renderPendingUsers());

        assert.deepEqual(modern, original, `caso ${n} (search=${JSON.stringify(search)}, status=${status})`);
    }
});

// ---------------------------------------------------------------------------------------------
// approveUser / confirmRejectUser / cajas de usuario
// ---------------------------------------------------------------------------------------------
expectSame('approveUser: confirma, escribe {approved:true, approvalDate}, avisa y recarga la tabla', { tree: USERS_SMALL }, (api) => api.approveUser('u1'));
expectSame('approveUser: el usuario cancela el confirm -> no escribe nada', { tree: USERS_SMALL, confirmAnswer: false }, (api) => api.approveUser('u1'));
expectSame('approveUser: falla Firebase -> "Error al contactar al servidor" y NO recarga', { tree: USERS_SMALL, failOn: [{ op: 'update' }] }, (api) => api.approveUser('u1'));
expectSame('approveUser: id con caracteres especiales', { tree: USERS_SMALL }, (api) => api.approveUser('o\'neil<b>'));

const rejectDom = (value) => (dom) => { dom.add('user-reason-u1', { value }); };
expectSame('confirmRejectUser: motivo vacío -> "Debes escribir un motivo de rechazo." y no escribe', { tree: USERS_SMALL, dom: rejectDom('') }, (api) => api.confirmRejectUser('u1'));
expectSame('confirmRejectUser: motivo solo espacios/saltos -> mismo aviso', { tree: USERS_SMALL, dom: rejectDom('  \n\t ') }, (api) => api.confirmRejectUser('u1'));
expectSame('confirmRejectUser: motivo válido (se recorta) -> {approved:"Rechazado", rejectionReason}', { tree: USERS_SMALL, dom: rejectDom('  Datos incompletos  ') }, (api) => api.confirmRejectUser('u1'));
expectSame('confirmRejectUser: falla Firebase -> error genérico', { tree: USERS_SMALL, dom: rejectDom('x'), failOn: [{ op: 'update' }] }, (api) => api.confirmRejectUser('u1'));
expectSame('confirmRejectUser: sin el campo de motivo en el DOM lanza el mismo TypeError', { tree: USERS_SMALL }, (api) => api.confirmRejectUser('inexistente'));

const userBoxesDom = (dom) => {
    dom.add('user-action-btns-u1', { style: { display: 'flex' } });
    dom.add('user-reject-box-u1', { style: { display: 'none' } });
    dom.add('user-reason-u1', { value: 'texto previo' });
};
expectSame('showUserRejectBox: oculta los botones y muestra la caja', { dom: userBoxesDom }, (api) => api.showUserRejectBox('u1'));
expectSame('cancelRejectUser: vuelve a mostrar los botones y VACÍA el motivo', { dom: userBoxesDom }, async (api) => { api.showUserRejectBox('u1'); api.cancelRejectUser('u1'); });
expectSame('showUserRejectBox con id inexistente lanza el mismo TypeError', {}, (api) => api.showUserRejectBox('nada'));

// ---------------------------------------------------------------------------------------------
// renderPendingPermissions
// ---------------------------------------------------------------------------------------------
const historyDom = (dom) => { dom.add('historyPermissionsTableBody'); };
expectSame('renderPendingPermissions: sin nodo permissions -> "No hay permisos pendientes de aprobación."', { tree: {} }, (api) => api.renderPendingPermissions());
expectSame('renderPendingPermissions: pendientes + historial (con tabla de historial presente)', { tree: PERMS_SMALL, dom: historyDom }, (api) => api.renderPendingPermissions());
expectSame('renderPendingPermissions: sin tabla de historial (como index.html real) solo pinta pendientes', { tree: PERMS_SMALL }, (api) => api.renderPendingPermissions());
expectSame('renderPendingPermissions: más de 5 pendientes recorta y agrega aviso', { tree: PERMS_MANY, dom: historyDom }, (api) => api.renderPendingPermissions());
expectSame('renderPendingPermissions: dos renders seguidos no duplican el aviso', { tree: PERMS_MANY }, async (api, world) => {
    await api.renderPendingPermissions();
    world.flushTimers();
    await api.renderPendingPermissions();
});
expectSame('renderPendingPermissions: sin pendientes NO pinta el historial (comportamiento de app.js)', {
    tree: { permissions: { ...P('h1', { status: 'Aprobado' }), ...P('h2', { status: 'Rechazado' }) } }, dom: historyDom
}, (api) => api.renderPendingPermissions());
expectSame('renderPendingPermissions: falla la lectura -> registra el error y muestra la bandeja vacía', { tree: PERMS_SMALL, failOn: [{ op: 'once', path: 'permissions' }] }, (api) => api.renderPendingPermissions());

testAsync('renderPendingPermissions: aleatorio con semilla (80 conjuntos) idéntico al original', async () => {
    const rng = createRng(77060110);
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];

    for (let n = 0; n < 80; n += 1) {
        const count = Math.floor(rng() * 14);
        const permissions = {};
        for (let i = 0; i < count; i += 1) {
            permissions['-N' + i + pick(['', '\'', '<'])] = {
                gestor: pick(['Ana Gómez', 'Luis <b>', '', undefined]),
                tipo: pick(['Cita médica', 'Calamidad', 'Licencia', undefined]),
                fecha: pick(['2026-10-10', '2026-09-01', '2027-01-01', 'garbage', undefined]),
                horaInicio: pick(['08:00', undefined]), horaFin: pick(['10:00', undefined]),
                motivo: pick(['Control', '', undefined, 'línea1\nlínea2 <script>']),
                status: pick(['Pendiente', 'Pendiente', 'Aprobado', 'Rechazado', 'Otro']),
                id: pick([BASE_MS, BASE_MS + 5000, undefined, 'abc', 0]),
                horaSolicitud: pick([undefined, undefined, '9:00 a. m.']),
                rejectionReason: pick([undefined, 'Sin soporte', ''])
            };
        }
        const { original, modern } = await runBoth({ tree: { permissions }, dom: n % 2 ? historyDom : undefined }, (api) => api.renderPendingPermissions());

        assert.deepEqual(modern, original, `caso ${n}`);
    }
});

// ---------------------------------------------------------------------------------------------
// Decisión sobre permisos
// ---------------------------------------------------------------------------------------------
const permBoxesDom = (reasonApprove, reasonReject) => (dom) => {
    dom.add('perm-action-btns-p1', { style: { display: 'flex' } });
    dom.add('perm-approve-box-p1', { style: { display: 'none' } });
    dom.add('perm-approve-reason-p1', { value: reasonApprove });
    dom.add('perm-reject-box-p1', { style: { display: 'none' } });
    dom.add('perm-reason-p1', { value: reasonReject });
};

expectSame('confirmApprovePerm: sin observación guarda "Aprobado sin observaciones adicionales"', { tree: PERMS_SMALL, dom: permBoxesDom('', '') }, (api) => api.confirmApprovePerm('p1'));
expectSame('confirmApprovePerm: observación con espacios se recorta', { tree: PERMS_SMALL, dom: permBoxesDom('  Aprobado con gusto  ', '') }, (api) => api.confirmApprovePerm('p1'));
expectSame('confirmApprovePerm: solo espacios = sin observación', { tree: PERMS_SMALL, dom: permBoxesDom('   ', '') }, (api) => api.confirmApprovePerm('p1'));
expectSame('confirmRejectPerm: motivo vacío -> aviso y sin escritura', { tree: PERMS_SMALL, dom: permBoxesDom('', '   ') }, (api) => api.confirmRejectPerm('p1'));
expectSame('confirmRejectPerm: motivo válido -> {status:"Rechazado", notified:false, rejectionReason}', { tree: PERMS_SMALL, dom: permBoxesDom('', ' Sin soporte ') }, (api) => api.confirmRejectPerm('p1'));
expectSame('confirmRejectPerm: falla Firebase -> error genérico y no recarga', { tree: PERMS_SMALL, dom: permBoxesDom('', 'x'), failOn: [{ op: 'update' }] }, (api) => api.confirmRejectPerm('p1'));
expectSame('updatePermissionStatus directo sin motivo: no escribe rejectionReason', { tree: PERMS_SMALL }, (api) => api.updatePermissionStatus('p1', 'Aprobado'));
expectSame('updatePermissionStatus con motivo vacío "" tampoco escribe rejectionReason', { tree: PERMS_SMALL }, (api) => api.updatePermissionStatus('p1', 'Rechazado', ''));
expectSame('updatePermissionStatus: tras el éxito recarga la bandeja y el historial (loadPermisos)', { tree: PERMS_SMALL, dom: historyDom }, (api) => api.updatePermissionStatus('p1', 'Aprobado', 'ok'));
expectSame('showPermApproveBox / cancelApprovePerm', { dom: permBoxesDom('texto', '') }, async (api) => { api.showPermApproveBox('p1'); api.cancelApprovePerm('p1'); });
expectSame('showPermRejectBox / cancelRejectPerm', { dom: permBoxesDom('', 'texto') }, async (api) => { api.showPermRejectBox('p1'); api.cancelRejectPerm('p1'); });
expectSame('showPermApproveBox deja la caja visible (sin cancelar)', { dom: permBoxesDom('', '') }, (api) => api.showPermApproveBox('p1'));
expectSame('showPermRejectBox deja la caja visible (sin cancelar)', { dom: permBoxesDom('', '') }, (api) => api.showPermRejectBox('p1'));

// ---------------------------------------------------------------------------------------------
// Doble clic (comportamiento de app.js: sin guarda) y opción preventDuplicates
// ---------------------------------------------------------------------------------------------
expectSame('doble clic en Aprobar usuario: igual que app.js (dos confirmaciones y dos escrituras)', { tree: USERS_SMALL }, async (api) => {
    await Promise.all([api.approveUser('u1'), api.approveUser('u1')]);
});
expectSame('doble clic en confirmar rechazo de permiso: igual que app.js (dos escrituras y dos alertas)', { tree: PERMS_SMALL, dom: permBoxesDom('', 'x') }, async (api) => {
    await Promise.all([api.confirmRejectPerm('p1'), api.confirmRejectPerm('p1')]);
});

testAsync('preventDuplicates: el doble clic en Aprobar usuario solo escribe una vez; luego se puede volver a aprobar', async () => {
    const world = makeWorld({ tree: USERS_SMALL });
    const api = world.modern({ preventDuplicates: true });

    await Promise.all([api.approveUser('u1'), api.approveUser('u1')]);
    await settle();
    assert.equal(world.database.calls.filter((c) => c.op === 'update').length, 1);
    assert.equal(world.log.filter((e) => e[0] === 'confirm').length, 1);

    await api.approveUser('u1');
    assert.equal(world.database.calls.filter((c) => c.op === 'update').length, 2);
});

testAsync('preventDuplicates: libera la clave aunque falle la escritura (permite reintentar)', async () => {
    const world = makeWorld({ tree: PERMS_SMALL, failOn: [{ op: 'update' }] });
    const api = world.modern({ preventDuplicates: true });

    await api.updatePermissionStatus('p1', 'Aprobado', 'x');
    await api.updatePermissionStatus('p1', 'Aprobado', 'x');

    assert.equal(world.database.calls.filter((c) => c.op === 'update').length, 2);
    assert.deepEqual(world.log.filter((e) => e[0] === 'alert').map((e) => e[1]), ['Error al contactar al servidor', 'Error al contactar al servidor']);
});

testAsync('preventDuplicates: claves distintas (otro permiso) no se bloquean entre sí', async () => {
    const world = makeWorld({ tree: PERMS_SMALL });
    const api = world.modern({ preventDuplicates: true });

    await Promise.all([api.updatePermissionStatus('p1', 'Aprobado', 'x'), api.updatePermissionStatus('p2', 'Aprobado', 'x')]);

    assert.equal(world.database.calls.filter((c) => c.op === 'update').length, 2);
});

// ---------------------------------------------------------------------------------------------
// enforcePolicy (opción propia: rol)
// ---------------------------------------------------------------------------------------------
testAsync('enforcePolicy: un Supervisor no puede aprobar ni rechazar usuarios (aviso, sin tocar Firebase)', async () => {
    const world = makeWorld({ tree: USERS_SMALL, dom: rejectDom('motivo') });
    const api = world.modern({ enforcePolicy: true, getUser: () => ({ role: 'Supervisor', approved: true }) });

    await api.approveUser('u1');
    await api.confirmRejectUser('u1');

    assert.equal(world.database.calls.filter((c) => c.op === 'update').length, 0);
    assert.deepEqual(world.log, [['alert', 'No tienes permiso para realizar esta acción.'], ['alert', 'No tienes permiso para realizar esta acción.']]);
});

testAsync('enforcePolicy: el Supervisor SÍ puede decidir permisos; un Gestor no', async () => {
    const okWorld = makeWorld({ tree: PERMS_SMALL });
    await okWorld.modern({ enforcePolicy: true, getUser: () => ({ role: 'Supervisor' }) }).updatePermissionStatus('p1', 'Aprobado', 'x');
    assert.equal(okWorld.database.calls.filter((c) => c.op === 'update').length, 1);

    const noWorld = makeWorld({ tree: PERMS_SMALL });
    await noWorld.modern({ enforcePolicy: true, getUser: () => ({ role: 'Gestor' }) }).updatePermissionStatus('p1', 'Aprobado', 'x');
    assert.equal(noWorld.database.calls.filter((c) => c.op === 'update').length, 0);
    assert.deepEqual(noWorld.log, [['alert', 'No tienes permiso para realizar esta acción.']]);
});

testAsync('enforcePolicy: sin usuario cargado se deniega; el Admin pasa', async () => {
    const world = makeWorld({ tree: USERS_SMALL });
    await world.modern({ enforcePolicy: true, getUser: () => null }).approveUser('u1');
    assert.equal(world.database.calls.filter((c) => c.op === 'update').length, 0);

    const adminWorld = makeWorld({ tree: USERS_SMALL });
    await adminWorld.modern({ enforcePolicy: true, getUser: () => ({ role: 'Admin', approved: true }) }).approveUser('u1');
    assert.equal(adminWorld.database.calls.filter((c) => c.op === 'update').length, 1);
});

testAsync('escapeRole: escapa el rol en la insignia (apagado = idéntico a app.js)', async () => {
    const tree = { users: { x1: { name: 'Ana', email: 'a@v.tech', role: '<img src=x onerror=alert(1)>', approved: false, registrationDate: '2026-10-01T10:00:00Z' } } };
    const off = makeWorld({ tree });
    await off.modern().renderPendingUsers();
    const on = makeWorld({ tree });
    await on.modern({ escapeRole: true }).renderPendingUsers();

    assert.ok(off.dom.doc.getElementById('pendingUsersTableBody').innerHTML.includes('<img src=x onerror=alert(1)>'));
    assert.ok(!on.dom.doc.getElementById('pendingUsersTableBody').innerHTML.includes('<img'));
    assert.ok(on.dom.doc.getElementById('pendingUsersTableBody').innerHTML.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

testAsync('un fallo al repintar la tabla tras aprobar queda registrado (no es una promesa huérfana)', async () => {
    const world = makeWorld({ tree: USERS_SMALL });
    const api = world.modern();

    Object.defineProperty(world.dom.doc.getElementById('pendingUsersTableBody'), 'innerHTML', { get: () => '', set: () => { throw new Error('DOM roto'); } });
    await api.approveUser('u1');
    await settle();

    assert.deepEqual(world.log.filter((e) => e[0] === 'alert').map((e) => e[1]), ['Usuario aprobado exitosamente. Ahora puede iniciar sesión.']);
    assert.ok(world.log.some((e) => e[0] === 'console.error' && e[1] === 'DOM roto'));
});

// ---------------------------------------------------------------------------------------------
// Modales: excepción
// ---------------------------------------------------------------------------------------------
const exceptionDom = ({ value = '', text = 'Seleccione una razón', details = '', selectedIndex = 0 } = {}) => (dom) => {
    dom.add('exceptionReason', { value, selectedIndex, options: [{ text: 'Seleccione una razón' }, { text: 'Sistema Caído' }, { text: 'Otro' }, { text }] });
    dom.add('exceptionDetails', { value: details });
    dom.add('taskObservation', { value: '' });
    dom.add('exceptionModal');
    dom.add('btnPendiente', { isStatusButton: true, classes: new Set(['active']) });
    dom.add('btnNoRealizada', { isStatusButton: true, isNotDone: true });
};

expectSame('confirmException: sin razón -> "Por favor seleccione una razón principal."', { dom: exceptionDom({ value: '' }) }, (api) => api.confirmException());
expectSame('confirmException: razón sin detalle -> "Por favor detalle el problema obligatoriamente."', { dom: exceptionDom({ value: 'Sistema Caído', selectedIndex: 1, details: '   ' }) }, (api) => api.confirmException());
expectSame('confirmException: razón y detalle -> vuelca "Excepción: <razón> - <detalle>" y cierra el modal', {
    dom: (dom) => { exceptionDom({ value: 'Sistema Caído', selectedIndex: 1, details: '  VPN caída  ' })(dom); dom.add('exceptionModal', { classes: new Set(['active']) }); }
}, (api) => api.confirmException());
expectSame('confirmException: sin opción seleccionada (selectedIndex -1) lanza el mismo TypeError', { dom: exceptionDom({ value: '', selectedIndex: -1 }) }, (api) => api.confirmException());
expectSame('openExceptionModal: marca "No Realizada", limpia razón/detalle y abre el modal', {
    dom: (dom) => { exceptionDom({ value: 'Otro', selectedIndex: 2, details: 'viejo' })(dom); }
}, (api) => api.openExceptionModal());
expectSame('openExceptionModal: sin el botón .btn-status.not-done lanza el mismo TypeError', {}, (api) => api.openExceptionModal());
expectSame('closeModal: quita "active"; un id inexistente no hace nada', {
    dom: (dom) => { dom.add('exceptionModal', { classes: new Set(['active']) }); }
}, async (api) => { api.closeModal('exceptionModal'); api.closeModal('noExiste'); });

// ---------------------------------------------------------------------------------------------
// Modales: tarea extra
// ---------------------------------------------------------------------------------------------
const extraDom = ({ name = 'Revisión especial', status = 'En Proceso', obs = 'Detalle de la gestión', withBtn = true } = {}) => (dom) => {
    dom.add('extraTaskModal', { classes: new Set(['active']) });
    dom.add('extraTaskName', { value: name });
    dom.add('extraTaskStatus', { value: status });
    dom.add('extraTaskObs', { value: obs });
    if (withBtn) dom.add('saveExtraTaskBtn', { innerHTML: '<i>Guardar</i>' });
};
const OK_USER = { uid: 'g1', name: 'Ana' };

expectSame('openExtraTaskModal: limpia el formulario (estado "Finalizada") y abre el modal', { dom: extraDom({ name: 'x', obs: 'y' }) }, (api) => api.openExtraTaskModal());
expectSame('openExtraTaskModal: sin el modal en el DOM no toca nada', {}, (api) => api.openExtraTaskModal());
expectSame('saveExtraTask: nombre vacío -> OBLIGATORIO nombre', { dom: extraDom({ name: '  ' }), authUser: OK_USER, currentUser: OK_USER }, (api) => api.saveExtraTask());
expectSame('saveExtraTask: observación vacía -> OBLIGATORIO notas técnicas', { dom: extraDom({ obs: '' }), authUser: OK_USER, currentUser: OK_USER }, (api) => api.saveExtraTask());
expectSame('saveExtraTask: nombre y observación vacíos -> el aviso del nombre (se valida primero)', { dom: extraDom({ name: '', obs: '' }), authUser: OK_USER, currentUser: OK_USER }, (api) => api.saveExtraTask());
expectSame('saveExtraTask: sin sesión de Firebase -> "Tu sesión expiró..."', { dom: extraDom(), authUser: null, currentUser: OK_USER }, (api) => api.saveExtraTask());
expectSame('saveExtraTask: sin sesión (undefined) -> "Tu sesión expiró..."', { dom: extraDom(), authUser: undefined, currentUser: OK_USER }, (api) => api.saveExtraTask());
expectSame('saveExtraTask: usuario local distinto -> "No se pudo verificar tu identidad..."', { dom: extraDom(), authUser: OK_USER, currentUser: { uid: 'otro' } }, (api) => api.saveExtraTask());
expectSame('saveExtraTask: sin usuario local -> "No se pudo verificar tu identidad..."', { dom: extraDom(), authUser: OK_USER, currentUser: null }, (api) => api.saveExtraTask());
expectSame('saveExtraTask: éxito guarda en active_sessions/<uid>/tasks/extra_<ms>, respalda en localStorage y cierra el modal', { dom: extraDom(), authUser: OK_USER, currentUser: OK_USER }, (api) => api.saveExtraTask());
expectSame('saveExtraTask: éxito sin botón en el DOM', { dom: extraDom({ withBtn: false }), authUser: OK_USER, currentUser: OK_USER }, (api) => api.saveExtraTask());
expectSame('saveExtraTask: nombre y observación se recortan; el estado viaja tal cual', { dom: extraDom({ name: '  Tarea  ', obs: '  Nota  ', status: 'No Realizada' }), authUser: OK_USER, currentUser: OK_USER }, (api) => api.saveExtraTask());
expectSame('saveExtraTask: PERMISSION_DENIED -> "No tienes permiso..." y el botón se restaura', {
    dom: extraDom(), authUser: OK_USER, currentUser: OK_USER, failOn: [{ op: 'update' }]
}, (api) => api.saveExtraTask());
expectSame('saveExtraTask: error genérico (sin código) -> "No se pudo guardar... respaldado localmente"', {
    dom: extraDom(), authUser: OK_USER, currentUser: OK_USER, persistFails: new Error('network down')
}, (api) => api.saveExtraTask());
expectSame('saveExtraTask: error con mensaje "permission denied" (sin código) también se trata como permiso', {
    dom: extraDom(), authUser: OK_USER, currentUser: OK_USER, persistFails: new Error('Permission denied')
}, (api) => api.saveExtraTask());
expectSame('saveExtraTask: localStorage lleno no impide guardar (respaldo best-effort)', { dom: extraDom(), authUser: OK_USER, currentUser: OK_USER, storageThrows: true }, (api) => api.saveExtraTask());
expectSame('saveExtraTask: tras un fallo, el reintento REUTILIZA la misma llave extra_<ms>', {
    dom: extraDom(), authUser: OK_USER, currentUser: OK_USER, failOn: [{ op: 'update' }]
}, async (api, world) => {
    await api.saveExtraTask();
    world.database.calls.length = 0;
    await api.saveExtraTask();
});
expectSame('saveExtraTask: tras un fallo, reabrir el modal arranca una tarea NUEVA (otra llave)', {
    dom: extraDom(), authUser: OK_USER, currentUser: OK_USER, failOn: [{ op: 'update' }]
}, async (api) => {
    await api.saveExtraTask();
    await api.openExtraTaskModal();
    await api.saveExtraTask();
});
expectSame('saveExtraTask: doble clic -> la segunda llamada se ignora mientras guarda', { dom: extraDom(), authUser: OK_USER, currentUser: OK_USER }, async (api) => {
    await Promise.all([api.saveExtraTask(), api.saveExtraTask()]);
});

testAsync('saveExtraTask: la llave empieza con "extra_" y el nombre con "[EXTRA] "', async () => {
    const world = makeWorld({ dom: extraDom(), authUser: OK_USER, currentUser: OK_USER });
    await world.modern().saveExtraTask();
    const update = world.database.calls.find((c) => c.op === 'update');

    assert.match(update.path, /^active_sessions\/g1\/tasks\/extra_\d+$/);
    assert.equal(update.data.name, '[EXTRA] Revisión especial');
    assert.deepEqual(Object.keys(update.data), ['name', 'status', 'observation', 'updatedAt']);
});

testAsync('saveExtraTask: durante el guardado el botón dice "Guardando..." y queda deshabilitado; al terminar se restaura', async () => {
    const world = makeWorld({ dom: extraDom(), authUser: OK_USER, currentUser: OK_USER });
    const api = world.modern();
    const btn = world.dom.doc.getElementById('saveExtraTaskBtn');
    const pending = api.saveExtraTask();

    assert.equal(btn.innerHTML, "<i class='bx bx-loader-alt bx-spin'></i> Guardando...");
    assert.equal(btn.disabled, true);
    assert.equal(api.isSaving(), true);

    await pending;

    assert.equal(btn.innerHTML, '<i>Guardar</i>');
    assert.equal(btn.disabled, false);
    assert.equal(api.isSaving(), false);
});

summarizeAsync().then(() => {});
