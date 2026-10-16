/**
 * Controlador de tareas: recuperación del progreso del Gestor, latido de sesión activa, guardado del
 * progreso de una tarea, árbol de tareas, KPI, documentos rápidos, selección de tarea, reloj y secuencia de
 * arranque de datos de `initApp()`.
 *
 * Reemplaza, de `app.js`: `updateClock()` (1322), `recoverGestorTaskProgress()` (2694),
 * `syncActiveSessionToFirebase()` (2386; el estado/pausas lo aporta `shiftController.describeLiveSession`),
 * el listener de `#saveTaskBtn` de `initApp()` (3260-3377), `renderTree()` (2063), `updateKPI()` (2474),
 * `toggleTree()` (2519), `renderQuickDocs()` (2528), `selectTask()` (2612) y los bloques de arranque de
 * `initApp()` (2722-2765).
 *
 * No toca el DOM global, `localStorage`, `firebase` ni `window` directamente: recibe todo por `deps`
 * (inyección de dependencias) para probarse sin navegador.
 */

import { canonicalTaskId } from '../domain/tasks/task-report.js';
import { mergeTaskCaches } from '../domain/tasks/task-reconciler.js';
import { RECOVERY_STATUS, describeRecoveryAlert, shouldRecoverTaskProgress } from '../domain/tasks/task-recovery.js';
import {
    shouldSyncActiveSession, isSessionClosedElsewhere, resolveLoginTime, resolveIsInactive,
    decideInactivityTimelineAction, buildSessionMetadata
} from '../domain/tasks/task-session-sync.js';
import { computeSyncPercentage, computeKpiFigures } from '../domain/tasks/task-progress.js';
import { validateTaskSaveInput, buildTaskRecord, resolveStatusClassForButton, describeTaskSaveError } from '../domain/tasks/task-save-rules.js';
import { findCatalogTask, isTaskReviewerRole, buildReviewerTaskDetailText } from '../domain/tasks/task-selection.js';
import { formatClockTime } from '../domain/tasks/clock-format.js';
import { buildTreeSetHTML, sortedSetKeys, shouldAutoExpandTree, buildTaskKpiHTML } from '../ui/views/task-tree-view.js';
import { buildQuickDocsHTML } from '../ui/views/quick-docs-view.js';
import { bindTreeToggleDelegation, toggleTreeElement } from '../ui/components/tree-toggle.js';

/**
 * Cuenta las tareas pintadas en el DOM (app.js 2474-2476 y 2398-2400).
 *
 * @param {{querySelectorAll: (selector: string) => ArrayLike<unknown>}} doc
 * @returns {{total: number, completed: number, notDone: number}}
 */
export function countDomTasks(doc) {
    return {
        total: doc.querySelectorAll('.task-item').length,
        completed: doc.querySelectorAll('.task-item .status-completed').length,
        notDone: doc.querySelectorAll('.task-item .status-not-done').length
    };
}

/**
 * Recuperación del progreso remoto de tareas del Gestor, "fail-safe" (app.js 2694-2720).
 *
 *  1. Si la lectura remota falla (`ok: false`) NO se fusiona ni se migra nada: el caché local queda tal
 *     cual y se reporta REMOTE_READ_FAILED.
 *  2. Justo antes de migrar se revalida que el uid autenticado coincida; si no, cero escrituras remotas
 *     (IDENTITY_MISMATCH). La fusión en memoria y su respaldo local sí ocurren antes (es solo una vista).
 *
 * @param {{
 *   repository: {fetchOwnActiveSessionTasks: Function, migrateLocalTasksToActiveSession: Function},
 *   getTaskCache: () => Record<string, object>,
 *   setTaskCache: (cache: Record<string, object>) => void,
 *   saveTaskCache?: (cache: Record<string, object>) => void,
 *   getAuthUser: () => ({uid?: string}|null|undefined),
 *   alert?: (message: string) => void,
 *   logger?: {error: Function}
 * }} deps
 */
