/**
 * Paso de integración SOLO-LABORATORIO del corte "Comunicados, configuración e incidencias".
 *
 * Sustituye, en la copia de staging de app.js (nunca en el original), los cuerpos de 26 funciones globales por
 * delegaciones a `RiskOps.*` (bundle de `fase_2/src`), conservando nombre, firma y orden de llamada (los `onclick`
 * del HTML generado y `window.<función> = ...` siguen resolviendo a ellas). Cada controlador recibe de app.js SUS
 * propios `escapeHTML`, `encodeInlineHandlerArg` y `sanitizeAnnouncementHTML` (el sanitizador de app.js usa el DOM),
 * así que el HTML producido es el mismo byte a byte. Todo lleva la marca `[LAB-INTEGRACION]`.
 *
 * Pasos (anclas únicas; no se solapan con las del controlador de turno ni con las de otros cortes):
 *  1. Comunicados (8 funciones): initComunicadosListener ... markUrgentComunicadoAsRead      -> RiskOps.announcementsController
 *  2. Configuración de gestores: renderConfigGestores, toggleGestorSplitShift               -> RiskOps.configGestoresController
 *  3. Comunicados (admin): renderAdminComunicados, viewComunicadoContent, viewComunicadoLecturas,
 *     deleteComunicado y el manejador de #confirmDeleteBtn                                   -> RiskOps.announcementsController
 *  4. updateActiveSupervisorBadge                                                            -> RiskOps.supervisorBadgeController
 *  5. openLoginHistoryModal, renderLoginHistoryTable, filterLoginHistoryTable                -> RiskOps.loginHistoryController
 *  6. setupUserPresence, startMonitoringPresence, incrementApprovedWithdrawal, initAtomicApprovedCounterListener,
 *     updateApprovedCountUI, handleNewIncidentSubmit, startIncidentsRealtimeListener, renderIncidentsTable
 *                                                                                            -> RiskOps.presenceService / approvedCounterService / approvedCountView / incidentsController
 *
 * Las 26 funciones quedan conectadas. Decisiones del responsable (plan maestro §4 ter) que el laboratorio USA porque
 * son el predeterminado de los módulos (este paso no pasa ninguna opción que las apague):
 *  - D2: `escapeUserFields` (configuración de gestores) y `escapeRawLoginTime` (historial de accesos) encendidas.
 *  - D4: `skipIfAlreadyRead` y `keepUrgentModalOpenOnFailure` encendidas (sin bucle del modal urgente).
 *  - D9(c): el modal urgente bloqueante aplica a Admin, Supervisor y Gestor (igual que app.js; ahora explícito).
 *  - D6: presencia y contador atómico INACTIVOS: `setupUserPresence`, `startMonitoringPresence`,
 *    `incrementApprovedWithdrawal` e `initAtomicApprovedCounterListener` siguen declaradas (window.* y el
 *    `DOMContentLoaded` de app.js las resuelven) pero los servicios se crean con su predeterminado `enabled: false`
 *    y son no-op: no abren `.info/connected`, `active_sessions`, `metrics/approvedCount` ni transacciones. Para
 *    reactivarlas hay que pasar `enabled: true` aquí, y antes cumplir lo descrito en el JSDoc de
 *    `presence-service.js` / `approved-counter-service.js` (reglas `metrics`, diseño).
 * Siguen apagadas (no son parte de una decisión): `tolerateInvalidDates`.
 */

const MARK = '[LAB-INTEGRACION]';

const APP_HELPERS = '{ escapeHTML, encodeInlineHandlerArg, sanitizeAnnouncementHTML }';

const COMUNICADOS_A = `// [LAB-INTEGRACION:COMUNICADOS-INICIO]
// ${MARK} Comunicados: RiskOps.announcementsController (src/controllers/announcements-controller.js)
let __labAnnouncementsController = null;
function __labAnnouncements() {
    if (__labAnnouncementsController) return __labAnnouncementsController;
    __labAnnouncementsController = RiskOps.announcementsController.createAnnouncementsController({
        repository: RiskOps.announcementRepository.createAnnouncementRepository({ database }),
        document,
        getUser: () => currentUser,
        getAuthUser: () => firebase.auth().currentUser,
        getAnnouncements: () => globalComunicados,
        setAnnouncements: (map) => { globalComunicados = map; },
        now: () => Date.now(),
        alert: (m) => alert(m),
        closeModal: (id) => closeModal(id),
        setTimeout: (fn, ms) => setTimeout(fn, ms),
        logger: console,
        helpers: ${APP_HELPERS}
    });
    return __labAnnouncementsController;
}

function initComunicadosListener() { __labAnnouncements().initListener(); } // ${MARK}

function openNewComunicadoModal() { __labAnnouncements().openNewModal(); } // ${MARK}

async function saveNewComunicado() { return __labAnnouncements().save(); } // ${MARK}

function updateUnreadBadge() { __labAnnouncements().updateUnreadBadge(); } // ${MARK}

function renderGestorComunicados() { __labAnnouncements().renderGestor(); } // ${MARK}

async function markComunicadoAsRead(id) { await __labAnnouncements().markAsRead(id); } // ${MARK}

function checkUnreadUrgentAnnouncements() { __labAnnouncements().checkUnreadUrgent(); } // ${MARK}

async function markUrgentComunicadoAsRead(id) { return __labAnnouncements().markUrgentAsRead(id); } // ${MARK}
// [LAB-INTEGRACION:COMUNICADOS-FIN]

`;

