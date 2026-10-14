/**
 * Dobles de prueba compartidos por las suites del corte "Modales, tareas extra, usuarios y permisos"
 * (no es una suite: el nombre no termina en `.test.mjs`). Un DOM mínimo en memoria, una base de datos
 * Firebase simulada y un generador pseudoaleatorio con semilla.
 */

/** Generador pseudoaleatorio determinista (mulberry32). */
export function createRng(seed) {
    let a = seed >>> 0;

    return function rng() {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * DOM mínimo: elementos por `id`, `parentElement`, `appendChild`, `remove`, `classList`, `querySelector(All)`
 * (solo los selectores `.btn-status` y `.btn-status.not-done` que usa `openExceptionModal`).
 */
export function createFakeDom() {
    const elements = new Map();

    function makeElement(id, props = {}) {
        const el = {
            id,
            style: {},
            value: '',
            innerHTML: '',
            innerText: '',
            disabled: false,
            parentElement: null,
            children: [],
            classes: new Set(),
            classList: {
                add: (c) => el.classes.add(c),
                remove: (c) => el.classes.delete(c),
                contains: (c) => el.classes.has(c)
            },
            appendChild(child) {
                el.children.push(child);
                child.parentElement = el;
                if (child.id) elements.set(child.id, child);
                return child;
            },
            remove() {
                if (el.parentElement) {
                    el.parentElement.children = el.parentElement.children.filter((c) => c !== el);
                    el.parentElement = null;
                }
                if (el.id && elements.get(el.id) === el) elements.delete(el.id);
            },
            ...props
        };

        return el;
    }

    const doc = {
        getElementById: (id) => elements.get(id) || null,
        createElement: () => makeElement(''),
        querySelectorAll: (selector) => (selector === '.btn-status' ? [...elements.values()].filter((e) => e.isStatusButton) : []),
        querySelector: (selector) => (selector === '.btn-status.not-done' ? ([...elements.values()].find((e) => e.isStatusButton && e.isNotDone) || null) : null)
    };

    return {
        doc,
        /** Registra (o reemplaza) un elemento por `id`. */
        add(id, props = {}) {
            const el = makeElement(id, props);
            elements.set(id, el);
            return el;
        },
        /** Anida `child` dentro de `parent` (para `tbody.parentElement.parentElement`). */
        nest(child, parent) {
            child.parentElement = parent;
            parent.children.push(child);
        },
        /** Estado serializable de todo el DOM, ordenado por `id`, para comparar dos ejecuciones. */
        snapshot() {
            return [...elements.values()]
                .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
                .map((e) => ({
                    id: e.id,
                    style: typeof e.style === 'string' ? e.style : { ...e.style },
                    value: e.value,
                    innerHTML: e.innerHTML,
                    innerText: e.innerText,
                    disabled: e.disabled,
                    classes: [...e.classes].sort(),
                    parent: e.parentElement ? e.parentElement.id : null,
                    children: e.children.map((c) => c.id)
                }));
        }
    };
}

/**
 * Base Firebase simulada con árbol `{users: {...}, permissions: {...}}`. Registra cada escritura en `calls`.
 * `failOn` lista operaciones que deben fallar: `{op: 'once'|'update', path?: string}`.
 */
export function createFakeDatabase(tree = {}, { failOn = [] } = {}) {
    const calls = [];

    const shouldFail = (op, path) => failOn.some((f) => f.op === op && (f.path === undefined || f.path === path));

    return {
        calls,
        tree,
        ref(path) {
            return {
                once(event) {
                    calls.push({ op: 'once', path, event });
                    if (shouldFail('once', path)) return Promise.reject(new Error('PERMISSION_DENIED'));
                    const value = tree[path] === undefined ? null : tree[path];
                    return Promise.resolve({ exists: () => value !== null, val: () => value });
                },
                update(data) {
                    calls.push({ op: 'update', path, data: JSON.parse(JSON.stringify(data)) });
                    if (shouldFail('update', path)) return Promise.reject(Object.assign(new Error('permission_denied'), { code: 'PERMISSION_DENIED' }));
                    return Promise.resolve();
                }
            };
        }
    };
}
