/**
 * Arnés mínimo para las pruebas unitarias de src/utils/. No agrega
 * dependencias nuevas: usa node:assert/strict (incluido en Node) y un
 * runner propio, en el mismo estilo que .github/qa-infra (contador de
 * [PASS]/[FAIL] y código de salida distinto de cero si algo falla).
 */
import assert from 'node:assert/strict';

/**
 * Crea un runner de pruebas independiente para un módulo.
 *
 * @param {string} moduleName Nombre a mostrar en el resumen final.
 * @returns {{test: Function, summarize: Function}}
 */
export function createRunner(moduleName) {
    let passed = 0;
    let failed = 0;

    function test(name, fn) {
        try {
            fn();
            passed += 1;
            console.log(`  [PASS] ${name}`);
        } catch (error) {
            failed += 1;
            console.error(`  [FAIL] ${name}`);
            console.error(`         ${error && error.message ? error.message : error}`);
        }
    }

    /**
     * Prueba asíncrona: se espera con `await summarizeAsync()` al final del archivo.
     * (`test()` no espera promesas: una prueba `async` pasada a `test()` nunca falla de verdad.)
     */
    const pending = [];

    function testAsync(name, fn) {
        pending.push(Promise.resolve().then(fn).then(
            () => {
                passed += 1;
                console.log(`  [PASS] ${name}`);
            },
            (error) => {
                failed += 1;
                console.error(`  [FAIL] ${name}`);
                console.error(`         ${error && error.message ? error.message : error}`);
            }
        ));
    }

    async function summarizeAsync() {
        await Promise.all(pending);
        return summarize();
    }

    function summarize() {
        console.log(`${moduleName}: ${passed} passed, ${failed} failed.`);

        if (failed > 0) {
            process.exitCode = 1;
        }

        return { passed, failed };
    }

    return { test, testAsync, summarize, summarizeAsync };
}

export { assert };
