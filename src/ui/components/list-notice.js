/**
 * Aviso "Mostrando los 5 ... más recientes" que acompaña a las tablas de la vista Aprobaciones.
 *
 * Puerto 1:1 de los bloques `setTimeout(..., 100)` de `renderPendingUsers()` (app.js 4157-4172) y
 * `renderPendingPermissions()` (4288-4303): el aviso es un `<div>` con `id` fijo que se agrega al contenedor
 * del contenedor de la tabla (`tbody.parentElement.parentElement`) y se quita en el siguiente render.
 *
 * El retraso (100 ms) lo gestiona el controlador con su `schedule` inyectado; aquí solo está el DOM.
 */

/** Estilo en línea del aviso (app.js 4165 y 4296, literal). */
export const LIST_NOTICE_STYLE = 'text-align: center; font-size: 11px; color: var(--text-secondary); margin-top: 10px; margin-bottom: 15px; font-style: italic;';

export const LIST_NOTICE_IDS = Object.freeze({
    USERS: 'pendingMostrandoMsg',
    PERMISSIONS: 'pendingPermsMostrandoMsg'
});

/** Quita el aviso si existe (rama "sin recorte": app.js 4170 y 4301). */
export function removeListNotice(doc, noticeId) {
    const existing = doc.getElementById(noticeId);
    if (existing) existing.remove();
}

/**
 * Reemplaza el aviso por uno nuevo con `text` (app.js 4160-4168 y 4291-4299).
 *
 * @param {{getElementById: Function, createElement: Function}} doc
 * @param {{tbodyId: string, noticeId: string, text: string, requireTable?: boolean}} options `requireTable`:
 *   los usuarios solo agregan el aviso si la tabla todavía existe (app.js 4159); los permisos no lo comprueban.
 */
export function showListNotice(doc, { tbodyId, noticeId, text, requireTable = false }) {
    if (requireTable && !doc.getElementById(tbodyId)) return;

    removeListNotice(doc, noticeId);

    const msg = doc.createElement('div');
    msg.id = noticeId;
    msg.style = LIST_NOTICE_STYLE;
    msg.innerText = text;
    doc.getElementById(tbodyId).parentElement.parentElement.appendChild(msg);
}
