/**
 * Espacios de nombres del bundle para el corte "Historial, perfil, navegación y monitoreo" (paso 6).
 * Cada línea: export * as <nombre> from './ruta/modulo.js'; — solo módulos de ESTE corte.
 */

// Reglas puras
export * as authService from './domain/auth/auth-service.js';
export * as notificationRules from './domain/auth/notification-rules.js';
export * as shiftReportView from './domain/shifts/shift-report-view.js';
export * as monitoringView from './domain/analytics/monitoring-view.js';

// Acceso a Firebase (base inyectada)
export * as notificationsRepository from './services/firebase/firebase-notifications-repository.js';
export * as shiftReportsRepository from './services/firebase/firebase-shift-reports-repository.js';
export * as monitoringRepository from './services/firebase/firebase-monitoring-repository.js';

// HTML
export * as shiftReportsHtml from './ui/views/shift-reports-view.js';

// Controladores y enrutador (DOM inyectado)
export * as appRouter from './app/app-router.js';
export * as monitoringController from './controllers/monitoring-controller.js';
export * as shiftReportsController from './controllers/shift-reports-controller.js';
export * as profileController from './controllers/profile-controller.js';
export * as notificationsController from './controllers/notifications-controller.js';
