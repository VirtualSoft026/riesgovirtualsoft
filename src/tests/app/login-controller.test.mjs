/**
 * Pruebas del controlador de login (paso 3.4, W-29 y DE-3 = a) sobre un DOM, Firebase y almacenamiento falsos.
 *
 * Cubren los caminos de login.js: rechazo (con el defecto de escapeHTML corregido), pendiente, turno vencido,
 * acceso permitido, errores de Firebase, registro, recuperación de contraseña, cambio de panel por delegación y
 * bloqueo de navegadores distintos de Chrome.
 *
 * Se ejecuta con: node src/tests/app/login-controller.test.mjs
 */
import { createRunner, assert } from '../test-harness.mjs';
import {
    createLoginController,
    isChromeUserAgent,
    LOGIN_MESSAGES,
    LOGIN_PANELS,
    SWITCH_PANEL_ACTION
} from '../../app/login-controller.js';
import { SESSION_STORAGE_KEYS } from '../../app/session.js';
import { REGISTER_MESSAGES } from '../../domain/auth/auth-service.js';
import { STORAGE_KEYS } from '../../utils/constants.js';

const { testAsync, summarizeAsync } = createRunner('controlador de login (paso 3.4)');

const CHROME_UA = 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36';
const EDGE_UA = 'Mozilla/5.0 Chrome/120.0.0.0 Edg/120.0.0.0';

/** Elemento falso mínimo: estilo, texto, hijos, listeners y atributos. */
function fakeEl(tag = 'div', extra = {}) {
    const listeners = {};
    const attrs = {};
    const classes = new Set();
    return {
        tagName: tag, id: '', style: { display: '' }, textContent: '', innerHTML: '', disabled: false, value: '', type: 'text',
        children: [], listeners, attrs, previousElementSibling: null, buttons: {},
        classList: {
            add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c)
        },
        addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
        appendChild(child) { this.children.push(child); return child; },
        reset() { this.resetCount = (this.resetCount || 0) + 1; },
        querySelector(sel) { return this.buttons[sel] || null; },
        getAttribute(name) { return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null; },
        setAttribute(name, value) { attrs[name] = String(value); },
        ...extra
    };
}

/** Documento falso con las piezas de login.html que usa el controlador. */
function makeDoc() {
    const byId = {};
    const add = (el) => { byId[el.id] = el; return el; };

    const panels = [LOGIN_PANELS.LOGIN, LOGIN_PANELS.REGISTER, LOGIN_PANELS.FORGOT].map((id) => add(fakeEl('div', { id, className: 'auth-panel' })));
    const loginForm = add(fakeEl('form', { id: 'loginForm', className: 'login-form' }));
    const registerForm = add(fakeEl('form', { id: 'registerForm', className: 'login-form' }));
    const forgotForm = add(fakeEl('form', { id: 'forgotForm', className: 'login-form' }));
    const forms = [loginForm, registerForm, forgotForm];
    loginForm.buttons['button[type="submit"]'] = fakeEl('button');
    registerForm.buttons['button[type="submit"]'] = fakeEl('button');
    forgotForm.buttons['button[type="submit"]'] = fakeEl('button');

    ['loginEmail', 'loginPassword', 'regName', 'regEmail', 'regPassword', 'regConfirmPassword', 'forgotEmail']
        .forEach((id) => add(fakeEl('input', { id })));
    add(fakeEl('select', { id: 'regRole', value: 'Gestor' }));
    ['loginError', 'registerError', 'registerSuccess', 'forgotMessage'].forEach((id) => add(fakeEl('p', { id, className: 'login-error-msg' })));
    add(fakeEl('div', { id: 'browserBlocker' }));
    add(fakeEl('div', { id: 'mobileBlocker' }));
    const container = fakeEl('div', { className: 'login-container' });
    const msgs = ['loginError', 'registerError', 'registerSuccess', 'forgotMessage'].map((id) => byId[id]);
    const toggles = [];

    const docListeners = {};
    const doc = {
        body: { appendChild(c) { this.kids = (this.kids || []).concat([c]); return c; }, removeChild(c) { this.kids = (this.kids || []).filter((k) => k !== c); return c; } },
        getElementById: (id) => byId[id] || null,
        querySelectorAll(sel) {
            if (sel === '.auth-panel') return panels;
            if (sel === '.login-form') return forms;
            if (sel === '.login-error-msg') return msgs;
            if (sel === '.toggle-password') return toggles;
            return [];
        },
        querySelector: (sel) => (sel === '.login-container' ? container : null),
        createElement: (tag) => fakeEl(tag),
        addEventListener(type, fn) { (docListeners[type] = docListeners[type] || []).push(fn); },
        dispatch(type, event) { (docListeners[type] || []).forEach((fn) => fn(event)); },
        panels, forms, loginForm, registerForm, forgotForm, container, toggles, byId
    };
    return doc;
}

