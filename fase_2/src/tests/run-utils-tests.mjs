/**
 * Corre las siete suites de src/utils/ en procesos separados (como hace
 * .github/qa-infra/package.json con sus propias pruebas) y muestra un
 * resumen final. Uso:
 *
 *   node src/tests/run-utils-tests.mjs
 *
 * Sale con código 1 si alguna suite falla, para poder usarse en CI.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

const suites = [
    'utils/constants.test.mjs',
    'utils/date-time.test.mjs',
    'utils/excel.test.mjs',
    'utils/normalize.test.mjs',
    'utils/result.test.mjs',
    'utils/sanitization.test.mjs',
    'utils/validation.test.mjs'
];

let anyFailed = false;

for (const suite of suites) {
    console.log(`\n--- ${suite} ---`);

    const result = spawnSync(process.execPath, [path.join(here, suite)], {
        stdio: 'inherit'
    });

    if (result.status !== 0) {
        anyFailed = true;
    }
}

console.log('\n==============================');
console.log(anyFailed ? 'Resultado: hay suites con fallas.' : 'Resultado: todas las suites pasaron.');

process.exit(anyFailed ? 1 : 0);
