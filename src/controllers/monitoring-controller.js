/**
 * Controlador del panel de Monitoreo del supervisor: escucha en tiempo real `active_sessions`, pinta las
 * tarjetas con filtros, la bitácora (línea de tiempo), el detalle de tareas y el desplegable de gestores.
 *
 * Reemplaza, de `app.js`: `startActiveSessionsListener()` (5162), `renderActiveSessionsDashboard()` (5215),
 * `viewTimelineInMonitoreo()` (5460), `openMonitoreoDetails()` (5527) y `populateGestoresDropdown()` (5640).
 *
 * No usa globales: el DOM (`document`), el repositorio de Firebase y el estado de sesiones se INYECTAN. La
 * lógica (filtros, estado, HTML) vive en `domain/analytics/monitoring-view.js` y `active-session-status.js`.
 *
 * Diferencia deliberada y sin efecto visible: el original mutaba `session.status = 'Inactivo'` en el objeto
 * compartido al detectar una sesión sin latido; aquí el estado se CALCULA (`resolveSessionDisplay`) sin mutar.
 *
 * Decisión D9b (supervisores por ROL, no por lista fija): la exclusión del panel usa el directorio de supervisores
 * (`users/{uid}/role` = 'Supervisor' | 'Admin') y el UID de cada sesión. Si no se inyecta `supervisorDirectory`, el
 * controlador lo carga UNA vez con `repository.fetchSupervisorUsers()` en el primer pintado (o al iniciar el listener) y
 * repinta al recibirlo; mientras tanto (o si la lectura falla) no oculta a nadie. `excludedNames` ya no se admite.
 */

import { buildSupervisorDirectory, assertSupervisorDirectory } from '../domain/schedules/supervisor-directory.js';
import {
    filterActiveSessionUids,
    buildSessionCardModel,
    buildSessionCardHtml,
    buildEmptyMonitoringHtml,
    buildVisibleTimeline,
    buildTimelineRowsHtml,
    buildMonitoreoInfoText,
    buildDetailDisplayTasks,
    buildNoTasksHtml,
    buildDetailTaskCardHtml,
    resolveAvatarSrc,
    buildFallbackAvatarSrc,
    AVAILABLE_AVATARS
} from '../domain/analytics/monitoring-view.js';

/**
 * @param {{
 *   document: {getElementById: (id: string) => any, createElement: (tag: string) => any},
 *   repository: {
 *     listenActiveSessions: (onSessions: Function, onError?: Function) => (() => void),
 *     fetchApprovedGestorNames: () => Promise<string[]>,
 *     fetchSupervisorUsers?: () => Promise<Record<string, object>>
 *   },
 *   getSessions: () => Record<string, object>,
 *   setSessions: (sessions: Record<string, object>) => void,
 *   hasCronograma: () => boolean,
 *   getAssignedTasksForGestor: (fullName: string, shift: string) => string[],
 *   reconcileTask: (taskName: string, tasks: object) => {status: string, observation: string},
 *   resolveTaskName: (key: string, entry: object) => string,
 *   getShiftCategory: (shift: string) => string,
 *   supervisorDirectory?: object|null,
 *   legacyExcludedNames?: readonly string[],
 *   avatars?: readonly string[],
 *   now?: () => number,
 *   logger?: {error: Function}
 * }} deps
 */
