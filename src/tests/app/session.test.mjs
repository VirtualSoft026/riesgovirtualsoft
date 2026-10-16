/**
 * Paso 3.0 (W-02, W-55 a, W-53 c): sesión y rol desde `users/{uid}` (DE-1 = b), validación del perfil en la
 * frontera de datos y arranque de bootstrap.js con autenticación simulada.
 *
 * Criterios: CF-4.1 (rol del servidor; rechazado durante la sesión es expulsado), CF-4.3 (el caché se
 * revalida y prevalece el servidor), CF-4.4 (cerrar sesión borra las claves de sesión salvo el tema),
 * CF-3.3 (perfil fuera de catálogo no entra al dominio) y CF-0.1 (bootstrap arranca).
 */
import { createRunner, assert } from '../test-harness.mjs';
import { validateUserProfile, mergeSessionProfile, PROFILE_REJECTION } from '../../domain/auth/user-profile.js';
import { createSession, SESSION_END, SESSION_STORAGE_KEYS, isSameLocalDay } from '../../app/session.js';
import { initApp } from '../../app/bootstrap.js';
import { buildMobileAccessPolicy, MOBILE_ACCESS } from '../../domain/auth/auth-service.js';
import { STORAGE_KEYS } from '../../utils/constants.js';

const { test, testAsync, summarizeAsync } = createRunner('sesión y rol desde users/{uid} + bootstrap (paso 3.0)');

// ---------------------------------------------------------------------------------------------------------
// Entorno simulado
// ---------------------------------------------------------------------------------------------------------

function createFakeAuth() {
    const listeners = new Set();

    return {
        signOutCalls: 0,
        onAuthStateChanged(cb) {
            listeners.add(cb);
            return () => listeners.delete(cb);
        },
        async signOut() {
            this.signOutCalls += 1;
        },
        emit(user) {
            [...listeners].forEach((cb) => cb(user));
        },
        listenerCount: () => listeners.size
    };
}

function createFakeDatabase() {
    const valueListeners = new Map(); // path -> Set<{cb, err}>
    const ops = [];

    return {
        ops,
        ref(path) {
            return {
                on(event, cb, err) {
                    ops.push(`on:${path}`);
                    if (!valueListeners.has(path)) valueListeners.set(path, new Set());
                    valueListeners.get(path).add({ cb, err });
                    return cb;
                },
                off(event, cb) {
                    ops.push(`off:${path}`);
                    const set = valueListeners.get(path);
                    if (set) [...set].forEach((entry) => { if (entry.cb === cb) set.delete(entry); });
                },
                remove() {
                    ops.push(`remove:${path}`);
                    return Promise.resolve();
                },
                onDisconnect() {
                    return { update(value) { ops.push(`onDisconnect:${path}:${JSON.stringify(value)}`); return Promise.resolve(); } };
                }
            };
        },
        emitValue(path, value) {
            [...(valueListeners.get(path) || [])].forEach(({ cb }) => cb({ val: () => value }));
        },
        emitError(path, error) {
            [...(valueListeners.get(path) || [])].forEach(({ err }) => err && err(error));
        },
        listenerCount: (path) => (valueListeners.get(path) || new Set()).size
    };
}

function createFakeStorage(initial = {}) {
    const map = new Map(Object.entries(initial));

    return {
        map,
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => map.set(key, String(value)),
        removeItem: (key) => map.delete(key)
    };
}

const silent = { info() {}, warn() {}, error() {} };
const TODAY = new Date('2026-10-16T10:00:00');
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function cachedUser(extra = {}) {
    return JSON.stringify({
        uid: 'u1', name: 'Gestor Uno', role: 'Gestor', shift: '8am - 4pm',
        loginTime: '2026-10-16T08:01:00', loginLogId: 'log-1', status: 'Activo', ...extra
    });
}

function fullStorage(extra = {}) {
    return createFakeStorage({
        [STORAGE_KEYS.CURRENT_USER]: cachedUser(extra),
        [STORAGE_KEYS.CACHE]: '{}',
        [STORAGE_KEYS.BREAK_STATE]: '{}',
        [STORAGE_KEYS.TIMELINE]: '[]',
        [STORAGE_KEYS.USERS_DATA]: '{}',
        [STORAGE_KEYS.THEME]: 'dark'
    });
}

function setup({ storage = fullStorage() } = {}) {
    const auth = createFakeAuth();
    const database = createFakeDatabase();
    const events = { ready: [], changes: [], split: [], ends: [], login: 0 };
    const session = createSession({
        auth, database, storage, logger: silent, now: () => TODAY, serverTimestamp: 'TS',
        goToLogin: () => { events.login += 1; },
        onReady: (p) => events.ready.push(p),
        onProfileChange: (p, prev) => events.changes.push({ p, prev }),
        onSplitShiftChange: (flag) => events.split.push(flag),
        onEnd: (reason, detail) => events.ends.push({ reason, detail })
    });

    return { auth, database, storage, session, events };
}

