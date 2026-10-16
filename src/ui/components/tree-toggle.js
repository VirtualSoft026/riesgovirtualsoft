import { bindActionDelegation } from '../../utils/action-delegation.js';

/** Acción delegada del encabezado de un Set del árbol (W-50). */
export const TOGGLE_TREE_ACTION = 'toggle-tree';

/**
 * Expandir/contraer un Set del árbol de tareas (`toggleTree()`, app.js 2519-2526).
 *
 * El encabezado alterna `open` y el contenedor de tareas (su hermano siguiente) alterna `show`. Si el
 * encabezado no tiene hermano siguiente solo alterna el encabezado, como el original.
 *
 * @param {{classList: {toggle: (name: string) => void}, nextElementSibling: ({classList: {toggle: (name: string) => void}}|null)}} element
 * @returns {void}
 */
export function toggleTreeElement(element) {
    element.classList.toggle('open');
    const childrenContainer = element.nextElementSibling;

    if (childrenContainer) {
        childrenContainer.classList.toggle('show');
    }
}

/**
 * Enlaza la acción `toggle-tree` (W-50): un clic en un encabezado `data-action="toggle-tree"` alterna ese Set.
 *
 * @param {{addEventListener: Function, removeEventListener: Function}} doc
 * @returns {() => void} desenlace
 */
export function bindTreeToggleDelegation(doc) {
    return bindActionDelegation(doc, TOGGLE_TREE_ACTION, (element) => toggleTreeElement(element));
}
