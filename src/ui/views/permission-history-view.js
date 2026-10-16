/**
 * Vistas de permisos de la pestaña "Permisos" y de las notificaciones de la campana:
 * historial (`loadPermisos()`, app.js 1894-1963), modal de detalle (`openPermisoDetailModal()`,
 * app.js 1966-2061) y las listas de notificaciones de `initApp()` (app.js 2972-3064, rama Admin/Supervisor
 * y rama Gestor).
 *
 * Solo genera cadenas y decide qué permisos se ven; la lectura de Firebase y el DOM quedan en
 * `controllers/task-loaders-controller.js`. Las plantillas se copiaron literalmente de `app.js` para que
 * el HTML sea idéntico.
 */

import { escapeHTML, encodeInlineHandlerArg } from '../../utils/sanitization.js';

export const PERMISSIONS_HISTORY_EMPTY_HTML =
    '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No hay permisos en el historial.</p>';

export const PERMISSIONS_NONE_REGISTERED_HTML =
    '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No hay permisos registrados.</p>';

export const NOTIFICATIONS_EMPTY_HTML =
    '<p style="font-size: 12px; color: var(--text-secondary); text-align: center; padding: 10px;">No tienes notificaciones nuevas.</p>';

/**
 * UID por el que se filtra la consulta de permisos de un no-administrador (app.js 1897-1901).
 * Devuelve `null` si la consulta no se filtra (Admin/Supervisor o sin usuario) y LANZA si no se puede
 * determinar el uid de un usuario que sí debe filtrarse (`loadPermisos()` lo atrapa y lo registra).
 *
 * @param {{role?: string, uid?: string}|null|undefined} user
 * @param {string|null|undefined|(() => (string|null|undefined))} authUid uid de `firebase.auth().currentUser`, o una
 *   función que lo entrega: se evalúa SOLO si hace falta (el original solo consulta `firebase.auth()` si el usuario
 *   filtrable no trae `uid`; un Admin/Supervisor nunca lo consulta).
 * @returns {string|null}
 */
export function resolvePermissionsQueryUid(user, authUid) {
    if (user && user.role !== 'Admin' && user.role !== 'Supervisor') {
        const uid = user.uid || (typeof authUid === 'function' ? authUid() : authUid);

        if (!uid) throw new Error('No se pudo determinar el UID del usuario autenticado');

        return uid;
    }

    return null;
}

/**
 * Convierte el valor de `permissions` en lista con `fb_id`, y la lista visible: el Gestor solo ve lo suyo
 * (por nombre), ordenada por id descendente (app.js 1908-1920).
 *
 * `all` es lo que `allLoadedPermissions` guarda (sin el filtro de privacidad), usado luego por el detalle.
 *
 * @param {Record<string, object>} data
 * @param {{role?: string, name?: string}|null|undefined} user
 * @returns {{all: Array<object>, visible: Array<object>}}
 */
export function selectVisiblePermissions(data, user) {
    let permisos = Object.keys(data).map((k) => ({ ...data[k], fb_id: k }));
    const all = permisos;

    // Filtro de privacidad: Gestor solo ve lo suyo. Admin ve todo.
    if (user && user.role !== 'Admin' && user.role !== 'Supervisor') {
        permisos = permisos.filter((p) => p.gestor === user.name);
    }

    // Ordenar por ID descendente (más nuevos primero)
    permisos.sort((a, b) => b.id - a.id);

    return { all, visible: permisos };
}

/**
 * Texto de "Solicitado el": `horaSolicitud` o, si falta, la fecha derivada del id (app.js 1932-1938).
 *
 * HALLAZGO: `new Date(id).toLocale…()` nunca lanza con un id inválido (devuelve "Invalid Date"), así que
 * el `catch` que devuelve 'N/A' es inalcanzable por esa vía. Se conserva fiel.
 *
 * @param {{horaSolicitud?: string, id?: number}} permiso
 * @returns {string|undefined}
 */
