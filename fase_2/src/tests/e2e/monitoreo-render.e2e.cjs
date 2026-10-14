/**
 * Prueba de extremo a extremo (con DOM simulado) de renderActiveSessionsDashboard() REAL, extraída de app.js.
 * Uso:
 *   node fase_2/src/tests/e2e/monitoreo-render.e2e.cjs app.js                 -> verifica el comportamiento esperado (sale con 1 si falla)
 *   node fase_2/src/tests/e2e/monitoreo-render.e2e.cjs app.viejo.js app.js    -> compara dos versiones
 * No modifica ningún archivo.
 */
const fs = require('fs'); const vm = require('vm');
function run(appPath, session) {
    const src = fs.readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n');
    const start = src.indexOf('function renderActiveSessionsDashboard()');
    const end = src.indexOf('\n}\n', start) + 3;
    const fnSrc = src.slice(start, end);
    const cards = [];
    const grid = { innerHTML: '', appendChild(c) { cards.push(c); } };
    const ctx = {
        document: {
            getElementById: (id) => (id === 'monitoreoGrid' ? grid : null),
            createElement: () => ({ className: '', innerHTML: '', querySelector: () => null })
        },
        allActiveSessions: { u1: session }, SUPERVISORES_NOMBRES: [], availableAvatars: [],
        globalCronogramaData: null, Date,
        normalizeName: (s) => String(s || '').toLowerCase(), namesMatch: () => false,
        getShiftCategory: () => 'Mañana', calculateShiftDelay: () => '', escapeHTML: (s) => String(s),
        encodeInlineHandlerArg: (s) => String(s), reconcileScheduledTaskWithSession: () => ({ status: 'Pendiente' }),
        getAssignedTasksForGestor: () => [], encodeURIComponent
    };
    vm.createContext(ctx); vm.runInContext(fnSrc + '\nthis.fn = renderActiveSessionsDashboard;', ctx); ctx.fn();
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
    const copy = () => JSON.parse(JSON.stringify(s));
    if (process.argv[3]) {
        const a = run(process.argv[2], copy());
        const b = run(process.argv[3], copy());
        console.log(`${name.padEnd(38)} | A: ${a.label.padEnd(24)} | B: ${b.label}`);
    } else {
        const r = run(process.argv[2], copy());
        const ok = r.label === EXPECTED[name];
        if (!ok) failed += 1;
        console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}: ${r.label}`);
    }
}
if (!process.argv[3]) { console.log(`monitoreo-render: ${cases.length - failed} passed, ${failed} failed.`); process.exitCode = failed ? 1 : 0; }
