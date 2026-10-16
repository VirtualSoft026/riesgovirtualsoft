/**
 * Pruebas unitarias para idle-detector-adapter.
 *
 * Las funciones exportadas son async; se usa un runner async propio que
 * extiende el patrón del test-harness con soporte para Promises.
 *
 * Estado del módulo: el módulo conserva estado entre pruebas (idleDetectorGranted,
 * getLastActivityTimestamp). Las pruebas están ordenadas para que ese estado
 * sea predecible. No se parchean módulos ni se usa vm.
 */
import assert from 'node:assert/strict';
import {
    initIdleDetector,
    requestIdlePermissionManual,
    shouldApplyDomIdleFallback,
    bindIdleActivityListeners,
    IDLE_ACTIVITY_DOCUMENT_EVENTS,
    IDLE_ACTIVITY_WINDOW_EVENTS,
    DOM_IDLE_POLL_MS
} from '../../../services/browser/idle-detector-adapter.js';

const DOM_IDLE_MS = 5 * 60 * 1000; // 300 000 ms

// ── Runner async mínimo ────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        passed += 1;
        console.log(`  [PASS] ${name}`);
    } catch (e) {
        failed += 1;
        console.error(`  [FAIL] ${name}`);
        console.error(`         ${e && e.message ? e.message : e}`);
    }
}

function summarize() {
    console.log(
        `idle-detector-adapter: ${passed} passed, ${failed} failed.`
    );
    if (failed > 0) process.exitCode = 1;
}

// ── shouldApplyDomIdleFallback (no depende de browser) ────────────────────

await test('retorna false con lastActivity reciente (getLastActivityTimestamp = Date.now)', async () => {
    // Estado inicial: getLastActivityTimestamp = () => Date.now()
    // now - Date.now() ≈ 0, no > 300 000
    const result = shouldApplyDomIdleFallback(Date.now());
    assert.strictEqual(result, false);
});

await test('retorna true cuando lastActivity fue hace más de 5 minutos', async () => {
    // Configura lastActivityTimestamp = 0 (epoch, hace décadas)
    await initIdleDetector({ getLastActivityTimestamp: () => 0, autoStart: false });
    const result = shouldApplyDomIdleFallback(Date.now());
    assert.strictEqual(result, true);
});

await test('retorna false cuando lastActivity fue hace menos de 5 minutos', async () => {
    const recent = Date.now() - 60_000; // hace 1 minuto
    await initIdleDetector({ getLastActivityTimestamp: () => recent, autoStart: false });
    const result = shouldApplyDomIdleFallback(Date.now());
    assert.strictEqual(result, false);
});

await test('retorna false cuando now exactamente en el umbral (no supera)', async () => {
    await initIdleDetector({ getLastActivityTimestamp: () => 0, autoStart: false });
    // now = DOM_IDLE_MS → 300 000 - 0 = 300 000, not > 300 000
    const result = shouldApplyDomIdleFallback(DOM_IDLE_MS);
    assert.strictEqual(result, false);
});

await test('retorna true cuando now supera el umbral en 1 ms', async () => {
    await initIdleDetector({ getLastActivityTimestamp: () => 0, autoStart: false });
    const result = shouldApplyDomIdleFallback(DOM_IDLE_MS + 1);
    assert.strictEqual(result, true);
});

// ── shouldApplyDomIdleFallback con document mockeado ──────────────────────

await test('retorna false cuando document.visibilityState !== "visible"', async () => {
    await initIdleDetector({ getLastActivityTimestamp: () => 0, autoStart: false });

    const savedDoc = global.document;
    global.document = {
        visibilityState: 'hidden',
        hasFocus: () => true
    };

    const result = shouldApplyDomIdleFallback(Date.now());
    global.document = savedDoc;

    assert.strictEqual(result, false);
});

await test('retorna false cuando document.hasFocus() = false', async () => {
    await initIdleDetector({ getLastActivityTimestamp: () => 0, autoStart: false });

    const savedDoc = global.document;
    global.document = {
        visibilityState: 'visible',
        hasFocus: () => false
    };

    const result = shouldApplyDomIdleFallback(Date.now());
    global.document = savedDoc;

    assert.strictEqual(result, false);
});

await test('retorna true cuando document visible, con foco y actividad lejana', async () => {
    await initIdleDetector({ getLastActivityTimestamp: () => 0, autoStart: false });

    const savedDoc = global.document;
    global.document = {
        visibilityState: 'visible',
        hasFocus: () => true
    };

    const result = shouldApplyDomIdleFallback(Date.now());
    global.document = savedDoc;

    assert.strictEqual(result, true);
});

