/**
 * Reglas de autorización y sesión de la interfaz (sin DOM, sin Firebase, sin localStorage).
 *
 * Contiene, como reglas puras:
 *  1. La política de navegación por rol de `setupSidebar()` (app.js 5037-5120): qué pestañas ve cada rol,
 *     su orden y a qué contenedor pertenecen.
 *  2. La política de controles administrativos de `alignAdministrativeControlsByRole()` (app.js 4974-4990).
 *  3. Las reglas del cambio de contraseña de `changePassword()` (app.js 4934-4972), con la autenticación
 *     INYECTADA (nunca se toca Firebase Auth aquí, no se guarda ni se registra la contraseña).
 *
 * Roles reconocidos por app.js: Admin, Supervisor, Gestor. Cualquier otro valor (p. ej. "Auditor", que NO
 * existe hoy en app.js ni en index.html) cae en la rama "Gestor", igual que el original (`else`).
 */

import { APPROVED_REJECTED_VALUE } from './user-profile.js';

import { canManageComunicados } from '../announcements/announcement-capabilities.js';
import { ROLES } from '../../config/roles.js';

/** Contenedores a los que una pestaña se anexa (`appendChild`) al ordenar la barra lateral. */
export const NAV_PARENT = Object.freeze({
    SIDEBAR: 'sidebar',
    ADMIN_GROUP: 'adminGroup'
});

/**
 * ¿El usuario ve el menú de Administración (Admin o Supervisor)? (app.js 5075).
 *
 * @param {{role?: string}|null|undefined} user
 * @returns {boolean}
 */
export function isPrivilegedNavRole(user) {
    return Boolean(user && (user.role === ROLES.ADMIN || user.role === ROLES.SUPERVISOR));
}

function op(id, display, appendTo) {
    const operation = { id };

    if (display !== undefined) operation.display = display;
    if (appendTo !== undefined) operation.appendTo = appendTo;

    return operation;
}

/**
 * Política de navegación por rol. Devuelve las operaciones en el MISMO orden en que `setupSidebar()` las
 * ejecuta (el orden importa: `appendChild` mueve el nodo al final del contenedor).
 *
 * Cada operación: `{ id, display?, appendTo? }`. `display` es el valor de `style.display` (si falta, no se
 * toca); `appendTo` es el contenedor donde se anexa el nodo (si falta, no se mueve).
 *
 * @param {{role?: string}|null|undefined} user
 * @returns {{privileged: boolean, operations: Array<{id: string, display?: string, appendTo?: string}>}}
 */
export function buildSidebarPolicy(user) {
    const privileged = isPrivilegedNavRole(user);
    const S = NAV_PARENT.SIDEBAR;
    const A = NAV_PARENT.ADMIN_GROUP;

    if (privileged) {
        const isSupervisor = user.role === ROLES.SUPERVISOR;
        const operations = [
            op('horarioGestorFilterContainer', 'flex'),
            op('teletrabajoGestorFilterContainer', 'flex'),
            op('navWorkspace', 'none'), // Mis Tareas: oculta para Admin y Supervisor
            isSupervisor ? op('navComunicados', 'flex', S) : op('navComunicados', 'none'),
            op('adminNavGroup', 'block', S),
            op('navMonitoreo', 'flex', A),
            op('navTiempos', 'none'),
            // Admin y Supervisor gestionan comunicados; eliminar sigue restringido a Admin (en su vista).
            canManageComunicados(user.role) ? op('navAdminComunicados', 'flex', A) : op('navAdminComunicados', 'none'),
            op('navTurnos', 'flex', A),
            op('navAprobaciones', 'flex', A),
            op('navHorario', undefined, S),
            op('navDocs', 'flex', S),
            op('navPermisos', 'flex', S)
        ];

        if (user.role === ROLES.ADMIN) operations.push(op('navConfigGestores', 'flex', S));

        return { privileged, operations };
    }

    return {
        privileged,
        operations: [
            op('horarioGestorFilterContainer', 'none'),
            op('teletrabajoGestorFilterContainer', 'none'),
            op('navWorkspace', 'flex', S),
            op('navComunicados', 'flex', S),
            op('navHorario', undefined, S),
            op('navDocs', 'flex', S),
            op('navPermisos', 'flex', S),
            op('adminNavGroup', 'none') // las pestañas de Administración se ocultan para el Gestor
        ]
    };
}