const CONFIG_GESTORES = `// [LAB-INTEGRACION:CONFIG-GESTORES-INICIO]
// === CONFIGURACIÓN DE GESTORES === ${MARK} RiskOps.configGestoresController (src/controllers/config-gestores-controller.js)
let __labConfigGestoresController = null;
function __labConfigGestores() {
    if (__labConfigGestoresController) return __labConfigGestoresController;
    __labConfigGestoresController = RiskOps.configGestoresController.createConfigGestoresController({
        repository: RiskOps.configRepository.createConfigRepository({ database }),
        document,
        confirm: (m) => confirm(m),
        alert: (m) => alert(m),
        logger: console
    });
    return __labConfigGestoresController;
}

function renderConfigGestores() { __labConfigGestores().render(); } // ${MARK}

function toggleGestorSplitShift(uid, isChecked) { __labConfigGestores().toggle(uid, isChecked); } // ${MARK}
// [LAB-INTEGRACION:CONFIG-GESTORES-FIN]

`;

const COMUNICADOS_B = `// [LAB-INTEGRACION:COMUNICADOS-ADMIN-INICIO]
function renderAdminComunicados() { __labAnnouncements().renderAdmin(); } // ${MARK}

function viewComunicadoContent(id) { __labAnnouncements().viewContent(id); } // ${MARK}

async function viewComunicadoLecturas(id) { return __labAnnouncements().viewLecturas(id); } // ${MARK}

function deleteComunicado(id) { __labAnnouncements().requestDelete(id); } // ${MARK}

document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => __labAnnouncements().confirmDelete()); // ${MARK}
// [LAB-INTEGRACION:COMUNICADOS-ADMIN-FIN]

`;

const SUPERVISOR_BADGE = `// [LAB-INTEGRACION:SUPERVISOR-BADGE-INICIO]
let __labSupervisorBadgeController = null;
function updateActiveSupervisorBadge() { // ${MARK} RiskOps.supervisorBadgeController
    if (!__labSupervisorBadgeController) {
        __labSupervisorBadgeController = RiskOps.supervisorBadgeController.createSupervisorBadgeController({
            document,
            getScheduleRows: () => (typeof globalScheduleRows === 'undefined' ? null : globalScheduleRows),
            getScheduleBlocks: () => globalScheduleBlocks,
            getShiftForDate: (rows, blocks, name, date) => (typeof getShiftForDate === 'function' ? getShiftForDate(rows, blocks, name, date) : null)
        });
    }
    __labSupervisorBadgeController.update();
}
// [LAB-INTEGRACION:SUPERVISOR-BADGE-FIN]

`;

const LOGIN_HISTORY = `// [LAB-INTEGRACION:LOGIN-HISTORY-INICIO]
// ${MARK} Historial de accesos: RiskOps.loginHistoryController (src/controllers/login-history-controller.js)
let __labLoginHistoryController = null;
function __labLoginHistory() {
    if (__labLoginHistoryController) return __labLoginHistoryController;
    __labLoginHistoryController = RiskOps.loginHistoryController.createLoginHistoryController({
        repository: RiskOps.loginHistoryRepository.createLoginHistoryRepository({ database }),
        document,
        now: () => Date.now(),
        logger: console,
        helpers: { escapeHTML }
    });
    return __labLoginHistoryController;
}

async function openLoginHistoryModal() { return __labLoginHistory().open(); } // ${MARK}

function renderLoginHistoryTable(records) { __labLoginHistory().render(records); } // ${MARK}

function filterLoginHistoryTable() { __labLoginHistory().filter(); } // ${MARK}
// [LAB-INTEGRACION:LOGIN-HISTORY-FIN]

`;

