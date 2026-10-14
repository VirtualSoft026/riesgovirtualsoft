/**
 * Paso de integración SOLO-LABORATORIO del corte "Tareas, persistencia y ciclo de aplicación".
 *
 * Sustituye, en la copia de staging de app.js (nunca en el original), cuerpos de funciones por llamadas a los módulos
 * de `src` (bundle `RiskOps`), conservando nombre, firma y orden de llamada de cada función global (los `onclick`
 * del HTML generado y los demás bloques de app.js siguen resolviendo a ellas). Solo se conecta lo que una prueba
 * diferencial contra la copia LITERAL de app.js demostró idéntico; cada paso lleva la marca `[LAB-INTEGRACION]`.
 *
 * Pasos (todos con ancla única; ninguno se solapa con los del controlador de turno ni con `modales-permisos.mjs`):
 *  1. Puente de controladores (helpers perezosos) + `updateClock()`        -> RiskOps.clockFormat / taskRepository / taskController / taskLoadersController
 *  2. `loadExcelTasks()`, `loadSchedule()`, `loadTeletrabajo()`, `loadPermisos()`, `openPermisoDetailModal()` -> RiskOps.taskLoadersController
 *  3. `renderTree()`                                                       -> RiskOps.taskController (workspace)
 *  4. `persistTaskToActiveSession()` y `fetchOwnActiveSessionTasks()`      -> RiskOps.taskRepository
 *  5. `persistTaskIfNotNewerRemote()` y `migrateLocalTasksToActiveSession()` -> RiskOps.taskRepository
 *  6. `syncActiveSessionToFirebase()` (PARCIAL): contadores, transición de Inactividad y cola del payload.
 *     NO toca el estado/campos de Pausa de Turno (los aporta el controlador de turno) ni la línea del `update()`.
 *  7. `updateKPI()`, `toggleTree()`, `renderQuickDocs()`                  -> RiskOps.taskController (workspace)
 *  8. `window.selectTask()`                                                -> RiskOps.taskController (workspace)
 *  9. `recoverGestorTaskProgress()`                                        -> RiskOps.taskController (recuperación)
 * 10. `initApp()` (PARCIAL): la secuencia de arranque de datos (recuperación -> horario -> tareas -> teletrabajo -> permisos -> docs)
 *     y el listener de `#saveTaskBtn`. El resto de `initApp()` (tema, avatar, navegación, formularios) NO se toca.
 *
 * Demostración de paridad: las suites diferenciales de `src/tests/{domain,services,controllers,ui}/` y
 * `src/tests/e2e/tareas-integrado.e2e.cjs` (funciones reales del app.js integrado, en un `vm`, contra el original).
 */

export const MARK = '[LAB-INTEGRACION]';

