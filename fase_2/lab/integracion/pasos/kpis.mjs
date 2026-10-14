/**
 * Paso de integración SOLO-LABORATORIO del corte "KPIs, analítica y gráficas".
 *
 * Sustituye, en la copia de staging de app.js (nunca en el original), los cuerpos de las funciones del Portal de KPIs y del
 * Control Operativo por llamadas a los módulos de `fase_2/src` (bundle `RiskOps`), conservando nombre, firma y orden de
 * llamada de cada función global (los `onclick` del index.html y los demás bloques de app.js siguen resolviendo a ellas).
 * Todo el estado sigue siendo de app.js: `window.controlOperativoRawData`, `window.retirosGlobalData`, `window.kpiUsersData`,
 * `window.kpiTaskLists` y el registro `controlOperativoCharts` (el MISMO objeto lo comparten app.js y el controlador).
 * Solo se conecta lo que una prueba diferencial contra la copia LITERAL de app.js demostró idéntico; cada paso lleva la marca
 * `[LAB-INTEGRACION]`.
 *
 * Pasos (anclas únicas; ninguna se solapa con el controlador de turno ni con los otros cortes):
 *  1. Puente (controlador creado la primera vez que se usa)             -> RiskOps.kpiController
 *  2. `fetchKpiOperativosData()`                                          -> RiskOps.kpiOperativosSource
 *  3. `loadRetirosData()` y `loadGestoresForKPIs()`                       -> RiskOps.kpiController
 *  4. `parseTime` (cierre local dentro de `calcularIndicadores()`)        -> RiskOps.kpiMetrics.parseTime
 *  5. `openKpiTaskDetails()` y `closeKpiTaskDetails()`                    -> RiskOps.kpiController
 *  6. `destroyChart()`                                                    -> RiskOps.kpiController
 *  7. `toggleOperativoCustomDates()`                                      -> RiskOps.kpiController
 *  8. `generarAnalisisTextual()`                                          -> RiskOps.kpiController (kpiOperativoAnalysis + kpiAnalysisView)
 *  9. `generarReporteEjecutivoPDF()`                                      -> RiskOps.kpiController (kpiExecutiveReport)
 * 10. `loadControlOperativoData()`                                        -> RiskOps.kpiController (kpiService + kpiRepository)
 * 11. `renderControlOperativoFiltered()`, `renderControlOperativoCharts()` y las 5 funciones `draw*`
 *                                                                          -> RiskOps.kpiController (kpiMetrics + kpiChartPlan + kpiChartConfigs)
 *
 * NO se tocan: `calcularIndicadores()` (salvo el cierre `parseTime`; el resto es del corte de time-metrics y no está extraído),
 * ni el HTML de index.html.
 *
 * Decisiones D5 y D9b (2026-10-06, plan maestro §4 ter): el controlador se crea SIN `excludedNames` y con sus predeterminados,
 * así que el app.js integrado usa el comportamiento decidido (diferencias INTENCIONALES respecto del original, afirmadas en
 * `kpis-integrado.e2e.cjs`): análisis textual con 2+ gestores sin TypeError y con el mismo rango de fechas que la tabla ("mes
 * anterior" normalizado), día operativo LOCAL de cada `shift_report`, supervisores identificados por rol en `users`.
 *
 * Diferencias DOCUMENTADAS e inocuas (ver el informe): el original MUTA el `extraOptions` recibido por `drawChart` (le añade
 * `plugins.datalabels`); el nuevo no lo muta. Ningún llamador de app.js reutiliza ese objeto.
 *
 * Demostración de paridad: `src/tests/{domain,ui,controllers}/kpi-*.test.mjs` (diferenciales contra la copia literal de app.js)
 * y `src/tests/e2e/kpis-integrado.e2e.cjs` (funciones reales del app.js integrado, en un `vm`, con el bundle real, contra el original).
 */

import { PANEL_D1_STEP } from '../turno-avance-paso-panel-d1.mjs'; // decisión D1 (grupo turno-avance)

export const MARK = '[LAB-INTEGRACION]';