/** Base de datos falsa: `data` es un mapa ruta → valor; registra escrituras y registros de log. */
function makeDb(data) {
    const writes = [];
    const logPushes = [];
    const read = (path) => (Object.prototype.hasOwnProperty.call(data, path) ? data[path] : null);
    return {
        writes, logPushes,
        ref(path) {
            return {
                once: async () => ({ exists: () => read(path) !== null, val: () => read(path) }),
                set: async (value) => { writes.push([path, value]); },
                push() {
                    const entry = { key: 'log-1', set: async (value) => { logPushes.push(value); } };
                    return entry;
                }
            };
        }
    };
}

/** Almacenamiento falso con la misma forma que localStorage. */
function makeStorage(initial = {}) {
    const map = new Map(Object.entries(initial));
    return {
        map,
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => { map.set(k, String(v)); },
        removeItem: (k) => { map.delete(k); }
    };
}

/** Auth falso: `signIn`, `create` y `reset` devuelven lo que el escenario indique o lanzan. */
function makeAuth(scenario = {}) {
    const calls = { signOut: 0, signIn: [], create: [], reset: [] };
    return {
        calls,
        async signInWithEmailAndPassword(email, password) {
            calls.signIn.push([email, password]);
            if (scenario.signInError) throw scenario.signInError;
            return { user: { uid: scenario.uid || 'u1' } };
        },
        async createUserWithEmailAndPassword(email, password) {
            calls.create.push([email, password]);
            if (scenario.createError) throw scenario.createError;
            return { user: { uid: 'new-uid' } };
        },
        async sendPasswordResetEmail(email) {
            calls.reset.push(email);
            if (scenario.resetError) throw scenario.resetError;
        },
        async signOut() { calls.signOut += 1; }
    };
}

/** Construye controlador y piezas. */
function setup({ userAgent = CHROME_UA, protocol = 'https:', auth = makeAuth(), db = makeDb({}), storage = makeStorage(), now = new Date(2026, 9, 15, 10, 0, 0), loadShiftRows = async () => null, notify = [], timers = [] } = {}) {
    const doc = makeDoc();
    const alerts = [];
    const win = { location: { href: '', protocol }, navigator: { userAgent } };
    const controller = createLoginController({
        doc, win, auth, database: db, storage,
        alert: (m) => alerts.push(m), now: () => now, logger: { error() {}, warn() {} },
        loadShiftRows, notifySupervisor: (fields) => notify.push(fields),
        setTimer: (fn, ms) => { timers.push({ fn, ms }); }
    });
    return { doc, win, auth, db, storage, controller, alerts, notify, timers };
}

/** Rellena el formulario de login y lo envía. Devuelve el mensaje mostrado. */
async function submitLogin(ctx, email = 'ana@x.com', password = 'secreta1') {
    ctx.doc.byId.loginEmail.value = email;
    ctx.doc.byId.loginPassword.value = password;
    return ctx.controller.handleLogin(email, password, {
        loginError: ctx.doc.byId.loginError,
        button: ctx.doc.loginForm.buttons['button[type="submit"]']
    });
}

const GESTOR = { name: 'Ana Pérez', email: 'ana@x.com', role: 'Gestor', approved: true, shift: '08:00 - 17:00' };

// ----------------------------------------------------------------------------------------------

await testAsync('isChromeUserAgent: Chrome sí; Edge, Opera y otros no', async () => {
    assert.equal(isChromeUserAgent(CHROME_UA), true);
    assert.equal(isChromeUserAgent(EDGE_UA), false);
    assert.equal(isChromeUserAgent('Mozilla/5.0 Firefox/120.0'), false);
});

await testAsync('init: archivo local muestra el aviso de FormSubmit una vez', async () => {
    const ctx = setup({ protocol: 'file:' });
    ctx.controller.init();
    assert.deepEqual(ctx.alerts, [LOGIN_MESSAGES.FILE_PROTOCOL]);
});

await testAsync('init: navegador que no es Chrome muestra el bloqueo al cargar el DOM', async () => {
    const ctx = setup({ userAgent: EDGE_UA });
    ctx.controller.init();
    ctx.doc.dispatch('DOMContentLoaded');
    assert.equal(ctx.doc.byId.browserBlocker.style.display, 'flex');
    assert.equal(ctx.doc.container.style.display, 'none');
});

