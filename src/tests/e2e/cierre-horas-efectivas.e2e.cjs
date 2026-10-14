/**
 * Cierre de turno: horas efectivas con Pausa de Turno (2026-10-06).
 * Regla confirmada: la Pausa de Turno NO cuenta como tiempo trabajado.
 *
 * Ejecuta el bloque REAL de handleEndShift() de app.js (desde "// Format login time" hasta el campo
 * Horas_Efectivas_Trabajadas) en un `vm`, con tiempos y correo (FormData) simulados.
 *
 * Las pruebas [BRECHA] fallan en el app.js actual (reproducen el defecto) y deben pasar en el candidato.
 * Uso: node cierre-horas-efectivas.e2e.cjs <app.js> [--strict] [--riskops <riskops.bundle.js>]
 *
 * Con el app.js INTEGRADO del laboratorio ([LAB-INTEGRACION]) el bloque delega en RiskOps.shiftController: pasar el bundle
 * con --riskops. Los mismos escenarios validan entonces el refactor (con el integrado las brechas cuentan siempre como
 * fallas, igual que con --strict).
 *
 * DECISIÓN D1 (2026-10-06) — DIFERENCIA INTENCIONAL con el app.js original:
 *   horas efectivas = turno − almuerzo − desayuno − Pausa de Turno − inactividad (fórmula única del correo y del panel).
 *   El exceso de almuerzo/desayuno ya no se resta dos veces; la penalidad se sigue informando ("Exceso_Pausas_Penalidad")
 *   con el mismo cálculo, pero no se resta. H2 y H6 afirman ahora los valores DECIDIDOS (8.25 h y 6.25 h; el original
 *   da 7.92 h y 5.92 h) y, como H14..H18, quedan marcadas [D1]: en el app.js original se reportan como brecha.
 */
const fs = require('fs');
const vm = require('vm');
const APP = process.argv[2]; let STRICT = process.argv.includes('--strict');
const BUNDLE_ARG = process.argv.indexOf('--riskops');
const BUNDLE = BUNDLE_ARG >= 0 ? fs.readFileSync(process.argv[BUNDLE_ARG + 1], 'utf8') : null;
if (!APP) { console.error('Uso: node cierre-horas-efectivas.e2e.cjs <app.js> [--strict]'); process.exit(2); }
const SRC = fs.readFileSync(APP, 'utf8').replace(/\r\n/g, '\n');

const startMarker = '            // Format login time';
const INTEGRATED = SRC.includes('// [LAB-INTEGRACION:INICIO]');
if (INTEGRATED && !BUNDLE) { console.error('app.js integrado: falta --riskops <bundle>'); process.exit(2); }
if (INTEGRATED) STRICT = true; // el integrado debe cumplir TODO (incluidas las decisiones [D1])
const endMarker = INTEGRATED
    ? '__closure.emailFields.forEach(([campo, valor]) => formData.append(campo, valor)); // [LAB-INTEGRACION]'
    : 'formData.append("Horas_Efectivas_Trabajadas", effectiveHours + " hrs");';
const HELPER = INTEGRATED ? SRC.slice(SRC.indexOf('// [LAB-INTEGRACION:INICIO]'), SRC.indexOf('// [LAB-INTEGRACION:FIN]')) : '';
const s = SRC.indexOf(startMarker); const e = SRC.indexOf(endMarker, s);
if (s < 0 || e < 0) { console.error('No se encontró el bloque de cálculo en handleEndShift'); process.exit(2); }
const BLOCK = SRC.slice(s, e + endMarker.length);

const MIN = 60000, H = 3600000;
function close({ shiftMin, lunchMin = 0, breakfastMin = 0, splitMin = 0, inactMin = 0, timeline = null }) {
    const login = new Date('2026-10-06T08:00:00').getTime();
    const end = login + shiftMin * MIN;
    const fields = {};
    const formData = { append: (k, v) => { fields[k] = v; } };
    class FakeDate extends Date { constructor(...a) { if (a.length) super(...a); else super(end); } static now() { return end; } }
    const ctx = {
        Date: FakeDate, Math, parseFloat, formData,
        localUser: { name: 'Ana Prueba', role: 'Gestor', loginTime: new Date(login).toISOString() },
        totalLunchTimeMs: lunchMin * MIN, totalBreakfastTimeMs: breakfastMin * MIN, totalSplitShiftTimeMs: splitMin * MIN,
        shiftTimeline: timeline
            ? timeline.map(([type, from, to]) => ({ type, start: login + from * MIN, end: login + to * MIN }))
            : (inactMin ? [{ type: 'Inactividad', start: login + 10 * MIN, end: login + (10 + inactMin) * MIN }] : [])
    };
    vm.createContext(ctx);
    if (INTEGRATED) {
        // El helper lee el estado de pausas con identificadores globales (como en app.js)
        ctx.isLunchBreak = false; ctx.lunchStartTime = null; ctx.isBreakfastBreak = false; ctx.breakfastStartTime = null;
        ctx.isSplitShiftBreak = false; ctx.splitShiftStartTime = null; ctx.window = {}; ctx.document = { getElementById: () => null };
        vm.runInContext(BUNDLE + '\nthis.RiskOps = RiskOps;', ctx);
        vm.runInContext(HELPER, ctx);
    }
    vm.runInContext('(function(){\n' + BLOCK + '\n})();', ctx);
    return fields;
}
const hrs = (f) => parseFloat(f.Horas_Efectivas_Trabajadas);

