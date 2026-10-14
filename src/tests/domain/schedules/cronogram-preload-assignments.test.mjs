import { createRunner, assert } from '../../test-harness.mjs';
import {
    preloadCronograma,
    loadCronogramaAssignments,
} from '../../../domain/schedules/cronogram-parser.js';

/**
 * Tests para preloadCronograma() y loadCronogramaAssignments().
 *
 * Ambas funciones son async con I/O real (fetch + xlsx). Las pruebas
 * inyectan mocks de fetchDependencies para cubrir: happy path, 404,
 * error de red, fetchDependencies nulo y casos de datos borde.
 *
 * Estado en plan-maestro: "Migrada, sin prueba" → estas pruebas las pasan
 * a "Hecha + probada".
 *
 * Decisión técnica:
 * - preloadCronograma() NO tiene try/catch: un TypeError de deps inválidas
 *   se propaga al llamador.
 * - loadCronogramaAssignments() SÍ tiene try/catch: cualquier error (incluso
 *   TypeError de deps inválidas) es capturado y devuelve [].
 */

const { test, summarize } = createRunner(
    'cronogram-parser — preloadCronograma / loadCronogramaAssignments'
);

// ── Helpers de mock ───────────────────────────────────────────────────────────

/**
 * Lunes 12 de octubre de 2026 — día entre semana; candidateMonths = [Octubre].
 * Usar un único mes candidato mantiene los mocks simples.
 */
const LUNES_OCT_12_2026 = new Date(2026, 9, 12);

/**
 * Filas de cronograma con encabezados estándar, una fila de Set y dos
 * gestores asignados en columnas mañana (1/2) y tarde (4/5).
 *
 * Layout:
 *   col 0  col 1          col 2        col 3  col 4          col 5
 *   ''     'Mañana'       'Gestor'     ''     'Tarde'        'Gestor'
 *   ''     'Set Prueba'   'Gestor'     ''     'Set Prueba'   'Gestor'
 *   ''     'Tarea Alpha'  'Ana López'  ''     'Tarea Beta'   'Ana López'
 *   ''     'Tarea Gamma'  'Luis Ruiz'  ''     'Tarea Delta'  'Carlos Díaz'
 */
const CRON_ROWS = [
    ['', 'Mañana', 'Gestor', '', 'Tarde', 'Gestor'],
    ['', 'Set Prueba', 'Gestor', '', 'Set Prueba', 'Gestor'],
    ['', 'Tarea Alpha', 'Ana López', '', 'Tarea Beta', 'Ana López'],
    ['', 'Tarea Gamma', 'Luis Ruiz', '', 'Tarea Delta', 'Carlos Díaz'],
];

/**
 * Construye fetchDependencies que devuelve `rows` en el happy path.
 * La hoja se llama 'Cronograma' (sin "Semana"), así getWeekSheet usa sheetNames[0].
 */
function makeFetchDeps(rows) {
    return {
        baseUrl: 'https://fake.test',
        cacheBust: false,
        fetchImpl: async () => ({
            ok: true,
            status: 200,
            arrayBuffer: async () => new ArrayBuffer(0),
        }),
        xlsx: {
            read: () => ({
                SheetNames: ['Cronograma'],
                Sheets: { Cronograma: {} },
            }),
            utils: { sheet_to_json: () => rows },
        },
    };
}

/**
 * Todas las peticiones devuelven 404: fetchCronogramaRowsForDate retorna null.
 */
function makeNotFoundDeps() {
    return {
        baseUrl: 'https://fake.test',
        cacheBust: false,
        fetchImpl: async () => ({ ok: false, status: 404 }),
        xlsx: {
            read: () => ({}),
            utils: { sheet_to_json: () => [] },
        },
    };
}

/**
 * fetchImpl lanza Error de red: el error es atrapado dentro del loop de meses
 * de fetchCronogramaRowsForDate y ésta devuelve null.
 */
function makeNetworkErrorDeps() {
    return {
        baseUrl: 'https://fake.test',
        cacheBust: false,
        fetchImpl: async () => { throw new Error('network error'); },
        xlsx: {
            read: () => ({}),
            utils: { sheet_to_json: () => [] },
        },
    };
}

// ── atest: runner async (mismo patrón que cronogram-parser.test.mjs) ─────────

let asyncFailed = 0;

async function atest(name, fn) {
    try {
        await fn();
        console.log(`  [PASS] ${name}`);
    } catch (e) {
        console.error(`  [FAIL] ${name}`);
        console.error(`         ${e && e.message ? e.message : e}`);
        asyncFailed += 1;
    }
}

