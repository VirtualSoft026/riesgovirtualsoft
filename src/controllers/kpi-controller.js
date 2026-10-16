/**
 * Controlador de KPIs y Control Operativo: orquesta datos, DOM y gráficas con dependencias inyectadas.
 *
 * Reemplaza la parte con efectos de estas funciones de `app.js`: `loadRetirosData()` (5704),
 * `loadGestoresForKPIs()` (5716), `openKpiTaskDetails()`/`closeKpiTaskDetails()` (6419/6475), `destroyChart()`
 * (7003), `toggleOperativoCustomDates()` (7012), `generarAnalisisTextual()` (7025), `generarReporteEjecutivoPDF()`
 * (7216), `loadControlOperativoData()` (7292), `renderControlOperativoFiltered()` (7481),
 * `renderControlOperativoCharts()` (7737) y `drawChart`/`drawPunctualDatesChart`/`drawCombinedChart`/
 * `drawCombinedChartDaily`/`drawScatterMatriz` (7972-8330).
 *
 * No toca `window`, `document`, Firebase ni Chart.js directamente: todo entra por `deps`. La lógica pura vive en
 * `domain/analytics/*`, `ui/charts/*`, `ui/components/kpi-task-details.js` y `ui/views/*`.
 * La adaptación a `app.js` (cuando se conecte en el laboratorio o en producción) queda en un puente delgado.
 *
 * Decisiones implementadas (plan maestro §4 ter):
 *  - D5: los KPIs se calculan dinámicamente desde el historial (JSON operativo de retiros + `shift_reports`), filtrando
 *    por el rango de fechas y los gestores elegidos; `corregirBugs` (análisis textual) y `fechaLocal` (día operativo
 *    local de cada reporte de turno) quedan ENCENDIDOS por defecto.
 *  - D9b: los supervisores se identifican por ROL (`users/{uid}/role` = 'Supervisor' | 'Admin'). El directorio se deriva
 *    de la MISMA lectura de `users` que ya hacen `loadGestoresForKPIs`/`loadControlOperativoData` (el panel de KPIs solo
 *    lo abre Supervisor/Admin, que sí puede leer `users`). Ya no se acepta `excludedNames` (lista fija por subcadena).
 */

import {
    aggregateOperativoData, summarizeOperativoRows, selectGlobalForCharts, resolveSelectedGestorLabel
} from '../domain/analytics/metrics-calculator.js';
import {
    buildKpiUsersMap, selectKpiGestores, mergeShiftReportsIntoOperativoData, loadRetirosData as loadRetirosDataService
} from '../domain/analytics/kpi-service.js';
import { computeAnalysisStats, resolveFiltroGestor } from '../domain/analytics/operativo-analysis.js';
import {
    PRINT_DELAY_MS, buildReportGestorText, buildReportPeriodoText, buildReportMetaText, buildReportTableHtml, planReportCharts
} from '../domain/analytics/executive-report.js';
import { readUsers, readShiftReports } from '../services/firebase/firebase-kpi-repository.js';
import { buildSupervisorDirectory, assertSupervisorDirectory } from '../domain/schedules/supervisor-directory.js';
import { buildAnalysisHtml } from '../ui/views/operativo-analysis-view.js';
import { buildOperativoRowHtml, buildOperativoArtWidgetHtml } from '../ui/views/operativo-table-view.js';
import { getKpiTaskDetailsHeader, buildKpiTaskListHtml } from '../ui/components/kpi-task-details.js';
import {
    buildBarChartConfig, buildPunctualDatesChartConfig, buildCombinedChartConfig, buildCombinedChartDailyConfig,
    buildScatterMatrizConfig, buildAprobacionesDiaConfig
} from '../ui/charts/operativo-chart-configs.js';
import { buildControlOperativoChartPlan } from '../ui/charts/operativo-chart-plan.js';
import {
    computeShiftDurations, computeKpiTaskCounts, computeActividadesPercentage, computeInactivityScore,
    computeRetirosKpiStats, computeRetirosKpiPenalty, computeAvgShiftDuration, formatInactividadLabel,
    resolveKpiPeriodo, filterShiftReportsByPeriodo, matchesShiftReportGestor, buildRetirosTargetDates, resolveRawGestorKeys
} from '../domain/analytics/kpi-indicators-service.js';
import {
    KPI_RING_CIRCUMFERENCE, resolveRingConfig, buildBitacoraCardHtml, buildBitacoraEmptyHtml, buildBitacoraTitleHtml
} from '../ui/views/kpi-indicators-view.js';