export function createTaskRecoveryController(deps) {
    const { repository, getTaskCache, setTaskCache, saveTaskCache = () => {}, getAuthUser, logger = console } = deps;
    const alertFn = deps.alert || (() => {});

    /**
     * @param {string} uid
     * @returns {Promise<{status: string, failedMigrationsCount: number}>}
     */
    async function recoverGestorTaskProgress(uid) {
        const remoteResult = await repository.fetchOwnActiveSessionTasks(uid);

        if (!remoteResult.ok) {
            return { status: RECOVERY_STATUS.REMOTE_READ_FAILED, failedMigrationsCount: 0 };
        }

        setTaskCache(mergeTaskCaches(getTaskCache(), remoteResult.tasks));

        try {
            saveTaskCache(getTaskCache());
        } catch (e) { /* localStorage no disponible: el respaldo local es best-effort */ }

        const authUser = getAuthUser();

        if (!authUser || authUser.uid !== uid) {
            logger.error('No se pudo verificar la identidad autenticada antes de migrar el progreso local; se omite la migración.');

            return { status: RECOVERY_STATUS.IDENTITY_MISMATCH, failedMigrationsCount: 0 };
        }

        // Migración de recuperación puntual (una sola vez, no periódica); idempotente.
        const { failed } = await repository.migrateLocalTasksToActiveSession(uid, getTaskCache(), remoteResult.tasks);

        return { status: RECOVERY_STATUS.OK, failedMigrationsCount: failed.length };
    }

    /**
     * Primer bloque de `initApp()` (app.js 2728-2748): recupera el progreso del Gestor y avisa con UNA
     * alerta si no fue confiable. Nunca lanza.
     *
     * @param {{role?: string, uid?: string}|null} user
     * @returns {Promise<{ran: boolean, recovery?: object, alerted?: string|null}>}
     */
    async function runStartupRecovery(user) {
        if (!shouldRecoverTaskProgress(user)) return { ran: false };

        try {
            const recovery = await recoverGestorTaskProgress(user.uid);
            const message = describeRecoveryAlert(recovery);

            if (message) alertFn(message);

            return { ran: true, recovery, alerted: message };
        } catch (e) {
            logger.error('No se pudo recuperar el progreso remoto de tareas al iniciar:', e);

            return { ran: true, error: e };
        }
    }

    return { recoverGestorTaskProgress, runStartupRecovery };
}

/**
 * Latido de sesión activa (`syncActiveSessionToFirebase()`, app.js 2386-2472), versión completa con
 * inyección de dependencias. El estado y los campos de la Pausa de Turno vienen de
 * `shiftController.describeLiveSession()`.
 *
 * El latido SOLO escribe metadatos (`buildSessionMetadata` nunca incluye `tasks`) con `update()`, así que
 * nunca pisa una tarea recién guardada (comentario de app.js 2455-2465).
 *
 * @param {{
 *   getUser: () => (object|null),
 *   clearUser: () => void,
 *   getStoredUserRaw: () => (string|null),
 *   redirectToLogin: () => void,
 *   doc: {querySelectorAll: Function},
 *   now?: () => number,
 *   nowIso?: () => string,
 *   markSyncLoop?: (nowMs: number) => void,
 *   loadBreakState?: () => void,
 *   idle: {isGranted: () => boolean, getGlobalIdleState: () => boolean, domFallback: (nowMs: number) => boolean},
 *   describeLiveSession: (isInactive: boolean) => {status: string, splitShiftStartTime: number|null, totalSplitShiftTimeMs: number},
 *   getLocalStatus: () => string,
 *   setLocalStatus: (status: string) => void,
 *   pushTimelineEvent: (type: string, action: 'start'|'end') => void,
 *   getTimeline: () => (Array<object>|null),
 *   repository: {syncSessionMetadata: (uid: string, metadata: object) => Promise<unknown>}
 * }} deps
 * @returns {{syncActiveSession: () => Promise<unknown>}}
 */
export function createSessionSyncController(deps) {
    const {
        getUser, clearUser, getStoredUserRaw, redirectToLogin, doc,
        now = Date.now, nowIso = () => new Date().toISOString(),
        markSyncLoop = () => {}, loadBreakState = () => {},
        idle, describeLiveSession, getLocalStatus, setLocalStatus, pushTimelineEvent, getTimeline, repository
    } = deps;

    function syncActiveSession() {
        const currentUser = getUser();

        if (!shouldSyncActiveSession(currentUser)) return Promise.resolve();

        const uid = currentUser.uid;

        // Si la sesión fue cerrada en otra pestaña, localStorage estará vacío
        if (isSessionClosedElsewhere(getStoredUserRaw())) {
            clearUser();
            redirectToLogin();

            return Promise.resolve();
        }

        const counters = computeSyncPercentage(countDomTasks(doc));

        // Se usa el loginTime local, evitando cualquier lectura de base de datos que pudiera colgarse
        const loginTime = resolveLoginTime(currentUser, nowIso);

        // --- LÓGICA DE INACTIVIDAD ---
        const nowMs = now();
        markSyncLoop(nowMs);
        loadBreakState();

        const newLastActive = now();
        const isInactive = resolveIsInactive({
            idleDetectorGranted: idle.isGranted(),
            globalIdleState: idle.getGlobalIdleState(),
            domIdleFallback: () => idle.domFallback(nowMs)
        });

        const live = describeLiveSession(isInactive);
        const currentStatus = live.status;

        const action = decideInactivityTimelineAction(currentStatus, getLocalStatus());

        if (action) pushTimelineEvent('Inactividad', action);

        setLocalStatus(currentStatus);

        const sessionMetadata = {
            ...buildSessionMetadata({
                user: currentUser,
                loginTime,
                lastActive: newLastActive,
                status: currentStatus,
                counters,
                timeline: getTimeline()
            }),
            splitShiftStartTime: live.splitShiftStartTime,
            totalSplitShiftTimeMs: live.totalSplitShiftTimeMs
        };

        // No se atrapa el error de forma que oculte el fallo: se devuelve la Promise real.
        return repository.syncSessionMetadata(uid, sessionMetadata);
    }

    return { syncActiveSession };
}

