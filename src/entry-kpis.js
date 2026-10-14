/**
 * Espacios de nombres del bundle para el corte "KPIs, analítica y gráficas" (paso 6).
 * Cada línea: export * as <nombre> from './ruta/modulo.js'; — solo módulos de ESTE corte.
 * Todos los nombres llevan el prefijo `kpi` u `operativo` para no chocar con otros cortes.
 */
export * as kpiMetrics from './domain/analytics/metrics-calculator.js';
export * as kpiService from './domain/analytics/kpi-service.js';
export * as kpiOperativoAnalysis from './domain/analytics/operativo-analysis.js';
export * as kpiExecutiveReport from './domain/analytics/executive-report.js';
export * as kpiOperativosSource from './services/external/kpi-operativos-source.js';
export * as kpiRepository from './services/firebase/firebase-kpi-repository.js';
export * as kpiTaskDetails from './ui/components/kpi-task-details.js';
export * as kpiAnalysisView from './ui/views/operativo-analysis-view.js';
export * as kpiOperativoTableView from './ui/views/operativo-table-view.js';
export * as kpiChartConfigs from './ui/charts/operativo-chart-configs.js';
export * as kpiChartPlan from './ui/charts/operativo-chart-plan.js';
export * as kpiController from './controllers/kpi-controller.js';
// Decisión D9b: directorio de supervisores por rol (users/{uid}/role), compartido por KPIs, Monitoreo e insignia.
export * as kpiSupervisorDirectory from './domain/schedules/supervisor-directory.js';