const MULTISELECT_ID = 'operativoGestorMultiSelect';

/**
 * @param {{
 *   getEl: (id: string) => (object|null),
 *   querySelector?: (selector: string) => (object|null),
 *   createElement?: (tag: string) => object,
 *   state: {controlOperativoRawData?: object|null, retirosGlobalData?: object|null, kpiUsersData?: object, kpiTaskLists?: object},
 *   chartRegistry: Object<string, {destroy: Function, toBase64Image?: Function}>,
 *   ChartClass?: new (ctx: object, config: object) => object,
 *   datalabelsPlugin?: object,
 *   fetchKpiData: () => Promise<object>,
 *   database?: {ref: Function}|null,
 *   getSelectedGestores: (id: string) => string[],
 *   setSelectedGestores?: (id: string, values: string[]) => void,
 *   setupMultiSelect?: (id: string, options: string[], onChange: () => void) => void,
 *   recalcularIndicadores?: () => void,
 *   supervisorDirectory?: object|null,
 *   legacyExcludedNames?: string[],
 *   corregirBugs?: boolean,
 *   fechaLocal?: boolean,
 *   timeZone?: string,
 *   now?: () => Date,
 *   alert?: (message: string) => void,
 *   print?: () => void,
 *   setTimeout?: (fn: Function, ms: number) => unknown,
 *   scrollToTop?: () => void,
 *   logger?: {log: Function, warn: Function, error: Function}
 * }} deps
 *   `supervisorDirectory` (opcional): directorio ya construido (`buildSupervisorDirectory`); si no se da, se deriva de
 *   `users` en la primera lectura. Mientras no exista, no se excluye a nadie de los rankings (ver supervisor-directory.js).
 *   `legacyExcludedNames`, `corregirBugs: false`, `fechaLocal: false`: comportamiento ORIGINAL de app.js, SOLO para las
 *   pruebas diferenciales (opciones explícitas).
 *   `timeZone` (opcional, IANA): zona para el día operativo local; por defecto la del navegador.
 */