/** Botones de pausa que SOLO se muestran al Gestor (app.js 5106-5115). El de Pausa de Turno lo gobierna el flag. */
export const GESTOR_BREAK_BUTTON_IDS = Object.freeze(['toggleLunchBtn', 'toggleBreakfastBtn']);

/**
 * Operaciones de visibilidad de los botones de pausa de la barra lateral para el rol (solo Gestor).
 *
 * @param {{role?: string}|null|undefined} user
 * @returns {Array<{id: string, display: string}>}
 */
export function buildBreakButtonsPolicy(user) {
    if (isPrivilegedNavRole(user)) return [];

    return GESTOR_BREAK_BUTTON_IDS.map((id) => ({ id, display: 'flex' }));
}

/** Ancho máximo (px) que se considera móvil (app.js 691). */
export const MOBILE_MAX_WIDTH = 768;

/** Resultado de la política de acceso móvil. */
export const MOBILE_ACCESS = Object.freeze({
    NONE: 'none',               // escritorio: no se toca nada
    SCROLL: 'scroll',           // Admin/Supervisor en móvil: oculta el bloqueo y habilita scroll horizontal
    BLOCK: 'block'              // Gestor en móvil: muestra el bloqueo y oculta la app
});

/**
 * Política de acceso desde móvil (app.js 690-712): Admin y Supervisor pueden usar la app con scroll
 * horizontal; el Gestor queda bloqueado.
 *
 * @param {{role?: string}|null|undefined} user
 * @param {number} viewportWidth
 * @returns {string} un valor de MOBILE_ACCESS
 */
export function buildMobileAccessPolicy(user, viewportWidth) {
    if (!user || !(viewportWidth <= MOBILE_MAX_WIDTH)) return MOBILE_ACCESS.NONE;

    return isPrivilegedNavRole(user) ? MOBILE_ACCESS.SCROLL : MOBILE_ACCESS.BLOCK;
}

/**
 * Política de `alignAdministrativeControlsByRole()` (app.js 4974-4990).
 *
 * - La sección de aprobación de usuarios (título, filtros y tabla) solo se muestra al Admin.
 * - La vista "Gestión Comunicados" se oculta si el rol no puede gestionarla.
 *
 * @param {{role?: string}|null|undefined} user
 * @returns {{showUserApprovalSection: boolean, hideAdminAnnouncementsView: boolean}|null} null si no hay usuario
 */
export function buildAdministrativeControlsPolicy(user) {
    if (!user) return null;

    return {
        showUserApprovalSection: user.role === ROLES.ADMIN,
        hideAdminAnnouncementsView: !canManageComunicados(user.role)
    };
}

// ----------------------------------------------------------------------------------------------
// Cambio de contraseña (changePassword, app.js 4934-4972)
// ----------------------------------------------------------------------------------------------

/** Tonos del mensaje; la capa de UI los traduce a colores CSS. */
export const PASSWORD_TONE = Object.freeze({
    NEUTRAL: 'neutral',
    DANGER: 'danger',
    SUCCESS: 'success'
});

/** Variable CSS de cada tono (colores del original). */
export const PASSWORD_TONE_COLOR = Object.freeze({
    [PASSWORD_TONE.NEUTRAL]: 'var(--text-primary)',
    [PASSWORD_TONE.DANGER]: 'var(--danger)',
    [PASSWORD_TONE.SUCCESS]: 'var(--success)'
});

