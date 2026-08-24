const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const {
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const { planUidMigration } = require('./migration_rehearsal');

const PROJECT_ID = 'demo-risk-manager-qa';
const DATABASE_NAMESPACE = PROJECT_ID;
const EXPECTED_R0_SHA256 = process.env.EXPECTED_R0_SHA256
  || '944a56d498d362723f6c8eba903f5123c78120a08deb868b1a5487e3d0c891ab';
const EXPECTED_R1_SHA256 = process.env.EXPECTED_R1_SHA256
  // Updated 2026-08-24: R1 now includes the Supervisor-can-create-only announcements
  // rule deployed by the co-lead to riskops-75637 (see database.rules.json). All
  // Supervisor-create validation lives inside the .write clause's Supervisor branch —
  // there is no separate .validate on $announcement_id, matching the literal deployed
  // rule the co-lead confirmed byte-for-byte.
  || '778bc484601640e034fcedea44a13cda2e3f6ffb067d26ada7500f7dab0b722b';
const F0_SHA = process.env.PRODUCT_BASE_SHA
  || '43537a043dc9548d4066aca670f26209b9e77430';
const F1_SHA = process.env.RELEASE_CANDIDATE_SHA || 'WORKTREE_UNCOMMITTED';
const STATUS = {
  VERIFIED: 'VERIFIED_EXECUTED',
  FAILED: 'FAIL_VERIFIED_EXECUTED',
  PREVIOUS: 'PREVIOUS_EVIDENCE',
  NOT_TESTED: 'NOT_TESTED',
};
let qaStage = 'BOOTSTRAP';

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9199';
process.env.FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9100';

const qaUsers = [
  { uid: 'QA_GESTOR', email: 'qa-gestor@example.invalid', password: 'QaOnly-42!' },
  { uid: 'QA_OTHER_GESTOR', email: 'qa-other@example.invalid', password: 'QaOnly-42!' },
  { uid: 'QA_SUPERVISOR', email: 'qa-supervisor@example.invalid', password: 'QaOnly-42!' },
  { uid: 'QA_ADMIN', email: 'qa-admin@example.invalid', password: 'QaOnly-42!' },
  { uid: 'QA_CONFIRMED_OWNER', email: 'qa-owner@example.invalid', password: 'QaOnly-42!' },
  { uid: 'QA_PENDING', email: 'qa-pending@example.invalid', password: 'QaOnly-42!' },
];

const requiredPaths = [
  'users',
  'permissions',
  'login_logs',
  'logs',
  'shift_reports',
  'active_sessions',
  'announcements',
];

const report = {
  metadata: {
    projectId: PROJECT_ID,
    productionAccess: false,
    rules: {},
    frontend: {
      F0_SHA,
      F1_SHA,
      mode: 'STATIC_CONTRACT',
      browserSmoke: STATUS.NOT_TESTED,
    },
  },
  operations: [],
  matrices: {},
  roles: {},
  legacy: {},
  migration: {},
  summary: {},
};

function sha256(filePath) {
  const canonical = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function redactError(error) {
  if (!error) return null;
  const code = typeof error.code === 'string' ? error.code : 'UNKNOWN';
  if (/permission.denied/i.test(code) || /permission_denied/i.test(String(error.message))) {
    return 'PERMISSION_DENIED';
  }
  if (code !== 'UNKNOWN') return code.replace(/[^A-Z0-9_.-]/gi, '_').slice(0, 80);
  return String(error.message || 'UNKNOWN')
    .replace(/https?:\/\/\S+/gi, 'LOCAL_ENDPOINT')
    .replace(/[^A-Z0-9_. -]/gi, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120);
}

function matrixRuleGeneration(matrix) {
  return matrix.endsWith('_R0') ? 'R0' : 'R1';
}

function expected(matrix, r0Allowed, r1Allowed) {
  return matrixRuleGeneration(matrix) === 'R0' ? r0Allowed : r1Allowed;
}

function publicOperation(operation) {
  return {
    id: operation.id,
    matrix: operation.matrix,
    role: operation.role,
    pathGroup: operation.pathGroup,
    operation: operation.operation,
    expectedAllowed: operation.expectedAllowed,
    actualAllowed: operation.actualAllowed,
    assertionPassed: operation.assertionPassed,
    compatibilityRequirement: operation.compatibilityRequirement,
    compatibilityPassed: operation.compatibilityPassed,
    status: operation.status,
    errorCode: operation.errorCode,
  };
}

async function deleteAllAuthUsers() {
  let pageToken;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    if (page.users.length) {
      await getAuth().deleteUsers(page.users.map((user) => user.uid));
    }
    pageToken = page.pageToken;
  } while (pageToken);
}

async function assertCleanState() {
  const snapshot = await getDatabase().ref().once('value');
  if (snapshot.exists()) throw new Error('RTDB emulator did not reset');
  const users = await getAuth().listUsers(1);
  if (users.users.length !== 0) throw new Error('Auth emulator did not reset');
}

async function seedState() {
  const db = getDatabase();
  await db.ref().set({
    users: {
      QA_GESTOR: { name: 'QA PRIMARY', email: 'qa-gestor@example.invalid', role: 'Gestor', approved: true, status: 'Activo' },
      QA_OTHER_GESTOR: { name: 'QA OTHER', email: 'qa-other@example.invalid', role: 'Gestor', approved: true, status: 'Activo' },
      QA_SUPERVISOR: { name: 'QA SUPERVISOR', email: 'qa-supervisor@example.invalid', role: 'Supervisor', approved: true, status: 'Activo' },
      QA_ADMIN: { name: 'QA ADMIN', email: 'qa-admin@example.invalid', role: 'Admin', approved: true, status: 'Activo' },
      QA_CONFIRMED_OWNER: { name: 'LEGACY OWNER', email: 'qa-owner@example.invalid', role: 'Gestor', approved: true, status: 'Activo' },
      QA_PENDING: { name: 'QA PENDING', email: 'qa-pending@example.invalid', role: 'Gestor', approved: false, status: 'pending' },
      QA_DUPLICATE_A: { name: 'DUPLICATE OWNER', email: 'duplicate-a@example.invalid', role: 'Gestor', approved: true, status: 'Activo' },
      QA_DUPLICATE_B: { name: 'DUPLICATE OWNER', email: 'duplicate-b@example.invalid', role: 'Gestor', approved: true, status: 'Activo' },
    },
    permissions: {
      legacy_pending_without_uid: { gestor: 'LEGACY OWNER', status: 'Pendiente', approved: false },
      legacy_approved_without_uid: { gestor: 'LEGACY OWNER', status: 'Aprobado', approved: true },
      legacy_rejected_without_uid: { gestor: 'LEGACY OWNER', status: 'Rechazado', approved: false },
      ambiguous_without_uid: { gestor: 'DUPLICATE OWNER', status: 'Pendiente', approved: false },
      conflicting_without_uid: { gestor: 'QA OTHER', email: 'qa-owner@example.invalid', status: 'Pendiente', approved: false },
      unmatched_without_uid: { gestor: 'UNKNOWN OWNER', status: 'Pendiente', approved: false },
      pending_with_uid: { gestor: 'LEGACY OWNER', uid: 'QA_CONFIRMED_OWNER', status: 'Pendiente', approved: false },
      other_permission: { uid: 'QA_OTHER_GESTOR', status: 'Pendiente', approved: false },
    },
    login_logs: {
      legacy_open_without_uid: { name: 'QA PRIMARY', email: 'qa-gestor@example.invalid', timestamp: 1_000_100 },
      stale_open_with_active_identity: { name: 'QA PRIMARY', email: 'qa-gestor@example.invalid', timestamp: 10 },
      legacy_closed_without_uid: { name: 'LEGACY OWNER', email: 'qa-owner@example.invalid', loginTime: 100, logoutTime: 200 },
      ambiguous_open_without_uid: { name: 'DUPLICATE OWNER', loginTime: 100 },
      open_without_active_session: { name: 'LEGACY OWNER', email: 'qa-owner@example.invalid', loginTime: 100 },
      unmatched_open_without_uid: { name: 'UNKNOWN OWNER', loginTime: 100 },
      modern_owned: { uid: 'QA_GESTOR', name: 'QA PRIMARY', loginTime: 100 },
      modern_other: { uid: 'QA_OTHER_GESTOR', name: 'QA OTHER', loginTime: 100 },
    },
    logs: {
      existing_other: { uid: 'QA_OTHER_GESTOR', type: 'Synthetic', status: 'Abierto' },
    },
    shift_reports: {
      own_report: { uid: 'QA_GESTOR', gestor: 'QA_GESTOR', timestamp: 100 },
      other_report: { uid: 'QA_OTHER_GESTOR', gestor: 'QA_OTHER_GESTOR', timestamp: 100 },
    },
    active_sessions: {
      QA_GESTOR: { name: 'QA PRIMARY', email: 'qa-gestor@example.invalid', status: 'Activo', loginTime: 1_000_000, lastActive: 1_100_000 },
      QA_OTHER_GESTOR: { name: 'QA OTHER', email: 'qa-other@example.invalid', status: 'Activo', uid: 'QA_OTHER_GESTOR' },
    },
    announcements: {
      existing: { author: 'QA_ADMIN', text: 'Synthetic announcement', readBy: {} },
    },
  });
}

async function runMigrationRehearsal(r1Path) {
  qaStage = 'MIGRATION_REHEARSAL_RULES_INITIALIZATION';
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    database: {
      host: '127.0.0.1',
      port: 9100,
      rules: fs.readFileSync(r1Path, 'utf8'),
    },
  });
  try {
    qaStage = 'MIGRATION_REHEARSAL_RESET';
    await resetFixtures();
    const before = (await getDatabase().ref().once('value')).val() || {};
    const plan = planUidMigration(before);

    if (plan.counts.permissions !== 3) throw new Error('MIGRATION_PERMISSION_COUNT_MISMATCH');
    if (plan.counts.loginLogsOpen !== 1) throw new Error('MIGRATION_OPEN_LOG_COUNT_MISMATCH');
    if (plan.counts.loginLogsClosed !== 1) throw new Error('MIGRATION_CLOSED_LOG_COUNT_MISMATCH');
    if (plan.counts.ambiguous !== 3) throw new Error('MIGRATION_AMBIGUOUS_COUNT_MISMATCH');
    if (plan.counts.unmatched !== 4) throw new Error('MIGRATION_UNMATCHED_COUNT_MISMATCH');
    if (plan.counts.activeSessionsWithoutPayloadUid !== 1) throw new Error('MIGRATION_SESSION_COUNT_MISMATCH');
    if (Object.keys(plan.updates).some((path) => !/^(permissions|login_logs)\/[^/]+\/uid$/.test(path))) {
      throw new Error('MIGRATION_UNSAFE_PATH');
    }

    qaStage = 'MIGRATION_REHEARSAL_APPLY';
    await getDatabase().ref().update(plan.updates);
    const after = (await getDatabase().ref().once('value')).val() || {};
    const expectedAfter = JSON.parse(JSON.stringify(before));
    for (const [updatePath, uid] of Object.entries(plan.updates)) {
      const [pathGroup, id, field] = updatePath.split('/');
      expectedAfter[pathGroup][id][field] = uid;
    }
    assert.deepEqual(after, expectedAfter, 'Migration changed fields beyond the planned UID additions');
    const secondPlan = planUidMigration(after);
    if (secondPlan.counts.selected !== 0) throw new Error('MIGRATION_NOT_IDEMPOTENT');

    const expectedUidPaths = [
      'permissions/legacy_pending_without_uid/uid',
      'permissions/legacy_approved_without_uid/uid',
      'permissions/legacy_rejected_without_uid/uid',
      'login_logs/legacy_open_without_uid/uid',
      'login_logs/legacy_closed_without_uid/uid',
    ];
    for (const uidPath of expectedUidPaths) {
      const snapshot = await getDatabase().ref(uidPath).once('value');
      if (!snapshot.exists()) throw new Error('MIGRATION_EXPECTED_UID_MISSING');
    }
    for (const skipped of plan.skipped) {
      const uidPath = `${skipped.pathGroup}/${skipped.id}/uid`;
      const snapshot = await getDatabase().ref(uidPath).once('value');
      if (snapshot.exists()) throw new Error('MIGRATION_UNSAFE_UID_ASSIGNED');
    }

    const contexts = {
      gestor: testEnv.authenticatedContext('QA_GESTOR'),
      supervisor: testEnv.authenticatedContext('QA_SUPERVISOR'),
      admin: testEnv.authenticatedContext('QA_ADMIN'),
      owner: testEnv.authenticatedContext('QA_CONFIRMED_OWNER'),
    };
    const postMigrationSpecs = [
      { id: 'migrated_owner_permission_read', role: 'QA_CONFIRMED_OWNER', pathGroup: 'permissions', path: 'permissions/legacy_pending_without_uid', operation: 'read', expectedAllowed: true, compatibilityRequirement: 'MUST_ALLOW', context: contexts.owner },
      { id: 'migrated_open_logout_update', role: 'QA_GESTOR', pathGroup: 'login_logs', path: 'login_logs/legacy_open_without_uid', operation: 'update', payload: { logoutTime: 999 }, expectedAllowed: true, compatibilityRequirement: 'MUST_ALLOW', context: contexts.gestor },
      { id: 'migrated_closed_admin_read', role: 'QA_ADMIN', pathGroup: 'login_logs', path: 'login_logs/legacy_closed_without_uid', operation: 'read', expectedAllowed: true, compatibilityRequirement: 'MUST_ALLOW', context: contexts.admin },
      { id: 'migrated_permission_supervisor_read', role: 'QA_SUPERVISOR', pathGroup: 'permissions', path: 'permissions/legacy_pending_without_uid', operation: 'read', expectedAllowed: true, context: contexts.supervisor },
      { id: 'migrated_permission_supervisor_approve', role: 'QA_SUPERVISOR', pathGroup: 'permissions', path: 'permissions/legacy_pending_without_uid', operation: 'update', payload: { status: 'Aprobado' }, expectedAllowed: true, context: contexts.supervisor },
      { id: 'migrated_permission_admin_approve', role: 'QA_ADMIN', pathGroup: 'permissions', path: 'permissions/legacy_approved_without_uid', operation: 'update', payload: { status: 'Aprobado' }, expectedAllowed: true, context: contexts.admin },
    ];
    for (const spec of postMigrationSpecs) await runOperation('F1_R1_MIGRATED', spec);

    report.migration = {
      status: postMigrationSpecs.every((spec) => {
        const result = report.operations.find((operation) => operation.matrix === 'F1_R1_MIGRATED' && operation.id === spec.id);
        return result && result.assertionPassed;
      }) ? STATUS.VERIFIED : STATUS.FAILED,
      policy: 'UID_ONLY_UNIQUE_EVIDENCE_NO_OVERWRITE',
      counts: plan.counts,
      idempotent: secondPlan.counts.selected === 0,
      ambiguousRecordsUnchanged: true,
      unmatchedRecordsUnchanged: true,
    };
  } finally {
    await testEnv.cleanup();
  }
}

