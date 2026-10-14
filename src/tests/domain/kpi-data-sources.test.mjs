/**
 * Pruebas de las fuentes de datos de KPIs: `kpi-operativos-source.js` (JSON operativo, con semilla en el
 * laboratorio local) y `firebase-kpi-repository.js` (lecturas de `users` y `shift_reports`).
 * Diferencial contra `fetchKpiOperativosData()` LITERAL de app.js 5676-5701.
 */
import { createRunner, assert } from '../test-harness.mjs';
import { fetchKpiOperativosData, detectLocalEnvironment, KPI_OPERATIVOS_DATA_FILE, KPI_OPERATIVOS_SEED_FILE } from '../../services/external/kpi-operativos-source.js';
import { readUsers, readShiftReports } from '../../services/firebase/firebase-kpi-repository.js';
import { makeSide } from '../helpers/kpi-harness.mjs';

const { test, testAsync, summarizeAsync } = createRunner('kpi-data-sources (JSON operativo y lecturas de Firebase)');

const NOW = new Date(2026, 9, 6, 15, 0, 0).getTime();
const RAW = { 'Ana Pérez': { '2026-10-05': { Retiros_Aprobados: 3 } } };
const SEED = { 'Semilla Gestor': { '2026-10-05': { Retiros_Aprobados: 9 } } };

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
                    if (url.startsWith('kpi_operativos_seed.json')) {
                        if (opts.seedThrows) throw new Error('seed boom');
                        return { ok: opts.seed !== undefined && opts.seed !== null, json: async () => JSON.parse(JSON.stringify(opts.seed)) };
                    }
                    return { ok: true, json: async () => JSON.parse(JSON.stringify(RAW)) };
                },
                isLocal: detectLocalEnvironment(side.window), now: () => NOW, logger: { log: mk('log'), warn: mk('warn'), error: mk('error') }
            });
        })();
    } catch (e) { error = e.message; }
    return { result, error, fetched: side.fetched, logs: side.logs.map(l => [l[0], String(l[1])]) };
}

const ESCENARIOS = [
    ['producción: usa el archivo estándar y nunca pide la semilla', { hostname: 'riskops.example.com' }],
    ['producción con semilla disponible: la ignora (aislamiento de entornos)', { hostname: 'riskops.example.com', seed: SEED }],
    ['localhost con semilla válida: devuelve la semilla', { hostname: 'localhost', seed: SEED }],
    ['127.0.0.1 con semilla válida', { hostname: '127.0.0.1', seed: SEED }],
    ['localhost con semilla vacía {}: cae al archivo estándar', { hostname: 'localhost', seed: {} }],
    ['localhost sin semilla (404): cae al archivo estándar', { hostname: 'localhost', seed: null }],
    ['localhost con error al leer la semilla: advierte y usa el estándar', { hostname: 'localhost', seedThrows: true }],
    ['archivo estándar con respuesta no OK: lanza "No se pudo cargar kpi_operativos_v2.json"', { hostname: 'riskops.example.com', dataFail: true }],
    ['localhost, semilla vacía y estándar no OK', { hostname: 'localhost', seed: {}, dataFail: true }]
];

for (const [nombre, opts] of ESCENARIOS) {
    testAsync(`diferencial vs app.js 5676-5701: ${nombre}`, async () => {
        const a = await run('legacy', opts);
        const b = await run('new', opts);
        assert.deepEqual(b, a);
    });
}

test('detectLocalEnvironment: localhost, 127.0.0.1 y file:// son locales; el resto no; sin ventana, no', () => {
    assert.equal(detectLocalEnvironment({ location: { hostname: 'localhost', protocol: 'http:' } }), true);
    assert.equal(detectLocalEnvironment({ location: { hostname: '127.0.0.1', protocol: 'http:' } }), true);
    assert.equal(detectLocalEnvironment({ location: { hostname: '', protocol: 'file:' } }), true);
    assert.equal(detectLocalEnvironment({ location: { hostname: 'riskops.example.com', protocol: 'https:' } }), false);
    assert.equal(detectLocalEnvironment(undefined), false);
    assert.equal(detectLocalEnvironment(null), false);
    assert.equal(detectLocalEnvironment({}), false, 'el original lanzaría TypeError sin window.location; aquí devuelve false');
});

testAsync('fetchKpiOperativosData: pide los archivos esperados con el parámetro de caché ?v=<ms>', async () => {
    const urls = [];
    const fetchFn = async (u) => { urls.push(u); return { ok: true, json: async () => ({ x: 1 }) }; };
    await fetchKpiOperativosData({ fetchFn, isLocal: false, now: () => 111 });
    assert.deepEqual(urls, [KPI_OPERATIVOS_DATA_FILE + '?v=111']);
    urls.length = 0;
    const r = await fetchKpiOperativosData({ fetchFn, isLocal: true, now: () => 222, logger: { log() {}, warn() {} } });
    assert.deepEqual(urls, [KPI_OPERATIVOS_SEED_FILE + '?v=222']);
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