const SERVER_GESTOR = { name: 'Gestor Uno', email: 'g1@virtualsoft.tech', role: 'Gestor', approved: true, shift: '8am - 4pm', status: 'Activo', hasSplitShift: false };

// ---------------------------------------------------------------------------------------------------------
// validateUserProfile / mergeSessionProfile (frontera de datos)
// ---------------------------------------------------------------------------------------------------------

test('validateUserProfile: acepta solo approved === true y roles del catálogo', () => {
    assert.equal(validateUserProfile('u', null).reason, PROFILE_REJECTION.MISSING);
    assert.equal(validateUserProfile('u', 'texto').reason, PROFILE_REJECTION.INVALID);
    assert.equal(validateUserProfile('u', []).reason, PROFILE_REJECTION.INVALID);
    assert.deepEqual(validateUserProfile('u', { approved: 'Rechazado', rejectionReason: ' duplicado ' }),
        { ok: false, reason: PROFILE_REJECTION.REJECTED, rejectionReason: 'duplicado' });
    assert.equal(validateUserProfile('u', { approved: 'Rechazado' }).reason, PROFILE_REJECTION.REJECTED);
    for (const approved of [false, 'true', 'Aprobado', 1, undefined]) {
        assert.equal(validateUserProfile('u', { approved, role: 'Gestor' }).reason, PROFILE_REJECTION.PENDING, String(approved));
    }
    for (const role of ['admin', 'Superadmin', '', undefined, 3]) {
        assert.equal(validateUserProfile('u', { approved: true, role }).reason, PROFILE_REJECTION.INVALID_ROLE, String(role));
    }
    const ok = validateUserProfile('u9', { ...SERVER_GESTOR, role: ' Supervisor ', hasSplitShift: 'true', extra: 'x' });
    assert.equal(ok.ok, true);
    assert.deepEqual(ok.profile, {
        uid: 'u9', role: 'Supervisor', name: 'Gestor Uno', email: 'g1@virtualsoft.tech',
        shift: '8am - 4pm', status: 'Activo', hasSplitShift: false
    });
});

test('mergeSessionProfile: identidad y permisos del servidor; del caché solo datos de la sesión en curso', () => {
    const merged = mergeSessionProfile(
        { uid: 'u1', role: 'Admin', name: 'Viejo', loginTime: 'T', loginLogId: 'L', status: 'Inactivo' },
        { uid: 'u1', role: 'Gestor', name: 'Nuevo', email: 'e', shift: 's', status: 'Activo', hasSplitShift: true }
    );
    assert.equal(merged.role, 'Gestor', 'un rol alterado en localStorage no sobrevive');
    assert.equal(merged.name, 'Nuevo');
    assert.equal(merged.loginTime, 'T');
    assert.equal(merged.loginLogId, 'L');
    assert.equal(merged.status, 'Inactivo', 'el estado de presencia local se conserva');
    assert.equal(merged.hasSplitShift, true);
});

test('isSameLocalDay y política móvil', () => {
    assert.equal(isSameLocalDay(new Date('2026-10-16T00:00:01'), TODAY), true);
    assert.equal(isSameLocalDay(new Date('2026-10-15T23:59:59'), TODAY), false);
    assert.equal(isSameLocalDay(new Date('no es fecha'), TODAY), false);
    assert.equal(buildMobileAccessPolicy({ role: 'Gestor' }, 1280), MOBILE_ACCESS.NONE);
    assert.equal(buildMobileAccessPolicy({ role: 'Gestor' }, 768), MOBILE_ACCESS.BLOCK);
    assert.equal(buildMobileAccessPolicy({ role: 'Supervisor' }, 400), MOBILE_ACCESS.SCROLL);
    assert.equal(buildMobileAccessPolicy({ role: 'Admin' }, 400), MOBILE_ACCESS.SCROLL);
    assert.equal(buildMobileAccessPolicy(null, 400), MOBILE_ACCESS.NONE);
});

// ---------------------------------------------------------------------------------------------------------
// createSession
// ---------------------------------------------------------------------------------------------------------

testAsync('sin sesión local: va a login.html sin escuchar auth (app.js 119-121)', async () => {
    const env = setup({ storage: createFakeStorage({ [STORAGE_KEYS.THEME]: 'dark' }) });
    assert.equal(env.session.start(), false);
    await flush();
    assert.equal(env.events.login, 1);
    assert.equal(env.auth.listenerCount(), 0);
    assert.deepEqual(env.events.ends.map((e) => e.reason), [SESSION_END.NO_LOCAL_SESSION]);
    assert.equal(env.storage.getItem(STORAGE_KEYS.THEME), 'dark', 'el tema se conserva');
});