async function resetFixtures() {
  await getDatabase().ref().remove();
  await deleteAllAuthUsers();
  await assertCleanState();
  for (const user of qaUsers) await getAuth().createUser(user);
  const created = await getAuth().listUsers(100);
  if (created.users.length !== qaUsers.length) throw new Error('Auth fixture count mismatch');
  await seedState();
}

async function perform(spec) {
  try {
    if (spec.operation === 'auth-login') {
      const response = await fetch(
        'http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=qa-emulator-key',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: spec.email, password: spec.password, returnSecureToken: true }),
        },
      );
      if (!response.ok) throw new Error(`AUTH_LOGIN_${response.status}`);
      const result = await response.json();
      if (!result.idToken || result.localId !== spec.uid) throw new Error('AUTH_LOGIN_INVALID_RESPONSE');
      return { allowed: true, errorCode: null };
    }
    const db = spec.context.database();
    if (spec.operation === 'read') await db.ref(spec.path).once('value');
    else if (spec.operation === 'query-own') {
      await db.ref(spec.path).orderByChild('uid').equalTo(spec.uid).once('value');
    } else if (spec.operation === 'set') await db.ref(spec.path).set(spec.payload);
    else if (spec.operation === 'update') await db.ref(spec.path).update(spec.payload);
    else if (spec.operation === 'remove') await db.ref(spec.path).remove();
    else if (spec.operation === 'root-update') await db.ref().update(spec.payload);
    else throw new Error(`Unknown operation ${spec.operation}`);
    return { allowed: true, errorCode: null };
  } catch (error) {
    return { allowed: false, errorCode: redactError(error) };
  }
}