const PUENTE_Y_RELOJ = `// ${MARK} Puente app.js -> RiskOps (corte "tareas"): controladores creados la primera vez que se usan.
// Todo el estado (taskStateCache, allTasks, currentUser, ...) sigue siendo de app.js y se lee/escribe por getters/setters.
let __labTaskRepository = null;
function __tareasRepo() {
    if (__labTaskRepository) return __labTaskRepository;
    __labTaskRepository = RiskOps.taskRepository.createTaskRepository({
        database: database,
        now: () => Date.now(),
        saveCache: (cache) => localStorage.setItem('riskOps_cache', JSON.stringify(cache)),
        logger: console
    });
    return __labTaskRepository;
}

let __labTaskWorkspace = null;
function __tareasWorkspace() {
    if (__labTaskWorkspace) return __labTaskWorkspace;
    __labTaskWorkspace = RiskOps.taskController.createTaskWorkspaceController({
        doc: document,
        getUser: () => currentUser,
        getTaskCache: () => taskStateCache,
        getAllTasks: () => allTasks,
        setActiveTaskId: (id) => { currentActiveTaskId = id; },
        setSelectedTask: (task) => { currentSelectedTask = task; },
        getDocUrl: (fileName) => getDocUrl(fileName),
        syncActiveSession: () => syncActiveSessionToFirebase(),
        escape: (value) => escapeHTML(value),
        encodeArg: (value) => encodeInlineHandlerArg(value),
        newDate: () => new Date()
    });
    return __labTaskWorkspace;
}

let __labTaskRecovery = null;
function __tareasRecovery() {
    if (__labTaskRecovery) return __labTaskRecovery;
    __labTaskRecovery = RiskOps.taskController.createTaskRecoveryController({
        repository: __tareasRepo(),
        getTaskCache: () => taskStateCache,
        setTaskCache: (cache) => { taskStateCache = cache; },
        saveTaskCache: (cache) => localStorage.setItem('riskOps_cache', JSON.stringify(cache)),
        getAuthUser: () => firebase.auth().currentUser,
        alert: (message) => alert(message),
        logger: console
    });
    return __labTaskRecovery;
}

let __labTaskLoaders = null;
function __tareasLoaders() {
    if (__labTaskLoaders) return __labTaskLoaders;
    __labTaskLoaders = RiskOps.taskLoadersController.createTaskLoadersController({
        fetchFn: (url) => fetch(url),
        XLSX: XLSX,
        doc: document,
        now: () => Date.now(),
        newDate: () => new Date(),
        getUser: () => currentUser,
        persistUser: (user) => localStorage.setItem('riskOps_currentUser', JSON.stringify(user)),
        getScheduleRows: () => globalScheduleRows,
        getScheduleBlocks: () => globalScheduleBlocks,
        setSchedule: (rows, blocks) => { globalScheduleRows = rows; globalScheduleBlocks = blocks; },
        getShiftForDate: (rows, blocks, name, date) => getShiftForDate(rows, blocks, name, date),
        normalizeName: (name) => normalizeName(name),
        namesMatch: (a, b) => namesMatch(a, b),
        taskNamesMatch: (a, b) => taskNamesMatch(a, b),
        setNamesMatch: (a, b) => setNamesMatch(a, b),
        escape: (value) => escapeHTML(value),
        encodeArg: (value) => encodeInlineHandlerArg(value),
        multiSelect: {
            setup: (id, options, onChange) => setupCustomMultiSelect(id, options, onChange),
            getValues: (id) => getSelectedMultiSelectValues(id)
        },
        loadCronogramaAssignments: (name, shift) => loadCronogramaAssignments(name, shift),
        getCronogramaAssignments: () => gestorCronogramaAssignments,
        getTaskCache: () => taskStateCache,
        saveTaskCache: (cache) => localStorage.setItem('riskOps_cache', JSON.stringify(cache)),
        repository: __tareasRepo(),
        setAllTasks: (tasks) => { allTasks = tasks; },
        renderTree: (tasksBySet) => renderTree(tasksBySet),
        syncActiveSession: () => syncActiveSessionToFirebase(),
        database: database,
        getAuthUid: () => { const u = firebase.auth().currentUser; return u && u.uid; },
        alert: (message) => alert(message),
        logger: console
    });
    return __labTaskLoaders;
}

// Live Clock Logic — ${MARK} delega en RiskOps.clockFormat
function updateClock() {
    const clockElement = document.getElementById('liveClock');
    if (!clockElement) return;

    clockElement.textContent = RiskOps.clockFormat.formatClockTime(new Date());
}

`;

const CARGA_EXCEL = `async function loadExcelTasks() { return __tareasLoaders().loadExcelTasks(); } // ${MARK} RiskOps.taskLoadersController

`;

const CARGA_HORARIO = `async function loadSchedule() { return __tareasLoaders().loadSchedule(); } // ${MARK} RiskOps.taskLoadersController

`;

const CARGA_TELETRABAJO = `function loadTeletrabajo() { return __tareasLoaders().loadTeletrabajo(); } // ${MARK} RiskOps.taskLoadersController

`;

