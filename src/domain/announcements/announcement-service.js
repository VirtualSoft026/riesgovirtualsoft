/**
 * Lógica de negocio de los Comunicados (módulo "MÓDULO DE COMUNICADOS" de app.js, líneas 6555-6965).
 *
 * Todo lo de este archivo es PURO: sin DOM, sin localStorage, sin Firebase y sin `Date.now()`
 * implícito (la hora llega por parámetro). Los efectos (leer/escribir en Firebase, tocar el DOM,
 * `alert`) viven en `controllers/announcements-controller.js` y en
 * `services/firebase/firebase-announcement-repository.js`.
 *
 * Los permisos por rol (`canPublishComunicados`, `canViewComunicadoLecturas`, `canDeleteComunicados`,
 * `canManageComunicados`) y la sanitización de HTML ya existen en `announcement-capabilities.js` y
 * `utils/sanitization.js`; aquí se IMPORTAN, no se duplican.
 *
 * Seguridad (XSS): toda cadena de usuario que `app.js` escapa con `escapeHTML` sigue escapándose
 * (título, autor, nombre de quien leyó, nombre del pendiente); el contenido rico pasa por
 * `sanitizeAnnouncementHTML`; las claves de Firebase que van dentro de un `onclick` inline se
 * codifican con `encodeInlineHandlerArg`. Los tres ayudantes pueden inyectarse (`helpers`) para que
 * `app.js` use SU propia implementación (la de `app.js` usa el DOM; la de `utils/sanitization.js` no).
 */

import { escapeHTML, encodeInlineHandlerArg, sanitizeAnnouncementHTML } from '../../utils/sanitization.js';

export {
    canPublishComunicados,
    canViewComunicadoLecturas,
    canDeleteComunicados,
    canManageComunicados
} from './announcement-capabilities.js';

/** UID de reserva cuando no hay usuario local ni sesión de Firebase (app.js 6627, 6661, 6694). */
export const UNKNOWN_UID = 'unknown';

const DEFAULT_HELPERS = Object.freeze({ escapeHTML, encodeInlineHandlerArg, sanitizeAnnouncementHTML });

function resolveHelpers(helpers) {
    return helpers ? { ...DEFAULT_HELPERS, ...helpers } : DEFAULT_HELPERS;
}

/** Mensaje de lista vacía del gestor (app.js 6661). */
export const EMPTY_GESTOR_LIST_HTML = '<div class="glass-panel" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay comunicados activos.</div>';

/** Fila de tabla vacía del administrador (app.js 6842). */
export const EMPTY_ADMIN_TABLE_HTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay comunicados creados.</td></tr>';

export const EMPTY_READERS_HTML = '<li style="color: var(--text-secondary); margin-bottom: 5px;">Nadie ha leído esto aún.</li>';
export const LOADING_USERS_HTML = '<li style="color: var(--text-secondary);">Cargando usuarios...</li>';
export const USERS_ERROR_HTML = '<li style="color: var(--danger);">Error al cargar usuarios.</li>';
export const ALL_READ_HTML = '<li style="color: var(--success); margin-bottom: 5px; text-align: center; font-weight: 500;"><i class="bx bx-check-double"></i> ¡Todos han leído!</li>';

/** Textos visibles que `app.js` muestra con `alert()` (se conservan tal cual). */
export const ANNOUNCEMENT_MESSAGES = Object.freeze({
    NOT_ALLOWED_PUBLISH: 'No tienes permiso para publicar comunicados.',
    MISSING_FIELDS: 'Por favor llena todos los campos.',
    PUBLISHED: 'Comunicado publicado exitosamente.',
    PUBLISH_ERROR: 'Error al publicar.',
    READ_ERROR: 'Error al marcar como leído.',
    NOT_ALLOWED_DELETE: 'No tienes permiso para eliminar comunicados.',
    DELETE_ERROR: 'No se pudo eliminar.'
});

/**
 * Fecha en el formato visible de los comunicados (`toLocaleString('es-CO')`).
 *
 * @param {string|number|Date} value
 * @returns {string}
 */
export function formatAnnouncementDate(value) {
    return new Date(value).toLocaleString('es-CO');
}

