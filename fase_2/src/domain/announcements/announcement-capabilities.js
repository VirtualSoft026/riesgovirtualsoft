/**
 * Roles autorizados para publicar comunicados.
 *
 * @type {ReadonlySet<string>}
 */
export const COMUNICADOS_PUBLISH_ROLES = new Set([
    'Admin',
    'Supervisor'
]);

/**
 * Roles autorizados para consultar lecturas de comunicados.
 *
 * @type {ReadonlySet<string>}
 */
export const COMUNICADOS_VIEW_LECTURAS_ROLES = new Set([
    'Admin',
    'Supervisor'
]);

/**
 * Roles autorizados para eliminar comunicados.
 *
 * @type {ReadonlySet<string>}
 */
export const COMUNICADOS_DELETE_ROLES = new Set([
    'Admin'
]);

/**
 * Determines whether a role may publish announcements.
 *
 * @param {string} role
 * @returns {boolean}
 */
export const canPublishComunicados = (role) =>
    COMUNICADOS_PUBLISH_ROLES.has(role);

/**
 * Determines whether a role may view announcement readership.
 *
 * @param {string} role
 * @returns {boolean}
 */
export const canViewComunicadoLecturas = (role) =>
    COMUNICADOS_VIEW_LECTURAS_ROLES.has(role);

/**
 * Determines whether a role may delete announcements.
 *
 * @param {string} role
 * @returns {boolean}
 */
export const canDeleteComunicados = (role) =>
    COMUNICADOS_DELETE_ROLES.has(role);

/**
 * Determines whether a role may access announcement management.
 *
 * @param {string} role
 * @returns {boolean}
 */
export const canManageComunicados = (role) =>
    canPublishComunicados(role) ||
    canViewComunicadoLecturas(role);
