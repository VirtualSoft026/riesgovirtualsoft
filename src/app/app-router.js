/**
 * Enrutador de la barra lateral por rol (navegación): ordena y muestra las pestañas según el rol y alinea los
 * controles administrativos.
 *
 * Reemplazo, de `app.js`: el bloque de ordenamiento por rol de `setupSidebar()` (5075-5120),
 * `alignAdministrativeControlsByRole()` (4974) y `updateNavigation()` (5132). La POLÍTICA (qué pestañas ve cada
 * rol y en qué orden) es pura y vive en `domain/auth/auth-service.js`; aquí solo se aplica al DOM, que se
 * INYECTA (`document`).
 *
 * Lo que `setupSidebar()` conserva en app.js: la fusión de las vistas Horario y Teletrabajo (DOM específico de
 * la página) y la visibilidad del botón de Pausa de Turno (la gobierna `RiskOps.shiftController`).
 */

import {
    buildSidebarPolicy,
    buildBreakButtonsPolicy,
    buildAdministrativeControlsPolicy,
    buildMobileAccessPolicy,
    MOBILE_ACCESS,
    NAV_PARENT
} from '../domain/auth/auth-service.js';

/**
 * Fusiona Horario y Teletrabajo en una sola pestaña y una sola vista para todos los roles (app.js 5076-5105, primera
 * parte de `setupSidebar()`). Solo toca el DOM que se recibe; cada elemento se busca por id y los que no existen se
 * omiten, como los `if (navX)` originales. Es idempotente: una segunda llamada no vuelve a mover el panel.
 *
 * @param {any} doc documento inyectado
 */
export function unifyHorarioAndTeletrabajo(doc) {
    const navHorario = doc.getElementById('navHorario');
    const navTeletrabajo = doc.getElementById('navTeletrabajo');
    if (navHorario) {
        navHorario.style.display = 'flex';
        navHorario.innerHTML = "<i class='bx bx-calendar'></i> Horario y Teletrabajo";
    }
    if (navTeletrabajo) {
        navTeletrabajo.style.display = 'none';
    }

    const viewHorario = doc.getElementById('view-horario');
    const viewTeletrabajo = doc.getElementById('view-teletrabajo');
    if (!viewHorario || !viewTeletrabajo) return;

    const teletrabajoContent = viewTeletrabajo.querySelector('.glass-panel');
    if (!teletrabajoContent || doc.getElementById('mergedTeletrabajoPanel')) return;

    teletrabajoContent.id = 'mergedTeletrabajoPanel';

    const panelTitle = viewHorario.querySelector('.panel-title');
    if (panelTitle) panelTitle.innerHTML = "<i class='bx bx-calendar'></i> Horario y Teletrabajo";

    const hrPanel = viewHorario.querySelector('.glass-panel');
    if (hrPanel && !hrPanel.querySelector('.section-header')) {
        const h3Horario = doc.createElement('h3');
        h3Horario.className = 'section-header';
        h3Horario.style.cssText = "color: var(--accent-primary); margin-bottom: 15px; font-size: 16px;";
        h3Horario.innerText = "Horario Semanal";
        hrPanel.insertBefore(h3Horario, hrPanel.firstChild);
    }

    if (!teletrabajoContent.querySelector('.section-header')) {
        const h3Tele = doc.createElement('h3');
        h3Tele.className = 'section-header';
        h3Tele.style.cssText = "color: var(--success); margin-bottom: 15px; font-size: 16px;";
        h3Tele.innerText = "Cronograma de Teletrabajo";
        teletrabajoContent.insertBefore(h3Tele, teletrabajoContent.firstChild);
    }

    viewHorario.appendChild(teletrabajoContent);
}

/**
 * @param {{document: any, getUser: () => (object|null)}} deps
 */