/**
 * UID con el que se marcan lecturas: el del usuario local; si no hay, el de la sesión de Firebase;
 * si tampoco, 'unknown' (app.js 6627, 6661, 6694).
 *
 * @param {{uid?: string}|null|undefined} currentUser
 * @param {{uid?: string}|null|undefined} authUser `firebase.auth().currentUser`
 * @returns {string}
 */
export function resolveReaderUid(currentUser, authUser) {
    return (currentUser && currentUser.uid) ? currentUser.uid : (authUser ? authUser.uid : UNKNOWN_UID);
}

/**
 * Claves de los comunicados ordenadas por fecha: 'desc' (más reciente primero, listas) o 'asc'
 * (más antiguo primero, cola de urgentes). Comparador idéntico al de app.js (6656, 6711, 6842, 6903).
 *
 * @param {Record<string, {date?: string}>} announcements
 * @param {'asc'|'desc'} [direction]
 * @returns {string[]}
 */
export function sortAnnouncementKeys(announcements, direction = 'desc') {
    const map = announcements || {};

    return Object.keys(map).sort((a, b) => (direction === 'asc'
        ? new Date(map[a].date) - new Date(map[b].date)
        : new Date(map[b].date) - new Date(map[a].date)));
}

/**
 * ¿Ya lo leyó este UID? (verdadero si existe `readBy[uid]`).
 *
 * @param {{readBy?: Record<string, unknown>}} announcement
 * @param {string} uid
 * @returns {boolean}
 */
export function isAnnouncementRead(announcement, uid) {
    return Boolean(announcement.readBy && announcement.readBy[uid]);
}

// ===================================================================================================
// D4 — Lectura única de `readBy/{uid}`: clasificación del fallo de escritura
// ===================================================================================================
//
// Regla real de `database.rules.json` (nodo `announcements/$announcement_id/readBy/$reader_uid`):
//   .write    = approved && auth.uid === $reader_uid && !data.exists() && newData.exists()
//   .validate = newData.hasChildren(['readAt']) && newData.child('readAt').isString()
// Es decir, cada usuario escribe SU lectura UNA sola vez. `app.js` usa `set` a ciegas: si la lectura ya existe
// en el servidor pero el caché local no lo sabe, la base responde PERMISSION_DENIED, `app.js` muestra "Error al
// marcar como leído.", cierra el modal urgente y 500 ms después lo reabre (bucle). Excepción: un Admin puede
// reescribir porque la regla de `$announcement_id` (escritura total) se hereda hacia abajo.
//
// PERMISSION_DENIED es AMBIGUO (duplicidad o permiso real), por eso se distingue con una lectura de verificación
// de `readBy/{uid}` (el controlador la hace; aquí solo se clasifica el error).

/** Tipos de fallo de escritura de una lectura. */
export const READ_FAILURE_KINDS = Object.freeze({
    PERMISSION_DENIED: 'permission-denied',
    NETWORK: 'network',
    OTHER: 'other'
});

/**
 * Clasifica el error de `set` sobre `readBy/{uid}`.
 *  - `permission-denied`: `error.code === 'PERMISSION_DENIED'` (o el texto lo dice). Puede ser duplicidad
 *    ("una sola vez") o un permiso real; el que llama debe verificar con una lectura.
 *  - `network`: sin conexión / caída / tiempo agotado: la lectura NO se registró y NO se debe asumir leída.
 *  - `other`: cualquier otro (p. ej. datos inválidos como `name: undefined`): tampoco se asume leída.
 *
 * @param {unknown} error
 * @returns {'permission-denied'|'network'|'other'}
 */
export function classifyReadWriteError(error) {
    const code = String((error && error.code) || '').toUpperCase().replace(/[\s-]/g, '_');
    const message = String((error && error.message) || error || '');

    if (code === 'PERMISSION_DENIED' || /permission[_ ]denied/i.test(message)) {
        return READ_FAILURE_KINDS.PERMISSION_DENIED;
    }

    if (['NETWORK_ERROR', 'DISCONNECTED', 'UNAVAILABLE', 'OPERATION_FAILED', 'WRITE_CANCELED', 'MAX_RETRIES', 'DEADLINE_EXCEEDED', 'TIMEOUT'].includes(code)
        || /network|disconnect|offline|unavailable|timed? ?out|failed to fetch/i.test(message)) {
        return READ_FAILURE_KINDS.NETWORK;
    }

    return READ_FAILURE_KINDS.OTHER;
}