export function resolvePermissionCreatedText(permiso) {
    let createdTimeText = permiso.horaSolicitud;

    if (!createdTimeText && permiso.id) {
        try {
            const d = new Date(permiso.id);
            createdTimeText = `${d.toLocaleDateString('es-CO')} ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
        } catch (err) {
            createdTimeText = 'N/A';
        }
    }

    return createdTimeText;
}

/**
 * Elemento del historial (app.js 1927-1961).
 *
 * @param {{status?: string, rejectionReason?: string, tipo?: string, gestor?: string, fecha?: string, horaInicio?: string, horaFin?: string, horaSolicitud?: string, id?: number, fb_id: string}} p
 * @returns {string}
 */
export function buildPermissionHistoryItemHTML(p) {
    let icon = 'bx-time';
    let badgeClass = 'pending';

    if (p.status === 'Aprobado') { badgeClass = 'in-progress'; icon = 'bx-check-double'; }
    if (p.status === 'Rechazado') { badgeClass = 'not-done'; icon = 'bx-x'; }

    const rejectionHtml = p.rejectionReason ? `<br><small style="color:var(--danger)">Razón/Obs: ${escapeHTML(p.rejectionReason)}</small>` : '';

    const createdTimeText = resolvePermissionCreatedText(p);

    return `
                    <div class="tree-item" style="margin-top: 10px; cursor: pointer; transition: all 0.2s ease; border-radius: 8px;" data-action="open-permiso-detail-modal" data-fb-id="${escapeHTML(p.fb_id)}" title="Haz clic para ver el detalle completo de este permiso">
                        <div class="tree-header" style="padding: 12px; display: flex; align-items: center; gap: 10px;">
                            <i class='bx ${icon}' style="font-size: 20px;"></i>
                            <div style="display:flex; flex-direction:column; flex: 1;">
                                <strong style="font-size: 14px; color: var(--text-primary);">${escapeHTML(p.tipo)}</strong>
                                <small style="font-size:11px; opacity:0.8; color: var(--text-secondary); margin-top: 2px;">
                                    ${escapeHTML(p.gestor)} | ${escapeHTML(p.fecha)} (${escapeHTML(p.horaInicio)} a ${escapeHTML(p.horaFin)})${rejectionHtml}
                                </small>
                                <small style="font-size:10px; color: var(--accent-primary); margin-top: 2px; font-weight: 500;">
                                    <i class='bx bx-calendar-event'></i> Solicitado el: ${escapeHTML(createdTimeText || 'N/A')}
                                </small>
                            </div>
                            <span class="badge ${badgeClass}" style="margin-left: auto; padding: 4px 10px; font-size: 11px;">${escapeHTML(p.status)}</span>
                            <i class='bx bx-chevron-right' style="font-size: 18px; color: var(--text-secondary); opacity: 0.6;"></i>
                        </div>
                    </div>
                `;
}

/**
 * Cuerpo del modal de detalle (app.js 1984-2052).
 *
 * @param {object} perm permiso con `fb_id`
 * @returns {string}
 */
export function buildPermissionDetailHTML(perm) {
    let statusColor = 'var(--warning)';
    let statusIcon = 'bx-time';

    if (perm.status === 'Aprobado') { statusColor = 'var(--success)'; statusIcon = 'bx-check-circle'; }
    if (perm.status === 'Rechazado') { statusColor = 'var(--danger)'; statusIcon = 'bx-x-circle'; }

    let fechaRange = perm.fecha;

    if (perm.fechaDesde && perm.fechaHasta && perm.fechaDesde !== perm.fechaHasta) {
        fechaRange = `Desde ${perm.fechaDesde} hasta ${perm.fechaHasta}`;
    }

    const createdTimeText = resolvePermissionCreatedText(perm);

    return `
        <div style="display: flex; flex-direction: column; gap: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 12px 15px; border-radius: 10px; border: 1px solid var(--glass-border);">
                <div>
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary); display: block;">Estado de Solicitud</span>
                    <strong style="font-size: 16px; color: ${statusColor}; display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                        <i class='bx ${statusIcon}'></i> ${escapeHTML(perm.status)}
                    </strong>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary); display: block;">Tipo de Permiso</span>
                    <strong style="font-size: 14px; color: var(--accent-primary); margin-top: 2px; display: block;">${escapeHTML(perm.tipo)}</strong>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                <div style="background: rgba(255,255,255,0.02); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Gestor Solicitante</small>
                    <strong style="font-size: 13px; color: var(--text-primary); margin-top: 3px; display: block;">${escapeHTML(perm.gestor)}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Fecha de Solicitud (Creación)</small>
                    <strong style="font-size: 13px; color: var(--accent-primary); margin-top: 3px; display: block;">${escapeHTML(createdTimeText || 'N/A')}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Fecha del Permiso</small>
                    <strong style="font-size: 13px; color: var(--text-primary); margin-top: 3px; display: block;">${escapeHTML(fechaRange)}</strong>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--glass-border);">
                    <small style="color: var(--text-secondary); display: block; font-size: 11px;">Horario Solicitado</small>
                    <strong style="font-size: 13px; color: var(--text-primary); margin-top: 3px; display: block;">${escapeHTML(perm.horaInicio || 'N/A')} a ${escapeHTML(perm.horaFin || 'N/A')}</strong>
                </div>
            </div>

            <div style="background: rgba(255,255,255,0.03); padding: 12px 15px; border-radius: 10px; border: 1px solid var(--glass-border);">
                <small style="color: var(--accent-primary); display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Motivo / Justificación del Gestor:</small>
                <div style="font-size: 13px; color: var(--text-primary); line-height: 1.5; white-space: pre-wrap; word-break: break-word;">
                    ${escapeHTML(perm.motivo || 'Sin justificación detallada.')}
                </div>
            </div>

            ${perm.rejectionReason ? `
                <div style="background: rgba(239, 68, 68, 0.08); padding: 12px 15px; border-radius: 10px; border: 1px solid rgba(239, 68, 68, 0.3);">
                    <small style="color: var(--danger); display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Observación / Razón de Respuesta:</small>
                    <div style="font-size: 13px; color: var(--text-primary); line-height: 1.5; white-space: pre-wrap; word-break: break-word;">
                        ${escapeHTML(perm.rejectionReason)}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Notificaciones de la campana para Admin/Supervisor: permisos pendientes, más nuevos primero; cuenta como
 * no leído el que tiene `notified_admin === false` (app.js 2961-3004).
 *
 * @param {Record<string, object>|null} data valor de `permissions` (null si no existe)
 * @returns {{html: string, unreadCount: number}}
 */
export function buildAdminPermissionNotifications(data) {
    let unreadCount = 0;
    let notifsHtml = '';

    if (data) {
        const perms = Object.keys(data).map((k) => ({ ...data[k], fb_id: k }));
        const pending = perms.filter((p) => p.status === 'Pendiente');
        pending.sort((a, b) => b.id - a.id);

        pending.forEach((p) => {
            if (p.notified_admin === false) unreadCount++;
            const bg = p.notified_admin === false ? 'rgba(59,130,246,0.1)' : 'transparent';

            notifsHtml += `
                            <div style="background: ${bg}; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); display: flex; gap: 10px; align-items: start; cursor: pointer; transition: background 0.2s;" data-action="go-to-notification-nav" data-nav="navAprobaciones">
                                <i class='bx bx-time' style="color: var(--warning); font-size: 18px; margin-top: 2px;"></i>
                                <div style="flex-grow: 1;">
                                    <div style="font-size: 12px; font-weight: 500; color: var(--text-primary);">Nuevo Permiso Solicitado</div>
                                    <div style="font-size: 11px; color: var(--text-secondary);">${escapeHTML(p.gestor)} - ${escapeHTML(p.tipo)}</div>
                                </div>
                            </div>
                        `;
        });
    }

    return { html: notifsHtml === '' ? NOTIFICATIONS_EMPTY_HTML : notifsHtml, unreadCount };
}

/**
 * Notificaciones de la campana para el Gestor: sus permisos ya resueltos (no Pendiente); no leído =
 * `notified === false` (app.js 3014-3064).
 *
 * @param {Record<string, object>|null} data valor de `permissions` filtrado por su uid
 * @returns {{html: string, unreadCount: number}}
 */
export function buildGestorPermissionNotifications(data) {
    let unreadCount = 0;
    let notifsHtml = '';

    if (data) {
        const perms = Object.keys(data).map((k) => ({ ...data[k], fb_id: k }));
        // Solo finalizados
        const finished = perms.filter((p) => p.status !== 'Pendiente');
        finished.sort((a, b) => b.id - a.id);

        finished.forEach((p) => {
            if (p.notified === false) unreadCount++;
            const bg = p.notified === false ? 'rgba(59,130,246,0.1)' : 'transparent';
            const iconColor = p.status === 'Aprobado' ? 'var(--success)' : 'var(--danger)';
            const icon = p.status === 'Aprobado' ? 'bx-check-double' : 'bx-x';
            const reasonHtml = p.rejectionReason ? `<div style="font-size:11px; color:var(--danger); margin-top:2px;">Razón: ${escapeHTML(p.rejectionReason)}</div>` : '';

            notifsHtml += `
                            <div style="background: ${bg}; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); display: flex; gap: 10px; align-items: start; cursor: pointer; transition: background 0.2s;" data-action="go-to-notification-nav" data-nav="navPermisos">
                                <i class='bx ${icon}' style="color: ${iconColor}; font-size: 18px; margin-top: 2px;"></i>
                                <div style="flex-grow: 1;">
                                    <div style="font-size: 12px; font-weight: 500; color: var(--text-primary);">Permiso ${escapeHTML(p.status)}</div>
                                    <div style="font-size: 11px; color: var(--text-secondary);">${escapeHTML(p.fecha)} (${escapeHTML(p.horaInicio)} a ${escapeHTML(p.horaFin)})</div>
                                    ${reasonHtml}
                                </div>
                            </div>
                        `;
        });
    }

    return { html: notifsHtml === '' ? NOTIFICATIONS_EMPTY_HTML : notifsHtml, unreadCount };
}
