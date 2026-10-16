/**
 * Delegación de clics por atributo `data-action` (W-50: sin manejadores `onclick` inline, compatible con CSP sin
 * scripts inline).
 *
 * El HTML generado marca el elemento con `data-action="<acción>"` (y, si hace falta, `data-*` con los datos); un único
 * listener en el documento resuelve el elemento más cercano con esa acción y llama al manejador. Así el marcado no
 * contiene código y los re-renderizados no pierden el enlace, porque el listener vive en el documento.
 *
 * Una acción solo tiene un manejador activo por documento: enlazar de nuevo la misma acción sustituye al anterior (el
 * último controlador creado gana). Así un controlador descartado no conserva el listener.
 */

/** Documento → (acción → listener activo). */
const activeBindings = new WeakMap();

/**
 * Elemento más cercano (incluido el propio) con `data-action` igual a `action`, o `null`.
 *
 * @param {unknown} target objetivo del evento (`event.target`)
 * @param {string} action nombre de la acción
 * @returns {any|null}
 */
export function findActionTarget(target, action) {
    if (!target || typeof target.closest !== 'function') return null;

    return target.closest(`[data-action="${action}"]`);
}

/**
 * Enlaza la acción `action` en `doc` mediante un listener de `click`.
 *
 * @param {{addEventListener: Function, removeEventListener: Function}} doc documento (o cualquier nodo que reciba los clics)
 * @param {string} action nombre de la acción (`data-action`)
 * @param {(element: any, event: unknown) => void} onMatch se llama con el elemento que tiene la acción
 * @returns {() => void} función que retira el enlace (solo si sigue siendo el activo)
 */
export function bindActionDelegation(doc, action, onMatch) {
    if (!doc || typeof doc.addEventListener !== 'function') return () => {};

    let byAction = activeBindings.get(doc);
    if (!byAction) {
        byAction = new Map();
        activeBindings.set(doc, byAction);
    }

    const previous = byAction.get(action);
    if (previous) doc.removeEventListener('click', previous);

    const handler = (event) => {
        const element = findActionTarget(event && event.target, action);
        if (element) onMatch(element, event);
    };

    doc.addEventListener('click', handler);
    byAction.set(action, handler);

    return () => {
        if (byAction.get(action) === handler) {
            doc.removeEventListener('click', handler);
            byAction.delete(action);
        }
    };
}