/**
 * Copia superficial del mapa de comunicados donde los ids "asumidos como leídos" (el servidor ya tenía la
 * lectura pero el caché local aún no) llevan `readBy[uid]`. No muta el original.
 *
 * @param {Record<string, object>} announcements
 * @param {string} uid
 * @param {Record<string, object>} assumedReceipts id de comunicado -> recibo leído en el servidor
 * @returns {Record<string, object>}
 */
export function applyAssumedReads(announcements, uid, assumedReceipts) {
    const map = announcements || {};
    const assumed = assumedReceipts || {};
    const ids = Object.keys(assumed);

    if (ids.length === 0) return map;

    const out = { ...map };

    ids.forEach((id) => {
        if (out[id]) {
            const readBy = out[id].readBy || {};

            out[id] = { ...out[id], readBy: { ...readBy, [uid]: readBy[uid] ? readBy[uid] : assumed[id] } };
        }
    });

    return out;
}

// ===================================================================================================
// D9(c) — Política por rol de los comunicados URGENTES (modal bloqueante "He leído y entendido")
// ===================================================================================================
//
// Decisión del responsable (plan maestro §4 ter, D9 c): Admin y Supervisor reciben el comunicado urgente IGUAL
// que los gestores: modal bloqueante y confirmación obligatoria de lectura (que se registra en `readBy/{uid}`).
// Coincide con lo que ya hacía app.js (`checkUnreadUrgentAnnouncements`, 6705-6730, solo exige uid; NO excluye
// roles). La diferencia con la insignia de "no leídos" (`computeUnreadBadge`, que sí oculta Admin/Supervisor)
// es intencional y NO cambia con esta decisión. La regla real permite a cualquier usuario aprobado escribir su
// propio `readBy/{uid}` (Admin y Supervisor incluidos), así que su confirmación se puede registrar.

/** Único tratamiento vigente: abrir el modal bloqueante y exigir confirmación (registra la lectura). */
export const URGENT_MODAL_MANDATORY = 'modal-bloqueante-con-confirmacion';

/**
 * Política por rol, explícita en código (D9 c). Un rol no listado (vacío o desconocido) recibe el mismo trato que
 * un Gestor, como en app.js.
 */
export const URGENT_ANNOUNCEMENT_ROLE_POLICY = Object.freeze({
    Admin: URGENT_MODAL_MANDATORY,
    Supervisor: URGENT_MODAL_MANDATORY,
    Gestor: URGENT_MODAL_MANDATORY
});

/**
 * Política aplicable a un rol (D9 c).
 *
 * @param {string|undefined} role 'Admin' | 'Supervisor' | 'Gestor' | otro
 * @returns {string} hoy siempre `URGENT_MODAL_MANDATORY`
 */
export function resolveUrgentAnnouncementPolicy(role) {
    return Object.prototype.hasOwnProperty.call(URGENT_ANNOUNCEMENT_ROLE_POLICY, String(role))
        ? URGENT_ANNOUNCEMENT_ROLE_POLICY[String(role)]
        : URGENT_ANNOUNCEMENT_ROLE_POLICY.Gestor;
}

/**
 * ¿Debe abrirse el modal urgente bloqueante para este rol y exigir la confirmación? (D9 c: sí, para todos).
 *
 * @param {string|undefined} role
 * @returns {boolean}
 */
export function requiresUrgentConfirmation(role) {
    return resolveUrgentAnnouncementPolicy(role) === URGENT_MODAL_MANDATORY;
}

/**
 * Cuántos comunicados no ha leído el UID (app.js 6633-6638).
 *
 * @param {Record<string, object>} announcements
 * @param {string} uid
 * @returns {number}
 */