/** Textos visibles del cambio de contraseña (idénticos a app.js). */
export const PASSWORD_MESSAGES = Object.freeze({
    EMPTY: 'Por favor ingresa una contraseña válida.',
    PENDING: 'Actualizando...',
    SUCCESS: '¡Contraseña actualizada exitosamente en Firebase Auth!',
    NO_SESSION: 'Error: No hay sesión activa en Firebase Auth. Por favor, vuelve a iniciar sesión.',
    GENERIC_ERROR: 'Error al actualizar contraseña.',
    REQUIRES_RECENT_LOGIN: 'Por seguridad, debes cerrar sesión e iniciar sesión nuevamente para cambiar tu contraseña.',
    WEAK_PASSWORD: 'La contraseña debe tener al menos 6 caracteres.'
});

/** Espera antes de cerrar el modal tras un cambio exitoso (app.js 4958). */
export const PASSWORD_SUCCESS_CLOSE_DELAY_MS = 2000;

/**
 * ¿La contraseña propuesta es aceptable para intentar el cambio? Solo rechaza vacía o en blanco
 * (la longitud mínima la valida Firebase y vuelve como `auth/weak-password`). La contraseña NO se recorta.
 *
 * @param {unknown} newPassword
 * @returns {boolean}
 */
export function isPasswordInputAcceptable(newPassword) {
    return !(!newPassword || String(newPassword).trim() === '');
}

/**
 * Mensaje a mostrar según el error devuelto por Firebase Auth. Nunca incluye la contraseña.
 *
 * @param {{code?: string}|null|undefined} error
 * @returns {string}
 */
export function mapPasswordChangeError(error) {
    const code = error && error.code;

    if (code === 'auth/requires-recent-login') return PASSWORD_MESSAGES.REQUIRES_RECENT_LOGIN;
    if (code === 'auth/weak-password') return PASSWORD_MESSAGES.WEAK_PASSWORD;

    return PASSWORD_MESSAGES.GENERIC_ERROR;
}

/**
 * Ejecuta el cambio de contraseña con la autenticación inyectada.
 *
 * `getAuthUser()` debe devolver el usuario actual de Firebase Auth (con `updatePassword(newPassword)`) o null.
 * No guarda, no registra y no devuelve la contraseña. El error original se devuelve en `error` para que quien
 * llama decida si lo registra (el original hacía `console.error` del objeto de error de Firebase).
 *
 * @param {{newPassword: string, getAuthUser: () => ({updatePassword: (p: string) => Promise<unknown>}|null|undefined)}} input
 * @returns {Promise<{status: 'invalid'|'updated'|'no-session'|'error', message: string, tone: string, closeModalAfterMs: number|null, error?: unknown}>}
 */
export async function changeUserPassword({ newPassword, getAuthUser }) {
    if (!isPasswordInputAcceptable(newPassword)) {
        return { status: 'invalid', message: PASSWORD_MESSAGES.EMPTY, tone: PASSWORD_TONE.DANGER, closeModalAfterMs: null };
    }

    try {
        const user = getAuthUser();

        if (user) {
            await user.updatePassword(newPassword);
            return {
                status: 'updated',
                message: PASSWORD_MESSAGES.SUCCESS,
                tone: PASSWORD_TONE.SUCCESS,
                closeModalAfterMs: PASSWORD_SUCCESS_CLOSE_DELAY_MS
            };
        }

        return { status: 'no-session', message: PASSWORD_MESSAGES.NO_SESSION, tone: PASSWORD_TONE.DANGER, closeModalAfterMs: null };
    } catch (error) {
        return { status: 'error', message: mapPasswordChangeError(error), tone: PASSWORD_TONE.DANGER, closeModalAfterMs: null, error };
    }
}

// ----------------------------------------------------------------------------------------------
// Política de acceso al login (#loginForm, login.js 276+)
// ----------------------------------------------------------------------------------------------

/**
 * Resultados del chequeo de acceso al inicio de sesión. La capa de UI los traduce a mensajes
 * de error y decide si redirigir a index.html o mantener al usuario en la página de login.
 */
export const LOGIN_ACCESS = Object.freeze({
    ALLOWED:       'allowed',        // acceso permitido → redirigir a index.html
    REJECTED:      'rejected',       // cuenta rechazada por un Admin (puede tener `reason`)
    PENDING:       'pending',        // cuenta pendiente de aprobación
    SHIFT_EXPIRED: 'shift-expired'   // turno del Gestor ya venció (ver shift-expiration.js)
});

