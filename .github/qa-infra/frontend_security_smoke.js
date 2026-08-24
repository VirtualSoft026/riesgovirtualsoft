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

async function main() {
  testStoredXssEscaping();
  testInlineHandlerAndAvatarSafety();
  await testAtomicShiftClosure();
  testRoleBoundaries();
  testAnnouncementContract();
  testComunicadosCapabilities();
  console.log('FRONTEND_SECURITY_SMOKE=PASS');
  console.log('STORED_XSS_LOG_RENDERING=PASS');
  console.log('INLINE_HANDLER_XSS_GUARD=PASS');
  console.log('AVATAR_ATTRIBUTE_XSS_GUARD=PASS');
  console.log('ANNOUNCEMENT_ALLOWLIST_CONTRACT=PASS');
  console.log('ROLE_UI_BOUNDARIES=PASS');
  console.log('SHIFT_CLOSE_ATOMICITY=PASS');
  console.log('COMUNICADOS_SUPERVISOR_CAPABILITIES=PASS');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
