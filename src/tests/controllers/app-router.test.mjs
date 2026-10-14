import { createRunner, assert } from '../test-harness.mjs';
import { createAppRouter } from '../../app/app-router.js';
import { canManageComunicados } from '../../domain/announcements/announcement-capabilities.js';
import { createRecordingNavDocument, createFakeDocument, createElement } from '../helpers/fake-dom-historial.mjs';

const { test, summarize } = createRunner('app-router (navegación por rol: diferencial vs setupSidebar, alignAdministrativeControlsByRole, updateNavigation)');

const NAV_IDS = [
    'navWorkspace', 'navHorario', 'navTeletrabajo', 'navDocs', 'navPermisos', 'navComunicados', 'adminNavGroup',
    'navAdminComunicados', 'navTurnos', 'navAprobaciones', 'navMonitoreo', 'navTiempos', 'navConfigGestores',
    'horarioGestorFilterContainer', 'teletrabajoGestorFilterContainer', 'toggleLunchBtn', 'toggleBreakfastBtn', 'toggleSplitShiftBtn'
];

/**
 * Copia LITERAL del bloque de ordenamiento por rol de setupSidebar() de app.js (5000-5010 búsqueda de
 * elementos; 5075-5116 ramas Admin/Supervisor y Gestor), SIN la fusión Horario/Teletrabajo (5012-5073) ni el
 * botón de Pausa de Turno (5117-5120), que NO pertenecen a este módulo.
 */
function legacySetupSidebarOrdering(document, currentUser) {
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (!sidebarNav) return;

    const navWorkspace = document.getElementById('navWorkspace');
    const navHorario = document.getElementById('navHorario');
    const navDocs = document.getElementById('navDocs');
    const navPermisos = document.getElementById('navPermisos');
    const navComunicados = document.getElementById('navComunicados');

    const adminNavGroup = document.getElementById('adminNavGroup');
    const navAdminComunicados = document.getElementById('navAdminComunicados');
    const navTurnos = document.getElementById('navTurnos');
    const navAprobaciones = document.getElementById('navAprobaciones');
    const navMonitoreo = document.getElementById('navMonitoreo');
    const navTiempos = document.getElementById('navTiempos');

    if (currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Supervisor')) {
        // Admin/Supervisor Order
        const hFilter = document.getElementById('horarioGestorFilterContainer');
        if (hFilter) hFilter.style.display = 'flex';
        const tFilter = document.getElementById('teletrabajoGestorFilterContainer');
        if (tFilter) tFilter.style.display = 'flex';

        if (navWorkspace) { navWorkspace.style.display = 'none'; } // HIDE Mis Tareas for Admin and Supervisor
        if (navComunicados) {
            if (currentUser.role === 'Supervisor') {
                navComunicados.style.display = 'flex';
                sidebarNav.appendChild(navComunicados);
            } else {
                navComunicados.style.display = 'none';
            }
        }

        if (adminNavGroup) { adminNavGroup.style.display = 'block'; sidebarNav.appendChild(adminNavGroup); }
        if (navMonitoreo) { navMonitoreo.style.display = 'flex'; adminNavGroup.appendChild(navMonitoreo); }

        if (navTiempos) { navTiempos.style.display = 'none'; }
        if (navAdminComunicados) {
            if (canManageComunicados(currentUser.role)) {
                navAdminComunicados.style.display = 'flex';
                adminNavGroup.appendChild(navAdminComunicados);
            } else {
                navAdminComunicados.style.display = 'none';
            }
        }
        if (navTurnos) { navTurnos.style.display = 'flex'; adminNavGroup.appendChild(navTurnos); }
        if (navAprobaciones) { navAprobaciones.style.display = 'flex'; adminNavGroup.appendChild(navAprobaciones); }

        if (navHorario) { sidebarNav.appendChild(navHorario); }
        if (navDocs) { navDocs.style.display = 'flex'; sidebarNav.appendChild(navDocs); }
        if (navPermisos) { navPermisos.style.display = 'flex'; sidebarNav.appendChild(navPermisos); }

        const navConfigGestores = document.getElementById('navConfigGestores');
        if (navConfigGestores && currentUser.role === 'Admin') {
            navConfigGestores.style.display = 'flex';
            sidebarNav.appendChild(navConfigGestores);
        }
    } else {
        // Gestor Order
        const hFilter = document.getElementById('horarioGestorFilterContainer');
        if (hFilter) hFilter.style.display = 'none';
        const tFilter = document.getElementById('teletrabajoGestorFilterContainer');
        if (tFilter) tFilter.style.display = 'none';

        if (navWorkspace) { navWorkspace.style.display = 'flex'; sidebarNav.appendChild(navWorkspace); }
        if (navComunicados) { navComunicados.style.display = 'flex'; sidebarNav.appendChild(navComunicados); }
        if (navHorario) { sidebarNav.appendChild(navHorario); }
        if (navDocs) { navDocs.style.display = 'flex'; sidebarNav.appendChild(navDocs); }
        if (navPermisos) { navPermisos.style.display = 'flex'; sidebarNav.appendChild(navPermisos); }

        // Hide Admin tabs for Gestor
        if (adminNavGroup) adminNavGroup.style.display = 'none';

        // --- LUNCH BUTTON VISIBILITY ---
        const toggleLunchBtn = document.getElementById('toggleLunchBtn');
        if (toggleLunchBtn) {
            toggleLunchBtn.style.display = 'flex';
        }

        const toggleBreakfastBtn = document.getElementById('toggleBreakfastBtn');
        if (toggleBreakfastBtn) {
            toggleBreakfastBtn.style.display = 'flex';
        }
    }
}

