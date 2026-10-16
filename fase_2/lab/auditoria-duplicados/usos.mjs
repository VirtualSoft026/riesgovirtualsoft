import fs from 'node:fs';
import { fileURLToPath as __f2p } from 'node:url';
import __path from 'node:path';
import __fs from 'node:fs';
const __HERE = __path.dirname(__f2p(import.meta.url));
process.chdir(__path.resolve(__HERE, '../../..')); // raíz del repo
const __OUT = __path.join(__HERE, 'salida'); __fs.mkdirSync(__OUT, { recursive: true });

const app = fs.readFileSync('app.js','utf8').replace(/\r\n/g,'\n');
const idx = fs.readFileSync('index.html','utf8');
const tiempos = fs.readFileSync('js/tiempos.js','utf8');
const inv = JSON.parse(fs.readFileSync(__path.join(__OUT,'inventario.json'),'utf8'));
const names = inv.appFns.filter(f => f.srcMatches.length && !f.delegates).map(f => f.name.replace('window.',''))
  .concat(['setIdleDetectorWarning','checkAndStartIdleDetector','requestIdlePermission','startIdleDetectorLogic','persistShiftClosureCore','calculateShiftDelay']);
const rows = [];
for (const n of names) {
  const re = new RegExp('\\b' + n + '\\b', 'g');
  const all = (app.match(re) || []).length;
  const defs = (app.match(new RegExp('function\\s+' + n + '\\b|window\\.' + n + '\\s*=', 'g')) || []).length;
  // usos como dependencia inyectada (p. ej. helpers: { escapeHTML }) o en llamadas
  const lines = app.split('\n').map((l,i)=>[i+1,l]).filter(([i,l]) => re.test(l) && !new RegExp('function\\s+' + n + '\\b').test(l));
  const inject = lines.filter(([i,l]) => new RegExp('[:{,]\\s*' + n + '\\b(?!\\s*\\()|=>\\s*' + n + '\\(|\\b' + n + '\\s*[,}]').test(l)).map(([i])=>i);
  rows.push({ n, usos: all - defs, inyectada: inject.length ? inject.slice(0,6) : [], indexHtml: (idx.match(re)||[]).length, tiemposJs: (tiempos.match(re)||[]).length, windowExpuesta: new RegExp('window\\.' + n + '\\s*=').test(app) });
}
fs.writeFileSync(__path.join(__OUT,'usos.json'), JSON.stringify(rows,null,1));
for (const r of rows) console.log(r.n.padEnd(34), 'usos', String(r.usos).padStart(3), '| inyectada en', JSON.stringify(r.inyectada).padEnd(28), '| index.html', r.indexHtml, '| tiempos.js', r.tiemposJs, r.windowExpuesta ? '| window.*' : '');