const PUENTE = `window.retirosGlobalData = null; // Carga automática del backend
window.kpiTaskLists = { finalizadas: [], no_realizadas: [], pendientes: [] };

// ${MARK} Puente app.js -> RiskOps (corte "kpis"): el controlador se crea la primera vez que se usa.
// El estado (window.*, controlOperativoCharts) sigue siendo de app.js; el controlador lo lee y escribe por referencia.
let __labKpiController = null;
function __kpiController() {
    if (__labKpiController) return __labKpiController;
    __labKpiController = RiskOps.kpiController.createKpiController({
        getEl: (id) => document.getElementById(id),
        querySelector: (selector) => document.querySelector(selector),
        createElement: (tag) => document.createElement(tag),
        state: window,
        chartRegistry: controlOperativoCharts,
        ChartClass: Chart,
        datalabelsPlugin: typeof ChartDataLabels !== 'undefined' ? ChartDataLabels : {},
        fetchKpiData: () => fetchKpiOperativosData(),
        database: database,
        getSelectedGestores: (id) => getSelectedMultiSelectValues(id),
        setSelectedGestores: (id, values) => setCustomMultiSelectValues(id, values),
        setupMultiSelect: (id, options, onChange) => setupCustomMultiSelect(id, options, onChange),
        recalcularIndicadores: () => calcularIndicadores(),
        // ${MARK} D9b: sin SUPERVISORES_NOMBRES. Los supervisores se derivan del ROL en users (la misma lectura de users que ya
        // hacen loadGestoresForKPIs/loadControlOperativoData; el panel de KPIs solo lo abre Supervisor/Admin).
        // D5: corregirBugs y fechaLocal quedan con su valor por defecto (encendidos); el día operativo usa la zona del navegador.
        now: () => new Date(),
        alert: (message) => alert(message),
        print: () => window.print(),
        setTimeout: (fn, ms) => setTimeout(fn, ms),
        scrollToTop: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
        logger: console
    });
    return __labKpiController;
}
`;

const FETCH = `async function fetchKpiOperativosData() { // ${MARK} RiskOps.kpiOperativosSource
    return RiskOps.kpiOperativosSource.fetchKpiOperativosData({
        fetchFn: (url) => fetch(url),
        isLocal: RiskOps.kpiOperativosSource.detectLocalEnvironment(window),
        now: () => new Date().getTime(),
        logger: console
    });
}

`;

const CARGAS = `async function loadRetirosData() { return __kpiController().loadRetirosData(); } // ${MARK} RiskOps.kpiController

function loadGestoresForKPIs() { __kpiController().loadGestoresForKPIs(); } // ${MARK} RiskOps.kpiController (el original no devuelve nada)

`;

const PARSE_TIME = `            const parseTime = (timeStr, baseDateMs) => RiskOps.kpiMetrics.parseTime(timeStr, baseDateMs); // ${MARK} RiskOps.kpiMetrics
`;

const MODAL = `// Modal de Detalle de Tareas (KPIs) — ${MARK} RiskOps.kpiController
function openKpiTaskDetails(tipo) { return __kpiController().openKpiTaskDetails(tipo); }

function closeKpiTaskDetails() { return __kpiController().closeKpiTaskDetails(); }

`;

const DESTROY = `let controlOperativoCharts = {};

function destroyChart(id) { return __kpiController().destroyChart(id); } // ${MARK} RiskOps.kpiController (mismo registro controlOperativoCharts)

`;

const TOGGLE = `function toggleOperativoCustomDates() { return __kpiController().toggleOperativoCustomDates(); } // ${MARK} RiskOps.kpiController

`;

const ANALISIS = `function generarAnalisisTextual() { return __kpiController().generarAnalisisTextual(); } // ${MARK} RiskOps.kpiController

`;

const INFORME = `function generarReporteEjecutivoPDF() { return __kpiController().generarReporteEjecutivoPDF(); } // ${MARK} RiskOps.kpiController



`;

const CARGA_OPERATIVO = `async function loadControlOperativoData() { return __kpiController().loadControlOperativoData(); } // ${MARK} RiskOps.kpiController

`;

