/**
 * Cajas de acción en línea de la vista Aprobaciones (botones Aprobar/Rechazar ↔ caja de motivo).
 *
 * Reemplaza, con UNA utilidad parametrizada, las seis funciones casi idénticas de app.js:
 * `showUserRejectBox` (4236) / `cancelRejectUser` (4241), `showPermRejectBox` (4391) / `cancelRejectPerm`
 * (4396 y su duplicado 4422), `showPermApproveBox` (4411) / `cancelApprovePerm` (4416).
 * Cada tipo de caja se describe con los prefijos de `id` que usan los HTML de `pending-users-table.js` y
 * `pending-permissions-table.js`. Mismo comportamiento: mostrar oculta los botones y muestra la caja
 * (`display:flex`); cancelar hace lo inverso y VACÍA el campo de motivo.
 *
 * Como en app.js, si falta algún elemento el acceso lanza `TypeError` (no se enmascara).
 *
 * `setApprovalButtonsDisabled` (decisión D7) no existe en app.js: deshabilita los botones de una fila mientras su
 * escritura está en vuelo.
 */

import { USER_REJECTED_ACTIONS_PREFIX } from './pending-users-table.js';

export const APPROVAL_BOX = Object.freeze({
    USER_REJECT: Object.freeze({ actionsPrefix: 'user-action-btns-', boxPrefix: 'user-reject-box-', reasonPrefix: 'user-reason-' }),
    PERMISSION_REJECT: Object.freeze({ actionsPrefix: 'perm-action-btns-', boxPrefix: 'perm-reject-box-', reasonPrefix: 'perm-reason-' }),
    PERMISSION_APPROVE: Object.freeze({ actionsPrefix: 'perm-action-btns-', boxPrefix: 'perm-approve-box-', reasonPrefix: 'perm-approve-reason-' })
});

/**
 * Muestra la caja de motivo y oculta los botones (app.js 4236, 4391, 4411).
 *
 * @param {{getElementById: (id: string) => any}} doc
 * @param {{actionsPrefix: string, boxPrefix: string}} box Uno de `APPROVAL_BOX`.
 * @param {string} id
 */
export function showApprovalBox(doc, box, id) {
    doc.getElementById(box.actionsPrefix + id).style.display = 'none';
    doc.getElementById(box.boxPrefix + id).style.display = 'flex';
}

/**
 * Cancela: oculta la caja, muestra los botones y vacía el motivo (app.js 4241, 4396, 4416, 4422).
 */
export function cancelApprovalBox(doc, box, id) {
    doc.getElementById(box.boxPrefix + id).style.display = 'none';
    doc.getElementById(box.actionsPrefix + id).style.display = 'flex';
    doc.getElementById(box.reasonPrefix + id).value = '';
}

/** Motivo escrito, recortado (app.js 4248, 4403, 4429). */
export function readApprovalReason(doc, box, id) {
    return doc.getElementById(box.reasonPrefix + id).value.trim();
}

/**
 * Habilita o deshabilita TODOS los botones de los contenedores indicados (decisión D7: el botón queda deshabilitado
 * desde el primer clic mientras la escritura está en vuelo). Tolerante: un contenedor inexistente o un elemento sin
 * `querySelectorAll` se ignora (la guarda `isSubmitting` del controlador es la protección real; esto es la señal
 * visual). app.js no deshabilita nada.
 *
 * @param {{getElementById: (id: string) => any}} doc
 * @param {string[]} containerIds
 * @param {boolean} disabled
 */
export function setApprovalButtonsDisabled(doc, containerIds, disabled) {
    for (const id of containerIds) {
        const container = doc.getElementById(id);
        if (!container || typeof container.querySelectorAll !== 'function') continue;

        Array.prototype.forEach.call(container.querySelectorAll('button'), (button) => {
            button.disabled = disabled;
        });
    }
}

/** Contenedores con botones de acción de un usuario (pendiente y rechazado). */
export function userActionContainerIds(id) {
    return [
        APPROVAL_BOX.USER_REJECT.actionsPrefix + id,
        APPROVAL_BOX.USER_REJECT.boxPrefix + id,
        USER_REJECTED_ACTIONS_PREFIX + id
    ];
}

/** Contenedores con botones de acción de un permiso (botones, caja de aprobar y caja de rechazar). */
export function permissionActionContainerIds(id) {
    return [
        APPROVAL_BOX.PERMISSION_REJECT.actionsPrefix + id,
        APPROVAL_BOX.PERMISSION_APPROVE.boxPrefix + id,
        APPROVAL_BOX.PERMISSION_REJECT.boxPrefix + id
    ];
}
