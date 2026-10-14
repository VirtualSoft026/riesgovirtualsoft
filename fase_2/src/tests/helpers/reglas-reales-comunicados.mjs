/**
 * Evaluador MÍNIMO de las reglas REALES de `database.rules.json` (solo lectura; no se modifica) para la base
 * simulada `fake-rtdb-comunicados.mjs`. Sirve para probar el comportamiento de los comunicados (D4: lectura
 * única de `readBy/{uid}`) contra el texto real de las reglas y no contra una copia a mano.
 *
 * Qué reproduce del lenguaje de reglas de Realtime Database (lo justo para `announcements` y `users`):
 *  - `.read`/`.write` en cascada: basta que UNA regla del camino (raíz -> nodo) conceda el acceso;
 *  - `.validate` sobre el nodo escrito y sus descendientes presentes en `newData` (no se evalúa al borrar);
 *  - variables `$id` del camino, `auth`, `root`, `data`, `newData`, `now`;
 *  - instantáneas con `val()`, `exists()`, `child()`, `hasChild()`, `hasChildren([...])`, `isString()`,
 *    `isNumber()`, `isBoolean()`.
 * Las expresiones de las reglas son JavaScript válido (`===`, `&&`, `||`, `!`), así que se evalúan con
 * `new Function`. No es un emulador: no cubre `.indexOn`, consultas ni reglas de otros nodos más allá de
 * lo que se pruebe; un camino sin regla queda DENEGADO (como en Firebase).
 */

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const RULES_CANDIDATES = [
    fileURLToPath(new URL('../../../../database.rules.json', import.meta.url)),
    '/mnt/user-data/uploads/riesgovirtualsoft/database.rules.json'
];

/** Carga `database.rules.json` (o `null` si no está en esta máquina). */
export function loadRealRules() {
    for (const candidate of RULES_CANDIDATES) {
        if (fs.existsSync(candidate)) {
            return { path: candidate, rules: JSON.parse(fs.readFileSync(candidate, 'utf8')).rules };
        }
    }

    return null;
}

function split(path) {
    return String(path).split('/').filter((p) => p.length > 0);
}

function getAt(root, parts) {
    let node = root;

    for (const part of parts) {
        if (node === null || node === undefined || typeof node !== 'object') return null;
        node = node[part];
    }

    return node === undefined ? null : node;
}

function setAt(root, parts, value) {
    const out = JSON.parse(JSON.stringify(root || {}));

    if (parts.length === 0) return value;

    let node = out;
    for (let i = 0; i < parts.length - 1; i += 1) {
        if (!node[parts[i]] || typeof node[parts[i]] !== 'object') node[parts[i]] = {};
        node = node[parts[i]];
    }

    if (value === null || value === undefined) delete node[parts[parts.length - 1]];
    else node[parts[parts.length - 1]] = value;

    return out;
}

/** Instantánea de reglas sobre un valor JS. */
export function ruleSnapshot(value) {
    const v = value === undefined ? null : value;

    return {
        val: () => v,
        exists: () => v !== null,
        child: (path) => ruleSnapshot(getAt(v, split(path))),
        hasChild: (path) => getAt(v, split(path)) !== null,
        hasChildren: (keys) => {
            if (v === null || typeof v !== 'object') return false;
            if (!keys) return Object.keys(v).length > 0;
            return keys.every((k) => getAt(v, split(k)) !== null);
        },
        isString: () => typeof v === 'string',
        isNumber: () => typeof v === 'number',
        isBoolean: () => typeof v === 'boolean'
    };
}

function evaluate(expression, scope) {
    const names = Object.keys(scope);
    const fn = new Function(...names, `return (${expression});`);

    try {
        return Boolean(fn(...names.map((n) => scope[n])));
    } catch (error) {
        return false; // un error al evaluar una regla cuenta como "falso" (igual que Firebase)
    }
}

/** Recorre el árbol de reglas siguiendo `parts`; devuelve [{rule, depth, vars}] desde la raíz. */
function walk(rules, parts) {
    const out = [{ rule: rules, depth: 0, vars: {} }];
    let current = rules;
    let vars = {};

    for (let i = 0; i < parts.length && current; i += 1) {
        const part = parts[i];
        let next = current[part];

        if (next === undefined) {
            const wildcard = Object.keys(current).find((k) => k.startsWith('$'));
            if (wildcard) {
                vars = { ...vars, [wildcard]: part };
                next = current[wildcard];
            }
        }

        if (!next || typeof next !== 'object') break;

        current = next;
        out.push({ rule: current, depth: i + 1, vars });
    }

    return out;
}

/**
 * Adaptador `db.rules` para `createFakeRtdb` con las reglas reales.
 *
 * @param {{db: {raw: () => object}, getAuth: () => ({uid: string}|null), rules?: object, now?: () => number}} args
 * @returns {{canRead: (path: string) => boolean, canWrite: (op: string, path: string, newValue: unknown, oldValue: unknown) => boolean, evaluations: Array<object>}}
 */
export function createRealRulesAdapter({ db, getAuth, rules = (loadRealRules() || {}).rules, now = () => 1700000000000 }) {
    const evaluations = [];

    function scopeFor(root, dataRoot, newRoot, depthParts, vars) {
        return {
            auth: getAuth(),
            root: ruleSnapshot(root),
            data: ruleSnapshot(getAt(dataRoot, depthParts)),
            newData: ruleSnapshot(getAt(newRoot, depthParts)),
            now: now(),
            ...vars
        };
    }

    function validateTree(rule, newRoot, parts, vars, root) {
        const value = getAt(newRoot, parts);

        if (value === null) return true;

        if (rule['.validate'] && !evaluate(rule['.validate'], scopeFor(root, root, newRoot, parts, vars))) {
            return false;
        }

        if (value && typeof value === 'object') {
            const wildcard = Object.keys(rule).find((k) => k.startsWith('$'));

            for (const key of Object.keys(value)) {
                const childRule = rule[key] || (wildcard ? rule[wildcard] : null);
                const childVars = rule[key] ? vars : { ...vars, [wildcard]: key };

                if (childRule && !validateTree(childRule, newRoot, parts.concat(key), childVars, root)) {
                    return false;
                }
            }
        }

        return true;
    }

    return {
        evaluations,
        canRead(path) {
            const root = db.raw();
            const parts = split(path);
            const allowed = walk(rules, parts).some(({ rule, depth, vars }) => rule['.read']
                && evaluate(rule['.read'], scopeFor(root, root, root, parts.slice(0, depth), vars)));

            evaluations.push({ kind: 'read', path, allowed });
            return allowed;
        },
        canWrite(op, path, newValue) {
            const root = db.raw();
            const parts = split(path);
            const newRoot = setAt(root, parts, newValue);
            const chain = walk(rules, parts);
            const writeOk = chain.some(({ rule, depth, vars }) => rule['.write']
                && evaluate(rule['.write'], scopeFor(root, root, newRoot, parts.slice(0, depth), vars)));
            const last = chain[chain.length - 1];
            const fullPath = last.depth === parts.length;
            const validateOk = newValue === null || newValue === undefined
                || (fullPath ? validateTree(last.rule, newRoot, parts, last.vars, root) : true);
            const allowed = writeOk && validateOk;

            evaluations.push({ kind: 'write', op, path, allowed, writeOk, validateOk });
            return allowed;
        }
    };
}