const RENDER_Y_GRAFICAS = `// ${MARK} Tabla/tarjetas/gráficas del Control Operativo: RiskOps.kpiController (kpiMetrics, kpiChartPlan, kpiChartConfigs)
function renderControlOperativoFiltered() { return __kpiController().renderControlOperativoFiltered(); }

function renderControlOperativoCharts(data, dailyData, selectedGestor) { return __kpiController().renderControlOperativoCharts(data, dailyData, selectedGestor); }

function drawPunctualDatesChart(id, dates, dataArr, bgColors) { return __kpiController().drawPunctualDatesChart(id, dates); } // dataArr y bgColors los ignora el original

function drawChart(id, type, labels, dataArr, labelStr, bgColor, borderColor, extraOptions = {}) { return __kpiController().drawChart(id, type, labels, dataArr, labelStr, bgColor, borderColor, extraOptions); }

function drawCombinedChart(id, labels, data) { return __kpiController().drawCombinedChart(id, labels, data); }

function drawCombinedChartDaily(id, sortedDates, selectedGestor) { return __kpiController().drawCombinedChartDaily(id, sortedDates, selectedGestor); }

function drawScatterMatriz(id, gestores, data, isGlobal = true) { return __kpiController().drawScatterMatriz(id, gestores, data, isGlobal); }

`;

export const STEPS = [
    {
        name: 'kpis: puente del controlador de KPIs (RiskOps.kpiController)',
        exact: 'window.retirosGlobalData = null; // Carga automática del backend\nwindow.kpiTaskLists = { finalizadas: [], no_realizadas: [], pendientes: [] };\n',
        replace: () => PUENTE
    },
    {
        name: 'kpis: fetchKpiOperativosData delega en RiskOps.kpiOperativosSource',
        start: 'async function fetchKpiOperativosData() {',
        end: '// Cargar data de retiros automáticamente',
        endInclusive: false,
        replace: () => FETCH
    },
    {
        name: 'kpis: loadRetirosData y loadGestoresForKPIs delegan en RiskOps.kpiController',
        start: 'async function loadRetirosData() {',
        end: 'async function calcularIndicadores() {',
        endInclusive: false,
        replace: () => CARGAS
    },
    {
        name: 'kpis: parseTime (cierre dentro de calcularIndicadores) delega en RiskOps.kpiMetrics',
        start: '            const parseTime = (timeStr, baseDateMs) => {',
        end: '                return NaN;\n            };\n',
        endInclusive: true,
        replace: () => PARSE_TIME
    },
    {
        name: 'kpis: openKpiTaskDetails y closeKpiTaskDetails delegan en RiskOps.kpiController',
        start: '// Modal de Detalle de Tareas (KPIs)\nfunction openKpiTaskDetails(tipo) {',
        end: '// Inicialización al cargar el DOM',
        endInclusive: false,
        replace: () => MODAL
    },
    {
        name: 'kpis: destroyChart delega en RiskOps.kpiController',
        start: 'let controlOperativoCharts = {};\n\nfunction destroyChart(id) {',
        end: 'window.controlOperativoRawData = null;\n',
        endInclusive: false,
        replace: () => DESTROY
    },
    {
        name: 'kpis: toggleOperativoCustomDates delega en RiskOps.kpiController',
        start: 'function toggleOperativoCustomDates() {',
        end: '// ==========================================\n// Función para Generar Análisis Textual IA',
        endInclusive: false,
        replace: () => TOGGLE
    },
    {
        name: 'kpis: generarAnalisisTextual delega en RiskOps.kpiController',
        start: 'function generarAnalisisTextual() {',
        end: '// ==========================================\n// Función para Generar Informe Ejecutivo en PDF',
        endInclusive: false,
        replace: () => ANALISIS + '\n'
    },
    {
        name: 'kpis: generarReporteEjecutivoPDF delega en RiskOps.kpiController',
        start: 'function generarReporteEjecutivoPDF() {',
        end: 'async function loadControlOperativoData() {',
        endInclusive: false,
        replace: () => INFORME
    },
    {
        name: 'kpis: loadControlOperativoData delega en RiskOps.kpiController',
        start: 'async function loadControlOperativoData() {',
        end: 'function renderControlOperativoFiltered() {',
        endInclusive: false,
        replace: () => CARGA_OPERATIVO
    },
    {
        name: 'kpis: renderControlOperativoFiltered, renderControlOperativoCharts y funciones draw* delegan en RiskOps.kpiController',
        start: 'function renderControlOperativoFiltered() {',
        end: '// ==========================================\n// ACTIVE SUPERVISOR BADGE LOGIC',
        endInclusive: false,
        replace: () => RENDER_Y_GRAFICAS
    },
    PANEL_D1_STEP // D1: Duración Promedio de calcularIndicadores con la fórmula única de tiempo efectivo
];
