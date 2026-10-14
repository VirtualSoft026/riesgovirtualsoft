/**
 * DOM simulado mínimo para las pruebas del corte "Tareas, persistencia y ciclo de aplicación".
 * No es una suite (no termina en .test.mjs): lo importan las pruebas que ejecutan, lado a lado, el código
 * LITERAL de app.js y el módulo nuevo contra el mismo entorno simulado, y comparan lo que quedó escrito.
 */

export class FakeClassList {
    constructor() { this.set = new Set(); }
    add(...names) { names.forEach((n) => this.set.add(n)); }
    remove(...names) { names.forEach((n) => this.set.delete(n)); }
    contains(name) { return this.set.has(name); }
    toggle(name) { if (this.set.has(name)) this.set.delete(name); else this.set.add(name); }
    toString() { return [...this.set].sort().join(' '); }
}

export class FakeElement {
    constructor(tag = 'div', id = null) {
        this.tag = tag;
        this.id = id;
        this.className = '';
        this.innerHTML = '';
        this.textContent = '';
        this.value = '';
        this.disabled = false;
        this.style = {};
        this.readOnly = false;
        this.placeholder = '';
        this.classList = new FakeClassList();
        this.children = [];
        this.nextElementSibling = null;
        this.parentNode = null;
        this.listeners = {};
    }

    appendChild(child) { this.children.push(child); return child; }

    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }

    cloneNode() {
        const copy = new FakeElement(this.tag, this.id);
        copy.innerHTML = this.innerHTML;
        copy.value = this.value;
        copy.parentNode = this.parentNode;
        return copy;
    }

    fire(type, event = {}) { (this.listeners[type] || []).forEach((fn) => fn(event)); }
}

/**
 * @param {{missingIds?: string[], missingSelectors?: string[]}} [opts]
 */
export function createFakeDocument(opts = {}) {
    const byId = new Map();
    const bySelector = new Map();
    const lists = new Map();
    const missingIds = new Set(opts.missingIds || []);
    const missingSelectors = new Set(opts.missingSelectors || []);
    const created = [];

    function attachParent(el, registry, key) {
        el.parentNode = {
            replaceChild(newEl, oldEl) {
                newEl.id = oldEl.id;
                newEl.parentNode = oldEl.parentNode;
                registry.set(key, newEl);
            }
        };
        return el;
    }

    const doc = {
        getElementById(id) {
            if (missingIds.has(id)) return null;
            if (!byId.has(id)) byId.set(id, attachParent(new FakeElement('div', id), byId, id));
            return byId.get(id);
        },
        querySelector(selector) {
            if (missingSelectors.has(selector)) return null;
            if (!bySelector.has(selector)) bySelector.set(selector, attachParent(new FakeElement('div'), bySelector, selector));
            return bySelector.get(selector);
        },
        querySelectorAll(selector) {
            return lists.get(selector) || [];
        },
        createElement(tag) {
            const el = new FakeElement(tag);
            created.push(el);
            return el;
        },
        /** Registra la lista que devolverá `querySelectorAll(selector)`. */
        setAll(selector, elements) { lists.set(selector, elements); return elements; },
        created,
        byId,
        bySelector
    };

    return doc;
}

function snapshotElement(el) {
    return {
        id: el.id,
        className: el.className,
        classes: el.classList.toString(),
        innerHTML: el.innerHTML,
        textContent: el.textContent,
        value: el.value,
        disabled: el.disabled,
        readOnly: el.readOnly,
        placeholder: el.placeholder,
        style: { ...el.style },
        children: el.children.map(snapshotElement)
    };
}

/** Foto comparable de TODO lo que quedó escrito en el documento simulado. */
export function snapshotDocument(doc) {
    const out = {};

    [...doc.byId.keys()].sort().forEach((k) => { out['#' + k] = snapshotElement(doc.byId.get(k)); });
    [...doc.bySelector.keys()].sort().forEach((k) => { out[k] = snapshotElement(doc.bySelector.get(k)); });

    return out;
}

