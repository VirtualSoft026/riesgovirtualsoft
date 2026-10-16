// Heurística de superficie XSS: interpolaciones ${…} dentro de plantillas HTML que NO pasan por una función de escape.
// No prueba explotabilidad: marca dónde mirar. Excluye expresiones claramente numéricas o de escape.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
const HERE = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.resolve(HERE, '../../..'));
const files = ['app.js', 'login.js', 'js/tiempos.js'];
(function w(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'tests') w(p); } else if (p.endsWith('.js')) files.push(p.replace(/\\/g, '/')); } })('src');
const SAFE = /^(escapeHTML|escapeHtml|esc|escape\w*|encodeInlineHandlerArg|sanitize\w*|Number|Math\.|parseInt|parseFloat|String\(\s*Number|formatMinutes|format\w*Minutes|\w*\.toFixed|\w*\.length$|\d)/;
// Revisión manual: cada expresión que se ha verificado como segura (numérica, fecha, constante o ya escapada en su origen)
// figura en interpolaciones-revisadas.json con su motivo. Lo que no esté ahí cuenta como "sin revisar".
const REVISION_PATH = path.join(HERE, 'interpolaciones-revisadas.json');
const REVISADAS = new Set(fs.existsSync(REVISION_PATH) ? JSON.parse(fs.readFileSync(REVISION_PATH, 'utf8')).map((e) => `${e.archivo}|${e.expresion}`) : []);
const usadas = new Set(); const pendientes = new Set(); let revisadas = 0;
const out = {}; const samples = {};
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let ast; try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: f.startsWith('src/') ? 'module' : 'script', allowHashBang: true }); } catch { continue; }
  walk.simple(ast, { TemplateLiteral(n) {
    const raw = n.quasis.map((q) => q.value.raw).join('');
    if (!/<[a-z][^>]*>|<\/[a-z]/i.test(raw)) return;
    for (const ex of n.expressions) {
      const t = src.slice(ex.start, ex.end).trim();
      if (SAFE.test(t) || ex.type === 'Literal' || ex.type === 'TemplateLiteral' || (ex.type === 'ConditionalExpression' && ex.consequent.type !== 'Identifier' && ex.consequent.type !== 'MemberExpression')) continue;
      if (/Html$|HTML$|html$|Icon|icon|Badge|badge|Class|class|Color|color|Style|style|Rows|rows|Options|options|Items|items/.test(t)) continue; // fragmentos ya construidos o tokens de presentación
      const clave = `${f}|${t}`;
      if (REVISADAS.has(clave)) { revisadas += 1; usadas.add(clave); continue; }
      pendientes.add(clave);
      const g = f.startsWith('src/') ? f.split('/').slice(0, 2).join('/') : f;
      out[g] = (out[g] || 0) + 1;
      (samples[f] ||= []).push(`${src.slice(0, ex.start).split('\n').length}: \${${t.slice(0, 50)}}`);
    }
  } });
}
const sinRevisar = Object.values(out).reduce((a, b) => a + b, 0);
const obsoletas = [...REVISADAS].filter((c) => !usadas.has(c));
console.log('Interpolaciones sin escape en plantillas HTML (heurística):', JSON.stringify(out));
console.log(`Resumen: sin revisar=${sinRevisar} · revisadas=${revisadas} · entradas de revisión no encontradas en el código=${obsoletas.length}`);
for (const c of obsoletas) console.log('  obsoleta:', c);
fs.mkdirSync(path.join(HERE, 'salida'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'salida', 'sin-revisar.txt'), [...pendientes].sort().join('\n') + '\n');
for (const [f, l] of Object.entries(samples).sort((a, b) => b[1].length - a[1].length).slice(0, 12)) console.log(`  ${f} (${l.length}): ${l.slice(0, 4).join(' · ')}`);
fs.mkdirSync(path.join(HERE, 'salida'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'salida', 'interpolaciones.json'), JSON.stringify(samples, null, 1));