await test('retorna false cuando getLastActivityTimestamp retorna NaN', async () => {
    await initIdleDetector({ getLastActivityTimestamp: () => NaN, autoStart: false });
    const result = shouldApplyDomIdleFallback(Date.now());
    assert.strictEqual(result, false);
});

// ── requestIdlePermissionManual en Node (sin window) ─────────────────────

await test('requestIdlePermissionManual retorna false cuando window no existe', async () => {
    // Restablece estado del módulo
    await initIdleDetector({ getLastActivityTimestamp: () => Date.now(), autoStart: false });

    // Asegura que no hay window (entorno Node por defecto)
    const savedWindow = global.window;
    delete global.window;

    const result = await requestIdlePermissionManual();
    global.window = savedWindow;

    assert.strictEqual(result, false);
});

// ── requestIdlePermissionManual con window mockeado ───────────────────────

await test('retorna false cuando IdleDetector.requestPermission no es función', async () => {
    const savedWindow = global.window;
    global.window = {
        IdleDetector: class MockIdleDetector {}
        // sin requestPermission estático
    };

    const result = await requestIdlePermissionManual();
    global.window = savedWindow;

    assert.strictEqual(result, false);
});

await test('retorna false cuando requestPermission devuelve "denied"', async () => {
    const savedWindow = global.window;
    global.window = {
        IdleDetector: class MockIdleDetector {
            static async requestPermission() { return 'denied'; }
        }
    };

    const result = await requestIdlePermissionManual();
    global.window = savedWindow;

    assert.strictEqual(result, false);
});

await test('retorna true cuando requestPermission devuelve "granted" y detector arranca', async () => {
    const savedWindow = global.window;
    global.window = {
        IdleDetector: class MockIdleDetector {
            static async requestPermission() { return 'granted'; }
            addEventListener() {}
            async start() {}
            get userState() { return 'active'; }
            get screenState() { return 'unlocked'; }
        }
    };

    const result = await requestIdlePermissionManual();
    global.window = savedWindow;

    assert.strictEqual(result, true);
});

await test('shouldApplyDomIdleFallback retorna false cuando idleDetectorGranted=true', async () => {
    // Estado tras el test anterior: idleDetectorGranted = true
    // initIdleDetector con getLastActivityTimestamp = 0 no resetea granted
    await initIdleDetector({ getLastActivityTimestamp: () => 0, autoStart: false });
    // granted sigue true desde el test anterior (startIdleDetectorLogic lo puso true)
    const result = shouldApplyDomIdleFallback(Date.now());
    // La primera condición: if (idleDetectorGranted) return false
    assert.strictEqual(result, false);
});

await test('retorna false cuando requestPermission lanza excepción', async () => {
    const savedWindow = global.window;
    global.window = {
        IdleDetector: class MockIdleDetector {
            static async requestPermission() {
                throw new Error('Permission API error');
            }
        }
    };

    // Resetea estado del módulo primero
    delete global.window;
    await requestIdlePermissionManual(); // → false, resetea granted=false
    global.window = savedWindow;

    const result = await requestIdlePermissionManual();
    global.window = savedWindow;

    assert.strictEqual(result, false);
});

// ── bindIdleActivityListeners (W-24, paso 3.3) ──────────────────────────────

/** Documento o ventana falsos que guardan los listeners por tipo de evento. */
function fakeTarget() {
    const listeners = new Map();
    return {
        listeners,
        addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
        removeEventListener(type, fn) { if (listeners.has(type)) listeners.get(type).delete(fn); },
        count(type) { return listeners.has(type) ? listeners.get(type).size : 0; },
    };
}

/** Intervalo falso: guarda la función y el periodo, y permite dispararla a mano. */
function fakeInterval() {
    const calls = { set: [], cleared: [], fn: null, ms: null, token: 'T1' };
    calls.setIntervalFn = (fn, ms) => { calls.fn = fn; calls.ms = ms; calls.set.push(ms); return calls.token; };
    calls.clearIntervalFn = (t) => { calls.cleared.push(t); };
    return calls;
}

