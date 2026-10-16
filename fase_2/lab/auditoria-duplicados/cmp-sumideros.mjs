// Sumideros de texto libre: plantillas o concatenaciones HTML que insertan campos escritos por usuarios
// (nombre, gestor, motivo, título…) SIN escapeHTML. Sirve para el hotfix de XSS por nombres (DE-21) y para W-52.
// Uso: node cmp-sumideros.mjs [archivos…]  (por defecto: app.js, js/tiempos.js y login.js del repo)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn'; import * as walk from 'acorn-walk';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ARGS = process.argv.slice(2).length ? process.argv.slice(2) : ['app.js', 'js/tiempos.js', 'login.js'].map((f) => path.join(ROOT, f));
const FREE = /\b(name|gestor|gestorName|nombre|userName|displayName|motivo|reason|razon|descripcion|description|comentario|comment|observacion|observaciones|justificacion|justification|detalle|details|titulo|title|contenido|content|mensaje|message|tarea|taskName|task|set|incidente|tipo|email|role|rol)\b/i;
for (const f of ARGS) {
  const src = fs.readFileSync(f, 'utf8'); const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script' });
  const hits = [];
  walk.simple(ast, { TemplateLiteral(n) {
    const raw = n.quasis.map(q => q.value.raw).join(''); if (!/<[a-z]/i.test(raw)) return;
    for (const ex of n.expressions) { const t = src.slice(ex.start, ex.end); if (/escapeHTML|escape|encodeInlineHandlerArg|sanitize/.test(t)) continue; if (FREE.test(t)) hits.push(`${src.slice(0, ex.start).split('\n').length}: \${${t.replace(/\s+/g,' ').slice(0, 70)}}`); }
  } });
  console.log(`== ${f}: ${hits.length}`); for (const h of hits) console.log('  ' + h);
}
// concatenaciones y asignaciones directas
for (const f of ARGS) {
  const src = fs.readFileSync(f, 'utf8'); const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script' });
  const hits = [];
  walk.simple(ast, {
    BinaryExpression(n) { if (n.operator !== '+') return; const s = src.slice(n.start, n.end); if (!/['"`][^'"`]*<[a-z\/]/i.test(s)) return;
      for (const side of [n.left, n.right]) { if (side.type === 'Literal' || side.type === 'BinaryExpression' || side.type === 'TemplateLiteral') continue; const t = src.slice(side.start, side.end); if (/escape|sanitize|encode/.test(t)) continue; if (FREE.test(t)) hits.push(`${src.slice(0, side.start).split('\n').length}: + ${t.slice(0, 60)}`); } },
    AssignmentExpression(n) { const l = src.slice(n.left.start, n.left.end); if (!/\.(innerHTML|outerHTML)$/.test(l)) return; if (n.right.type === 'TemplateLiteral' || n.right.type === 'Literal' || n.right.type === 'BinaryExpression') return; const t = src.slice(n.right.start, n.right.end); if (/escape|sanitize/.test(t)) return; hits.push(`${src.slice(0, n.start).split('\n').length}: ${l} = ${t.slice(0, 60)}`); },
    CallExpression(n) { const c = src.slice(n.callee.start, n.callee.end); if (!/insertAdjacentHTML$|\.write$/.test(c)) return; hits.push(`${src.slice(0, n.start).split('\n').length}: ${c}(…)`); }
  });
  console.log(`== (concat/asignación) ${f}: ${hits.length}`); for (const h of hits) console.log('  ' + h);
}