/**
 * Guardado del progreso de una tarea (listener de `#saveTaskBtn`, app.js 3260-3377).
 *
 * Orden crítico: (1) validar, (2) respaldo local inmediato (NO cuenta como persistencia), (3) esperar la
 * Promise real de Firebase y solo entonces mostrar éxito, (4) ante fallo avisar y conservar el respaldo.
 * Un guardado en curso bloquea otro (`isSavingTask`).
 *
 * @param {{
 *   doc: {querySelector: Function, getElementById: Function},
 *   saveButton: object,
 *   getAuthUser: () => (object|null),
 *   getUser: () => (object|null),
 *   getActiveTaskId: () => unknown,
 *   getSelectedTask: () => (object|null),
 *   getTaskCache: () => Record<string, object>,
 *   saveTaskCache?: (cache: object) => void,
 *   repository: {persistTaskToActiveSession: Function},
 *   updateKPI: () => void,
 *   alert: (message: string) => void,
 *   setTimeout?: (fn: Function, ms: number) => unknown,
 *   now?: () => number,
 *   logger?: {error: Function}
 * }} deps
 */
export function createTaskSaveController(deps) {
    const {
        doc, saveButton, getAuthUser, getUser, getActiveTaskId, getSelectedTask, getTaskCache,
        saveTaskCache = () => {}, repository, updateKPI, alert: alertFn, now = Date.now, logger = console
    } = deps;
    const schedule = deps.setTimeout || ((fn, ms) => setTimeout(fn, ms));
    let isSavingTask = false;

    /** @returns {Promise<{saved: boolean, reason?: string}>} */
    async function saveTaskProgress() {
        // Evitar dobles clics / escrituras simultáneas mientras una ya está en curso
        if (isSavingTask) return { saved: false, reason: 'IN_PROGRESS' };

        const selectedStatusBtn = doc.querySelector('.btn-status.active');
        const obsField = doc.getElementById('taskObservation');
        const validation = validateTaskSaveInput({
            currentActiveTaskId: getActiveTaskId(),
            selectedStatusText: selectedStatusBtn ? selectedStatusBtn.textContent : null,
            observation: obsField ? obsField.value : '',
            authUser: getAuthUser(),
            currentUser: getUser(),
            currentSelectedTask: getSelectedTask()
        });

        if (!validation.ok) {
            alertFn(validation.message);

            return { saved: false, reason: 'INVALID' };
        }

        const authUser = getAuthUser();
        const taskIdStr = validation.taskId;
        const btn = saveButton;
        const prevText = btn.innerHTML;
        isSavingTask = true;
        btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Guardando...";
        btn.disabled = true;
        btn.classList.remove('btn-success', 'btn-error');

        const taskRecord = buildTaskRecord(getSelectedTask(), selectedStatusBtn.textContent, validation.observation, now());

        // Respaldo local inmediato para permitir reintento visual, pero esto NO cuenta como confirmación
        // de persistencia (eso solo lo da Firebase).
        const cache = getTaskCache();
        cache[taskIdStr] = taskRecord;

        try {
            saveTaskCache(cache);
        } catch (e) { /* localStorage no disponible: el respaldo local es best-effort */ }

        try {
            // Capturar el elemento visual actual y la clase de estado antes de la promesa, para evitar
            // condiciones de carrera si el usuario cambia la selección mientras guarda.
            const visualTaskElement = doc.querySelector('.task-item.active .task-status');
            const statusClassToAdd = resolveStatusClassForButton(selectedStatusBtn.classList);

            // Único punto de verdad para la persistencia: espera la Promise real de Firebase.
            await repository.persistTaskToActiveSession(authUser.uid, taskIdStr, taskRecord);

            btn.innerHTML = "<i class='bx bx-check'></i> Guardado Exitosamente";
            btn.classList.add('btn-success');

            // Limpiar el campo de texto de observaciones al confirmarse el envío de la actividad
            if (obsField) {
                obsField.value = '';
            }

            // Actualizar estado visual de la tarea guardada
            if (visualTaskElement) {
                visualTaskElement.classList.remove('status-pending', 'status-completed', 'status-not-done', 'status-in-progress');
                visualTaskElement.classList.add(statusClassToAdd);
            }

            updateKPI();

            schedule(() => {
                btn.innerHTML = prevText;
                btn.classList.remove('btn-success');
            }, 2000);

            return { saved: true };
        } catch (error) {
            logger.error('Error al guardar el progreso de la tarea:', error);
            btn.innerHTML = "<i class='bx bx-error'></i> Error al guardar";
            btn.classList.add('btn-error');
            alertFn(describeTaskSaveError(error).message);
            schedule(() => {
                btn.innerHTML = prevText;
                btn.classList.remove('btn-error');
            }, 2500);

            return { saved: false, reason: 'REMOTE_FAILED', error };
        } finally {
            btn.disabled = false;
            isSavingTask = false;
        }
    }

    return { saveTaskProgress };
}

