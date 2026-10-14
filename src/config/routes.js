/**
 * Rutas raíz de Firebase Realtime Database usadas por la aplicación.
 */
export const DB_ROOTS = Object.freeze({
    USERS: 'users',
    ACTIVE_SESSIONS: 'active_sessions',
    SHIFT_REPORTS: 'shift_reports',
    PERMISSIONS: 'permissions',
    ANNOUNCEMENTS: 'announcements',
    LOGIN_LOGS: 'login_logs',
    LOGIN_HISTORY: 'login_history',
    METRICS: 'metrics',
    LOGS: 'logs'
});

/**
 * Archivos de datos operativos servidos junto con el sitio.
 */
export const DATA_FILES = Object.freeze({
    SCHEDULE_WORKBOOK: 'Horario/Horario 2026.xlsx',
    TASK_CATALOG_WORKBOOK: 'Tareas Riesgo/Tareas de Riesgo.xlsx',
    TELEWORK_WORKBOOK: 'Teletrabajo/Teletrabajo.xlsx',
    CRONOGRAM_DIRECTORY: 'Cronograma de Tareas',
    KPI_HISTORY: 'kpi_operativos_v2.json',
    KPI_SEED: 'kpi_operativos_seed.json'
});

/**
 * Nombre del libro de cronograma de un mes (nombre de mes en español, capitalizado).
 *
 * @param {string} monthName
 * @returns {string}
 */
export const cronogramFileName = (monthName) => `Cronograma ${monthName}.xlsx`;

/**
 * Ruta de una sesión activa.
 *
 * @param {string} uid
 * @returns {string}
 */
export const activeSessionPath = (uid) => `${DB_ROOTS.ACTIVE_SESSIONS}/${uid}`;

/**
 * Ruta de un usuario.
 *
 * @param {string} uid
 * @returns {string}
 */
export const userPath = (uid) => `${DB_ROOTS.USERS}/${uid}`;
