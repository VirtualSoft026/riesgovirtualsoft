/**
 * Decisión D1 (2026-10-06), panel de reportes: el tiempo efectivo por reporte de `calcularIndicadores()` (tarjeta
 * "Duración Promedio") usa la MISMA fórmula que el correo de cierre:
 *     duración − almuerzo − desayuno − Pausa de Turno − inactividad   (la penalidad es informativa)
 *
 * Desde el paso 3.3 (KPIs) el cálculo vive en la fuente única `src/domain/analytics/kpi-indicators-service.js`
 * (`computeShiftDurations`), que usa el controlador `kpi-controller.js` dentro de `calcularIndicadores()`. El bloque
 * inline de app.js ya no existe (zombi retirado), así que:
 *   - P0 afirma que app.js integrado NO conserva el bloque inline y que el bundle exporta la función única.
 *   - P1–P6 ejercen la función de producción `RiskOps.kpiIndicators.computeShiftDurations` con datos de la tabla.
 *   - P7–P8 comparan contra el bloque ORIGINAL (--original) para demostrar que la ÚNICA diferencia es la
 *     inactividad restada (diferencia intencional D1).
 *
 * Uso: node turno-avance-panel-horas-efectivas.e2e.cjs <app.integrado.js> --riskops <bundle.js> [--original <app.js del repo>]
 */
const fs = require('fs');
const vm = require('vm');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const APP = args.find((a) => !a.startsWith('--') && a.endsWith('.js') && a !== opt('--riskops') && a !== opt('--original'));
if (!APP || !opt('--riskops')) { console.error('Uso: node turno-avance-panel-horas-efectivas.e2e.cjs <app.integrado.js> --riskops <bundle.js> [--original <app.js>]'); process.exit(2); }
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const BUNDLE = fs.readFileSync(opt('--riskops'), 'utf8');
const ORIGINAL = opt('--original') ? read(opt('--original')) : null;
const SRC = read(APP);

const START = '        if (report.horaInicio && report.horaFin) {\n            const baseMs';
const END = '\n        // Construir HTML de bitácora para el modal/tarjeta';

/** Bloque inline del original (solo para la comparación P7/P8). */
function extractBlock(src) {
    const s = src.indexOf(START);
    const e = src.indexOf(END, s);
    if (s < 0 || e < 0) throw new Error('No se encontró el bloque de tiempo efectivo en calcularIndicadores() del original');
    return src.slice(s, e);
}

const ctx = { Date, Math, isNaN, parseInt, parseFloat, console };
vm.createContext(ctx);
vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);
const RiskOps = ctx.RiskOps;

/** Función de producción: fuente única de D1. */
const panel = (reports) => RiskOps.kpiIndicators.computeShiftDurations(JSON.parse(JSON.stringify(reports)));

function makeLegacyRunner(src) {
    const block = extractBlock(src);
    const lctx = { Date, Math, isNaN, parseInt, parseFloat, console };
    vm.createContext(lctx);
    vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', lctx);
    const fn = vm.runInContext(`(function (shiftReports) {
        let totalMinutosConectados = 0; let turnosValidosParaTiempo = 0;
        shiftReports.forEach(report => {
${block}
        });
        return { totalMinutosConectados, turnosValidosParaTiempo };
    })`, lctx);
    return (reports) => fn(JSON.parse(JSON.stringify(reports)));
}

const MIN = 60000;
const BASE = new Date(2026, 9, 6, 8, 0, 0).getTime();
const rep = (shiftMin, extra = {}) => Object.assign({
    timestamp: BASE + shiftMin * MIN,
    horaInicio: new Date(BASE).toISOString(),
    horaFin: new Date(BASE + shiftMin * MIN).toISOString()
}, extra);

const legacy = ORIGINAL ? makeLegacyRunner(ORIGINAL) : null;

console.log('=== D1: PANEL DE REPORTES (Duración Promedio) CON LA FÓRMULA ÚNICA DE HORAS EFECTIVAS ===');
console.log(`app.js: ${APP} | función de producción: RiskOps.kpiIndicators.computeShiftDurations | ${new Date().toISOString()}`);

let pass = 0; let fail = 0;
const T = (id, name, run) => { try { run(); pass++; console.log(`  [PASS] ${id} ${name}`); } catch (e) { fail++; console.log(`  [FAIL] ${id} ${name}\n         -> ${e.message}`); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || 'distinto'}: esperado ${JSON.stringify(b)}, obtenido ${JSON.stringify(a)}`); };
const ok = (c, m) => { if (!c) throw new Error(m || 'falso'); };

T('P0', 'app.js integrado ya no conserva el bloque inline de D1 (lo retiró el paso 3.3) y el bundle exporta kpiIndicators.computeShiftDurations', () => {
    ok(!SRC.includes(START), 'el bloque inline sigue en app.js: debería estar en kpi-indicators-service / controlador');
    ok(typeof RiskOps.kpiIndicators.computeShiftDurations === 'function', 'falta la función única en el bundle');
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
console.log(`Pasan: ${pass} | Fallan: ${fail} | Total: ${pass + fail}`);
process.exitCode = fail ? 1 : 0;
