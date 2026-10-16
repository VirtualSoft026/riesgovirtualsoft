import { loadAppFunctions } from './lib-app.mjs';
import * as cron from '../../../src/domain/schedules/cronogram-parser.js';
import { fileURLToPath as __f2p } from 'node:url';
import __path from 'node:path';
import __fs from 'node:fs';
const __HERE = __path.dirname(__f2p(import.meta.url));
process.chdir(__path.resolve(__HERE, '../../..')); // raíz del repo
const __OUT = __path.join(__HERE, 'salida'); __fs.mkdirSync(__OUT, { recursive: true });

const ROWS = [['Cronograma'], ['', 'Mañana', '', '', 'Tarde', ''], ['', 'Set 1', '', '', 'Set 2', ''], ['', 'Revisión de retiros', 'Luis Fuentes', '', 'Monitoreo', 'Luis Fuentes'], ['', 'KYC', 'Sara', '', 'Bonos', 'Luis'], ['', 'x', 'Gestor', '', 'Cronograma y', 'Luis Fuentes']];
const WB = { Octubre: ['Semana 2 - 6 al 12 de Octubre', 'Semana 3 - 13 al 19 de Octubre'], Septiembre: ['Semana 5 - 29 de Septiembre al 5 de Octubre'] };
function env(okMonths) { const calls = []; const fetchImpl = async (url) => { calls.push(decodeURI(url.split('?')[0])); const m = Object.keys(WB).find(k => url.includes(encodeURI(k))); const ok = m && okMonths.includes(m);
  return { ok, status: ok ? 200 : 404, arrayBuffer: async () => m }; };
  const xlsx = { read: (m) => ({ SheetNames: WB[m] || [], Sheets: Object.fromEntries((WB[m] || []).map(n => [n, n])) }), utils: { sheet_to_json: (sheet) => ROWS.map(r => r.concat([sheet])) } }; return { calls, fetchImpl, xlsx }; }
const DATES = [new Date(2026, 9, 15), new Date(2026, 9, 6), new Date(2026, 9, 2), new Date(2026, 9, 25), new Date(2026, 9, 18)];
let n = 0, d = 0;
for (const dt of DATES) for (const ok of [['Octubre', 'Septiembre'], ['Septiembre'], []]) {
  const e1 = env(ok), e2 = env(ok);
  const A = loadAppFunctions(['fetchCronogramaRowsForDate', 'loadCronogramaAssignments'], { globals: { fetch: e1.fetchImpl, XLSX: e1.xlsx } });
  const a = await A.fetchCronogramaRowsForDate(dt); const b = await cron.fetchCronogramaRowsForDate(dt, { baseUrl: 'Cronograma de Tareas/', fetchImpl: e2.fetchImpl, xlsx: e2.xlsx });
  n++; const sa = JSON.stringify([a, e1.calls]), sb = JSON.stringify([b, e2.calls]); if (sa !== sb) { d++; if (d < 4) console.log('DIF fetch', dt.toDateString(), ok, '\n app', sa.slice(0, 300), '\n mod', sb.slice(0, 300)); }
}
console.log('fetchCronogramaRowsForDate casos', n, 'diferencias', d);
// loadCronogramaAssignments: app usa la fecha de HOY; se compara con targetDate = hoy.
let n2 = 0, d2 = 0;
for (const g of ['Luis Fuentes', 'Sara', 'Nadie']) for (const sh of ['8am - 4pm', '3pm - 11pm']) {
  const e1 = env(['Octubre', 'Septiembre']), e2 = env(['Octubre', 'Septiembre']);
  const A = loadAppFunctions(['loadCronogramaAssignments'], { globals: { fetch: e1.fetchImpl, XLSX: e1.xlsx } });
  await A.loadCronogramaAssignments(g, sh); const a = A.__ctx.__get('gestorCronogramaAssignments');
  const b = await cron.loadCronogramaAssignments(g, sh, { targetDate: new Date(), fetchDependencies: { baseUrl: 'Cronograma de Tareas/', fetchImpl: e2.fetchImpl, xlsx: e2.xlsx } });
  n2++; if (JSON.stringify(a) !== JSON.stringify(b)) { d2++; console.log('DIF load', g, sh, JSON.stringify(a), JSON.stringify(b)); }
}
console.log('loadCronogramaAssignments casos', n2, 'diferencias', d2);
