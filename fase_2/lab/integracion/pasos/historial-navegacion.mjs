/**
 * Paso de integración SOLO-LABORATORIO del corte "Historial, perfil, navegación y monitoreo".
 *
 * Sustituye, en la copia de staging de app.js, fragmentos por llamadas a `RiskOps.*` (bundle cargado antes):
 *
 *  A. Bloque contiguo `// Exportar Reporte a PDF` ... antes de `// --- PROGRAMMATIC SIDEBAR ORDER ...` (app.js 4450-4971):
 *     exportShiftReport, renderShiftReports, applyShiftReportsFilters, openShiftDetailModal, toggleNotifications,
 *     markAllAsRead, openProfileModal, toggleProfilePassword y changePassword pasan a funciones globales del MISMO nombre
 *     que delegan en RiskOps.shiftReportsController / profileController / notificationsController. También se retira
 *     el global `allShiftReports` (vive dentro del controlador; solo se usaba en ese bloque).
 *  B. `alignAdministrativeControlsByRole()` completo -> RiskOps.appRouter.
 *  C. `setupSidebar()`: SOLO el ordenamiento por rol (rama Admin/Supervisor y la parte de orden de la rama Gestor) ->
 *     RiskOps.appRouter.applyRoleNavigation (política pura en domain/auth/auth-service.js).
 *  D. `setupSidebar()`: visibilidad de los botones de Almuerzo y Desayuno del Gestor -> appRouter.applyBreakButtonsVisibility.
 *     (C y D NO tocan el bloque del botón de Pausa de Turno, que es de aplicar-integracion.mjs.)
 *  E. `startActiveSessionsListener()` -> RiskOps.monitoringController.
 *  F/G. `renderActiveSessionsDashboard()` y `viewTimelineInMonitoreo()`: DELEGACIÓN CON RESPALDO. Se inserta al inicio
 *     `if (typeof RiskOps !== 'undefined' && typeof __histNav === 'function') return ...` y el cuerpo original queda como
 *     respaldo: las suites existentes (split-shift-flag, monitoreo-render, parche-pausa-turno) extraen el TEXTO de estas
 *     funciones y lo ejecutan en un `vm` sin el bundle; con el bundle cargado (laboratorio) siempre se usa el controlador.
 *  H. `openMonitoreoDetails()` y `populateGestoresDropdown()` -> RiskOps.monitoringController.
 *
 * NO conectado (extraído, no conectado): `updateNavigation()` (7 líneas; su primera sentencia es el ancla del controlador de
 * turno, `toggleSplitShiftBtn`) y la fusión Horario/Teletrabajo de `setupSidebar()` (DOM propio de la página).
 *
 * Las anclas son únicas y no se solapan con las de aplicar-integracion.mjs ni con las de los otros pasos (verificado con
 * `node /tmp/riskops-integrate.mjs`). Todo lo agregado lleva la marca [LAB-INTEGRACION]; el bloque auxiliar va entre
 * [LAB-INTEGRACION:HISTORIAL-NAVEGACION:INICIO/FIN].
 *
 * Paridad demostrada en `src/tests/e2e/historial-navegacion-integrado.e2e.cjs` (funciones REALES del app.js original
 * frente a las del integrado, en un `vm`, con el bundle real).
 */

export const MARK = '[LAB-INTEGRACION]';
export const BLOCK_START = '// [LAB-INTEGRACION:HISTORIAL-NAVEGACION:INICIO]';
export const BLOCK_END = '// [LAB-INTEGRACION:HISTORIAL-NAVEGACION:FIN]';

