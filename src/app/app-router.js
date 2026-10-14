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
    NAV_PARENT
} from '../domain/auth/auth-service.js';

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
     * app.js 5132-5139: refresca el botón de Pausa de Turno y vuelve a ordenar la barra.
     *
     * @param {{refreshSplitShiftButton?: () => void, setupSidebar?: () => void}} actions
     */
    function updateNavigation({ refreshSplitShiftButton, setupSidebar } = {}) {
        if (refreshSplitShiftButton) refreshSplitShiftButton();
        if (typeof setupSidebar === 'function') setupSidebar();
    }

    return { applyRoleNavigation, applyBreakButtonsVisibility, alignAdministrativeControlsByRole, updateNavigation };
}
