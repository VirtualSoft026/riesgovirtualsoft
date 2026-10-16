/**
 * HTML de la tabla "Gestión de Usuarios" (vista Aprobaciones). Puerto 1:1 de los literales de
 * `renderPendingUsers()` (app.js 4111-4219): mismo marcado, mismos estilos en línea, mismos `id` de las cajas de
 * acción (`user-action-btns-<id>`, `user-reject-box-<id>`, `user-reason-<id>`) y mismos manejadores `onclick`
 * (`approveUser`, `showUserRejectBox`, `confirmRejectUser`, `cancelRejectUser`, que app.js expone como globales).
 *
 * Sin Firebase. Todo devuelve texto salvo `ensureRejectedFilterOption`, que agrega una `<option>` al selector existente.
 *
 * W-50: el botón "Aprobar" (fila pendiente y fila rechazada) no lleva `onclick`: marca `data-action="approve-user"` y
 * `data-user-id` (escapado) y lo atiende un listener delegado (`bindApproveUserDelegation` en el controlador). Los demás
 * manejadores (`showUserRejectBox`, `confirmRejectUser`, `cancelRejectUser`, `revertRejectedUser`) siguen inline.
 *
 * Decisiones del responsable (2026-10-06, plan maestro §4 ter):
 *  - D2 (incondicional desde W-52, paso 3.1): el rol se escapa en la insignia. app.js lo inserta sin escapar (XSS
 *    almacenado). El resto de campos (nombre, correo, fechas, motivo, ids) ya se escapaban con `escapeHTML` y los ids
 *    de los `onclick` se codifican con `encodeInlineHandlerArg`.
 *  - D9a: la fila de un usuario RECHAZADO (`rejectedActions`, por defecto `true`) muestra el motivo (escapado) y los
 *    botones "Revertir" (`revertRejectedUser`) y "Aprobar" (`approveUser`) dentro de `user-rejected-actions-<id>`.
 * Con `{ rejectedActions: false }` y un rol sin caracteres especiales el HTML es idéntico al de app.js salvo el botón
 * "Aprobar", que usa la delegación de W-50 (`data-action` en vez de `onclick`).
 */

import { escapeHTML, encodeInlineHandlerArg } from '../../utils/sanitization.js';
import { REJECTED_FILTER_OPTION } from '../../domain/permissions/user-approval-list.js';
import { APPROVED_REJECTED_VALUE } from '../../domain/auth/user-profile.js';

/** Acción delegada del botón "Aprobar" de la tabla de usuarios (W-50). */
export const APPROVE_USER_ACTION = 'approve-user';

/** Prefijo del contenedor de acciones de una fila rechazada (D9a; lo usa el controlador para deshabilitar botones). */
export const USER_REJECTED_ACTIONS_PREFIX = 'user-rejected-actions-';

