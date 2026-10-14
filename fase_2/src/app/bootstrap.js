/**
 * bootstrap.js — Raíz de composición de RiskOps.
 *
 * ESTADO ACTUAL (Fase 2, transitional):
 *   Este archivo NO está incluido en `entry.js` todavía. Crece en paralelo
 *   al bundle IIFE (riskops.bundle.js) conforme cada controlador se completa.
 *   Cuando todos los controladores existan y se hayan verificado en el laboratorio,
 *   este módulo reemplaza la lógica de arranque de `app.js` y se convierte en
 *   el punto de entrada de un segundo bundle (Fase 3).
 *
 * ESTADO FINAL (Fase 3):
 *   bootstrap.js ES el entry point real. esbuild compila:
 *     src/app/bootstrap.js → dist/riskops.app.js  (IIFE, globalName: 'RiskOpsApp')
 *   El <script> de index.html cambia de:
 *     <script src="riskops.bundle.js">  +  <script src="app.js">
 *   a:
 *     <script src="riskops.app.js">
 *   app.js desaparece. riskops.bundle.js (el puente IIFE) también desaparece.
 *
 * RESPONSABILIDADES:
 *   1. Recibir todas las dependencias del entorno por inyección (db, auth, window, document).
 *      Ningún módulo bajo src/ importa window/document/firebase directamente.
 *   2. Crear todos los repositorios — adapters de Firebase RTDB.
 *   3. Crear todos los controladores — con sus repos y deps inyectados.
 *   4. Escuchar el cambio de estado de autenticación y disparar el arranque.
 *   5. En el periodo transitional: exponer en window las funciones que
 *      index.html todavía llama por onclick inline.
 *
 * REEMPLAZA DE app.js:
 *   - firebase.auth().onAuthStateChanged(...)
 *   - initApp() y el bloque de setup* que llama
 *   - Las asignaciones window.xxx = function() {...} para los onclick inline
 *
 * @module app/bootstrap
 */

// ── Capa app ──────────────────────────────────────────────────────────────────
import { createAppRouter } from './app-router.js';
// app-state.js y event-bus.js: pendientes de implementar (actualmente 0 bytes)
// import { createAppState } from './app-state.js';
// import { createEventBus } from './event-bus.js';

// ── Repositorios Firebase ─────────────────────────────────────────────────────
// Descomentar conforme cada repositorio se complete en services/firebase/:
//
// import { createConfigRepository }
//     from '../services/firebase/firebase-config-repository.js';
// import { createTaskRepository }
//     from '../services/firebase/firebase-task-repository.js';
// import { createShiftReportsRepository }
//     from '../services/firebase/firebase-shift-reports-repository.js';
// import { createMonitoringRepository }
//     from '../services/firebase/firebase-monitoring-repository.js';
// import { createNotificationsRepository }
//     from '../services/firebase/firebase-notifications-repository.js';
// import { createPresenceService }
//     from '../services/firebase/presence-service.js';

// ── Servicios de infraestructura (ya implementados) ───────────────────────────
import {
    initIdleDetector,
    requestIdlePermissionManual,
    shouldApplyDomIdleFallback,
} from '../services/browser/idle-detector-adapter.js';

import {
    saveBreakState,
    loadBreakState,
} from '../services/storage/local-session-storage.js';

import { createFormSubmitAdapter }
    from '../services/external/formsubmit-notification-adapter.js';

// ── Controladores existentes ──────────────────────────────────────────────────
import { createConfigGestoresController }
    from '../controllers/config-gestores-controller.js';

// Descomentar conforme cada controlador se complete en controllers/:
//
// import { createShiftController }
//     from '../controllers/shift-controller.js';
// import { createTaskController }
//     from '../controllers/task-controller.js';
// import { createTaskLoadersController }
//     from '../controllers/task-loaders-controller.js';
// import { createApprovalsController }
//     from '../controllers/approvals-controller.js';
// import { createMonitoringController }
//     from '../controllers/monitoring-controller.js';
// import { createShiftReportsController }
//     from '../controllers/shift-reports-controller.js';
// import { createProfileController }
//     from '../controllers/profile-controller.js';
// import { createNotificationsController }
//     from '../controllers/notifications-controller.js';
// import { createKpiController }
//     from '../controllers/kpi-controller.js';
// import { createAnnouncementsController }
//     from '../controllers/announcements-controller.js';
// import { createLoginHistoryController }
//     from '../controllers/login-history-controller.js';
// import { createSupervisorBadgeController }
//     from '../controllers/supervisor-badge-controller.js';

// ── Configuración ─────────────────────────────────────────────────────────────
import { ROLES } from '../config/roles.js';

// =============================================================================
// API pública
// =============================================================================