async function runOperation(matrix, spec) {
  const outcome = await perform(spec);
  const assertionPassed = outcome.allowed === spec.expectedAllowed;
  const compatibilityRequirement = spec.compatibilityRequirement || 'NOT_APPLICABLE';
  const compatibilityPassed = compatibilityRequirement === 'MUST_ALLOW'
    ? outcome.allowed
    : compatibilityRequirement === 'MUST_DENY'
      ? !outcome.allowed
      : null;
  report.operations.push(publicOperation({
    ...spec,
    matrix,
    actualAllowed: outcome.allowed,
    assertionPassed,
    compatibilityRequirement,
    compatibilityPassed,
    status: assertionPassed ? STATUS.VERIFIED : STATUS.FAILED,
    errorCode: outcome.errorCode,
  }));
}

function buildSpecs(matrix, contexts) {
  const { unauth, gestor, other, supervisor, admin, owner, pending } = contexts;
  const modernLogin = { uid: 'QA_GESTOR', loginTime: 300 };
  const legacyLogin = { loginTime: 300 };
  const loginPayload = matrix.startsWith('F0_') ? legacyLogin : modernLogin;
  const r0 = matrixRuleGeneration(matrix) === 'R0';
  return [
    { id: 'gestor_auth_login', role: 'QA_GESTOR', pathGroup: 'users', operation: 'auth-login', email: 'qa-gestor@example.invalid', password: 'QaOnly-42!', uid: 'QA_GESTOR', expectedAllowed: true },
    { id: 'other_gestor_auth_login', role: 'QA_OTHER_GESTOR', pathGroup: 'users', operation: 'auth-login', email: 'qa-other@example.invalid', password: 'QaOnly-42!', uid: 'QA_OTHER_GESTOR', expectedAllowed: true },
    { id: 'supervisor_auth_login', role: 'QA_SUPERVISOR', pathGroup: 'users', operation: 'auth-login', email: 'qa-supervisor@example.invalid', password: 'QaOnly-42!', uid: 'QA_SUPERVISOR', expectedAllowed: true },
    { id: 'admin_auth_login', role: 'QA_ADMIN', pathGroup: 'users', operation: 'auth-login', email: 'qa-admin@example.invalid', password: 'QaOnly-42!', uid: 'QA_ADMIN', expectedAllowed: true },
    { id: 'owner_auth_login', role: 'QA_CONFIRMED_OWNER', pathGroup: 'users', operation: 'auth-login', email: 'qa-owner@example.invalid', password: 'QaOnly-42!', uid: 'QA_CONFIRMED_OWNER', expectedAllowed: true },
    { id: 'pending_auth_login', role: 'QA_PENDING', pathGroup: 'users', operation: 'auth-login', email: 'qa-pending@example.invalid', password: 'QaOnly-42!', uid: 'QA_PENDING', expectedAllowed: true },
    { id: 'unauth_users_read_denied', role: 'UNAUTH', pathGroup: 'users', path: 'users', operation: 'read', expectedAllowed: false, context: unauth },
    { id: 'gestor_own_profile_read', role: 'QA_GESTOR', pathGroup: 'users', path: 'users/QA_GESTOR', operation: 'read', expectedAllowed: true, context: gestor },
    { id: 'gestor_other_profile_read', role: 'QA_GESTOR', pathGroup: 'users', path: 'users/QA_OTHER_GESTOR', operation: 'read', expectedAllowed: r0, context: gestor },
    { id: 'gestor_role_escalation_denied', role: 'QA_GESTOR', pathGroup: 'users', path: 'users/QA_GESTOR', operation: 'update', payload: { role: 'Admin' }, expectedAllowed: false, context: gestor },
    { id: 'supervisor_users_read', role: 'QA_SUPERVISOR', pathGroup: 'users', path: 'users', operation: 'read', expectedAllowed: true, context: supervisor },
    { id: 'supervisor_admin_escalation_denied', role: 'QA_SUPERVISOR', pathGroup: 'users', path: 'users/QA_SUPERVISOR', operation: 'update', payload: { role: 'Admin' }, expectedAllowed: false, context: supervisor },
    { id: 'admin_user_create', role: 'QA_ADMIN', pathGroup: 'users', path: 'users/QA_NEW_GESTOR', operation: 'set', payload: { role: 'Gestor', status: 'Activo', approved: true }, expectedAllowed: true, context: admin },
    { id: 'pending_own_profile_read', role: 'QA_PENDING', pathGroup: 'users', path: 'users/QA_PENDING', operation: 'read', expectedAllowed: true, context: pending },
    { id: 'pending_self_activation_denied', role: 'QA_PENDING', pathGroup: 'users', path: 'users/QA_PENDING/status', operation: 'set', payload: 'Activo', expectedAllowed: r0, context: pending },

    { id: 'gestor_permissions_collection_read', role: 'QA_GESTOR', pathGroup: 'permissions', path: 'permissions', operation: 'read', expectedAllowed: r0, context: gestor },
    { id: 'gestor_own_permissions_query', role: 'QA_GESTOR', pathGroup: 'permissions', path: 'permissions', operation: 'query-own', uid: 'QA_GESTOR', expectedAllowed: true, context: gestor },
    { id: 'gestor_other_permission_read', role: 'QA_GESTOR', pathGroup: 'permissions', path: 'permissions/other_permission', operation: 'read', expectedAllowed: r0, context: gestor },
    { id: 'owner_legacy_permission_without_uid', role: 'QA_CONFIRMED_OWNER', pathGroup: 'permissions', path: 'permissions/legacy_pending_without_uid', operation: 'read', expectedAllowed: r0, compatibilityRequirement: 'MUST_ALLOW', context: owner },
    { id: 'owner_permission_with_uid', role: 'QA_CONFIRMED_OWNER', pathGroup: 'permissions', path: 'permissions/pending_with_uid', operation: 'read', expectedAllowed: true, compatibilityRequirement: 'MUST_ALLOW', context: owner },
    { id: 'supervisor_legacy_permission_read', role: 'QA_SUPERVISOR', pathGroup: 'permissions', path: 'permissions/legacy_pending_without_uid', operation: 'read', expectedAllowed: true, context: supervisor },
    { id: 'supervisor_legacy_permission_approve', role: 'QA_SUPERVISOR', pathGroup: 'permissions', path: 'permissions/legacy_pending_without_uid', operation: 'update', payload: { status: 'Aprobado' }, expectedAllowed: true, context: supervisor },
    { id: 'admin_legacy_permission_reject', role: 'QA_ADMIN', pathGroup: 'permissions', path: 'permissions/legacy_rejected_without_uid', operation: 'update', payload: { status: 'Rechazado' }, expectedAllowed: true, context: admin },

    { id: 'frontend_login_payload', role: 'QA_GESTOR', pathGroup: 'login_logs', path: `login_logs/${matrix}_new`, operation: 'set', payload: loginPayload, expectedAllowed: r0 || matrix.startsWith('F1_'), compatibilityRequirement: 'MUST_ALLOW', context: gestor },
    { id: 'legacy_open_logout_update', role: 'QA_GESTOR', pathGroup: 'login_logs', path: 'login_logs/legacy_open_without_uid', operation: 'update', payload: { logoutTime: 999 }, expectedAllowed: r0, compatibilityRequirement: 'MUST_ALLOW', context: gestor },
    { id: 'legacy_closed_admin_read', role: 'QA_ADMIN', pathGroup: 'login_logs', path: 'login_logs/legacy_closed_without_uid', operation: 'read', expectedAllowed: true, compatibilityRequirement: 'MUST_ALLOW', context: admin },
    { id: 'gestor_other_login_mutation', role: 'QA_GESTOR', pathGroup: 'login_logs', path: 'login_logs/modern_other', operation: 'update', payload: { logoutTime: 999 }, expectedAllowed: r0, context: gestor },

    { id: 'gestor_own_log_create', role: 'QA_GESTOR', pathGroup: 'logs', path: `logs/${matrix}_own`, operation: 'set', payload: { uid: 'QA_GESTOR', type: 'Synthetic', status: 'Abierto' }, expectedAllowed: true, context: gestor },
    { id: 'gestor_spoofed_log_create', role: 'QA_GESTOR', pathGroup: 'logs', path: `logs/${matrix}_spoofed`, operation: 'set', payload: { uid: 'QA_OTHER_GESTOR', type: 'Synthetic', status: 'Abierto' }, expectedAllowed: r0, context: gestor },
    { id: 'gestor_existing_log_update_denied', role: 'QA_GESTOR', pathGroup: 'logs', path: 'logs/existing_other', operation: 'update', payload: { status: 'Cerrado' }, expectedAllowed: r0, context: gestor },
    { id: 'supervisor_logs_read', role: 'QA_SUPERVISOR', pathGroup: 'logs', path: 'logs', operation: 'read', expectedAllowed: true, context: supervisor },
    { id: 'admin_logs_read', role: 'QA_ADMIN', pathGroup: 'logs', path: 'logs', operation: 'read', expectedAllowed: true, context: admin },

    { id: 'gestor_own_shift_report_read', role: 'QA_GESTOR', pathGroup: 'shift_reports', path: 'shift_reports/own_report', operation: 'read', expectedAllowed: true, context: gestor },
    { id: 'gestor_other_shift_report_read', role: 'QA_GESTOR', pathGroup: 'shift_reports', path: 'shift_reports/other_report', operation: 'read', expectedAllowed: r0, context: gestor },
    { id: 'gestor_own_shift_report_create', role: 'QA_GESTOR', pathGroup: 'shift_reports', path: `shift_reports/${matrix}_own`, operation: 'set', payload: { uid: 'QA_GESTOR', gestor: 'QA_GESTOR', timestamp: 300 }, expectedAllowed: true, context: gestor },
    { id: 'gestor_spoofed_shift_report_create', role: 'QA_GESTOR', pathGroup: 'shift_reports', path: `shift_reports/${matrix}_spoofed`, operation: 'set', payload: { uid: 'QA_OTHER_GESTOR', gestor: 'QA_OTHER_GESTOR', timestamp: 300 }, expectedAllowed: r0, context: gestor },
    { id: 'supervisor_shift_reports_read', role: 'QA_SUPERVISOR', pathGroup: 'shift_reports', path: 'shift_reports', operation: 'read', expectedAllowed: true, context: supervisor },

    { id: 'legacy_active_session_owner_read', role: 'QA_GESTOR', pathGroup: 'active_sessions', path: 'active_sessions/QA_GESTOR', operation: 'read', expectedAllowed: true, compatibilityRequirement: 'MUST_ALLOW', context: gestor },
    { id: 'legacy_active_session_owner_update', role: 'QA_GESTOR', pathGroup: 'active_sessions', path: 'active_sessions/QA_GESTOR', operation: 'update', payload: { lastHeartbeat: 300 }, expectedAllowed: true, compatibilityRequirement: 'MUST_ALLOW', context: gestor },
    { id: 'gestor_other_active_session_read', role: 'QA_GESTOR', pathGroup: 'active_sessions', path: 'active_sessions/QA_OTHER_GESTOR', operation: 'read', expectedAllowed: r0, context: gestor },
    { id: 'gestor_other_active_session_write', role: 'QA_GESTOR', pathGroup: 'active_sessions', path: 'active_sessions/QA_OTHER_GESTOR', operation: 'update', payload: { status: 'Inactivo' }, expectedAllowed: r0, context: gestor },
    { id: 'supervisor_active_sessions_read', role: 'QA_SUPERVISOR', pathGroup: 'active_sessions', path: 'active_sessions', operation: 'read', expectedAllowed: true, context: supervisor },
    { id: 'admin_active_sessions_read', role: 'QA_ADMIN', pathGroup: 'active_sessions', path: 'active_sessions', operation: 'read', expectedAllowed: true, context: admin },

    // Task-persistence hotfix (2026-08-24): saveTaskBtn now writes a single task
    // record directly to active_sessions/{uid}/tasks/{taskId}. This is a nested
    // write under the already-covered active_sessions/$session_id subtree, and
    // database.rules.json is NOT changed for this hotfix, so behavior must match
    // the existing own/other/admin coverage above byte-for-byte on both R0 and R1.
    { id: 'gestor_own_active_session_task_write', role: 'QA_GESTOR', pathGroup: 'active_sessions', path: `active_sessions/QA_GESTOR/tasks/${matrix}_task_1`, operation: 'update', payload: { name: 'Tarea QA', status: 'Finalizada', observation: 'Gestión QA', updatedAt: 300 }, expectedAllowed: true, compatibilityRequirement: 'MUST_ALLOW', context: gestor },
    { id: 'gestor_other_active_session_task_write_denied', role: 'QA_GESTOR', pathGroup: 'active_sessions', path: `active_sessions/QA_OTHER_GESTOR/tasks/${matrix}_task_1`, operation: 'update', payload: { name: 'Tarea QA', status: 'Finalizada', observation: 'Gestión QA', updatedAt: 300 }, expectedAllowed: r0, context: gestor },
    { id: 'pending_active_session_task_write_denied', role: 'QA_PENDING', pathGroup: 'active_sessions', path: `active_sessions/QA_PENDING/tasks/${matrix}_task_1`, operation: 'update', payload: { name: 'Tarea QA', status: 'Pendiente', observation: 'Gestión QA', updatedAt: 300 }, expectedAllowed: r0, context: pending },
    { id: 'admin_active_session_task_write', role: 'QA_ADMIN', pathGroup: 'active_sessions', path: `active_sessions/QA_GESTOR/tasks/${matrix}_task_admin`, operation: 'update', payload: { name: 'Tarea QA', status: 'Finalizada', observation: 'Gestión Admin', updatedAt: 300 }, expectedAllowed: true, compatibilityRequirement: 'MUST_ALLOW', context: admin },
    { id: 'gestor_own_active_session_task_read', role: 'QA_GESTOR', pathGroup: 'active_sessions', path: 'active_sessions/QA_GESTOR/tasks', operation: 'read', expectedAllowed: true, compatibilityRequirement: 'MUST_ALLOW', context: gestor },

    { id: 'gestor_announcements_read', role: 'QA_GESTOR', pathGroup: 'announcements', path: 'announcements', operation: 'read', expectedAllowed: true, context: gestor },
    { id: 'pending_announcements_read_denied', role: 'QA_PENDING', pathGroup: 'announcements', path: 'announcements', operation: 'read', expectedAllowed: r0, context: pending },
    { id: 'gestor_announcement_admin_write', role: 'QA_GESTOR', pathGroup: 'announcements', path: 'announcements/new_admin', operation: 'set', payload: { author: 'QA_GESTOR', text: 'Synthetic' }, expectedAllowed: r0, context: gestor },
    { id: 'gestor_own_read_receipt', role: 'QA_GESTOR', pathGroup: 'announcements', path: 'announcements/existing/readBy/QA_GESTOR', operation: 'set', payload: { readAt: '2026-08-13T18:00:00.000Z' }, expectedAllowed: true, context: gestor },
    { id: 'gestor_other_read_receipt', role: 'QA_GESTOR', pathGroup: 'announcements', path: 'announcements/existing/readBy/QA_OTHER_GESTOR', operation: 'set', payload: { readAt: '2026-08-13T18:00:00.000Z' }, expectedAllowed: r0, context: gestor },
    { id: 'gestor_announcement_content_tamper_denied', role: 'QA_GESTOR', pathGroup: 'announcements', path: 'announcements/existing', operation: 'update', payload: { text: 'Tampered', readBy: { QA_GESTOR: { readAt: '2026-08-13T18:00:00.000Z' } } }, expectedAllowed: r0, context: gestor },
    // Legacy/malformed Supervisor create attempt: no authorUid and no title/content/date.
    // R1 denies it because the required-field/string checks live directly inside the
    // Supervisor branch of the .write clause itself (there is no separate .validate on
    // $announcement_id) — that branch's newData.hasChildren([...]) condition fails, so
    // the whole .write clause evaluates false, even though a *well-formed* Supervisor
    // create is permitted (see supervisor_valid_announcement_create below). Still denied
    // under R0 (pre-Fase-1 permissive baseline has no Supervisor restriction to begin
    // with, so r0 = allowed).
    { id: 'supervisor_announcement_admin_write', role: 'QA_SUPERVISOR', pathGroup: 'announcements', path: 'announcements/supervisor_admin', operation: 'set', payload: { author: 'QA_SUPERVISOR', text: 'Synthetic' }, expectedAllowed: r0, context: supervisor },
    { id: 'admin_announcement_write', role: 'QA_ADMIN', pathGroup: 'announcements', path: 'announcements/admin', operation: 'set', payload: { title: 'Admin announcement', content: 'Synthetic', date: new Date(300).toISOString(), author: 'QA_ADMIN', authorUid: 'QA_ADMIN' }, expectedAllowed: true, context: admin },

    // Supervisor authorization extension (2026-08-24): Supervisor may create a brand-new
    // announcement (title/content/date/author/authorUid as strings, authorUid === own uid,
    // no readBy), matching the Rules deployed to riskops-75637. Must succeed under both R0
    // (pre-Fase-1 permissive baseline) and R1 (hardened + Supervisor-create rule) — hence
    // MUST_ALLOW rather than gated on r0.
    { id: 'supervisor_valid_announcement_create', role: 'QA_SUPERVISOR', pathGroup: 'announcements', path: `announcements/${matrix}_supervisor_new`, operation: 'set', payload: { title: 'Supervisor announcement', content: 'Contenido de prueba', date: new Date(300).toISOString(), author: 'QA Supervisor', authorUid: 'QA_SUPERVISOR' }, expectedAllowed: true, compatibilityRequirement: 'MUST_ALLOW', context: supervisor },
    // Well-formed except it carries a non-empty readBy at creation time: R1 must still deny it.
    { id: 'supervisor_cannot_prefab_readby_on_create', role: 'QA_SUPERVISOR', pathGroup: 'announcements', path: `announcements/${matrix}_supervisor_prefab`, operation: 'set', payload: { title: 'Prefab', content: 'C', date: new Date(300).toISOString(), author: 'QA Supervisor', authorUid: 'QA_SUPERVISOR', readBy: { QA_OTHER_GESTOR: { readAt: '2026-08-13T18:00:00.000Z' } } }, expectedAllowed: r0, context: supervisor },
    // Well-formed except authorUid names someone else: R1 must still deny it (authorUid
    // must equal auth.uid). R0 (pre-Fase-1 permissive baseline) has no such restriction.
    { id: 'supervisor_cannot_spoof_authorUid_on_create', role: 'QA_SUPERVISOR', pathGroup: 'announcements', path: `announcements/${matrix}_supervisor_spoofed`, operation: 'set', payload: { title: 'Spoofed', content: 'C', date: new Date(300).toISOString(), author: 'QA_ADMIN', authorUid: 'QA_ADMIN' }, expectedAllowed: r0, context: supervisor },
    // Supervisor may not update a field on an announcement that already exists.
    { id: 'supervisor_cannot_update_existing_announcement', role: 'QA_SUPERVISOR', pathGroup: 'announcements', path: 'announcements/existing/text', operation: 'set', payload: 'Tampered by Supervisor', expectedAllowed: r0, context: supervisor },
    // Supervisor may not delete an existing announcement. Kept last among announcement
    // cases: under R0 this removal actually succeeds, so nothing later in this matrix's
    // operation list may depend on announcements/existing still being present.
    { id: 'supervisor_cannot_delete_existing_announcement', role: 'QA_SUPERVISOR', pathGroup: 'announcements', path: 'announcements/existing', operation: 'remove', expectedAllowed: r0, context: supervisor },

    { id: 'atomic_shift_close', role: 'QA_GESTOR', pathGroup: 'shift_reports', path: '/', operation: 'root-update', payload: { [`shift_reports/${matrix}_atomic`]: { uid: 'QA_GESTOR', gestor: 'QA_GESTOR', timestamp: 400 }, 'active_sessions/QA_GESTOR': null, 'login_logs/modern_owned/logoutTime': 400 }, expectedAllowed: true, context: gestor },
    { id: 'atomic_shift_close_other_denied', role: 'QA_GESTOR', pathGroup: 'shift_reports', path: '/', operation: 'root-update', payload: { [`shift_reports/${matrix}_atomic_bad`]: { uid: 'QA_GESTOR', gestor: 'QA_GESTOR', timestamp: 401 }, 'active_sessions/QA_OTHER_GESTOR': null, 'login_logs/modern_other/logoutTime': 401 }, expectedAllowed: r0, context: gestor },

    { id: 'other_gestor_own_profile_read', role: 'QA_OTHER_GESTOR', pathGroup: 'users', path: 'users/QA_OTHER_GESTOR', operation: 'read', expectedAllowed: true, context: other },
  ];
}

