/**
 * Espacios de nombres del bundle para el corte "Tareas, persistencia y ciclo de aplicación" (paso 6).
 * Cada línea: export * as <nombre> from './ruta/modulo.js'; — solo módulos de ESTE corte.
 */
export * as clockFormat from './domain/tasks/clock-format.js';
export * as taskProgress from './domain/tasks/task-progress.js';
export * as taskSessionSync from './domain/tasks/task-session-sync.js';
export * as taskRecovery from './domain/tasks/task-recovery.js';
export * as taskSaveRules from './domain/tasks/task-save-rules.js';
export * as taskCatalog from './domain/tasks/task-catalog.js';
export * as taskSelection from './domain/tasks/task-selection.js';
export * as quickDocs from './domain/tasks/quick-docs.js';
export * as appInitRules from './domain/tasks/app-init-rules.js';
export * as scheduleSheet from './domain/tasks/schedule-sheet.js';
export * as teletrabajoSheet from './domain/tasks/teletrabajo-sheet.js';

// Decisión D1 (grupo turno-avance): fórmula única de tiempo efectivo (correo de cierre y panel de reportes).
// Se registra aquí porque entry.js no se edita; el cierre ya la usa por dentro de shiftCalculator.
export * as effectiveTime from './domain/shifts/effective-time.js';

export * as taskTreeView from './ui/views/task-tree-view.js';
export * as quickDocsView from './ui/views/quick-docs-view.js';
export * as permissionHistoryView from './ui/views/permission-history-view.js';
export * as treeToggle from './ui/components/tree-toggle.js';

export * as taskRepository from './services/firebase/firebase-task-repository.js';

export * as taskController from './controllers/task-controller.js';
export * as taskLoadersController from './controllers/task-loaders-controller.js';