// ════════════════════════════════════════════════════════════════════════════
// preloadCronograma
// ════════════════════════════════════════════════════════════════════════════

await atest('preloadCronograma: happy path — devuelve las filas y llama onLoaded', async () => {
    let received = undefined;
    const rows = await preloadCronograma({
        targetDate: LUNES_OCT_12_2026,
        fetchDependencies: makeFetchDeps(CRON_ROWS),
        onLoaded: (r) => { received = r; },
    });
    assert.ok(Array.isArray(rows), 'retorna array');
    assert.strictEqual(rows, received, 'onLoaded recibió exactamente las mismas filas (misma referencia)');
    assert.strictEqual(rows.length, CRON_ROWS.length);
});

await atest('preloadCronograma: sin onLoaded — no lanza y retorna filas', async () => {
    const rows = await preloadCronograma({
        targetDate: LUNES_OCT_12_2026,
        fetchDependencies: makeFetchDeps(CRON_ROWS),
        // onLoaded omitido
    });
    assert.ok(Array.isArray(rows));
});

await atest('preloadCronograma: fetch 404 — retorna null y onLoaded NO se llama', async () => {
    let called = false;
    const rows = await preloadCronograma({
        targetDate: LUNES_OCT_12_2026,
        fetchDependencies: makeNotFoundDeps(),
        onLoaded: () => { called = true; },
    });
    assert.strictEqual(rows, null, 'rows debe ser null cuando fetch falla');
    assert.strictEqual(called, false, 'onLoaded no debe haber sido llamado');
});

await atest('preloadCronograma: error de red — retorna null (error atrapado en fetchCronogramaRowsForDate)', async () => {
    let called = false;
    const rows = await preloadCronograma({
        targetDate: LUNES_OCT_12_2026,
        fetchDependencies: makeNetworkErrorDeps(),
        onLoaded: () => { called = true; },
    });
    assert.strictEqual(rows, null);
    assert.strictEqual(called, false);
});

await atest('preloadCronograma: onLoaded no es función — no lanza, onLoaded ignorado', async () => {
    // Si onLoaded es un string, la guarda no se ejecuta (typeof !== 'function')
    let threw = false;
    try {
        await preloadCronograma({
            targetDate: LUNES_OCT_12_2026,
            fetchDependencies: makeFetchDeps(CRON_ROWS),
            onLoaded: 'no-es-funcion',
        });
    } catch {
        threw = true;
    }
    assert.strictEqual(threw, false);
});

await atest('preloadCronograma: fetchDependencies null — propaga TypeError (no tiene try/catch)', async () => {
    await assert.rejects(
        preloadCronograma({
            targetDate: LUNES_OCT_12_2026,
            fetchDependencies: null,
        }),
        TypeError
    );
});

// ════════════════════════════════════════════════════════════════════════════
// loadCronogramaAssignments
// ════════════════════════════════════════════════════════════════════════════

await atest('loadCronogramaAssignments: happy path — devuelve [{set, task}] para gestor asignado', async () => {
    const result = await loadCronogramaAssignments(
        'Ana López',
        'Mañana',
        { targetDate: LUNES_OCT_12_2026, fetchDependencies: makeFetchDeps(CRON_ROWS) }
    );
    assert.ok(Array.isArray(result), 'retorna array');
    assert.ok(result.length > 0, 'Ana López debe tener al menos una asignación');
    result.forEach((a, i) => {
        assert.ok(
            Object.prototype.hasOwnProperty.call(a, 'set'),
            `asignación ${i} sin propiedad 'set'`
        );
        assert.ok(
            Object.prototype.hasOwnProperty.call(a, 'task'),
            `asignación ${i} sin propiedad 'task'`
        );
    });
});

await atest('loadCronogramaAssignments: set correcto en todas las asignaciones', async () => {
    const result = await loadCronogramaAssignments(
        'Ana López',
        'Mañana',
        { targetDate: LUNES_OCT_12_2026, fetchDependencies: makeFetchDeps(CRON_ROWS) }
    );
    // Las filas de datos vienen tras 'Set Prueba' → todas con set='Set Prueba'
    result.forEach((a) => {
        assert.strictEqual(a.set, 'Set Prueba', `set incorrecto: ${a.set}`);
    });
});

