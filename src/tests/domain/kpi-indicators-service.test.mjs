/**
 * Pruebas unitarias de las funciones PURAS de `src/domain/analytics/kpi-indicators-service.js` (paso 3.3, KPIs).
 *
 * Cubren cada export del servicio: tiempo efectivo por reporte (D1), conteo de tareas, % de actividades, inactividad y
 * conectividad (ventana fuera de horario, clean-timeline, tope de 480 min y clamp de 0-100), retiros (agregación,
 * penalidad, fechas objetivo), formateo, periodo y coincidencia de gestores.
 *
 * Las fechas se construyen con el constructor LOCAL de Date, así que el resultado no depende de la zona horaria.
 * Se ejecuta con: node src/tests/domain/kpi-indicators-service.test.mjs
 */
import { createRunner, assert } from '../test-harness.mjs';
import * as S from '../../domain/analytics/kpi-indicators-service.js';

const { test, summarize } = createRunner('kpi-indicators-service (funciones puras de KPIs)');

const MIN = 60000;
const at = (y, mo, d, h = 0, mi = 0, s = 0) => new Date(y, mo, d, h, mi, s).getTime(); // mes 0-based, hora local
const iso = (ms) => new Date(ms).toISOString();

// 6 de octubre de 2026, 08:00 local: día de referencia de los turnos de prueba.
const DIA = [2026, 9, 6];
const T8 = at(...DIA, 8);

// ─────────────────────────── computeShiftDurations (D1) ───────────────────────────────────────

test('computeShiftDurations: fórmula D1 = duración − almuerzo − desayuno − Pausa de Turno − inactividad', () => {
    const r = {
        horaInicio: iso(T8), horaFin: iso(T8 + 600 * MIN), timestamp: T8,
        tiempoAlmuerzoMins: 30, tiempoPausaTurnoMins: 180, inactividadTotalMins: 0, penalidadConectividadMins: 0
    };
    assert.deepEqual(S.computeShiftDurations([r]), { totalMinutosConectados: 390, turnosValidosParaTiempo: 1 });
});

test('computeShiftDurations: resta la inactividad guardada y NO la penalidad', () => {
    const r = {
        horaInicio: iso(T8), horaFin: iso(T8 + 600 * MIN), timestamp: T8,
        tiempoAlmuerzoMins: 75, tiempoDesayunoMins: 20, tiempoPausaTurnoMins: 120, inactividadTotalMins: 10, penalidadConectividadMins: 30
    };
    assert.equal(S.computeShiftDurations([r]).totalMinutosConectados, 375);
});

test('computeShiftDurations: reporte antiguo sin inactividadTotalMins usa penalidad − excesos como inactividad', () => {
    const r = { horaInicio: iso(T8), horaFin: iso(T8 + 600 * MIN), timestamp: T8, tiempoAlmuerzoMins: 75, tiempoDesayunoMins: 20, penalidadConectividadMins: 30 };
    assert.equal(S.computeShiftDurations([r]).totalMinutosConectados, 495);
});

test('computeShiftDurations: excluye reportes sin hora, ilegibles, de duración 0 o de más de 24 h', () => {
    const out = S.computeShiftDurations([
        { horaInicio: iso(T8) },
        { horaInicio: 'x', horaFin: 'y', timestamp: T8 },
        { horaInicio: iso(T8), horaFin: iso(T8), timestamp: T8 },
        { horaInicio: iso(T8), horaFin: iso(T8 + 3 * 1440 * MIN), timestamp: T8 }
    ]);
    assert.deepEqual(out, { totalMinutosConectados: 0, turnosValidosParaTiempo: 0 });
});

test('computeShiftDurations: hora fin anterior a la de inicio cruza la medianoche (+1440 min)', () => {
    const r = { horaInicio: '10:00', horaFin: '08:00', timestamp: T8 };
    assert.deepEqual(S.computeShiftDurations([r]), { totalMinutosConectados: 1320, turnosValidosParaTiempo: 1 });
});