await testAsync('init: en Chrome no se registra el bloqueo', async () => {
    const ctx = setup();
    ctx.controller.init();
    ctx.doc.dispatch('DOMContentLoaded');
    assert.equal(ctx.doc.byId.browserBlocker.style.display, '');
});

await testAsync('cambio de panel por delegación data-action (sin onclick)', async () => {
    const ctx = setup();
    ctx.controller.init();
    ctx.doc.loginForm.resetCount = 0;
    const link = fakeEl('a');
    link.setAttribute('data-action', SWITCH_PANEL_ACTION);
    link.setAttribute('data-panel', LOGIN_PANELS.REGISTER);
    ctx.doc.dispatch('click', { target: { closest: (sel) => (sel === `[data-action="${SWITCH_PANEL_ACTION}"]` ? link : null) } });
    assert.equal(ctx.doc.byId[LOGIN_PANELS.REGISTER].style.display, 'block');
    assert.equal(ctx.doc.byId[LOGIN_PANELS.LOGIN].style.display, 'none');
    assert.equal(ctx.doc.loginForm.resetCount, 1);
});

await testAsync('login rechazado: muestra el motivo como texto, cierra sesión y NO lanza error (defecto W-29 a)', async () => {
    const db = makeDb({ 'users/u1': { ...GESTOR, approved: 'Rechazado', rejectionReason: '<img src=x onerror=alert(1)>' } });
    const ctx = setup({ db });
    const message = await submitLogin(ctx);
    assert.equal(message, LOGIN_MESSAGES.REJECTED);
    const loginError = ctx.doc.byId.loginError;
    assert.equal(loginError.textContent, LOGIN_MESSAGES.REJECTED);
    const reason = loginError.children.find((c) => c.tagName === 'small');
    assert.equal(reason.textContent, 'Motivo: <img src=x onerror=alert(1)>', 'el motivo es texto, no HTML');
    assert.equal(ctx.auth.calls.signOut, 1);
    assert.equal(ctx.win.location.href, '');
    assert.equal(ctx.storage.map.has(STORAGE_KEYS.CURRENT_USER), false);
});

await testAsync('login rechazado sin motivo usa el texto por defecto', async () => {
    const db = makeDb({ 'users/u1': { ...GESTOR, approved: 'Rechazado' } });
    const ctx = setup({ db });
    await submitLogin(ctx);
    const reason = ctx.doc.byId.loginError.children.find((c) => c.tagName === 'small');
    assert.equal(reason.textContent, `Motivo: ${LOGIN_MESSAGES.REJECTION_REASON_DEFAULT}`);
});

await testAsync('login pendiente: mensaje y cierre de sesión', async () => {
    const db = makeDb({ 'users/u1': { ...GESTOR, approved: false } });
    const ctx = setup({ db });
    assert.equal(await submitLogin(ctx), LOGIN_MESSAGES.PENDING);
    assert.equal(ctx.doc.byId.loginError.textContent, LOGIN_MESSAGES.PENDING);
    assert.equal(ctx.auth.calls.signOut, 1);
});

await testAsync('login sin perfil en la base: credenciales incorrectas y sin cierre de sesión (como login.js)', async () => {
    const ctx = setup({ db: makeDb({}) });
    assert.equal(await submitLogin(ctx), LOGIN_MESSAGES.INVALID_CREDENTIALS);
    assert.equal(ctx.auth.calls.signOut, 0);
});

await testAsync('turno vencido: mensaje, cierre de sesión y borrado de las claves de sesión', async () => {
    const db = makeDb({ 'users/u1': GESTOR });
    const storage = makeStorage(Object.fromEntries(SESSION_STORAGE_KEYS.map((k) => [k, 'x'])));
    const rows = [
        ['Semana', 46000, 46001],
        ['GESTOR', 'Lunes', 'Martes'],
        ['Ana Pérez', '08:00 - 09:00', 'Descansa'],
        ['GESTOR', 'Fin', '']
    ];
    // La fecha de la hoja se reconstruye para el día del reloj de la prueba (15-oct-2026, 10:00).
    const now = new Date(2026, 9, 15, 10, 0, 0);
    const serial = (Date.UTC(2026, 9, 15) - Date.UTC(1899, 11, 30)) / 86400000;
    rows[0] = ['Semana', serial, serial + 1];
    const ctx = setup({ db, storage, now, loadShiftRows: async () => rows });
    assert.equal(await submitLogin(ctx), LOGIN_MESSAGES.SHIFT_ENDED);
    assert.equal(ctx.auth.calls.signOut, 1);
    for (const key of SESSION_STORAGE_KEYS) assert.equal(storage.map.has(key), false, `${key} debe borrarse`);
});

