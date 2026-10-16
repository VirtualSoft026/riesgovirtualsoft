/*
 * Arranque de «Control de Tiempos» (paso 3.4, W-28 y DE-4 = a). Reemplaza a js/tiempos.js.
 *
 * Carga después de riskops.bundle.js y app.js. La lógica está en RiskOps.tiemposController, RiskOps.tiemposView y
 * RiskOps.tiemposReport; este archivo solo conecta el entorno real: el documento, la base de datos (`database`), el
 * horario de app.js (`loadSchedule`, `globalScheduleRows`, `globalScheduleBlocks`) y Chart.js.
 *
 * Los controles se enlazan con addEventListener (ya no con onchange en index.html), y app.js avisa al entrar a la
 * vista con el evento «riskops:tiempos-refresh».
 */
(function () {
    'use strict';

    if (!window.RiskOps || !RiskOps.tiemposController || !RiskOps.tiemposView) {
        console.error('[tiempos] RiskOps no está disponible: Control de Tiempos no se inicializa.');
        return;
    }

    var controller = RiskOps.tiemposController.createTiemposController({
        doc: document,
        database: database,
        ensureSchedule: function () { return loadSchedule(); },
        getSchedule: function () { return { rows: globalScheduleRows, blocks: globalScheduleBlocks }; },
        getShift: RiskOps.scheduleService.getShiftForDate,
        view: RiskOps.tiemposView.createTiemposView({
            doc: document,
            Chart: window.Chart,
            ChartDataLabels: window.ChartDataLabels,
            escapeHTML: RiskOps.sanitization.escapeHTML
        }),
        now: function () { return new Date(); },
        logger: console
    });

    controller.init();
})();
