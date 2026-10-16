/**
 * Prueba de extremo a extremo (con DOM simulado) del pintado de Monitoreo a través de app.js.
 * El cuerpo legacy de renderActiveSessionsDashboard() ya no existe en app.js (W-18): app.js es un envoltorio
 * que delega en RiskOps.monitoringController. Esta prueba extrae el envoltorio REAL de app.js, lo ejecuta en un
 * contexto vm con el bundle compilado, y verifica las etiquetas de estado de la tarjeta.
 * Uso:
 *   node src/tests/e2e/monitoreo-render.e2e.cjs app.js --riskops riskops.bundle.js
 * No modifica ningún archivo.
 */
const fs = require('fs'); const vm = require('vm');
const RI = process.argv.indexOf('--riskops');
if (RI < 0) { console.error('Falta --riskops <bundle>'); process.exit(2); }
const BUNDLE = fs.readFileSync(process.argv[RI + 1], 'utf8');
const APP = process.argv[2];
if (!APP) { console.error('Falta la ruta de app.js'); process.exit(2); }

function build(session) {
    const src = fs.readFileSync(APP, 'utf8').replace(/\r\n/g, '\n');
    const start = src.indexOf('function renderActiveSessionsDashboard() {');
    if (start < 0) throw new Error('app.js no tiene renderActiveSessionsDashboard()');
    const fnSrc = src.slice(start, src.indexOf('\n}\n', start) + 3);
    if (/\bgrid\.innerHTML|function\s+\w+\s*\(/.test(fnSrc.slice(fnSrc.indexOf('{') + 1, -2))) {
        throw new Error('renderActiveSessionsDashboard en app.js debe ser solo un envoltorio (sin cuerpo legacy)');
    }
    const cards = [];
    const grid = { innerHTML: '', appendChild(c) { cards.push(c); } };
    const ctx = {
        document: {
            getElementById: (id) => (id === 'monitoreoGrid' ? grid : null),
            createElement: () => ({ className: '', innerHTML: '', querySelector: () => null })
        },
        allActiveSessions: { u1: session }, Date, encodeURIComponent
    };
    vm.createContext(ctx);
    vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);
    ctx.__histNav = () => ({
        monitoring: ctx.RiskOps.monitoringController.createMonitoringController({
            document: ctx.document,
            repository: { listenActiveSessions: () => () => {}, fetchApprovedGestorNames: async () => [] },
            getSessions: () => ctx.allActiveSessions,
            setSessions: (s) => { ctx.allActiveSessions = s; },
            hasCronograma: () => false,
            getAssignedTasksForGestor: () => [],
            reconcileTask: () => ({ status: 'Pendiente', observation: '' }),
            resolveTaskName: (k) => k,
            getShiftCategory: () => 'Mañana',
            supervisorDirectory: null,
            avatars: [],
            now: () => Date.now(),
            logger: console
        })
    });
    vm.runInContext(fnSrc + '\nthis.fn = renderActiveSessionsDashboard;', ctx);
    return { ctx, cards, grid };
}

function run(session) {
    const { ctx, cards, grid } = build(session);
    ctx.fn();
    const html = cards.length ? cards[0].innerHTML : grid.innerHTML;
    const m = html.match(/status-indicator-badge[^>]*>\s*<div[^>]*><\/div>\s*([^\n<]+)/);
    return { rendered: cards.length > 0, label: m ? m[1].trim() : '(sin tarjeta)' };
}

const NOW = Date.now();
const cases = [
    ['En Pausa de Turno, latido reciente', { name: 'Ana', shift: '8am - 4pm', status: 'En Pausa de Turno', lastActive: NOW - 5000 }],
    ['En Pausa de Turno, sin latido 5 min', { name: 'Ana', shift: '8am - 4pm', status: 'En Pausa de Turno', lastActive: NOW - 300000 }],
    ['En Almuerzo, latido reciente', { name: 'Ana', shift: '8am - 4pm', status: 'En Almuerzo', lastActive: NOW - 5000 }],
    ['En Desayuno, latido reciente', { name: 'Ana', shift: '8am - 4pm', status: 'En Desayuno', lastActive: NOW - 5000 }],
    ['Inactivo, latido reciente', { name: 'Ana', shift: '8am - 4pm', status: 'Inactivo', lastActive: NOW - 5000 }],
    ['En Línea, latido reciente', { name: 'Ana', shift: '8am - 4pm', status: 'En Línea', lastActive: NOW - 5000 }],
    ['En Línea, sin latido 5 min', { name: 'Ana', shift: '8am - 4pm', status: 'En Línea', lastActive: NOW - 300000 }]
];
const EXPECTED = {
    'En Pausa de Turno, latido reciente': 'En Pausa de Turno ⏸️',
    'En Pausa de Turno, sin latido 5 min': 'En Pausa de Turno ⏸️',
    'En Almuerzo, latido reciente': 'En Almuerzo/Cena 🍽️',
    'En Desayuno, latido reciente': 'En Desayuno ☕',
    'Inactivo, latido reciente': 'Inactivo 💤',
    'En Línea, latido reciente': 'En Línea',
    'En Línea, sin latido 5 min': 'Inactivo 💤'
};
let failed = 0;
for (const [name, s] of cases) {
    const r = run(JSON.parse(JSON.stringify(s)));
    const ok = r.label === EXPECTED[name];
    if (!ok) failed += 1;
    console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}: ${r.label}`);
}
console.log(`monitoreo-render: ${cases.length - failed} passed, ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