test('computeShiftDurations: nunca devuelve negativos aunque la inactividad supere la duración', () => {
    const r = { horaInicio: iso(T8), horaFin: iso(T8 + 60 * MIN), timestamp: T8, inactividadTotalMins: 300 };
    assert.equal(S.computeShiftDurations([r]).totalMinutosConectados, 0);
});

test('computeShiftDurations: suma varios turnos y cuenta solo los válidos; lista vacía da ceros', () => {
    const ok = (mins, extra = {}) => ({ horaInicio: iso(T8), horaFin: iso(T8 + mins * MIN), timestamp: T8, ...extra });
    assert.deepEqual(S.computeShiftDurations([ok(600, { tiempoPausaTurnoMins: 180 }), ok(480), { horaInicio: 'x' }]), { totalMinutosConectados: 900, turnosValidosParaTiempo: 2 });
    assert.deepEqual(S.computeShiftDurations([]), { totalMinutosConectados: 0, turnosValidosParaTiempo: 0 });
});

// ─────────────────────────── computeKpiTaskCounts ─────────────────────────────────────────────

test('computeKpiTaskCounts: cuenta por estado y arma las listas del modal', () => {
    const reports = [{
        timestamp: T8,
        tasks: {
            t1: { status: 'finalizada', name: 'Tarea 1', type: 'adicional', observation: 'ok' },
            t2: { status: 'no_realizada', name: 'Tarea 2' },
            t3: { status: 'no realizada', name: 'Tarea 3' },
            t4: { status: 'pendiente', name: 'Tarea 4' },
            t5: { status: 'en_proceso', name: 'Tarea 5' },
            t6: { status: 'en proceso', name: 'Tarea 6' },
            t7: { status: 'desconocido', name: 'Tarea 7' },
            t8: { name: 'sin estado' }
        }
    }];
    const out = S.computeKpiTaskCounts(reports);
    assert.equal(out.totalFinalizadas, 1);
    assert.equal(out.totalNoRealizadas, 2);
    assert.equal(out.totalPendientes, 3);
    assert.deepEqual(out.kpiTaskLists.finalizadas[0], { name: 'Tarea 1', date: new Date(T8).toLocaleDateString(), type: 'adicional', observation: 'ok' });
    assert.deepEqual(out.kpiTaskLists.finalizadas[0].type, 'adicional');
    assert.equal(out.kpiTaskLists.no_realizadas.length, 2);
    assert.equal(out.kpiTaskLists.pendientes.length, 3);
    assert.equal(out.kpiTaskLists.no_realizadas[0].type, 'N/A', 'sin tipo, N/A');
    assert.equal(out.kpiTaskLists.no_realizadas[0].observation, 'N/A', 'sin observación, N/A');
});

test('computeKpiTaskCounts: lee el texto libre legacy (campo reporte) con su observación', () => {
    const reports = [{ timestamp: T8, reporte: '[Finalizada] - Revisión de cajas\nObservación: sin novedad\n[No_Realizada] - Conteo\n[Pendiente] - Cierre' }];
    const out = S.computeKpiTaskCounts(reports);
    assert.equal(out.totalFinalizadas, 1);
    assert.equal(out.totalNoRealizadas, 1);
    assert.equal(out.totalPendientes, 1);
    assert.equal(out.kpiTaskLists.finalizadas[0].name, 'Revisión de cajas');
    assert.equal(out.kpiTaskLists.finalizadas[0].observation, 'sin novedad');
    assert.equal(out.kpiTaskLists.pendientes[0].observation, 'N/A');
});

test('computeKpiTaskCounts: usa resolveDisplayName para el nombre mostrado y omite reportes sin tareas', () => {
    const reports = [{ tasks: { k1: { status: 'finalizada', name: 'Crudo' } } }, { timestamp: T8 }, { tasks: { k2: { status: '' } } }];
    const out = S.computeKpiTaskCounts(reports, { resolveDisplayName: (key) => `Nombre de ${key}` });
    assert.equal(out.totalFinalizadas, 1);
    assert.equal(out.kpiTaskLists.finalizadas[0].name, 'Nombre de k1');
    assert.equal(S.computeKpiTaskCounts([]).totalFinalizadas, 0);
});