const REPLACEMENT_A = `${BLOCK_START}
// ${MARK} Historial de turnos, notificaciones y perfil: delegan en RiskOps (src/controllers/*).
// Mismos nombres y firmas que las funciones originales (los onclick de index.html y del HTML generado siguen funcionando).
let __labHistNav = null;
function __histNav() {
    if (__labHistNav) return __labHistNav;
    __labHistNav = {
        shiftReports: RiskOps.shiftReportsController.createShiftReportsController({
            document,
            repository: RiskOps.shiftReportsRepository.createShiftReportsRepository({ database }),
            setupCustomMultiSelect: (id, options, cb) => setupCustomMultiSelect(id, options, cb),
            getSelectedMultiSelectValues: (id) => getSelectedMultiSelectValues(id),
            summarizeTasks: (report) => buildTaskReportSummaryText(report),
            getPdfWorker: () => (window.html2pdf ? window.html2pdf() : null),
            alert: (message) => alert(message),
            now: () => Date.now(),
            setTimeout: (fn, ms) => setTimeout(fn, ms),
            logger: console
        }),
        monitoring: RiskOps.monitoringController.createMonitoringController({
            document,
            repository: RiskOps.monitoringRepository.createMonitoringRepository({ database }),
            getSessions: () => allActiveSessions,
            setSessions: (sessions) => { allActiveSessions = sessions; },
            hasCronograma: () => typeof globalCronogramaData !== 'undefined' && !!globalCronogramaData,
            getAssignedTasksForGestor: (name, shift) => getAssignedTasksForGestor(name, shift),
            reconcileTask: (taskName, tasks) => reconcileScheduledTaskWithSession(taskName, tasks),
            resolveTaskName: (key, entry) => resolveTaskDisplayName(key, entry),
            getShiftCategory: (shift) => getShiftCategory(shift),
            // ${MARK} D9b: sin SUPERVISORES_NOMBRES; el controlador deriva los supervisores del ROL en users (consulta por rol
            // con el repositorio de arriba; Monitoreo solo lo abre Supervisor/Admin, que puede leer users) y excluye por UID.
            avatars: availableAvatars,
            now: () => Date.now(),
            logger: console
        }),
        profile: RiskOps.profileController.createProfileController({
            document,
            getUser: () => currentUser,
            getAuthUser: () => firebase.auth().currentUser,
            closeModal: (id) => closeModal(id),
            setTimeout: (fn, ms) => setTimeout(fn, ms),
            logger: console
        }),
        notifications: RiskOps.notificationsController.createNotificationsController({
            document,
            getUser: () => currentUser,
            repository: RiskOps.notificationsRepository.createNotificationsRepository({
                database,
                getAuthUid: () => (firebase.auth().currentUser && firebase.auth().currentUser.uid)
            }),
            logger: console
        })
    };
    return __labHistNav;
}

window.exportShiftReport = async function(fb_id) { return __histNav().shiftReports.exportShiftReport(fb_id); };
async function renderShiftReports() { return __histNav().shiftReports.renderShiftReports(); }
function applyShiftReportsFilters() { return __histNav().shiftReports.applyShiftReportsFilters(); }
window.openShiftDetailModal = function(fb_id) { return __histNav().shiftReports.openShiftDetailModal(fb_id); };
function toggleNotifications() { return __histNav().notifications.toggleNotifications(); }
async function markAllAsRead() { return __histNav().notifications.markAllAsRead(); }
function openProfileModal() { return __histNav().profile.openProfileModal(); }
function toggleProfilePassword(iconElement) { return __histNav().profile.toggleProfilePassword(iconElement); }
async function changePassword() { return __histNav().profile.changePassword(); }
${BLOCK_END}

`;

const REPLACEMENT_B = `function alignAdministrativeControlsByRole() {
    // ${MARK} política en RiskOps.authService; aplicación al DOM en RiskOps.appRouter
    return RiskOps.appRouter.createAppRouter({ document, getUser: () => currentUser }).alignAdministrativeControlsByRole();
}

`;

const REPLACEMENT_C = `    // ${MARK} orden de pestañas por rol desde RiskOps.appRouter (política pura: RiskOps.authService.buildSidebarPolicy)
    const __navResult = RiskOps.appRouter.createAppRouter({ document, getUser: () => currentUser }).applyRoleNavigation(sidebarNav);
    if (!__navResult.privileged) {
`;