await testAsync('Admin no consulta el turno aunque el horario venza', async () => {
    const db = makeDb({ 'users/u1': { ...GESTOR, role: 'Admin' } });
    let loaded = 0;
    const ctx = setup({ db, loadShiftRows: async () => { loaded += 1; return null; } });
    await submitLogin(ctx);
    assert.equal(loaded, 0);
});

await testAsync('acceso permitido: registra el login, guarda la sesión y redirige a index.html', async () => {
    const db = makeDb({ 'users/u1': GESTOR });
    const ctx = setup({ db });
    const message = await submitLogin(ctx);
    assert.equal(message, '');
    assert.equal(ctx.win.location.href, 'index.html');
    assert.equal(db.logPushes.length, 1);
    assert.equal(db.logPushes[0].uid, 'u1');
    const saved = JSON.parse(ctx.storage.map.get(STORAGE_KEYS.CURRENT_USER));
    assert.equal(saved.uid, 'u1');
    assert.equal(saved.loginLogId, 'log-1');
    assert.equal(saved.role, 'Gestor');
});

await testAsync('acceso permitido conserva la hora de inicio del reporte de hoy', async () => {
    const now = new Date(2026, 9, 15, 10, 0, 0);
    const db = makeDb({ 'users/u1': GESTOR, 'reports_2026-10-15/u1': { loginTime: '2026-10-15T08:05:00.000Z' } });
    const ctx = setup({ db, now });
    await submitLogin(ctx);
    const saved = JSON.parse(ctx.storage.map.get(STORAGE_KEYS.CURRENT_USER));
    assert.equal(saved.loginTime, '2026-10-15T08:05:00.000Z');
});

await testAsync('errores de Firebase en login: código → mensaje; el botón se restaura', async () => {
    const cases = [
        [{ code: 'auth/invalid-email' }, LOGIN_MESSAGES.INVALID_EMAIL],
        [{ code: 'auth/user-disabled' }, LOGIN_MESSAGES.USER_DISABLED],
        [{ code: 'auth/wrong-password' }, LOGIN_MESSAGES.INVALID_CREDENTIALS]
    ];
    for (const [error, expected] of cases) {
        const ctx = setup({ auth: makeAuth({ signInError: error }) });
        assert.equal(await submitLogin(ctx), expected);
        const button = ctx.doc.loginForm.buttons['button[type="submit"]'];
        assert.equal(button.disabled, false);
    }
});

await testAsync('registro: contraseñas distintas no llaman a Firebase', async () => {
    const ctx = setup();
    ctx.doc.byId.regName.value = 'Ana Pérez';
    ctx.doc.byId.regEmail.value = 'ana@x.com';
    ctx.doc.byId.regPassword.value = 'abcdef';
    ctx.doc.byId.regConfirmPassword.value = 'abcdeg';
    ctx.doc.byId.regRole.value = 'Gestor';
    const message = await ctx.controller.handleRegister(ctx.doc.registerForm, {
        registerError: ctx.doc.byId.registerError, registerSuccess: ctx.doc.byId.registerSuccess,
        button: ctx.doc.registerForm.buttons['button[type="submit"]']
    });
    assert.equal(message, REGISTER_MESSAGES.PASSWORDS_MISMATCH);
    assert.equal(ctx.auth.calls.create.length, 0);
});


await testAsync('registro correcto: perfil pendiente, aviso al supervisor y vuelta al login a los 2 s', async () => {
    const timers = [];
    const notify = [];
    const ctx = setup({ timers, notify });
    ctx.doc.byId.regName.value = 'Ana Pérez';
    ctx.doc.byId.regEmail.value = 'ana@x.com';
    ctx.doc.byId.regPassword.value = 'abcdef';
    ctx.doc.byId.regConfirmPassword.value = 'abcdef';
    ctx.doc.byId.regRole.value = 'Supervisor';
    const message = await ctx.controller.handleRegister(ctx.doc.registerForm, {
        registerError: ctx.doc.byId.registerError, registerSuccess: ctx.doc.byId.registerSuccess,
        button: ctx.doc.registerForm.buttons['button[type="submit"]']
    });
    assert.equal(message, LOGIN_MESSAGES.REGISTER_SUCCESS);
    assert.equal(ctx.doc.byId.registerSuccess.textContent, LOGIN_MESSAGES.REGISTER_SUCCESS);
    assert.equal(notify.length, 1, 'el registro avisa al supervisor');
    assert.equal(timers.length, 1, 'vuelve al login con un temporizador');
});