/**
 * Inicializa la aplicación completa.
 *
 * Se llama UNA VEZ, justo después de que firebase-config.js haya creado
 * `window.database`. Internamente registra el listener de auth y arranca
 * la app cuando hay usuario autenticado.
 *
 * Uso desde index.html (Fase 3):
 *   <script src="riskops.app.js"></script>
 *   <script>
 *     RiskOpsApp.initApp({
 *       db:       window.database,
 *       auth:     firebase.auth(),
 *       window:   window,
 *       document: document,
 *     });
 *   </script>
 *
 * @param {{
 *   db:        object,   - Referencia raíz de Firebase RTDB (window.database)
 *   auth:      object,   - Instancia de firebase.auth()
 *   window:    Window,   - Objeto window del navegador
 *   document:  Document, - Objeto document del navegador
 *   logger?:   Console,  - Logger; por defecto console
 * }} deps
 *
 * @returns {{ shutdown: () => void }}
 *   shutdown() limpia el listener de auth. Útil en pruebas para evitar fugas.
 */
export function initApp({ db, auth, window: win, document: doc, logger = console }) {

    // ── Repositorios ──────────────────────────────────────────────────────────
    //
    // Cada repositorio recibe `db` como única dependencia de Firebase.
    // Los controladores nunca ven `db` directamente.
    //
    // Descomentar conforme cada repositorio esté disponible:
    //
    // const configRepo        = createConfigRepository(db);
    // const taskRepo          = createTaskRepository(db);
    // const shiftReportsRepo  = createShiftReportsRepository(db);
    // const monitoringRepo    = createMonitoringRepository(db);
    // const notificationsRepo = createNotificationsRepository(db);

    // ── Servicios de notificación por correo ──────────────────────────────────
    //
    // FormSubmit necesita la URL de endpoint — viene de doc-links o de config.
    // const emailNotifier = createFormSubmitAdapter({ fetch: win.fetch.bind(win) });

    // ── Función de usuario actual ─────────────────────────────────────────────
    //
    // TODOS los controladores que necesitan el usuario reciben esta función.
    // Nadie importa `auth` directamente — solo bootstrap lo conoce.
    //
    const getUser = () => auth.currentUser;

    // ── Router de navegación (ya implementado) ────────────────────────────────
    const appRouter = createAppRouter({ document: doc, getUser });

    // ── Controladores (wiring por rol, descomentar conforme estén listos) ─────
    //
    // Nota: los controladores se crean FUERA del listener de auth para que
    // su ciclo de vida sea independiente del estado de autenticación.
    // Cada controlador recibe solo lo que necesita, ni más ni menos.
    //
    // ── configGestoresController ──────────────────────────────────────────────
    // (requiere configRepo, descomentar cuando el repositorio esté disponible)
    //
    // const configGestoresCtrl = createConfigGestoresController({
    //     repository: configRepo,
    //     document:   doc,
    //     confirm:    (msg) => win.confirm(msg),
    //     alert:      (msg) => win.alert(msg),
    // });

    // ── shiftController ───────────────────────────────────────────────────────
    // (controlador ya escrito en 2026-10-06; descomentar cuando su import esté activo)
    //
    // const shiftCtrl = createShiftController({
    //     getUser,
    //     getState:   loadBreakState,
    //     applyState: saveBreakState,
    //     storage:    { get: loadBreakState, save: saveBreakState },
    //     document:   doc,
    //     window:     win,
    //     // sync, timeline, ui: se inyectan desde app.js en el modo transitional;
    //     // en Fase 3 se inyectan desde aquí con los adaptadores correctos.
    // });

    // ── taskController ────────────────────────────────────────────────────────
    // const taskCtrl = createTaskController({
    //     repository: taskRepo,
    //     document:   doc,
    //     getUser,
    //     alert: (msg) => win.alert(msg),
    // });

    // ── monitoringController ──────────────────────────────────────────────────
    // const monitoringCtrl = createMonitoringController({
    //     repository: monitoringRepo,
    //     document:   doc,
    //     getUser,
    // });

    // ── kpiController ─────────────────────────────────────────────────────────
    // const kpiCtrl = createKpiController({
    //     repository: monitoringRepo,  // mismo repo que monitoring
    //     document:   doc,
    //     getUser,
    // });

    // ── Detector de inactividad ───────────────────────────────────────────────
    //
    // Se inicializa una vez al arrancar; los callbacks se pasan por inyección.
    // Reemplaza la lógica de permiso inline de app.js.
    //
    // En Fase 3 se conecta con shiftCtrl para reportar la inactividad:
    //
    // initIdleDetector({
    //     onIdleChange:            (isIdle) => shiftCtrl.onIdleChange(isIdle),
    //     onWarning:               (visible, msg) => shiftCtrl.onIdleWarning(visible, msg),
    //     getLastActivityTimestamp: () => shiftCtrl.getLastActivityTimestamp(),
    //     autoStart: true,
    // });

    // ── Listener de autenticación ─────────────────────────────────────────────
    //
    // Reemplaza el bloque firebase.auth().onAuthStateChanged() de app.js.
    // El unsubscribe se devuelve para poder llamar shutdown() en pruebas.
    //
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
        if (!user) {
            logger.info('[bootstrap] sesión cerrada — limpiando estado local');
            // En Fase 3: shiftCtrl.reset(), taskCtrl.clear(), etc.
            return;
        }

        logger.info('[bootstrap] usuario autenticado:', user.uid);

        _setupApp({
            user,
            doc,
            win,
            appRouter,
            logger,
            // Pasar las instancias de controladores cuando estén disponibles:
            // shiftCtrl,
            // taskCtrl,
            // monitoringCtrl,
            // configGestoresCtrl,
        });
    });

    // ── Exponer en window los handlers que index.html llama por onclick ────────
    //
    // SECCIÓN TRANSITIONAL: permanece hasta que cada onclick inline migre a
    // addEventListener dentro del controlador correspondiente.
    //
    // Patrón: win.nombreFuncion = () => ctrl.metodo(args)
    //         — El nombre debe ser IDÉNTICO al que usa index.html hoy en app.js
    //           para que QA y usuarios no noten el cambio.
    //
    // Descomentar conforme cada controlador esté listo Y su onclick migrado:
    //
    // win.renderConfigGestores = () => configGestoresCtrl.render();
    // win.toggleGestorSplitShift = (uid, checked) =>
    //     configGestoresCtrl.toggle(uid, checked);
    //
    // win.toggleSplitShiftBreak = () => shiftCtrl.toggle();
    // win.requestIdlePermission  = () => requestIdlePermissionManual();
    //
    // win.renderMonitoreo = () => monitoringCtrl.render();
    // win.renderKPIs      = () => kpiCtrl.render();

    return {
        /** Limpia el listener de auth. Llamar en teardown de pruebas. */
        shutdown() {
            unsubscribeAuth();
        },
    };
}