test('computeKpiTaskCounts: sin resolver, el nombre es el campo name (o vacío)', () => {
    const out = S.computeKpiTaskCounts([{ tasks: { a: { status: 'finalizada' } } }]);
    assert.equal(out.kpiTaskLists.finalizadas[0].name, '');
});

// ─────────────────────────── computeActividadesPercentage ─────────────────────────────────────

test('computeActividadesPercentage: finalizadas / total, entero redondeado, 0 sin tareas', () => {
    assert.equal(S.computeActividadesPercentage(0, 0, 0), 0);
    assert.equal(S.computeActividadesPercentage(3, 1, 0), 75);
    assert.equal(S.computeActividadesPercentage(1, 2, 0), 33);
    assert.equal(S.computeActividadesPercentage(2, 1, 0), 67);
    assert.equal(S.computeActividadesPercentage(0, 4, 4), 0);
});

// ─────────────────────────── computeInactivityScore ───────────────────────────────────────────

test('computeInactivityScore: sin reportes da ceros y 100 % de conectividad', () => {
    assert.deepEqual(S.computeInactivityScore([]), { totalInactividadMins: 0, validInactivitySessions: 0, diasTrabajados: 0, porcentajeConectividad: 100 });
});

test('computeInactivityScore: sin timeline usa inactividadTotalMins y el porcentaje sobre 405 min por día', () => {
    const out = S.computeInactivityScore([{ inactividadTotalMins: 40.5 }]);
    assert.equal(out.totalInactividadMins, 40.5);
    assert.equal(out.diasTrabajados, 1);
    assert.equal(out.porcentajeConectividad, 90);
});

test('computeInactivityScore: tope de 480 min por turno', () => {
    assert.equal(S.computeInactivityScore([{ inactividadTotalMins: 600 }]).totalInactividadMins, 480);
});

test('computeInactivityScore: la conectividad se acota entre 0 y 100', () => {
    assert.equal(S.computeInactivityScore([{ inactividadTotalMins: 480 }]).porcentajeConectividad, 0);
    assert.equal(S.computeInactivityScore([{ inactividadTotalMins: 0 }]).porcentajeConectividad, 100);
});

test('computeInactivityScore: excluye turnos fuera de horario (> 4 h de diferencia) y el día fallback sigue en 1', () => {
    const fuera = { turnoProgramado: '8am - 4pm', loginTime: at(...DIA, 14), inactividadTotalMins: 50 };
    const out = S.computeInactivityScore([fuera]);
    assert.equal(out.validInactivitySessions, 0);
    assert.equal(out.totalInactividadMins, 0);
    assert.equal(out.diasTrabajados, 1);
});

test('computeInactivityScore: un turno dentro de la ventana de 4 h sí cuenta', () => {
    const dentro = { turnoProgramado: '8am - 4pm', loginTime: at(...DIA, 8, 30), inactividadTotalMins: 50 };
    const out = S.computeInactivityScore([dentro]);
    assert.equal(out.validInactivitySessions, 1);
    assert.equal(out.totalInactividadMins, 50);
});

test('computeInactivityScore: la hora de inicio en texto se interpreta cuando no hay loginTime', () => {
    const dentro = { turnoProgramado: '8am - 4pm', horaInicio: '06/10/2026, 8:30:00 a. m.', inactividadTotalMins: 5 };
    assert.equal(S.computeInactivityScore([dentro]).validInactivitySessions, 1);
});