/**
 * Árbol de tareas, KPI, documentos rápidos, selección de tarea y reloj.
 *
 * @param {{
 *   doc: {querySelector: Function, querySelectorAll: Function, getElementById: Function, createElement: Function},
 *   getUser: () => (object|null),
 *   getTaskCache: () => Record<string, object>,
 *   getAllTasks: () => Array<object>,
 *   setActiveTaskId: (id: string|null) => void,
 *   setSelectedTask: (task: object|null) => void,
 *   getDocUrl: (fileName: string) => string,
 *   syncActiveSession?: () => unknown,
 *   escape?: (value: unknown) => string,
 *   encodeArg?: (value: unknown) => string,
 *   newDate?: () => Date,
 *   legacyProgress?: boolean
 * }} deps `legacyProgress: true` pinta el % de la tarjeta KPI como app.js (suma de dos porcentajes
 *   redondeados); solo para la prueba diferencial. Por defecto (D8) usa `formatProgress`, igual que el latido.
 */
export function createTaskWorkspaceController(deps) {
    const {
        doc, getUser, getTaskCache, getAllTasks, setActiveTaskId, setSelectedTask, getDocUrl,
        syncActiveSession = () => {}, escape, encodeArg, newDate = () => new Date(), legacyProgress = false
    } = deps;

    /** Reloj en vivo (app.js 1322-1333). */
    function updateClock() {
        const clockElement = doc.getElementById('liveClock');

        if (!clockElement) return;

        clockElement.textContent = formatClockTime(newDate());
    }

    /** Tarjeta de KPI + latido si es Gestor (app.js 2474-2517). El % es el mismo del latido (D8). */
    function updateKPI() {
        const figures = computeKpiFigures(countDomTasks(doc), { legacy: legacyProgress === true });
        const kpiContainer = doc.querySelector('.kpi-card');

        if (kpiContainer) {
            kpiContainer.innerHTML = buildTaskKpiHTML(figures);
        }

        // Sincronizar sesión activa si es gestor
        const currentUser = getUser();

        if (currentUser && currentUser.role === 'Gestor') {
            syncActiveSession();
        }
    }

    /** Dibuja el árbol por Set y refresca el KPI (app.js 2063-2115). */
    function renderTree(tasksBySet) {
        const container = doc.querySelector('.tree-container');

        if (!container) return;

        container.innerHTML = ''; // clear mock

        // Sort keys logically
        const sets = sortedSetKeys(tasksBySet);
        const shouldAutoExpand = shouldAutoExpandTree(sets);

        sets.forEach((set) => {
            const setDiv = doc.createElement('div');
            setDiv.className = 'tree-item';
            setDiv.innerHTML = buildTreeSetHTML({
                set, tasks: tasksBySet[set], taskStateCache: getTaskCache(), shouldAutoExpand, escape, encodeArg
            });
            container.appendChild(setDiv);
        });

        // Update KPI whenever tree is rendered
        updateKPI();
    }

    /** Expandir/contraer un Set (app.js 2519-2526). */
    function toggleTree(element) {
        toggleTreeElement(element);
    }

    /** Panel de documentos de acceso rápido (app.js 2528-2610). */
    function renderQuickDocs(selectedTaskName) {
        const container = doc.getElementById('quickDocsList');

        if (!container) return;

        container.innerHTML = buildQuickDocsHTML(selectedTaskName, getDocUrl);
    }

    /** Selecciona una tarea del árbol (app.js 2612-2672). */
    function selectTask(taskId, evt) {
        const canonicalId = canonicalTaskId(taskId);
        setActiveTaskId(canonicalId);

        // Remove active
        doc.querySelectorAll('.task-item').forEach((el) => el.classList.remove('active'));

        // Add active (evt se pasa explícitamente desde el onclick; nunca depender del evento global)
        const eventTarget = evt && evt.currentTarget;

        if (eventTarget) eventTarget.classList.add('active');

        const task = findCatalogTask(getAllTasks(), taskId);

        if (task) {
            const titleElement = doc.getElementById('currentTaskTitle');

            if (titleElement) titleElement.textContent = task['Tarea'];

            setSelectedTask(task);

            // Renderizar accesos rápidos destacando el documento de esta tarea
            renderQuickDocs(task['Tarea']);

            const textArea = doc.getElementById('taskObservation');

            if (isTaskReviewerRole(getUser())) {
                if (textArea) {
                    // Detalle e instrucciones para revisión de Admin/Supervisor
                    textArea.value = buildReviewerTaskDetailText(task);
                }
            } else {
                // Restore from cache if exists
                const taskStateCache = getTaskCache();

                doc.querySelectorAll('.btn-status').forEach((el) => el.classList.remove('active'));

                if (taskStateCache[canonicalId]) {
                    if (textArea) textArea.value = taskStateCache[canonicalId].observation || '';

                    const cachedStatus = taskStateCache[canonicalId].status;
                    let found = false;

                    doc.querySelectorAll('.btn-status').forEach((el) => {
                        if (el.textContent.trim() === cachedStatus) {
                            el.classList.add('active');
                            found = true;
                        }
                    });

                    if (!found) doc.querySelector('.btn-status.pending').classList.add('active');
                } else {
                    if (textArea) textArea.value = ''; // Limpiar nota de otras tareas

                    doc.querySelector('.btn-status.pending').classList.add('active');
                }
            }
        } else {
            setSelectedTask(null);
            setActiveTaskId(null);

            if (eventTarget) eventTarget.classList.remove('active');

            const titleElement = doc.getElementById('currentTaskTitle');

            if (titleElement) titleElement.textContent = 'Selecciona una tarea';

            const textArea = doc.getElementById('taskObservation');

            if (textArea) textArea.value = '';

            doc.querySelectorAll('.btn-status').forEach((el) => el.classList.remove('active'));
        }
    }

    // W-50: los encabezados del árbol (`data-action="toggle-tree"`) se expanden por delegación desde el documento.
    bindTreeToggleDelegation(doc);

    return { updateClock, updateKPI, renderTree, toggleTree, renderQuickDocs, selectTask };
}