await atest('loadCronogramaAssignments: tareas correctas para Ana López en lunes', async () => {
    const result = await loadCronogramaAssignments(
        'Ana López',
        'Mañana',
        { targetDate: LUNES_OCT_12_2026, fetchDependencies: makeFetchDeps(CRON_ROWS) }
    );
    const tasks = result.map((a) => a.task);
    // Mañana col 1/2: 'Tarea Alpha' asignada a Ana; Tarde col 4/5: 'Tarea Beta'
    assert.ok(tasks.includes('Tarea Alpha'), `falta Tarea Alpha; encontradas: ${tasks.join(', ')}`);
    assert.ok(tasks.includes('Tarea Beta'), `falta Tarea Beta; encontradas: ${tasks.join(', ')}`);
});

await atest('loadCronogramaAssignments: gestor no asignado — devuelve []', async () => {
    const result = await loadCronogramaAssignments(
        'Gestor Fantasma',
        'Mañana',
        { targetDate: LUNES_OCT_12_2026, fetchDependencies: makeFetchDeps(CRON_ROWS) }
    );
    assert.deepStrictEqual(result, []);
});

await atest('loadCronogramaAssignments: sin fila de Set antes de la tarea — usa "Otros"', async () => {
    // Sin ninguna fila que empiece con 'set ' antes de la tarea del gestor
    const rowsSinSet = [
        ['', 'Mañana', 'Gestor', '', 'Tarde', 'Gestor'],
        ['', 'Tarea Z', 'Pedro Jiménez', '', '', ''],
    ];
    const result = await loadCronogramaAssignments(
        'Pedro Jiménez',
        'Mañana',
        { targetDate: LUNES_OCT_12_2026, fetchDependencies: makeFetchDeps(rowsSinSet) }
    );
    assert.ok(result.length > 0, 'Pedro debe tener una asignación');
    assert.strictEqual(result[0].set, 'Otros', `set debería ser 'Otros', era: ${result[0].set}`);
    assert.strictEqual(result[0].task, 'Tarea Z');
});

await atest('loadCronogramaAssignments: set actualiza al cambiar de sección', async () => {
    const rowsDosSet = [
        ['', 'Mañana', 'Gestor', '', 'Tarde', 'Gestor'],
        ['', 'Set A', 'Gestor', '', '', ''],
        ['', 'Tarea A1', 'Juan Martín', '', '', ''],
        ['', 'Set B', 'Gestor', '', '', ''],
        ['', 'Tarea B1', 'Juan Martín', '', '', ''],
    ];
    const result = await loadCronogramaAssignments(
        'Juan Martín',
        'Mañana',
        { targetDate: LUNES_OCT_12_2026, fetchDependencies: makeFetchDeps(rowsDosSet) }
    );
    const setA = result.find((a) => a.task === 'Tarea A1');
    const setB = result.find((a) => a.task === 'Tarea B1');
    assert.ok(setA, 'debe encontrarse Tarea A1');
    assert.ok(setB, 'debe encontrarse Tarea B1');
    assert.strictEqual(setA.set, 'Set A');
    assert.strictEqual(setB.set, 'Set B');
});

await atest('loadCronogramaAssignments: fetch 404 — devuelve []', async () => {
    const result = await loadCronogramaAssignments(
        'Ana López',
        'Mañana',
        { targetDate: LUNES_OCT_12_2026, fetchDependencies: makeNotFoundDeps() }
    );
    assert.deepStrictEqual(result, []);
});

await atest('loadCronogramaAssignments: error de red — capturado, devuelve []', async () => {
    // El error de red es atrapado dentro de fetchCronogramaRowsForDate (retorna null)
    // → loadCronogramaAssignments devuelve []
    const result = await loadCronogramaAssignments(
        'Ana López',
        'Mañana',
        { targetDate: LUNES_OCT_12_2026, fetchDependencies: makeNetworkErrorDeps() }
    );
    assert.deepStrictEqual(result, []);
});

await atest('loadCronogramaAssignments: fetchDependencies null — TypeError capturado, devuelve []', async () => {
    // A diferencia de preloadCronograma, ésta tiene try/catch que atrapa el TypeError
    const result = await loadCronogramaAssignments(
        'Ana López',
        'Mañana',
        { targetDate: LUNES_OCT_12_2026, fetchDependencies: null }
    );
    assert.deepStrictEqual(result, []);
});

await atest('loadCronogramaAssignments: options null — capturado, devuelve []', async () => {
    const result = await loadCronogramaAssignments('Ana López', 'Mañana', null);
    assert.deepStrictEqual(result, []);
});

// ─────────────────────────────────────────────────────────────────────────────

if (asyncFailed > 0) process.exitCode = 1;

summarize();