export function countUnreadAnnouncements(announcements, uid) {
    let unreadCount = 0;

    Object.keys(announcements || {}).forEach((key) => {
        const c = announcements[key];

        if (!c.readBy || !c.readBy[uid]) {
            unreadCount += 1;
        }
    });

    return unreadCount;
}

/**
 * Insignia de comunicados sin leer (app.js 6623-6649). Admin, Supervisor o sin usuario: oculta
 * (no se les cuenta nada). Gestor: cuenta los no leídos; con 0 se oculta.
 *
 * @param {{role?: string, uid?: string}|null|undefined} currentUser
 * @param {{uid?: string}|null|undefined} authUser
 * @param {Record<string, object>} announcements
 * @returns {{visible: boolean, count: number}}
 */
export function computeUnreadBadge(currentUser, authUser, announcements) {
    if (!currentUser || currentUser.role === 'Admin' || currentUser.role === 'Supervisor') {
        return { visible: false, count: 0 };
    }

    const uid = resolveReaderUid(currentUser, authUser);
    const count = countUnreadAnnouncements(announcements, uid);

    return { visible: count > 0, count };
}

/**
 * Primer comunicado sin leer, del más antiguo al más reciente (cola del modal urgente, app.js 6705-6730).
 *
 * @param {Record<string, {date?: string, readBy?: object}>} announcements
 * @param {string} uid
 * @returns {{key: string, announcement: object}|null}
 */
export function findNextUnreadUrgent(announcements, uid) {
    const keys = sortAnnouncementKeys(announcements, 'asc');

    for (const key of keys) {
        const c = announcements[key];

        if (!isAnnouncementRead(c, uid)) {
            return { key, announcement: c };
        }
    }

    return null;
}

/**
 * Datos de presentación de un comunicado para el modal urgente y para el modal de lectura
 * (app.js 6716-6719 y 6882-6885). `title`/`author`/`dateText` van como TEXTO (innerText); `bodyHtml`
 * ya sanitizado.
 *
 * @param {{title?: string, author?: string, date?: string, content?: string}} c
 * @param {object} [helpers]
 * @returns {{title: string, author: string, dateText: string, bodyHtml: string}}
 */
export function buildAnnouncementView(c, helpers) {
    const { sanitizeAnnouncementHTML: sanitize } = resolveHelpers(helpers);

    return {
        title: c.title || '',
        author: c.author || '',
        dateText: formatAnnouncementDate(c.date),
        bodyHtml: sanitize(c.content)
    };
}

/**
 * Recibo de lectura que se escribe en `announcements/{id}/readBy/{uid}` (app.js 6695-6698).
 *
 * @param {{name?: string}} currentUser
 * @param {number|Date|string} now
 * @returns {{name: string|undefined, readAt: string}}
 */
export function buildReadReceipt(currentUser, now) {
    return {
        name: currentUser.name,
        readAt: new Date(now).toISOString()
    };
}

/**
 * Valida el formulario de un comunicado nuevo (app.js 6592-6598).
 *
 * @param {{title?: string, rawContentHtml?: string}} form
 * @param {object} [helpers]
 * @returns {{ok: boolean, title: string, content: string}}
 */
export function parseNewAnnouncementForm(form, helpers) {
    const { sanitizeAnnouncementHTML: sanitize } = resolveHelpers(helpers);
    const title = String(form.title).trim();
    const content = sanitize(form.rawContentHtml).trim();

    return { ok: Boolean(title && content), title, content };
}

/**
 * Nombre del autor: nombre, si no correo, si no rol, si no 'Usuario'. NUNCA el nombre de otro rol
 * (app.js 6606-6610).
 *
 * @param {{name?: string, email?: string, role?: string}} currentUser
 * @returns {string}
 */
export function resolveAnnouncementAuthor(currentUser) {
    return currentUser.name || currentUser.email || currentUser.role || 'Usuario';
}

/**
 * Documento a escribir en `announcements/{id}` (app.js 6603-6612). Cumple lo que exige la regla de
 * Firebase para Supervisor: title/content/date/author/authorUid como cadenas, `authorUid === auth.uid`,
 * sin `readBy`.
 *
 * @param {{title: string, content: string, currentUser: object, authUid: string, now: number|Date|string}} args
 * @returns {{title: string, content: string, date: string, author: string, authorUid: string}}
 */