testAsync('caché corrupto se trata como sin sesión', async () => {
    const env = setup({ storage: createFakeStorage({ [STORAGE_KEYS.CURRENT_USER]: '{no json' }) });
    assert.equal(env.session.start(), false);
    await flush();
    assert.equal(env.events.login, 1);
});

testAsync('Gestor con sesión de otro día: limpia todas las claves de sesión y vuelve al login (app.js 672-687)', async () => {
    const env = setup({ storage: fullStorage({ loginTime: '2026-10-15T08:00:00' }) });
    assert.equal(env.session.start(), false);
    await flush();
    assert.equal(env.events.login, 1);
    SESSION_STORAGE_KEYS.forEach((key) => assert.equal(env.storage.getItem(key), null, key));
    assert.equal(env.storage.getItem(STORAGE_KEYS.THEME), 'dark');
});

testAsync('Supervisor con loginTime de otro día NO se expulsa por fecha (solo aplica a Gestor)', async () => {
    const env = setup({ storage: fullStorage({ role: 'Supervisor', loginTime: '2026-10-01T08:00:00' }) });
    assert.equal(env.session.start(), true);
    await flush();
    assert.equal(env.events.login, 0);
});

testAsync('sin usuario de Firebase Auth: cierra la sesión aunque exista caché local', async () => {
    const env = setup();
    env.session.start();
    env.auth.emit(null);
    await flush();
    assert.equal(env.events.ends[0].reason, SESSION_END.NOT_AUTHENTICATED);
    assert.equal(env.events.login, 1);
    assert.equal(env.storage.getItem(STORAGE_KEYS.CURRENT_USER), null);
});

testAsync('uid de Auth distinto al del caché: cierra la sesión', async () => {
    const env = setup();
    env.session.start();
    env.auth.emit({ uid: 'otro' });
    await flush();
    assert.equal(env.events.ends[0].reason, SESSION_END.UID_MISMATCH);
    assert.equal(env.auth.signOutCalls, 1);
});

testAsync('perfil aprobado: onReady con el rol del SERVIDOR aunque localStorage diga Admin (CF-4.1, CF-4.3)', async () => {
    const env = setup({ storage: fullStorage({ role: 'Admin' }) });
    env.session.start();
    env.auth.emit({ uid: 'u1' });
    assert.equal(env.database.listenerCount('users/u1'), 1);
    env.database.emitValue('users/u1', SERVER_GESTOR);
    assert.equal(env.events.ready.length, 1);
    assert.equal(env.events.ready[0].role, 'Gestor');
    assert.equal(env.session.getUser().role, 'Gestor');
    assert.equal(JSON.parse(env.storage.getItem(STORAGE_KEYS.CURRENT_USER)).role, 'Gestor', 'el caché se reescribe con el servidor');
    assert.equal(env.events.login, 0);
    assert.ok(env.database.ops.includes('remove:login_logs/log-1/logoutTime'));
    assert.ok(env.database.ops.includes('onDisconnect:login_logs/log-1:{"logoutTime":"TS"}'));
});

testAsync('rechazado DURANTE la sesión: se expulsa, signOut y se borran las claves (CF-4.1, CF-4.4)', async () => {
    const env = setup();
    env.session.start();
    env.auth.emit({ uid: 'u1' });
    env.database.emitValue('users/u1', SERVER_GESTOR);
    env.database.emitValue('users/u1', { ...SERVER_GESTOR, approved: 'Rechazado', rejectionReason: 'Cuenta duplicada' });
    await flush();
    assert.deepEqual(env.events.ends, [{ reason: PROFILE_REJECTION.REJECTED, detail: 'Cuenta duplicada' }]);
    assert.equal(env.auth.signOutCalls, 1);
    assert.equal(env.events.login, 1);
    assert.equal(env.session.getUser(), null);
    assert.equal(env.database.listenerCount('users/u1'), 0, 'el listener del perfil se quita');
    SESSION_STORAGE_KEYS.forEach((key) => assert.equal(env.storage.getItem(key), null, key));
    assert.equal(env.storage.getItem(STORAGE_KEYS.THEME), 'dark');
});

testAsync('perfil borrado, pendiente o con rol inválido: no arranca la app', async () => {
    for (const [value, reason] of [
        [null, PROFILE_REJECTION.MISSING],
        [{ ...SERVER_GESTOR, approved: false }, PROFILE_REJECTION.PENDING],
        [{ ...SERVER_GESTOR, role: 'Root' }, PROFILE_REJECTION.INVALID_ROLE]
    ]) {
        const env = setup();
        env.session.start();
        env.auth.emit({ uid: 'u1' });
        env.database.emitValue('users/u1', value);
        await flush();
        assert.equal(env.events.ready.length, 0);
        assert.equal(env.events.ends[0].reason, reason);
        assert.equal(env.events.login, 1);
    }
});