const tests = [];
const T = (id, name, gap, run) => tests.push({ id, name, gap, run });
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m || 'distinto'}: esperado ${JSON.stringify(b)}, obtenido ${JSON.stringify(a)}`); };
const ok = (c, m) => { if (!c) throw new Error(m || 'falso'); };

T('H1', 'Sin Pausa de Turno: turno 8 h con 30 min de almuerzo = 7.50 h (sin regresión)', false, () => {
    eq(close({ shiftMin: 480, lunchMin: 30 }).Horas_Efectivas_Trabajadas, '7.50 hrs');
});
T('H2', '[D1] Sin Pausa de Turno: la penalidad se informa igual (30 min) pero no se resta: 600-75-20-10 = 8.25 h (original 7.92 h)', true, () => {
    // almuerzo 75 (15 de exceso), desayuno 20 (5 de exceso), inactividad 10 => penalidad 30 min (informativa)
    const f = close({ shiftMin: 600, lunchMin: 75, breakfastMin: 20, inactMin: 10 });
    eq(f.Exceso_Pausas_Penalidad, '30 minutos'); eq(f.Horas_Efectivas_Trabajadas, '8.25 hrs'); // 600-75-20-10 = 495 min
});
T('H3', 'Con Pausa de Turno: 08:00-18:00, almuerzo 30 min, pausa 180 min = 6.50 h (antes 9.50 h)', true, () => {
    eq(close({ shiftMin: 600, lunchMin: 30, splitMin: 180 }).Horas_Efectivas_Trabajadas, '6.50 hrs');
});
T('H4', 'La pausa resta del tiempo efectivo exactamente su duración (cada minuto baja 1/60 h)', true, () => {
    const sin = hrs(close({ shiftMin: 540 })); const con = hrs(close({ shiftMin: 540, splitMin: 90 }));
    eq((sin - con).toFixed(2), '1.50');
});
T('H5', 'La pausa NO altera la penalidad de conectividad (solo excesos e inactividad)', false, () => {
    const a = close({ shiftMin: 600, lunchMin: 75, inactMin: 10 }); const b = close({ shiftMin: 600, lunchMin: 75, inactMin: 10, splitMin: 120 });
    eq(a.Exceso_Pausas_Penalidad, b.Exceso_Pausas_Penalidad, 'penalidad');
});
T('H6', '[D1] Combinado: pausa + almuerzo con exceso + desayuno + inactividad restan cada uno una sola vez = 6.25 h (original 5.92 h)', true, () => {
    // 10 h; almuerzo 75, desayuno 20, pausa 120, inactividad 10 => 600-75-20-120-10 = 375 min = 6.25 h (la penalidad de 30 no se resta)
    const f = close({ shiftMin: 600, lunchMin: 75, breakfastMin: 20, splitMin: 120, inactMin: 10 });
    eq(f.Horas_Efectivas_Trabajadas, '6.25 hrs'); eq(f.Exceso_Pausas_Penalidad, '30 minutos');
});
T('H7', 'Nunca negativo: si la pausa supera al turno el resultado es 0.00', true, () => {
    eq(close({ shiftMin: 60, splitMin: 300 }).Horas_Efectivas_Trabajadas, '0.00 hrs');
});
T('H8', 'El correo informa "Tiempo_Pausa_Turno_Descontado" cuando hubo pausa', true, () => {
    eq(close({ shiftMin: 600, splitMin: 180 }).Tiempo_Pausa_Turno_Descontado, '180 minutos');
});
T('H9', 'El correo NO agrega el campo de pausa si no hubo pausa (sin ruido para el resto de gestores)', false, () => {
    ok(!('Tiempo_Pausa_Turno_Descontado' in close({ shiftMin: 480, lunchMin: 30 })), 'campo presente sin pausa');
});
T('H10', 'Campos existentes del correo conservados (almuerzo, desayuno, penalidad, usuario, horas)', false, () => {
    const f = close({ shiftMin: 480, lunchMin: 30, breakfastMin: 10, splitMin: 60 });
    eq(f.Tiempo_Almuerzo_Descontado, '30 minutos'); eq(f.Tiempo_Desayuno_Descontado, '10 minutos');
    ok('Exceso_Pausas_Penalidad' in f && 'Hora_Inicio_Turno' in f && 'Hora_Fin_Turno' in f && f.Usuario === 'Ana Prueba' && f.Rol === 'Gestor');
});
T('H11', 'Coherencia con el panel de reportes (línea de tiempoEfectivo) cuando no hay penalidad', true, () => {
    const f = close({ shiftMin: 600, lunchMin: 30, breakfastMin: 10, splitMin: 150 });
    const panelMin = 600 - 30 - 10 - 150; // misma fórmula que "diffMins - almuerzo - desayuno - pausaTurno"
    eq(hrs(f).toFixed(2), (panelMin / 60).toFixed(2));
});
T('H12', 'Orden: handleEndShift cierra la pausa abierta ANTES de calcular (el acumulado incluye el último tramo)', false, () => {
    const iClose = SRC.indexOf(INTEGRATED ? '__shiftController().closeOpenBreaks();' : 'if (isSplitShiftBreak) toggleSplitShiftBreak();');
    const iCalc = SRC.indexOf('// Format login time');
    ok(iClose > 0 && iCalc > iClose, 'la pausa abierta se cierra después del cálculo');
});
T('H13', 'El reporte guardado en Firebase conserva tiempoPausaTurnoMins (para el panel de reportes)', false, () => {
    ok(/tiempoPausaTurnoMins:\s*totalSplitShiftTimeMs/.test(SRC), 'falta tiempoPausaTurnoMins en shiftReportObject');
});
T('H14', '[D1] El exceso de almuerzo NO se resta dos veces: 10 h con 75 min de almuerzo = 8.75 h (original 8.50 h)', true, () => {
    const f = close({ shiftMin: 600, lunchMin: 75 });
    eq(f.Exceso_Pausas_Penalidad, '15 minutos'); eq(f.Horas_Efectivas_Trabajadas, '8.75 hrs');
});
T('H15', '[D1] El exceso de desayuno NO se resta dos veces: 8 h con 25 min de desayuno = 7.58 h (original 7.42 h)', true, () => {
    const f = close({ shiftMin: 480, breakfastMin: 25 });
    eq(f.Exceso_Pausas_Penalidad, '10 minutos'); eq(f.Horas_Efectivas_Trabajadas, '7.58 hrs');
});
T('H16', 'La inactividad se resta una sola vez: 10 h con 30 min de inactividad = 9.50 h (igual en el original)', false, () => {
    const f = close({ shiftMin: 600, inactMin: 30 });
    eq(f.Exceso_Pausas_Penalidad, '30 minutos'); eq(f.Horas_Efectivas_Trabajadas, '9.50 hrs');
});
T('H17', '[D1] Inactividad DENTRO del almuerzo: entra en la penalidad (sin cambios) pero no se resta otra vez de las horas (9.00 h; original 8.67 h)', true, () => {
    const f = close({ shiftMin: 600, lunchMin: 60, timeline: [['Almuerzo', 240, 300], ['Inactividad', 250, 270]] });
    eq(f.Exceso_Pausas_Penalidad, '20 minutos'); eq(f.Horas_Efectivas_Trabajadas, '9.00 hrs');
});
T('H18', '[D1] Correo = panel: las horas del correo son turno - almuerzo - desayuno - pausa - inactividad guardada (con penalidad > 0)', true, () => {
    // 9 h; almuerzo 70 (exceso 10), desayuno 18 (exceso 3), pausa 60, inactividad 12 => penalidad 25 (informativa)
    const f = close({ shiftMin: 540, lunchMin: 70, breakfastMin: 18, splitMin: 60, inactMin: 12 });
    const panelMin = 540 - 70 - 18 - 60 - 12; // fórmula única (la del panel con inactividadTotalMins)
    eq(f.Exceso_Pausas_Penalidad, '25 minutos'); eq(hrs(f).toFixed(2), (panelMin / 60).toFixed(2));
});
T('H19', 'El reporte guardado conserva inactividadTotalMins (el panel lo resta) y la penalidad (informativa)', false, () => {
    ok(/inactividadTotalMins:\s*inactividadMinsLimpia/.test(SRC) && /penalidadConectividadMins:\s*penalidadConectividadMins/.test(SRC), 'faltan campos en shiftReportObject');
});

(async () => {
    console.log('=== CIERRE DE TURNO — HORAS EFECTIVAS CON PAUSA DE TURNO ===');
    console.log(`app.js: ${APP} | modo: ${STRICT ? 'ESTRICTO' : 'informativo (las brechas se reportan aparte)'} | ${new Date().toISOString()}`);
    let pass = 0, fail = 0, gaps = 0;
    for (const t of tests) {
        try { await t.run(); pass++; console.log(`  [PASS] ${t.id} ${t.name}`); }
        catch (err) {
            if (t.gap) { gaps++; if (STRICT) fail++; console.log(`  [${STRICT ? 'FAIL' : 'BRECHA'}] ${t.id} ${t.name}\n         -> ${err.message}`); }
            else { fail++; console.log(`  [FAIL] ${t.id} ${t.name}\n         -> ${err.message}`); }
        }
    }
    console.log('\n=== RESUMEN ===');
    console.log(`Pasan: ${pass} | Fallan: ${STRICT ? fail : fail} | Brechas abiertas: ${STRICT ? 0 : gaps} | Total: ${tests.length}`);
    const good = fail === 0;
    console.log(good ? (!STRICT && gaps ? 'RESULTADO: SIN REGRESIONES; LA BRECHA DE HORAS EFECTIVAS SIGUE ABIERTA' : 'RESULTADO: TODO CUMPLIDO') : 'RESULTADO: HAY FALLAS');
    process.exitCode = good ? 0 : 1;
})();