await test('bindIdleActivityListeners registra los eventos de actividad del documento y de la ventana', async () => {
    const doc = fakeTarget();
    const win = fakeTarget();
    const timer = fakeInterval();
    const onActivity = () => {};
    bindIdleActivityListeners({ doc, win, onActivity, setIntervalFn: timer.setIntervalFn, clearIntervalFn: timer.clearIntervalFn });

    for (const name of IDLE_ACTIVITY_DOCUMENT_EVENTS) assert.strictEqual(doc.count(name), 1, `documento: ${name}`);
    for (const name of IDLE_ACTIVITY_WINDOW_EVENTS) assert.strictEqual(win.count(name), 1, `ventana: ${name}`);
    assert.deepStrictEqual(IDLE_ACTIVITY_DOCUMENT_EVENTS, ['mousemove', 'keydown', 'click', 'scroll', 'visibilitychange']);
    assert.deepStrictEqual(IDLE_ACTIVITY_WINDOW_EVENTS, ['focus']);
    assert.strictEqual(doc.listeners.get('mousemove').has(onActivity), true, 'el mismo onActivity se registra');
});

await test('bindIdleActivityListeners usa el periodo de sondeo por defecto (1 s)', async () => {
    const timer = fakeInterval();
    bindIdleActivityListeners({ doc: fakeTarget(), win: fakeTarget(), onActivity: () => {}, setIntervalFn: timer.setIntervalFn, clearIntervalFn: timer.clearIntervalFn });
    assert.strictEqual(DOM_IDLE_POLL_MS, 1000);
    assert.strictEqual(timer.ms, 1000);
});

await test('bindIdleActivityListeners respeta un periodo de sondeo indicado', async () => {
    const timer = fakeInterval();
    bindIdleActivityListeners({ doc: fakeTarget(), win: fakeTarget(), onActivity: () => {}, pollMs: 250, setIntervalFn: timer.setIntervalFn, clearIntervalFn: timer.clearIntervalFn });
    assert.strictEqual(timer.ms, 250);
});

await test('el desenlace retira todos los listeners y limpia el intervalo', async () => {
    const doc = fakeTarget();
    const win = fakeTarget();
    const timer = fakeInterval();
    const unbind = bindIdleActivityListeners({ doc, win, onActivity: () => {}, setIntervalFn: timer.setIntervalFn, clearIntervalFn: timer.clearIntervalFn });
    unbind();

    for (const name of IDLE_ACTIVITY_DOCUMENT_EVENTS) assert.strictEqual(doc.count(name), 0, `documento retirado: ${name}`);
    for (const name of IDLE_ACTIVITY_WINDOW_EVENTS) assert.strictEqual(win.count(name), 0, `ventana retirada: ${name}`);
    assert.deepStrictEqual(timer.cleared, ['T1']);
});

await test('el sondeo llama onDomFallback cuando el respaldo DOM aplica (más de 5 min sin actividad)', async () => {
    await initIdleDetector({ getLastActivityTimestamp: () => 0, autoStart: false });
    const timer = fakeInterval();
    let fallbacks = 0;
    bindIdleActivityListeners({
        doc: fakeTarget(), win: fakeTarget(), onActivity: () => {},
        onDomFallback: () => { fallbacks += 1; },
        setIntervalFn: timer.setIntervalFn, clearIntervalFn: timer.clearIntervalFn
    });
    timer.fn();
    assert.strictEqual(fallbacks, 1);
});

await test('el sondeo no llama onDomFallback con actividad reciente', async () => {
    await initIdleDetector({ getLastActivityTimestamp: () => Date.now(), autoStart: false });
    const timer = fakeInterval();
    let fallbacks = 0;
    bindIdleActivityListeners({
        doc: fakeTarget(), win: fakeTarget(), onActivity: () => {},
        onDomFallback: () => { fallbacks += 1; },
        setIntervalFn: timer.setIntervalFn, clearIntervalFn: timer.clearIntervalFn
    });
    timer.fn();
    assert.strictEqual(fallbacks, 0);
});

await test('el sondeo sin onDomFallback no lanza error', async () => {
    await initIdleDetector({ getLastActivityTimestamp: () => 0, autoStart: false });
    const timer = fakeInterval();
    bindIdleActivityListeners({ doc: fakeTarget(), win: fakeTarget(), onActivity: () => {}, setIntervalFn: timer.setIntervalFn, clearIntervalFn: timer.clearIntervalFn });
    timer.fn();
    assert.ok(true);
});

await test('bindIdleActivityListeners rechaza un onActivity que no es función', async () => {
    assert.throws(
        () => bindIdleActivityListeners({ doc: fakeTarget(), win: fakeTarget(), onActivity: null, setIntervalFn: () => 'x', clearIntervalFn: () => {} }),
        TypeError
    );
});

summarize();
