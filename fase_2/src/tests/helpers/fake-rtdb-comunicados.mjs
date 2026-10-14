/**
 * Base simulada mínima de Firebase Realtime Database para las pruebas del corte "Comunicados,
 * configuración e incidencias". Reproduce lo que ese corte usa y nada más:
 *
 *  - `ref(path)` con `set`, `update` (multi-ruta), `remove`, `push`, `once('value')`, `on('value')`/`off`,
 *    `transaction(fn, onComplete)` y `onDisconnect()` (`update`/`set`/`remove` diferidos);
 *  - `ref('.info/connected')` controlado con `db.setConnected(bool)` y `db.simulateDisconnect()`;
 *  - `ref(path).orderByChild(k).limitToLast(n)` (solo `on`/`once`);
 *  - snapshots con `val()`, `exists()`, `key`, `forEach()` (se detiene si el callback devuelve true, como
 *    el SDK) y `child()`;
 *  - `ServerValue.TIMESTAMP` sustituido por `db.clock()` al escribir;
 *  - reglas de escritura/lectura inyectables: `db.rules = { canWrite(op, path, newValue, oldValue), canRead(path) }`;
 *    una escritura denegada rechaza con `Error('PERMISSION_DENIED: ...')` (`code: 'PERMISSION_DENIED'`).
 *  - fallos que NO son de reglas (red caída, escritura cancelada...): `db.failWrites = (op, path) => Error|null`;
 *    si devuelve un error, la escritura se rechaza con él ANTES de evaluar reglas y no se aplica nada.
 *  - `transaction`: llama primero a `fn(null)` (suposición local del SDK) y, si el servidor ya tenía un
 *    valor, reintenta con el valor real, igual que Firebase; `fn` puede devolver `undefined` para abortar.
 *
 * No es una réplica completa: sirve para demostrar comportamiento (escrituras, transacciones,
 * desconexiones, lecturas en vivo), no para validar el lenguaje de reglas.
 */

export const TIMESTAMP = Object.freeze({ '.sv': 'timestamp' });

function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function split(path) {
    return String(path).split('/').filter((part) => part.length > 0);
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
    if (parts.length === 0) return value === undefined ? null : value;

    let node = root;

    for (let i = 0; i < parts.length - 1; i += 1) {
        if (node[parts[i]] === null || node[parts[i]] === undefined || typeof node[parts[i]] !== 'object') {
            node[parts[i]] = {};
        }
        node = node[parts[i]];
    }

    const last = parts[parts.length - 1];

    if (value === null || value === undefined) {
        delete node[last];
    } else {
        node[last] = value;
    }

    // Firebase no conserva nodos vacíos: limpia hacia arriba
    for (let depth = parts.length - 1; depth > 0; depth -= 1) {
        const parent = getAt(root, parts.slice(0, depth));

        if (parent && typeof parent === 'object' && Object.keys(parent).length === 0) {
            setAt(root, parts.slice(0, depth), null);
        }
    }

    return root;
}

function makeSnapshot(key, value) {
    const val = clone(value);

    return {
        key,
        val: () => clone(val === undefined ? null : val),
        exists: () => val !== null && val !== undefined,
        child: (childPath) => makeSnapshot(split(childPath).pop() || null, getAt(val, split(childPath))),
        forEach(callback) {
            if (!val || typeof val !== 'object') return false;

            for (const childKey of Object.keys(val)) {
                if (callback(makeSnapshot(childKey, val[childKey])) === true) return true;
            }

            return false;
        }
    };
}

function permissionDenied(op, path) {
    const error = new Error(`PERMISSION_DENIED: ${op} ${path}`);
    error.code = 'PERMISSION_DENIED';
    return error;
}

/**
 * @param {{data?: object, clock?: () => number}} [options]
 */
