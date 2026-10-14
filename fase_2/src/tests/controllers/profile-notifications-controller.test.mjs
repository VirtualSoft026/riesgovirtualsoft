import { createRunner, assert } from '../test-harness.mjs';
import { createProfileController } from '../../controllers/profile-controller.js';
import { createNotificationsController } from '../../controllers/notifications-controller.js';
import { createFakeDocument, createElement } from '../helpers/fake-dom-historial.mjs';

const { test, testAsync, summarizeAsync } = createRunner('profile-controller / notifications-controller (perfil, contraseña y notificaciones)');

const SECRET = 'valor-ficticio-NO-REAL-123';

function setupProfile({ authUser, user = { name: 'Ana Pérez', role: 'Gestor' }, input = SECRET } = {}) {
    const timers = []; const closed = []; const errors = [];
    const avatar = createElement('avatar', { src: 'avatar.png' });
    const els = {
        modalProfileAvatar: createElement('modalProfileAvatar'), modalProfileName: createElement('modalProfileName'), modalProfileRole: createElement('modalProfileRole'),
        profileModal: createElement('profileModal'), newPasswordInput: createElement('newPasswordInput', { value: input, type: 'password' }),
        passwordChangeMsg: createElement('passwordChangeMsg')
    };
    const document = createFakeDocument(els, { selectors: { '.user-profile .avatar': avatar } });
    const logged = [];
    const ctl = createProfileController({
        document, getUser: () => user, getAuthUser: () => authUser, closeModal: (id) => closed.push(id),
        setTimeout: (fn, ms) => timers.push({ fn, ms }), logger: { error: (...a) => { errors.push(a); logged.push(JSON.stringify(a.map((x) => (x instanceof Error ? x.message : x)))); } }
    });
    return { ctl, els, timers, closed, errors, logged };
}

test('openProfileModal: copia avatar, nombre y rol, limpia el campo y el mensaje y abre el modal', () => {
    const t = setupProfile();
    t.els.passwordChangeMsg.style.display = 'block';
    t.ctl.openProfileModal();
    assert.equal(t.els.modalProfileAvatar.src, 'avatar.png');
    assert.equal(t.els.modalProfileName.textContent, 'Ana Pérez');
    assert.equal(t.els.modalProfileRole.textContent, 'Gestor');
    assert.equal(t.els.newPasswordInput.value, '');
    assert.equal(t.els.passwordChangeMsg.style.display, 'none');
    assert.equal(t.els.profileModal.classList.contains('active'), true);
});

test('openProfileModal: usuario sin nombre ni rol usa "Usuario" y "Rol"', () => {
    const t = setupProfile({ user: {} });
    t.ctl.openProfileModal();
    assert.equal(t.els.modalProfileName.textContent, 'Usuario');
    assert.equal(t.els.modalProfileRole.textContent, 'Rol');
});

test('toggleProfilePassword: alterna password/text y el icono bx-show/bx-hide', () => {
    const t = setupProfile();
    const icon = createElement('icon'); icon._classes.add('bx-show');
    t.ctl.toggleProfilePassword(icon);
    assert.equal(t.els.newPasswordInput.type, 'text');
    assert.equal(icon.classList.contains('bx-hide'), true); assert.equal(icon.classList.contains('bx-show'), false);
    t.ctl.toggleProfilePassword(icon);
    assert.equal(t.els.newPasswordInput.type, 'password');
    assert.equal(icon.classList.contains('bx-show'), true);
});

testAsync('changePassword: campo en blanco muestra el aviso en rojo y no llama a Firebase', async () => {
    let called = false;
    const t = setupProfile({ input: '   ', authUser: { updatePassword: async () => { called = true; } } });
    await t.ctl.changePassword();
    assert.equal(called, false);
    assert.equal(t.els.passwordChangeMsg.textContent, 'Por favor ingresa una contraseña válida.');
    assert.equal(t.els.passwordChangeMsg.style.color, 'var(--danger)');
    assert.equal(t.els.passwordChangeMsg.style.display, 'block');
});