function runNew(user, existing) {
    const rec = createRecordingNavDocument(existing);
    const router = createAppRouter({ document: rec.document, getUser: () => user });
    const result = router.applyRoleNavigation(rec.sidebarNav);
    if (!result.privileged) router.applyBreakButtonsVisibility();
    return rec.log;
}

function runOld(user, existing) {
    const rec = createRecordingNavDocument(existing);
    legacySetupSidebarOrdering(rec.document, user);
    return rec.log;
}

const USERS = [
    { role: 'Admin' }, { role: 'Supervisor' }, { role: 'Gestor' }, { role: 'Auditor' }, { role: '' }, {}, null
];

test('diferencial vs app.js: mismas operaciones y MISMO ORDEN (display y appendChild) para cada rol, con todos los elementos presentes', () => {
    for (const user of USERS) {
        const a = runOld(user, NAV_IDS);
        const b = runNew(user, NAV_IDS);
        assert.deepEqual(b, a, `rol ${JSON.stringify(user)}`);
        assert.ok(a.length > 5);
    }
});

test('diferencial: con elementos ausentes (cada id faltante por separado) el resultado sigue siendo idéntico', () => {
    for (const user of USERS) {
        for (const missing of NAV_IDS.filter((id) => id !== 'adminNavGroup')) {
            const existing = NAV_IDS.filter((id) => id !== missing);
            assert.deepEqual(runNew(user, existing), runOld(user, existing), `${JSON.stringify(user)} sin ${missing}`);
        }
    }
});

test('adminNavGroup ausente: el original lanzaría TypeError al anexar Monitoreo; el nuevo lo omite sin lanzar (único cambio de comportamiento, a favor de la robustez)', () => {
    const existing = NAV_IDS.filter((id) => id !== 'adminNavGroup');
    assert.throws(() => runOld({ role: 'Admin' }, existing), TypeError);
    assert.doesNotThrow(() => runNew({ role: 'Admin' }, existing));
});

test('Admin vs Supervisor vs Gestor: Config. Gestores solo para Admin; Mis Tareas solo para Gestor', () => {
    const adm = runNew({ role: 'Admin' }, NAV_IDS).join('|');
    const sup = runNew({ role: 'Supervisor' }, NAV_IDS).join('|');
    const ges = runNew({ role: 'Gestor' }, NAV_IDS).join('|');
    assert.ok(adm.includes('navConfigGestores.display=flex'));
    assert.ok(!sup.includes('navConfigGestores'));
    assert.ok(!ges.includes('navConfigGestores'));
    assert.ok(ges.includes('navWorkspace.display=flex'));
    assert.ok(adm.includes('navWorkspace.display=none') && sup.includes('navWorkspace.display=none'));
});

test('el router NO toca el botón de Pausa de Turno (lo gobierna RiskOps.shiftController)', () => {
    for (const user of USERS) assert.ok(!runNew(user, NAV_IDS).join('|').includes('toggleSplitShiftBtn'));
});