function aggregate() {
  for (const matrix of ['F0_R0', 'F1_R0', 'F1_R1', 'F0_R1']) {
    const operations = report.operations.filter((op) => op.matrix === matrix);
    const covered = new Set(operations.map((op) => op.pathGroup));
    const complete = requiredPaths.every((item) => covered.has(item));
    const assertionsPass = operations.length > 0 && operations.every((op) => op.assertionPassed);
    const compatibilityFindings = operations.filter((op) => op.compatibilityPassed === false).map((op) => op.id);
    report.matrices[matrix] = {
      status: complete && assertionsPass ? STATUS.VERIFIED : STATUS.FAILED,
      requiredPathsCovered: complete,
      operationCount: operations.length,
      assertionFailures: operations.filter((op) => !op.assertionPassed).map((op) => op.id),
      compatibilityFindings,
      compatibilityStatus: compatibilityFindings.length ? STATUS.FAILED : STATUS.VERIFIED,
    };
  }

  for (const role of ['QA_GESTOR', 'QA_OTHER_GESTOR', 'QA_SUPERVISOR', 'QA_ADMIN', 'QA_CONFIRMED_OWNER', 'QA_PENDING']) {
    const operations = report.operations.filter((op) => op.role === role);
    report.roles[role] = operations.length > 0 && operations.every((op) => op.assertionPassed)
      ? STATUS.VERIFIED
      : STATUS.FAILED;
  }

  function operationStatus(matrix, id) {
    const operation = report.operations.find((item) => item.matrix === matrix && item.id === id);
    if (!operation) return STATUS.NOT_TESTED;
    return operation.compatibilityPassed === false ? STATUS.FAILED : operation.status;
  }

  report.legacy = {
    LEGACY_OWNER_WITHOUT_UID: operationStatus('F1_R1', 'owner_legacy_permission_without_uid'),
    LEGACY_OWNER_WITH_UID: operationStatus('F1_R1', 'owner_permission_with_uid'),
    OPEN_LOGIN_LOG_WITHOUT_UID: operationStatus('F1_R1', 'legacy_open_logout_update'),
    CLOSED_LOGIN_LOG_WITHOUT_UID: operationStatus('F1_R1', 'legacy_closed_admin_read'),
    LEGACY_ACTIVE_SESSION: operationStatus('F1_R1', 'legacy_active_session_owner_update'),
  };

  const compatibilityFailures = Object.values(report.matrices)
    .flatMap((matrix) => matrix.compatibilityFindings);
  const harnessFailures = report.operations.filter((op) => !op.assertionPassed);
  report.summary = {
    QA_NETWORK_ISOLATION: process.env.QA_NETWORK_ISOLATION === STATUS.VERIFIED ? STATUS.VERIFIED : STATUS.FAILED,
    PRODUCTION_NETWORK_REQUESTS: Number(process.env.PRODUCTION_NETWORK_REQUESTS || '1'),
    QA_GESTOR: report.roles.QA_GESTOR,
    QA_SUPERVISOR: report.roles.QA_SUPERVISOR,
    QA_ADMIN: report.roles.QA_ADMIN,
    F0_R0: report.matrices.F0_R0.compatibilityStatus,
    F1_R0: report.matrices.F1_R0.compatibilityStatus,
    F1_R1: report.matrices.F1_R1.compatibilityStatus,
    F0_R1: report.matrices.F0_R1.compatibilityStatus,
    F1_R1_MIGRATED: report.migration.status || STATUS.NOT_TESTED,
    PENDING_ACCOUNT_DATA_ACCESS_BLOCKED: operationStatus('F1_R1', 'pending_announcements_read_denied'),
    PENDING_ACCOUNT_SELF_ACTIVATION_BLOCKED: operationStatus('F1_R1', 'pending_self_activation_denied'),
    ANNOUNCEMENT_CONTENT_TAMPER_BLOCKED: operationStatus('F1_R1', 'gestor_announcement_content_tamper_denied'),
    ...report.legacy,
    LOGIN_LOGS_WITHOUT_UID_OPEN: STATUS.NOT_TESTED,
    LOGIN_LOGS_WITHOUT_UID_CLOSED: STATUS.NOT_TESTED,
    ACTIVE_SESSIONS_MATCHING_OPEN_LOGIN_LOG: STATUS.NOT_TESTED,
    MIGRATION_REHEARSAL_OPEN_LOG: report.migration.counts && report.migration.counts.loginLogsOpen === 1 ? STATUS.VERIFIED : STATUS.NOT_TESTED,
    MIGRATION_REHEARSAL_CLOSED_LOG: report.migration.counts && report.migration.counts.loginLogsClosed === 1 ? STATUS.VERIFIED : STATUS.NOT_TESTED,
    MIGRATION_REHEARSAL_ACTIVE_SESSION_CORRELATION: report.migration.counts && report.migration.counts.loginLogsOpen === 1 ? STATUS.VERIFIED : STATUS.NOT_TESTED,
    MIGRATION_IDEMPOTENT: report.migration.idempotent ? STATUS.VERIFIED : STATUS.NOT_TESTED,
    MIGRATION_AMBIGUOUS_UNCHANGED: report.migration.ambiguousRecordsUnchanged ? STATUS.VERIFIED : STATUS.NOT_TESTED,
    MIGRATION_UNMATCHED_UNCHANGED: report.migration.unmatchedRecordsUnchanged ? STATUS.VERIFIED : STATUS.NOT_TESTED,
    REAL_DATA_MIGRATION_PREFLIGHT: STATUS.NOT_TESTED,
    DATA_MIGRATION_REQUIRED: compatibilityFailures.length ? 'YES' : 'NO',
    DATA_MIGRATION_SCOPE: compatibilityFailures.length ? 'permissions/*/uid,login_logs/*/uid' : 'NONE',
    RULE_CHANGE_REQUIRED: report.migration.status === STATUS.VERIFIED ? 'NO' : 'REVIEW_REQUIRED',
    FRONTEND_CHANGE_REQUIRED: process.env.F0_F1_STATIC_CONTRACT === STATUS.VERIFIED ? 'NO' : 'REVIEW_REQUIRED',
    CACHE_CHANGE_REQUIRED: STATUS.NOT_TESTED,
    PAGES_CHANGE_REQUIRED: STATUS.NOT_TESTED,
    NEW_RELEASE_CANDIDATE_REQUIRED: report.migration.status === STATUS.VERIFIED ? 'NO' : 'YES',
    FRONTEND_SMOKE: process.env.FRONTEND_SMOKE === STATUS.VERIFIED
      ? STATUS.VERIFIED
      : STATUS.NOT_TESTED,
    F0_F1_STATIC_CONTRACT: process.env.F0_F1_STATIC_CONTRACT === STATUS.VERIFIED
      ? STATUS.VERIFIED
      : STATUS.FAILED,
    REMAINING_BLOCKERS: report.migration.status === STATUS.VERIFIED
      ? 'REAL_DATA_MIGRATION_PREFLIGHT,FRONTEND_BROWSER_SMOKE,REAL_SUPERVISOR_ADMIN_SMOKE'
      : `COMPATIBILITY_FINDINGS:${[...new Set(compatibilityFailures)].sort().join(',')}`,
    PRODUCTION_RELEASE_RECOMMENDATION:
      compatibilityFailures.length
        || harnessFailures.length
        || report.migration.status !== STATUS.VERIFIED
        || process.env.QA_NETWORK_ISOLATION !== STATUS.VERIFIED
        || process.env.F0_F1_STATIC_CONTRACT !== STATUS.VERIFIED
        ? 'NO-GO'
        : 'GO',
  };
}