export function createMonitoringController(deps) {
    if (Object.prototype.hasOwnProperty.call(deps, 'excludedNames')) {
        throw new TypeError('createMonitoringController: excludedNames (SUPERVISORES_NOMBRES) ya no se admite (decisión D9b); '
            + 'el directorio de supervisores se deriva de users (supervisorDirectory o repository.fetchSupervisorUsers).');
    }
    const {
        document, repository, getSessions, setSessions, hasCronograma, getAssignedTasksForGestor,
        reconcileTask, resolveTaskName, getShiftCategory, legacyExcludedNames,
        avatars = AVAILABLE_AVATARS, now = Date.now, logger = console
    } = deps;

    // ---------------------------------------------------------------- directorio de supervisores (D9b)
    let supervisorDirectory = assertSupervisorDirectory(deps.supervisorDirectory, 'createMonitoringController');
    let directoryRequest = null;
    let directoryFailed = false;

    /**
     * Carga el directorio una sola vez (si no se inyectó) y repinta al recibirlo. Devuelve la promesa en curso.
     * Tras un fallo no reintenta en cada pintado; `startActiveSessionsListener` sí vuelve a intentarlo.
     */
    function ensureSupervisorDirectory({ retry = false } = {}) {
        if (retry) directoryFailed = false;
        if (legacyExcludedNames || supervisorDirectory || directoryFailed) return Promise.resolve();
        if (directoryRequest) return directoryRequest;
        if (!repository || typeof repository.fetchSupervisorUsers !== 'function') return Promise.resolve();
        directoryRequest = Promise.resolve()
            .then(() => repository.fetchSupervisorUsers())
            .then((users) => {
                supervisorDirectory = buildSupervisorDirectory(users);
                return true;
            }, (error) => {
                logger.error('No se pudo leer el directorio de supervisores (users):', error);
                directoryRequest = null;
                directoryFailed = true; // se reintenta en el próximo inicio del listener
                return false;
            })
            .then((loaded) => {
                if (loaded) renderActiveSessionsDashboard();
            });
        return directoryRequest;
    }

    function exclusionDeps() {
        return legacyExcludedNames ? { legacyExcludedNames } : { supervisorDirectory };
    }

    /** app.js 5162-5173 */
    function startActiveSessionsListener() {
        ensureSupervisorDirectory({ retry: true });
        return repository.listenActiveSessions((sessions) => {
            setSessions(sessions);
            renderActiveSessionsDashboard();
        }, (error) => {
            logger.error('Error cargando monitoreo en tiempo real:', error);
        });
    }

    /** app.js 5215-5457 */
    function renderActiveSessionsDashboard() {
        const grid = document.getElementById('monitoreoGrid');
        if (!grid) return;

        grid.innerHTML = '';

        // Get filter queries
        const searchInputEl = document.getElementById('monitoreoSearchInput');
        const shiftSelectEl = document.getElementById('filterShiftSelect');
        const statusSelectEl = document.getElementById('filterStatusSelect');
        const nowMs = now();
        const sessions = getSessions();

        const filteredUids = filterActiveSessionUids(sessions, {
            searchText: searchInputEl ? searchInputEl.value : '',
            shiftQuery: shiftSelectEl ? shiftSelectEl.value : '',
            statusQuery: statusSelectEl ? statusSelectEl.value : ''
        }, { nowMs, ...exclusionDeps(), getShiftCategory });
        ensureSupervisorDirectory();

        if (filteredUids.length === 0) {
            grid.innerHTML = buildEmptyMonitoringHtml();
            return;
        }

        filteredUids.forEach((uid) => {
            const session = sessions[uid];
            if (!session) return;

            const model = buildSessionCardModel(uid, session, {
                nowMs,
                hasCronograma: Boolean(hasCronograma()),
                getAssignedTasks: getAssignedTasksForGestor,
                reconcileTask,
                avatars
            });

            const card = document.createElement('div');
            card.className = 'monitoreo-card';
            card.innerHTML = buildSessionCardHtml(model);

            const avatarElement = card.querySelector('.monitoreo-avatar');
            if (avatarElement) {
                avatarElement.alt = model.fullName;
                avatarElement.addEventListener('error', () => {
                    avatarElement.src = model.fallbackAvatarSrc;
                }, { once: true });
                avatarElement.src = model.avatarSrc;
            }

            grid.appendChild(card);
        });
    }

    /** app.js 5460-5524 */
    function viewTimelineInMonitoreo(uid) {
        const session = getSessions()[uid];
        if (!session) return;

        const modal = document.getElementById('timelineModal');
        const tbody = document.getElementById('timelineTableBody');
        if (!modal || !tbody) return;

        document.getElementById('timelineModalName').innerText = session.name || 'Gestor';

        tbody.innerHTML = buildTimelineRowsHtml(buildVisibleTimeline(session, now()));

        modal.classList.add('active');
    }

    /** app.js 5527-5638 */
    function openMonitoreoDetails(uid) {
        const session = getSessions()[uid];
        if (!session) return;

        const fullName = (session.name || '').trim();

        const avatarEl = document.getElementById('monitoreoModalAvatar');
        if (avatarEl) {
            avatarEl.src = resolveAvatarSrc(fullName, avatars);
            avatarEl.onerror = function () {
                this.onerror = null;
                this.src = buildFallbackAvatarSrc(fullName);
            };
        }

        const nameEl = document.getElementById('monitoreoModalName');
        if (nameEl) nameEl.textContent = 'Detalle de Tareas: ' + fullName;

        const infoEl = document.getElementById('monitoreoModalInfo');
        if (infoEl) infoEl.textContent = buildMonitoreoInfoText(session);

        const tasksList = document.getElementById('monitoreoModalTasksList');
        if (tasksList) {
            tasksList.innerHTML = '';

            const assignedTasks = hasCronograma() ? getAssignedTasksForGestor(fullName, session.shift || 'Mañana') : [];
            const displayTasks = buildDetailDisplayTasks(session, { assignedTasks, reconcileTask, resolveTaskName });

            if (displayTasks.length === 0) {
                tasksList.innerHTML = buildNoTasksHtml();
            } else {
                tasksList.innerHTML = displayTasks.map(buildDetailTaskCardHtml).join('');
            }
        }

        const modal = document.getElementById('monitoreoModal');
        if (modal) modal.classList.add('active');
    }

    /** app.js 5640-5666 */
    function populateGestoresDropdown() {
        const selectEl = document.getElementById('monitoreoSearchInput');
        if (!selectEl) return Promise.resolve();

        selectEl.innerHTML = '<option value="">Todos los Gestores</option>';

        return repository.fetchApprovedGestorNames().then((names) => {
            names.forEach((name) => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                selectEl.appendChild(opt);
            });
        }).catch((err) => {
            logger.error('Error populating gestores dropdown:', err);
        });
    }

    return {
        ensureSupervisorDirectory,
        getSupervisorDirectory: () => supervisorDirectory,
        startActiveSessionsListener,
        renderActiveSessionsDashboard,
        viewTimelineInMonitoreo,
        openMonitoreoDetails,
        populateGestoresDropdown
    };
}
