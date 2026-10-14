import { createRunner, assert } from '../test-harness.mjs';
import {
    buildSidebarPolicy,
    buildBreakButtonsPolicy,
    buildAdministrativeControlsPolicy,
    isPrivilegedNavRole,
    isPasswordInputAcceptable,
    mapPasswordChangeError,
    changeUserPassword,
    PASSWORD_MESSAGES,
    PASSWORD_TONE,
    PASSWORD_TONE_COLOR,
    PASSWORD_SUCCESS_CLOSE_DELAY_MS,
    NAV_PARENT
} from '../../domain/auth/auth-service.js';
import {
    isAdminNotificationScope,
    buildAdminReadUpdates,
    buildGestorReadUpdates
} from '../../domain/auth/notification-rules.js';

const { test, testAsync, summarizeAsync } = createRunner('auth-service / notification-rules (política de navegación, controles administrativos, contraseña, notificaciones)');

const ids = (policy, filter = () => true) => policy.operations.filter(filter).map((o) => o.id);

// ---------------------------------------------------------------- navegación por rol (app.js 5075-5120)
test('Admin: ve Monitoreo, Comunicados, Turnos, Aprobaciones dentro del grupo Admin, y Config. Gestores; oculta Mis Tareas y Tiempos', () => {
    const p = buildSidebarPolicy({ role: 'Admin' });
    assert.equal(p.privileged, true);
    assert.deepEqual(ids(p, (o) => o.appendTo === NAV_PARENT.ADMIN_GROUP), ['navMonitoreo', 'navAdminComunicados', 'navTurnos', 'navAprobaciones']);
    assert.deepEqual(ids(p, (o) => o.appendTo === NAV_PARENT.SIDEBAR), ['adminNavGroup', 'navHorario', 'navDocs', 'navPermisos', 'navConfigGestores']);
    assert.equal(p.operations.find((o) => o.id === 'navWorkspace').display, 'none');
    assert.equal(p.operations.find((o) => o.id === 'navTiempos').display, 'none');
    assert.equal(p.operations.find((o) => o.id === 'navComunicados').display, 'none', 'el Admin no ve el "Comunicados" del gestor');
    assert.equal(p.operations.find((o) => o.id === 'adminNavGroup').display, 'block');
});

test('Supervisor: ve Comunicados del gestor en la barra y NO ve Config. Gestores', () => {
    const p = buildSidebarPolicy({ role: 'Supervisor' });
    assert.equal(p.privileged, true);
    assert.deepEqual(p.operations.find((o) => o.id === 'navComunicados'), { id: 'navComunicados', display: 'flex', appendTo: NAV_PARENT.SIDEBAR });
    assert.equal(p.operations.some((o) => o.id === 'navConfigGestores'), false);
    assert.equal(p.operations.find((o) => o.id === 'navAdminComunicados').display, 'flex');
});

test('Gestor: Mis Tareas, Comunicados, Horario, Docs y Permisos en ese orden; Administración oculta; filtros de gestor ocultos', () => {
    const p = buildSidebarPolicy({ role: 'Gestor' });
    assert.equal(p.privileged, false);
    assert.deepEqual(ids(p, (o) => o.appendTo === NAV_PARENT.SIDEBAR), ['navWorkspace', 'navComunicados', 'navHorario', 'navDocs', 'navPermisos']);
    assert.equal(p.operations.find((o) => o.id === 'adminNavGroup').display, 'none');
    assert.equal(p.operations.find((o) => o.id === 'horarioGestorFilterContainer').display, 'none');
    assert.equal(p.operations.find((o) => o.id === 'teletrabajoGestorFilterContainer').display, 'none');
});

test('rol desconocido (p. ej. "Auditor", que no existe en app.js), sin rol o sin usuario: cae en la rama Gestor, como el else del original', () => {
    const gestor = JSON.stringify(buildSidebarPolicy({ role: 'Gestor' }));
    for (const user of [{ role: 'Auditor' }, { role: '' }, {}, null, undefined]) {
        assert.equal(JSON.stringify(buildSidebarPolicy(user)), gestor, JSON.stringify(user));
    }
    assert.equal(isPrivilegedNavRole({ role: 'Auditor' }), false);
});