// =============================================================================
// Lógica interna de arranque post-auth
// =============================================================================

/**
 * Se ejecuta cada vez que hay un usuario autenticado.
 * Equivale al cuerpo de initApp() de app.js (el que se llama dentro del
 * onAuthStateChanged).
 *
 * @param {{
 *   user:       firebase.User,
 *   doc:        Document,
 *   win:        Window,
 *   appRouter:  ReturnType<typeof createAppRouter>,
 *   logger:     Console,
 * }} ctx
 */
function _setupApp({ user, doc, win, appRouter, logger }) {

    // 1. Navegación por rol ────────────────────────────────────────────────────
    //
    // Reemplaza el bloque de setupSidebar() de app.js (líneas 5075-5120).
    //
    const sidebarNav = doc.querySelector('.sidebar-nav');
    if (sidebarNav) {
        const { applied } = appRouter.applyRoleNavigation(sidebarNav);
        logger.info('[bootstrap] pestañas de navegación aplicadas:', applied);
    }

    appRouter.applyBreakButtonsVisibility();
    appRouter.alignAdministrativeControlsByRole();

    // 2. Inicialización por rol ────────────────────────────────────────────────
    //
    // Cada controlador arranca solo las escuchas que corresponden al rol.
    // (Descomentar conforme los controladores estén disponibles)
    //
    // const role = user.role; // ← cargado desde users/{uid} en Firebase
    //
    // if (role === ROLES.GESTOR) {
    //     shiftCtrl.restoreOnLoad();      // restaura estado de pausa de localStorage
    //     taskCtrl.loadPendingTasks();    // carga tareas del turno activo
    // }
    //
    // if (role === ROLES.SUPERVISOR || role === ROLES.ADMIN) {
    //     monitoringCtrl.startListening(); // suscribe al snapshot de gestores activos
    //     supervisorBadgeCtrl.startListening();
    // }
    //
    // if (role === ROLES.ADMIN) {
    //     configGestoresCtrl.render();    // carga la tabla de configuración de gestores
    //     approvalsCtrl.loadPending();    // carga solicitudes pendientes de aprobación
    // }

    // 3. Detector de inactividad (ya en memoria desde initApp) ─────────────────
    //
    // En Fase 3: iniciar el ciclo de polling DOM si el permiso no está otorgado.
    // (El detector nativo ya está configurado en initApp)

    // 4. Flags globales de ventana ─────────────────────────────────────────────
    //
    // app.js mantiene window.idleDetectorGranted y otros flags que otros scripts
    // leen. En Fase 3 estos se mueven aquí y se actualizan desde los callbacks
    // del detector de inactividad.
    //
    // win.idleDetectorGranted = false; // ← se actualiza desde initIdleDetector

    logger.info('[bootstrap] arranque completado para', user.uid);
}