/** Generador pseudoaleatorio con semilla (mulberry32) para pruebas reproducibles. */
export function createRng(seed) {
    let a = seed >>> 0;

    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Base de datos Realtime simulada, con la semántica que importa a la persistencia de tareas:
 *  - `update(obj)` solo reemplaza las llaves que recibe (como Firebase), nunca el resto del nodo;
 *  - `transaction(fn)` llama primero a `fn` con un valor local supuesto (`guess`, por defecto null) y luego
 *    con el valor real del servidor, y confirma solo si la segunda llamada no devuelve `undefined`;
 *  - `failPaths` hace fallar lecturas/escrituras por ruta (red caída / permiso denegado);
 *  - `beforeTransaction` permite simular que OTRA pestaña escribió justo antes de la transacción.
 */
export function createFakeDatabase(initial = {}, opts = {}) {
    const data = JSON.parse(JSON.stringify(initial));
    const log = [];
    const failPaths = opts.failPaths || {};

    const parts = (path) => path.split('/').filter(Boolean);

    function getAt(path) {
        let node = data;
        for (const p of parts(path)) {
            if (node === null || typeof node !== 'object' || !(p in node)) return null;
            node = node[p];
        }
        return node === undefined ? null : node;
    }

    function setAt(path, value) {
        const ps = parts(path);
        let node = data;
        for (let i = 0; i < ps.length - 1; i++) {
            if (node[ps[i]] === null || typeof node[ps[i]] !== 'object') node[ps[i]] = {};
            node = node[ps[i]];
        }
        if (value === null) delete node[ps[ps.length - 1]];
        else node[ps[ps.length - 1]] = JSON.parse(JSON.stringify(value));
    }

    function maybeFail(op, path) {
        const rule = failPaths[path];
        if (rule && (rule === true || rule.includes(op))) {
            const error = new Error(`${op} fallido en ${path}`);
            error.code = opts.errorCode || 'NETWORK_ERROR';
            throw error;
        }
    }

    function ref(path = '') {
        const api = {
            path,
            async once() {
                log.push({ op: 'once', path });
                maybeFail('once', path);
                const value = getAt(path);
                return { exists: () => value !== null, val: () => (value === null ? null : JSON.parse(JSON.stringify(value))) };
            },
            update(obj) {
                log.push({ op: 'update', path, data: JSON.parse(JSON.stringify(obj)) });
                try { maybeFail('update', path); } catch (e) { return Promise.reject(e); }
                // Firebase rechaza `undefined` en cualquier nivel de un update
                if (Object.values(obj).some((v) => v === undefined)) return Promise.reject(new Error('update() no admite undefined'));
                Object.keys(obj).forEach((k) => setAt(`${path}/${k}`, obj[k]));
                return Promise.resolve();
            },
            set(value) {
                log.push({ op: 'set', path, data: value });
                try { maybeFail('set', path); } catch (e) { return Promise.reject(e); }
                setAt(path, value);
                return Promise.resolve();
            },
            async transaction(fn) {
                log.push({ op: 'transaction', path });
                maybeFail('transaction', path);
                if (opts.beforeTransaction) opts.beforeTransaction(path, { getAt, setAt });
                fn(opts.transactionGuess === undefined ? null : opts.transactionGuess); // primera suposición del SDK
                const current = getAt(path);
                const next = fn(current);
                if (next === undefined) return { committed: false, snapshot: { val: () => current } };
                setAt(path, next);
                return { committed: true, snapshot: { val: () => next } };
            }
        };
        return api;
    }

    return { ref, data, log, getAt, setAt };
}

/**
 * Envuelve `testAsync` para que las pruebas asíncronas que comparten estado global simulado (variables
 * de módulo que imitan los globales de app.js) corran UNA tras otra y no se intercalen en los `await`.
 *
 * @param {(name: string, fn: () => Promise<void>) => void} testAsync
 * @returns {(name: string, fn: () => Promise<void>) => void}
 */
export function createSerialTestAsync(testAsync) {
    let chain = Promise.resolve();

    return (name, fn) => {
        const previous = chain;
        let release;
        chain = new Promise((resolve) => { release = resolve; });

        testAsync(name, async () => {
            await previous;

            try {
                await fn();
            } finally {
                release();
            }
        });
    };
}
