/**
 * Contenido y estructura del Informe Ejecutivo (impresión/PDF) del Control Operativo.
 * Extraído de `generarReporteEjecutivoPDF()` (app.js 7216-7290). La función original NO usa jsPDF/html2pdf:
 * rellena un bloque de impresión del DOM y llama a `window.print()` tras 800 ms. Aquí queda el contenido
 * (textos, orden de gráficas, título de la tabla) como datos puros; el DOM y `print()` los maneja
 * `controllers/kpi-controller.js` con las dependencias inyectadas.
 */

/** Espera antes de imprimir, en ms (app.js 7284). */
export const PRINT_DELAY_MS = 800;

/** Texto del periodo cuando el selector está en "custom" y faltan fechas (app.js 7225). */
export const REPORT_CUSTOM_START_FALLBACK = 'Inicio';
export const REPORT_CUSTOM_END_FALLBACK = 'Fin';

/**
 * Gráficas del informe, en el orden en que el original las procesa (app.js 7270-7274).
 * `chartKey`: llave en el registro de gráficas; `imgId`: imagen de impresión donde se vuelca;
 * `title`: título que se muestra encima de la imagen.
 */
export const REPORT_CHARTS = Object.freeze([
    Object.freeze({ chartKey: 'chartTardanzasPeores', imgId: 'printChart5', title: 'Top Alerta Tardanzas (Peores)' }),
    Object.freeze({ chartKey: 'chartTardanzasMejores', imgId: 'printChart1', title: 'Top Excelencia Puntualidad (Mejores)' }),
    Object.freeze({ chartKey: 'chartAprobacionesDia', imgId: 'printChart2', title: 'Evolución Diaria de Retiros' }),
    Object.freeze({ chartKey: 'chartInactividad', imgId: 'printChart3', title: 'Promedio Inactividad Diaria (Min)' }),
    Object.freeze({ chartKey: 'chartEficiencia', imgId: 'printChart4', title: 'Eficiencia y Volumen de Retiros' })
]);

/** Título de la tabla de resumen dentro del informe (app.js 7279). */
export const REPORT_TABLE_TITLE_HTML = `<h3 style="color: #000; text-align: center; margin-bottom: 10px; font-size: 14pt; font-weight: bold; page-break-after: avoid;">Resumen de Retiros por Gestor</h3>`;

/** @param {string[]} selectedGestores @returns {string} */
export function buildReportGestorText(selectedGestores) {
    return selectedGestores.length > 0 ? selectedGestores.join(', ') : 'Todos los gestores';
}

/**
 * Texto del periodo: la etiqueta de la opción elegida o, con "custom", "Personalizado (inicio a fin)".
 *
 * @param {{selectedOptionText: string, value: string, customStart?: string, customEnd?: string}} period
 * @returns {string}
 */
export function buildReportPeriodoText({ selectedOptionText, value, customStart, customEnd }) {
    if (value === 'custom') {
        return `Personalizado (${customStart || REPORT_CUSTOM_START_FALLBACK} a ${customEnd || REPORT_CUSTOM_END_FALLBACK})`;
    }
    return selectedOptionText;
}

/**
 * Línea de metadatos del informe (app.js 7227).
 *
 * @param {{generatedAtText: string, gestorText: string, periodoText: string}} parts
 *   `generatedAtText`: `now.toLocaleString()` calculado por el llamador (depende del idioma/zona del navegador).
 * @returns {string}
 */
export function buildReportMetaText({ generatedAtText, gestorText, periodoText }) {
    return `Fecha de generación: ${generatedAtText} | Gestor(es): ${gestorText} | Periodo: ${periodoText}`;
}

/** HTML del bloque de tabla del informe: título + tabla original (app.js 7279). */
export function buildReportTableHtml(tableOuterHtml) {
    return REPORT_TABLE_TITLE_HTML + tableOuterHtml;
}

/**
 * Qué hacer con cada gráfica del informe: capturarla como imagen (existe en el registro Y existe su imagen de
 * impresión) u ocultar su imagen (la gráfica no existe pero sí la imagen). Si no existe la imagen no se hace nada.
 *
 * @param {Object<string, unknown>} chartRegistry Registro de gráficas vivas (por id).
 * @param {(imgId: string) => boolean} hasImage ¿Existe el elemento de imagen?
 * @returns {Array<{chartKey: string, imgId: string, title: string, action: 'capture'|'hide'|'skip'}>}
 */
export function planReportCharts(chartRegistry, hasImage) {
    return REPORT_CHARTS.map(c => {
        const chartObj = chartRegistry[c.chartKey];
        const img = hasImage(c.imgId);
        let action = 'skip';
        if (chartObj && img) action = 'capture';
        else if (img) action = 'hide';
        return { ...c, action };
    });
}
