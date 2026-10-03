/**
 * Roles de usuario reconocidos por la aplicación.
 */
export const ROLES = Object.freeze({
    GESTOR: 'Gestor',
    SUPERVISOR: 'Supervisor',
    ADMIN: 'Admin'
});

/**
 * Roles que no tienen turno asignado y omiten la validación de expiración.
 */
export const ROLES_WITHOUT_SHIFT = new Set([ROLES.ADMIN, ROLES.SUPERVISOR]);
