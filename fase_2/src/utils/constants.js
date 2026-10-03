/**
 * Claves de localStorage usadas por la aplicación.
 */
export const STORAGE_KEYS = Object.freeze({
    CURRENT_USER: 'riskOps_currentUser',
    CACHE: 'riskOps_cache',
    BREAK_STATE: 'riskOps_breakState',
    TIMELINE: 'riskOps_timeline',
    THEME: 'riskOps_theme',
    USERS_DATA: 'riskOps_usersData'
});

/**
 * Estados de presencia del usuario.
 */
export const USER_STATUS = Object.freeze({
    ACTIVE: 'Activo',
    INACTIVE: 'Inactivo'
});

/**
 * Estados de una solicitud de permiso.
 */
export const PERMISSION_STATUS = Object.freeze({
    PENDING: 'Pendiente',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado'
});

/**
 * Estados de una tarea del turno.
 */
export const TASK_STATUS = Object.freeze({
    PENDING: 'Pendiente',
    IN_PROGRESS: 'En Proceso',
    DONE: 'Finalizada',
    NOT_DONE: 'No Realizada'
});

/**
 * Umbrales de inactividad.
 */
export const NATIVE_IDLE_THRESHOLD_MS = 3 * 60 * 1000;
export const SCREEN_LOCK_GRACE_PERIOD_MS = 10 * 1000;
export const DOM_IDLE_FALLBACK_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Límites de tiempo compartidos por los cálculos de turno.
 */
export const MINUTES_PER_DAY = 24 * 60;
export const MAX_TARDINESS_MINUTES = 12 * 60;

/**
 * Tipos de evento de la bitácora de turno (shiftTimeline).
 */
export const TIMELINE_EVENT = Object.freeze({
    INACTIVITY: 'Inactividad',
    LUNCH: 'Almuerzo',
    BREAKFAST: 'Desayuno',
    SHIFT_BREAK: 'Pausa de Turno'
});

/**
 * Límites de pausas, inactividad y duración de turno.
 */
export const ALLOWED_LUNCH_MINUTES = 60;
export const ALLOWED_BREAKFAST_MINUTES = 15;
export const MIN_INACTIVITY_EVENT_MS = 30 * 1000;
export const TIMELINE_MERGE_GAP_MS = 60 * 1000;
export const MAX_SHIFT_DURATION_MS = 10 * 60 * 60 * 1000;
export const MAX_INACTIVITY_MINUTES_PER_SHIFT = 480;
export const EXPECTED_SHIFT_MINUTES = 405;
export const OUT_OF_SCHEDULE_MINUTES = 240;
export const MIN_REPORTED_TARDINESS_MINUTES = 5;

/**
 * Prefijo de la llave de una tarea extra dentro de las tareas de sesión.
 */
export const EXTRA_TASK_KEY_PREFIX = 'extra_';