const REPLACEMENT_D = `        // ${MARK} botones de Almuerzo y Desayuno del Gestor desde RiskOps.appRouter
        RiskOps.appRouter.createAppRouter({ document, getUser: () => currentUser }).applyBreakButtonsVisibility();

`;

const REPLACEMENT_E = `function startActiveSessionsListener() {
    // ${MARK} escucha de active_sessions en RiskOps.monitoringController
    return __histNav().monitoring.startActiveSessionsListener();
}

`;

const REPLACEMENT_H = `window.openMonitoreoDetails = function(uid) { return __histNav().monitoring.openMonitoreoDetails(uid); }; // ${MARK}

function populateGestoresDropdown() { return __histNav().monitoring.populateGestoresDropdown(); } // ${MARK}

`;

export const STEPS = [
    {
        name: 'historial-navegacion: historial de turnos, notificaciones y perfil delegan en RiskOps (controladores)',
        start: '// Exportar Reporte a PDF\nwindow.exportShiftReport = async function(fb_id) {',
        end: '// --- PROGRAMMATIC SIDEBAR ORDER & MONITOREO REALTIME ---',
        endInclusive: false,
        replace: () => REPLACEMENT_A
    },
    {
        name: 'historial-navegacion: alignAdministrativeControlsByRole delega en RiskOps.appRouter',
        start: 'function alignAdministrativeControlsByRole() {',
        end: 'function setupSidebar() {',
        endInclusive: false,
        replace: () => REPLACEMENT_B
    },
    {
        name: 'historial-navegacion: setupSidebar (parcial) - orden de pestañas por rol',
        start: "    if (currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Supervisor')) {\n        // Admin/Supervisor Order",
        end: "        // Hide Admin tabs for Gestor\n        if (adminNavGroup) adminNavGroup.style.display = 'none';\n",
        endInclusive: true,
        replace: () => REPLACEMENT_C
    },
    {
        name: 'historial-navegacion: setupSidebar (parcial) - botones de Almuerzo y Desayuno del Gestor',
        start: '        // --- LUNCH BUTTON VISIBILITY ---\n',
        end: "        const toggleSplitShiftBtn = document.getElementById('toggleSplitShiftBtn');\n",
        endInclusive: false,
        replace: () => REPLACEMENT_D
    },
    {
        name: 'historial-navegacion: startActiveSessionsListener delega en RiskOps.monitoringController',
        start: 'function startActiveSessionsListener() {',
        end: 'function calculateShiftDelay(session) {',
        endInclusive: false,
        replace: () => REPLACEMENT_E
    },
    {
        name: 'historial-navegacion: renderActiveSessionsDashboard (delegación con respaldo)',
        exact: "function renderActiveSessionsDashboard() {\n    const grid = document.getElementById('monitoreoGrid');",
        replace: () => `function renderActiveSessionsDashboard() {
    // ${MARK} con el bundle cargado se usa RiskOps.monitoringController; el cuerpo original queda de respaldo
    if (typeof RiskOps !== 'undefined' && typeof __histNav === 'function') return __histNav().monitoring.renderActiveSessionsDashboard();
    const grid = document.getElementById('monitoreoGrid');`
    },
    {
        name: 'historial-navegacion: viewTimelineInMonitoreo (delegación con respaldo)',
        exact: 'function viewTimelineInMonitoreo(uid) {\n    const session = allActiveSessions[uid];',
        replace: () => `function viewTimelineInMonitoreo(uid) {
    // ${MARK} con el bundle cargado se usa RiskOps.monitoringController; el cuerpo original queda de respaldo
    if (typeof RiskOps !== 'undefined' && typeof __histNav === 'function') return __histNav().monitoring.viewTimelineInMonitoreo(uid);
    const session = allActiveSessions[uid];`
    },
    {
        name: 'historial-navegacion: openMonitoreoDetails y populateGestoresDropdown delegan en RiskOps.monitoringController',
        start: 'window.openMonitoreoDetails = function(uid) {',
        end: '// --- Lógica del Portal de Indicadores de Gestión (KPIs) ---',
        endInclusive: false,
        replace: () => REPLACEMENT_H
    }
];