const CARGA_PERMISOS = `async function loadPermisos() { return __tareasLoaders().loadPermisos(); } // ${MARK} RiskOps.taskLoadersController (allLoadedPermissions vive dentro del controlador)

`;

const DETALLE_PERMISO = `window.openPermisoDetailModal = async function(fb_id) { return __tareasLoaders().openPermisoDetailModal(fb_id); }; // ${MARK} RiskOps.taskLoadersController

`;

const RENDER_TREE = `function renderTree(tasksBySet) { return __tareasWorkspace().renderTree(tasksBySet); } // ${MARK} RiskOps.taskController

`;

const PERSISTENCIA_1 = `// ${MARK} Persistencia central del progreso de UNA tarea y lectura del progreso remoto propio: delegan en
// RiskOps.taskRepository (mismas rutas, mismas Promises reales, \`ok:false\` ante fallo de lectura).
// Autocontenida a propósito (solo usa \`database\` y \`RiskOps\`): la prueba de otro corte (modales-permisos-integrado.e2e.cjs) la
// extrae de app.js por su cabecera hasta la primera llave de cierre y la ejecuta aislada.
function persistTaskToActiveSession(uid, taskId, taskData) {
    return RiskOps.taskRepository.createTaskRepository({ database: database }).persistTaskToActiveSession(uid, taskId, taskData);
}

async function fetchOwnActiveSessionTasks(uid) { return __tareasRepo().fetchOwnActiveSessionTasks(uid); }

`;

const PERSISTENCIA_2 = `// ${MARK} Transacción condicional (aborta si el remoto es estrictamente más reciente): RiskOps.taskRepository
function persistTaskIfNotNewerRemote(uid, taskId, record) { return __tareasRepo().persistTaskIfNotNewerRemote(uid, taskId, record); }

`;

const PERSISTENCIA_3 = `// ${MARK} Migración de recuperación puntual (respaldo local ANTES del intento remoto): RiskOps.taskRepository
async function migrateLocalTasksToActiveSession(uid, mergedCache, remoteCache) { return __tareasRepo().migrateLocalTasksToActiveSession(uid, mergedCache, remoteCache); }

`;

const CONTADORES_LATIDO = `    // ${MARK} contadores y porcentaje del latido desde RiskOps.taskProgress (el DOM se cuenta con countDomTasks)
    const __syncCounters = RiskOps.taskProgress.computeSyncPercentage(RiskOps.taskController.countDomTasks(document));
    const totalTasks = __syncCounters.totalTasks;
    const completedTasks = __syncCounters.completedTasks;
    const notDoneTasks = __syncCounters.notDoneTasks;
    const finalized = __syncCounters.finalized;

    let percentage = __syncCounters.percentage;
`;

const TRANSICION_INACTIVIDAD = `    // ${MARK} transición de Inactividad desde RiskOps.taskSessionSync
    const __inactivityAction = RiskOps.taskSessionSync.decideInactivityTimelineAction(currentStatus, localStatus);
    if (__inactivityAction) pushTimelineEvent('Inactividad', __inactivityAction);
`;

const COLA_PAYLOAD = `        ...RiskOps.taskSessionSync.buildSessionMetadataTail({ finalized: finalized, completedTasks: completedTasks, notDoneTasks: notDoneTasks, percentage: percentage }, shiftTimeline), // ${MARK} finalizedTasks..appVersion
`;

const KPI_ARBOL_DOCS = `function updateKPI() { return __tareasWorkspace().updateKPI(); } // ${MARK} RiskOps.taskController

function toggleTree(element) { return __tareasWorkspace().toggleTree(element); } // ${MARK} RiskOps.taskController

function renderQuickDocs(selectedTaskName) { return __tareasWorkspace().renderQuickDocs(selectedTaskName); } // ${MARK} RiskOps.taskController

`;

const SELECT_TASK = `window.selectTask = function(taskId, evt) { return __tareasWorkspace().selectTask(taskId, evt); }; // ${MARK} RiskOps.taskController

`;

