/**
 * Lógica pura de la bandeja de permisos del supervisor/administrador (vista Aprobaciones).
 *
 * Puerto 1:1 de la parte sin efectos de `renderPendingPermissions()` (app.js 4267-4389: filtrar pendientes,
 * ordenar, limitar a 5, armar el historial y la hora de solicitud), de `confirmApprovePerm()` (4428) y de
 * `updatePermissionStatus()` (4433: payload de escritura y mensaje).
 *
 * Los estados vienen de `PERMISSION_STATUS` (utils/constants.js): 'Pendiente', 'Aprobado', 'Rechazado',
 * idénticos a los literales de app.js (lo verifica la prueba diferencial).
 *
 * Sin DOM, sin Firebase, sin `Date.now()`.
 */

import { PERMISSION_STATUS } from '../../utils/constants.js';
import {
    APPROVALS_LIST_LIMIT,
    APPROVAL_MESSAGES,
    DEFAULT_PERMISSION_APPROVAL_REASON,
    validateRejectionReason
} from '../auth/approval-policy.js';

/**
 * Convierte el valor de un nodo Firebase (`{llave: registro}`) en una lista de registros con su llave
 * en `idField` (app.js 4271-4275 usa `fb_id` para permisos y 4116-4118 `id` para usuarios).
 *
 * @param {Record<string, object>|null|undefined} data Resultado de `snapshot.val()`.
 * @param {string} idField
 * @returns {object[]}
 */
export function mapSnapshotEntries(data, idField) {
    if (!data) return [];

    return Object.keys(data).map((key) => ({ ...data[key], [idField]: key }));
}

/**
 * Texto de la hora de solicitud de un permiso (app.js 4309-4316): `horaSolicitud` si existe; si no, se
 * deriva de `id` (marca de tiempo) con formato `es-CO`. Si no hay ninguno de los dos, queda `undefined`.
 *
 * @param {{horaSolicitud?: string, id?: number|string}} permission
 * @returns {string|undefined}
 */
export function resolvePermissionCreatedTimeText(permission) {
    let createdTimeText = permission.horaSolicitud;

    if (!createdTimeText && permission.id) {
        try {
            const d = new Date(permission.id);
            createdTimeText = `${d.toLocaleDateString('es-CO')} ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
        } catch (err) {
            createdTimeText = 'N/A';
        }
    }

    return createdTimeText;
}

/**
 * Prepara lo que `renderPendingPermissions()` pinta: pendientes (más recientes primero, máximo 5), aviso de
 * recorte e historial (procesados, `id` descendente).
 *
 * Fiel a app.js, incluido que NO hay filtro de búsqueda (la variable `searchVal` de app.js 4278-4279 se
 * calcula y nunca se usa).
 *
 * @param {object[]} permisos Lista con `fb_id`.
 * @returns {{pending: object[], total: number, truncated: boolean, noticeText: string|null, history: object[]}}
 */
export function preparePermissionsView(permisos) {
    let pending = permisos.filter((p) => p.status === PERMISSION_STATUS.PENDING);

    // Más reciente primero (app.js 4284-4286). El comparador usa NaN si `fecha` no es válida: se conserva.
    pending.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    let truncated = false;
    let noticeText = null;
    let total = pending.length;

    if (pending.length > APPROVALS_LIST_LIMIT) {
        total = pending.length;
        pending = pending.slice(0, APPROVALS_LIST_LIMIT);
        truncated = true;
        noticeText = `Mostrando los 5 permisos más recientes de ${total} pendientes.`;
    }

    const history = permisos.filter((p) => p.status !== PERMISSION_STATUS.PENDING);
    history.sort((a, b) => b.id - a.id);

    return { pending, total, truncated, noticeText, history };
}

/**
 * Payload de `updatePermissionStatus()` (app.js 4435-4439): estado nuevo, `notified:false` (para que el
 * gestor reciba la notificación) y, si hay `reason`, `rejectionReason`.
 *
 * Nota (hallazgo): el comentario de una APROBACIÓN también se guarda en `rejectionReason`, porque así lo
 * hace app.js y así lo lee el historial (columna "Motivo"). Se conserva.
 *
 * @param {string} newStatus
 * @param {string|null} [reason]
 */
export function buildPermissionStatusUpdate(newStatus, reason = null) {
    const updates = { status: newStatus, notified: false };

    if (reason) {
        updates.rejectionReason = reason;
    }

    return updates;
}

/** Observación efectiva al aprobar: la escrita (recortada) o el texto por defecto (app.js 4429-4430). */
export function resolveApprovalReason(rawReason) {
    const reason = String(rawReason === null || rawReason === undefined ? '' : rawReason).trim();

    return reason || DEFAULT_PERMISSION_APPROVAL_REASON;
}

/**
 * Decisión completa al CONFIRMAR APROBAR un permiso (app.js 4428-4431).
 *
 * @param {unknown} rawReason
 * @returns {{status: string, reason: string}}
 */
export function buildApproveDecision(rawReason) {
    return { status: PERMISSION_STATUS.APPROVED, reason: resolveApprovalReason(rawReason) };
}

/**
 * Decisión completa al CONFIRMAR RECHAZO de un permiso (app.js 4402-4409): el motivo es obligatorio.
 *
 * @param {unknown} rawReason
 * @returns {{ok: true, status: string, reason: string}|{ok: false, message: string}}
 */
export function buildRejectDecision(rawReason) {
    const check = validateRejectionReason(rawReason);

    if (!check.ok) return check;

    return { ok: true, status: PERMISSION_STATUS.REJECTED, reason: check.reason };
}

/** Mensaje de éxito tras actualizar el estado de un permiso (app.js 4442). */
export function getPermissionUpdatedMessage(newStatus) {
    return APPROVAL_MESSAGES.permissionUpdated(newStatus);
}
