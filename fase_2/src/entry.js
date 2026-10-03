/**
 * Punto de entrada del bundle clásico (IIFE). esbuild lo compila a un único
 * script que expone el objeto global `RiskOps`, cargado ANTES de app.js con un
 * <script> normal (sin type="module") para conservar el orden de ejecución
 * síncrono actual. Cada módulo queda bajo su propio espacio de nombres para
 * evitar colisiones de nombres.
 */
export * as announcementCapabilities from './domain/announcements/announcement-capabilities.js';
export * as shiftExpiration from './domain/auth/shift-expiration.js';
export * as timeMetrics from './domain/analytics/time-metrics.js';
export * as withdrawalMetrics from './domain/analytics/withdrawal-metrics.js';
export * as cronogramParser from './domain/schedules/cronogram-parser.js';
export * as scheduleService from './domain/schedules/schedule-service.js';
export * as shiftCalculator from './domain/shifts/shift-calculator.js';
export * as timelineService from './domain/shifts/timeline-service.js';
export * as taskReconciler from './domain/tasks/task-reconciler.js';
export * as taskReport from './domain/tasks/task-report.js';
export * as taskService from './domain/tasks/task-service.js';

export * as docLinks from './config/doc-links.js';
export * as roles from './config/roles.js';
export * as routes from './config/routes.js';

export * as idleDetector from './services/browser/idle-detector-adapter.js';
export * as formSubmit from './services/external/formsubmit-notification-adapter.js';
export * as localSessionStorage from './services/storage/local-session-storage.js';

export * as multiSelect from './ui/components/multi-select.js';

export * as constants from './utils/constants.js';
export * as dateTime from './utils/date-time.js';
export * as excel from './utils/excel.js';
export * as normalize from './utils/normalize.js';
export * as result from './utils/result.js';
export * as sanitization from './utils/sanitization.js';
export * as validation from './utils/validation.js';