export function buildAnnouncementPayload({ title, content, currentUser, authUid, now }) {
    return {
        title,
        content,
        date: new Date(now).toISOString(),
        author: resolveAnnouncementAuthor(currentUser),
        authorUid: authUid
    };
}

/**
 * HTML de la lista de comunicados del gestor (app.js 6651-6690). Devuelve el contenido completo de
 * `#gestorComunicadosList` (o el mensaje de lista vacía).
 *
 * @param {Record<string, object>} announcements
 * @param {string} uid
 * @param {object} [helpers]
 * @returns {string}
 */
export function buildGestorComunicadosHtml(announcements, uid, helpers) {
    const { escapeHTML: esc, encodeInlineHandlerArg: encode, sanitizeAnnouncementHTML: sanitize } = resolveHelpers(helpers);
    const keys = sortAnnouncementKeys(announcements, 'desc');

    if (keys.length === 0) {
        return EMPTY_GESTOR_LIST_HTML;
    }

    let html = '';

    keys.forEach((key) => {
        const c = announcements[key];
        const isRead = c.readBy && c.readBy[uid];
        const formattedDate = new Date(c.date).toLocaleString('es-CO');

        let actionsHtml = '';
        if (isRead) {
            actionsHtml = `<div style="color: var(--success); font-size: 13px; margin-top: 15px; font-weight: 500;"><i class='bx bx-check-double'></i> Leído el ${new Date(c.readBy[uid].readAt).toLocaleString('es-CO')}</div>`;
        } else {
            actionsHtml = `<button class="btn btn-primary" style="margin-top: 15px; width: 100%; max-width: 300px; background: var(--success); border-color: var(--success);" data-action="mark-comunicado-read" data-key="${escapeHTML(key)}"><i class='bx bx-check'></i> Marcar como Leído y Entendido</button>`;
        }

        html += `
            <div class="glass-panel" style="padding: 20px; border-left: 4px solid ${isRead ? 'var(--glass-border)' : 'var(--danger)'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <h3 style="color: ${isRead ? 'var(--text-primary)' : 'var(--danger)'}; margin: 0; font-size: 18px;">${esc(c.title)}</h3>
                    <span style="font-size: 11px; color: var(--text-secondary); background: rgba(0,0,0,0.1); padding: 3px 8px; border-radius: 10px;">${formattedDate} por ${esc(c.author)}</span>
                </div>
                <div class="rich-text" style="font-size: 14px; color: var(--text-secondary); margin-top: 10px; line-height: 1.5; overflow-wrap: break-word; white-space: pre-wrap;">${sanitize(c.content)}</div>
                ${actionsHtml}
            </div>
        `;
    });

    return html;
}

/**
 * HTML de las filas de la tabla del administrador (app.js 6837-6877). El botón de eliminar solo
 * aparece para quien puede eliminar (`showDelete`, Admin).
 *
 * @param {Record<string, object>} announcements
 * @param {boolean} showDelete resultado de `canDeleteComunicados(role)`
 * @param {object} [helpers]
 * @returns {string}
 */