await testAsync('registro: el perfil se guarda como pendiente con el rol normalizado', async () => {
    const db = makeDb({});
    const notify = [];
    const timers = [];
    const ctx = setup({ db, notify, timers });
    ctx.doc.byId.regName.value = 'Ana Pérez';
    ctx.doc.byId.regEmail.value = 'ana@x.com';
    ctx.doc.byId.regPassword.value = 'abcdef';
    ctx.doc.byId.regConfirmPassword.value = 'abcdef';
    ctx.doc.byId.regRole.value = 'Admin';
    await ctx.controller.handleRegister(ctx.doc.registerForm, {
        registerError: ctx.doc.byId.registerError, registerSuccess: ctx.doc.byId.registerSuccess,
        button: ctx.doc.registerForm.buttons['button[type="submit"]']
    });
    assert.equal(db.writes.length, 1);
    const [path, profile] = db.writes[0];
    assert.equal(path, 'users/new-uid');
    assert.equal(profile.approved, false);
    assert.equal(profile.status, 'pending');
    assert.equal(profile.role, 'Gestor', 'un rol fuera del formulario cae a Gestor');
    assert.equal(notify.length, 1);
    assert.equal(notify[0]._subject, 'Nuevo Registro Pendiente: Ana Pérez');
    assert.equal(notify[0].Rol_Solicitado, 'Admin', 'el aviso muestra el valor que se eligió');
    assert.equal(timers[0].ms, 2000);
    timers[0].fn();
    assert.equal(ctx.doc.byId[LOGIN_PANELS.LOGIN].style.display, 'block');
});

await testAsync('registro: errores de Firebase se traducen a mensajes del formulario', async () => {
    const cases = [
        [{ code: 'auth/email-already-in-use' }, LOGIN_MESSAGES.EMAIL_IN_USE],
        [{ code: 'auth/weak-password' }, LOGIN_MESSAGES.WEAK_PASSWORD],
        [{ code: 'auth/invalid-email' }, LOGIN_MESSAGES.INVALID_EMAIL],
        [{ code: 'otro' }, LOGIN_MESSAGES.REGISTER_ERROR]
    ];
    for (const [error, expected] of cases) {
        const ctx = setup({ auth: makeAuth({ createError: error }) });
        ctx.doc.byId.regName.value = 'Ana Pérez';
        ctx.doc.byId.regEmail.value = 'ana@x.com';
        ctx.doc.byId.regPassword.value = 'abcdef';
        ctx.doc.byId.regConfirmPassword.value = 'abcdef';
        ctx.doc.byId.regRole.value = 'Gestor';
        const message = await ctx.controller.handleRegister(ctx.doc.registerForm, {
            registerError: ctx.doc.byId.registerError, registerSuccess: ctx.doc.byId.registerSuccess,
            button: ctx.doc.registerForm.buttons['button[type="submit"]']
        });
        assert.equal(message, expected);
        assert.equal(ctx.doc.byId.registerError.textContent, expected);
    }
});

await testAsync('recuperación: correo con formato inválido muestra el error', async () => {
    const ctx = setup({ auth: makeAuth({ resetError: { code: 'auth/invalid-email' } }) });
    const message = await ctx.controller.handleForgot('mal', {
        forgotMessage: ctx.doc.byId.forgotMessage, form: ctx.doc.forgotForm,
        button: ctx.doc.forgotForm.buttons['button[type="submit"]']
    });
    assert.equal(message, LOGIN_MESSAGES.RESET_INVALID_EMAIL);
});

await testAsync('recuperación: mensaje genérico aunque la cuenta no exista (no revela correos registrados)', async () => {
    const ctx = setup({ auth: makeAuth({ resetError: { code: 'auth/user-not-found' } }) });
    const message = await ctx.controller.handleForgot('ana@x.com', {
        forgotMessage: ctx.doc.byId.forgotMessage, form: ctx.doc.forgotForm,
        button: ctx.doc.forgotForm.buttons['button[type="submit"]']
    });
    assert.equal(message, LOGIN_MESSAGES.RESET_SENT('ana@x.com'));
    assert.equal(ctx.doc.forgotForm.resetCount, 1);
});

await testAsync('ojo de contraseña: alterna entre texto y contraseña', async () => {
    const ctx = setup();
    const input = fakeEl('input', { type: 'password' });
    const icon = fakeEl('i');
    icon.previousElementSibling = input;
    icon.classList.add('bx-show');
    ctx.doc.toggles.push(icon);
    ctx.controller.init();
    icon.listeners.click[0].call(icon);
    assert.equal(input.type, 'text');
    icon.listeners.click[0].call(icon);
    assert.equal(input.type, 'password');
});

await summarizeAsync();