test('botones de pausa de la barra lateral: solo el Gestor ve Almuerzo y Desayuno (la Pausa de Turno la gobierna el flag, no esta política)', () => {
    assert.deepEqual(buildBreakButtonsPolicy({ role: 'Gestor' }), [
        { id: 'toggleLunchBtn', display: 'flex' },
        { id: 'toggleBreakfastBtn', display: 'flex' }
    ]);
    assert.deepEqual(buildBreakButtonsPolicy({ role: 'Admin' }), []);
    assert.deepEqual(buildBreakButtonsPolicy({ role: 'Supervisor' }), []);
    assert.equal(buildBreakButtonsPolicy({ role: 'Gestor' }).some((o) => o.id === 'toggleSplitShiftBtn'), false);
});

// ---------------------------------------------------------------- controles administrativos (app.js 4974-4990)
test('controles administrativos: la aprobación de usuarios solo la ve el Admin; "Gestión Comunicados" se oculta a quien no puede gestionarla', () => {
    assert.deepEqual(buildAdministrativeControlsPolicy({ role: 'Admin' }), { showUserApprovalSection: true, hideAdminAnnouncementsView: false });
    assert.deepEqual(buildAdministrativeControlsPolicy({ role: 'Supervisor' }), { showUserApprovalSection: false, hideAdminAnnouncementsView: false });
    assert.deepEqual(buildAdministrativeControlsPolicy({ role: 'Gestor' }), { showUserApprovalSection: false, hideAdminAnnouncementsView: true });
    assert.equal(buildAdministrativeControlsPolicy(null), null);
});

// ---------------------------------------------------------------- contraseña (app.js 4934-4972)
test('contraseña: se rechaza vacía o en blanco; no se recorta (original: !newPass || newPass.trim() === "")', () => {
    for (const bad of ['', '   ', '\t\n', undefined, null]) assert.equal(isPasswordInputAcceptable(bad), false, JSON.stringify(bad));
    for (const good of ['ficticia-1', ' abc ', 'x']) assert.equal(isPasswordInputAcceptable(good), true);
});

test('errores de Firebase Auth mapeados a los textos del original', () => {
    assert.equal(mapPasswordChangeError({ code: 'auth/requires-recent-login' }), PASSWORD_MESSAGES.REQUIRES_RECENT_LOGIN);
    assert.equal(mapPasswordChangeError({ code: 'auth/weak-password' }), PASSWORD_MESSAGES.WEAK_PASSWORD);
    assert.equal(mapPasswordChangeError({ code: 'auth/otro' }), PASSWORD_MESSAGES.GENERIC_ERROR);
    assert.equal(mapPasswordChangeError(undefined), PASSWORD_MESSAGES.GENERIC_ERROR);
    assert.equal(PASSWORD_MESSAGES.REQUIRES_RECENT_LOGIN, 'Por seguridad, debes cerrar sesión e iniciar sesión nuevamente para cambiar tu contraseña.');
    assert.equal(PASSWORD_MESSAGES.WEAK_PASSWORD, 'La contraseña debe tener al menos 6 caracteres.');
});

testAsync('changeUserPassword: éxito llama a updatePassword con el valor recibido y pide cerrar el modal a los 2 s', async () => {
    const calls = [];
    const user = { updatePassword: async (p) => { calls.push(p); } };
    const r = await changeUserPassword({ newPassword: 'valor-ficticio-123', getAuthUser: () => user });
    assert.deepEqual(calls, ['valor-ficticio-123']);
    assert.equal(r.status, 'updated');
    assert.equal(r.message, '¡Contraseña actualizada exitosamente en Firebase Auth!');
    assert.equal(r.tone, PASSWORD_TONE.SUCCESS);
    assert.equal(r.closeModalAfterMs, PASSWORD_SUCCESS_CLOSE_DELAY_MS);
    assert.equal(PASSWORD_SUCCESS_CLOSE_DELAY_MS, 2000);
    assert.equal(PASSWORD_TONE_COLOR[PASSWORD_TONE.SUCCESS], 'var(--success)');
});