export function buildAdminComunicadosRowsHtml(announcements, showDelete, helpers) {
    const { escapeHTML: esc, encodeInlineHandlerArg: encode } = resolveHelpers(helpers);
    const keys = sortAnnouncementKeys(announcements, 'desc');

    if (keys.length === 0) {
        return EMPTY_ADMIN_TABLE_HTML;
    }

    let html = '';

    keys.forEach((key) => {
        const c = announcements[key];
        const formattedDate = new Date(c.date).toLocaleString('es-CO');
        const readCount = c.readBy ? Object.keys(c.readBy).length : 0;
        const deleteBtnHtml = showDelete
            ? `<button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px; margin-left: 5px;" data-action="delete-comunicado" data-key="${escapeHTML(key)}"><i class='bx bx-trash'></i></button>`
            : '';

        html += `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px; font-size: 13px;">${formattedDate}</td>
                <td style="padding: 12px; font-weight: 500;">
                    <a href="javascript:void(0)" data-action="view-comunicado-content" data-key="${escapeHTML(key)}" class="comunicado-title-link">${esc(c.title)}</a>
                </td>
                <td style="padding: 12px; color: var(--text-secondary); font-size: 13px;">${esc(c.author)}</td>
                <td style="padding: 12px; text-align: center;"><span class="badge" style="background: var(--success);">${readCount} lecturas</span></td>
                <td style="padding: 12px; text-align: center;">
                    <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px;" data-action="view-comunicado-content" data-key="${escapeHTML(key)}"><i class='bx bx-book-open'></i> Leer</button>
                    <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px; margin-left: 5px;" data-action="view-comunicado-lecturas" data-key="${escapeHTML(key)}"><i class='bx bx-user-check'></i> Lecturas</button>
                    ${deleteBtnHtml}
                </td>
            </tr>
        `;
    });

    return html;
}

/**
 * Lista de quienes ya leyeron, del más reciente al más antiguo (app.js 6903-6921).
 *
 * @param {Record<string, {name?: string, readAt?: string}>} readers `readBy` del comunicado (o {})
 * @param {object} [helpers]
 * @returns {{html: string, readNames: Set<string>, isEmpty: boolean}}
 */
export function buildReadersListHtml(readers, helpers) {
    const { escapeHTML: esc } = resolveHelpers(helpers);
    const map = readers || {};
    const readerUids = Object.keys(map).sort((a, b) => new Date(map[b].readAt) - new Date(map[a].readAt));
    const readNames = new Set();

    if (readerUids.length === 0) {
        return { html: EMPTY_READERS_HTML, readNames, isEmpty: true };
    }

    let html = '';

    readerUids.forEach((uid) => {
        const r = map[uid];

        if (r.name) readNames.add(r.name.trim().toLowerCase());

        html += `<li style="margin-bottom: 8px; border-bottom: 1px solid var(--glass-border); padding-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: 500; font-size: 13px;">${esc(r.name)}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">${new Date(r.readAt).toLocaleString('es-CO')}</div>
            </li>`;
    });

    return { html, readNames, isEmpty: false };
}

/**
 * ¿Debe listarse como pendiente? Solo gestores aprobados (rol 'Gestor' o sin rol), app.js 6935.
 *
 * @param {{approved?: unknown, role?: string}} user
 * @returns {boolean}
 */
export function isPendingReaderCandidate(user) {
    return user.approved === true && (user.role === 'Gestor' || user.role === undefined);
}

/**
 * Lista de pendientes de lectura (app.js 6925-6957). No repite a quien ya leyó con OTRA cuenta del
 * mismo nombre ni al mismo nombre dos veces (cuentas viejas duplicadas).
 *
 * @param {Record<string, object>} allUsers nodo `users`
 * @param {Record<string, object>} readers `readBy` del comunicado (o {})
 * @param {Set<string>} readNames nombres (en minúsculas) de quienes ya leyeron
 * @param {object} [helpers]
 * @returns {{html: string, unreadCount: number}}
 */
export function buildUnreadersListHtml(allUsers, readers, readNames, helpers) {
    const { escapeHTML: esc } = resolveHelpers(helpers);
    const seen = new Set(readNames);
    const map = readers || {};
    let html = '';
    let unreadCount = 0;

    Object.keys(allUsers).forEach((uKey) => {
        const u = allUsers[uKey];

        if (isPendingReaderCandidate(u)) {
            const uName = (u.name || '').trim().toLowerCase();

            if (!map[uKey] && !seen.has(uName)) {
                unreadCount += 1;
                html += `<li style="margin-bottom: 8px; border-bottom: 1px solid var(--glass-border); padding-bottom: 5px;">
                            <div style="font-weight: 500; color: var(--danger); font-size: 13px;"><i class='bx bx-x'></i> ${esc(u.name || 'Sin nombre')}</div>
                        </li>`;

                if (uName) seen.add(uName);
            }
        }
    });

    if (unreadCount === 0) {
        html = ALL_READ_HTML;
    }

    return { html, unreadCount };
}
