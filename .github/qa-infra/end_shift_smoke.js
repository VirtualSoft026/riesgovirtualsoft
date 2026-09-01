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

function createWarningDocument() {
  const warningBanner = { style: { display: 'none' } };
  const warningText = { textContent: '' };
  return {
    warningBanner,
    warningText,
    document: {
      getElementById(id) {
        if (id === 'idleDetectorWarning') return warningBanner;
        if (id === 'idleDetectorWarningText') return warningText;
        return null;
      },
    },
  };
}

function loadIdlePermissionFunctions(IdleDetectorClass) {
  const idleSource = extractBetween(
    'function setIdleDetectorWarning(',
    'function applyIdleStateChange()',
  );
  const warning = createWarningDocument();
  const windowStub = IdleDetectorClass ? { IdleDetector: IdleDetectorClass } : {};
  const load = new Function(
    'document',
    'window',
    'IdleDetector',
    'console',
    'setTimeout',
    'clearTimeout',
    'applyIdleStateChange',
    `let screenLockTimer = null;
     let globalIdleState = false;
     ${idleSource}
     return { requestIdlePermission, startIdleDetectorLogic };`,
  );
  const functions = load(
    warning.document,
    windowStub,
    IdleDetectorClass,
    { error() {} },
    () => 1,
    () => {},
    () => {},
  );
  return { ...functions, windowStub, ...warning };
}

async function testIdlePermissionSuccessWaitsForDetectorStart() {
  let startCalls = 0;
  class GrantedIdleDetector {
    static async requestPermission() { return 'granted'; }
    addEventListener() {}
    async start() { startCalls += 1; }
  }

  const env = loadIdlePermissionFunctions(GrantedIdleDetector);
  const started = await env.requestIdlePermission();
  assert.equal(started, true);
  assert.equal(startCalls, 1);
  assert.equal(env.windowStub.idleDetectorGranted, true);
  assert.equal(env.warningBanner.style.display, 'none');
}

async function testIdlePermissionStartFailureIsRecoverable() {
  class FailingIdleDetector {
    static async requestPermission() { return 'granted'; }
    addEventListener() {}
    async start() { throw new Error('start failed'); }
  }

  const env = loadIdlePermissionFunctions(FailingIdleDetector);
  const started = await env.requestIdlePermission();
  assert.equal(started, false);
  assert.equal(env.windowStub.idleDetectorStarted, false);
  assert.equal(env.windowStub.idleDetectorGranted, false);
  assert.equal(env.warningBanner.style.display, 'flex');
  assert.match(env.warningText.textContent, /no impide finalizar el turno/i);
}

async function testUnsupportedIdlePermissionDoesNotBlockShift() {
  const env = loadIdlePermissionFunctions(undefined);
  const started = await env.requestIdlePermission();
  assert.equal(started, false);
  assert.equal(env.warningBanner.style.display, 'flex');
  assert.match(env.warningText.textContent, /no impide finalizar el turno/i);
}

function testSetSelectionRules() {
  const helperSource = extractBetween(
    'function hasRealSetOptions(',
    '// Lógica de Pausa Turno Partido',
  );
  const load = new Function(
    `${helperSource}\nreturn { hasRealSetOptions, requiresSpecificSetSelection };`,
  );
  const { hasRealSetOptions, requiresSpecificSetSelection } = load();
  const option = (value, disabled = false) => ({ value, disabled });

  const emptySchedule = {
    value: 'Todos',
    options: [option('', true), option('Todos')],
  };
  assert.equal(hasRealSetOptions(emptySchedule), false);
  assert.equal(requiresSpecificSetSelection(emptySchedule), false);
  assert.equal(requiresSpecificSetSelection(null), false);

  const loadedSchedule = {
    value: 'Todos',
    options: [option('', true), option('Todos'), option('SET A')],
  };
  assert.equal(hasRealSetOptions(loadedSchedule), true);
  assert.equal(requiresSpecificSetSelection(loadedSchedule), true);
  loadedSchedule.value = 'SET A';
  assert.equal(requiresSpecificSetSelection(loadedSchedule), false);
}

