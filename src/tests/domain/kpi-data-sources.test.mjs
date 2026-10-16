/**
 * Pruebas de las fuentes de datos de KPIs: `kpi-operativos-source.js` (JSON operativo; sin rama de semilla
 * desde W-49 b) y `firebase-kpi-repository.js` (lecturas de `users` y `shift_reports`).
 * Diferencial contra `fetchKpiOperativosData()` LITERAL de app.js 5676-5701.
 */
import { createRunner, assert } from '../test-harness.mjs';
import { fetchKpiOperativosData, KPI_OPERATIVOS_DATA_FILE } from '../../services/external/kpi-operativos-source.js';
import { readUsers, readShiftReports } from '../../services/firebase/firebase-kpi-repository.js';
import { makeSide } from '../helpers/kpi-harness.mjs';

const { test, testAsync, summarizeAsync } = createRunner('kpi-data-sources (JSON operativo y lecturas de Firebase)');

const NOW = new Date(2026, 9, 6, 15, 0, 0).getTime();
const RAW = { 'Ana Pérez': { '2026-10-05': { Retiros_Aprobados: 3 } } };

async function run(kind, opts) {
    const side = makeSide(kind, { nowMs: NOW, raw: RAW, ...opts });
    let result, error;
    try {
        result = kind === 'legacy' ? await side.api.fetchKpiOperativosData() : await (async () => {
            // el lado "nuevo" usa el mismo servicio que usa el controlador
            const { fetchKpiOperativosData: f } = await import('../../services/external/kpi-operativos-source.js');
            const fetched = side.fetched;
            const mk = (level) => (...args) => side.logs.push([level, ...args.map(a => (a instanceof Error ? 'Error:' + a.message : a))]);
            return f({
                fetchFn: async (url) => {
                    fetched.push(url.replace(/\?v=\d+$/, '?v=T'));
                    if (opts.dataFail) return { ok: false, json: async () => ({}) };
                    return { ok: true, json: async () => JSON.parse(JSON.stringify(opts.raw !== undefined ? opts.raw : RAW)) };
                },
                now: () => NOW, logger: { log: mk('log'), warn: mk('warn'), error: mk('error') }
            });
        })();
    } catch (e) { error = e.message; }
    return { result, error, fetched: side.fetched, logs: side.logs.map(l => [l[0], String(l[1])]) };
}

// Escenarios de producción: la única fuente es kpi_operativos_v2.json, así que el original y el nuevo coinciden.
// Escenarios de laboratorio (localhost con semilla): DIFERENCIA INTENCIONAL (W-49 b). El original pedía
// kpi_operativos_seed.json en localhost; el nuevo nunca lo pide. Se prueba por separado, sin diferencial.
const ESCENARIOS = [
    ['producción: usa el archivo estándar', { hostname: 'riskops.example.com' }],
    ['producción con archivo estándar vacío {}: lo devuelve tal cual', { hostname: 'riskops.example.com', raw: {} }],
    ['producción con respuesta no OK: lanza "No se pudo cargar kpi_operativos_v2.json"', { hostname: 'riskops.example.com', dataFail: true }]
];

for (const [nombre, opts] of ESCENARIOS) {
    testAsync(`diferencial vs app.js 5676-5701: ${nombre}`, async () => {
        const a = await run('legacy', opts);
        const b = await run('new', opts);
        assert.deepEqual(b, a);
    });
}

testAsync('W-49 b (intencional): en localhost el nuevo nunca pide la semilla y usa el archivo estándar', async () => {
    const opts = { hostname: 'localhost', seed: { 'Semilla Gestor': { '2026-10-05': { Retiros_Aprobados: 9 } } } };
    const nuevo = await run('new', opts);
    assert.deepEqual(nuevo.fetched, [KPI_OPERATIVOS_DATA_FILE + '?v=T']);
    assert.deepEqual(nuevo.result, RAW);
    const legacy = await run('legacy', opts);
    assert.ok(legacy.fetched.some((u) => u.startsWith('kpi_operativos_seed.json')), 'el original sí pedía la semilla (esta diferencia se declara, no se oculta)');
});

testAsync('fetchKpiOperativosData: pide solo el archivo estándar con el parámetro de caché ?v=<ms>', async () => {
    const urls = [];
    const fetchFn = async (u) => { urls.push(u); return { ok: true, json: async () => ({ x: 1 }) }; };
    const r = await fetchKpiOperativosData({ fetchFn, now: () => 111 });
    assert.deepEqual(urls, [KPI_OPERATIVOS_DATA_FILE + '?v=111']);
    assert.deepEqual(r, { x: 1 });
});

testAsync('firebase-kpi-repository: lee users y shift_reports; null si el nodo no existe', async () => {
    const paths = [];
    const db = (data) => ({ ref: (p) => ({ once: async (ev) => { paths.push([p, ev]); return { exists: () => data[p] !== undefined, val: () => data[p] }; } }) });
    assert.deepEqual(await readUsers(db({ users: { a: 1 } })), { a: 1 });
    assert.deepEqual(await readShiftReports(db({ shift_reports: { r1: {} } })), { r1: {} });
    assert.equal(await readUsers(db({})), null);
    assert.equal(await readShiftReports(db({})), null);
    assert.deepEqual(paths, [['users', 'value'], ['shift_reports', 'value'], ['users', 'value'], ['shift_reports', 'value']]);
});

const r = await summarizeAsync();
if (r.failed > 0) process.exitCode = 1;
