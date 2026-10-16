/**
 * bootstrap.js — raíz de composición de RiskOps.
 *
 * Al cerrar la Fase 3 es el ÚNICO punto de entrada (CF-0.1): esbuild compila
 * `src/app/bootstrap.js` → `riskops.app.js` (IIFE, `RiskOpsApp`) y `index.html` carga solo ese archivo.
 *
 * Estado tras el paso 3.0:
 * - compila (`build/build-app.mjs`), sin imports ni wiring a funciones inexistentes (W-01);
 * - la sesión y el rol salen de `users/{uid}` en el servidor, nunca del caché local (W-02, W-55 a; DE-1 = b);
 * - aplica la navegación por rol y el acceso móvil con el perfil validado.
 * Las verticales (tareas, turno, monitoreo, KPIs, navegación y modales) se conectan aquí en los pasos 3.2 a
 * 3.4; hasta entonces `index.html` sigue cargando `app.js` (W-04 y W-05 cambian la carga en el paso 3.6).
 *
 * Reglas de esta capa:
 * 1. Todo el entorno entra por inyección (`db`, `auth`, `window`, `document`, `storage`).
 * 2. Ningún módulo de `src/` importa `window`, `document` ni `firebase` directamente.
 * 3. No expone funciones en `window` (CF-2.1); el puente transitorio vive en `legacy-bridge.js` (W-03).
 *
 * @module app/bootstrap
 */

import { createAppRouter } from './app-router.js';
import { createSession } from './session.js';

/**
 * @typedef {object} BootstrapDeps
 * @property {{ref: (path?: string) => any}} db  Raíz de Firebase Realtime Database.
 * @property {{onAuthStateChanged: (cb: (user: {uid: string}|null) => void) => (() => void), signOut: () => Promise<void>}} auth
 *   Instancia de `firebase.auth()`.
 * @property {{innerWidth: number, location: {assign: (url: string) => void}}} window  Ventana del navegador.
 * @property {any} document  Documento del navegador.
 * @property {{getItem: (key: string) => (string|null), setItem: (key: string, value: string) => void, removeItem: (key: string) => void}} [storage]
 *   Por defecto `window.localStorage`.
 * @property {unknown} [serverTimestamp]  `firebase.database.ServerValue.TIMESTAMP`.
 * @property {{info: Function, warn: Function, error: Function}} [logger]
 * @property {() => Date} [now]
 */

/**
 * Inicializa la aplicación. Se llama una vez, cuando ya existen `firebase.auth()` y la base de datos.
 *
 * @param {BootstrapDeps} deps
 * @returns {{shutdown: () => void, session: ReturnType<typeof createSession>}}
 *   `shutdown()` quita los listeners de autenticación y de perfil (pruebas y desmontaje, W-23).
 */
export function initApp({
    db,
    auth,
    window: win,
    document: doc,
    storage = /** @type {any} */ (win).localStorage,
    serverTimestamp = null,
    logger = console,
    now = () => new Date()
}) {
    /** @type {ReturnType<typeof createSession>} */
    let session;

    // El router recibe el perfil VALIDADO por la sesión (nunca `auth.currentUser`, que no trae el rol).
    const appRouter = createAppRouter({ document: doc, getUser: () => session.getUser() });

    session = createSession({
        auth,
        database: db,
        storage,
        serverTimestamp,
        now,
        logger,
        goToLogin: () => win.location.assign('login.html'),
        onReady: (profile) => setupForRole({ doc, win, appRouter, logger, profile }),
        onProfileChange: (profile) => {
            logger.info('[bootstrap] el rol cambió en el servidor; se vuelve a aplicar la navegación');
            setupForRole({ doc, win, appRouter, logger, profile });
        }
    });

    session.start();

    return {
        session,
        shutdown() {
            session.shutdown();
        }
    };
}

/**
 * Aplica al DOM lo que depende del rol (equivale a la parte de `setupSidebar()` y del bloque móvil de app.js).
 *
 * @param {{doc: any, win: {innerWidth: number}, appRouter: ReturnType<typeof createAppRouter>,
 *          logger: {info: Function}, profile: Record<string, unknown>}} ctx
 */
function setupForRole({ doc, win, appRouter, logger, profile }) {
    const sidebarNav = doc.querySelector('.sidebar-nav');

    if (sidebarNav) {
        const { applied } = appRouter.applyRoleNavigation(sidebarNav);
        logger.info('[bootstrap] pestañas de navegación aplicadas:', applied);
    }

    appRouter.applyBreakButtonsVisibility();
    appRouter.alignAdministrativeControlsByRole();
    appRouter.applyMobileAccess(win.innerWidth);

    logger.info('[bootstrap] arranque completado para', profile.uid);
}
