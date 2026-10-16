import { loadAppFunctions } from './lib-app.mjs';
import * as mv from '../../../src/domain/analytics/monitoring-view.js';
import { createShiftRepository } from '../../../src/services/firebase/firebase-shift-repository.js';
import { fileURLToPath as __f2p } from 'node:url';
import __path from 'node:path';
import __fs from 'node:fs';
const __HERE = __path.dirname(__f2p(import.meta.url));
process.chdir(__path.resolve(__HERE, '../../..')); // raíz del repo
const __OUT = __path.join(__HERE, 'salida'); __fs.mkdirSync(__OUT, { recursive: true });

const ser = (x) => JSON.stringify(x);
// calculateShiftDelay
const A = loadAppFunctions(['calculateShiftDelay']);
const SH = ['8am - 4pm', '3pm - 11pm', '7pm - 2am', '11pm - 7am', '12am - 8am', '12pm - 8pm', '8:30am - 4pm', '08:00 - 16:00', 'Por Asignar', '', null, '6AM-2PM'];
let n = 0, d = 0; const ej = [];
for (const s of SH) for (let h = 0; h < 24; h++) for (const m of [0, 3, 6, 45]) {
  const lt = new Date(2026, 9, 15, h, m).getTime();
  for (const lv of [lt, new Date(lt).toISOString(), null]) { n++; const ss = { loginTime: lv, shift: s };
    let a, b; try { a = A.calculateShiftDelay({ ...ss }); } catch (e) { a = 'THROW ' + e.message; } try { b = mv.buildShiftDelayBadgeHtml({ ...ss }); } catch (e) { b = 'THROW ' + e.message; }
    if (a !== b) { d++; if (ej.length < 3) ej.push({ ss, a, b }); } }
}
console.log('calculateShiftDelay vs buildShiftDelayBadgeHtml casos', n, 'diferencias', d); ej.forEach(e => console.log(ser(e)));
// persistShiftClosureCore
function fakeDb(key = 'k1', fail = false) { const log = []; return { log, ref: (p) => ({ push: () => ({ key }), update: async (u) => { log.push([p || '/', u]); if (fail) throw new Error('denied'); } }) }; }
const cases = [['u1', 'l1', { a: 1 }, 'k1', false], ['', 'l1', {}, 'k1', false], ['u1', '', {}, 'k1', false], ['u1', 'l1', {}, null, false], ['u1', 'l1', { x: 2 }, 'k9', true]];
let pd = 0;
for (const [u, l, o, k, f] of cases) {
  const db1 = fakeDb(k, f), db2 = fakeDb(k, f);
  const P = loadAppFunctions(['persistShiftClosureCore'], { globals: { database: db1, firebase: { database: { ServerValue: { TIMESTAMP: '__TS__' } } } } });
  let a, b; try { a = await P.persistShiftClosureCore(u, l, o); } catch (e) { a = 'THROW ' + e.message; }
  try { b = await createShiftRepository({ database: db2, serverTimestamp: '__TS__' }).persistShiftClosureCore(u, l, o); } catch (e) { b = 'THROW ' + e.message; }
  if (ser([a, db1.log]) !== ser([b, db2.log])) { pd++; console.log('DIF', ser([a, db1.log]), ser([b, db2.log])); }
}
console.log('persistShiftClosureCore casos', cases.length, 'diferencias', pd);
