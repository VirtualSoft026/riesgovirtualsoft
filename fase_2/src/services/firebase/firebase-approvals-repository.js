/**
 * Repositorio de aprobaciones sobre Firebase Realtime Database (usuarios y permisos).
 *
 * Puerto 1:1 del acceso a datos de `renderPendingUsers()` (app.js 4115-4119), `approveUser()` (4225),
 * `confirmRejectUser()` (4255), `renderPendingPermissions()` (4270-4276) y `updatePermissionStatus()`
 * (4441). La base se inyecta (`database.ref(path)`), así se prueba sin Firebase real.
 *
 * Quién puede escribir lo deciden las reglas (`database.rules.json`): `users/$uid` solo un Admin aprobado;
 * `permissions/$perm_id` Admin o Supervisor aprobados (ver `domain/auth/approval-policy.js`).
 *
 * Diferencia deliberada con app.js (solo para entradas inválidas): una llave vacía/no textual se rechaza ANTES de
 * llamar a Firebase. app.js concatenaría `'users/' + ''` y actualizaría el nodo RAÍZ `users` (escribiría
 * `approved` y `approvalDate` como si fueran usuarios). Con llaves válidas el comportamiento es idéntico.
 *
 * `revertUserToPending` (decisión D9a) no existe en app.js: devuelve un usuario rechazado a pendiente con el payload de
 * `buildUserRevertToPendingUpdate` (`{approved: false, rejectionReason: null}`), sobre el mismo nodo y con la misma
 * regla que aprobar/rechazar (solo Admin aprobado).
 */

import { buildUserApprovalUpdate, buildUserRejectionUpdate, buildUserRevertToPendingUpdate } from '../../domain/auth/approval-policy.js';
import { buildPermissionStatusUpdate, mapSnapshotEntries } from '../../domain/permissions/permission-service.js';

function assertKey(value, errorCode) {
    if (typeof value !== 'string' || value === '') throw new Error(errorCode);
}

/**
 * @param {{database: {ref: (path: string) => any}}} deps
 */
export function createApprovalsRepository({ database }) {
    /** Lista `users` con su llave en `id` (vacía si el nodo no existe). Propaga los fallos de lectura. */
    async function fetchUsers() {
        const snapshot = await database.ref('users').once('value');

        return snapshot.exists() ? mapSnapshotEntries(snapshot.val(), 'id') : [];
    }

    /** Lista `permissions` con su llave en `fb_id` (vacía si el nodo no existe). */
    async function fetchPermissions() {
        const snapshot = await database.ref('permissions').once('value');

        return snapshot.exists() ? mapSnapshotEntries(snapshot.val(), 'fb_id') : [];
    }

    /** Aprueba un usuario: `{approved: true, approvalDate}`. */
    async function approveUser(userId, approvalDateIso) {
        assertKey(userId, 'MISSING_USER_ID');
        await database.ref('users/' + userId).update(buildUserApprovalUpdate(approvalDateIso));
    }

    /** Rechaza un usuario: `{approved: 'Rechazado', rejectionReason}`. */
    async function rejectUser(userId, reason) {
        assertKey(userId, 'MISSING_USER_ID');
        await database.ref('users/' + userId).update(buildUserRejectionUpdate(reason));
    }

    /** Revierte un rechazo (D9a): `{approved: false, rejectionReason: null}` en users/<id>. */
    async function revertUserToPending(userId) {
        assertKey(userId, 'MISSING_USER_ID');
        await database.ref('users/' + userId).update(buildUserRevertToPendingUpdate());
    }

    /** Cambia el estado de un permiso: `{status, notified:false[, rejectionReason]}`. */
    async function updatePermissionStatus(permissionId, newStatus, reason = null) {
        assertKey(permissionId, 'MISSING_PERMISSION_ID');
        await database.ref('permissions/' + permissionId).update(buildPermissionStatusUpdate(newStatus, reason));
    }

    return { fetchUsers, fetchPermissions, approveUser, rejectUser, revertUserToPending, updatePermissionStatus };
}
