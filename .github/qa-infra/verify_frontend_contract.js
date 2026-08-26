const crypto = require('crypto');
const fs = require('fs');
const { execFileSync } = require('child_process');

const inputs = [
  {
    label: 'F0',
    env: 'F0_APP_PATH',
    gitRefEnv: 'F0_APP_GIT_REF',
    sha: '7b94efd597551c7e6eae7409cc0795b543cdcb3716247732fa9f5096ff98813a',
    mustContain: [],
    mustNotContain: [
      "uid: userUid",
      "uid: currentUser.uid || firebase.auth().currentUser.uid",
      "permissionsRef = permissionsRef.orderByChild('uid').equalTo(authUid)",
    ],
  },
  {
    label: 'F1',
    env: 'F1_APP_PATH',
    // Updated 2026-08-26 (task-monitoreo-sync hotfix): canonicalTaskId() fixes
    // the number/string ID mismatch (loadExcelTasks(): row.id = idx is a
    // number, but selectTask() always receives a string from the
    // decodeURIComponent() onclick) that let allTasks.find() fail silently,
    // leaving currentSelectedTask stale and a previous task's comment "stuck"
    // when switching tasks. saveTaskBtn now refuses to persist an
    // unresolved/mismatched selection instead of falling back to a generic
    // "Tarea <id>" name. reconcileScheduledTaskWithSession() replaces the
    // exact-equality task-name matching duplicated in
    // renderActiveSessionsDashboard() and openMonitoreoDetails() with
    // taskNamesMatch(), so Monitoreo reflects a confirmed Firebase save
    // without waiting for shift close, and resolveTaskDisplayName() resolves
    // legacy "Tarea <id>" names against allTasks everywhere a task name is
    // shown (Monitoreo card/modal, Historial de Turnos, "Ver Todo" modal, PDF
    // export via buildTaskReportSummaryText()), never exposing the raw
    // technical ID to the end user.
    // Previous hash (round 4: fail-safe recovery, fetchOwnActiveSessionTasks()
    // { ok, tasks }, persistTaskIfNotNewerRemote()):
    // 927206908e0cc23ac155331bf6810e5d9d9e980bdf75a863487375970f550a9f
    // Hash before round 4 (round 3: one-time recovery migration, plain .update()):
    // fd0570df9f87901437567aff19dc11bb2e3c77bf897e02eac90b6b4de4d867b8
    // Hash before round 3 (round 2: local-wins tie-break in mergeTaskCaches(),
    // metadata-only syncActiveSessionToFirebase(), confirmed saveExtraTask()):
    // 9bf858fc456630b7437614c7a9f6c422dddc0ca1dcc8cc7ebd6b945f8ef71b5b
    // Hash before round 2 (persistTaskToActiveSession(), selectTask(evt)):
    // 29f9cdb7f0298fbf4e53755dba01231c76de8bfdf94cdb6ab4808c8b21914204
    // Hash before this hotfix (Supervisor comunicados capability):
    // 876049dfce42455256c3eae59f37a5d087fbbab24ca29f1ad09d4eba38a8b683
    sha: '4b008a29bb478fced9059ebb3e3792a79ec4a33722f2fc2e0387d5659f5fac56',
    mustContain: [
      "uid: userUid",
      "uid: currentUser.uid || firebase.auth().currentUser.uid",
      "permissionsRef = permissionsRef.orderByChild('uid').equalTo(authUid)",
    ],
    mustNotContain: [],
  },
];

const output = { mode: 'STATIC_CONTRACT', browserSmoke: 'NOT_TESTED', inputs: {} };

for (const input of inputs) {
  const filePath = process.env[input.env];
  const gitRef = input.gitRefEnv ? process.env[input.gitRefEnv] : null;
  if (!filePath && !gitRef) throw new Error(`${input.env}_OR_${input.gitRefEnv || 'GIT_REF'}_MISSING`);
  const gitExecutable = process.env.GIT_EXECUTABLE || 'git';
  const content = filePath
    ? fs.readFileSync(filePath, 'utf8')
    : execFileSync(gitExecutable, ['show', gitRef], { encoding: 'utf8' });
  const canonicalContent = content.replace(/\r\n/g, '\n');
  const sha = crypto.createHash('sha256').update(canonicalContent, 'utf8').digest('hex');
  const checks = [
    ...input.mustContain.map((needle) => ({ kind: 'contains', passed: content.includes(needle) })),
    ...input.mustNotContain.map((needle) => ({ kind: 'absent', passed: !content.includes(needle) })),
  ];
  output.inputs[input.label] = {
    sha256: sha,
    shaVerified: sha === input.sha,
    checksPassed: checks.every((check) => check.passed),
    checkCount: checks.length,
    source: filePath ? 'FILE' : 'GIT_REF',
  };
}

output.status = Object.values(output.inputs).every((input) => input.shaVerified && input.checksPassed)
  ? 'VERIFIED_EXECUTED'
  : 'FAIL_VERIFIED_EXECUTED';
const reportPath = process.env.FRONTEND_CONTRACT_REPORT || 'frontend-contract-report.json';
fs.writeFileSync(reportPath, `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(output)}\n`);
if (output.status !== 'VERIFIED_EXECUTED') process.exitCode = 1;