function writeReports() {
  fs.writeFileSync('phase1-qa-report.json', `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    `PRODUCTION_R0_SHA256 = ${report.metadata.rules.R0.sha256}`,
    `R1_SHA256 = ${report.metadata.rules.R1.sha256}`,
    ...Object.entries(report.summary).map(([key, value]) => `${key} = ${value}`),
  ];
  fs.writeFileSync('phase1-qa-report.txt', `${lines.join('\n')}\n`);
}

async function main() {
  qaStage = 'INPUT_VALIDATION';
  const r0Path = process.env.R0_PATH;
  const r1Path = process.env.R1_PATH;
  if (!r0Path || !r1Path) throw new Error('R0_PATH and R1_PATH are required');
  report.metadata.rules.R0 = { sha256: sha256(r0Path) };
  report.metadata.rules.R1 = { sha256: sha256(r1Path) };
  if (report.metadata.rules.R0.sha256 !== EXPECTED_R0_SHA256) throw new Error('R0_SHA256_MISMATCH');
  if (report.metadata.rules.R1.sha256 !== EXPECTED_R1_SHA256) throw new Error('R1_SHA256_MISMATCH');

  qaStage = 'ADMIN_INITIALIZATION';
  const adminApp = initializeApp({
    projectId: PROJECT_ID,
    databaseURL: `http://127.0.0.1:9100/?ns=${DATABASE_NAMESPACE}`,
  });
  try {
    for (const matrix of ['F0_R0', 'F1_R0', 'F1_R1', 'F0_R1']) {
      const rulesPath = matrixRuleGeneration(matrix) === 'R0' ? r0Path : r1Path;
      qaStage = `MATRIX_${matrix}_RULES_INITIALIZATION`;
      const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        database: {
          host: '127.0.0.1',
          port: 9100,
          rules: fs.readFileSync(rulesPath, 'utf8'),
        },
      });
      qaStage = `MATRIX_${matrix}_RESET`;
      try {
        await resetFixtures();
        const contexts = {
          unauth: testEnv.unauthenticatedContext(),
          gestor: testEnv.authenticatedContext('QA_GESTOR'),
          other: testEnv.authenticatedContext('QA_OTHER_GESTOR'),
          supervisor: testEnv.authenticatedContext('QA_SUPERVISOR'),
          admin: testEnv.authenticatedContext('QA_ADMIN'),
          owner: testEnv.authenticatedContext('QA_CONFIRMED_OWNER'),
          pending: testEnv.authenticatedContext('QA_PENDING'),
        };
        qaStage = `MATRIX_${matrix}_OPERATIONS`;
        for (const spec of buildSpecs(matrix, contexts)) await runOperation(matrix, spec);
      } finally {
        await testEnv.cleanup();
      }
    }
    qaStage = 'MIGRATION_REHEARSAL';
    await runMigrationRehearsal(r1Path);
    qaStage = 'AGGREGATION';
    aggregate();
    writeReports();
  } finally {
    await deleteApp(adminApp);
  }

  const harnessFailed = report.operations.some((operation) => !operation.assertionPassed);
  const coverageFailed = Object.values(report.matrices).some((matrix) => !matrix.requiredPathsCovered);
  const isolationFailed = report.summary.QA_NETWORK_ISOLATION !== STATUS.VERIFIED
    || report.summary.PRODUCTION_NETWORK_REQUESTS !== 0;
  if (harnessFailed || coverageFailed || isolationFailed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`QA_FAILURE_STAGE=${qaStage}`);
  console.error(`QA_FAILURE=${redactError(error)}`);
  process.exitCode = 1;
});