// ---------------------------------------------------------------- alignAdministrativeControlsByRole (app.js 4974-4990)
/** Copia LITERAL de app.js 4974-4990 (con `currentUser` y `canManageComunicados` como parámetros). */
function legacyAlign(document, currentUser) {
    if (!currentUser) return;

    const isAdmin = currentUser.role === 'Admin';
    const pendingUsersBody = document.getElementById('pendingUsersTableBody');
    const userTablePanel = pendingUsersBody ? pendingUsersBody.closest('.glass-panel') : null;
    const userSearch = document.getElementById('filterAprobacionesSearch');
    const userFilterPanel = userSearch ? userSearch.closest('.glass-panel') : null;
    const userSectionTitle = userFilterPanel ? userFilterPanel.previousElementSibling : null;

    [userSectionTitle, userFilterPanel, userTablePanel].forEach(element => {
        if (element) element.style.display = isAdmin ? '' : 'none';
    });

    const adminAnnouncementsView = document.getElementById('view-gestion-comunicados');
    if (adminAnnouncementsView && !canManageComunicados(currentUser.role)) adminAnnouncementsView.style.display = 'none';
}

function buildAdminDom() {
    const title = createElement('title');
    const filterPanel = createElement('filterPanel', { previousElementSibling: title });
    const tablePanel = createElement('tablePanel');
    const body = createElement('pendingUsersTableBody', { closest: () => tablePanel });
    const search = createElement('filterAprobacionesSearch', { closest: () => filterPanel });
    const view = createElement('view-gestion-comunicados');
    return {
        title, filterPanel, tablePanel, view,
        document: createFakeDocument({ pendingUsersTableBody: body, filterAprobacionesSearch: search, 'view-gestion-comunicados': view })
    };
}

test('diferencial alignAdministrativeControlsByRole: mismos estilos que el original para cada rol (y sin usuario)', () => {
    for (const user of USERS) {
        const a = buildAdminDom(); const b = buildAdminDom();
        legacyAlign(a.document, user);
        createAppRouter({ document: b.document, getUser: () => user }).alignAdministrativeControlsByRole();
        for (const k of ['title', 'filterPanel', 'tablePanel', 'view']) {
            assert.equal(b[k].style.display, a[k].style.display, `${k} rol ${JSON.stringify(user)}`);
        }
    }
});

test('alignAdministrativeControlsByRole: Admin ve la sección de usuarios (display ""), Supervisor y Gestor no ("none")', () => {
    const adm = buildAdminDom(); createAppRouter({ document: adm.document, getUser: () => ({ role: 'Admin' }) }).alignAdministrativeControlsByRole();
    assert.equal(adm.tablePanel.style.display, ''); assert.equal(adm.view.style.display, '');
    const sup = buildAdminDom(); createAppRouter({ document: sup.document, getUser: () => ({ role: 'Supervisor' }) }).alignAdministrativeControlsByRole();
    assert.equal(sup.tablePanel.style.display, 'none'); assert.equal(sup.view.style.display, '');
    const ges = buildAdminDom(); createAppRouter({ document: ges.document, getUser: () => ({ role: 'Gestor' }) }).alignAdministrativeControlsByRole();
    assert.equal(ges.view.style.display, 'none');
});

test('alignAdministrativeControlsByRole: sin elementos en la página no falla', () => {
    const doc = createFakeDocument({});
    assert.doesNotThrow(() => createAppRouter({ document: doc, getUser: () => ({ role: 'Admin' }) }).alignAdministrativeControlsByRole());
});

// ---------------------------------------------------------------- updateNavigation (app.js 5132-5139)
test('updateNavigation: refresca el botón de Pausa de Turno y luego reordena la barra', () => {
    const calls = [];
    const router = createAppRouter({ document: createFakeDocument({}), getUser: () => null });
    router.updateNavigation({ refreshSplitShiftButton: () => calls.push('boton'), setupSidebar: () => calls.push('sidebar') });
    assert.deepEqual(calls, ['boton', 'sidebar']);
    router.updateNavigation({ setupSidebar: () => calls.push('solo-sidebar') });
    assert.deepEqual(calls.slice(2), ['solo-sidebar']);
    assert.doesNotThrow(() => router.updateNavigation());
});

summarize();
