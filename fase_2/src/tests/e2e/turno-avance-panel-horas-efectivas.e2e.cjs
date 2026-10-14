/**
 * Decisión D1 (2026-10-06), panel de reportes: el tiempo efectivo por reporte de `calcularIndicadores()` (tarjeta
 * "Duración Promedio") usa la MISMA fórmula que el correo de cierre:
 *     duración − almuerzo − desayuno − Pausa de Turno − inactividad   (la penalidad es informativa)
 *
 * Ejecuta el bloque REAL de app.js (el `if (report.horaInicio && report.horaFin) { ... }` del `forEach` de reportes) en
 * un `vm`, con el bundle real `RiskOps`. Si el app.js integrado aún no trae el paso del panel (hoy el paso está como
 * PROPUESTA en `lab/integracion/turno-avance-paso-panel-d1.mjs`, fuera de `pasos/`), la prueba lo aplica EN MEMORIA
 * sobre el integrado y lo dice en la salida ("propuesto"); si ya está registrado, dice "conectado".
 *
 * DIFERENCIA INTENCIONAL con el app.js original (D1): el original no resta la inactividad en el panel. Con
 * --original se comprueba que la única diferencia es exactamente esa inactividad.
 *
 * Uso: node turno-avance-panel-horas-efectivas.e2e.cjs <app.integrado.js> --riskops <bundle.js> [--original <app.js del repo>]
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { pathToFileURL } = require('url');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const APP = args.find((a) => !a.startsWith('--') && a.endsWith('.js') && a !== opt('--riskops') && a !== opt('--original'));
if (!APP || !opt('--riskops')) { console.error('Uso: node turno-avance-panel-horas-efectivas.e2e.cjs <app.integrado.js> --riskops <bundle.js> [--original <app.js>]'); process.exit(2); }
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const BUNDLE = fs.readFileSync(opt('--riskops'), 'utf8');
const ORIGINAL = opt('--original') ? read(opt('--original')) : null;
const LAB = path.join(__dirname, '..', '..', '..', 'lab', 'integracion');

const START = '        if (report.horaInicio && report.horaFin) {\n            const baseMs';
const END = '\n        // Construir HTML de bitácora para el modal/tarjeta';
const CONNECTED_MARK = 'RiskOps.effectiveTime.computeSavedReportEffectiveMinutes(report, diffMins)';

function extractBlock(src) {
    const s = src.indexOf(START);
    const e = src.indexOf(END, s);
    if (s < 0 || e < 0) throw new Error('No se encontró el bloque de tiempo efectivo en calcularIndicadores()');
    return src.slice(s, e);
}

function makeRunner(src) {
    const block = extractBlock(src);
    const ctx = { Date, Math, isNaN, parseInt, parseFloat, console };
    vm.createContext(ctx);
    vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);
    const fn = vm.runInContext(`(function (shiftReports) {
        let totalMinutosConectados = 0; let turnosValidosParaTiempo = 0;
        shiftReports.forEach(report => {
${block}
        });
        return { totalMinutosConectados, turnosValidosParaTiempo };
    })`, ctx);
    return (reports) => fn(JSON.parse(JSON.stringify(reports)));
}

const MIN = 60000;
const BASE = new Date(2026, 9, 6, 8, 0, 0).getTime();
const rep = (shiftMin, extra = {}) => Object.assign({
    timestamp: BASE + shiftMin * MIN,
    horaInicio: new Date(BASE).toISOString(),
    horaFin: new Date(BASE + shiftMin * MIN).toISOString()
}, extra);

(async () => {
    const { applySteps } = await import(pathToFileURL(path.join(LAB, 'aplicar-integracion.mjs')).href);
    const { PANEL_D1_STEP, PANEL_D1_ANCHOR } = await import(pathToFileURL(path.join(LAB, 'turno-avance-paso-panel-d1.mjs')).href);
    let SRC = read(APP);
    const connected = SRC.includes(CONNECTED_MARK);
    let mode = 'conectado (el paso ya está en el app.js integrado)';
    if (!connected) {
        SRC = applySteps(SRC, [PANEL_D1_STEP]);
        mode = 'propuesto (paso aplicado EN MEMORIA; aún no registrado en lab/integracion/pasos/)';
    }

    console.log('=== D1: PANEL DE REPORTES (Duración Promedio) CON LA FÓRMULA ÚNICA DE HORAS EFECTIVAS ===');
    console.log(`app.js: ${APP} | paso del panel: ${mode} | ${new Date().toISOString()}`);

    const panel = makeRunner(SRC);
    const legacy = ORIGINAL ? makeRunner(ORIGINAL) : null;
    const RiskOps = (() => { const c = {}; vm.createContext(c); vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', c); return c.RiskOps; })();

    let pass = 0; let fail = 0;
    const T = (id, name, run) => { try { run(); pass++; console.log(`  [PASS] ${id} ${name}`); } catch (e) { fail++; console.log(`  [FAIL] ${id} ${name}\n         -> ${e.message}`); } };
    const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || 'distinto'}: esperado ${JSON.stringify(b)}, obtenido ${JSON.stringify(a)}`); };
    const ok = (c, m) => { if (!c) throw new Error(m || 'falso'); };

    T('P0', 'el ancla del paso aparece exactamente una vez en el app.js (integrado sin el paso / original)', () => {
        const base = connected ? ORIGINAL : read(APP);
        if (!base) return;
        eq(base.split(PANEL_D1_ANCHOR).length - 1, 1);
    });
    T('P1', 'ejemplo del plan: 08:00-18:00, almuerzo 30, pausa 180, sin inactividad = 390 min (6,50 h)', () => {
        eq(panel([rep(600, { tiempoAlmuerzoMins: 30, tiempoPausaTurnoMins: 180, inactividadTotalMins: 0, penalidadConectividadMins: 0 })]), { totalMinutosConectados: 390, turnosValidosParaTiempo: 1 });
    });
    T('P2', 'resta la inactividad guardada (inactividadTotalMins) y NO la penalidad', () => {
        // 10 h; almuerzo 75 (exceso 15), desayuno 20 (exceso 5), pausa 120, inactividad 10; penalidad 30
        eq(panel([rep(600, { tiempoAlmuerzoMins: 75, tiempoDesayunoMins: 20, tiempoPausaTurnoMins: 120, inactividadTotalMins: 10, penalidadConectividadMins: 30 })]).totalMinutosConectados, 375);
    });
    T('P3', 'correo = panel: las horas del cierre (RiskOps.shiftCalculator) coinciden con el panel para el mismo turno', () => {
        const t = RiskOps.shiftCalculator.calculateShiftClosureTimes({ loginMs: BASE, endMs: BASE + 540 * MIN, lunchMs: 70 * MIN, breakfastMs: 18 * MIN, splitShiftMs: 60 * MIN, inactivityMins: 12, effectiveInactivityMins: 12 });
        const saved = rep(540, { tiempoAlmuerzoMins: t.lunchMinutes, tiempoDesayunoMins: t.breakfastMinutes, tiempoPausaTurnoMins: t.splitShiftMinutes, inactividadTotalMins: 12, penalidadConectividadMins: t.penaltyMins });
        eq((panel([saved]).totalMinutosConectados / 60).toFixed(2), t.effectiveHours);
        eq(t.penaltyMins, 25, 'penalidad informativa');
    });
    T('P4', 'reporte ANTIGUO sin inactividadTotalMins: inactividad = penalidad - excesos (30 - 15 - 5 = 10)', () => {
        eq(panel([rep(600, { tiempoAlmuerzoMins: 75, tiempoDesayunoMins: 20, penalidadConectividadMins: 30 })]).totalMinutosConectados, 495);
    });
    T('P5', 'reportes que no cuentan (sin hora fin, ilegibles, duración 0) siguen excluidos; nunca negativo', () => {
        const out = panel([
            { horaInicio: new Date(BASE).toISOString() },
            { horaInicio: 'x', horaFin: 'y', timestamp: BASE },
            rep(0),
            rep(60, { tiempoPausaTurnoMins: 300, inactividadTotalMins: 5 })
        ]);
        eq(out, { totalMinutosConectados: 0, turnosValidosParaTiempo: 1 });
    });
    T('P6', 'promedio de varios turnos: suma de los efectivos con la fórmula única', () => {
        const out = panel([
            rep(600, { tiempoAlmuerzoMins: 30, tiempoPausaTurnoMins: 180, inactividadTotalMins: 0 }), // 390
            rep(480, { tiempoAlmuerzoMins: 60, tiempoDesayunoMins: 15, inactividadTotalMins: 25 }), // 380
            rep(540, { tiempoAlmuerzoMins: 75, penalidadConectividadMins: 20 }) // 540-75-5 = 460
        ]);
        eq(out, { totalMinutosConectados: 1230, turnosValidosParaTiempo: 3 });
    });
    if (legacy) {
        T('P7', '[D1, diferencia intencional] frente al original: la ÚNICA diferencia es la inactividad restada (300 reportes con semilla)', () => {
            let s = 7;
            const r = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
            for (let i = 0; i < 300; i++) {
                const extra = { tiempoAlmuerzoMins: Math.round(r() * 90), tiempoDesayunoMins: Math.round(r() * 30) };
                if (r() < 0.5) extra.tiempoPausaTurnoMins = Math.round(r() * 200);
                if (r() < 0.7) extra.inactividadTotalMins = Math.round(r() * 600) / 10;
                if (r() < 0.6) extra.penalidadConectividadMins = Math.round(r() * 900) / 10;
                const one = rep(30 + Math.floor(r() * 700), extra);
                const a = legacy([one]); const b = panel([one]);
                eq(b.turnosValidosParaTiempo, a.turnosValidosParaTiempo);
                const inact = RiskOps.effectiveTime.resolveReportInactivityMinutes(one).minutes;
                ok(Math.abs(b.totalMinutosConectados - Math.max(0, a.totalMinutosConectados - inact)) < 1e-9, JSON.stringify(one));
            }
        });
        T('P8', 'sin inactividad ni penalidad el panel da lo mismo que el original (sin regresión)', () => {
            const one = rep(600, { tiempoAlmuerzoMins: 30, tiempoDesayunoMins: 10, tiempoPausaTurnoMins: 150 });
            eq(panel([one]), legacy([one]));
        });
    }

    console.log('\n=== RESUMEN ===');
    console.log(`Pasan: ${pass} | Fallan: ${fail} | Total: ${pass + fail} | Panel: ${connected ? 'CONECTADO' : 'PROPUESTO (falta registrar el paso en pasos/kpis.mjs)'}`);
    process.exitCode = fail ? 1 : 0;
})();
