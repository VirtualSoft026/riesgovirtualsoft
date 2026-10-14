/**
 * Política de aprobaciones: quién puede aprobar o rechazar usuarios y permisos, estados que se
 * guardan en Firebase, textos de la interfaz y payloads de escritura.
 *
 * Puerto 1:1 de la lógica pura de `approveUser()` (app.js 4221), `confirmRejectUser()` (4247) y
 * `updatePermissionStatus()` (4433), más la política de roles que `database.rules.json` impone:
 *
 *  - `users/$uid` `.write`: solo un Admin APROBADO puede escribir el nodo de otro usuario (aprobar o
 *    rechazar); un usuario solo puede CREAR su propio nodo (alta). `users` `.read`: Admin o Supervisor.
 *  - `permissions/$perm_id` `.write`: Admin o Supervisor aprobados pueden escribir (aprobar/rechazar);
 *    el dueño solo puede CREAR su solicitud. `permissions` `.read`: Admin o Supervisor (o el dueño por consulta).
 *
 * Esta política es una capa de INTERFAZ (qué botones mostrar/permitir): la seguridad real son las reglas
 * de Firebase. `src/tests/domain/approval-policy.test.mjs` contrasta estas funciones contra un evaluador
 * de las expresiones reales de `database.rules.json`.
 *
 * Sin DOM, sin Firebase, sin `Date.now()` implícito: la fecha de aprobación llega por parámetro.
 */

import { ROLES } from '../../config/roles.js';

/** Valor que se guarda en `users/{uid}/approved` al rechazar (app.js 4256); aprobar guarda `true`, pendiente `false`. */
export const USER_REJECTED_VALUE = 'Rechazado';

/** Correo del administrador que NUNCA se lista como "aprobado" en la tabla (app.js 4121, literal). */
export const HIDDEN_APPROVED_USER_EMAIL = 'maria.sanchez@virtualsoft.tech';

/** Cantidad máxima de filas sin filtros activos (app.js 4155 y 4285). */
export const APPROVALS_LIST_LIMIT = 5;

/** Observación por defecto al aprobar un permiso sin escribir nada (app.js 4430). */
export const DEFAULT_PERMISSION_APPROVAL_REASON = 'Aprobado sin observaciones adicionales';

/**
 * Textos visibles de las alertas/confirmaciones (idénticos a app.js).
 * Las funciones reciben el parámetro variable.
 */
export const APPROVAL_MESSAGES = Object.freeze({
    CONFIRM_APPROVE_USER: '¿Estás seguro de aprobar el acceso para este usuario?',
    USER_APPROVED: 'Usuario aprobado exitosamente. Ahora puede iniciar sesión.',
    USER_REJECTED: 'Usuario rechazado exitosamente.',
    REJECTION_REASON_REQUIRED: 'Debes escribir un motivo de rechazo.',
    SERVER_ERROR: 'Error al contactar al servidor',
    /**
     * Rol insuficiente (decisión D7: el controlador valida el rol en el cliente por defecto, `enforcePolicy`).
     * app.js no tiene este texto: sin la validación, Firebase rechaza y se ve SERVER_ERROR.
     */
    NOT_ALLOWED: 'No tienes permiso para realizar esta acción.',
    /** Decisión D9a (no existe en app.js): confirmar la reversión de un rechazo. */
    CONFIRM_REVERT_USER: '¿Deseas revertir el rechazo y devolver este usuario a "Pendiente de aprobación"?',
    /** Decisión D9a (no existe en app.js): reversión exitosa. */
    USER_REVERTED: 'Rechazo revertido: el usuario volvió a "Pendiente de aprobación".',
    permissionUpdated: (newStatus) => `Permiso ${newStatus} exitosamente.`
});

/**
 * @param {unknown} role
 * @param {unknown} approved Si la cuenta de quien actúa está aprobada (las reglas lo exigen). La app solo
 *   deja entrar a cuentas aprobadas, por eso el valor por defecto es `true`.
 */
function isApprovedActor(approved) {
    return approved === true;
}

/** ¿Quién puede aprobar usuarios? Solo Admin aprobado (reglas `users/$uid/.write`). */
export function canApproveUsers(role, approved = true) {
    return role === ROLES.ADMIN && isApprovedActor(approved);
}

/** ¿Quién puede rechazar usuarios? Mismo nodo y misma regla que aprobar. */
export function canRejectUsers(role, approved = true) {
    return canApproveUsers(role, approved);
}

/**
 * ¿Quién puede revertir un rechazo (D9a)? Mismo nodo `users/$uid` y misma regla que aprobar/rechazar: solo Admin
 * aprobado. No se inventa un rol nuevo: si las reglas cambian, cambia junto con `canApproveUsers`.
 */
export function canRevertUserRejection(role, approved = true) {
    return canApproveUsers(role, approved);
}

/** ¿Quién puede ver la sección "Gestión de Usuarios" de Aprobaciones? Solo Admin (app.js 4983-4991). */
export function canViewUsersApprovalSection(role) {
    return role === ROLES.ADMIN;
}

/** ¿Quién puede leer la lista de `users`? Admin o Supervisor aprobados (reglas `users/.read`). */
export function canReadUsersList(role, approved = true) {
    return (role === ROLES.ADMIN || role === ROLES.SUPERVISOR) && isApprovedActor(approved);
}

/** ¿Quién ve la vista Aprobaciones? Admin o Supervisor (app.js 2848 y 5083). */
export function canViewApprovalsView(role) {
    return role === ROLES.ADMIN || role === ROLES.SUPERVISOR;
}

