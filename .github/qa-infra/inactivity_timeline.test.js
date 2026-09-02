/**
 * inactivity_timeline.test.js
 *
 * Unit tests for the 5 proposed inactivity fixes.
 * These tests validate that the inactivity detection system correctly
 * registers events in the timeline (pushTimelineEvent) from ALL detection
 * mechanisms, not just from syncActiveSessionToFirebase().
 *
 * Pattern: same as end_shift_smoke.js — extract source fragments from app.js
 * and evaluate them in a sandboxed Function context with stubs.
 *
 * Expected behavior:
 *   - FAIL against current production code (demonstrates the bugs)
 *   - PASS after the fixes are applied
 */

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

// ============================================================================
// TEST 1 (Fix #1 — static): applyIdleStateChange must call pushTimelineEvent
// ============================================================================
function testApplyIdleStateChangePushesTimelineEvents() {
  const fnSource = extractBetween(
    'function applyIdleStateChange()',
    'checkAndStartIdleDetector();',
  );

  const hasStartPush = /pushTimelineEvent\s*\(\s*['"]Inactividad['"]\s*,\s*['"]start['"]\s*\)/.test(fnSource);
  const hasEndPush = /pushTimelineEvent\s*\(\s*['"]Inactividad['"]\s*,\s*['"]end['"]\s*\)/.test(fnSource);

  assert(
    hasStartPush,
    'applyIdleStateChange() must call pushTimelineEvent(\'Inactividad\', \'start\') when transitioning to idle'
  );
  assert(
    hasEndPush,
    'applyIdleStateChange() must call pushTimelineEvent(\'Inactividad\', \'end\') when returning from idle'
  );
}

// ============================================================================
// TEST 2 (Fix #1 — behavioral): applyIdleStateChange actually registers
// timeline events when globalIdleState transitions happen
// ============================================================================
function testApplyIdleStateChangeRecordsIdleTransition() {
  const fnSource = extractBetween(
    'function applyIdleStateChange()',
    'checkAndStartIdleDetector();',
  );

  const timelineEvents = [];
  const user = { role: 'Gestor', uid: 'u1', status: 'Activo' };

  const buildFn = new Function(
    'currentUser',
    'globalIdleState',
    'isLunchBreak', 'isBreakfastBreak', 'isSplitShiftBreak',
    'lastLocalActivityTimestamp',
    'database', 'pushTimelineEvent', 'loadBreakState',
    'updateStatusDisplay', 'syncActiveSessionToFirebase',
    `${fnSource}\n return applyIdleStateChange;`,
  );

  const dbStub = { ref() { return { set() {} }; } };

  // Scenario: user becomes idle (globalIdleState = true, status was Activo)
  const applyFn = buildFn(
    user, true,
    false, false, false,
    Date.now(), dbStub,
    (type, action) => { timelineEvents.push({ type, action }); },
    () => {}, () => {}, () => {},
  );

  applyFn();

  assert(
    timelineEvents.some(e => e.type === 'Inactividad' && e.action === 'start'),
    'applyIdleStateChange must push Inactividad/start when user transitions from Activo to idle'
  );
}

// ============================================================================
// TEST 3 (Fix #1 — behavioral): applyIdleStateChange records the END of
// an idle period when globalIdleState goes back to false
// ============================================================================
function testApplyIdleStateChangeRecordsActiveTransition() {
  const fnSource = extractBetween(
    'function applyIdleStateChange()',
    'checkAndStartIdleDetector();',
  );

  const timelineEvents = [];
  const user = { role: 'Gestor', uid: 'u1', status: 'Inactivo' };

  const buildFn = new Function(
    'currentUser',
    'globalIdleState',
    'isLunchBreak', 'isBreakfastBreak', 'isSplitShiftBreak',
    'lastLocalActivityTimestamp',
    'database', 'pushTimelineEvent', 'loadBreakState',
    'updateStatusDisplay', 'syncActiveSessionToFirebase',
    `${fnSource}\n return applyIdleStateChange;`,
  );

  const dbStub = { ref() { return { set() {} }; } };

  // Scenario: user returns from idle (globalIdleState = false, status was Inactivo)
  const applyFn = buildFn(
    user, false,
    false, false, false,
    Date.now(), dbStub,
    (type, action) => { timelineEvents.push({ type, action }); },
    () => {}, () => {}, () => {},
  );

  applyFn();

  assert(
    timelineEvents.some(e => e.type === 'Inactividad' && e.action === 'end'),
    'applyIdleStateChange must push Inactividad/end when user transitions from Inactivo back to active'
  );
}

// ============================================================================
// TEST 4 (Fix #2 — static): The 1-second setInterval fallback must call
// pushTimelineEvent when it detects inactivity
// ============================================================================
function testFallbackIntervalPushesTimelineStart() {
  const startMarker = '// Fast checker loop to apply 10s inactivity exactly on time';
  const endMarker = 'try {';
  const startIdx = appSource.indexOf(startMarker);
  assert(startIdx >= 0, 'Missing marker: ' + startMarker);
  // Find the `try {` that appears after the setInterval (L573), not inside it
  const afterInterval = appSource.indexOf('}, 1000);', startIdx);
  assert(afterInterval > startIdx, 'Could not find end of setInterval block');
  const intervalSource = appSource.slice(startIdx, afterInterval + 9);

  const hasPush = /pushTimelineEvent\s*\(\s*['"]Inactividad['"]\s*,\s*['"]start['"]\s*\)/.test(intervalSource);

  assert(
    hasPush,
    'The 1s fallback setInterval must call pushTimelineEvent(\'Inactividad\', \'start\') — currently it only writes status to Firebase'
  );
}

// ============================================================================
// TEST 5 (Fix #3 — static): updateActivity must close the Inactividad
// timeline event when the user returns
// ============================================================================
function testUpdateActivityClosesInactivityEvent() {
  const startMarker = '// Activity listeners';
  const endMarker = "document.addEventListener('mousemove'";
  const startIdx = appSource.indexOf(startMarker);
  assert(startIdx >= 0, 'Missing marker: ' + startMarker);
  const endIdx = appSource.indexOf(endMarker, startIdx);
  assert(endIdx > startIdx, 'Missing end marker: ' + endMarker);
  const fnSource = appSource.slice(startIdx, endIdx);

  const hasEndPush = /pushTimelineEvent\s*\(\s*['"]Inactividad['"]\s*,\s*['"]end['"]\s*\)/.test(fnSource);

  assert(
    hasEndPush,
    'updateActivity() must call pushTimelineEvent(\'Inactividad\', \'end\') — currently the timeline event stays open'
  );
}

// ============================================================================
// TEST 6 (Fix #4 — static): syncActiveSessionToFirebase must use isDomIdle
// even when IdleDetector is granted
// ============================================================================
function testSyncCombinesBothIdleSignals() {
  const inactivityBlock = extractBetween(
    '// --- INACTIVITY LOGIC ---',
    'localStatus = currentStatus;',
  );

  const idleDetectorBlock = inactivityBlock.match(
    /if\s*\(\s*window\.idleDetectorGranted\s*\)\s*\{([^}]+)\}/
  );

  assert(idleDetectorBlock, 'Could not find the idleDetectorGranted block');

  const blockBody = idleDetectorBlock[1];
  const usesDomIdle = /isDomIdle/.test(blockBody);

  assert(
    usesDomIdle,
    'When IdleDetector is granted, isInactive must consider isDomIdle too — users who leave the web but stay on the PC are never detected'
  );
}

// ============================================================================
// TEST 7 (Fix #5 — static): visibilitychange handler must detect PC
// suspension by checking lastSyncLoopTimestamp
// ============================================================================
function testVisibilityChangeDetectsSuspension() {
  const visibilitySource = extractBetween(
    "document.addEventListener('visibilitychange'",
    '// Fast checker loop',
  );

  const checksTimeSinceSync = /lastSyncLoopTimestamp/.test(visibilitySource);

  assert(
    checksTimeSinceSync,
    'visibilitychange must check lastSyncLoopTimestamp to detect PC suspension and inject retroactive Inactividad events'
  );
}

// ============================================================================
// TEST 8 (structural): ALL detection mechanisms must record in the timeline
// ============================================================================
function testAllMechanismsRecordInTimeline() {
  // Mechanism A: applyIdleStateChange (IdleDetector callback)
  const applySource = extractBetween(
    'function applyIdleStateChange()',
    'checkAndStartIdleDetector();',
  );
  assert(
    /pushTimelineEvent/.test(applySource),
    'applyIdleStateChange must push timeline events'
  );

  // Mechanism B: setInterval fallback
  const intervalStart = appSource.indexOf('// Fast checker loop to apply 10s inactivity exactly on time');
  const intervalEnd = appSource.indexOf('}, 1000);', intervalStart);
  assert(intervalStart >= 0 && intervalEnd > intervalStart, 'Could not find setInterval block');
  const intervalSource = appSource.slice(intervalStart, intervalEnd + 9);
  assert(
    /pushTimelineEvent/.test(intervalSource),
    'The 1s fallback interval must push timeline events'
  );

  // Mechanism C: updateActivity (DOM events)
  const actStart = appSource.indexOf('// Activity listeners');
  const actEnd = appSource.indexOf("document.addEventListener('mousemove'", actStart);
  assert(actStart >= 0 && actEnd > actStart, 'Could not find updateActivity block');
  const activitySource = appSource.slice(actStart, actEnd);
  assert(
    /pushTimelineEvent/.test(activitySource),
    'updateActivity must push timeline end events'
  );
}

// ============================================================================
// TEST 9 (safety): Guard against duplicate timeline events
// ============================================================================
function testNoDuplicateTimelineEvents() {
  const applySource = extractBetween(
    'function applyIdleStateChange()',
    'checkAndStartIdleDetector();',
  );

  // Must check status === 'Activo' BEFORE pushing 'start'
  const guardsStart = /currentUser\.status\s*===\s*['"]Activo['"][\s\S]*?pushTimelineEvent\s*\(\s*['"]Inactividad['"]\s*,\s*['"]start['"]/.test(applySource);
  assert(
    guardsStart,
    'applyIdleStateChange must guard start push with status === Activo check'
  );

  // Must check status === 'Inactivo' BEFORE pushing 'end'
  const guardsEnd = /currentUser\.status\s*===\s*['"]Inactivo['"][\s\S]*?pushTimelineEvent\s*\(\s*['"]Inactividad['"]\s*,\s*['"]end['"]/.test(applySource);
  assert(
    guardsEnd,
    'applyIdleStateChange must guard end push with status === Inactivo check'
  );
}

// ============================================================================
// Runner
// ============================================================================
const tests = [
  ['Fix1-static: applyIdleStateChange pushes timeline events', testApplyIdleStateChangePushesTimelineEvents],
  ['Fix1-behavior: idle transition records start', testApplyIdleStateChangeRecordsIdleTransition],
  ['Fix1-behavior: active transition records end', testApplyIdleStateChangeRecordsActiveTransition],
  ['Fix2-static: fallback 1s interval pushes timeline', testFallbackIntervalPushesTimelineStart],
  ['Fix3-static: updateActivity closes inactivity', testUpdateActivityClosesInactivityEvent],
  ['Fix4-static: sync combines IdleDetector + DOM idle', testSyncCombinesBothIdleSignals],
  ['Fix5-static: visibilitychange detects suspension', testVisibilityChangeDetectsSuspension],
  ['Structural: all mechanisms record in timeline', testAllMechanismsRecordInTimeline],
  ['Safety: no duplicate timeline events', testNoDuplicateTimelineEvents],
];

let passed = 0;
let failed = 0;
const failures = [];

console.log('\nINACTIVITY TIMELINE TESTS');
console.log('='.repeat(60));

for (const [name, fn] of tests) {
  try {
    fn();
    passed++;
    console.log(`  \u2713 ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, message: err.message });
    console.log(`  \u2717 ${name}`);
    console.log(`    \u2192 ${err.message}`);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`RESULT: ${passed} passed, ${failed} failed of ${tests.length}`);
if (failures.length > 0) {
  console.log(`\nFailed tests confirm these bugs in the current code:`);
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}`));
}
console.log('='.repeat(60));

process.exitCode = failed > 0 ? 1 : 0;
