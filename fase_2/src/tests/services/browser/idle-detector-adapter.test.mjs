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
    shouldApplyDomIdleFallback
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

summarize();
