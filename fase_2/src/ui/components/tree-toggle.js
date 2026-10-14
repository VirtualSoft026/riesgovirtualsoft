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
