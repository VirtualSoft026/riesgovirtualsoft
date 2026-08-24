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
      if (sel === '.task-item.active .task-status') return overrides.noActiveTaskEl ? null : activeTaskStatusEl;
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
  const currentSelectedTask = overrides.currentSelectedTask !== undefined
    ? overrides.currentSelectedTask
    : { Tarea: 'Tarea QA' };
  const taskStateCache = overrides.taskStateCache || {};

  const loadHandler = new Function(
    'document', 'firebase', 'database', 'localStorage', 'currentUser', 'currentActiveTaskId',
    'currentSelectedTask', 'taskStateCache', 'updateKPI', 'alert',
    `${persistAndCacheSource}\n${btnSource}`,
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
    querySelectorAll(sel) {
      if (sel === '.task-item') return [otherActiveEl, clickedEl];
      return [];
    },
    getElementById() { return null; },
  };
  const windowStub = {};
  const loadSelectTask = new Function(
    'window', 'document', 'allTasks', 'currentUser', 'currentSelectedTask', 'currentActiveTaskId',
    `${selectTaskSource}\nreturn { selectTask: window.selectTask, getCurrentActiveTaskId: () => currentActiveTaskId };`,
  );
  const { selectTask, getCurrentActiveTaskId } = loadSelectTask(windowStub, documentStub, [], null, null, null);

  // No global "event" exists in this sandbox at all: selectTask must still work
  // correctly using only the explicitly passed evt argument.
  selectTask('task_9', { currentTarget: clickedEl });

  assert.equal(getCurrentActiveTaskId(), 'task_9');
  assert(clickedEl.classList.contains('active'), 'Expected the clicked element to become active via the evt param');
  assert(!otherActiveEl.classList.contains('active'), 'Expected the previously active element to be cleared');
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
  assert.equal(result.task_1.status, 'Finalizada');
}

function testRemoteTaskProgressRestoredOnReloadWiring() {
  const initAppSource = extractBetween('async function initApp() {', 'loadTeletrabajo();');
  assert.match(initAppSource, /currentUser\.role === 'Gestor' && currentUser\.uid/);
  assert.match(initAppSource, /fetchOwnActiveSessionTasks\(currentUser\.uid\)/);
  assert.match(initAppSource, /mergeTaskCaches\(taskStateCache, remoteTasks\)/);
  // Recovery must run before the initial tree render (loadExcelTasks -> renderTree
  // is called from within initApp), never read from a hardcoded/other UID, and
  // never touch other sessions.
  assert(
    initAppSource.indexOf('fetchOwnActiveSessionTasks(currentUser.uid)') < initAppSource.indexOf('await loadExcelTasks();'),
  );
  assert.doesNotMatch(initAppSource, /active_sessions\/\$\{[^}]*other/i);
}

function testShiftCloseStillIncludesTasksInReport() {
  const handleEndShiftSource = extractBetween('async function handleEndShift()', '// Inicializar inmediatamente');
  assert.match(handleEndShiftSource, /tasks: taskStateCache,/);
  assert.match(handleEndShiftSource, /await persistShiftClosureCore\(reportUid, localUser\.loginLogId, shiftReportObject\)/);
}

async function main() {
  testStoredXssEscaping();
  testInlineHandlerAndAvatarSafety();
  await testAtomicShiftClosure();
  testRoleBoundaries();
  testAnnouncementContract();
  testComunicadosCapabilities();
  await testSaveTaskRejectsWithoutActiveTask();
  await testSaveTaskRejectsWithoutStatus();
  await testSaveTaskRejectsWithoutObservation();
  await testSaveTaskDoesNotShowSuccessBeforeFirebaseResolves();
  await testSaveTaskSuccessUpdatesFirebaseCacheAndUI();
  await testSaveTaskPermissionDeniedShowsErrorNotSuccess();
  await testSaveTaskNetworkErrorAllowsRetry();
  testSelectTaskDoesNotDependOnWindowEvent();
  testMergeTaskCachesConflictResolution();
  await testFetchOwnActiveSessionTasksReadsOnlyOwnPath();
  testRemoteTaskProgressRestoredOnReloadWiring();
  testShiftCloseStillIncludesTasksInReport();
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
  console.log('SELECT_TASK_NO_WINDOW_EVENT=PASS');
  console.log('TASK_PROGRESS_MERGE_AND_RESTORE_ON_RELOAD=PASS');
  console.log('SHIFT_CLOSE_INCLUDES_TASKS=PASS');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