test('computeInactivityScore: clean-timeline descarta < 30 s, descarta dentro de un break, fusiona y recorta superposiciones', () => {
    const report = {
        loginTime: T8,
        timestamp: T8 + 540 * MIN,
        turnoProgramado: '8am - 4pm',
        timeline: [
            { type: 'Inactividad', start: at(...DIA, 10, 0), end: at(...DIA, 10, 10) },        // 10 min
            { type: 'Inactividad', start: at(...DIA, 10, 0), end: at(...DIA, 10, 0, 20) },     // < 30 s: fuera
            { type: 'Almuerzo', start: at(...DIA, 12, 0), end: at(...DIA, 13, 0) },
            { type: 'Inactividad', start: at(...DIA, 12, 10), end: at(...DIA, 12, 20) },       // dentro del almuerzo: fuera
            { type: 'Inactividad', start: at(...DIA, 14, 0), end: at(...DIA, 14, 5) },         // se fusiona con la siguiente
            { type: 'Inactividad', start: at(...DIA, 14, 5, 30), end: at(...DIA, 14, 8) }      // gap 30 s ≤ 60 s: 14:00–14:08
        ]
    };
    const out = S.computeInactivityScore([report], { nowMs: T8 + 540 * MIN });
    assert.equal(out.totalInactividadMins, 18);
    assert.equal(out.validInactivitySessions, 1);
    assert.equal(out.porcentajeConectividad, 95.56);
});

test('computeInactivityScore: superposición con otro tipo recorta la inactividad al final del evento anterior', () => {
    const report = {
        loginTime: T8, timestamp: T8 + 540 * MIN, turnoProgramado: '8am - 4pm',
        timeline: [
            { type: 'Desayuno', start: at(...DIA, 9, 0), end: at(...DIA, 9, 30) },
            { type: 'Inactividad', start: at(...DIA, 9, 20), end: at(...DIA, 9, 40) }          // solo 9:30–9:40 cuenta
        ]
    };
    assert.equal(S.computeInactivityScore([report]).totalInactividadMins, 10);
});

test('computeInactivityScore: sin fin usa la marca del reporte; más de 10 h desde el login no cuenta', () => {
    const report = {
        loginTime: T8, timestamp: T8 + 540 * MIN, turnoProgramado: '8am - 4pm',
        timeline: [
            { type: 'Inactividad', start: at(...DIA, 10, 0) },                               // sin fin: hasta 17:00 → 420 min → tope 480 no aplica
            { type: 'Inactividad', start: at(...DIA, 19, 0), end: at(...DIA, 19, 30) }       // después de 18:00: fuera
        ]
    };
    assert.equal(S.computeInactivityScore([report], { nowMs: T8 + 540 * MIN }).totalInactividadMins, 420);
});

test('computeInactivityScore: varios días suman inactividad y dividen entre días válidos', () => {
    const out = S.computeInactivityScore([{ inactividadTotalMins: 405 }, { inactividadTotalMins: 405 }]);
    assert.equal(out.diasTrabajados, 2);
    assert.equal(out.totalInactividadMins, 810);
    assert.equal(out.porcentajeConectividad, 0);
});

// ─────────────────────────── Retiros: agregación y penalidad ──────────────────────────────────

const RAW = {
    'Ana Pérez': {
        '2026-10-05': { Retiros_Aprobados: 3, Retiros_Rechazados: 1, Retiros_Procesados: 4, Tiempo_Total_Desde_Creacion_Segundos: 600 },
        '2026-10-06': { Retiros_Aprobados: 2, Retiros_Rechazados: 0, Retiros_Procesados: 2, Tiempo_Total_Desde_Creacion_Segundos: 120 }
    },
    'Luis Gómez': {
        '2026-10-06': { Retiros_Aprobados: 5 } // campos ausentes cuentan como 0
    }
};

test('computeRetirosKpiStats: periodo general suma todos los días y gestores', () => {
    const out = S.computeRetirosKpiStats(RAW, { periodo: 'general', targetDates: [], selectedGestores: [] });
    assert.deepEqual(out, { totalAprobados: 10, totalRechazados: 1, montoProcesado: 0, minutosDemoraTotales: 12, retirosConTiempo: 6 });
});

test('computeRetirosKpiStats: filtra por fechas objetivo y por gestores seleccionados', () => {
    const porFecha = S.computeRetirosKpiStats(RAW, { periodo: 'hoy', targetDates: ['2026-10-06'], selectedGestores: [] });
    assert.equal(porFecha.totalAprobados, 7);
    assert.equal(porFecha.retirosConTiempo, 2);
    const porGestor = S.computeRetirosKpiStats(RAW, { periodo: 'general', targetDates: [], selectedGestores: ['Luis Gómez'] });
    assert.equal(porGestor.totalAprobados, 5);
    assert.equal(porGestor.minutosDemoraTotales, 0);
});