const PRESENCE_COUNTER_INCIDENTS = `// [LAB-INTEGRACION:PRESENCIA-CONTADOR-INCIDENTES-INICIO]
// ${MARK} Presencia, contador atómico y novedades: RiskOps.presenceService / approvedCounterService / approvedCountView / incidentsController
// ${MARK} D6: presencia y contador INACTIVOS (predeterminado enabled: false de los servicios): las llamadas son no-op y no
// abren conexiones ni consumen cuota de Realtime Database. NO pasar enabled: true sin reglas "metrics" y rediseño.
function __labPresence() {
    return RiskOps.presenceService.createPresenceService({
        database,
        serverTimestamp: firebase.database.ServerValue.TIMESTAMP,
        onSessionsChanged: () => {
            if (typeof renderActiveSessionsDashboard === 'function') {
                renderActiveSessionsDashboard();
            }
        }
    });
}

function setupUserPresence(uid) {
    if (!uid || typeof database === 'undefined') return;
    __labPresence().setupUserPresence(uid); // ${MARK}
}

function startMonitoringPresence() {
    if (typeof database === 'undefined') return;
    __labPresence().startMonitoringPresence(); // ${MARK}
}

function __labApprovedCounter() {
    return RiskOps.approvedCounterService.createApprovedCounterService({ database, onCount: (count) => updateApprovedCountUI(count) });
}

function incrementApprovedWithdrawal(uid, amount = 1) {
    if (typeof database === 'undefined') return;
    __labApprovedCounter().incrementApprovedWithdrawal(uid, amount); // ${MARK}
}

function initAtomicApprovedCounterListener() {
    if (typeof database === 'undefined') return;
    __labApprovedCounter().initAtomicApprovedCounterListener(); // ${MARK}
}

function updateApprovedCountUI(count) {
    RiskOps.approvedCountView.renderApprovedCount({ // ${MARK}
        count,
        isFiltered: window.isFilteredByGestor,
        element: window.isFilteredByGestor ? null : document.getElementById('metric-approved-count'),
        schedule: (fn, ms) => setTimeout(fn, ms)
    });
}

let __labIncidentsController = null;
function __labIncidents() {
    if (__labIncidentsController) return __labIncidentsController;
    __labIncidentsController = RiskOps.incidentsController.createIncidentsController({
        repository: RiskOps.incidentRepository.createIncidentRepository({ database }),
        document,
        getUser: () => currentUser,
        getAuthUser: () => firebase.auth().currentUser,
        now: () => Date.now(),
        alert: (m) => alert(m),
        logger: console,
        helpers: { escapeHTML }
    });
    return __labIncidentsController;
}

async function handleNewIncidentSubmit(event) { return __labIncidents().handleSubmit(event); } // ${MARK}

function startIncidentsRealtimeListener() {
    if (typeof database === 'undefined') return;
    __labIncidents().startListener(); // ${MARK}
}

function renderIncidentsTable(incidents) { __labIncidents().renderTable(incidents); } // ${MARK}
// [LAB-INTEGRACION:PRESENCIA-CONTADOR-INCIDENTES-FIN]

`;

export const STEPS = [
    {
        name: 'comunicados: comunicados del gestor (listener, modal, publicar, insignia, lista, leer, urgentes) delegan en RiskOps.announcementsController',
        start: 'function initComunicadosListener() {',
        end: '// === CONFIGURACIÓN DE GESTORES ===',
        endInclusive: false,
        replace: () => COMUNICADOS_A
    },
    {
        name: 'comunicados: configuración de gestores (renderConfigGestores, toggleGestorSplitShift) delega en RiskOps.configGestoresController',
        start: '// === CONFIGURACIÓN DE GESTORES ===',
        end: 'function renderAdminComunicados() {',
        endInclusive: false,
        replace: () => CONFIG_GESTORES
    },
    {
        name: 'comunicados: vista de administrador (tabla, contenido, lecturas, eliminar) delega en RiskOps.announcementsController',
        start: 'function renderAdminComunicados() {',
        end: '// ==========================================\n// CONTROL OPERATIVO Y EFICIENCIA EN RETIROS',
        endInclusive: false,
        replace: () => COMUNICADOS_B
    },
    {
        name: 'comunicados: updateActiveSupervisorBadge delega en RiskOps.supervisorBadgeController',
        start: 'function updateActiveSupervisorBadge() {',
        end: 'setInterval(updateActiveSupervisorBadge, 60000);',
        endInclusive: false,
        replace: () => SUPERVISOR_BADGE
    },
    {
        name: 'comunicados: historial de accesos (abrir, tabla, filtro) delega en RiskOps.loginHistoryController',
        start: 'let allLoginHistoryRecords = [];',
        end: 'window.openLoginHistoryModal = openLoginHistoryModal;',
        endInclusive: false,
        replace: () => LOGIN_HISTORY
    },
    {
        name: 'comunicados: presencia, contador atómico y novedades delegan en RiskOps (presenceService, approvedCounterService, incidentsController)',
        start: 'function setupUserPresence(uid) {',
        end: '/**\n * 5. Filtro por Responsable Asignado (#filter-assignee)',
        endInclusive: false,
        replace: () => PRESENCE_COUNTER_INCIDENTS
    }
];