testAsync('error de lectura del perfil: cierra la sesión (sin rol verificable no hay acceso)', async () => {
    const env = setup();
    env.session.start();
    env.auth.emit({ uid: 'u1' });
    env.database.emitError('users/u1', new Error('PERMISSION_DENIED'));
    await flush();
    assert.equal(env.events.ends[0].reason, SESSION_END.PROFILE_READ_ERROR);
});

testAsync('cambio de rol en el servidor: onProfileChange; hasSplitShift solo para Gestor, con el valor inicial', async () => {
    const env = setup();
    env.session.start();
    env.auth.emit({ uid: 'u1' });
    env.database.emitValue('users/u1', SERVER_GESTOR);
    env.database.emitValue('users/u1', { ...SERVER_GESTOR, hasSplitShift: true });
    env.database.emitValue('users/u1', { ...SERVER_GESTOR, hasSplitShift: true });
    env.database.emitValue('users/u1', { ...SERVER_GESTOR, role: 'Supervisor', hasSplitShift: false });
    assert.deepEqual(env.events.split, [false, true], 'valor inicial y cada cambio, sin repetir');
    assert.equal(env.events.changes.length, 1);
    assert.equal(env.events.changes[0].prev.role, 'Gestor');
    assert.equal(env.events.changes[0].p.role, 'Supervisor');
});

testAsync('logout y shutdown: quitan los listeners; el cierre ocurre una sola vez', async () => {
    const env = setup();
    env.session.start();
    env.auth.emit({ uid: 'u1' });
    env.database.emitValue('users/u1', SERVER_GESTOR);
    env.session.logout();
    env.session.logout();
    await flush();
    assert.equal(env.events.ends.length, 1);
    assert.equal(env.events.ends[0].reason, SESSION_END.LOGOUT);
    assert.equal(env.auth.listenerCount(), 0);
    assert.equal(env.events.login, 1);

    const other = setup();
    other.session.start();
    other.auth.emit({ uid: 'u1' });
    other.session.shutdown();
    assert.equal(other.auth.listenerCount(), 0);
    assert.equal(other.database.listenerCount('users/u1'), 0);
    assert.equal(other.events.login, 0, 'shutdown no cierra la sesión del usuario');
});

// ---------------------------------------------------------------------------------------------------------
// bootstrap.initApp con DOM mínimo
// ---------------------------------------------------------------------------------------------------------

function createFakeDocument(ids) {
    const elements = Object.fromEntries(ids.map((id) => [id, { id, style: {}, children: [], appendChild(child) { this.children.push(child); }, closest: () => null }]));
    const sidebar = { children: [], appendChild(child) { this.children.push(child); } };
    const appContainer = { style: {} };

    return {
        elements,
        sidebar,
        appContainer,
        documentElement: { style: {} },
        body: { style: {} },
        getElementById: (id) => elements[id] || null,
        querySelector: (sel) => (sel === '.sidebar-nav' ? sidebar : sel === '.app-container' ? appContainer : null)
    };
}

testAsync('initApp: aplica navegación y bloqueo móvil con el rol del servidor; shutdown limpia', async () => {
    const auth = createFakeAuth();
    const database = createFakeDatabase();
    const storage = fullStorage({ role: 'Admin' });
    const doc = createFakeDocument(['toggleLunchBtn', 'toggleBreakfastBtn', 'mobileBlocker']);
    const assigned = [];
    const app = initApp({
        db: database, auth, document: doc, storage, logger: silent, now: () => TODAY,
        window: { innerWidth: 400, location: { assign: (url) => assigned.push(url) } }
    });

    auth.emit({ uid: 'u1' });
    database.emitValue('users/u1', SERVER_GESTOR);

    assert.equal(app.session.getUser().role, 'Gestor');
    assert.equal(doc.elements.toggleLunchBtn.style.display, 'flex', 'botones de pausa visibles para el Gestor');
    assert.equal(doc.elements.mobileBlocker.style.display, 'flex', 'Gestor en móvil: bloqueado');
    assert.equal(doc.appContainer.style.display, 'none');
    assert.deepEqual(assigned, []);

    app.shutdown();
    assert.equal(auth.listenerCount(), 0);
    assert.equal(database.listenerCount('users/u1'), 0);
});

testAsync('initApp: sin sesión local redirige a login.html', async () => {
    const assigned = [];
    initApp({
        db: createFakeDatabase(), auth: createFakeAuth(), document: createFakeDocument([]), storage: createFakeStorage(),
        logger: silent, window: { innerWidth: 1280, location: { assign: (url) => assigned.push(url) } }
    });
    await flush();
    assert.deepEqual(assigned, ['login.html']);
});

await summarizeAsync();