/** Fila de "sin resultados" (app.js 4177). */
export const NO_USERS_ROW_HTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay usuarios que coincidan con los filtros.</td></tr>`;

/**
 * Celda de acción de un usuario RECHAZADO con la opción de revertir (decisión D9a). Todo dato del usuario va escapado
 * (motivo) o codificado para el manejador en línea (id).
 *
 * @param {{id: string, rejectionReason?: unknown}} user
 * @returns {string}
 */
export function buildRejectedUserActionHtml(user) {
    const reason = user.rejectionReason === undefined || user.rejectionReason === null || user.rejectionReason === ''
        ? 'No especificado'
        : user.rejectionReason;

    return `
                <span style="color: var(--danger); font-weight: bold;"><i class='bx bx-x'></i> Rechazado</span>
                <br><small style="color: var(--text-secondary);">Motivo: ${escapeHTML(reason)}</small>
                <div id="${USER_REJECTED_ACTIONS_PREFIX}${escapeHTML(user.id)}" style="display:flex; justify-content:center; gap:5px; margin-top:5px;">
                    <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px;" title="Devolver a Pendiente de aprobación" data-action="revert-rejected-user" data-user-id="${escapeHTML(user.id)}">Revertir</button>
                    <button class="btn btn-success" style="padding: 5px 10px; font-size: 12px;" data-action="${APPROVE_USER_ACTION}" data-user-id="${escapeHTML(user.id)}">Aprobar</button>
                </div>
            `;
}

/**
 * Celda de acción de un usuario (app.js 4180-4199): Aprobado, Rechazado o botones Aprobar/Rechazar con su caja de
 * motivo oculta. En app.js la rama "Rechazado" no se alcanza (los rechazados no entran en la lista); con D9a la vista
 * "Rechazados" sí la alcanza y, con `rejectedActions` (por defecto), ofrece Revertir/Aprobar.
 *
 * @param {{id: string, approved: unknown, rejectionReason?: unknown}} user
 * @param {{rejectedActions?: boolean}} [options] `false` = etiqueta "Rechazado" de app.js, sin acciones.
 * @returns {string}
 */
export function buildUserActionHtml(user, { rejectedActions = true } = {}) {
    let actionHtml = '';
    if (user.approved === true) {
        actionHtml = `<span style="color: var(--success); font-weight: bold;"><i class='bx bx-check'></i> Aprobado</span>`;
    } else if (user.approved === APPROVED_REJECTED_VALUE && rejectedActions) {
        actionHtml = buildRejectedUserActionHtml(user);
    } else if (user.approved === APPROVED_REJECTED_VALUE) {
        actionHtml = `<span style="color: var(--danger); font-weight: bold;"><i class='bx bx-x'></i> Rechazado</span>`;
    } else {
        actionHtml = `
                <div id="user-action-btns-${escapeHTML(user.id)}" style="display:flex; justify-content:center; gap:5px;">
                    <button class="btn btn-success" style="padding: 5px 10px; font-size: 12px;" data-action="${APPROVE_USER_ACTION}" data-user-id="${escapeHTML(user.id)}">Aprobar</button>
                    <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px;" data-action="show-user-reject-box" data-user-id="${escapeHTML(user.id)}">Rechazar</button>
                </div>
                <div id="user-reject-box-${escapeHTML(user.id)}" style="display:none; flex-direction:column; gap:5px; margin-top:5px;">
                    <input type="text" id="user-reason-${escapeHTML(user.id)}" name="user-reason-${escapeHTML(user.id)}" aria-label="Motivo de rechazo" placeholder="Motivo de rechazo" class="modern-input" style="padding:4px; font-size:11px; width:100%;">
                    <div style="display:flex; gap:5px; justify-content:center;">
                        <button class="btn btn-danger" style="padding: 2px 5px; font-size: 10px;" data-action="confirm-reject-user" data-user-id="${escapeHTML(user.id)}">Confirmar</button>
                        <button class="btn btn-outline" style="padding: 2px 5px; font-size: 10px;" data-action="cancel-reject-user" data-user-id="${escapeHTML(user.id)}">Cancelar</button>
                    </div>
                </div>
            `;
    }
    return actionHtml;
}

/**
 * Insignia del rol (app.js 4204).
 *
 * El rol se escapa SIEMPRE (D2, W-52): app.js lo inserta sin escapar y, aunque las reglas limitan el rol a "Gestor"
 * en el alta, un Admin o un nodo creado antes de las reglas pueden guardar cualquier texto.
 *
 * @param {{approved: unknown, role: unknown}} user
 */
export function buildUserRoleBadgeHtml(user) {
    const role = escapeHTML(user.role);

    const statusBadge = user.approved ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success);">${role}</span>` : `<span class="badge pending">${role}</span>`;
    return statusBadge;
}

/**
 * Fila completa de un usuario (app.js 4206-4217).
 *
 * @param {object} user
 * @param {{regDateStr: string, appDateStr: string, rejectedActions?: boolean}} parts Textos de fecha ya calculados y la
 *   opción de la decisión D9a (`rejectedActions`, `true` por defecto). El rol se escapa siempre (D2, W-52).
 * @returns {string}
 */
export function buildUserRowHtml(user, { regDateStr, appDateStr, rejectedActions = true }) {
    const actionHtml = buildUserActionHtml(user, { rejectedActions });
    const statusBadge = buildUserRoleBadgeHtml(user);

    return `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px;">${escapeHTML(user.name)}</td>
                <td style="padding: 12px; color: var(--text-secondary);">${escapeHTML(user.email)}</td>
                <td style="padding: 12px;">${statusBadge}</td>
                <td style="padding: 12px; font-size: 12px;">${escapeHTML(regDateStr)}</td>
                <td style="padding: 12px; font-size: 12px;">${escapeHTML(appDateStr)}</td>
                <td style="padding: 12px; text-align: center;">
                    ${actionHtml}
                </td>
            </tr>
        `;
}

/**
 * Agrega la opción "Rechazados" al `<select id="filterAprobacionesStatus">` existente si aún no la tiene (decisión
 * D9a). index.html no se modifica: la opción se crea en el cliente con `textContent` (sin HTML) y con el mismo estilo
 * que las opciones originales. Idempotente. Si el elemento no expone `options` (no es un `<select>` real) no hace nada.
 *
 * @param {{createElement: (tag: string) => any}} doc
 * @param {any} select Elemento `filterAprobacionesStatus` (o `null`).
 * @returns {boolean} `true` si la opción quedó disponible (ya existía o se agregó).
 */
export function ensureRejectedFilterOption(doc, select) {
    if (!select || !select.options || typeof select.appendChild !== 'function') return false;

    const exists = Array.prototype.some.call(select.options, (o) => o && o.value === REJECTED_FILTER_OPTION.value);
    if (exists) return true;

    const option = doc.createElement('option');
    option.value = REJECTED_FILTER_OPTION.value;
    option.textContent = REJECTED_FILTER_OPTION.text;
    if (option.style) option.style.color = 'black';
    select.appendChild(option);

    return true;
}