test('computeRetirosKpiStats: gestor inexistente se omite y sin datos devuelve ceros', () => {
    assert.equal(S.computeRetirosKpiStats(RAW, { periodo: 'general', targetDates: [], selectedGestores: ['Nadie'] }).totalAprobados, 0);
    assert.equal(S.computeRetirosKpiStats(null, { periodo: 'general', targetDates: [], selectedGestores: [] }).totalAprobados, 0);
});

test('computeRetirosKpiPenalty: sin retiros con tiempo no penaliza y marca hayDatos = false', () => {
    assert.deepEqual(S.computeRetirosKpiPenalty({ minutosDemoraTotales: 0, retirosConTiempo: 0 }), { penalidadRetiros: 0, avgDemoraMins: 0, porcentajeRetiros: 100, hayDatos: false });
});

test('computeRetirosKpiPenalty: promedio ≤ 15 min no penaliza; límite exacto en 15 no cuenta', () => {
    assert.equal(S.computeRetirosKpiPenalty({ minutosDemoraTotales: 150, retirosConTiempo: 10 }).penalidadRetiros, 0);
    assert.equal(S.computeRetirosKpiPenalty({ minutosDemoraTotales: 145, retirosConTiempo: 10 }).penalidadRetiros, 0);
    assert.equal(S.computeRetirosKpiPenalty({ minutosDemoraTotales: 155, retirosConTiempo: 10 }).penalidadRetiros, 0, '15.5 → floor(0.5) = 0');
});

test('computeRetirosKpiPenalty: penalidad = floor(promedio − 15) con tope de 30 %', () => {
    const veinte = S.computeRetirosKpiPenalty({ minutosDemoraTotales: 200, retirosConTiempo: 10 });
    assert.deepEqual(veinte, { penalidadRetiros: 5, avgDemoraMins: 20, porcentajeRetiros: 95, hayDatos: true });
    assert.equal(S.computeRetirosKpiPenalty({ minutosDemoraTotales: 257, retirosConTiempo: 10 }).penalidadRetiros, 10, '25.7 → 10');
    const tope = S.computeRetirosKpiPenalty({ minutosDemoraTotales: 600, retirosConTiempo: 10 });
    assert.equal(tope.penalidadRetiros, 30);
    assert.equal(tope.porcentajeRetiros, 70);
});

// ─────────────────────────── Formato ──────────────────────────────────────────────────────────

test('computeAvgShiftDuration: promedio en horas y minutos; N/A sin turnos válidos', () => {
    assert.deepEqual(S.computeAvgShiftDuration(0, 0), { promedioHoras: 0, promedioMinutos: 0, label: 'N/A' });
    assert.deepEqual(S.computeAvgShiftDuration(390, 1), { promedioHoras: 6, promedioMinutos: 30, label: '6h 30m' });
    assert.equal(S.computeAvgShiftDuration(1000, 3).label, '5h 33m');
});

test('formatInactividadLabel: "Xh Ym" y cero para valores ≤ 0', () => {
    assert.equal(S.formatInactividadLabel(0), '0h 0m');
    assert.equal(S.formatInactividadLabel(-5), '0h 0m');
    assert.equal(S.formatInactividadLabel(90), '1h 30m');
    assert.equal(S.formatInactividadLabel(125.4), '2h 5m');
});