export function createAppRouter({ document, getUser }) {
    /**
     * Aplica la política de navegación del rol del usuario (app.js 5075-5120, sin los botones de pausa).
     * Cada elemento se busca por id en el momento; los que no existan se omiten (como los `if (navX)` originales).
     *
     * @param {any} sidebarNav contenedor `.sidebar-nav`
     * @returns {{privileged: boolean, applied: string[]}} ids que se encontraron y se procesaron
     */
    function applyRoleNavigation(sidebarNav) {
        const policy = buildSidebarPolicy(getUser());
        const applied = [];

        policy.operations.forEach((operation) => {
            const el = document.getElementById(operation.id);
            if (!el) return;

            if (operation.display !== undefined) el.style.display = operation.display;

            if (operation.appendTo === NAV_PARENT.SIDEBAR) {
                sidebarNav.appendChild(el);
            } else if (operation.appendTo === NAV_PARENT.ADMIN_GROUP) {
                const adminGroup = document.getElementById('adminNavGroup');
                if (adminGroup) adminGroup.appendChild(el);
            }

            applied.push(operation.id);
        });

        return { privileged: policy.privileged, applied };
    }

    /** Botones de Almuerzo y Desayuno: visibles solo para el Gestor (app.js 5106-5115). */
    function applyBreakButtonsVisibility() {
        buildBreakButtonsPolicy(getUser()).forEach(({ id, display }) => {
            const el = document.getElementById(id);
            if (el) el.style.display = display;
        });
    }

    /** app.js 4974-4990 */
    function alignAdministrativeControlsByRole() {
        const policy = buildAdministrativeControlsPolicy(getUser());
        if (!policy) return;

        const pendingUsersBody = document.getElementById('pendingUsersTableBody');
        const userTablePanel = pendingUsersBody ? pendingUsersBody.closest('.glass-panel') : null;
        const userSearch = document.getElementById('filterAprobacionesSearch');
        const userFilterPanel = userSearch ? userSearch.closest('.glass-panel') : null;
        const userSectionTitle = userFilterPanel ? userFilterPanel.previousElementSibling : null;

        [userSectionTitle, userFilterPanel, userTablePanel].forEach((element) => {
            if (element) element.style.display = policy.showUserApprovalSection ? '' : 'none';
        });

        const adminAnnouncementsView = document.getElementById('view-gestion-comunicados');
        if (adminAnnouncementsView && policy.hideAdminAnnouncementsView) adminAnnouncementsView.style.display = 'none';
    }

    /**
     * `setupSidebar()` completo (app.js 5075-5120): fusión Horario/Teletrabajo, orden de pestañas por rol, botones de
     * pausa del Gestor y alineación de controles administrativos. El botón de Pausa de Turno lo refresca el llamador
     * (`RiskOps.shiftController`), así que llega inyectado.
     *
     * @param {{refreshSplitShiftButton?: () => void}} [actions]
     */
    function setupSidebar({ refreshSplitShiftButton } = {}) {
        const sidebarNav = document.querySelector('.sidebar-nav');
        if (!sidebarNav) return;

        unifyHorarioAndTeletrabajo(document);

        const navResult = applyRoleNavigation(sidebarNav);
        if (!navResult.privileged) {
            applyBreakButtonsVisibility();
            if (document.getElementById('toggleSplitShiftBtn') && refreshSplitShiftButton) refreshSplitShiftButton();
        }

        alignAdministrativeControlsByRole();
    }

    /**
     * app.js 5132-5139: refresca el botón de Pausa de Turno y vuelve a ordenar la barra.
     *
     * @param {{refreshSplitShiftButton?: () => void, setupSidebar?: () => void}} actions
     */
    function updateNavigation({ refreshSplitShiftButton, setupSidebar } = {}) {
        if (refreshSplitShiftButton) refreshSplitShiftButton();
        if (typeof setupSidebar === 'function') setupSidebar();
    }

    /**
     * Acceso desde móvil (app.js 690-712): Admin/Supervisor con scroll horizontal; Gestor bloqueado.
     *
     * @param {number} viewportWidth ancho de la ventana (`window.innerWidth`)
     * @returns {string} la política aplicada (MOBILE_ACCESS)
     */
    function applyMobileAccess(viewportWidth) {
        const mode = buildMobileAccessPolicy(getUser(), viewportWidth);
        const blocker = document.getElementById('mobileBlocker');

        if (mode === MOBILE_ACCESS.SCROLL) {
            if (blocker) blocker.style.display = 'none';
            document.documentElement.style.overflowX = 'auto';
            document.body.style.minWidth = '1200px';
            document.body.style.overflowX = 'auto';
        } else if (mode === MOBILE_ACCESS.BLOCK) {
            if (blocker) blocker.style.display = 'flex';
            const app = document.querySelector('.app-container');
            if (app) app.style.display = 'none';
        }

        return mode;
    }

    return {
        applyRoleNavigation,
        applyBreakButtonsVisibility,
        alignAdministrativeControlsByRole,
        applyMobileAccess,
        setupSidebar,
        updateNavigation
    };
}