/**
 * Secuencia de arranque de datos de `initApp()` (app.js 2728-2765): recuperar progreso → horario →
 * tareas (cada uno con su propio try/catch, un fallo no impide los siguientes) → teletrabajo → permisos →
 * documentos rápidos.
 *
 * @param {{
 *   user: object|null,
 *   runStartupRecovery: (user: object|null) => Promise<unknown>,
 *   loadSchedule: () => Promise<unknown>,
 *   loadExcelTasks: () => Promise<unknown>,
 *   loadTeletrabajo: () => unknown,
 *   loadPermisos: () => unknown,
 *   renderQuickDocs: (name: string|null) => void,
 *   logger?: {error: Function}
 * }} deps
 * @returns {Promise<string[]>} nombres de los pasos ejecutados, en orden
 */
export async function runStartupDataSequence(deps) {
    const { user, runStartupRecovery, loadSchedule, loadExcelTasks, loadTeletrabajo, loadPermisos, renderQuickDocs, logger = console } = deps;
    const steps = [];

    await runStartupRecovery(user);
    steps.push('recovery');

    // Carga de Excel Inicial
    try {
        await loadSchedule();
    } catch (e) {
        logger.error('Error al cargar el horario en la inicialización:', e);
    }

    steps.push('schedule');

    try {
        await loadExcelTasks();
    } catch (e) {
        logger.error('Error al cargar las tareas en la inicialización:', e);
    }

    steps.push('tasks');

    loadTeletrabajo();
    steps.push('teletrabajo');
    loadPermisos();
    steps.push('permisos');
    renderQuickDocs(null);
    steps.push('quickDocs');

    return steps;
}
