/**
 * Auditoría de manejadores en línea (paso 3.4, W-54 b y DE-5 = a):
 *  - ningún atributo `on*="…"` en index.html, login.html, los scripts clásicos de la raíz ni en src/ (sin pruebas);
 *  - todo `data-action` literal de esos archivos está en ACTION_TABLE o es una delegación con su propio enlace por
 *    nombre (`approve-user`, `toggle-tree` en utils/action-delegation.js y tree-toggle.js; `switch-panel` en login);
 *  - el patrón de la auditoría sí detecta un atributo real (prueba de sensibilidad) y no confunde asignaciones
 *    de propiedad DOM (`el.onclick = …`), que son listeners de JavaScript y no atributos.
 *
 * Se ejecuta con: node src/tests/ui/inline-handlers-audit.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRunner, assert } from '../test-harness.mjs';
import { ACTION_TABLE } from '../../ui/actions/action-registry.js';

const { test, summarize } = createRunner('auditoría de manejadores en línea (paso 3.4)');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const SRC = path.join(REPO, 'src');

/** Atributo de manejador en línea: `on<evento>=` precedido de espacio, comilla o `<`, y seguido de comilla. */
const INLINE_ATTR = /(^|[\s<"'`])on[a-z]+\s*=\s*\\?["']/i;
/** Acción declarada en el marcado. */
const ACTION_ATTR = /data-action=\\?"([a-z0-9-]+)"/g;
/** Acciones con enlace propio por nombre (no pasan por el registro). */
const OWN_BINDINGS = new Set(['approve-user', 'toggle-tree', 'switch-panel']);

/** Archivos de la interfaz que se auditan: marcado, scripts clásicos de la raíz y el código de src/ sin pruebas. */
function auditedFiles() {
    const rootFiles = fs.readdirSync(REPO)
        .filter((f) => /\.(html|js)$/.test(f))
        .map((f) => path.join(REPO, f))
        .filter((f) => fs.statSync(f).isFile());
    const srcFiles = [];
    (function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'tests' || entry.name === 'node_modules') continue;
                walk(full);
            } else if (/\.(js|mjs|html)$/.test(entry.name)) {
                srcFiles.push(full);
            }
        }
    })(SRC);
    return [...rootFiles, ...srcFiles].filter((f) => !f.includes(`${path.sep}build${path.sep}`));
}

const rel = (file) => path.relative(REPO, file).split(path.sep).join('/');

test('sensibilidad: el patrón detecta un atributo real y no confunde una asignación de propiedad', () => {
    assert.ok(INLINE_ATTR.test('<button class="x" onclick="f()">'));
    assert.ok(INLINE_ATTR.test(`<td onchange='g(this.checked)'>`));
    assert.ok(INLINE_ATTR.test('<img src=x onerror="h()">'));
    assert.ok(INLINE_ATTR.test('<div onclick=\\"f()\\">'), 'también dentro de una cadena de plantilla escapada');
    assert.ok(!INLINE_ATTR.test('tr.onclick = function () { f(); };'), 'asignación de propiedad: no es atributo');
    assert.ok(!INLINE_ATTR.test('el.onmouseover = null;'));
    assert.ok(!INLINE_ATTR.test('const donde = "monitoreo";'), 'no confunde palabras que empiezan por "on"');
});

test('ningún atributo on*= en index.html, login.html, scripts clásicos de la raíz ni en src/ (sin pruebas)', () => {
    const offenders = [];
    for (const file of auditedFiles()) {
        const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
        lines.forEach((line, i) => {
            if (INLINE_ATTR.test(line)) offenders.push(`${rel(file)}:${i + 1}: ${line.trim().slice(0, 120)}`);
        });
    }
    assert.deepEqual(offenders, [], 'manejadores en línea que quedan');
});

test('index.html y login.html no tienen scripts en línea (sin src): la detección de navegador va en un archivo', () => {
    for (const name of ['index.html', 'login.html']) {
        const html = fs.readFileSync(path.join(REPO, name), 'utf8');
        const inline = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
            .filter(([, attrs, body]) => !/\bsrc\s*=/.test(attrs) && body.trim() !== '');
        assert.deepEqual(inline.map(([m]) => m.slice(0, 80)), [], `${name} tiene script en línea`);
    }
});

test('cada data-action literal de marcado está en ACTION_TABLE o tiene su propio enlace por nombre', () => {
    const unknown = new Map();
    for (const file of auditedFiles()) {
        const text = fs.readFileSync(file, 'utf8');
        for (const [, name] of text.matchAll(ACTION_ATTR)) {
            if (Object.prototype.hasOwnProperty.call(ACTION_TABLE, name) || OWN_BINDINGS.has(name)) continue;
            if (!unknown.has(name)) unknown.set(name, []);
            unknown.get(name).push(rel(file));
        }
    }
    assert.deepEqual([...unknown.keys()], [], 'acciones sin enlace: ' + JSON.stringify(Object.fromEntries(unknown)));
});

test('las acciones de ACTION_TABLE se usan en algún marcado (no quedan entradas muertas)', () => {
    const used = new Set();
    for (const file of auditedFiles()) {
        const text = fs.readFileSync(file, 'utf8');
        for (const [, name] of text.matchAll(ACTION_ATTR)) used.add(name);
    }
    const dead = Object.keys(ACTION_TABLE).filter((name) => !used.has(name));
    assert.deepEqual(dead, [], 'entradas de la tabla que ningún marcado usa');
});

test('Finalizar Turno -> Cerrar Sesión (Admin/Supervisor): app.js quita data-action para no ejecutar handleEndShift', () => {
    // El original sustituía el onclick en línea del botón por "cerrar sesión" (app.js, bloque de roles). Con la
    // delegación, el botón sigue llevando data-action="end-shift" y el registro lo atendería al subir al documento:
    // la sustitución debe quitar ese atributo, si no Admin y Supervisor ejecutarían también el cierre de turno.
    const app = fs.readFileSync(path.join(REPO, 'app.js'), 'utf8').replace(/\r\n/g, '\n');
    const block = /endShiftBtn\.innerHTML = "<i class='bx bx-log-out'><\/i> Cerrar Sesi[^"]*";\n([\s\S]*?)endShiftBtn\.onclick = function/.exec(app);
    assert.ok(block, 'bloque de sustitución de Finalizar Turno');
    assert.ok(/endShiftBtn\.removeAttribute\('data-action'\);/.test(block[1]), 'quita data-action antes de sustituir el manejador');
});

summarize();
