/**
 * Utilidades de los modales de la vista de gestor: "Justificar Tarea No Realizada" y "Añadir Tarea Adicional".
 *
 * Puerto 1:1 de `openExceptionModal()` (app.js 3976), `closeModal()` (3994) y la parte de DOM de
 * `openExtraTaskModal()` (4021). Solo manipulan el documento recibido (inyectado); no deciden nada de negocio.
 */

/** Abre un modal agregando la clase `active`; sin efecto si no existe. */
export function openModal(doc, modalId) {
    const modal = doc.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

/** Cierra un modal (app.js 3994-3999); sin efecto si no existe. */
export function closeModal(doc, modalId) {
    const modal = doc.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Prepara y abre el modal de excepción (app.js 3976-3991): marca "No Realizada" como activo, limpia razón y
 * detalle y abre el modal. Si falta el botón `.btn-status.not-done` lanza `TypeError`, como app.js.
 */
export function openExceptionModal(doc) {
    doc.querySelectorAll('.btn-status').forEach((b) => b.classList.remove('active'));
    doc.querySelector('.btn-status.not-done').classList.add('active');

    const exReason = doc.getElementById('exceptionReason');
    if (exReason) exReason.value = '';
    const exDetails = doc.getElementById('exceptionDetails');
    if (exDetails) exDetails.value = '';

    const modal = doc.getElementById('exceptionModal');
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Limpia y abre el modal de tarea extra (app.js 4021-4031).
 *
 * @param {{getElementById: Function}} doc
 * @param {string} defaultStatus Estado inicial del selector (`Finalizada`).
 * @returns {boolean} `true` si el modal existía y se abrió (el llamador reinicia su ID pendiente).
 */
export function openExtraTaskModal(doc, defaultStatus) {
    const modal = doc.getElementById('extraTaskModal');
    if (!modal) return false;

    doc.getElementById('extraTaskName').value = '';
    doc.getElementById('extraTaskStatus').value = defaultStatus;
    doc.getElementById('extraTaskObs').value = '';
    modal.classList.add('active');

    return true;
}