export function createFakeRtdb({ data = {}, clock = () => 1700000000000 } = {}) {
    let root = clone(data);
    const listeners = []; // { path, handler, query }
    const disconnectOps = []; // { path, op, value }
    const log = []; // { op, path, value }
    let pushCounter = 0;
    let connected = false;

    const db = {
        rules: null,
        failWrites: null,
        clock,
        log,
        TIMESTAMP,
        serverValue: { TIMESTAMP },
        snapshot: (path) => clone(getAt(root, split(path))),
        raw: () => clone(root)
    };

    function resolveServerValues(value) {
        if (value && typeof value === 'object') {
            if (value['.sv'] === 'timestamp') return clock();
            const out = Array.isArray(value) ? [] : {};
            Object.keys(value).forEach((k) => { out[k] = resolveServerValues(value[k]); });
            return out;
        }
        return value;
    }

    function assertNoUndefined(value, path) {
        if (value === undefined) {
            throw new Error(`Firebase.set failed: First argument contains undefined in property '${path}'`);
        }
        if (value && typeof value === 'object' && value['.sv'] === undefined) {
            Object.keys(value).forEach((k) => assertNoUndefined(value[k], `${path}.${k}`));
        }
    }

    function checkWrite(op, path, newValue) {
        if (typeof db.failWrites === 'function') {
            const failure = db.failWrites(op, path);
            if (failure) throw failure;
        }

        if (db.rules && typeof db.rules.canWrite === 'function') {
            const oldValue = getAt(root, split(path));

            if (!db.rules.canWrite(op, path, clone(newValue), clone(oldValue))) {
                throw permissionDenied(op, path);
            }
        }
    }

    function notify() {
        for (const l of listeners.slice()) {
            if (l.path === '.info/connected') continue; // solo cambia con setConnected / simulateDisconnect
            fire(l);
        }
    }

    function fire(l) {
        if (l.path === '.info/connected') {
            l.handler(makeSnapshot('connected', connected));
            return;
        }

        if (db.rules && typeof db.rules.canRead === 'function' && !db.rules.canRead(l.path)) {
            return;
        }

        l.handler(makeSnapshot(split(l.path).pop() || null, readQuery(l.path, l.query)));
    }

    function readQuery(path, query) {
        const value = getAt(root, split(path));

        if (!query || !value || typeof value !== 'object') return value;

        let keys = Object.keys(value);

        if (query.orderByChild) {
            keys = keys.sort((a, b) => {
                const va = value[a] && value[a][query.orderByChild];
                const vb = value[b] && value[b][query.orderByChild];
                return (va === undefined ? 0 : va) - (vb === undefined ? 0 : vb);
            });
        }

        if (query.limitToLast) keys = keys.slice(-query.limitToLast);

        const out = {};
        keys.forEach((k) => { out[k] = value[k]; });
        return out;
    }

    function writeAt(op, path, value) {
        const resolved = resolveServerValues(value);
        assertNoUndefined(value, path);
        checkWrite(op, path, resolved);
        root = setAt(root, split(path), clone(resolved)) || {};
        log.push({ op, path, value: clone(resolved) });
        notify();
    }

    function makeRef(path, query) {
        const ref = {
            key: split(path).pop() || null,
            path,
            child: (sub) => makeRef(`${path}/${sub}`),
            set(value) {
                try { writeAt('set', path, value); } catch (e) { return Promise.reject(e); }
                return Promise.resolve();
            },
            update(obj) {
                try {
                    // Multi-ruta atómica: valida todo antes de aplicar
                    const entries = Object.keys(obj).map((k) => [`${path}/${k}`, resolveServerValues(obj[k])]);
                    entries.forEach(([p, v]) => { assertNoUndefined(v, p); checkWrite('update', p, v); });
                    entries.forEach(([p, v]) => {
                        root = setAt(root, split(p), clone(v)) || {};
                        log.push({ op: 'update', path: p, value: clone(v) });
                    });
                    notify();
                } catch (e) { return Promise.reject(e); }
                return Promise.resolve();
            },
            remove() {
                try { writeAt('remove', path, null); } catch (e) { return Promise.reject(e); }
                return Promise.resolve();
            },
            push() {
                pushCounter += 1;
                const key = `-Nfake${String(pushCounter).padStart(4, '0')}`;
                const childRef = makeRef(`${path}/${key}`);
                return childRef;
            },
            once() {
                if (path !== '.info/connected' && db.rules && typeof db.rules.canRead === 'function' && !db.rules.canRead(path)) {
                    return Promise.reject(permissionDenied('read', path));
                }
                if (path === '.info/connected') return Promise.resolve(makeSnapshot('connected', connected));
                return Promise.resolve(makeSnapshot(ref.key, readQuery(path, query)));
            },
            on(event, handler) {
                const l = { path, handler, query };
                listeners.push(l);
                fire(l);
                return handler;
            },
            off(event, handler) {
                for (let i = listeners.length - 1; i >= 0; i -= 1) {
                    if (listeners[i].path === path && (!handler || listeners[i].handler === handler)) listeners.splice(i, 1);
                }
            },
            orderByChild: (k) => makeRef(path, { ...(query || {}), orderByChild: k }),
            limitToLast: (n) => makeRef(path, { ...(query || {}), limitToLast: n }),
            onDisconnect() {
                return {
                    update(obj) { disconnectOps.push({ path, op: 'update', value: clone(obj) }); return Promise.resolve(); },
                    set(value) { disconnectOps.push({ path, op: 'set', value: clone(value) }); return Promise.resolve(); },
                    remove() { disconnectOps.push({ path, op: 'remove', value: null }); return Promise.resolve(); },
                    cancel() { for (let i = disconnectOps.length - 1; i >= 0; i -= 1) if (disconnectOps[i].path === path) disconnectOps.splice(i, 1); return Promise.resolve(); }
                };
            },
            transaction(updateFn, onComplete) {
                const actual = getAt(root, split(path));
                let attempts = 0;
                let proposal;

                try {
                    // Primer intento con la suposición local del SDK (sin caché: null)
                    attempts += 1;
                    proposal = updateFn(null);

                    if (actual !== null && actual !== undefined) {
                        attempts += 1;
                        proposal = updateFn(clone(actual));
                    }

                    if (proposal === undefined) {
                        const snap = makeSnapshot(ref.key, actual);
                        if (onComplete) onComplete(null, false, snap);
                        return Promise.resolve({ committed: false, snapshot: snap });
                    }

                    checkWrite('transaction', path, proposal);
                    root = setAt(root, split(path), clone(proposal)) || {};
                    log.push({ op: 'transaction', path, value: clone(proposal), attempts });
                    notify();
                } catch (error) {
                    if (onComplete) onComplete(error, false, null);
                    return Promise.resolve({ committed: false, snapshot: null, error });
                }

                const snap = makeSnapshot(ref.key, proposal);
                if (onComplete) onComplete(null, true, snap);
                return Promise.resolve({ committed: true, snapshot: snap });
            }
        };

        return ref;
    }

    db.ref = (path = '') => makeRef(path);

    /** Cambia el estado de `.info/connected` y avisa a quienes lo escuchan. */
    db.setConnected = (value) => {
        connected = Boolean(value);
        listeners.filter((l) => l.path === '.info/connected').forEach(fire);
    };

    /** Corta la conexión: ejecuta las operaciones `onDisconnect` registradas y las consume. */
    db.simulateDisconnect = () => {
        connected = false;
        const ops = disconnectOps.splice(0, disconnectOps.length);

        ops.forEach(({ path, op, value }) => {
            const resolved = resolveServerValues(value);

            if (op === 'update') {
                Object.keys(resolved).forEach((k) => {
                    root = setAt(root, split(`${path}/${k}`), clone(resolved[k])) || {};
                    log.push({ op: 'onDisconnect.update', path: `${path}/${k}`, value: clone(resolved[k]) });
                });
            } else if (op === 'set') {
                root = setAt(root, split(path), clone(resolved)) || {};
                log.push({ op: 'onDisconnect.set', path, value: clone(resolved) });
            } else {
                root = setAt(root, split(path), null) || {};
                log.push({ op: 'onDisconnect.remove', path, value: null });
            }
        });

        listeners.filter((l) => l.path === '.info/connected').forEach(fire);
        notify();
    };

    db.pendingDisconnectOps = () => clone(disconnectOps);
    db.listenerCount = (path) => listeners.filter((l) => !path || l.path === path).length;

    return db;
}
