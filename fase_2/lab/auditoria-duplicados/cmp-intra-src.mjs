// Duplicados DENTRO de src/: mismo nombre de función/constante en varios archivos, o mismo cuerpo con distinto nombre.
import fs from 'node:fs'; import path from 'node:path'; import * as acorn from 'acorn'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)); process.chdir(path.resolve(HERE, '../../..'));
const OUT = path.join(HERE, 'salida'); fs.mkdirSync(OUT, { recursive: true });
const files = []; (function w(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'tests') w(p); } else if (p.endsWith('.js') && !/entry/.test(e.name)) files.push(p); } })('src');
const defs = [];
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/\s+/g, '');
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n'); let a; try { a = acorn.parse(s, { ecmaVersion: 'latest', sourceType: 'module', locations: true }); } catch { continue; }
  for (let n of a.body) {
    const exp = n.type === 'ExportNamedDeclaration'; if (exp && n.declaration) n = n.declaration;
    if (n.type === 'FunctionDeclaration') defs.push({ kind: 'función', name: n.id.name, file: f, line: n.loc.start.line, exp, body: strip(s.slice(n.body.start, n.body.end)), params: n.params.length });
    if (n.type === 'VariableDeclaration') for (const d of n.declarations) if (d.id.type === 'Identifier' && d.init) {
      const isFn = /Function/.test(d.init.type);
      defs.push({ kind: isFn ? 'función' : 'constante', name: d.id.name, file: f, line: d.loc.start.line, exp, body: strip(s.slice(d.init.start, d.init.end)), params: isFn ? d.init.params.length : -1 });
    }
  }
}
const byName = {}; for (const d of defs) (byName[d.name] ||= []).push(d);
const rep = { mismoNombre: [], mismoCuerpo: [] };
for (const [n, list] of Object.entries(byName)) {
  const filesSet = new Set(list.map((d) => d.file)); if (filesSet.size < 2) continue;
  const bodies = new Set(list.map((d) => d.body));
  rep.mismoNombre.push({ nombre: n, tipo: list[0].kind, identico: bodies.size === 1, en: list.map((d) => `${d.file}:${d.line}${d.exp ? '' : ' (interna)'}`) });
}
const byBody = {}; for (const d of defs) if (d.body.length > 120) (byBody[d.body] ||= []).push(d);
for (const list of Object.values(byBody)) { const names = new Set(list.map((d) => d.name)); if (names.size > 1) rep.mismoCuerpo.push(list.map((d) => `${d.name} @ ${d.file}:${d.line}`)); }
fs.writeFileSync(path.join(OUT, 'intra-src.json'), JSON.stringify(rep, null, 1));
console.log('Mismo nombre en varios archivos de src/:', rep.mismoNombre.length);
for (const r of rep.mismoNombre) console.log(`  ${r.identico ? 'IDÉNTICO ' : 'DISTINTO '} ${r.tipo.padEnd(9)} ${r.nombre.padEnd(34)} ${r.en.join(' | ')}`);
console.log('Mismo cuerpo con distinto nombre:', rep.mismoCuerpo.length); for (const r of rep.mismoCuerpo) console.log('  ' + r.join(' | '));