test('redondeo con acarreo: minutos que redondean a 60 suman una hora (no "1h 60m")', () => {
    assert.equal(S.formatInactividadLabel(119.6), '2h 0m');
    assert.equal(S.formatInactividadLabel(59.6), '1h 0m');
    assert.equal(S.formatInactividadLabel(59.4), '0h 59m');
    assert.equal(S.formatInactividadLabel(0.3), '0h 0m');
    assert.equal(S.computeAvgShiftDuration(119.6, 1).label, '2h 0m');
    assert.deepEqual(S.computeAvgShiftDuration(119.6, 1), { promedioHoras: 2, promedioMinutos: 0, label: '2h 0m' });
    assert.deepEqual(S.computeAvgShiftDuration(359.7, 1), { promedioHoras: 6, promedioMinutos: 0, label: '6h 0m' });
    assert.equal(S.computeAvgShiftDuration(1000, 3).label, '5h 33m', 'sin acarreo no cambia');
});

test('formatLocalYYYYMMDD: fecha local con ceros a la izquierda', () => {
    assert.equal(S.formatLocalYYYYMMDD(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
    assert.equal(S.formatLocalYYYYMMDD(new Date(2026, 11, 31)), '2026-12-31');
});

// ─────────────────────────── Periodo ──────────────────────────────────────────────────────────

test('resolveKpiPeriodo: mapea cada valor del selector y deja "general" para lo demás', () => {
    const mapa = { today: 'hoy', yesterday: 'ayer', '7': 'semanal', '30': '30dias', thisMonth: 'mes', lastMonth: 'lastMonth', custom: 'custom' };
    for (const [entrada, salida] of Object.entries(mapa)) assert.equal(S.resolveKpiPeriodo(entrada), salida, entrada);
    assert.equal(S.resolveKpiPeriodo('Todas'), 'general');
    assert.equal(S.resolveKpiPeriodo('valor raro'), 'general');
});

test('filterShiftReportsByPeriodo: cada ventana toma los reportes correctos (ahora = 15 oct 2026, 12:00 local)', () => {
    const nowMs = at(2026, 9, 15, 12);
    const r = {
        hoy: { timestamp: at(2026, 9, 15, 9) },
        hoyTexto: { timestamp: iso(at(2026, 9, 15, 10)) },
        ayer: { timestamp: at(2026, 9, 14, 20) },
        semana: { timestamp: at(2026, 9, 9, 12) },
        sep20: { timestamp: at(2026, 8, 20, 12) },
        sep1: { timestamp: at(2026, 8, 1, 10) },
        sinFecha: { tasks: {} }
    };
    const todos = Object.values(r);
    const ids = (lista) => lista.map((x) => Object.keys(r).find((k) => r[k] === x)).sort();
    assert.deepEqual(ids(S.filterShiftReportsByPeriodo(todos, 'hoy', { nowMs })), ['hoy', 'hoyTexto']);
    assert.deepEqual(ids(S.filterShiftReportsByPeriodo(todos, 'ayer', { nowMs })), ['ayer']);
    assert.deepEqual(ids(S.filterShiftReportsByPeriodo(todos, 'semanal', { nowMs })), ['ayer', 'hoy', 'hoyTexto', 'semana']);
    assert.deepEqual(ids(S.filterShiftReportsByPeriodo(todos, '30dias', { nowMs })), ['ayer', 'hoy', 'hoyTexto', 'semana', 'sep20']);
    assert.deepEqual(ids(S.filterShiftReportsByPeriodo(todos, 'mes', { nowMs })), ['ayer', 'hoy', 'hoyTexto', 'semana']);
    assert.deepEqual(ids(S.filterShiftReportsByPeriodo(todos, 'lastMonth', { nowMs })), ['sep1', 'sep20']);
});

test('filterShiftReportsByPeriodo: custom usa [inicio, fin) y sin rango no deja nada; general no filtra', () => {
    const nowMs = at(2026, 9, 15, 12);
    const lista = [{ timestamp: at(2026, 9, 14, 12) }, { timestamp: at(2026, 9, 15, 0) }];
    const custom = { startMs: at(2026, 9, 14), endMs: at(2026, 9, 15) };
    assert.equal(S.filterShiftReportsByPeriodo(lista, 'custom', { nowMs, custom }).length, 1);
    assert.equal(S.filterShiftReportsByPeriodo(lista, 'custom', { nowMs }).length, 0);
    assert.equal(S.filterShiftReportsByPeriodo(lista, 'general', { nowMs }), lista, 'general devuelve la misma lista');
    assert.equal(S.filterShiftReportsByPeriodo(lista, 'desconocido', { nowMs }), lista);
});

test('buildRetirosTargetDates: fechas YYYY-MM-DD de cada periodo', () => {
    const nowMs = at(2026, 9, 15, 12);
    assert.deepEqual(S.buildRetirosTargetDates('hoy', { nowMs }), ['2026-10-15']);
    assert.deepEqual(S.buildRetirosTargetDates('ayer', { nowMs }), ['2026-10-14']);
    const semanal = S.buildRetirosTargetDates('semanal', { nowMs });
    assert.equal(semanal.length, 7);
    assert.equal(semanal[0], '2026-10-15');
    assert.equal(semanal[6], '2026-10-09');
    const treinta = S.buildRetirosTargetDates('30dias', { nowMs });
    assert.equal(treinta.length, 30);
    assert.equal(treinta[29], '2026-09-16');
    const mes = S.buildRetirosTargetDates('mes', { nowMs });
    assert.equal(mes.length, 15);
    assert.equal(mes[0], '2026-10-01');
    const anterior = S.buildRetirosTargetDates('lastMonth', { nowMs });
    assert.equal(anterior.length, 30);
    assert.equal(anterior[0], '2026-09-01');
    assert.equal(anterior[29], '2026-09-30');
});

test('buildRetirosTargetDates: custom incluye ambos extremos; sin fechas o periodo general no devuelve nada', () => {
    const nowMs = at(2026, 9, 15, 12);
    assert.deepEqual(S.buildRetirosTargetDates('custom', { nowMs, customStartStr: '2026-10-02', customEndStr: '2026-10-04' }), ['2026-10-02', '2026-10-03', '2026-10-04']);
    assert.deepEqual(S.buildRetirosTargetDates('custom', { nowMs }), []);
    assert.deepEqual(S.buildRetirosTargetDates('general', { nowMs }), []);
});

// ─────────────────────────── Gestores ─────────────────────────────────────────────────────────

test('matchesShiftReportGestor: coincide con acentos y mayúsculas normalizadas', () => {
    assert.equal(S.matchesShiftReportGestor('Ana Pérez', ['ana perez']), true);
    assert.equal(S.matchesShiftReportGestor('ANA PEREZ', ['Ana Pérez']), true);
});

test('matchesShiftReportGestor: basta con que todas las partes del seleccionado estén en el nombre', () => {
    assert.equal(S.matchesShiftReportGestor('Ana Pérez', ['Pérez']), true);
});

test('matchesShiftReportGestor: con dos o más palabras en ambos lados compara primer nombre y primer apellido', () => {
    assert.equal(S.matchesShiftReportGestor('Ana Lopez Gomez', ['Ana Maria Lopez']), true);
});

test('matchesShiftReportGestor: sin coincidencia, sin gestor o sin selección devuelve false', () => {
    assert.equal(S.matchesShiftReportGestor('Luis Gómez', ['Ana Pérez']), false);
    assert.equal(S.matchesShiftReportGestor('', ['Ana Pérez']), false);
    assert.equal(S.matchesShiftReportGestor(null, ['Ana Pérez']), false);
    assert.equal(S.matchesShiftReportGestor('Ana Pérez', []), false);
});

test('resolveRawGestorKeys: usa la clave exacta, luego la coincidencia por palabras y si no, el nombre tal cual', () => {
    const claves = ['Ana Pérez', 'Luis Gómez', 'Zoe'];
    assert.deepEqual(S.resolveRawGestorKeys(['Ana Pérez'], claves), ['Ana Pérez']);
    assert.deepEqual(S.resolveRawGestorKeys(['ana perez'], claves), ['Ana Pérez']);
    assert.deepEqual(S.resolveRawGestorKeys(['Luis'], claves), ['Luis Gómez']);
    assert.deepEqual(S.resolveRawGestorKeys(['Nadie'], claves), ['Nadie']);
    assert.deepEqual(S.resolveRawGestorKeys([], claves), []);
});

summarize();