export function createKpiController(deps) {
    if (Object.prototype.hasOwnProperty.call(deps, 'excludedNames')) {
        throw new TypeError('createKpiController: excludedNames (SUPERVISORES_NOMBRES) ya no se admite (decisión D9b): '
            + 'el directorio de supervisores se deriva de users; para pruebas diferenciales use legacyExcludedNames.');
    }
    const {
        getEl, querySelector, querySelectorAll = () => [], createElement, state, chartRegistry, ChartClass, datalabelsPlugin,
        fetchKpiData, database, getSelectedGestores, setSelectedGestores, setupMultiSelect, recalcularIndicadores,
        getUser = () => null, resolveTaskDisplayName = (key, entry) => (entry && entry.name) || key,
        isLegacyGenericTaskName = () => false,
        legacyExcludedNames, corregirBugs = true, fechaLocal = true, timeZone,
        now = () => new Date(), alert: notify = () => {}, print = () => {}, setTimeout: delay = (fn) => fn(), scrollToTop = () => {},
        logger = console
    } = deps;

    // ---------------------------------------------------------------- directorio de supervisores (D9b)
    let supervisorDirectory = assertSupervisorDirectory(deps.supervisorDirectory, 'createKpiController');
    /** Deriva el directorio de la lectura de `users` (no relee Firebase). */
    function rememberUsers(users) {
        if (users && !deps.supervisorDirectory) supervisorDirectory = buildSupervisorDirectory(users);
    }
    /** Opciones de exclusión de supervisores para los cálculos (decidido) o la lista fija (solo diferenciales). */
    function exclusionOptions() {
        return legacyExcludedNames ? { legacyExcludedNames } : { supervisorDirectory };
    }

    // ---------------------------------------------------------------- gráficas
    function destroyChart(id) {
        if (chartRegistry[id]) {
            chartRegistry[id].destroy();
            delete chartRegistry[id];
        }
    }

    /**
     * Igual que el original: primero se obtiene el contexto del canvas (puede lanzar si el elemento no existe) y
     * DESPUÉS se construye la configuración (que puede lanzar por datos incompletos).
     */
    function createChart(id, buildConfig) {
        const ctxEl = getEl(id).getContext('2d');
        chartRegistry[id] = new ChartClass(ctxEl, buildConfig());
    }

    function drawChart(id, type, labels, dataArr, labelStr, bgColor, borderColor, extraOptions = {}) {
        destroyChart(id);
        const ctxEl = getEl(id).getContext('2d');
        chartRegistry[id] = new ChartClass(ctxEl, buildBarChartConfig({ type, labels, dataArr, labelStr, bgColor, borderColor, extraOptions, datalabelsPlugin }));
    }

    function drawPunctualDatesChart(id, dates) {
        destroyChart(id);
        createChart(id, () => buildPunctualDatesChartConfig({ dates, datalabelsPlugin }));
    }

    function drawCombinedChart(id, labels, data) {
        destroyChart(id);
        createChart(id, () => buildCombinedChartConfig({ labels, data, datalabelsPlugin }));
    }

    function drawCombinedChartDaily(id, sortedDates, selectedGestor) {
        destroyChart(id);
        createChart(id, () => buildCombinedChartDailyConfig({ sortedDates, rawData: state.controlOperativoRawData, selectedGestor, datalabelsPlugin }));
    }

    function drawScatterMatriz(id, gestores, data, isGlobal = true) {
        destroyChart(id);
        createChart(id, () => buildScatterMatrizConfig({ gestores, data, isGlobal, datalabelsPlugin }));
    }

    /** Dibuja las gráficas del plan, en orden, con los mismos pasos que el original. */
    function executeChartPlan(plan) {
        plan.charts.forEach(job => {
            switch (job.kind) {
                case 'bar':
                    drawChart(job.id, job.type, job.labels, job.dataArr, job.labelStr, job.bgColor, job.borderColor, job.extraOptions);
                    break;
                case 'punctual':
                    drawPunctualDatesChart(job.id, job.dates);
                    break;
                case 'aprobacionesDia':
                    destroyChart(job.id);
                    createChart(job.id, () => buildAprobacionesDiaConfig({ sortedDates: job.sortedDates, dailyData: job.dailyData, datalabelsPlugin }));
                    break;
                case 'combined':
                    drawCombinedChart(job.id, job.labels, job.data);
                    break;
                case 'combinedDaily':
                    drawCombinedChartDaily(job.id, job.sortedDates, job.selectedGestor);
                    break;
                case 'scatter':
                    drawScatterMatriz(job.id, job.gestores, job.data, job.isGlobal);
                    break;
                default:
                    throw new Error('Tipo de gráfica desconocido: ' + job.kind);
            }
        });
    }

    const TITLE_ELEMENT_IDS = Object.freeze({
        peores: 'titleTardanzasPeores', mejores: 'titleTardanzasMejores', inactividad: 'titleInactividad',
        eficiencia: 'titleEficiencia', matriz: 'titleMatrizFuga'
    });

    function renderControlOperativoCharts(data, dailyData, selectedGestor) {
        const plan = buildControlOperativoChartPlan({
            data, dailyData, selectedGestor,
            selectedGestoresList: getSelectedGestores(MULTISELECT_ID),
            rawData: state.controlOperativoRawData
        });

        Object.keys(TITLE_ELEMENT_IDS).forEach(key => {
            const el = getEl(TITLE_ELEMENT_IDS[key]);
            if (el) el.innerHTML = plan.titles[key];
        });

        executeChartPlan(plan);
    }

    // ---------------------------------------------------------------- filtros y tabla
    function toggleOperativoCustomDates() {
        const val = getEl('filtroFechaOperativo').value;
        getEl('operativoCustomDateContainer').style.display = val === 'custom' ? 'flex' : 'none';
    }

    function renderControlOperativoFiltered() {
        if (!state.controlOperativoRawData) return;

        const selectedGestores = getSelectedGestores(MULTISELECT_ID);
        const selectedFecha = getEl('filtroFechaOperativo').value;
        const customStartEl = getEl('operativoDateStart');
        const customEndEl = getEl('operativoDateEnd');

        const { aggregatedData, aggregatedDataGlobal, dailyData } = aggregateOperativoData(state.controlOperativoRawData, {
            selectedGestores, selectedFecha,
            customStart: customStartEl ? customStartEl.value : undefined,
            customEnd: customEndEl ? customEndEl.value : undefined,
            now: now()
        });

        const tbody = querySelector('#tablaResumenOperativo tbody');
        tbody.innerHTML = '';

        const summary = summarizeOperativoRows(aggregatedData);

        for (const d of summary.rows) {
            const gestor = d.gestor;
            const tr = createElement('tr');
            tr.style.borderBottom = '1px solid rgba(0,0,0,0.05)';
            tr.style.transition = 'background 0.2s ease, transform 0.1s ease';
            tr.style.cursor = 'pointer';
            tr.title = 'Haz clic para filtrar o quitar filtro de este gestor';
            tr.onmouseover = () => tr.style.background = 'var(--bg-secondary, #f8f9fa)';
            tr.onmouseout = () => tr.style.background = 'transparent';

            tr.onclick = () => {
                const currentSelected = getSelectedGestores(MULTISELECT_ID);

                // Si el gestor ya está seleccionado de manera única, se deselecciona (filtro "Todos")
                if (currentSelected.length === 1 && currentSelected[0] === gestor) {
                    setSelectedGestores(MULTISELECT_ID, []);
                } else {
                    setSelectedGestores(MULTISELECT_ID, [gestor]);
                }

                renderControlOperativoFiltered();
                scrollToTop();
            };

            tr.innerHTML = buildOperativoRowHtml(d);
            tbody.appendChild(tr);
        }

        const wTotal = getEl('operativoWidgetTotal');
        const wAprob = getEl('operativoWidgetAprobados');
        const wRech = getEl('operativoWidgetRechazados');
        const wArt = getEl('operativoWidgetART');

        if (wTotal) wTotal.textContent = summary.globalProcesados;
        if (wAprob) wAprob.textContent = summary.globalAprobados;
        if (wRech) wRech.textContent = summary.globalRechazados;
        if (wArt) wArt.innerHTML = buildOperativoArtWidgetHtml(summary.avgArt);

        const globalForCharts = legacyExcludedNames
            ? selectGlobalForCharts(aggregatedDataGlobal, null, { legacyExcludedNames })
            : selectGlobalForCharts(aggregatedDataGlobal, supervisorDirectory);
        renderControlOperativoCharts(globalForCharts, dailyData, resolveSelectedGestorLabel(selectedGestores));

        // Refresca los anillos de KPIs cada vez que cambian los filtros
        if (recalcularIndicadores) recalcularIndicadores();
    }

    // ---------------------------------------------------------------- KPIs de turnos y retiros (calcularIndicadores)
    const PERIODO_TEXT = Object.freeze({
        hoy: 'Hoy', ayer: 'Ayer', semanal: 'Últimos 7 días', '30dias': 'Últimos 30 días', mes: 'Este Mes'
    });
    const RING_STYLE = Object.freeze({
        success: { stroke: 'var(--success)', badgeBg: 'rgba(16, 185, 129, 0.2)', badgeColor: 'var(--success)' },
        warning: { stroke: 'var(--warning)', badgeBg: 'rgba(245, 158, 11, 0.2)', badgeColor: 'var(--warning)' },
        danger: { stroke: 'var(--danger)', badgeBg: 'rgba(239, 68, 68, 0.2)', badgeColor: 'var(--danger)' }
    });

    function setText(id, value) {
        const el = getEl(id);
        if (el) el.textContent = value;
    }

    function isGestorRole() {
        const user = getUser();
        return Boolean(user) && user.role === 'Gestor';
    }

    /** Nombre visible de una tarea de un reporte de turno (mismas reglas que calcularIndicadores). */
    function resolveReportTaskName(taskId, task) {
        const displayName = task.name || '';
        if (taskId.startsWith('extra_') || displayName.includes('[EXTRA]')) return displayName;
        if (isLegacyGenericTaskName(displayName)) {
            return resolveTaskDisplayName(displayName.replace(/Tarea\s*/i, '').trim(), { name: displayName });
        }
        if (!taskId.startsWith('parsed_')) return resolveTaskDisplayName(taskId, task);
        return displayName;
    }

    /** Anillo SVG: deja el arco en 0, y tras 50 ms lo anima al porcentaje con su color y etiqueta. */
    function animateRing(ringId, textId, badgeId, percentage) {
        const ring = getEl(ringId);
        const textPercent = getEl(textId);
        const badge = getEl(badgeId);
        if (!ring || !textPercent || !badge) return;

        const config = resolveRingConfig(percentage);
        const style = RING_STYLE[config.level];

        ring.style.transition = 'none';
        ring.style.strokeDashoffset = KPI_RING_CIRCUMFERENCE;

        delay(() => {
            ring.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
            ring.style.strokeDashoffset = config.offset;
            textPercent.textContent = percentage + '%';
            ring.style.stroke = style.stroke;
            badge.style.background = style.badgeBg;
            badge.style.color = style.badgeColor;
            badge.textContent = config.badgeText;
        }, 50);
    }

    /** Lee el rango personalizado del DOM; null si falta alguna fecha. */
    function readCustomRange() {
        const startStr = getEl('operativoDateStart') ? getEl('operativoDateStart').value : '';
        const endStr = getEl('operativoDateEnd') ? getEl('operativoDateEnd').value : '';
        if (!startStr || !endStr) return null;
        return { startStr, endStr };
    }

    /** Parte "YYYY-MM-DD" a fecha local (medianoche), como el original. */
    function localDateMs(dateStr) {
        const parts = dateStr.split('-');
        return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
    }

    /**
     * KPIs de turnos y retiros del panel (app.js calcularIndicadores). Lee `shift_reports` y el JSON operativo de
     * retiros, calcula cada indicador con las funciones puras de `kpi-indicators-service.js` y escribe el DOM.
     */
    async function calcularIndicadores() {
        const selectedGestores = getSelectedGestores(MULTISELECT_ID);
        const fechaEl = getEl('filtroFechaOperativo');
        if (!fechaEl) return;

        let gestorName = 'todos';
        if (selectedGestores.length > 0) {
            gestorName = selectedGestores.length === 1 ? selectedGestores[0] : 'multiple';
        }

        const periodo = resolveKpiPeriodo(fechaEl.value);
        state.kpiTaskLists = { finalizadas: [], no_realizadas: [], pendientes: [] };
        state.kpiBitacoraHTML = '';

        const resultsContainer = getEl('kpiResultsContainer');
        if (resultsContainer) resultsContainer.style.display = 'none';
        if (!gestorName) return;

        let shiftReports = [];
        try {
            const data = await readShiftReports(database);
            if (data) shiftReports = shiftReports.concat(Object.values(data));
            if (selectedGestores.length > 0 && gestorName !== 'todos') {
                shiftReports = shiftReports.filter((report) => matchesShiftReportGestor(report.gestor, selectedGestores));
            }
        } catch (e) {
            logger.error('Error cargando shift reports para KPIs', e);
            return;
        }

        const nowMs = now().getTime();
        const range = periodo === 'custom' ? readCustomRange() : null;
        if (periodo === 'custom' && !range) return;
        const custom = range ? { startMs: localDateMs(range.startStr), endMs: localDateMs(range.endStr) + 86400000 } : null;

        shiftReports = filterShiftReportsByPeriodo(shiftReports, periodo, { nowMs, custom });
        if (shiftReports.length === 0) {
            logger.warn(`No hay reportes de turno para ${gestorName} en esta fecha/periodo.`);
        }

        // Tiempo efectivo (D1), tareas, bitácora e inactividad: una sola pasada lógica sobre los mismos reportes.
        const { totalMinutosConectados, turnosValidosParaTiempo } = computeShiftDurations(shiftReports);
        const taskCounts = computeKpiTaskCounts(shiftReports, { resolveDisplayName: resolveReportTaskName });
        state.kpiTaskLists = taskCounts.kpiTaskLists;
        state.kpiBitacoraHTML = shiftReports.map((report) => buildBitacoraCardHtml(report)).join('');

        const porcentajeActividades = computeActividadesPercentage(
            taskCounts.totalFinalizadas, taskCounts.totalNoRealizadas, taskCounts.totalPendientes
        );
        const inactivity = computeInactivityScore(shiftReports, { nowMs });

        // Retiros: penalidad por demora promedio (solo si hay retiros con tiempo).
        const cardRetiros = getEl('kpiRetirosPenalidadCard');
        const textPenalidad = getEl('kpiPenalidadRetiros');
        const textDemora = getEl('kpiDemoraPromedioText');
        const cardPagados = getEl('metric-approved-count');
        const cardPagadosTitle = getEl('metric-approved-title');
        const cardRechazados = getEl('kpiRetirosRechazados');

        state.isFilteredByGestor = gestorName !== 'todos';

        if (!state.controlOperativoRawData) {
            try {
                state.controlOperativoRawData = await fetchKpiData();
            } catch (e) {
                logger.error('Error al cargar datos de operativos', e);
            }
        }

        const raw = state.controlOperativoRawData;
        const targetDates = raw ? buildRetirosTargetDates(periodo, {
            nowMs, customStartStr: range ? range.startStr : null, customEndStr: range ? range.endStr : null
        }) : [];
        const finalStats = computeRetirosKpiStats(raw, {
            periodo,
            targetDates,
            selectedGestores: raw && selectedGestores.length > 0 ? resolveRawGestorKeys(selectedGestores, Object.keys(raw)) : []
        });

        if (cardPagados) {
            cardPagados.textContent = finalStats.totalAprobados;
            if (cardPagadosTitle) {
                cardPagadosTitle.textContent = state.isFilteredByGestor ? 'Retiros Aprobados (Filtrado)' : 'Retiros Aprobados (Global)';
            }
        }
        if (cardRechazados) cardRechazados.textContent = finalStats.totalRechazados;

        const penalty = computeRetirosKpiPenalty(finalStats);
        const gestorView = isGestorRole();
        if (penalty.hayDatos) {
            if (cardRetiros) cardRetiros.style.display = gestorView ? 'none' : 'flex';
            if (textPenalidad) textPenalidad.textContent = `-${penalty.penalidadRetiros}%`;
            if (textDemora) textDemora.textContent = `Promedio: ${Math.round(penalty.avgDemoraMins)} min / ${finalStats.retirosConTiempo} retiros`;
        } else if (cardRetiros) {
            cardRetiros.style.display = 'none';
        }
        if (gestorView) {
            querySelectorAll('.retiros-card').forEach((el) => { el.style.display = 'none'; });
            if (cardRetiros) cardRetiros.style.display = 'none';
        }

        setText('kpiTotalFinalizadas', taskCounts.totalFinalizadas);
        setText('kpiTotalNoRealizadas', taskCounts.totalNoRealizadas);
        setText('kpiTotalPendientes', taskCounts.totalPendientes);
        setText('kpiTurnosAnalizados', shiftReports.length);
        setText('kpiDuracionPromedio', computeAvgShiftDuration(totalMinutosConectados, turnosValidosParaTiempo).label);
        setText('kpiTiempoInactivo', formatInactividadLabel(inactivity.totalInactividadMins));

        // Bitácora integrada
        const gestorLabel = selectedGestores.length === 1
            ? selectedGestores[0]
            : (selectedGestores.length > 1 ? selectedGestores.join(', ') : 'Todos los Gestores');
        const titleBitacora = getEl('kpiBitacoraTitle');
        const cardBitacora = getEl('kpiBitacoraInlineCard');
        const listBitacora = getEl('kpiBitacoraInlineList');
        if (titleBitacora) titleBitacora.innerHTML = buildBitacoraTitleHtml(gestorLabel);
        if (cardBitacora && listBitacora) {
            if (state.kpiBitacoraHTML && state.kpiBitacoraHTML.trim() !== '') {
                listBitacora.innerHTML = state.kpiBitacoraHTML;
            } else {
                listBitacora.innerHTML = buildBitacoraEmptyHtml(gestorLabel, PERIODO_TEXT[periodo] || 'Periodo seleccionado');
            }
            cardBitacora.style.display = 'flex';
        }

        animateRing('kpiScoreRingActividades', 'kpiScoreTextActividades', 'kpiVerdictBadgeActividades', porcentajeActividades);
        animateRing('kpiScoreRingConectividad', 'kpiScoreTextConectividad', 'kpiVerdictBadgeConectividad', inactivity.porcentajeConectividad);
        animateRing('kpiScoreRingRetiros', 'kpiScoreTextRetiros', 'kpiVerdictBadgeRetiros', penalty.porcentajeRetiros);

        if (resultsContainer) resultsContainer.style.display = 'flex';
    }

    // ---------------------------------------------------------------- carga de datos
    function loadRetirosData() {
        return loadRetirosDataService({ fetchData: fetchKpiData, target: state, logger });
    }

    async function loadControlOperativoData() {
        try {
            const data = await fetchKpiData();
            state.controlOperativoRawData = data;

            // Fusiona inactividad/tardanza desde los shift_reports de Firebase
            try {
                if (database) {
                    const needsUsersMap = !state.kpiUsersData || Object.keys(state.kpiUsersData).length === 0;
                    // D9b: también se lee `users` si aún no hay directorio de supervisores (en modo original, no).
                    const needsDirectory = !legacyExcludedNames && !supervisorDirectory;
                    if (needsUsersMap || needsDirectory) {
                        const users = await readUsers(database);
                        rememberUsers(users);
                        if (users && needsUsersMap) {
                            state.kpiUsersData = buildKpiUsersMap(users);
                        }
                    }

                    const shifts = await readShiftReports(database);
                    if (shifts) {
                        mergeShiftReportsIntoOperativoData(state.controlOperativoRawData, shifts, { nowMs: now().getTime(), fechaLocal, timeZone });
                    }
                }
            } catch (fbErr) {
                logger.error('Error fetching shift_reports for inactivity:', fbErr);
            }

            const gestores = Object.keys(state.controlOperativoRawData).sort();
            setupMultiSelect(MULTISELECT_ID, gestores, () => {
                renderControlOperativoFiltered();
            });

            renderControlOperativoFiltered();
        } catch (error) {
            logger.error('Error loading Control Operativo:', error);
            notify('Error cargando datos operativos. Detalle: ' + error.message);
        }
    }

    function loadGestoresForKPIs() {
        const selectEl = getEl('kpiGestorSelect');
        if (!selectEl) return Promise.resolve();

        if (selectEl.options.length > 2) {
            // Ya cargado: no se sobrescribe ni se recalcula
            return Promise.resolve();
        }

        selectEl.innerHTML = '<option value="todos" selected>Todos los gestores</option><option value="">Selecciona un gestor...</option>';

        return readUsers(database).then(users => {
            if (users) {
                const { usersByEmail, gestorNames } = selectKpiGestores(users);
                rememberUsers(users);
                state.kpiUsersData = usersByEmail;

                gestorNames.forEach(name => {
                    const opt = createElement('option');
                    opt.value = name;
                    opt.textContent = name;
                    selectEl.appendChild(opt);
                });

                if (recalcularIndicadores) recalcularIndicadores();
            }
        }).catch(err => logger.error('Error populating KPI gestores dropdown:', err));
    }

    // ---------------------------------------------------------------- modal de detalle de tareas
    function openKpiTaskDetails(tipo) {
        const modal = getEl('kpiTaskDetailsModal');
        const title = getEl('kpiModalTitle');
        const icon = getEl('kpiModalIcon');
        const list = getEl('kpiModalTaskList');

        if (!state.kpiTaskLists) return;

        const tasks = state.kpiTaskLists[tipo] || [];

        const header = getKpiTaskDetailsHeader(tipo);
        if (header) {
            title.textContent = header.title;
            icon.className = header.iconClass;
            icon.style.color = header.iconColor;
        }

        list.innerHTML = buildKpiTaskListHtml(tasks);
        modal.classList.add('active');
    }

    function closeKpiTaskDetails() {
        getEl('kpiTaskDetailsModal').classList.remove('active');
    }

    // ---------------------------------------------------------------- análisis e informe
    function generarAnalisisTextual() {
        if (!state.controlOperativoRawData) {
            notify('Aún no se han cargado los datos. Por favor, espera un momento o haz clic en Actualizar Datos.');
            return;
        }

        const selectedGestores = getSelectedGestores(MULTISELECT_ID);
        const filtroGestor = resolveFiltroGestor(selectedGestores);
        const filtroFecha = getEl('filtroFechaOperativo').value;
        const isCustom = filtroFecha === 'custom';

        const analysis = computeAnalysisStats(state.controlOperativoRawData, {
            ...exclusionOptions(), selectedGestores, filtroFecha,
            dateStart: isCustom ? getEl('operativoDateStart').value : null,
            dateEnd: isCustom ? getEl('operativoDateEnd').value : null,
            now: now(), corregirBugs
        });

        // Primero se construye el HTML (con corregirBugs:false puede lanzar) y después se toca el DOM, como en el original
        const html = buildAnalysisHtml(analysis, filtroGestor, { corregirBugs });
        getEl('analysisModalBody').innerHTML = html;
        getEl('analysisModal').classList.add('active');
    }

    function generarReporteEjecutivoPDF() {
        const gestorText = buildReportGestorText(getSelectedGestores(MULTISELECT_ID));

        const periodoSelect = getEl('filtroFechaOperativo');
        const periodoText = buildReportPeriodoText({
            selectedOptionText: periodoSelect.options[periodoSelect.selectedIndex].text,
            value: periodoSelect.value,
            customStart: periodoSelect.value === 'custom' ? getEl('operativoDateStart').value : undefined,
            customEnd: periodoSelect.value === 'custom' ? getEl('operativoDateEnd').value : undefined
        });

        getEl('printReportMeta').innerText = buildReportMetaText({ generatedAtText: now().toLocaleString(), gestorText, periodoText });
        getEl('printAnalysisText').innerHTML = getEl('analysisModalBody').innerHTML;

        planReportCharts(chartRegistry, imgId => !!getEl(imgId)).forEach(item => {
            const chartObj = chartRegistry[item.chartKey];
            const imgEl = getEl(item.imgId);
            if (item.action === 'capture') {
                try {
                    imgEl.src = chartObj.toBase64Image();
                    imgEl.style.display = 'block';
                    if (imgEl.previousElementSibling) {
                        imgEl.previousElementSibling.innerText = item.title;
                        imgEl.previousElementSibling.style.display = 'block';
                    }
                    imgEl.parentElement.style.display = 'block';
                } catch (e) {
                    logger.error('Error capturando chart:', item.title, e);
                }
            } else if (item.action === 'hide') {
                imgEl.style.display = 'none';
                if (imgEl.previousElementSibling) imgEl.previousElementSibling.style.display = 'none';
                imgEl.parentElement.style.display = 'none';
            }
        });

        const printTableContainer = getEl('printTableContainer');
        if (printTableContainer) {
            const tableDiv = getEl('tablaResumenOperativo').parentElement;
            printTableContainer.innerHTML = buildReportTableHtml(tableDiv.outerHTML);
            printTableContainer.style.display = 'block';
        }

        delay(() => { print(); }, PRINT_DELAY_MS);
    }

    return {
        /** Directorio de supervisores vigente (D9b) o null si aún no se leyó `users`. */
        getSupervisorDirectory: () => supervisorDirectory,
        destroyChart, drawChart, drawPunctualDatesChart, drawCombinedChart, drawCombinedChartDaily, drawScatterMatriz,
        renderControlOperativoCharts, toggleOperativoCustomDates, renderControlOperativoFiltered,
        loadRetirosData, loadControlOperativoData, loadGestoresForKPIs,
        openKpiTaskDetails, closeKpiTaskDetails, generarAnalisisTextual, generarReporteEjecutivoPDF,
        calcularIndicadores
    };
}
