// Firebase Rules Emulator test cases for the "Supervisor puede publicar y consultar
// lecturas de comunicados" authorization change.
//
// STATUS (2026-08-24): the co-lead has deployed the corresponding Realtime Database
// Rules to production (`riskops-75637`), and database.rules.json in this repo has been
// updated to match exactly (see the `$announcement_id` node: Admin keeps full write;
// Supervisor may only `set` a brand-new `$announcement_id` with `title`/`content`/
// `date`/`author`/`authorUid` as strings, `authorUid === auth.uid`, and no `readBy`).
// All cases below are expected to PASS against database.rules.json as committed.
//
// WHY THIS IS A SEPARATE FILE (not merged into qa_matrix.js's buildSpecs()):
// qa_matrix.js pins database.rules.json to an exact SHA256 (EXPECTED_R1_SHA256) as part
// of a broader Fase 1 compatibility matrix (F0/F1 x R0/R1) with its own seed/fixture
// shape. This file is self-contained (reads database.rules.json directly, no SHA pin)
// and focuses specifically on the Supervisor-comunicados contract, so it can run
// independently of that pinned matrix. qa_matrix.js separately carries its own
// Supervisor-comunicados cases (see buildSpecs() in that file) that exercise the same
// contract inside the pinned F0/F1 x R0/R1 matrix.
//
// REQUIRES JAVA (Firebase Realtime Database Emulator). Cannot run in this sandbox.
// Run locally/in CI once Java is available:
//
//   cd .github/qa-infra
//   npm ci --ignore-scripts
//   npx firebase setup:emulators:database
//   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9199 FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9100 \
//     npm run test:supervisor-comunicados-rules
//
// RULES_PATH may be overridden to point at a different rules file, e.g. to re-verify
// against a fresh export of the deployed production rules:
// RULES_PATH=/path/to/rules.json node supervisor_comunicados_rules.spec.js

const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

const PROJECT_ID = 'demo-risk-manager-qa-supervisor-comunicados';
const RULES_PATH = process.env.RULES_PATH || path.resolve(__dirname, '..', '..', 'database.rules.json');

const results = [];

function record(id, requirement, passed, note) {
  results.push({ id, requirement, passed, note: note || null });
}

async function seed(testEnv) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.database();
    await db.ref().set({
      users: {
        QA_ADMIN: { name: 'QA Admin', role: 'Admin', approved: true },
        QA_SUPERVISOR: { name: 'QA Supervisor', role: 'Supervisor', approved: true },
        QA_SUPERVISOR_2: { name: 'QA Supervisor 2', role: 'Supervisor', approved: true },
        QA_GESTOR: { name: 'QA Gestor', role: 'Gestor', approved: true },
      },
      announcements: {
        existing: { title: 'Existing', content: 'Hello', author: 'QA Admin', authorUid: 'QA_ADMIN', date: new Date().toISOString() },
      },
    });
  });
}

