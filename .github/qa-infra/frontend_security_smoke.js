const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appPath = path.resolve(__dirname, '..', '..', 'app.js');
const appSource = fs.readFileSync(appPath, 'utf8');

function extractBetween(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  const end = appSource.indexOf(endMarker, start);
  assert(start >= 0, `Missing marker: ${startMarker}`);
  assert(end > start, `Missing marker after ${startMarker}: ${endMarker}`);
  return appSource.slice(start, end);
}

function testStoredXssEscaping() {
  const escapeSource = extractBetween('function escapeHTML(', 'window.escapeHTML');
  const renderSource = extractBetween('function renderIncidentsTable(', '/**');
  const tbody = { innerHTML: '' };
  const documentStub = {
    getElementById(id) {
      return id === 'incidentsTableBody' ? tbody : null;
    },
  };
  const loadRenderer = new Function(
    'document',
    `${escapeSource}\n${renderSource}\nreturn { escapeHTML, renderIncidentsTable };`,
  );
  const { escapeHTML, renderIncidentsTable } = loadRenderer(documentStub);
  const payload = '<img src=x onerror=alert(1)>';
  assert.equal(escapeHTML(payload), '&lt;img src=x onerror=alert(1)&gt;');
  renderIncidentsTable([{
    timestamp: null,
    type: payload,
    title: payload,
    detail: payload,
    assignedTo: payload,
    reportedBy: payload,
    status: 'Abierto',
  }]);
  assert.doesNotMatch(tbody.innerHTML, /<img(?:\s|>)/i);
  assert.match(tbody.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);
}