testAsync('changeUserPassword: contraseña en blanco no llama a la autenticación', async () => {
    let touched = false;
    const r = await changeUserPassword({ newPassword: '   ', getAuthUser: () => { touched = true; return null; } });
    assert.equal(touched, false);
    assert.equal(r.status, 'invalid');
    assert.equal(r.message, 'Por favor ingresa una contraseña válida.');
});

testAsync('changeUserPassword: sin sesión de Firebase Auth informa el error y no cierra el modal', async () => {
    const r = await changeUserPassword({ newPassword: 'valor-ficticio-123', getAuthUser: () => null });
    assert.equal(r.status, 'no-session');
    assert.equal(r.message, 'Error: No hay sesión activa en Firebase Auth. Por favor, vuelve a iniciar sesión.');
    assert.equal(r.closeModalAfterMs, null);
});

testAsync('changeUserPassword: errores de Firebase (reautenticación, débil, otro) y el resultado NUNCA contiene la contraseña', async () => {
    const SECRET = 'valor-ficticio-SECRETO-999';
    for (const [code, expected] of [
        ['auth/requires-recent-login', PASSWORD_MESSAGES.REQUIRES_RECENT_LOGIN],
        ['auth/weak-password', PASSWORD_MESSAGES.WEAK_PASSWORD],
        ['auth/network-request-failed', PASSWORD_MESSAGES.GENERIC_ERROR]
    ]) {
        const err = Object.assign(new Error('fallo ficticio'), { code });
        const r = await changeUserPassword({ newPassword: SECRET, getAuthUser: () => ({ updatePassword: async () => { throw err; } }) });
        assert.equal(r.status, 'error');
        assert.equal(r.message, expected);
        assert.equal(r.error, err);
        assert.equal(JSON.stringify(r).includes(SECRET), false, 'el resultado no debe incluir la contraseña');
    }
});

testAsync('changeUserPassword: si getAuthUser lanza, se trata como error (dentro del try del original)', async () => {
    const r = await changeUserPassword({ newPassword: 'valor-ficticio-123', getAuthUser: () => { throw new Error('auth no inicializado'); } });
    assert.equal(r.status, 'error');
    assert.equal(r.message, PASSWORD_MESSAGES.GENERIC_ERROR);
});

// ---------------------------------------------------------------- notificaciones (app.js 4860-4896)
test('alcance de notificaciones: Admin y Supervisor leen todas; el Gestor solo las suyas', () => {
    assert.equal(isAdminNotificationScope({ role: 'Admin' }), true);
    assert.equal(isAdminNotificationScope({ role: 'Supervisor' }), true);
    assert.equal(isAdminNotificationScope({ role: 'Gestor' }), false);
    assert.equal(isAdminNotificationScope(null), false);
});

test('Admin/Supervisor: solo los permisos Pendiente con notified_admin === false pasan a true', () => {
    const data = {
        a: { notified_admin: false, status: 'Pendiente' },
        b: { notified_admin: false, status: 'Aprobado' },
        c: { notified_admin: true, status: 'Pendiente' },
        d: { status: 'Pendiente' },
        e: { notified_admin: false, status: 'Pendiente' }
    };
    assert.deepEqual(buildAdminReadUpdates(data), { 'a/notified_admin': true, 'e/notified_admin': true });
    assert.deepEqual(buildAdminReadUpdates(null), {});
});

test('Gestor: solo los permisos ya respondidos con notified === false pasan a true', () => {
    const data = {
        a: { notified: false, status: 'Aprobado' },
        b: { notified: false, status: 'Pendiente' },
        c: { notified: true, status: 'Rechazado' },
        d: { notified: false, status: 'Rechazado' }
    };
    assert.deepEqual(buildGestorReadUpdates(data), { 'a/notified': true, 'd/notified': true });
    assert.deepEqual(buildGestorReadUpdates(undefined), {});
});

await summarizeAsync();
