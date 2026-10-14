/**
 * DOM simulado mínimo para las pruebas del corte "Historial, perfil, navegación y monitoreo".
 * No es una librería de pruebas: solo registra lo que los controladores hacen con los elementos.
 */

/**
 * @param {string} id
 * @param {object} [extra]
 */
export function createElement(id, extra = {}) {
    const el = {
        id,
        style: { display: '' },
        innerHTML: '',
        innerText: '',
        textContent: '',
        value: '',
        className: '',
        children: [],
        parentElement: null,
        previousElementSibling: null,
        listeners: {},
        _classes: new Set(),
        classList: null,
        appendChild(child) { el.children.push(child); child.parentElement = el; return child; },
        removeChild(child) { el.children = el.children.filter((c) => c !== child); },
        remove() { if (el.parentElement) el.parentElement.removeChild(el); el.removed = true; },
        addEventListener(type, fn) { (el.listeners[type] = el.listeners[type] || []).push(fn); },
        querySelector() { return null; },
        closest() { return null; },
        ...extra
    };

    // Asignar innerHTML reemplaza el contenido: se descartan los hijos agregados con appendChild (como un DOM real).
    let html = el.innerHTML;
    Object.defineProperty(el, 'innerHTML', {
        get: () => html,
        set: (v) => { html = v; el.children = []; },
        enumerable: true
    });

    el.classList = {
        add: (c) => el._classes.add(c),
        remove: (c) => el._classes.delete(c),
        contains: (c) => el._classes.has(c)
    };

    return el;
}

/**
 * Documento simulado: `getElementById` solo devuelve los ids registrados (el resto, null).
 *
 * @param {Record<string, object>} [elements] id -> elemento (o parámetros extra para `createElement`)
 * @param {{selectors?: Record<string, object>}} [options]
 */
export function createFakeDocument(elements = {}, { selectors = {} } = {}) {
    const byId = new Map();

    Object.keys(elements).forEach((id) => {
        const given = elements[id];
        byId.set(id, given && given.classList ? given : createElement(id, given || {}));
    });

    const body = createElement('body');

    return {
        body,
        byId,
        getElementById: (id) => (byId.has(id) ? byId.get(id) : null),
        querySelector: (sel) => (selectors[sel] || null),
        createElement: (tag) => createElement('<' + tag + '>', { tag })
    };
}

/**
 * Documento que REGISTRA el orden de las operaciones de navegación (display y appendChild por id),
 * para comparar el comportamiento original contra el nuevo.
 *
 * @param {string[]} existingIds ids que existen en la página
 * @returns {{document: object, sidebarNav: object, log: string[]}}
 */
export function createRecordingNavDocument(existingIds) {
    const log = [];
    const nodes = new Map();

    function node(id) {
        const el = {
            id,
            style: new Proxy({}, {
                set(target, prop, value) { target[prop] = value; log.push(`${id}.${String(prop)}=${value}`); return true; },
                get(target, prop) { return target[prop]; }
            }),
            appendChild(child) { log.push(`${id}<-${child.id}`); }
        };

        return el;
    }

    const sidebarNav = node('.sidebar-nav');

    existingIds.forEach((id) => nodes.set(id, node(id)));

    return {
        log,
        sidebarNav,
        document: {
            getElementById: (id) => (nodes.has(id) ? nodes.get(id) : null),
            querySelector: (sel) => (sel === '.sidebar-nav' ? sidebarNav : null)
        }
    };
}