/**
 * Evalúa si un usuario puede iniciar sesión dado su perfil de Firebase y el resultado del
 * chequeo de turno. Cubre las decisiones (1)–(3) del manejador de #loginForm (login.js 276+):
 *   rechazado → pendiente → turno vencido → permitido.
 *
 * Las decisiones (4) y (5) del original (recuperación de `loginTime` y escritura del log de
 * auditoría en `login_logs`) implican I/O con Firebase y quedan en la capa de login.js.
 *
 * Función pura — sin I/O, sin efectos secundarios.
 *
 * @param {{approved?: unknown, rejected?: boolean, rejectionReason?: string, role?: string}|null|undefined} dbUser
 * @param {boolean} [shiftExpired=false] resultado de `evaluateShiftExpiration(shiftStr).expired`
 * @returns {{ status: string, reason?: string }}
 */
export function evaluateLoginAccess(dbUser, shiftExpired = false) {
    if (!dbUser) return { status: LOGIN_ACCESS.REJECTED };

    // W-55 (c): un Admin rechaza con approved === 'Rechazado' (cadena, truthy). Antes ese valor pasaba como aprobado.
    if (dbUser.rejected === true || dbUser.approved === APPROVED_REJECTED_VALUE) {
        return { status: LOGIN_ACCESS.REJECTED, reason: dbUser.rejectionReason };
    }

    if (!dbUser.approved) return { status: LOGIN_ACCESS.PENDING };
    if (shiftExpired)     return { status: LOGIN_ACCESS.SHIFT_EXPIRED };

    return { status: LOGIN_ACCESS.ALLOWED };
}

// ----------------------------------------------------------------------------------------------
// Validación de registro (#registerForm, login.js ~164+)
// ----------------------------------------------------------------------------------------------

/** Mensajes de validación del formulario de registro (idénticos a login.js). */
export const REGISTER_MESSAGES = Object.freeze({
    NAME_MIN_WORDS:     'Por favor, ingresa tu nombre y apellido completo (mínimo dos palabras).',
    PASSWORDS_MISMATCH: 'Las contraseñas no coinciden.'
});

/**
 * Valida los campos del formulario de registro antes de llamar a Firebase Auth.
 * Cubre las validaciones previas del submit de #registerForm (login.js, líneas 164-185):
 *   – contraseñas que coincidan (se comprueba primero, como en login.js),
 *   – nombre con al menos dos palabras de dos o más letras (como en login.js).
 * (La fortaleza mínima de la contraseña la valida Firebase Auth: `auth/weak-password`.)
 *
 * Función pura.
 *
 * @param {{ name: unknown, password: unknown, confirmPassword: unknown }} input
 * @returns {string|null} Mensaje de error localizado, o `null` si la entrada es válida.
 */
export function validateRegistrationInput({ name, password, confirmPassword }) {
    // Mismo orden y regla que login.js: primero las contraseñas, después el nombre (palabras de 2 o más letras).
    if (password !== confirmPassword) return REGISTER_MESSAGES.PASSWORDS_MISMATCH;

    const words = String(name ?? '').split(/\s+/).filter((word) => word.length >= 2);
    if (words.length < 2) return REGISTER_MESSAGES.NAME_MIN_WORDS;

    return null;
}

/**
 * Normaliza el rol solicitado en el formulario de registro (login.js línea ~195).
 * Solo se reconocen 'Supervisor' y 'Gestor'; cualquier otro valor del `<select>`
 * cae a 'Gestor' — mismo comportamiento que el original.
 *
 * @param {unknown} rawRole — valor del `<select #regRole>` en el formulario de registro.
 * @returns {'Supervisor'|'Gestor'}
 */
export function normalizeRegistrationRole(rawRole) {
    return rawRole === ROLES.SUPERVISOR ? ROLES.SUPERVISOR : ROLES.GESTOR;
}
