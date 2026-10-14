/**
 * Suite de pruebas del laboratorio Fase 2 (la arranca fase_2/lab/suite_pruebas.bat).
 *
 * Responde "¿qué tan lejos estoy del cierre del refactor?" corriendo, sobre el código ACTUAL de la rama:
 *   1. Bundle: verificación de window.RiskOps (build/verify-bundle.mjs).
 *   2. Suites unitarias: todos los *.test.mjs de fase_2/src/tests (sin e2e ni helpers).
 *   3. Integración: genera el app.js integrado del laboratorio (mismos pasos que stage.mjs) FUERA del repo.
 *   4. E2E: las 9 pruebas que ejecutan el app.js real (original e integrado) con el bundle real.
 *   5. Motor operativo: test_motor_operativo.py en entorno hermético (sin red, sin credenciales reales).
 *
 * Seguridad:
 *   - No escribe nada dentro del repositorio: resultados y app.js integrado van a %RISKOPS_LAB_ROOT%\pruebas.
 *   - Cada proceso de prueba se lanza con la red bloqueada (bloqueo-red.cjs) y sin variables sensibles
 *     (contraseñas, tokens, MSTR_*, claves) en su entorno.
 *   - Cada proceso tiene tiempo límite; ninguno usa shell (sin inyección por rutas con espacios o &).
 *
 * Uso: node suite-pruebas.mjs [--solo-unitarias] [--sin-motor]
 * Código de salida: 0 = todo en verde; 1 = hay fallas; 2 = la suite no pudo prepararse.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const LAB = path.resolve(here, '..');
const FASE2 = path.resolve(LAB, '..');
const REPO = path.resolve(FASE2, '..');
const SRC = path.join(FASE2, 'src');
const TESTS = path.join(SRC, 'tests');
const BUILD = path.join(FASE2, 'build');
const BUNDLE = path.join(BUILD, 'dist', 'riskops.bundle.js');
const GUARD = path.join(here, 'bloqueo-red.cjs');
const LAB_ROOT = path.resolve(process.env.RISKOPS_LAB_ROOT || 'C:\\riskops-lab-fase2');
const OUT = path.join(LAB_ROOT, 'pruebas');
const ARGS = new Set(process.argv.slice(2));
const TIMEOUT_MS = Number(process.env.RISKOPS_SUITE_TIMEOUT_MS || 180000);

const SENSITIVE = /(PASS(WORD)?|PWD|TOKEN|SECRET|CREDENTIAL|API_?KEY|PRIVATE|^MSTR_|^FIREBASE_|^GH_|^GITHUB_|^NPM_TOKEN|^AWS_|^AZURE_)/i;
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !SENSITIVE.test(key)));

const lines = [];
const log = (text = '') => { console.log(text); lines.push(text); };
const rel = (p) => path.relative(REPO, p).split(path.sep).join('/');

function fail(message) {
    log(`[FALLA] ${message}`);
    process.exit(2);
}

// ---------- Validaciones previas ----------
if (/[&%^!|<>"]/.test(LAB_ROOT)) fail(`La ruta del laboratorio contiene caracteres no permitidos: ${LAB_ROOT}`);
const repoLower = REPO.toLowerCase() + path.sep;
if ((LAB_ROOT.toLowerCase() + path.sep).startsWith(repoLower)) {
    fail(`RISKOPS_LAB_ROOT (${LAB_ROOT}) está dentro del repositorio; los resultados deben quedar fuera para no ensuciar la rama.`);
}
for (const required of [path.join(REPO, 'app.js'), path.join(REPO, 'index.html'), path.join(REPO, 'database.rules.json'), TESTS]) {
    if (!fs.existsSync(required)) fail(`No existe ${required}`);
}
fs.mkdirSync(OUT, { recursive: true });

// ---------- Ejecución y lectura de resultados ----------
function run(command, args, { cwd = SRC, guard = true } = {}) {
    const finalArgs = guard && command === process.execPath ? ['--require', GUARD, ...args] : args;
    const started = Date.now();
    const result = spawnSync(command, finalArgs, {
        cwd,
        env: { ...cleanEnv, PYTHONDONTWRITEBYTECODE: '1', NO_COLOR: '1', FORCE_COLOR: '0' },
        encoding: 'utf8',
        timeout: TIMEOUT_MS,
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true
    });
    const output = `${result.stdout || ''}${result.stderr || ''}`;
    return {
        code: result.error ? (result.error.code === 'ETIMEDOUT' ? 'TIEMPO' : 'ERROR') : result.status,
        error: result.error ? result.error.message : null,
        output,
        ms: Date.now() - started
    };
}

function count(output) {
    let passed = 0;
    let failed = 0;
    for (const m of output.matchAll(/(\d+) passed, (\d+) failed/g)) { passed += Number(m[1]); failed += Number(m[2]); }
    for (const m of output.matchAll(/Pasan: (\d+) \| Fallan: (\d+)/g)) { passed += Number(m[1]); failed += Number(m[2]); }
    for (const m of output.matchAll(/BUNDLE_VERIFY=PASS \((\d+) comprobaciones/g)) passed += Number(m[1]);
    if (/BUNDLE_VERIFY=FAIL/.test(output)) failed += 1;
    const passLines = (output.match(/\[PASS\]/g) || []).length;
    const failLines = (output.match(/\[FAIL\]/g) || []).length;
    const gaps = [...output.matchAll(/Brechas abiertas: (\d+)/g)].reduce((s, m) => s + Number(m[1]), 0);
    const network = (output.match(/\[BLOQUEO-RED\]/g) || []).length;
    return { passed: Math.max(passed, passLines), failed: Math.max(failed, failLines), gaps, network };
}

const rows = [];
function record(group, name, r, extra = {}) {
    const c = count(r.output);
    const ok = r.code === 0 && c.failed === 0 && !extra.forceFail;
    const status = extra.status || (ok ? 'OK' : (r.code === 'TIEMPO' ? 'TIEMPO' : 'FALLA'));
    rows.push({ group, name, status, ...c, ms: r.ms, ...extra.counts });
    log(`  [${status.padEnd(7)}] ${name}  (${(extra.counts?.passed ?? c.passed)} pasan, ${(extra.counts?.failed ?? c.failed)} fallan${c.gaps ? `, ${c.gaps} brechas` : ''}${c.network ? `, ${c.network} intentos de red BLOQUEADOS` : ''}) ${(r.ms / 1000).toFixed(1)} s`);
    if (status !== 'OK' && status !== 'OMITIDA') {
        const tail = r.output.split(/\r?\n/).filter((l) => /\[FAIL\]|\[BRECHA\]|Error|error|BLOQUEO-RED|FALLA|RESULTADO/.test(l)).slice(0, 15);
        for (const line of tail) log(`             ${line.trim().slice(0, 220)}`);
        if (r.error) log(`             ${r.error}`);
    }
}

function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return ['e2e', 'helpers', 'node_modules'].includes(entry.name) ? [] : walk(full);
        return entry.name.endsWith('.test.mjs') ? [full] : [];
    }).sort();
}

const startedAt = new Date();
const stamp = startedAt.toISOString().replace(/[:T]/g, '-').slice(0, 19);
log('=====================================================================');
log(' SUITE DE PRUEBAS — LABORATORIO RISKOPS FASE 2');
log('=====================================================================');
log(`Fecha:        ${startedAt.toLocaleString('es-CO')}`);
log(`Repositorio:  ${REPO}`);
log(`Resultados:   ${OUT}`);
log(`Node:         ${process.version}`);
log('Red:          BLOQUEADA en todos los procesos de prueba');
log('');

// ---------- 1. Bundle ----------
log('[1/5] Bundle window.RiskOps');
if (!fs.existsSync(BUNDLE)) fail(`Falta ${rel(BUNDLE)}. suite_pruebas.bat lo compila con "npm run build"; si lo corres a mano, compílalo primero.`);
record('Bundle', 'verify-bundle.mjs', run(process.execPath, ['verify-bundle.mjs'], { cwd: BUILD }));
log('');

// ---------- 2. Suites unitarias ----------
const unitFiles = walk(TESTS);
log(`[2/5] Suites unitarias (${unitFiles.length} archivos en fase_2/src/tests)`);
for (const file of unitFiles) {
    record('Unitarias', path.relative(TESTS, file).split(path.sep).join('/'), run(process.execPath, [file]));
}
log('');

// ---------- 3 y 4. Integración + E2E ----------
// 2026-10-14: si app.js de la rama ya trae la integración, se prueba TAL CUAL (lo que se va a subir) contra la
// referencia congelada fase_2/lab/referencia/app.pre-integracion.js (app.js antes de conectarlo a src, con el
// parche de la Pausa de Turno). Si no, se genera el integrado en una copia fuera del repo, como antes.
const branchApp = path.join(REPO, 'app.js');
const branchIntegrated = fs.readFileSync(branchApp, 'utf8').includes('[LAB-INTEGRACION]');
const reference = path.join(LAB, 'referencia', 'app.pre-integracion.js');
const integrated = branchIntegrated ? branchApp : path.join(OUT, 'app.integrado.js');
const original = branchIntegrated ? reference : branchApp;
let integrationOk = false;
if (!ARGS.has('--solo-unitarias') && branchIntegrated) {
    log('[3/5] app.js de la rama ya conectado a fase_2/src: se prueba tal cual');
    if (fs.existsSync(reference)) {
        integrationOk = true;
        rows.push({ group: 'Integración', name: 'app.js de la rama (ya integrado)', status: 'OK', passed: 1, failed: 0, gaps: 0, network: 0, ms: 0 });
        log(`  [OK     ] integrado = ${rel(branchApp)}  |  referencia = ${rel(reference)}`);
    } else {
        rows.push({ group: 'Integración', name: 'referencia app.pre-integracion.js', status: 'FALLA', passed: 0, failed: 1, gaps: 0, network: 0, ms: 0 });
        log(`  [FALLA  ] falta la referencia ${rel(reference)}: las e2e de paridad no tienen contra qué comparar.`);
    }
    log('');
} else if (!ARGS.has('--solo-unitarias')) {
    log('[3/5] Integración del laboratorio sobre el app.js actual de la rama (copia fuera del repo)');
    try {
        const { integrateApp, loadExtraSteps } = await import(pathToFileURL(path.join(LAB, 'integracion', 'aplicar-integracion.mjs')).href);
        const extra = await loadExtraSteps(path.join(LAB, 'integracion', 'pasos'));
        const result = integrateApp(fs.readFileSync(original, 'utf8'), extra);
        fs.writeFileSync(integrated, result.source);
        integrationOk = true;
        rows.push({ group: 'Integración', name: 'aplicar-integracion.mjs', status: 'OK', passed: result.applied.length, failed: 0, gaps: 0, network: 0, ms: 0 });
        log(`  [OK     ] ${result.applied.length} pasos aplicados → ${integrated}`);
    } catch (error) {
        rows.push({ group: 'Integración', name: 'aplicar-integracion.mjs', status: 'FALLA', passed: 0, failed: 1, gaps: 0, network: 0, ms: 0 });
        log(`  [FALLA  ] ${error.message}`);
        log('             Un ancla de la integración ya no coincide con app.js (cambió en la rama). Las e2e integradas no se pueden correr hasta actualizar el paso.');
    }
    log('');
}
if (!ARGS.has('--solo-unitarias')) {
    log('[4/5] E2E con el app.js real y el bundle real (+ parche de la Pausa de Turno en la referencia)');
    const E2E = path.join(TESTS, 'e2e');
    const idx = path.join(REPO, 'index.html');
    const rules = path.join(REPO, 'database.rules.json');
    const cases = [
        ['split-shift-flag.unit.cjs', [integrated, '--strict', '--riskops', BUNDLE, '--index', idx, '--rules', rules]],
        ['cierre-horas-efectivas.e2e.cjs', [integrated, '--strict', '--riskops', BUNDLE]],
        ['monitoreo-render.e2e.cjs', [integrated]],
        ['tareas-integrado.e2e.cjs', [integrated, '--riskops', BUNDLE, '--original', original]],
        ['modales-permisos-integrado.e2e.cjs', [integrated, '--riskops', BUNDLE, '--original', original]],
        ['historial-navegacion-integrado.e2e.cjs', [original, integrated, BUNDLE]],
        ['kpis-integrado.e2e.cjs', [integrated, '--riskops', BUNDLE, '--original', original]],
        ['comunicados-integrado.e2e.cjs', [integrated, '--riskops', BUNDLE, '--original', original]],
        ['turno-avance-panel-horas-efectivas.e2e.cjs', [integrated, '--riskops', BUNDLE, '--original', original]],
        // Parche de la Pausa de Turno (2026-10-04) sobre el app.js SIN integrar (la referencia, o la rama si aún no
        // está integrada): se perdió una vez del app.js de trabajo; esta prueba lo detecta.
        ['parche-pausa-turno.unit.cjs', [original]]
    ];
    for (const [file, args] of cases) {
        if (!integrationOk) {
            rows.push({ group: 'E2E', name: file, status: 'OMITIDA', passed: 0, failed: 0, gaps: 0, network: 0, ms: 0 });
            log(`  [OMITIDA] ${file} (sin app.js integrado)`);
            continue;
        }
        record('E2E', file, run(process.execPath, [path.join(E2E, file), ...args], { cwd: SRC }));
    }
    log('');
}

// ---------- 5. Motor operativo (Python) ----------
if (!ARGS.has('--sin-motor') && !ARGS.has('--solo-unitarias')) {
    log('[5/5] Motor operativo — test_motor_operativo.py en entorno hermético (sin red, sin credenciales reales)');
    const candidates = process.env.RISKOPS_PYTHON ? [[process.env.RISKOPS_PYTHON, []]] : [['python', []], ['py', ['-3']], ['python3', []]];
    let r = null;
    for (const [cmd, pre] of candidates) {
        const attempt = run(cmd, [...pre, '-I', path.join(here, 'motor_operativo_aislado.py'), REPO], { cwd: here, guard: false });
        if (attempt.code !== 'ERROR') { r = attempt; break; }
    }
    if (!r) {
        rows.push({ group: 'Motor', name: 'test_motor_operativo.py', status: 'OMITIDA', passed: 0, failed: 0, gaps: 0, network: 0, ms: 0 });
        log('  [OMITIDA] No se encontró Python. Instala Python 3 o define RISKOPS_PYTHON.');
    } else {
        const m = r.output.match(/MOTOR_RESULT (\{.*\})/);
        const info = m ? JSON.parse(m[1]) : { estado: 'FALLA', motivo: 'Sin línea MOTOR_RESULT' };
        if (info.estado === 'OMITIDA') {
            rows.push({ group: 'Motor', name: 'test_motor_operativo.py', status: 'OMITIDA', passed: 0, failed: 0, gaps: 0, network: 0, ms: r.ms });
            log(`  [OMITIDA] ${info.motivo}`);
        } else {
            record('Motor', 'test_motor_operativo.py + contrato de seguridad', r, {
                status: info.estado === 'OK' ? 'OK' : 'FALLA',
                counts: { passed: info.pasan ?? 0, failed: info.fallan ?? 0 }
            });
            if (info.intentos_de_red_bloqueados?.length) log(`             Intentos de red bloqueados: ${info.intentos_de_red_bloqueados.join(', ')}`);
            if (info.motivo) log(`             ${info.motivo}`);
        }
    }
    log('');
}

// ---------- Indicadores de avance del refactor ----------
const appSource = fs.readFileSync(original, 'utf8');
const delegations = (appSource.match(/\[Fase 2\]/g) || []).length;
const riskOpsRefs = (appSource.match(/window\.RiskOps/g) || []).length;

// ---------- Resumen ----------
const groups = ['Bundle', 'Unitarias', 'Integración', 'E2E', 'Motor'];
log('=====================================================================');
log(' RESUMEN');
log('=====================================================================');
log('Grupo          Archivos  OK   Falla  Omitida   Pruebas OK   Pruebas falla');
let totalBad = 0;
for (const g of groups) {
    const items = rows.filter((r) => r.group === g);
    if (!items.length) continue;
    const okN = items.filter((r) => r.status === 'OK').length;
    const badN = items.filter((r) => r.status === 'FALLA' || r.status === 'TIEMPO').length;
    const skipN = items.filter((r) => r.status === 'OMITIDA').length;
    totalBad += badN;
    const p = items.reduce((s, r) => s + (r.passed || 0), 0);
    const f = items.reduce((s, r) => s + (r.failed || 0), 0);
    log(`${g.padEnd(14)} ${String(items.length).padStart(8)} ${String(okN).padStart(4)} ${String(badN).padStart(6)} ${String(skipN).padStart(8)} ${String(p).padStart(12)} ${String(f).padStart(15)}`);
}
const blocked = rows.reduce((s, r) => s + (r.network || 0), 0);
log('');
log(`Marcas [Fase 2] (delegaciones) en app.js: ${delegations} | referencias a window.RiskOps: ${riskOpsRefs}`);
log(`Intentos de red bloqueados durante la suite: ${blocked}`);
log('');
const verdict = totalBad === 0
    ? 'RESULTADO: TODO EN VERDE — el código actual de la rama pasa la suite del laboratorio. Siguiente paso: prueba manual con Iniciar_Laboratorio_Fase2.bat.'
    : `RESULTADO: ${totalBad} archivo(s) con fallas — revisa el detalle arriba antes de subir a la rama refactor.`;
log(verdict);
log(`Duración total: ${((Date.now() - startedAt.getTime()) / 1000).toFixed(1)} s`);

const logFile = path.join(OUT, `resultado-${stamp}.txt`);
fs.writeFileSync(logFile, lines.join('\r\n'), 'utf8');
fs.writeFileSync(path.join(OUT, 'ultimo-resultado.txt'), lines.join('\r\n'), 'utf8');
fs.writeFileSync(path.join(OUT, 'ultimo-resultado.json'), JSON.stringify({ fecha: startedAt.toISOString(), delegations, riskOpsRefs, blocked, rows }, null, 2), 'utf8');
console.log(`\nLog guardado en: ${logFile}`);
process.exit(totalBad === 0 ? 0 : 1);
