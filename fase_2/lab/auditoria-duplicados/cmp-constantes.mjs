// Constantes/datos de nivel superior de app.js con equivalente en src/ (por nombre o por valor).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import * as acorn from 'acorn';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.resolve(HERE, '../../..'));
const OUT = path.join(HERE, 'salida'); fs.mkdirSync(OUT, { recursive: true });

const isDataInit = (n) => n && (['Literal', 'ArrayExpression', 'ObjectExpression', 'TemplateLiteral'].includes(n.type) ||
  (n.type === 'NewExpression' && ['Set', 'Map'].includes(n.callee.name)) ||
  (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.object.name === 'Object' && n.callee.property.name === 'freeze') ||
  (n.type === 'BinaryExpression'));
const evalNode = (src) => { try { return vm.runInNewContext('(' + src + ')', {}); } catch (e) { return undefined; } };
const tag = (v) => Object.prototype.toString.call(v);
const norm = (v) => { const t = tag(v);
  if (t === '[object Set]') return { __set: [...v].map(norm).sort() };
  if (t === '[object Map]') return { __map: [...v.entries()].map(norm) };
  if (t === '[object RegExp]') return { __re: String(v) };
  if (Array.isArray(v)) return v.map(norm); if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, norm(v[k])])); return v; };
const isEmpty = (v) => { const t = tag(v); if (t === '[object Set]' || t === '[object Map]') return v.size === 0; if (Array.isArray(v)) return v.length === 0; if (t === '[object Object]') return Object.keys(v).length === 0; return false; };
const key = (v) => JSON.stringify(norm(v));

function collect(file, sourceType) {
  const s = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  let a; try { a = acorn.parse(s, { ecmaVersion: 'latest', sourceType, locations: true }); } catch (e) { return []; }
  const out = [];
  for (let n of a.body) {
    if (n.type === 'ExportNamedDeclaration' && n.declaration) n = n.declaration;
    if (n.type !== 'VariableDeclaration') continue;
    for (const d of n.declarations) {
      if (d.id.type !== 'Identifier' || !isDataInit(d.init)) continue;
      const src = s.slice(d.init.start, d.init.end); const v = evalNode(src);
      if (v === undefined || v === null || isEmpty(v) || (typeof v !== 'object' && String(v).length < 4 && typeof v !== 'number')) continue;
      out.push({ name: d.id.name, file, line: d.loc.start.line, value: v, k: key(v), size: typeof v === 'object' ? JSON.stringify(norm(v)).length : String(v).length });
    }
  }
  return out;
}
const app = collect('app.js', 'script');
const srcFiles = []; (function w(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'tests') w(p); } else if (p.endsWith('.js')) srcFiles.push(p); } })('src');
const src = srcFiles.flatMap((f) => collect(f, 'module'));
const rows = [];
for (const c of app) {
  const byName = src.filter((x) => x.name === c.name);
  const byValue = src.filter((x) => x.k === c.k && x.name !== c.name && (typeof c.value === 'object' || String(c.value).length >= 8));
  if (!byName.length && !byValue.length) continue;
  const sameName = byName.map((x) => ({ en: x.file + ':' + x.line, igual: x.k === c.k }));
  rows.push({ constante: c.name, linea: c.line, mismoNombre: sameName, mismoValorOtroNombre: byValue.map((x) => x.name + ' @ ' + x.file + ':' + x.line) });
}
fs.writeFileSync(path.join(OUT, 'constantes.json'), JSON.stringify(rows, null, 1));
console.log('constantes de datos en app.js:', app.length, '| con equivalente en src:', rows.length);
for (const r of rows) {
  const nm = r.mismoNombre.map((x) => `${x.en} ${x.igual ? 'IGUAL' : 'DIFIERE'}`).join('; ');
  console.log(`${r.constante.padEnd(34)} app.js:${String(r.linea).padEnd(5)} ${nm}${r.mismoValorOtroNombre.length ? ' | mismo valor: ' + r.mismoValorOtroNombre.join('; ') : ''}`);
}
