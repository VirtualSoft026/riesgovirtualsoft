/**
 * HTML de la bandeja de permisos de la vista Aprobaciones (pendientes + historial). Puerto 1:1 de los literales de
 * `renderPendingPermissions()` (app.js 4267-4389): mismo marcado, estilos en línea, `id` de las cajas
 * (`perm-action-btns-<id>`, `perm-approve-box-<id>`, `perm-approve-reason-<id>`, `perm-reject-box-<id>`,
 * `perm-reason-<id>`) y manejadores `onclick` (`showPermApproveBox`, `showPermRejectBox`, `confirmApprovePerm`,
 * `confirmRejectPerm`, `cancelApprovePerm`, `cancelRejectPerm`, globales de app.js).
 *
 * Sin DOM ni Firebase: solo devuelve texto.
 */

import { escapeHTML, encodeInlineHandlerArg } from '../../utils/sanitization.js';
import { PERMISSION_STATUS } from '../../utils/constants.js';

/** Fila de "sin permisos pendientes" (app.js 4313). */
export const NO_PENDING_PERMISSIONS_ROW_HTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay permisos pendientes de aprobación.</td></tr>`;

/** Fila de "sin historial" (app.js 4371). */
export const NO_PERMISSION_HISTORY_ROW_HTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay historial de permisos procesados.</td></tr>`;

/**
 * Fila de un permiso pendiente (app.js 4317-4363).
 *
 * @param {object} p Permiso con `fb_id`, `gestor`, `tipo`, `fecha`, `horaInicio`, `horaFin`, `motivo`.
 * @param {string|undefined} createdTimeText Resultado de `resolvePermissionCreatedTimeText(p)`.
 * @returns {string}
 */
export function buildPendingPermissionRowHtml(p, createdTimeText) {
    return `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px; font-weight: 600; color: var(--text-primary);">${escapeHTML(p.gestor)}</td>
                <td style="padding: 12px;">
                    <span class="badge pending">${escapeHTML(p.tipo)}</span>
                    <br><small style="font-size:10px; color:var(--accent-primary); font-weight:500;"><i class='bx bx-time-five'></i> ${escapeHTML(createdTimeText)}</small>
                </td>
                <td style="padding: 12px; color: var(--text-secondary); font-size: 12px; white-space: nowrap;"><strong>${escapeHTML(p.fecha)}</strong><br><span style="opacity: 0.85;">${escapeHTML(p.horaInicio)} a ${escapeHTML(p.horaFin)}</span></td>
                <td style="padding: 12px; font-size: 13px; min-width: 250px;">
                    <div style="background: rgba(255, 255, 255, 0.04); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--glass-border); color: var(--text-primary); line-height: 1.45; word-break: break-word; white-space: pre-wrap;">
                        ${escapeHTML(p.motivo || 'Sin observación')}
                    </div>
                </td>
                <td style="padding: 12px; text-align: center; min-width: 220px;">
                    <div id="perm-action-btns-${escapeHTML(p.fb_id)}" style="display:flex; justify-content:center; gap:8px;">
                        <button class="btn btn-success" style="padding: 6px 14px; font-size: 12px; display:inline-flex; align-items:center; gap:4px;" onclick="showPermApproveBox(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))"><i class='bx bx-check' style="font-size:16px;"></i> Aprobar</button>
                        <button class="btn btn-danger" style="padding: 6px 14px; font-size: 12px; display:inline-flex; align-items:center; gap:4px;" onclick="showPermRejectBox(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))"><i class='bx bx-x' style="font-size:16px;"></i> Rechazar</button>
                    </div>
                    <div id="perm-approve-box-${escapeHTML(p.fb_id)}" style="display:none; flex-direction:column; gap:8px; margin-top:5px; background: rgba(16, 185, 129, 0.08); padding: 10px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3);">
                        <label for="perm-approve-reason-${escapeHTML(p.fb_id)}" style="font-size:11px; font-weight:600; color:var(--success); text-align:left;">Observación de aprobación:</label>
                        <textarea id="perm-approve-reason-${escapeHTML(p.fb_id)}" name="perm-approve-reason-${escapeHTML(p.fb_id)}" placeholder="Escribe un comentario u observación para el gestor..." class="modern-input" style="padding:8px; font-size:12px; width:100%; min-height:60px; resize:vertical; box-sizing:border-box; border-radius:6px; font-family:inherit;"></textarea>
                        <div style="display:flex; gap:6px; justify-content:flex-end;">
                            <button class="btn btn-success" style="padding: 5px 12px; font-size: 11px;" onclick="confirmApprovePerm(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))">Confirmar Aprobar</button>
                            <button class="btn btn-outline" style="padding: 5px 10px; font-size: 11px;" onclick="cancelApprovePerm(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))">Cancelar</button>
                        </div>
                    </div>
                    <div id="perm-reject-box-${escapeHTML(p.fb_id)}" style="display:none; flex-direction:column; gap:8px; margin-top:5px; background: rgba(239, 68, 68, 0.08); padding: 10px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);">
                        <label for="perm-reason-${escapeHTML(p.fb_id)}" style="font-size:11px; font-weight:600; color:var(--danger); text-align:left;">Motivo de rechazo:</label>
                        <textarea id="perm-reason-${escapeHTML(p.fb_id)}" name="perm-reason-${escapeHTML(p.fb_id)}" placeholder="Escribe la razón por la cual se rechaza..." class="modern-input" style="padding:8px; font-size:12px; width:100%; min-height:60px; resize:vertical; box-sizing:border-box; border-radius:6px; font-family:inherit;"></textarea>
                        <div style="display:flex; gap:6px; justify-content:flex-end;">
                            <button class="btn btn-danger" style="padding: 5px 12px; font-size: 11px;" onclick="confirmRejectPerm(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))">Confirmar Rechazo</button>
                            <button class="btn btn-outline" style="padding: 5px 10px; font-size: 11px;" onclick="cancelRejectPerm(decodeURIComponent('${encodeInlineHandlerArg(p.fb_id)}'))">Cancelar</button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
}

/**
 * Fila del historial de un permiso procesado (app.js 4375-4385).
 *
 * @param {object} p Permiso con `status` distinto de `Pendiente`.
 * @returns {string}
 */
export function buildPermissionHistoryRowHtml(p) {
    const statusBadge = p.status === PERMISSION_STATUS.APPROVED ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success);"><i class='bx bx-check'></i> Aprobado</span>` : `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: var(--danger);"><i class='bx bx-x'></i> Rechazado</span>`;

    return `
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <td style="padding: 12px; font-weight: 500;">${escapeHTML(p.gestor)}</td>
                        <td style="padding: 12px;">${escapeHTML(p.tipo)}</td>
                        <td style="padding: 12px;">${statusBadge}</td>
                        <td style="padding: 12px; color: var(--text-secondary); font-size: 13px;">${escapeHTML(p.fecha)}</td>
                        <td style="padding: 12px; font-size: 13px; color: var(--text-secondary);">${escapeHTML(p.rejectionReason || '-')}</td>
                    </tr>
                `;
}
