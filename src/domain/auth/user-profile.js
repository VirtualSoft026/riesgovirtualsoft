/**
 * Validación del perfil de usuario en la frontera de datos (W-53 c, W-55, CF-3.3 y CF-4.1).
 *
 * `users/{uid}` es la ÚNICA fuente del rol y de la aprobación (DE-1 = b). Lo que llega de Firebase pasa por
 * aquí antes de entrar al dominio: un valor fuera del catálogo no se acepta en silencio. El caché de
 * `localStorage` (`riskOps_currentUser`) nunca decide permisos; si difiere del servidor, prevalece el servidor.
 *
 * Función pura: sin I/O.
 */

import { ROLES } from '../../config/roles.js';

/** Motivos por los que un perfil no permite una sesión. */
export const PROFILE_REJECTION = Object.freeze({
    MISSING: 'perfil-inexistente',
    INVALID: 'perfil-invalido',
    INVALID_ROLE: 'rol-invalido',
    REJECTED: 'cuenta-rechazada',
    PENDING: 'cuenta-pendiente'
});

/** Valor de `approved` con el que un Admin rechaza una cuenta (D9). */
export const APPROVED_REJECTED_VALUE = 'Rechazado';

const VALID_ROLES = new Set(/** @type {string[]} */ (Object.values(ROLES)));

/**
 * @typedef {object} UserProfile
 * @property {string} uid
 * @property {'Admin'|'Supervisor'|'Gestor'} role
 * @property {string} name
 * @property {string} email
 * @property {string} shift
 * @property {string} status
 * @property {boolean} hasSplitShift
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
function text(value) {
    return typeof value === 'string' ? value.trim() : '';
}

/**
 * Valida y normaliza el nodo `users/{uid}`.
 *
 * Reglas:
 * - sin datos → `perfil-inexistente`; si no es un objeto → `perfil-invalido`;
 * - `approved === 'Rechazado'` → `cuenta-rechazada`; cualquier otro valor distinto del booleano `true`
 *   → `cuenta-pendiente` (las reglas de Firebase exigen el booleano, ver laboratorio-local-fase2.md §3);
 * - `role` fuera de Admin, Supervisor o Gestor → `rol-invalido`.
 *
 * @param {string} uid
 * @param {unknown} raw valor leído de `users/{uid}`
 * @returns {{ok: true, profile: UserProfile} | {ok: false, reason: string, rejectionReason?: string}}
 */
export function validateUserProfile(uid, raw) {
    if (raw === null || raw === undefined) return { ok: false, reason: PROFILE_REJECTION.MISSING };
    if (typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: PROFILE_REJECTION.INVALID };

    const data = /** @type {Record<string, unknown>} */ (raw);

    if (data.approved === APPROVED_REJECTED_VALUE) {
        const rejectionReason = text(data.rejectionReason);
        return rejectionReason
            ? { ok: false, reason: PROFILE_REJECTION.REJECTED, rejectionReason }
            : { ok: false, reason: PROFILE_REJECTION.REJECTED };
    }

    if (data.approved !== true) return { ok: false, reason: PROFILE_REJECTION.PENDING };

    const role = text(data.role);

    if (!VALID_ROLES.has(role)) return { ok: false, reason: PROFILE_REJECTION.INVALID_ROLE };

    return {
        ok: true,
        profile: {
            uid: String(uid),
            role: /** @type {UserProfile['role']} */ (role),
            name: text(data.name),
            email: text(data.email),
            shift: text(data.shift),
            status: text(data.status),
            hasSplitShift: data.hasSplitShift === true
        }
    };
}

/**
 * Combina el caché local de sesión con el perfil del servidor. Los campos de identidad y permisos (uid, rol,
 * nombre, correo, turno, turno partido) salen SIEMPRE del servidor; del caché solo se conservan los datos de
 * la sesión en curso que el servidor no tiene en `users/{uid}` (por ejemplo `loginTime` o `loginLogId`).
 *
 * @param {Record<string, unknown>|null} cached
 * @param {UserProfile} profile
 * @returns {Record<string, unknown>}
 */
export function mergeSessionProfile(cached, profile) {
    const base = cached && typeof cached === 'object' && !Array.isArray(cached) ? cached : {};

    return {
        ...base,
        uid: profile.uid,
        role: profile.role,
        name: profile.name || text(base.name),
        email: profile.email || text(base.email),
        shift: profile.shift,
        hasSplitShift: profile.hasSplitShift,
        status: text(base.status) || profile.status || 'Activo'
    };
}