testAsync('changePassword: éxito, mensaje verde y cierra el modal a los 2000 ms; la contraseña llega solo a updatePassword', async () => {
    const received = [];
    const t = setupProfile({ authUser: { updatePassword: async (p) => { received.push(p); } } });
    await t.ctl.changePassword();
    assert.deepEqual(received, [SECRET]);
    assert.equal(t.els.passwordChangeMsg.textContent, '¡Contraseña actualizada exitosamente en Firebase Auth!');
    assert.equal(t.els.passwordChangeMsg.style.color, 'var(--success)');
    assert.equal(t.timers.length, 1); assert.equal(t.timers[0].ms, 2000);
    t.timers[0].fn();
    assert.deepEqual(t.closed, ['profileModal']);
    assert.equal(JSON.stringify(t.els.passwordChangeMsg).includes(SECRET), false);
});

testAsync('changePassword: sin sesión de Auth', async () => {
    const t = setupProfile({ authUser: null });
    await t.ctl.changePassword();
    assert.equal(t.els.passwordChangeMsg.textContent, 'Error: No hay sesión activa en Firebase Auth. Por favor, vuelve a iniciar sesión.');
    assert.equal(t.els.passwordChangeMsg.style.color, 'var(--danger)');
    assert.equal(t.timers.length, 0);
});

testAsync('changePassword: errores de Firebase, mensaje específico, color rojo, se registra el error y NUNCA la contraseña', async () => {
    for (const [code, text] of [
        ['auth/requires-recent-login', 'Por seguridad, debes cerrar sesión e iniciar sesión nuevamente para cambiar tu contraseña.'],
        ['auth/weak-password', 'La contraseña debe tener al menos 6 caracteres.'],
        ['auth/otro', 'Error al actualizar contraseña.']
    ]) {
        const t = setupProfile({ authUser: { updatePassword: async () => { throw Object.assign(new Error('fallo ficticio'), { code }); } } });
        await t.ctl.changePassword();
        assert.equal(t.els.passwordChangeMsg.textContent, text);
        assert.equal(t.els.passwordChangeMsg.style.color, 'var(--danger)');
        assert.equal(t.errors[0][0], 'Error al actualizar la contraseña:');
        assert.equal(t.logged.join('').includes(SECRET), false, 'la contraseña no se registra');
        assert.equal(t.timers.length, 0);
    }
});

test('toggleNotifications: alterna block/none (vacío cuenta como cerrado)', () => {
    const drop = createElement('notificationDropdown');
    const ctl = createNotificationsController({ document: createFakeDocument({ notificationDropdown: drop }), getUser: () => null, repository: {} });
    ctl.toggleNotifications(); assert.equal(drop.style.display, 'block');
    ctl.toggleNotifications(); assert.equal(drop.style.display, 'none');
    ctl.toggleNotifications(); assert.equal(drop.style.display, 'block');
    assert.doesNotThrow(() => createNotificationsController({ document: createFakeDocument({}), getUser: () => null, repository: {} }).toggleNotifications());
});

testAsync('markAllAsRead: sin usuario no consulta; con usuario delega; un error se registra y no se propaga', async () => {
    const calls = []; const errors = [];
    const repo = { markAllAsRead: async (u) => { calls.push(u.role); return { updated: 1 }; } };
    await createNotificationsController({ document: createFakeDocument({}), getUser: () => null, repository: repo }).markAllAsRead();
    assert.deepEqual(calls, []);
    await createNotificationsController({ document: createFakeDocument({}), getUser: () => ({ role: 'Admin' }), repository: repo }).markAllAsRead();
    assert.deepEqual(calls, ['Admin']);
    const failing = { markAllAsRead: async () => { throw new Error('fallo ficticio'); } };
    await createNotificationsController({ document: createFakeDocument({}), getUser: () => ({ role: 'Gestor' }), repository: failing, logger: { error: (e) => errors.push(e.message) } }).markAllAsRead();
    assert.deepEqual(errors, ['fallo ficticio']);
});

await summarizeAsync();
