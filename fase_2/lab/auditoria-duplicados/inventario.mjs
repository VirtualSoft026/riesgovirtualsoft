// Inventario: funciones de nivel superior de app.js y exports de src/, con cruce por nombre.
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { fileURLToPath as __f2p } from 'node:url';
import __path from 'node:path';
import __fs from 'node:fs';
const __HERE = __path.dirname(__f2p(import.meta.url));
process.chdir(__path.resolve(__HERE, '../../..')); // raíz del repo
const __OUT = __path.join(__HERE, 'salida'); __fs.mkdirSync(__OUT, { recursive: true });


const APP = fs.readFileSync('app.js', 'utf8').replace(/\r\n/g, '\n');
const ast = acorn.parse(APP, { ecmaVersion: 'latest', sourceType: 'script', locations: true });

const appFns = [];
for (const node of ast.body) {
    let name = null, fn = null;
    if (node.type === 'FunctionDeclaration') { name = node.id.name; fn = node; }
    if (node.type === 'VariableDeclaration') {
        for (const d of node.declarations) {
            if (d.init && /Function/.test(d.init.type) && d.id.type === 'Identifier') { name = d.id.name; fn = d.init; }
        }
    }
    if (node.type === 'ExpressionStatement' && node.expression.type === 'AssignmentExpression' &&
        node.expression.left.type === 'MemberExpression' && node.expression.left.object.name === 'window' &&
        /Function/.test(node.expression.right.type)) {
        name = 'window.' + (node.expression.left.property.name || node.expression.left.property.value); fn = node.expression.right;
    }
    if (!name) continue;
    const src = APP.slice(fn.start, fn.end);
    const lines = fn.loc.end.line - fn.loc.start.line + 1;
    const riskops = (src.match(/RiskOps\.[A-Za-z]+/g) || []);
    const ctrl = (src.match(/__[A-Za-z]+(Controller|Ctl)?\(\)/g) || []);
    // "delegada": el cuerpo es corto y llama a RiskOps o a un controlador __xxx()
    const bodyStmts = fn.body && fn.body.type === 'BlockStatement' ? fn.body.body.length : 1;
    const delegates = (riskops.length > 0 || ctrl.length > 0);
    appFns.push({ name, line: fn.loc.start.line, lines, bodyStmts, delegates, riskops: [...new Set(riskops)], ctrl: [...new Set(ctrl)] });
}

// exports de src
const srcFns = [];
function walkDir(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'tests') walkDir(p); } else if (p.endsWith('.js') && !/entry/.test(e.name)) scan(p); } }
function scan(p) {
    const s = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
    let a; try { a = acorn.parse(s, { ecmaVersion: 'latest', sourceType: 'module', locations: true }); } catch (e) { console.error('parse', p, e.message); return; }
    for (const n of a.body) {
        if (n.type !== 'ExportNamedDeclaration' || !n.declaration) continue;
        const d = n.declaration;
        if (d.type === 'FunctionDeclaration') srcFns.push({ name: d.id.name, file: path.relative('src', p), line: d.loc.start.line });
        if (d.type === 'VariableDeclaration') for (const v of d.declarations) if (v.init && /Function/.test(v.init.type)) srcFns.push({ name: v.id.name, file: path.relative('src', p), line: v.loc.start.line });
    }
}
walkDir('src');

const byName = new Map();
for (const f of srcFns) { if (!byName.has(f.name)) byName.set(f.name, []); byName.get(f.name).push(f); }

const out = appFns.map((f) => ({ ...f, srcMatches: byName.get(f.name.replace(/^window\./, '')) || [] }));
fs.writeFileSync(__path.join(__OUT,'inventario.json'), JSON.stringify({ appFns: out, srcFns }, null, 1));
const dupOwn = out.filter((f) => f.srcMatches.length && !f.delegates);
const dupDeleg = out.filter((f) => f.srcMatches.length && f.delegates);
console.log('app.js funciones nivel superior:', out.length, '| delegan:', out.filter((f) => f.delegates).length);
console.log('src exports:', srcFns.length);
console.log('mismo nombre, app.js con lógica propia:', dupOwn.length);
for (const f of dupOwn) console.log(`  ${f.name} (l.${f.line}, ${f.lines} líneas) -> ${f.srcMatches.map((m) => m.file + ':' + m.line).join(', ')}`);
console.log('mismo nombre, app.js ya delega:', dupDeleg.length);
for (const f of dupDeleg) console.log(`  ${f.name} (l.${f.line}, ${f.lines} l.) -> ${f.srcMatches.map((m) => m.file).join(', ')} | ${f.riskops.concat(f.ctrl).join(' ')}`);
