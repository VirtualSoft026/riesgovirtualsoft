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

/**
 * Cierre de modales por clic en el fondo y por la tecla Escape (app.js, `window.onclick` y `keydown`; W-22).
 *
 * - Clic: si el objetivo del clic es el fondo de un modal registrado, llama a su `close` (el KPI de detalle de tareas).
 * - Escape: quita `active` de todos los `.modal-overlay.active`.
 *
 * Se registra UNA vez. Devuelve la función que retira ambos listeners, para el desmontaje (W-23). El cambio frente al
 * original es solo el mecanismo: `addEventListener` en vez de la propiedad `window.onclick`, así que ya no se pisa
 * si otro código asigna `window.onclick`.
 *
 * @param {{ win: any, doc: any, backdrops?: Array<{ id: string, close: () => void }> }} deps
 * @returns {() => void} desregistra los listeners
 */
export function bindModalDismissal({ win, doc, backdrops = [] }) {
    const onClick = (event) => {
        backdrops.forEach(({ id, close }) => {
            if (event.target == doc.getElementById(id)) close();
        });
    };
    const onKeydown = (event) => {
        if (event.key === 'Escape') {
            doc.querySelectorAll('.modal-overlay.active').forEach((modal) => {
                modal.classList.remove('active');
            });
        }
    };

    win.addEventListener('click', onClick);
    win.addEventListener('keydown', onKeydown);

    return () => {
        win.removeEventListener('click', onClick);
        win.removeEventListener('keydown', onKeydown);
    };
}
