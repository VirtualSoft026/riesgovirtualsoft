/**
 * Paso de laboratorio (grupo "turno-avance", decisión D1, 2026-10-06). CONECTADO: `pasos/kpis.mjs` lo importa y lo
 * agrega al final de su `STEPS` (la integración pasa de 58 a 59 pasos). Historia del archivo, abajo.
 *
 * Este archivo está FUERA de `pasos/` a propósito: `loadExtraSteps()` solo lee `pasos/*.mjs`, así que no cambia el
 * número de pasos (58) ni pisa la zona de otro corte. El bloque que toca, el tiempo efectivo por reporte dentro de
 * `calcularIndicadores()` (tarjeta "Duración Promedio", app.js 5939-5943), pertenece al corte de KPIs
 * (`pasos/kpis.mjs`, que hoy solo sustituye el cierre `parseTime` de esa misma función). Para conectarlo, el
 * responsable de ese corte debe añadir `PANEL_D1_STEP` al final de `STEPS` en `pasos/kpis.mjs`:
 *
 *     import { PANEL_D1_STEP } from '../turno-avance-paso-panel-d1.mjs';
 *     export const STEPS = [ ...pasos actuales..., PANEL_D1_STEP ];
 *
 * El ancla es exacta, aparece UNA sola vez en app.js y no se solapa con el paso `parseTime` de kpis.mjs.
 * Requiere `RiskOps.effectiveTime` (registrado en `src/entry-tareas.js`).
 *
 * Verificación: `src/tests/e2e/turno-avance-panel-horas-efectivas.e2e.cjs` aplica este paso sobre el app.js
 * integrado y comprueba que el panel calcula con la fórmula única y coincide con el correo de cierre.
 */

export const MARK = '[LAB-INTEGRACION]';

export const PANEL_D1_ANCHOR = `                    let almuerzo = report.tiempoAlmuerzoMins || 0;
                    let desayuno = report.tiempoDesayunoMins || 0;
                    let pausaTurno = report.tiempoPausaTurnoMins || 0;
                    let tiempoEfectivo = diffMins - almuerzo - desayuno - pausaTurno;
                    if (tiempoEfectivo < 0) tiempoEfectivo = 0;
`;

export const PANEL_D1_REPLACEMENT = `                    // ${MARK} D1: fórmula única de tiempo efectivo, la misma del correo de cierre (RiskOps.effectiveTime):
                    // duración - almuerzo - desayuno - Pausa de Turno - inactividad (inactividadTotalMins; en reportes
                    // antiguos, penalidad - excesos). La penalidad de conectividad es informativa y no se resta.
                    let tiempoEfectivo = RiskOps.effectiveTime.computeSavedReportEffectiveMinutes(report, diffMins);
`;

export const PANEL_D1_STEP = {
    name: 'D1: panel de reportes (calcularIndicadores, Duración Promedio) usa la fórmula única de tiempo efectivo',
    exact: PANEL_D1_ANCHOR,
    replace: () => PANEL_D1_REPLACEMENT
};