async function main() {
  const rulesSource = fs.readFileSync(RULES_PATH, 'utf8');
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    database: { host: '127.0.0.1', port: 9100, rules: rulesSource },
  });

  async function tryAssert(id, requirement, expectAllowed, op) {
    let allowed;
    try {
      await op();
      allowed = true;
    } catch (e) {
      allowed = false;
    }
    const passed = allowed === expectAllowed;
    record(id, requirement, passed, `expected=${expectAllowed} actual=${allowed}`);
  }

  try {
    await seed(testEnv);
    const admin = testEnv.authenticatedContext('QA_ADMIN').database();
    const supervisor = testEnv.authenticatedContext('QA_SUPERVISOR').database();
    const gestor = testEnv.authenticatedContext('QA_GESTOR').database();

    // 1. Admin puede crear un comunicado.
    await tryAssert('admin_can_create', 'Admin crea comunicado', true, () =>
      admin.ref('announcements/admin_new').set({ title: 'A', content: 'B', author: 'QA Admin', authorUid: 'QA_ADMIN', date: new Date().toISOString() }));

    // 2. Admin puede eliminar un comunicado.
    await tryAssert('admin_can_delete', 'Admin elimina comunicado', true, () =>
      admin.ref('announcements/existing').remove());
    // restore for subsequent cases
    await testEnv.withSecurityRulesDisabled((context) => context.database().ref('announcements/existing').set({ title: 'Existing', content: 'Hello', author: 'QA Admin', authorUid: 'QA_ADMIN', date: new Date().toISOString() }));

    // 3. Supervisor puede crear un comunicado nuevo (con authorUid propio y sin readBy).
    await tryAssert('supervisor_can_create', 'Supervisor crea comunicado nuevo', true, () =>
      supervisor.ref('announcements/supervisor_new').set({ title: 'S', content: 'C', author: 'QA Supervisor', authorUid: 'QA_SUPERVISOR', date: new Date().toISOString() }));

    // 3b. Supervisor NO puede crear un comunicado con lecturas prefabricadas
    // (authorUid correcto aquí para aislar específicamente el rechazo por readBy).
    await tryAssert('supervisor_cannot_prefab_readby_on_create', 'Supervisor no puede prefabricar readBy al crear', false, () =>
      supervisor.ref('announcements/supervisor_prefab').set({
        title: 'S2', content: 'C2', author: 'QA Supervisor', authorUid: 'QA_SUPERVISOR', date: new Date().toISOString(),
        readBy: { QA_SUPERVISOR_2: { readAt: new Date().toISOString() } },
      }));

    // 3c. Supervisor NO puede crear un comunicado atribuyendo authorUid de otro usuario.
    await tryAssert('supervisor_cannot_spoof_authorUid_on_create', 'Supervisor no puede falsificar authorUid al crear', false, () =>
      supervisor.ref('announcements/supervisor_spoofed_author').set({
        title: 'S3', content: 'C3', author: 'QA Admin', authorUid: 'QA_ADMIN', date: new Date().toISOString(),
      }));

    // 4. Supervisor NO puede actualizar un comunicado existente.
    await tryAssert('supervisor_cannot_update_existing', 'Supervisor no puede actualizar comunicado existente', false, () =>
      supervisor.ref('announcements/existing/title').set('Tampered'));

    // 5. Supervisor NO puede eliminar un comunicado.
    await tryAssert('supervisor_cannot_delete', 'Supervisor no puede eliminar comunicado', false, () =>
      supervisor.ref('announcements/existing').remove());

    // 6. Supervisor puede consultar las lecturas (read del nodo, incluye readBy).
    await tryAssert('supervisor_can_read_lecturas', 'Supervisor puede leer comunicados/readBy', true, () =>
      supervisor.ref('announcements/existing').once('value'));

    // 7. Gestor NO puede publicar (crear) un comunicado, incluso con un payload
    // bien formado (authorUid propio, sin readBy) — el rechazo debe ser por rol.
    await tryAssert('gestor_cannot_create', 'Gestor no puede crear comunicado', false, () =>
      gestor.ref('announcements/gestor_new').set({ title: 'G', content: 'D', author: 'QA Gestor', authorUid: 'QA_GESTOR', date: new Date().toISOString() }));

    // 8. Gestor solo puede registrar su propia lectura.
    await tryAssert('gestor_can_mark_own_read', 'Gestor registra su propia lectura', true, () =>
      gestor.ref('announcements/existing/readBy/QA_GESTOR').set({ name: 'QA Gestor', readAt: new Date().toISOString() }));

    // 9. Ningun usuario puede registrar una lectura a nombre de otro (Gestor -> Supervisor2, and Supervisor -> Supervisor2).
    await tryAssert('gestor_cannot_mark_others_read', 'Gestor no puede marcar lectura de otro usuario', false, () =>
      gestor.ref('announcements/existing/readBy/QA_SUPERVISOR_2').set({ name: 'QA Supervisor 2', readAt: new Date().toISOString() }));
    await tryAssert('supervisor_cannot_mark_others_read', 'Supervisor no puede marcar lectura de otro usuario', false, () =>
      supervisor.ref('announcements/existing/readBy/QA_SUPERVISOR_2').set({ name: 'QA Supervisor 2', readAt: new Date().toISOString() }));

    // 12 (console-invocation equivalent at the rules layer): a raw update() call
    // bypassing the UI must still be rejected the same way as the UI-driven set().
    await tryAssert('console_update_supervisor_delete_denied', 'Invocacion manual (update) de Supervisor eliminando contenido es rechazada', false, () =>
      supervisor.ref('announcements/existing').update({ title: 'Manual console tamper' }));
  } finally {
    await testEnv.cleanup();
  }

  const failed = results.filter((r) => !r.passed);
  console.log(JSON.stringify({ rulesPath: RULES_PATH, results }, null, 2));
  if (failed.length) {
    console.error(`SUPERVISOR_COMUNICADOS_RULES_SPEC=FAIL (${failed.length}/${results.length} failed)`);
    process.exitCode = 1;
  } else {
    console.log(`SUPERVISOR_COMUNICADOS_RULES_SPEC=PASS (${results.length}/${results.length})`);
  }
}

main().catch((error) => {
  console.error('SUPERVISOR_COMUNICADOS_RULES_SPEC=ERROR', error);
  process.exitCode = 1;
});
