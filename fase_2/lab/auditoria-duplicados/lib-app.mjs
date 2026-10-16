// Carga funciones REALES de app.js (con sus dependencias de nivel superior) en un vm aislado.
import fs from 'node:fs';
import vm from 'node:vm';
import * as acorn from 'acorn';
import { JSDOM } from 'jsdom';

// AUDIT_APP_JS (opcional): otra copia de app.js, p. ej. la referencia congelada del paso 3.1
// (referencia/app.pre-paso-3-1.js), para probar que lo retirado era equivalente a src/.
export const APP_FILE = process.env.AUDIT_APP_JS
    ? new URL(process.env.AUDIT_APP_JS, new URL('./', import.meta.url))
    : new URL('../../../app.js', import.meta.url);
const APP = fs.readFileSync(APP_FILE, 'utf8').replace(/\r\n/g, '\n');
const ast = acorn.parse(APP, { ecmaVersion: 'latest', sourceType: 'script' });

const decls = new Map(); // nombre -> { start, src }
for (const node of ast.body) {
    const src = APP.slice(node.start, node.end);
    if (node.type === 'FunctionDeclaration') decls.set(node.id.name, { start: node.start, src });
    if (node.type === 'VariableDeclaration') {
        for (const d of node.declarations) if (d.id.type === 'Identifier') decls.set(d.id.name, { start: node.start, src });
    }
}

function closure(names, exclude = []) {
    const seen = new Set();
    const stack = [...names];
    while (stack.length) {
        const n = stack.pop();
        if (seen.has(n) || exclude.includes(n) || !decls.has(n)) continue;
        seen.add(n);
        const ids = decls.get(n).src.match(/[A-Za-z_$][\w$]*/g) || [];
        for (const id of ids) if (decls.has(id) && !seen.has(id)) stack.push(id);
    }
    const stmts = new Map();
    for (const n of seen) { const d = decls.get(n); stmts.set(d.start, d.src); }
    return [...stmts.entries()].sort((a, b) => a[0] - b[0]).map(([, s]) => s);
}

/**
 * @param {string[]} names funciones de app.js a cargar
 * @param {{globals?: object, exclude?: string[], prelude?: string}} [opts]
 */
export function loadAppFunctions(names, opts = {}) {
    const dom = new JSDOM('<!doctype html><body></body>');
    const store = new Map();
    const ctx = {
        window: null, document: dom.window.document, Node: dom.window.Node, HTMLElement: dom.window.HTMLElement,
        console: { log() {}, warn() {}, error() {}, info() {} },
        localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
        setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, Promise, Date, Math, JSON, encodeURIComponent, decodeURIComponent,
        URL, FormData, alert() {}, confirm: () => true,
        ...(opts.globals || {})
    };
    ctx.window = Object.assign(ctx.window || {}, { location: { hostname: 'test', href: '' }, addEventListener() {}, idleDetectorGranted: false });
    vm.createContext(ctx);
    const code = closure(names, opts.exclude || []).join('\n\n');
    vm.runInContext((opts.prelude || '') + '\n' + code + '\nthis.__get = (n) => eval(n); var __v; this.__set = (n, v) => { __v = v; eval(n + " = __v"); };', ctx);
    const out = {};
    for (const n of names) out[n] = ctx.__get(n);
    out.__ctx = ctx; out.__store = store; out.__code = code;
    return out;
}

export function appSource(name) { return decls.has(name) ? decls.get(name).src : null; }
export { decls };
