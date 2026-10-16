/*
 * Arranque de las acciones de index.html (paso 3.4, W-54 b y DE-5 = a). Sustituye los onclick/onchange/oninput/onsubmit
 * del HTML por `data-action`; la tabla de acciones vive en RiskOps.actionRegistry (src/ui/actions/action-registry.js).
 *
 * Carga después de riskops.bundle.js y app.js: las funciones globales que llama cada acción ya existen cuando el usuario
 * pulsa algo. El HTML generado en JS usa las mismas acciones, así que el registro sirve también para los renderizados.
 */
(function () {
    'use strict';

    if (!window.RiskOps || !RiskOps.actionRegistry) {
        console.error('[acciones] RiskOps.actionRegistry no está disponible: los botones de index.html no responderán.');
        return;
    }

    RiskOps.actionRegistry.bindActionRegistry(document, { win: window });
})();