const RECUPERACION = `// ${MARK} Recuperación "fail-safe" del progreso remoto (lectura no confiable o identidad distinta => cero escrituras remotas):
// RiskOps.taskController.createTaskRecoveryController
async function recoverGestorTaskProgress(uid) { return __tareasRecovery().recoverGestorTaskProgress(uid); }

`;

const ARRANQUE_DE_DATOS = `    // ${MARK} secuencia de arranque de datos desde RiskOps.taskController: recuperación -> horario -> tareas -> teletrabajo -> permisos -> docs
    await RiskOps.taskController.runStartupDataSequence({
        user: currentUser,
        runStartupRecovery: (user) => __tareasRecovery().runStartupRecovery(user),
        loadSchedule: () => loadSchedule(),
        loadExcelTasks: () => loadExcelTasks(),
        loadTeletrabajo: () => loadTeletrabajo(),
        loadPermisos: () => loadPermisos(),
        renderQuickDocs: (name) => renderQuickDocs(name),
        logger: console
    });

`;

const BOTON_GUARDAR = `    // Botón de guardar progreso en tarea — ${MARK} lógica en RiskOps.taskController.createTaskSaveController
    const saveTaskBtn = document.getElementById('saveTaskBtn');
    if(saveTaskBtn) {
        const __saveTaskController = RiskOps.taskController.createTaskSaveController({
            doc: document,
            saveButton: saveTaskBtn,
            getAuthUser: () => firebase.auth().currentUser,
            getUser: () => currentUser,
            getActiveTaskId: () => currentActiveTaskId,
            getSelectedTask: () => currentSelectedTask,
            getTaskCache: () => taskStateCache,
            saveTaskCache: (cache) => localStorage.setItem('riskOps_cache', JSON.stringify(cache)),
            repository: { persistTaskToActiveSession: (uid, taskId, record) => persistTaskToActiveSession(uid, taskId, record) },
            updateKPI: () => updateKPI(),
            alert: (message) => alert(message),
            setTimeout: (fn, ms) => setTimeout(fn, ms),
            now: () => Date.now(),
            logger: console
        });
        saveTaskBtn.addEventListener('click', async () => { await __saveTaskController.saveTaskProgress(); });
    }

`;

