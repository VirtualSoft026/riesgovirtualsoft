/**
 * DOM simulado mínimo para las pruebas de controladores del corte "Comunicados, configuración e
 * incidencias". `getElementById` crea el elemento la primera vez (o devuelve `null` si el id está en
 * `missing`). Cada elemento registra su `innerHTML`, `innerText`, `textContent`, `value`, `style`,
 * `disabled`, `onclick`, `classList` (con `contains`/`add`/`remove`) y los `addEventListener`.
 */
export function createFakeDocument({ missing = [], initial = {} } = {}) {
    const elements = new Map();
    const missingSet = new Set(missing);

    function makeElement(id) {
        const classes = new Set();
        const listeners = {};
        let html = '';
        const element = {
            id,
            get innerHTML() { return html; },
            set innerHTML(value) { html = value; element.children = []; },
            innerText: '',
            textContent: '',
            value: '',
            disabled: false,
            onclick: null,
            style: {},
            children: [],
            appendChild(child) { element.children.push(child); return child; },
            classNames: () => Array.from(classes).sort(),
            classList: {
                add: (c) => classes.add(c),
                remove: (c) => classes.delete(c),
                contains: (c) => classes.has(c),
                toggle: (c) => (classes.has(c) ? classes.delete(c) : classes.add(c))
            },
            addEventListener: (type, fn) => { listeners[type] = fn; },
            fire: (type, ...args) => listeners[type] && listeners[type](...args),
            listeners,
            reset() { element.innerHTML = ''; }
        };
        return Object.assign(element, initial[id] || {});
    }

    return {
        elements,
        createElement: (tag) => makeElement(`<${tag}>`),
        getElementById(id) {
            if (missingSet.has(id)) return null;
            if (!elements.has(id)) elements.set(id, makeElement(id));
            return elements.get(id);
        },
        el(id) { return this.getElementById(id); },
        isActive(id) { return this.getElementById(id).classList.contains('active'); }
    };
}