function testInlineHandlerAndAvatarSafety() {
  const helperSource = extractBetween('function encodeInlineHandlerArg(', 'const ANNOUNCEMENT_ALLOWED_TAGS');
  const loadHelper = new Function(`${helperSource}\nreturn encodeInlineHandlerArg;`);
  const encodeInlineHandlerArg = loadHelper();
  const payload = `');alert(document.domain);//`;
  const encoded = encodeInlineHandlerArg(payload);
  assert.equal(decodeURIComponent(encoded), payload);
  assert.doesNotMatch(encoded, /['"`]/);

  const dynamicInlineHandlers = [...appSource.matchAll(/onclick="[^"\r\n]*\$\{[^"\r\n]*"/g)];
  assert(dynamicInlineHandlers.length > 0, 'Expected dynamic inline handlers for the compatibility UI');
  dynamicInlineHandlers.forEach(({ 0: handler }) => {
    assert.match(handler, /encodeInlineHandlerArg\(/);
  });
  assert.doesNotMatch(
    appSource,
    /<img[^>]*onerror="[^">]*\$\{/i,
  );
  assert.match(appSource, /avatarElement\.alt = fullName;/);
  assert.match(appSource, /avatarElement\.addEventListener\('error'/);
}

async function testAtomicShiftClosure() {
  const helperStart = appSource.indexOf('async function persistShiftClosureCore(');
  const handlerStart = appSource.indexOf('async function handleEndShift()', helperStart);
  const handlerEnd = appSource.indexOf('// Inicializar inmediatamente', handlerStart);
  assert(helperStart >= 0 && handlerStart > helperStart && handlerEnd > handlerStart);
  const helperSource = appSource.slice(helperStart, handlerStart);
  const handlerSource = appSource.slice(handlerStart, handlerEnd);
  const updatesSeen = [];
  const timestamp = { '.sv': 'timestamp' };
  const databaseStub = {
    ref(databasePath) {
      if (databasePath === 'shift_reports') return { push: () => ({ key: 'report-id' }) };
      if (databasePath === undefined) return { update: async (updates) => updatesSeen.push(updates) };
      throw new Error(`Unexpected path: ${databasePath}`);
    },
  };
  const firebaseStub = { database: { ServerValue: { TIMESTAMP: timestamp } } };
  const loadHelper = new Function(
    'database',
    'firebase',
    `${helperSource}\nreturn persistShiftClosureCore;`,
  );
  const persistShiftClosureCore = loadHelper(databaseStub, firebaseStub);
  await persistShiftClosureCore('QA_GESTOR', 'QA_LOG', { uid: 'QA_GESTOR' });
  assert.deepEqual(updatesSeen, [{
    'shift_reports/report-id': { uid: 'QA_GESTOR' },
    'active_sessions/QA_GESTOR': null,
    'login_logs/QA_LOG/logoutTime': timestamp,
  }]);
  assert(handlerSource.indexOf('await persistShiftClosureCore(') >= 0);
  assert(handlerSource.indexOf('await persistShiftClosureCore(')
    < handlerSource.indexOf("localStorage.removeItem('riskOps_currentUser')"));
  assert.match(handlerSource, /EMAIL_NOTIFICATION_FAILED/);
  assert.match(handlerSource, /CORE_SHIFT_CLOSE_FAILED/);
}

function testRoleBoundaries() {
  assert.match(
    appSource,
    /if \(currentUser && currentUser\.role === 'Admin'\) \{\s*renderPendingUsers\(\);\s*\}\s*renderPendingPermissions\(\);/,
  );
  assert.match(
    appSource,
    /const isAdmin = currentUser\.role === 'Admin';[\s\S]*?\[userSectionTitle, userFilterPanel, userTablePanel\]\.forEach\([\s\S]*?element\.style\.display = isAdmin \? '' : 'none';/,
  );
  // User/role administration (pending-users approval panel) must remain Admin-only,
  // even though Supervisor now gains access to Gestión de Comunicados below.
  assert.match(
    appSource,
    /const isAdmin = currentUser\.role === 'Admin';[\s\S]{0,900}canManageComunicados\(currentUser\.role\)\) adminAnnouncementsView\.style\.display = 'none';/,
  );
  // Admin and Supervisor both get the "Gestión Comunicados" nav entry / view now
  // (Supervisor may create/publish + view lecturas, but not delete — see testComunicadosCapabilities).
  assert.match(
    appSource,
    /if \(navAdminComunicados\) \{[\s\S]*?if \(canManageComunicados\(currentUser\.role\)\) \{\s*navAdminComunicados\.style\.display = 'flex';/,
  );
}

function testComunicadosCapabilities() {
  // Centralized, explicit-per-capability helpers must exist so role checks for the
  // comunicados module aren't duplicated (and can't drift) across call sites: publish,
  // view-lecturas and delete are each their own function rather than one broad check.
  assert.match(appSource, /const COMUNICADOS_PUBLISH_ROLES = new Set\(\['Admin', 'Supervisor'\]\);/);
  assert.match(appSource, /const COMUNICADOS_VIEW_LECTURAS_ROLES = new Set\(\['Admin', 'Supervisor'\]\);/);
  assert.match(appSource, /const COMUNICADOS_DELETE_ROLES = new Set\(\['Admin'\]\);/);
  assert.match(appSource, /function canPublishComunicados\(role\) \{\s*return COMUNICADOS_PUBLISH_ROLES\.has\(role\);/);
  assert.match(appSource, /function canViewComunicadoLecturas\(role\) \{\s*return COMUNICADOS_VIEW_LECTURAS_ROLES\.has\(role\);/);
  assert.match(appSource, /function canDeleteComunicados\(role\) \{\s*return COMUNICADOS_DELETE_ROLES\.has\(role\);/);
  // canManageComunicados() (nav/view visibility only) must be derived from the specific
  // capabilities above, not an independent role list that could drift out of sync.
  assert.match(
    appSource,
    /function canManageComunicados\(role\) \{\s*return canPublishComunicados\(role\) \|\| canViewComunicadoLecturas\(role\);/,
  );

  // Admin- and Supervisor-facing entry points must call the specific capability check
  // for what they actually do, not a broad "can manage" check or an inline comparison.
  assert.match(
    appSource,
    /function openNewComunicadoModal\(\) \{\s*if \(!currentUser \|\| !canPublishComunicados\(currentUser\.role\)\)/,
  );
  assert.match(
    appSource,
    /async function saveNewComunicado\(\) \{\s*if \(!currentUser \|\| !canPublishComunicados\(currentUser\.role\)\)/,
  );
  assert.match(
    appSource,
    /async function viewComunicadoLecturas\(id\) \{\s*if \(!currentUser \|\| !canViewComunicadoLecturas\(currentUser\.role\)\)/,
  );

  // saveNewComunicado() must attribute the announcement to the real signed-in Firebase
  // user (authorUid), and must never fall back to the literal string 'Admin' for the
  // display name — that would misattribute a Supervisor's own announcement as Admin's.
  assert.match(
    appSource,
    /authorUid: firebase\.auth\(\)\.currentUser\.uid/,
  );
  assert.doesNotMatch(
    extractBetween('async function saveNewComunicado(', '\n}'),
    /author: currentUser\.name \|\| 'Admin'/,
  );
  assert.match(
    extractBetween('async function saveNewComunicado(', '\n}'),
    /author: currentUser\.name \|\| currentUser\.email \|\| currentUser\.role \|\| 'Usuario'/,
  );

  // Delete must reject any role other than Admin, both at the entry function and
  // at the confirm-button handler that actually performs the Firebase write.
  assert.match(
    appSource,
    /function deleteComunicado\(id\) \{\s*if \(!currentUser \|\| !canDeleteComunicados\(currentUser\.role\)\)/,
  );
  assert.match(
    appSource,
    /confirmDeleteBtn'\)\?\.addEventListener\('click', async \(\) => \{\s*if \(!pendingDeleteComunicadoId\) return;\s*if \(!currentUser \|\| !canDeleteComunicados\(currentUser\.role\)\)/,
  );

  // The delete button in the admin table must be conditionally rendered based on
  // the same capability check, not just left visible and relying on the JS guard.
  assert.match(
    appSource,
    /const showDelete = canDeleteComunicados\(currentUser && currentUser\.role\);/,
  );
  assert.match(
    appSource,
    /const deleteBtnHtml = showDelete\s*\?\s*`<button class="btn btn-danger"/,
  );
}

function testAnnouncementContract() {
  const allowedTags = appSource.match(/const ANNOUNCEMENT_ALLOWED_TAGS = new Set\(\[([^\]]+)]\);/);
  assert(allowedTags, 'Announcement allowlist is missing');
  const tags = [...allowedTags[1].matchAll(/'([A-Za-z]+)'/g)].map((match) => match[1]);
  assert.deepEqual(tags, ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a']);
  const sanitizer = extractBetween('function sanitizeAnnouncementHref(', '// Auth Check');
  assert.match(sanitizer, /\['http', 'https', 'mailto']\.includes/);
  assert.match(sanitizer, /document\.createElement\(cleanTag\)/);
  assert.doesNotMatch(sanitizer, /cloneNode/);
  assert.equal((appSource.match(/sanitizeAnnouncementHTML\(c\.content\)/g) || []).length, 3);
  assert.match(
    appSource,
    /sanitizeAnnouncementHTML\(document\.getElementById\('comunicadoContent'\)\.innerHTML\)/,
  );
}

// ---------------------------------------------------------------------------
// Task persistence hotfix (2026-08-24): saveTaskBtn must only report success
// after a real Firebase write to active_sessions/{uid}/tasks/{taskId}, must
// validate before writing, and must never silently swallow a failure.
// ---------------------------------------------------------------------------

function makeClassList(initial) {
  const set = new Set(initial || []);
  return {
    add(...classes) { classes.forEach((c) => set.add(c)); },
    remove(...classes) { classes.forEach((c) => set.delete(c)); },
    contains(c) { return set.has(c); },
  };
}

// Shared, testable ID/name-resolution helpers (canonicalTaskId,
// isLegacyGenericTaskName, resolveTaskDisplayName, reconcileScheduledTaskWithSession,
// buildTaskReportSummaryText) introduced by the numeric-ID / "Tarea <id>" hotfix.
// Anything that exercises selectTask(), saveTaskBtn, Monitoreo reconciliation, or
// shift-report rendering needs this source in scope.
const TASK_IDENTITY_HELPERS_SOURCE = extractBetween(
  'function canonicalTaskId(',
  'function persistTaskToActiveSession(',
);

function buildSaveTaskBtnEnv(overrides = {}) {
  const persistAndCacheSource = extractBetween(
    'function persistTaskToActiveSession(',
    'function syncActiveSessionToFirebase(',
  );
  const btnSource = extractBetween(
    "const saveTaskBtn = document.getElementById('saveTaskBtn');",
    "const pForm = document.getElementById('permisosForm');",
  );

  const alerts = [];
  const updateKPICalls = [];
  const localStorageStore = {};
  const databaseCalls = [];

  const btnEl = {
    innerHTML: 'Guardar Progreso',
    disabled: false,
    classList: makeClassList(),
  };
  let capturedHandler = null;
  btnEl.addEventListener = (evtName, handler) => {
    if (evtName === 'click') capturedHandler = handler;
  };

  const activeTaskStatusEl = { classList: makeClassList(['status-pending']) };
  let currentActiveTaskStatusEl = activeTaskStatusEl;
  const statusBtnEl = {
    classList: makeClassList(overrides.statusBtnClasses || ['btn-status', 'completed', 'active']),
    textContent: overrides.statusText !== undefined ? overrides.statusText : 'Finalizada',
  };
  const obsField = overrides.obsField !== undefined
    ? overrides.obsField
    : { value: 'Observación técnica de prueba QA' };

  const documentStub = {
    getElementById(id) {
      if (id === 'saveTaskBtn') return btnEl;
      if (id === 'taskObservation') return obsField;
      return null;
    },
    querySelector(sel) {
      if (sel === '.btn-status.active') return overrides.noStatusSelected ? null : statusBtnEl;
      if (sel === '.task-item.active .task-status') return overrides.noActiveTaskEl ? null : currentActiveTaskStatusEl;
      return null;
    },
  };

  const updateResult = overrides.updateResult || (() => Promise.resolve());
  const databaseStub = {
    ref(path) {
      return {
        update(data) {
          databaseCalls.push({ path, data });
          return updateResult(path, data);
        },
      };
    },
  };
  const firebaseStub = {
    auth() {
      return { currentUser: overrides.authUser !== undefined ? overrides.authUser : { uid: 'QA_GESTOR' } };
    },
  };
  const localStorageStub = {
    setItem(key, value) { localStorageStore[key] = value; },
    getItem(key) { return localStorageStore[key]; },
  };
  const alertFn = (msg) => alerts.push(msg);
  const updateKPI = () => updateKPICalls.push(true);

  const currentUser = overrides.currentUser !== undefined
    ? overrides.currentUser
    : { uid: 'QA_GESTOR', name: 'QA Gestor', role: 'Gestor' };
  const currentActiveTaskId = overrides.currentActiveTaskId !== undefined ? overrides.currentActiveTaskId : 'task_1';
  // Matches currentActiveTaskId by default (id: 'task_1'): saveTaskBtn now requires
  // currentSelectedTask to be resolved AND match the active task's canonical ID
  // before it will persist anything (see testSaveTaskRejects*Selection below).
  const currentSelectedTask = overrides.currentSelectedTask !== undefined
    ? overrides.currentSelectedTask
    : { id: 'task_1', Tarea: 'Tarea QA' };
  const taskStateCache = overrides.taskStateCache || {};

  const loadHandler = new Function(
    'document', 'firebase', 'database', 'localStorage', 'currentUser', 'currentActiveTaskId',
    'currentSelectedTask', 'taskStateCache', 'updateKPI', 'alert',
    `${TASK_IDENTITY_HELPERS_SOURCE}\n${persistAndCacheSource}\n${btnSource}`,
  );
  loadHandler(
    documentStub, firebaseStub, databaseStub, localStorageStub, currentUser, currentActiveTaskId,
    currentSelectedTask, taskStateCache, updateKPI, alertFn,
  );
  assert(typeof capturedHandler === 'function', 'saveTaskBtn click handler was not registered');

  return {
    handler: capturedHandler,
    btnEl,
    alerts,
    databaseCalls,
    taskStateCache,
    localStorageStore,
    updateKPICalls,
    activeTaskStatusEl,
    setActiveTaskStatusEl(element) { currentActiveTaskStatusEl = element; },
  };
}

async function testSaveTaskRejectsWithoutActiveTask() {
  const env = buildSaveTaskBtnEnv({ currentActiveTaskId: null });
  await env.handler();
  assert.equal(env.databaseCalls.length, 0, 'Must not write to Firebase without an active task');
  assert.equal(env.alerts.length, 1);
  assert.match(env.alerts[0], /Selecciona una tarea/);
  assert.doesNotMatch(env.btnEl.innerHTML, /Guardado Exitosamente/);
}

async function testSaveTaskRejectsWithoutStatus() {
  const env = buildSaveTaskBtnEnv({ noStatusSelected: true });
  await env.handler();
  assert.equal(env.databaseCalls.length, 0, 'Must not write to Firebase without a selected status');
  assert.match(env.alerts[0], /Selecciona un estado/);
}

async function testSaveTaskRejectsWithoutObservation() {
  const env = buildSaveTaskBtnEnv({ obsField: { value: '   ' } });
  await env.handler();
  assert.equal(env.databaseCalls.length, 0, 'Must not write to Firebase without a mandatory observation');
  assert.match(env.alerts[0], /Notas Técnicas/);
}

async function testSaveTaskDoesNotShowSuccessBeforeFirebaseResolves() {
  let resolveUpdate;
  const pending = new Promise((resolve) => { resolveUpdate = resolve; });
  const env = buildSaveTaskBtnEnv({ updateResult: () => pending });

  const clickPromise = env.handler();
  await Promise.resolve(); // let the synchronous prefix of the async handler run
  assert.match(env.btnEl.innerHTML, /Guardando/);
  assert.doesNotMatch(env.btnEl.innerHTML, /Guardado Exitosamente/);
  assert.equal(env.btnEl.disabled, true);

  resolveUpdate();
  await clickPromise;
  assert.match(env.btnEl.innerHTML, /Guardado Exitosamente/);
}

async function testSaveTaskSuccessUpdatesFirebaseCacheAndUI() {
  const env = buildSaveTaskBtnEnv();
  await env.handler();

  assert.equal(env.databaseCalls.length, 1);
  assert.equal(env.databaseCalls[0].path, 'active_sessions/QA_GESTOR/tasks/task_1');
  assert.equal(env.databaseCalls[0].data.status, 'Finalizada');
  assert.equal(env.databaseCalls[0].data.observation, 'Observación técnica de prueba QA');
  assert.equal(typeof env.databaseCalls[0].data.updatedAt, 'number');

  assert.equal(env.taskStateCache.task_1.status, 'Finalizada');
  assert(env.localStorageStore.riskOps_cache, 'Expected local cache backup to be written');

  assert.match(env.btnEl.innerHTML, /Guardado Exitosamente/);
  assert(env.btnEl.classList.contains('btn-success'));
  assert(env.activeTaskStatusEl.classList.contains('status-completed'));
  assert.equal(env.updateKPICalls.length, 1);
  assert.equal(env.btnEl.disabled, false);
}

async function testSaveTaskKeepsVisualTargetWhenSelectionChangesDuringWrite() {
  let resolveUpdate;
  const pendingUpdate = new Promise((resolve) => { resolveUpdate = resolve; });
  const env = buildSaveTaskBtnEnv({ updateResult: () => pendingUpdate });
  const taskBStatusEl = { classList: makeClassList(['status-pending']) };

  const saveTaskAPromise = env.handler();
  await Promise.resolve();
  assert.equal(env.databaseCalls[0].path, 'active_sessions/QA_GESTOR/tasks/task_1');
  assert.equal(env.databaseCalls[0].data.name, 'Tarea QA');

  // Simula que el Gestor selecciona B mientras la escritura de A sigue pendiente.
  env.setActiveTaskStatusEl(taskBStatusEl);
  resolveUpdate();
  await saveTaskAPromise;

  assert(env.activeTaskStatusEl.classList.contains('status-completed'), 'Only the task captured before the Firebase await must be colored');
  assert(!env.activeTaskStatusEl.classList.contains('status-pending'));
  assert(taskBStatusEl.classList.contains('status-pending'), 'The newly selected task must remain untouched');
  assert(!taskBStatusEl.classList.contains('status-completed'));
}

async function testSaveTaskPermissionDeniedShowsErrorNotSuccess() {
  const error = new Error('permission_denied');
  error.code = 'PERMISSION_DENIED';
  const env = buildSaveTaskBtnEnv({ updateResult: () => Promise.reject(error) });

  await env.handler();

  assert.doesNotMatch(env.btnEl.innerHTML, /Guardado Exitosamente/);
  assert.match(env.btnEl.innerHTML, /Error al guardar/);
  assert.equal(env.alerts.length, 1);
  assert.match(env.alerts[0], /permiso/i);
  assert.equal(env.btnEl.disabled, false);
  // Local backup must survive a failed sync so the user can retry.
  assert.equal(env.taskStateCache.task_1.status, 'Finalizada');
}

async function testSaveTaskNetworkErrorAllowsRetry() {
  let attempt = 0;
  const env = buildSaveTaskBtnEnv({
    updateResult: () => {
      attempt += 1;
      return attempt === 1 ? Promise.reject(new Error('NETWORK_ERROR')) : Promise.resolve();
    },
  });

  await env.handler();
  assert.match(env.btnEl.innerHTML, /Error al guardar/);
  assert.equal(env.btnEl.disabled, false, 'Button must be re-enabled after a failure so the user can retry');

  await env.handler();
  assert.equal(env.databaseCalls.length, 2, 'Retry must issue a new Firebase write');
  assert.match(env.btnEl.innerHTML, /Guardado Exitosamente/);
}

function testSelectTaskDoesNotDependOnWindowEvent() {
  assert.doesNotMatch(appSource, /window\.event/);
  assert.match(appSource, /window\.selectTask = function\(taskId, evt\) \{/);
  assert.match(appSource, /const eventTarget = evt && evt\.currentTarget;/);
  assert.match(
    appSource,
    /onclick="selectTask\(decodeURIComponent\('\$\{encodeInlineHandlerArg\(task\.id\)\}'\), event\)"/,
  );

  const selectTaskSource = extractBetween(
    'window.selectTask = function(taskId, evt) {',
    '\n// Task Status Buttons Interaction',
  );
  const clickedEl = { classList: makeClassList() };
  const otherActiveEl = { classList: makeClassList(['active']) };
  const documentStub = {
    querySelector(sel) { return { classList: { add: () => {}, remove: () => {} } }; },
    getElementById(id) {
      if (id === 'currentTaskTitle') return { textContent: '' };
      if (id === 'taskObservation') return { value: '' };
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '.task-item') return [otherActiveEl, clickedEl];
      if (sel === '.btn-status') return [];
      return [];
    },
  };
  const windowStub = {};
  const loadSelectTask = new Function(
    'window', 'document', 'allTasks', 'currentUser', 'currentSelectedTask', 'currentActiveTaskId', 'taskStateCache', 'renderQuickDocs',
    `${TASK_IDENTITY_HELPERS_SOURCE}\n${selectTaskSource}\nreturn { selectTask: window.selectTask, getCurrentActiveTaskId: () => currentActiveTaskId };`,
  );
  const { selectTask, getCurrentActiveTaskId } = loadSelectTask(windowStub, documentStub, [{ id: 'task_9', Tarea: 'Test Task' }], null, null, null, {}, () => {});

  // No global "event" exists in this sandbox at all: selectTask must still work
  // correctly using only the explicitly passed evt argument.
  selectTask('task_9', { currentTarget: clickedEl });

  assert.equal(getCurrentActiveTaskId(), 'task_9');
  assert(clickedEl.classList.contains('active'), 'Expected the clicked element to become active via the evt param');
  assert(!otherActiveEl.classList.contains('active'), 'Expected the previously active element to be cleared');
}

// ---------------------------------------------------------------------------
// Numeric task-ID hotfix: allTasks carries number IDs (loadExcelTasks():
// row.id = idx) but selectTask() always receives a string (decodeURIComponent()
// of the onclick serialized by renderTree()). Before canonicalTaskId(), a task
// whose original id is the number 0 could never be found (0 !== "0"), leaving
// currentSelectedTask stale and the previous task's comment "stuck" when a
// Gestor switched to another task.
// ---------------------------------------------------------------------------
function buildSelectTaskEnv(overrides = {}) {
  const selectTaskSource = extractBetween(
    'window.selectTask = function(taskId, evt) {',
    '\n// Task Status Buttons Interaction',
  );

  const titleEl = { textContent: '' };
  const obsEl = { value: '' };
  const statusButtons = [
    { textContent: 'Pendiente', classList: makeClassList(['btn-status', 'pending']) },
    { textContent: 'En Proceso', classList: makeClassList(['btn-status', 'in-progress']) },
    { textContent: 'Finalizada', classList: makeClassList(['btn-status', 'completed']) },
    { textContent: 'No Realizada', classList: makeClassList(['btn-status', 'not-done']) },
  ];

  const documentStub = {
    getElementById(id) {
      if (id === 'currentTaskTitle') return titleEl;
      if (id === 'taskObservation') return obsEl;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '.btn-status') return statusButtons;
      if (sel === '.task-item') return [];
      return [];
    },
    querySelector(sel) {
      if (sel === '.btn-status.pending') return statusButtons[0];
      return null;
    },
  };

  const allTasks = overrides.allTasks || [
    { id: 0, Tarea: 'Tarea Cero', 'Detalle de Tarea': 'Detalle de la tarea cero' },
    { id: 1, Tarea: 'Tarea Uno', 'Detalle de Tarea': 'Detalle de la tarea uno' },
  ];
  const currentUser = overrides.currentUser || { uid: 'QA_GESTOR', name: 'QA Gestor', role: 'Gestor' };
  const taskStateCache = overrides.taskStateCache || {};
  const renderQuickDocsCalls = [];
  const renderQuickDocs = (name) => renderQuickDocsCalls.push(name);

  const loader = new Function(
    'window', 'document', 'allTasks', 'currentUser', 'currentSelectedTaskInitial', 'currentActiveTaskIdInitial',
    'taskStateCache', 'renderQuickDocs',
    `
    let currentSelectedTask = currentSelectedTaskInitial;
    let currentActiveTaskId = currentActiveTaskIdInitial;
    ${TASK_IDENTITY_HELPERS_SOURCE}
    ${selectTaskSource}
    return {
      selectTask: window.selectTask,
      getCurrentActiveTaskId: () => currentActiveTaskId,
      getCurrentSelectedTask: () => currentSelectedTask,
    };
    `,
  );
  const { selectTask, getCurrentActiveTaskId, getCurrentSelectedTask } = loader(
    {}, documentStub, allTasks, currentUser, null, null, taskStateCache, renderQuickDocs,
  );

  return {
    selectTask, getCurrentActiveTaskId, getCurrentSelectedTask,
    titleEl, obsEl, statusButtons, taskStateCache, renderQuickDocsCalls,
  };
}

function clickEvt() {
  return { currentTarget: { classList: makeClassList() } };
}

function testSelectTaskResolvesNumericIdZero() {
  const env = buildSelectTaskEnv();
  env.selectTask('0', clickEvt());

  assert.equal(env.getCurrentActiveTaskId(), '0', 'currentActiveTaskId must be canonicalized to a string');
  const selected = env.getCurrentSelectedTask();
  assert(selected, 'selectTask("0", evt) must resolve the task whose original id is the number 0');
  assert.equal(selected.id, 0);
  assert.equal(env.titleEl.textContent, 'Tarea Cero');
  assert(env.statusButtons[0].classList.contains('active'), 'A task with no cached progress must default to Pendiente');
  assert.equal(env.obsEl.value, '', 'A task with no cached progress must start with an empty observation');
}

function testSelectTaskSwitchingClearsObservationAndRestoresPerTaskCache() {
  const env = buildSelectTaskEnv();

  // 1) Select task 0, then simulate having just saved a comment/status for it
  //    (mirrors what saveTaskBtn writes into taskStateCache — see buildSaveTaskBtnEnv).
  env.selectTask('0', clickEvt());
  env.taskStateCache['0'] = { name: 'Tarea Cero', status: 'Finalizada', observation: 'Comentario de la tarea 0', updatedAt: 1 };

  // 2) Switch to task 1, which has no cached progress: the previous task's comment
  //    must NOT leak into the new task, and the status must reset to Pendiente.
  //    This is the exact symptom reported: "guarda el comentario ... cambia a otra
  //    tarea, permanece el comentario anterior".
  env.selectTask('1', clickEvt());
  assert.equal(env.getCurrentSelectedTask().id, 1);
  assert.equal(env.obsEl.value, '', "Switching to an uncached task must clear the previous task's observation");
  assert(env.statusButtons[0].classList.contains('active'), 'An uncached task must select Pendiente');
  assert(!env.statusButtons[2].classList.contains('active'), "The previous task's Finalizada status must not leak into the new task");

  // 3) Switch back to task 0: only its own comment/status must be restored.
  env.selectTask('0', clickEvt());
  assert.equal(env.getCurrentSelectedTask().id, 0);
  assert.equal(env.obsEl.value, 'Comentario de la tarea 0');
  assert(env.statusButtons[2].classList.contains('active'), 'Task 0 must restore its own Finalizada status');
  assert(!env.statusButtons[0].classList.contains('active'), 'Pendiente must not remain active once a cached status is restored');
}

// ---------------------------------------------------------------------------
// saveTaskBtn must refuse to persist an unresolved/stale selection instead of
// falling back to a generic "Tarea <id>" name (root cause: allTasks.find()
// failing on a number/string ID mismatch used to leave currentSelectedTask
// stale while currentActiveTaskId still advanced to the new ID).
// ---------------------------------------------------------------------------
async function testSaveTaskRejectsUnresolvedSelection() {
  const env = buildSaveTaskBtnEnv({ currentActiveTaskId: '0', currentSelectedTask: null });
  await env.handler();
  assert.equal(env.databaseCalls.length, 0, 'Must not write to Firebase when the selection could not be resolved');
  assert.equal(env.taskStateCache['0'], undefined, 'Must never cache a record under an unresolved task ID');
  assert.equal(env.alerts.length, 1);
  assert.match(env.alerts[0], /Vuelve a seleccionarla/);
}

async function testSaveTaskRejectsMismatchedSelection() {
  // currentActiveTaskId points at task "1" but currentSelectedTask is still the
  // previously selected task "0" (a stale reference from before the switch).
  const env = buildSaveTaskBtnEnv({
    currentActiveTaskId: '1',
    currentSelectedTask: { id: '0', Tarea: 'Tarea Cero' },
  });
  await env.handler();
  assert.equal(env.databaseCalls.length, 0, 'A mismatched stale selection must never be persisted under the new task ID');
  assert.equal(env.taskStateCache['1'], undefined);
}

async function testSaveTaskNeverPersistsGenericFallbackName() {
  const env = buildSaveTaskBtnEnv({
    currentActiveTaskId: 0,
    currentSelectedTask: { id: 0, Tarea: 'Revisión de Eventos' },
  });
  await env.handler();

  assert.equal(env.databaseCalls.length, 1);
  assert.equal(env.databaseCalls[0].path, 'active_sessions/QA_GESTOR/tasks/0', 'A numeric-origin ID must be canonicalized to its string form in the write path');
  assert.equal(env.databaseCalls[0].data.name, 'Revisión de Eventos');
  assert.doesNotMatch(env.databaseCalls[0].data.name, /^Tarea\s+\d+$/, 'A valid selection must never persist the generic "Tarea <id>" fallback name');
}

function testSaveTaskSourceNeverBuildsGenericFallbackName() {
  const btnSource = extractBetween(
    "const saveTaskBtn = document.getElementById('saveTaskBtn');",
    "const pForm = document.getElementById('permisosForm');",
  );
  assert.doesNotMatch(btnSource, /'Tarea '\s*\+\s*taskIdStr/, 'saveTaskBtn must never build a generic "Tarea <id>" fallback name');
  assert.match(
    btnSource,
    /canonicalTaskId\(currentSelectedTask\.id\) !== taskIdStr/,
    'saveTaskBtn must validate the selection resolved to the active task before persisting',
  );
}

// ---------------------------------------------------------------------------
// Monitoreo reconciliation (renderActiveSessionsDashboard / openMonitoreoDetails):
// both surfaces must use the SAME reconcileScheduledTaskWithSession() helper,
// matching by taskNamesMatch() (never exact equality) and resolving legacy
// "Tarea <id>" names against allTasks, so a Supervisor/Admin sees the correct
// color for a confirmed Firebase save without waiting for shift close.
// ---------------------------------------------------------------------------
function buildTaskIdentityHelpers(allTasksFixture) {
  const taskMatchHelpersSource = extractBetween('function cleanText(', 'const MONTHS_MAP');
  const loader = new Function(
    'allTasks',
    `${taskMatchHelpersSource}\n${TASK_IDENTITY_HELPERS_SOURCE}\nreturn { reconcileScheduledTaskWithSession, resolveTaskDisplayName, isLegacyGenericTaskName, canonicalTaskId, taskNamesMatch, buildTaskReportSummaryText };`,
  );
  return loader(allTasksFixture || []);
}

function testReconcileScheduledTaskExactNameMatch() {
  const helpers = buildTaskIdentityHelpers([]);
  const sessionTasks = { t1: { name: 'Revisión de Eventos', status: 'Finalizada', observation: 'ok' } };
  const result = helpers.reconcileScheduledTaskWithSession('Revisión de Eventos', sessionTasks);
  assert.equal(result.status, 'Finalizada');
  assert.equal(result.observation, 'ok');
}

function testReconcileScheduledTaskAcceptsNameVariant() {
  const helpers = buildTaskIdentityHelpers([]);
  // normalizeTaskName() treats these as equivalent (see taskNamesMatch), even
  // though they are not string-equal — this is the "cronograma vs. catálogo"
  // variant case called out explicitly in the bug report.
  const sessionTasks = { t1: { name: 'Billetera Usuarios', status: 'Finalizada', observation: 'ok variante' } };
  const result = helpers.reconcileScheduledTaskWithSession('Revisión de Billetera Usuarios PDV', sessionTasks);
  assert.equal(result.status, 'Finalizada', 'A name variant accepted by taskNamesMatch() must still resolve to Finalizada');
}

function testReconcileScheduledTaskResolvesLegacyGenericName() {
  const allTasksFixture = [{ id: 0, Tarea: 'Conciliación de Pasarelas' }];
  const helpers = buildTaskIdentityHelpers(allTasksFixture);
  const sessionTasks = { '0': { name: 'Tarea 0', status: 'Finalizada', observation: 'listo' } };
  const result = helpers.reconcileScheduledTaskWithSession('Conciliación de Pasarelas', sessionTasks);
  assert.equal(result.status, 'Finalizada', 'A legacy { key: "0", name: "Tarea 0" } entry must reconcile via allTasks');
}

function testReconcileScheduledTaskExcludesExtraEntries() {
  const helpers = buildTaskIdentityHelpers([]);
  const sessionTasks = { extra_123: { name: '[EXTRA] Revisión de Eventos', status: 'Finalizada', observation: 'ok' } };
  const result = helpers.reconcileScheduledTaskWithSession('Revisión de Eventos', sessionTasks);
  assert.equal(result.status, 'Pendiente', 'An extra_* entry must never be matched against a scheduled task, even with a similar name');
}

function testResolveTaskDisplayNameNeverExposesRawIdWhenUnresolved() {
  const helpers = buildTaskIdentityHelpers([]); // no catalog available to resolve against
  const name = helpers.resolveTaskDisplayName('7', { name: 'Tarea 7' });
  assert.equal(name, 'Tarea programada (nombre no disponible)');
  assert.doesNotMatch(name, /\b7\b/, 'Must never expose the raw technical ID to the end user');
}

function testResolveTaskDisplayNameKeepsRealNamesUnchanged() {
  const helpers = buildTaskIdentityHelpers([]);
  const name = helpers.resolveTaskDisplayName('extra_1', { name: '[EXTRA] Revisión especial' });
  assert.equal(name, '[EXTRA] Revisión especial', 'A real (non-legacy-pattern) name must pass through unchanged');
}

function testMonitoreoCardAndModalUseSameReconciliation() {
  const dashboardSource = extractBetween('function renderActiveSessionsDashboard(', 'function viewTimelineInMonitoreo(');
  const modalSource = extractBetween('window.openMonitoreoDetails = function(uid) {', 'function populateGestoresDropdown(');
  assert.match(dashboardSource, /reconcileScheduledTaskWithSession\(/);
  assert.match(modalSource, /reconcileScheduledTaskWithSession\(/);
  assert.doesNotMatch(dashboardSource, /tasks\[key\]\.name === taskName/, 'The dashboard card must no longer use exact-equality matching');
  assert.doesNotMatch(modalSource, /tasks\[key\]\.name === taskName/, 'The details modal must no longer use exact-equality matching');

  // Extra tasks must still be listed exactly once, keyed off extra_*, in both surfaces.
  assert.match(dashboardSource, /key\.startsWith\('extra_'\)/);
  assert.match(modalSource, /key\.startsWith\('extra_'\)/);
  // The modal's raw-tasks fallback (used when the cronograma has no assignments loaded
  // yet) must also resolve legacy names instead of showing the raw key/generic name.
  assert.match(modalSource, /resolveTaskDisplayName\(key, tasks\[key\]\)/);
}

// ---------------------------------------------------------------------------
// buildTaskReportSummaryText(): Historial de Turnos, the "Ver Todo" modal, and
// the PDF export must all prioritize the structured report.tasks object
// (names resolved via resolveTaskDisplayName) over the legacy report.reporte
// text, so a legacy "Tarea <id>" baked into old text never leaks into a
// visible surface.
// ---------------------------------------------------------------------------
function testBuildTaskReportSummaryTextPrefersStructuredTasksOverLegacyText() {
  const helpers = buildTaskIdentityHelpers([{ id: 3, Tarea: 'Conciliación de Pasarelas' }]);
  const report = {
    reporte: '\n[ FINALIZADA ] - Tarea 3\nObservación: legado\n',
    tasks: { '3': { name: 'Tarea 3', status: 'Finalizada', observation: 'obs estructurada' } },
  };
  const text = helpers.buildTaskReportSummaryText(report);
  assert.match(text, /Conciliación de Pasarelas/);
  assert.doesNotMatch(text, /Tarea\s+3\b/);
}

function testBuildTaskReportSummaryTextFallsBackToLegacyTextWhenNoStructuredTasks() {
  const helpers = buildTaskIdentityHelpers([]);
  const report = {
    reporte: '\n[ FINALIZADA ] - Revisión Manual\nObservación: ok\n\n=== BITÁCORA DE TIEMPOS ===\n- Almuerzo: inicio 12:00 fin 13:00\n',
  };
  const text = helpers.buildTaskReportSummaryText(report);
  assert.match(text, /Revisión Manual/);
  assert.doesNotMatch(text, /BITÁCORA DE TIEMPOS/, 'Must strip the bitácora section from the task-only summary');
}

function testBuildTaskReportSummaryTextKeepsExtraPrefixAndNeverLeaksGenericName() {
  const helpers = buildTaskIdentityHelpers([]);
  const report = {
    tasks: {
      '0': { name: 'Tarea 0', status: 'Pendiente', observation: '' },
      extra_1: { name: '[EXTRA] Revisión especial', status: 'Finalizada', observation: 'ok' },
    },
  };
  const text = helpers.buildTaskReportSummaryText(report);
  assert.doesNotMatch(text, /Tarea\s+0\b/);
  assert.match(text, /Tarea programada \(nombre no disponible\)/);
  assert.match(text, /\[EXTRA\] Revisión especial/);
}

function testShiftHistorySurfacesUseStructuredTaskSummary() {
  const exportSource = extractBetween(
    'window.exportShiftReport = async function(fb_id) {',
    '// Logic for Shift Reports History',
  );
  const filtersSource = extractBetween(
    'function applyShiftReportsFilters() {',
    "window.openShiftDetailModal = function(fb_id) {",
  );
  const modalSource = extractBetween(
    "window.openShiftDetailModal = function(fb_id) {",
    "document.getElementById('shiftDetailModal').classList.add('active');",
  );
  [
    ['exportShiftReport', exportSource],
    ['applyShiftReportsFilters', filtersSource],
    ['openShiftDetailModal', modalSource],
  ].forEach(([name, src]) => {
    assert.match(src, /buildTaskReportSummaryText\(/, `${name} must build its task summary via buildTaskReportSummaryText()`);
  });
}

function testMergeTaskCachesConflictResolution() {
  const mergeSource = extractBetween('function mergeTaskCaches(', 'function syncActiveSessionToFirebase(');
  const loadMerge = new Function(`${mergeSource}\nreturn mergeTaskCaches;`);
  const mergeTaskCaches = loadMerge();

  const local = {
    task_a: { status: 'Pendiente', observation: 'local a (stale)', updatedAt: 100 },
    task_b: { status: 'En Proceso', observation: 'local b (newer)', updatedAt: 500 },
  };
  const remote = {
    task_a: { status: 'Finalizada', observation: 'remote a (newer)', updatedAt: 300 },
    task_b: { status: 'Pendiente', observation: 'remote b (stale)', updatedAt: 200 },
    task_c: { status: 'Finalizada', observation: 'remote only', updatedAt: 50 },
  };

  const merged = mergeTaskCaches(local, remote);
  assert.equal(merged.task_a.observation, 'remote a (newer)', 'A newer remote entry must win over a stale local one');
  assert.equal(merged.task_b.observation, 'local b (newer)', 'A stale remote write must not overwrite a newer local entry');
  assert.equal(merged.task_c.observation, 'remote only', 'Remote-only entries must be recovered on reload');
}

function testMergeTaskCachesPrefersLocalOnTieOrMissingUpdatedAt() {
  const mergeSource = extractBetween('function mergeTaskCaches(', 'function syncActiveSessionToFirebase(');
  const loadMerge = new Function(`${mergeSource}\nreturn mergeTaskCaches;`);
  const mergeTaskCaches = loadMerge();

  const local = {
    // Exact tie: both sides have the same updatedAt.
    task_tie: { status: 'En Proceso', observation: 'local tie', updatedAt: 200 },
    // Legacy local entry: no updatedAt at all (pre-hotfix cache).
    task_legacy_local: { status: 'Finalizada', observation: 'local legacy (no updatedAt)' },
    // Local has updatedAt, remote is legacy (no updatedAt).
    task_legacy_remote: { status: 'Finalizada', observation: 'local newer-format', updatedAt: 100 },
    // Both sides legacy: neither has updatedAt.
    task_both_legacy: { status: 'Pendiente', observation: 'local both-legacy' },
  };
  const remote = {
    task_tie: { status: 'Finalizada', observation: 'remote tie', updatedAt: 200 },
    task_legacy_local: { status: 'Pendiente', observation: 'remote for legacy-local', updatedAt: 999 },
    task_legacy_remote: { status: 'Pendiente', observation: 'remote legacy (no updatedAt)' },
    task_both_legacy: { status: 'Finalizada', observation: 'remote both-legacy' },
  };

  const merged = mergeTaskCaches(local, remote);
  assert.equal(merged.task_tie.observation, 'local tie', 'On an exact updatedAt tie, the legacy local cache must prevail');
  assert.equal(merged.task_legacy_local.observation, 'local legacy (no updatedAt)', 'A local entry without updatedAt must not be overwritten by a remote entry');
  assert.equal(merged.task_legacy_remote.observation, 'local newer-format', 'A remote entry without updatedAt must never win, even if the local entry has one');
  assert.equal(merged.task_both_legacy.observation, 'local both-legacy', 'When neither side has updatedAt, the local cache must prevail');
}

async function testFetchOwnActiveSessionTasksReadsOnlyOwnPath() {
  const fetchSource = extractBetween('async function fetchOwnActiveSessionTasks(', 'function mergeTaskCaches(');
  const refCalls = [];
  const databaseStub = {
    ref(path) {
      refCalls.push(path);
      return {
        once: async () => ({ exists: () => true, val: () => ({ task_1: { status: 'Finalizada', updatedAt: 10 } }) }),
      };
    },
  };
  const loadFetch = new Function('database', `${fetchSource}\nreturn fetchOwnActiveSessionTasks;`);
  const fetchOwnActiveSessionTasks = loadFetch(databaseStub);

  const result = await fetchOwnActiveSessionTasks('QA_GESTOR');
  assert.deepEqual(refCalls, ['active_sessions/QA_GESTOR/tasks'], 'Must only read the signed-in Gestor\'s own session tasks');
  assert.equal(result.ok, true);
  assert.equal(result.tasks.task_1.status, 'Finalizada');
}

async function testFetchOwnActiveSessionTasksReturnsNotOkOnReadFailure() {
  // A read failure must NEVER be silently coerced into "no remote tasks":
  // that would make the caller think Firebase has nothing, and could cause
  // it to (re)migrate/overwrite tasks that actually already exist there.
  const fetchSource = extractBetween('async function fetchOwnActiveSessionTasks(', 'function mergeTaskCaches(');
  const databaseStub = {
    ref() {
      return {
        once: async () => { throw new Error('PERMISSION_DENIED'); },
      };
    },
  };
  const loadFetch = new Function('database', `${fetchSource}\nreturn fetchOwnActiveSessionTasks;`);
  const fetchOwnActiveSessionTasks = loadFetch(databaseStub);

  const result = await fetchOwnActiveSessionTasks('QA_GESTOR');
  assert.deepEqual(result, { ok: false, tasks: {} }, 'A failed remote read must be reported explicitly, never as an empty-but-successful result');
}

// ---------------------------------------------------------------------------
// recoverGestorTaskProgress() orchestrates the whole recovery + migration
// flow "fail-safe": a failed remote read, or an authenticated identity that
// doesn't match currentUser.uid right before writing, must both result in
// zero Firebase writes and never be reported as a successful recovery.
// ---------------------------------------------------------------------------
function buildRecoverGestorTaskProgressEnv(overrides = {}) {
  const recoverySource = extractBetween('async function fetchOwnActiveSessionTasks(', '// Task Status Buttons Interaction');

  const localStorageStore = {};
  const transactionCalls = [];
  const onceCalls = [];

  const remoteReadShouldFail = !!overrides.remoteReadShouldFail;
  const remoteTasks = overrides.remoteTasks || {};
  const currentValues = overrides.currentValues || {};
  const failFor = overrides.failFor || [];

  const databaseStub = {
    ref(refPath) {
      return {
        once: async () => {
          onceCalls.push(refPath);
          if (remoteReadShouldFail) throw new Error('PERMISSION_DENIED');
          return { exists: () => Object.keys(remoteTasks).length > 0, val: () => remoteTasks };
        },
        transaction(updateFn) {
          transactionCalls.push(refPath);
          const taskId = refPath.split('/').pop();
          if (failFor.includes(taskId)) return Promise.reject(new Error('NETWORK_ERROR'));
          const currentValue = Object.prototype.hasOwnProperty.call(currentValues, taskId) ? currentValues[taskId] : null;
          const nextValue = updateFn(currentValue);
          if (nextValue === undefined) return Promise.resolve({ committed: false, snapshot: { val: () => currentValue } });
          return Promise.resolve({ committed: true, snapshot: { val: () => nextValue } });
        },
      };
    },
  };
  const localStorageStub = {
    setItem(key, value) { localStorageStore[key] = value; },
    getItem(key) { return localStorageStore[key]; },
  };
  const firebaseStub = {
    auth() {
      return { currentUser: overrides.authUser !== undefined ? overrides.authUser : { uid: 'QA_GESTOR' } };
    },
  };
  const initialTaskStateCache = overrides.taskStateCache || {};

  const loader = new Function(
    'window', 'database', 'localStorage', 'firebase', 'taskStateCache',
    `${recoverySource}\nreturn { recoverGestorTaskProgress, getTaskStateCache: () => taskStateCache };`,
  );
  const { recoverGestorTaskProgress, getTaskStateCache } = loader(
    {}, databaseStub, localStorageStub, firebaseStub, initialTaskStateCache,
  );

  return { recoverGestorTaskProgress, getTaskStateCache, transactionCalls, onceCalls, localStorageStore };
}

async function testRecoverGestorTaskProgressAbortsOnRemoteReadFailure() {
  const env = buildRecoverGestorTaskProgressEnv({
    remoteReadShouldFail: true,
    taskStateCache: { task_local: { name: 'Local', status: 'Finalizada', observation: 'obs', updatedAt: 100 } },
  });

  const result = await env.recoverGestorTaskProgress('QA_GESTOR');

  assert.equal(result.status, 'REMOTE_READ_FAILED');
  assert.equal(result.failedMigrationsCount, 0);
  assert.equal(env.transactionCalls.length, 0, 'A failed remote read must never trigger any Firebase write');
  assert.equal(env.localStorageStore.riskOps_cache, undefined, 'The local cache must be left completely untouched on a failed remote read');
}

async function testRecoverGestorTaskProgressSkipsMigrationOnIdentityMismatch() {
  const env = buildRecoverGestorTaskProgressEnv({
    remoteTasks: {},
    authUser: { uid: 'SOME_OTHER_UID' }, // No coincide con el uid pasado a recoverGestorTaskProgress
    taskStateCache: { task_local: { name: 'Local', status: 'Finalizada', observation: 'obs local' } },
  });

  const result = await env.recoverGestorTaskProgress('QA_GESTOR');

  assert.equal(result.status, 'IDENTITY_MISMATCH');
  assert.equal(result.failedMigrationsCount, 0);
  assert.equal(env.transactionCalls.length, 0, 'A mismatched authenticated identity must never produce a Firebase write, even if the read succeeded');
}

async function testRecoverGestorTaskProgressMigratesLocalOnlyTaskOnHappyPath() {
  const env = buildRecoverGestorTaskProgressEnv({
    remoteTasks: {},
    taskStateCache: { task_local: { name: 'Local', status: 'Finalizada', observation: 'obs local' } }, // legacy: no updatedAt
  });

  const result = await env.recoverGestorTaskProgress('QA_GESTOR');

  assert.equal(result.status, 'OK');
  assert.equal(result.failedMigrationsCount, 0);
  assert.deepEqual(env.transactionCalls, ['active_sessions/QA_GESTOR/tasks/task_local']);
  assert.equal(typeof env.getTaskStateCache().task_local.updatedAt, 'number');
}

function testRecoverGestorTaskProgressOrdersSafetyChecksCorrectly() {
  const source = extractBetween('async function recoverGestorTaskProgress(uid) {', '\n// Task Status Buttons Interaction');
  assert.match(source, /if \(!remoteResult\.ok\) \{\s*return \{ status: 'REMOTE_READ_FAILED'/);
  assert.match(source, /const authUser = firebase\.auth\(\)\.currentUser;/);
  assert.match(source, /if \(!authUser \|\| authUser\.uid !== uid\) \{/);
  // The identity check must happen strictly before the migration call.
  assert(source.indexOf('authUser.uid !== uid') < source.indexOf('migrateLocalTasksToActiveSession('));
  // The remote-read-failure short-circuit must happen strictly before merge/migration.
  assert(source.indexOf('REMOTE_READ_FAILED') < source.indexOf('mergeTaskCaches('));
  assert(source.indexOf('REMOTE_READ_FAILED') < source.indexOf('migrateLocalTasksToActiveSession('));
}

function testGestorTaskRecoveryWiredIntoInitApp() {
  const initAppSource = extractBetween('async function initApp() {', 'loadTeletrabajo();');
  assert.match(initAppSource, /currentUser\.role === 'Gestor' && currentUser\.uid/);
  assert.match(initAppSource, /recoverGestorTaskProgress\(currentUser\.uid\)/);
  assert.match(initAppSource, /recovery\.status === 'REMOTE_READ_FAILED'/);
  assert.match(initAppSource, /recovery\.failedMigrationsCount > 0/);
  assert.match(initAppSource, /alert\(/);
  // Recovery must run before the initial tree render (loadExcelTasks -> renderTree
  // is called from within initApp), never read from a hardcoded/other UID, and
  // never touch other sessions.
  assert(
    initAppSource.indexOf('recoverGestorTaskProgress(') < initAppSource.indexOf('await loadExcelTasks();'),
  );
  assert.doesNotMatch(initAppSource, /active_sessions\/\$\{[^}]*other/i);
  // This recovery step must never report itself as a success.
  assert.doesNotMatch(initAppSource, /recuperaci[oó]n exitosa/i);
}

function testShiftCloseStillIncludesTasksInReport() {
  const handleEndShiftSource = extractBetween('async function handleEndShift()', '// Inicializar inmediatamente');
  assert.match(handleEndShiftSource, /tasks: taskStateCache,/);
  assert.match(handleEndShiftSource, /await persistShiftClosureCore\(reportUid, localUser\.loginLogId, shiftReportObject\)/);
}

// ---------------------------------------------------------------------------
// syncActiveSessionToFirebase() must only ever ferry session metadata. Task
// persistence is exclusively the job of explicit, per-taskId operations
// (persistTaskToActiveSession), never a periodic bulk resend of taskStateCache.
// ---------------------------------------------------------------------------
function testSyncActiveSessionOnlySyncsMetadataNotTasks() {
  const syncSource = extractBetween('function syncActiveSessionToFirebase(', 'function updateKPI(');
  assert.doesNotMatch(
    syncSource,
    /taskStateCache/,
    'syncActiveSessionToFirebase must never read or resend taskStateCache',
  );
  assert.doesNotMatch(
    syncSource,
    /\/tasks/,
    'syncActiveSessionToFirebase must never touch the active_sessions/{uid}/tasks subtree',
  );
  assert.match(
    syncSource,
    /const syncPromise = database\.ref\(`active_sessions\/\$\{uid\}`\)\.update\(sessionMetadata\);/,
    'Must update only active_sessions/{uid} with a metadata-only payload',
  );
  assert.match(syncSource, /return syncPromise;/);

  // Exactly two functions in the whole file may target a specific task path
  // (active_sessions/{uid}/tasks/{taskId}) — persistTaskToActiveSession() for
  // direct, Firebase-confirmed interactive saves (saveTaskBtn/saveExtraTask),
  // and persistTaskIfNotNewerRemote() for the recovery migration's
  // conditional transaction — and neither is a bulk resend of every task.
  const taskPathOccurrences = (appSource.match(/active_sessions\/\$\{uid\}\/tasks\/\$\{taskId\}/g) || []).length;
  assert.equal(taskPathOccurrences, 2, 'Only persistTaskToActiveSession() and persistTaskIfNotNewerRemote() may target active_sessions/{uid}/tasks/{taskId}');
  assert.match(appSource, /function persistTaskToActiveSession\(uid, taskId, taskData\) \{/);
  assert.match(appSource, /function persistTaskIfNotNewerRemote\(uid, taskId, record\) \{/);
  assert.match(appSource, /return database\.ref\(`active_sessions\/\$\{uid\}\/tasks\/\$\{taskId\}`\)\.transaction\(/);
}

// ---------------------------------------------------------------------------
// saveExtraTask() (the "Añadir Tarea Adicional" modal) must follow the same
// confirmed-persistence contract as saveTaskBtn: async, stamps updatedAt,
// keeps a local backup, awaits persistTaskToActiveSession(), only reports
// success after Firebase confirms, and surfaces a visible, retryable error.
// ---------------------------------------------------------------------------
function buildSaveExtraTaskEnv(overrides = {}) {
  const persistSource = extractBetween('function persistTaskToActiveSession(', 'async function fetchOwnActiveSessionTasks(');
  const saveExtraSource = extractBetween('async function saveExtraTask() {', '// Logic for Approving Users');

  const alerts = [];
  const closeModalCalls = [];
  const updateKPICalls = [];
  const localStorageStore = {};
  const databaseCalls = [];

  const btnEl = {
    innerHTML: "<i class='bx bx-save'></i> Guardar Tarea",
    disabled: false,
  };
  const nameField = overrides.nameField !== undefined ? overrides.nameField : { value: 'Revisión especial QA' };
  const statusField = overrides.statusField !== undefined ? overrides.statusField : { value: 'Finalizada' };
  const obsField = overrides.obsField !== undefined ? overrides.obsField : { value: 'Detalle QA de la tarea extra' };

  const documentStub = {
    getElementById(id) {
      if (id === 'saveExtraTaskBtn') return btnEl;
      if (id === 'extraTaskName') return nameField;
      if (id === 'extraTaskStatus') return statusField;
      if (id === 'extraTaskObs') return obsField;
      return null;
    },
  };

  const updateResult = overrides.updateResult || (() => Promise.resolve());
  const databaseStub = {
    ref(path) {
      return {
        update(data) {
          databaseCalls.push({ path, data });
          return updateResult(path, data);
        },
      };
    },
  };
  const firebaseStub = {
    auth() {
      return { currentUser: overrides.authUser !== undefined ? overrides.authUser : { uid: 'QA_GESTOR' } };
    },
  };
  const localStorageStub = {
    setItem(key, value) { localStorageStore[key] = value; },
    getItem(key) { return localStorageStore[key]; },
  };
  const alertFn = (msg) => alerts.push(msg);
  const updateKPI = () => updateKPICalls.push(true);
  const closeModal = (id) => closeModalCalls.push(id);

  const currentUser = overrides.currentUser !== undefined
    ? overrides.currentUser
    : { uid: 'QA_GESTOR', name: 'QA Gestor', role: 'Gestor' };
  const taskStateCache = overrides.taskStateCache || {};

  const loader = new Function(
    'document', 'firebase', 'database', 'localStorage', 'currentUser', 'taskStateCache', 'updateKPI', 'alert', 'closeModal',
    `
    let pendingExtraTaskId = null;
    let isSavingExtraTask = false;
    ${persistSource}
    ${saveExtraSource}
    return { saveExtraTask, getPendingExtraTaskId: () => pendingExtraTaskId };
    `,
  );
  const { saveExtraTask, getPendingExtraTaskId } = loader(
    documentStub, firebaseStub, databaseStub, localStorageStub, currentUser, taskStateCache, updateKPI, alertFn, closeModal,
  );

  return {
    saveExtraTask,
    getPendingExtraTaskId,
    btnEl,
    alerts,
    databaseCalls,
    taskStateCache,
    localStorageStore,
    updateKPICalls,
    closeModalCalls,
  };
}

async function testSaveExtraTaskConfirmsBeforeSuccess() {
  let resolveUpdate;
  const pending = new Promise((resolve) => { resolveUpdate = resolve; });
  const env = buildSaveExtraTaskEnv({ updateResult: () => pending });

  const clickPromise = env.saveExtraTask();
  await Promise.resolve(); // let the synchronous prefix of the async function run
  assert.match(env.btnEl.innerHTML, /Guardando/);
  assert.equal(env.btnEl.disabled, true);
  assert.equal(env.closeModalCalls.length, 0, 'Must not close the modal before Firebase confirms the write');
  assert.equal(env.alerts.length, 0, 'Must not show a success alert before Firebase confirms the write');

  resolveUpdate();
  await clickPromise;

  assert.equal(env.databaseCalls.length, 1);
  assert.match(env.databaseCalls[0].path, /^active_sessions\/QA_GESTOR\/tasks\/extra_\d+$/);
  assert.equal(env.databaseCalls[0].data.name, '[EXTRA] Revisión especial QA');
  assert.equal(env.databaseCalls[0].data.status, 'Finalizada');
  assert.equal(typeof env.databaseCalls[0].data.updatedAt, 'number');
  assert(env.localStorageStore.riskOps_cache, 'Expected local cache backup to be written');
  assert.deepEqual(env.closeModalCalls, ['extraTaskModal']);
  assert.equal(env.alerts.length, 1);
  assert.match(env.alerts[0], /agregada exitosamente/);
  assert.equal(env.updateKPICalls.length, 1);
  assert.equal(env.btnEl.disabled, false);
  assert.equal(env.getPendingExtraTaskId(), null, 'A confirmed save must clear the pending retry ID');
}

async function testSaveExtraTaskErrorIsVisibleAndAllowsRetryWithSameId() {
  let attempt = 0;
  const env = buildSaveExtraTaskEnv({
    updateResult: () => {
      attempt += 1;
      return attempt === 1 ? Promise.reject(new Error('NETWORK_ERROR')) : Promise.resolve();
    },
  });

  await env.saveExtraTask();
  assert.equal(env.closeModalCalls.length, 0, 'Must not close the modal on failure');
  assert.equal(env.alerts.length, 1);
  assert.doesNotMatch(env.alerts[0], /agregada exitosamente/);
  assert.equal(env.btnEl.disabled, false, 'Button must be re-enabled after a failure so the user can retry');
  assert.notEqual(env.getPendingExtraTaskId(), null, 'The pending ID must survive a failure so a retry reuses it');
  const firstAttemptId = env.databaseCalls[0].path;

  await env.saveExtraTask();
  assert.equal(env.databaseCalls.length, 2, 'Retry must issue a new Firebase write');
  assert.equal(env.databaseCalls[1].path, firstAttemptId, 'Retry must reuse the same extraId instead of creating a duplicate');
  assert.equal(env.closeModalCalls.length, 1);
  assert.equal(env.alerts.length, 2);
  assert.match(env.alerts[1], /agregada exitosamente/);
  assert.equal(env.getPendingExtraTaskId(), null);
}

// ---------------------------------------------------------------------------
// One-time recovery migration (initApp): after combining local and remote
// caches, any local task that mergeTaskCaches() resolved in favor of the
// local cache (absent remotely, or a won conflict) must be individually
// re-persisted via persistTaskToActiveSession() — never a bulk resend, never
// overwriting a remote entry with a strictly newer updatedAt, and idempotent
// across reloads once both sides agree.
// ---------------------------------------------------------------------------
function buildMigrateLocalTasksEnv(overrides = {}) {
  const migrationSource = extractBetween('function persistTaskToActiveSession(', 'function syncActiveSessionToFirebase(');
  const localStorageStore = {};
  const transactionCalls = [];
  // currentValues: what the server already has for a given taskId at the
  // exact moment the transaction's update function runs — lets tests
  // simulate a concurrent write that landed during the migration.
  const currentValues = overrides.currentValues || {};
  // failFor: taskIds whose transaction Promise must reject outright (a real
  // network/permission failure, as opposed to a clean conditional abort).
  const failFor = overrides.failFor || [];

  const databaseStub = {
    ref(refPath) {
      return {
        transaction(updateFn) {
          transactionCalls.push(refPath);
          const taskId = refPath.split('/').pop();
          if (failFor.includes(taskId)) return Promise.reject(new Error('NETWORK_ERROR'));
          const currentValue = Object.prototype.hasOwnProperty.call(currentValues, taskId) ? currentValues[taskId] : null;
          const nextValue = updateFn(currentValue);
          if (nextValue === undefined) {
            return Promise.resolve({ committed: false, snapshot: { val: () => currentValue } });
          }
          return Promise.resolve({ committed: true, snapshot: { val: () => nextValue } });
        },
      };
    },
  };
  const localStorageStub = {
    setItem(key, value) { localStorageStore[key] = value; },
    getItem(key) { return localStorageStore[key]; },
  };

  const loader = new Function(
    'database', 'localStorage',
    `${migrationSource}\nreturn { migrateLocalTasksToActiveSession, computeLocalTaskMigrations, persistTaskIfNotNewerRemote };`,
  );
  const bound = loader(databaseStub, localStorageStub);

  return { ...bound, transactionCalls, localStorageStore };
}

function testComputeLocalTaskMigrationsLegacyLocalOnly() {
  const { computeLocalTaskMigrations } = buildMigrateLocalTasksEnv();
  const merged = { task_x: { name: 'Tarea X', status: 'Finalizada', observation: 'obs local legado' } };
  const now = 123456;

  const migrations = computeLocalTaskMigrations(merged, {}, now);

  assert.equal(migrations.length, 1, 'A local-only task (absent remotely) must be scheduled for migration');
  assert.equal(migrations[0].taskId, 'task_x');
  assert.equal(migrations[0].record.updatedAt, now, 'A legacy local entry without updatedAt must be stamped before being persisted');
}

function testComputeLocalTaskMigrationsLocalWinsConflict() {
  const { computeLocalTaskMigrations } = buildMigrateLocalTasksEnv();
  const merged = { task_y: { name: 'Tarea Y', status: 'Finalizada', observation: 'local newer', updatedAt: 500 } };
  const remote = { task_y: { name: 'Tarea Y', status: 'Pendiente', observation: 'remote stale', updatedAt: 100 } };

  const migrations = computeLocalTaskMigrations(merged, remote, 999999);

  assert.equal(migrations.length, 1, 'A task where the local cache won the merge conflict must be migrated');
  assert.equal(migrations[0].record.updatedAt, 500, 'An already-timestamped local winner must be migrated as-is, not re-stamped');
  assert.equal(migrations[0].record.observation, 'local newer');
}

function testComputeLocalTaskMigrationsSkipsWhenRemoteIsNewer() {
  const { computeLocalTaskMigrations } = buildMigrateLocalTasksEnv();
  // Mirrors exactly what mergeTaskCaches() produces when the remote entry is
  // strictly newer: mergedCache[taskId] === remoteCache[taskId] (same content).
  const remoteEntry = { name: 'Tarea Z', status: 'Finalizada', observation: 'remote newer', updatedAt: 900 };
  const merged = { task_z: { ...remoteEntry } };
  const remote = { task_z: { ...remoteEntry } };

  const migrations = computeLocalTaskMigrations(merged, remote, 999999);

  assert.equal(migrations.length, 0, 'Must never re-write a remote entry that mergeTaskCaches already preferred for being strictly newer');
}

function testComputeLocalTaskMigrationsIsIdempotentAfterSync() {
  const { computeLocalTaskMigrations } = buildMigrateLocalTasksEnv();
  const record = { name: 'Tarea W', status: 'Finalizada', observation: 'ya sincronizada', updatedAt: 700 };
  const merged = { task_w: { ...record } };
  const remote = { task_w: { ...record } }; // Ya migrada en un ciclo anterior

  const migrations = computeLocalTaskMigrations(merged, remote, 999999);

  assert.equal(migrations.length, 0, 'A reload must not re-migrate a task that is already identical on both sides');
}

async function testMigrateLocalTasksToActiveSessionKeepsLocalBackupOnFailure() {
  const env = buildMigrateLocalTasksEnv({ failFor: ['task_fail'] });
  const merged = {
    task_ok: { name: 'OK', status: 'Finalizada', observation: 'obs ok' }, // legacy: no updatedAt
    task_fail: { name: 'FAIL', status: 'Finalizada', observation: 'obs fail' }, // legacy: no updatedAt
  };

  const result = await env.migrateLocalTasksToActiveSession('QA_GESTOR', merged, {});

  assert.deepEqual(result.migrated, ['task_ok'], 'A successful write must be reported as migrated');
  assert.deepEqual(result.failed, ['task_fail'], 'A failed write must be reported as failed, never silently dropped');
  assert.deepEqual(result.skipped, []);
  assert.equal(env.transactionCalls.length, 2);

  // Both tasks must keep their local backup (with updatedAt already stamped),
  // including the one whose Firebase write failed — nothing here reports
  // recovery as successful when a write actually failed.
  assert.equal(typeof merged.task_ok.updatedAt, 'number');
  assert.equal(typeof merged.task_fail.updatedAt, 'number');
  const savedCache = JSON.parse(env.localStorageStore.riskOps_cache);
  assert.equal(savedCache.task_ok.observation, 'obs ok');
  assert.equal(savedCache.task_fail.observation, 'obs fail');
}

async function testMigrateLocalTasksToActiveSessionMigratesValidLocalEntry() {
  const env = buildMigrateLocalTasksEnv();
  const merged = { task_ok: { name: 'OK', status: 'Finalizada', observation: 'obs ok' } }; // legacy: no updatedAt

  const result = await env.migrateLocalTasksToActiveSession('QA_GESTOR', merged, {});

  assert.deepEqual(result.migrated, ['task_ok'], 'A valid local-only entry must still be migrated');
  assert.deepEqual(result.failed, []);
  assert.deepEqual(result.skipped, []);
  assert.deepEqual(env.transactionCalls, ['active_sessions/QA_GESTOR/tasks/task_ok']);
  assert.equal(typeof merged.task_ok.updatedAt, 'number');
}

async function testMigrateLocalTasksToActiveSessionAbortsWhenConcurrentRemoteIsNewer() {
  const merged = { task_race: { name: 'Race', status: 'Finalizada', observation: 'local', updatedAt: 100 } };
  const env = buildMigrateLocalTasksEnv({
    // Simulates that, exactly when the transaction runs, the server already
    // has a newer version (e.g. the same Gestor saved this task from another
    // tab while this migration was in flight).
    currentValues: { task_race: { name: 'Race', status: 'En Proceso', observation: 'remoto concurrente', updatedAt: 500 } },
  });

  const result = await env.migrateLocalTasksToActiveSession('QA_GESTOR', merged, {});

  assert.deepEqual(result.skipped, ['task_race'], 'A concurrent remote update with a newer updatedAt must abort this write and keep the remote version');
  assert.deepEqual(result.migrated, []);
  assert.deepEqual(result.failed, []);
}

function buildMaliciousShiftReport() {
  return {
    fb_id: 'xss-report',
    gestor: '<img src=x onerror=alert(1)>',
    rol: '</span><script>alert(2)</script>',
    setTrabajado: '<svg onload=alert(3)>',
    horaInicio: '<img src=x onerror=alert(4)>',
    horaFin: '<script>alert(5)</script>',
    tiempoAlmuerzoMins: '<img src=x onerror=alert(6)>',
    tiempoDesayunoMins: '<svg onload=alert(7)>',
    inactividadTotalMins: '<script>alert(8)</script>',
    timestamp: Date.now(),
    reporte: 'Resumen seguro\n\n=== BITÁCORA DE TIEMPOS ===\n- <img src=x onerror=alert(9)>',
    tasks: {
      task_1: {
        name: 'Tarea <script>alert(10)</script>',
        status: 'Finalizada',
        observation: '<img src=x onerror=alert(11)>',
      },
    },
  };
}

function assertNoExecutablePayload(html, surface) {
  assert.equal(typeof html, 'string', `${surface} must produce HTML`);
  assert.doesNotMatch(html, /<script(?:\s|>)/i, `${surface} must not contain a script element from Firebase data`);
  assert.doesNotMatch(html, /<img(?:\s|>)/i, `${surface} must not contain an injected image element`);
  assert.doesNotMatch(html, /<svg(?:\s|>)/i, `${surface} must not contain an injected SVG element`);
  assert.match(html, /&lt;(?:script|img|svg)/i, `${surface} must retain escaped, visible text instead of executable markup`);
}

async function testShiftReportExportEscapesAllStoredFields() {
  const exportSource = extractBetween(
    'window.exportShiftReport = async function(fb_id) {',
    '// Logic for Shift Reports History',
  );
  const report = buildMaliciousShiftReport();
  const helpers = buildTaskIdentityHelpers([]);
  const alerts = [];
  let appendedElement = null;
  let exportedElement = null;
  let removedElement = null;
  let saveCalled = false;
  const documentStub = {
    createElement(tag) {
      assert.equal(tag, 'div');
      return { style: '', innerHTML: '' };
    },
    body: {
      appendChild(element) { appendedElement = element; },
      removeChild(element) { removedElement = element; },
    },
  };
  const html2pdfChain = {
    set() { return this; },
    from(element) { exportedElement = element; return this; },
    async save() { saveCalled = true; },
  };
  const windowStub = { html2pdf: () => html2pdfChain };
  const databaseStub = {
    ref() { throw new Error('The report fixture should be resolved from allShiftReports'); },
  };
  const loadExport = new Function(
    'window', 'document', 'database', 'allShiftReports', 'alert', 'console',
    'buildTaskReportSummaryText', 'escapeHTML',
    `${exportSource}\nreturn window.exportShiftReport;`,
  );
  const exportShiftReport = loadExport(
    windowStub,
    documentStub,
    databaseStub,
    [report],
    (message) => alerts.push(message),
    { error() {} },
    helpers.buildTaskReportSummaryText,
    (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;'),
  );

  await exportShiftReport(report.fb_id);

  assert.equal(alerts.length, 0, `Export must not hide an exception behind an alert: ${alerts.join(' | ')}`);
  assert(saveCalled, 'The real html2pdf chain must reach save()');
  assert.equal(exportedElement, appendedElement);
  assert.equal(removedElement, appendedElement);
  assertNoExecutablePayload(exportedElement.innerHTML, 'PDF export');
}

function testShiftDetailModalEscapesAllStoredFields() {
  const modalSource = extractBetween(
    'window.openShiftDetailModal = function(fb_id) {',
    "document.getElementById('shiftDetailModal').classList.add('active');",
  ) + "document.getElementById('shiftDetailModal').classList.add('active');\n};";
  const report = buildMaliciousShiftReport();
  const helpers = buildTaskIdentityHelpers([]);
  const body = { innerHTML: '' };
  const modal = { classList: makeClassList() };
  const documentStub = {
    getElementById(id) {
      if (id === 'shiftDetailModalBody') return body;
      if (id === 'shiftDetailModal') return modal;
      if (id === 'exportPdfModalBtn') return null;
      return null;
    },
  };
  const windowStub = {};
  const loadModal = new Function(
    'window', 'document', 'allShiftReports', 'alert', 'buildTaskReportSummaryText', 'escapeHTML',
    `${modalSource}\nreturn window.openShiftDetailModal;`,
  );
  const openShiftDetailModal = loadModal(
    windowStub,
    documentStub,
    [report],
    (message) => assert.fail(`Modal raised an unexpected alert: ${message}`),
    helpers.buildTaskReportSummaryText,
    (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;'),
  );

  openShiftDetailModal(report.fb_id);

  assert(modal.classList.contains('active'));
  assertNoExecutablePayload(body.innerHTML, 'Shift detail modal');
}

async function main() {
  testStoredXssEscaping();
  testInlineHandlerAndAvatarSafety();
  await testShiftReportExportEscapesAllStoredFields();
  testShiftDetailModalEscapesAllStoredFields();
  await testAtomicShiftClosure();
  testRoleBoundaries();
  testAnnouncementContract();
  testComunicadosCapabilities();
  await testSaveTaskRejectsWithoutActiveTask();
  await testSaveTaskRejectsWithoutStatus();
  await testSaveTaskRejectsWithoutObservation();
  await testSaveTaskDoesNotShowSuccessBeforeFirebaseResolves();
  await testSaveTaskSuccessUpdatesFirebaseCacheAndUI();
  await testSaveTaskKeepsVisualTargetWhenSelectionChangesDuringWrite();
  await testSaveTaskPermissionDeniedShowsErrorNotSuccess();
  await testSaveTaskNetworkErrorAllowsRetry();
  testSelectTaskDoesNotDependOnWindowEvent();
  testSelectTaskResolvesNumericIdZero();
  testSelectTaskSwitchingClearsObservationAndRestoresPerTaskCache();
  await testSaveTaskRejectsUnresolvedSelection();
  await testSaveTaskRejectsMismatchedSelection();
  await testSaveTaskNeverPersistsGenericFallbackName();
  testSaveTaskSourceNeverBuildsGenericFallbackName();
  testReconcileScheduledTaskExactNameMatch();
  testReconcileScheduledTaskAcceptsNameVariant();
  testReconcileScheduledTaskResolvesLegacyGenericName();
  testReconcileScheduledTaskExcludesExtraEntries();
  testResolveTaskDisplayNameNeverExposesRawIdWhenUnresolved();
  testResolveTaskDisplayNameKeepsRealNamesUnchanged();
  testMonitoreoCardAndModalUseSameReconciliation();
  testBuildTaskReportSummaryTextPrefersStructuredTasksOverLegacyText();
  testBuildTaskReportSummaryTextFallsBackToLegacyTextWhenNoStructuredTasks();
  testBuildTaskReportSummaryTextKeepsExtraPrefixAndNeverLeaksGenericName();
  testShiftHistorySurfacesUseStructuredTaskSummary();
  testMergeTaskCachesConflictResolution();
  testMergeTaskCachesPrefersLocalOnTieOrMissingUpdatedAt();
  await testFetchOwnActiveSessionTasksReadsOnlyOwnPath();
  await testFetchOwnActiveSessionTasksReturnsNotOkOnReadFailure();
  testShiftCloseStillIncludesTasksInReport();
  testSyncActiveSessionOnlySyncsMetadataNotTasks();
  await testSaveExtraTaskConfirmsBeforeSuccess();
  await testSaveExtraTaskErrorIsVisibleAndAllowsRetryWithSameId();
  testComputeLocalTaskMigrationsLegacyLocalOnly();
  testComputeLocalTaskMigrationsLocalWinsConflict();
  testComputeLocalTaskMigrationsSkipsWhenRemoteIsNewer();
  testComputeLocalTaskMigrationsIsIdempotentAfterSync();
  await testMigrateLocalTasksToActiveSessionKeepsLocalBackupOnFailure();
  await testMigrateLocalTasksToActiveSessionMigratesValidLocalEntry();
  await testMigrateLocalTasksToActiveSessionAbortsWhenConcurrentRemoteIsNewer();
  await testRecoverGestorTaskProgressAbortsOnRemoteReadFailure();
  await testRecoverGestorTaskProgressSkipsMigrationOnIdentityMismatch();
  await testRecoverGestorTaskProgressMigratesLocalOnlyTaskOnHappyPath();
  testRecoverGestorTaskProgressOrdersSafetyChecksCorrectly();
  testGestorTaskRecoveryWiredIntoInitApp();
  console.log('FRONTEND_SECURITY_SMOKE=PASS');
  console.log('STORED_XSS_LOG_RENDERING=PASS');
  console.log('INLINE_HANDLER_XSS_GUARD=PASS');
  console.log('AVATAR_ATTRIBUTE_XSS_GUARD=PASS');
  console.log('ANNOUNCEMENT_ALLOWLIST_CONTRACT=PASS');
  console.log('ROLE_UI_BOUNDARIES=PASS');
  console.log('SHIFT_CLOSE_ATOMICITY=PASS');
  console.log('COMUNICADOS_SUPERVISOR_CAPABILITIES=PASS');
  console.log('TASK_PERSISTENCE_VALIDATION_GUARDS=PASS');
  console.log('TASK_PERSISTENCE_SUCCESS_CONFIRMED_BY_FIREBASE=PASS');
  console.log('TASK_PERSISTENCE_ERROR_HANDLING=PASS');
  console.log('TASK_PERSISTENCE_RETRY_AFTER_NETWORK_ERROR=PASS');
  console.log('TASK_SAVE_SELECTION_RACE=PASS');
  console.log('SELECT_TASK_NO_WINDOW_EVENT=PASS');
  console.log('TASK_ID_AND_MONITORING_RECONCILIATION=PASS');
  console.log('SHIFT_REPORT_STORED_XSS=PASS');
  console.log('TASK_PROGRESS_MERGE_AND_RESTORE_ON_RELOAD=PASS');
  console.log('TASK_PROGRESS_MERGE_PREFERS_LOCAL_ON_TIE_OR_MISSING_UPDATEDAT=PASS');
  console.log('SHIFT_CLOSE_INCLUDES_TASKS=PASS');
  console.log('SYNC_ACTIVE_SESSION_METADATA_ONLY=PASS');
  console.log('SAVE_EXTRA_TASK_CONFIRMED_PERSISTENCE=PASS');
  console.log('LOCAL_TASK_MIGRATION_ONE_TIME_RECOVERY=PASS');
  console.log('REMOTE_READ_FAILURE_PRODUCES_ZERO_WRITES=PASS');
  console.log('IDENTITY_MISMATCH_PRODUCES_ZERO_WRITES=PASS');
  console.log('CONCURRENT_NEWER_REMOTE_NOT_OVERWRITTEN=PASS');
  console.log('VALID_LOCAL_ENTRY_STILL_MIGRATES=PASS');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
