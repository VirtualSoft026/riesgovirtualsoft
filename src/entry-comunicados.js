/**
 * Espacios de nombres del bundle para el corte "Comunicados, configuración e incidencias" (paso 6).
 * Cada línea: export * as <nombre> from './ruta/modulo.js'; — solo módulos de ESTE corte.
 */
export * as announcementService from './domain/announcements/announcement-service.js';
export * as announcementRepository from './services/firebase/firebase-announcement-repository.js';
export * as announcementsController from './controllers/announcements-controller.js';

export * as incidentService from './domain/incidents/incident-service.js';
export * as incidentRepository from './services/firebase/firebase-incident-repository.js';
export * as incidentsView from './ui/views/incidents-view.js';
export * as incidentsController from './controllers/incidents-controller.js';

export * as gestorConfig from './domain/users/gestor-config.js';
export * as configRepository from './services/firebase/firebase-config-repository.js';
export * as configGestoresController from './controllers/config-gestores-controller.js';

export * as loginHistory from './domain/auth/login-history.js';
export * as loginHistoryRepository from './services/firebase/firebase-login-history-repository.js';
export * as loginHistoryController from './controllers/login-history-controller.js';

export * as presenceService from './services/firebase/presence-service.js';
export * as approvedCounter from './domain/analytics/approved-counter.js';
export * as approvedCounterService from './services/firebase/approved-counter-service.js';
export * as approvedCountView from './ui/views/approved-count-view.js';

export * as activeSupervisors from './domain/schedules/active-supervisors.js';
export * as supervisorBadgeController from './controllers/supervisor-badge-controller.js';
