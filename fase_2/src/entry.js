/**
 * Punto de entrada del bundle clásico (IIFE). esbuild lo compila a un único
 * script que expone el objeto global `RiskOps`, cargado ANTES de app.js con un
 * <script> normal (sin type="module") para conservar el orden de ejecución
 * síncrono actual. Cada módulo queda bajo su propio espacio de nombres para
 * evitar colisiones de nombres.
 */
export * as shiftController from './controllers/shift-controller.js';
export * as taskController from './controllers/task-controller.js';
export * as authService from './domain/auth/auth-service.js';
export * as appRouter from './app/app-router.js';

export * as announcementCapabilities from './domain/announcements/announcement-capabilities.js';
export * as shiftExpiration from './domain/auth/shift-expiration.js';
export * as timeMetrics from './domain/analytics/time-metrics.js';
export * as withdrawalMetrics from './domain/analytics/withdrawal-metrics.js';
export * as cronogramParser from './domain/schedules/cronogram-parser.js';
export * as scheduleService from './domain/schedules/schedule-service.js';
export * as activeSessionStatus from './domain/analytics/active-session-status.js';
export * as activeSessionPayload from './domain/shifts/active-session-payload.js';
export * as breakStateOwnership from './domain/shifts/break-state-ownership.js';
export * as breakTransitions from './domain/shifts/break-transitions.js';
export * as shiftCalculator from './domain/shifts/shift-calculator.js';
export * as shiftClosureRules from './domain/shifts/shift-closure-rules.js';
export * as shiftReportBuilder from './domain/shifts/shift-report-builder.js';
export * as splitShiftPolicy from './domain/shifts/split-shift-policy.js';
export * as timelineService from './domain/shifts/timeline-service.js';
export * as taskReconciler from './domain/tasks/task-reconciler.js';
export * as taskReport from './domain/tasks/task-report.js';
export * as taskService from './domain/tasks/task-service.js';
export * as taskSessionSync from './domain/tasks/task-session-sync.js';
export * as appInitRules from './domain/tasks/app-init-rules.js';

export * as docLinks from './config/doc-links.js';
export * as roles from './config/roles.js';
export * as routes from './config/routes.js';

export * as idleDetector from './services/browser/idle-detector-adapter.js';
export * as formSubmit from './services/external/formsubmit-notification-adapter.js';
export * as localSessionStorage from './services/storage/local-session-storage.js';

export * as breakButton from './ui/components/break-button.js';
export * as multiSelect from './ui/components/multi-select.js';

export * as constants from './utils/constants.js';
export * as dateTime from './utils/date-time.js';
export * as excel from './utils/excel.js';
export * as normalize from './utils/normalize.js';
export * as result from './utils/result.js';
export * as sanitization from './utils/sanitization.js';
export * as validation from './utils/validation.js';

// Cortes del paso 6 (cada uno en su archivo para no pisarse)
export * from './entry-tareas.js';
export * from './entry-modales-permisos.js';
export * from './entry-historial-navegacion.js';
export * from './entry-kpis.js';
export * from './entry-comunicados.js';