/** ¿Quién puede aprobar o rechazar permisos? Admin o Supervisor aprobados (reglas `permissions/$perm_id/.write`). */
export function canManagePermissionApprovals(role, approved = true) {
    return (role === ROLES.ADMIN || role === ROLES.SUPERVISOR) && isApprovedActor(approved);
}

/** Estados de la aprobación de una cuenta de usuario. */
export function isUserPending(user) {
    return Boolean(user) && user.approved === false;
}

export function isUserApproved(user) {
    return Boolean(user) && user.approved === true;
}

export function isUserRejected(user) {
    return Boolean(user) && user.approved === USER_REJECTED_VALUE;
}

/**
 * Valida el motivo de rechazo (usuario o permiso): se recorta y no puede quedar vacío.
 * (app.js 4248-4252 y 4402-4406.)
 *
 * @param {unknown} rawReason Valor del campo de texto.
 * @returns {{ok: true, reason: string}|{ok: false, message: string}}
 */
export function validateRejectionReason(rawReason) {
    const reason = String(rawReason === null || rawReason === undefined ? '' : rawReason).trim();

    if (!reason) {
        return { ok: false, message: APPROVAL_MESSAGES.REJECTION_REASON_REQUIRED };
    }

    return { ok: true, reason };
}

/**
 * Payload de aprobar un usuario (app.js 4225-4228).
 *
 * @param {string} approvalDateIso Fecha ISO de la aprobación (`new Date().toISOString()` en app.js).
 */
export function buildUserApprovalUpdate(approvalDateIso) {
    return { approved: true, approvalDate: approvalDateIso };
}

/**
 * Payload de rechazar un usuario (app.js 4255-4258). El motivo ya debe venir validado.
 *
 * @param {string} reason
 */
export function buildUserRejectionUpdate(reason) {
    return { approved: USER_REJECTED_VALUE, rejectionReason: reason };
}

/**
 * Payload de REVERTIR un rechazo (decisión D9a): el usuario vuelve exactamente al estado del alta de `login.js`
 * (`approved: false`) y se borra el motivo del rechazo (`rejectionReason: null` elimina el campo en Firebase), que es
 * la operación inversa de `buildUserRejectionUpdate`. `status` no se toca: el rechazo de app.js tampoco lo cambia
 * (queda `"pending"` desde el alta). Las reglas lo permiten solo a un Admin aprobado (`users/$uid/.write`; el
 * `.validate` de `approved` acepta cualquier valor escrito por un Admin).
 */
export function buildUserRevertToPendingUpdate() {
    return { approved: false, rejectionReason: null };
}

// =============================================================================
// D3(b) — Admin único: auto-aprobación
// Decisión 2026-10-07: "este solo admin no necesita aprobación".
// =============================================================================

/**
 * Determina si un usuario Admin recién registrado debe aprobarse automáticamente
 * porque es el único Admin en el sistema y no hay ningún Admin aprobado que pueda
 * aprobarlo.
 *
 * Caso de uso: primer arranque del sistema o reinstalación donde solo existe un Admin.
 * Sin esta regla, el sistema quedaría bloqueado: el único Admin nunca podría entrar
 * porque nadie tiene permisos para aprobarlo.
 *
 * IMPORTANTE — límite de esta función:
 *   Solo expresa la POLÍTICA (qué debe pasar). El MECANISMO (cuándo y cómo
 *   llamar a `buildUserApprovalUpdate`) es responsabilidad del controlador de
 *   aprobaciones. El controlador debe:
 *     1. Contar los Admins con `approved === true` en `users/`.
 *     2. Llamar esta función con ese conteo.
 *     3. Si devuelve `true`, escribir `buildUserApprovalUpdate(now)` en el nodo
 *        del usuario recién creado.
 *
 * Las reglas de Firebase permiten esto porque `users/$uid/.write` permite al propio
 * usuario CREAR su nodo (`!data.exists() && newData.child('email').val() === auth.token.email`);
 * la escritura posterior de `approved: true` por un Admin ya-aprobado también está cubierta.
 * Para el caso del primer Admin, la regla de creación inicial es suficiente para establecer
 * `approved: true` si se incluye en el payload de alta.
 *
 * @param {{ role: string }} user              - Usuario recién registrado (mínimo: { role }).
 * @param {number}           approvedAdminCount - Número de Admins con `approved === true` en `users/`.
 *                                               Pasar 0 si no hay ninguno (primer Admin del sistema).
 * @returns {boolean} `true` si se debe auto-aprobar, `false` si debe seguir el flujo normal.
 *
 * @example
 * // Primer Admin: no hay nadie con approved === true que sea Admin
 * isSoloAdminAutoApproved({ role: 'Admin' }, 0)  // → true
 *
 * // Admin normal: ya existe al menos un Admin aprobado
 * isSoloAdminAutoApproved({ role: 'Admin' }, 1)  // → false
 *
 * // Rol distinto: nunca se auto-aprueba por esta regla
 * isSoloAdminAutoApproved({ role: 'Gestor' }, 0)  // → false
 */
export function isSoloAdminAutoApproved(user, approvedAdminCount) {
    if (!user || user.role !== ROLES.ADMIN) return false;
    return Number(approvedAdminCount) === 0;
}

/**
 * Texto de registro interno para el log cuando se aplica la auto-aprobación.
 * No se muestra en la interfaz: la auto-aprobación es transparente para el usuario.
 */
export const SOLO_ADMIN_AUTO_APPROVAL_REASON =
    'Auto-aprobado: primer Admin del sistema (D3-b, 2026-10-07)';