export const STEPS = [
    {
        name: 'tareas: puente de controladores y reloj (updateClock)',
        start: '// Live Clock Logic\nfunction updateClock() {',
        end: '// Update clock every second',
        endInclusive: false,
        replace: () => PUENTE_Y_RELOJ
    },
    {
        name: 'tareas: loadExcelTasks delega en RiskOps.taskLoadersController',
        start: 'async function loadExcelTasks() {',
        end: '// Initializar parseo del Horario Personal',
        endInclusive: false,
        replace: () => CARGA_EXCEL
    },
    {
        name: 'tareas: loadSchedule delega en RiskOps.taskLoadersController',
        start: 'async function loadSchedule() {',
        end: 'function loadTeletrabajo() {',
        endInclusive: false,
        replace: () => CARGA_HORARIO
    },
    {
        name: 'tareas: loadTeletrabajo delega en RiskOps.taskLoadersController',
        start: 'function loadTeletrabajo() {',
        end: 'let allLoadedPermissions = [];',
        endInclusive: false,
        replace: () => CARGA_TELETRABAJO
    },
    {
        name: 'tareas: loadPermisos delega en RiskOps.taskLoadersController',
        start: 'let allLoadedPermissions = [];',
        end: '// Modal de detalle completo de permiso',
        endInclusive: false,
        replace: () => CARGA_PERMISOS
    },
    {
        name: 'tareas: openPermisoDetailModal delega en RiskOps.taskLoadersController',
        start: 'window.openPermisoDetailModal = async function(fb_id) {',
        end: 'function renderTree(tasksBySet) {',
        endInclusive: false,
        replace: () => DETALLE_PERMISO
    },
    {
        name: 'tareas: renderTree delega en RiskOps.taskController',
        start: 'function renderTree(tasksBySet) {',
        end: '// --- Identidad can',
        endInclusive: false,
        replace: () => RENDER_TREE
    },
    {
        name: 'tareas: persistTaskToActiveSession y fetchOwnActiveSessionTasks delegan en RiskOps.taskRepository',
        start: 'function persistTaskToActiveSession(uid, taskId, taskData) {',
        end: '// Combina el cach',
        endInclusive: false,
        replace: () => PERSISTENCIA_1
    },
    {
        name: 'tareas: persistTaskIfNotNewerRemote delega en RiskOps.taskRepository',
        start: 'function persistTaskIfNotNewerRemote(uid, taskId, record) {',
        end: '// Migración de recuperación puntual',
        endInclusive: false,
        replace: () => PERSISTENCIA_2
    },
    {
        name: 'tareas: migrateLocalTasksToActiveSession delega en RiskOps.taskRepository',
        start: 'async function migrateLocalTasksToActiveSession(uid, mergedCache, remoteCache) {',
        end: 'function syncActiveSessionToFirebase() {',
        endInclusive: false,
        replace: () => PERSISTENCIA_3
    },
    {
        name: 'tareas: latido (parcial) - contadores y porcentaje',
        start: "    const totalTasks = document.querySelectorAll('.task-item').length;\n    const completedTasks = document.querySelectorAll('.task-item .status-completed').length;\n    const notDoneTasks = document.querySelectorAll('.task-item .status-not-done').length;\n    const finalized = completedTasks + notDoneTasks;\n\n    let percentage = 0;",
        end: '        percentage = Math.round((finalized / totalTasks) * 100);\n    }\n',
        endInclusive: true,
        replace: () => CONTADORES_LATIDO
    },
    {
        name: 'tareas: latido (parcial) - transición de Inactividad',
        start: "    if (currentStatus === 'Inactivo' && localStatus !== 'Inactivo') {",
        end: "        pushTimelineEvent('Inactividad', 'end');\n    }\n",
        endInclusive: true,
        replace: () => TRANSICION_INACTIVIDAD
    },
    {
        name: 'tareas: latido (parcial) - cola del payload (contadores, bitácora y versión)',
        start: '        finalizedTasks: finalized,\n',
        end: "        appVersion: 'v104'\n",
        endInclusive: true,
        replace: () => COLA_PAYLOAD
    },
    {
        name: 'tareas: updateKPI, toggleTree y renderQuickDocs delegan en RiskOps.taskController',
        start: "function updateKPI() {\n    const totalTasks = document.querySelectorAll('.task-item').length;",
        end: '// Global scope logic for onclick elements',
        endInclusive: false,
        replace: () => KPI_ARBOL_DOCS
    },
    {
        name: 'tareas: selectTask delega en RiskOps.taskController',
        start: 'window.selectTask = function(taskId, evt) {',
        end: '// Orquesta, de forma "fail-safe"',
        endInclusive: false,
        replace: () => SELECT_TASK
    },
    {
        name: 'tareas: recoverGestorTaskProgress delega en RiskOps.taskController',
        start: 'async function recoverGestorTaskProgress(uid) {',
        end: '// Task Status Buttons Interaction',
        endInclusive: false,
        replace: () => RECUPERACION
    },
    {
        name: 'tareas: initApp (parcial) - secuencia de arranque de datos',
        start: "    if (currentUser && currentUser.role === 'Gestor' && currentUser.uid) {\n        try {\n            const recovery = await recoverGestorTaskProgress(currentUser.uid);",
        end: '    renderQuickDocs(null);\n\n',
        endInclusive: true,
        replace: () => ARRANQUE_DE_DATOS
    },
    {
        name: 'tareas: initApp (parcial) - botón de guardar progreso de tarea',
        start: "    // Botón de guardar progreso en tarea\n    const saveTaskBtn = document.getElementById('saveTaskBtn');",
        end: "    const pForm = document.getElementById('permisosForm');",
        endInclusive: false,
        replace: () => BOTON_GUARDAR
    }
];