function testFormSubmitCcUsesOneStringValue() {
  const helperSource = extractBetween(
    'const FORM_SUBMIT_CC =',
    '// XSS Sanitizer Helper',
  );
  const load = new Function(
    `${helperSource}\nreturn { FORM_SUBMIT_CC, appendFormSubmitCc };`,
  );
  const { FORM_SUBMIT_CC, appendFormSubmitCc } = load();
  const appendCalls = [];
  const formData = {
    append(...args) {
      appendCalls.push(args);
    },
  };

  appendFormSubmitCc(formData);
  assert.deepEqual(appendCalls, [['_cc', FORM_SUBMIT_CC]]);
  assert.equal(FORM_SUBMIT_CC.split(',').length, 2);
  assert.equal((appSource.match(/appendFormSubmitCc\(formData\);/g) || []).length, 2);
  assert.doesNotMatch(appSource, /formData\.append\(["']_cc["'][^\r\n]*,[^\r\n]*,[^\r\n]*\)/);
}

function testEndShiftSafetyOrder() {
  const handlerSource = extractBetween(
    'async function handleEndShift()',
    '// Inicializar inmediatamente',
  );
  const persistIndex = handlerSource.indexOf('await persistShiftClosureCore(');
  const persistedFlagIndex = handlerSource.indexOf('shiftClosurePersisted = true;', persistIndex);
  const localCleanupIndex = handlerSource.indexOf("localStorage.removeItem('riskOps_currentUser')");
  const feedbackIndex = handlerSource.indexOf('btn.disabled = true;');
  const reportIndex = handlerSource.indexOf('buildTaskReportSummaryText(');

  assert.match(handlerSource, /let shiftClosurePersisted = false;/);
  assert(persistIndex >= 0, 'Shift closure must use the atomic persistence helper');
  assert(persistIndex < persistedFlagIndex, 'Persistence must complete before setting the success flag');
  assert(persistedFlagIndex < localCleanupIndex, 'Local session must remain until persistence succeeds');
  assert(feedbackIndex >= 0 && feedbackIndex < reportIndex, 'The button must provide feedback before report construction');
  assert.match(handlerSource, /if \(shiftClosurePersisted\) \{[\s\S]*?firebase\.auth\(\)\.signOut\(\)/);
  assert.match(handlerSource, /La sesión se mantiene activa para que puedas intentar nuevamente/);
  assert.match(handlerSource, /CORE_SHIFT_CLOSE_FAILED[\s\S]*?restoreEndShiftButton\(btn, prevHtml\);[\s\S]*?return;/);
  assert.doesNotMatch(handlerSource, /alert\("Turno finalizado\."\)/);
}

function testPermissionIsNeverRequestedByTheEndShiftClick() {
  const permissionBootstrap = extractBetween(
    'checkAndStartIdleDetector();',
    '// Activity listeners',
  );
  assert.match(permissionBootstrap, /requestIdlePermissionManual/);
  assert.doesNotMatch(permissionBootstrap, /addEventListener\(['"]click['"]/);

  const handlerSource = extractBetween(
    'async function handleEndShift()',
    '// Inicializar inmediatamente',
  );
  assert.doesNotMatch(handlerSource, /requestIdlePermission/);
}

async function run() {
  await testIdlePermissionSuccessWaitsForDetectorStart();
  await testIdlePermissionStartFailureIsRecoverable();
  await testUnsupportedIdlePermissionDoesNotBlockShift();
  testSetSelectionRules();
  testFormSubmitCcUsesOneStringValue();
  testEndShiftSafetyOrder();
  testPermissionIsNeverRequestedByTheEndShiftClick();
  console.log('END_SHIFT_SMOKE=PASS');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
