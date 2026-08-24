# QA — Hotfix de persistencia de tareas de Gestores — 2026-08-24

Rama: `feature/task-persistence-hotfix`
Worktree: `.codex-task-persistence-hotfix/`
Base: `origin/main` @ `d2ca77d15f41636848bc3226a9f161829a23f0c7`

Estado de las Rules: **SIN CAMBIOS**. `database.rules.json` no se modificó en este hotfix.
La regla existente de `active_sessions/$session_id` (`auth != null && approved === true &&
(role === 'Admin' || auth.uid === $session_id)`) ya cubre cualquier escritura anidada bajo
`active_sessions/{auth.uid}/tasks/{taskId}`, por lo que no hace falta relajar ni ampliar
`taskProgress` ni ningún otro nodo. `EXPECTED_R1_SHA256` permanece igual.

Entorno de este dispositivo: **sin Java instalado**. El Firebase Realtime Database
Emulator no puede ejecutarse localmente. No se instaló Java ni se modificó el entorno del
dispositivo para evitar esto.

## Clasificación de resultados

- `PASS`: ejecutado localmente y aprobado.
- `FAIL`: ejecutado localmente y fallido.
- `NOT EXECUTED – JAVA UNAVAILABLE`: requiere Firebase Emulator (Java), no disponible en este dispositivo.
- `PENDING CI`: preparado para ejecutarse en GitHub Actions o en otro entorno con Java. El workflow `Phase 1 Compatibility QA` los ejecuta como paso bloqueante (`npm run qa`), sin `continue-on-error`.

## Resumen del cambio

`saveTaskBtn` dejó de simular éxito con `setTimeout` y ahora:

1. Valida (en orden): tarea activa seleccionada (`currentActiveTaskId`), estado seleccionado
   (`.btn-status.active`), observación obligatoria no vacía, `firebase.auth().currentUser`
   presente, y que `currentUser.uid === firebase.auth().currentUser.uid` (la autoridad de
   identidad es siempre `firebase.auth().currentUser.uid`, nunca solo `localStorage`).
   También valida que el `taskId` no contenga caracteres inválidos para una clave de
   Realtime Database (`. # $ [ ] /`).
2. Escribe el respaldo local en `taskStateCache`/`localStorage` de inmediato (para permitir
   reintento visual), pero **no** lo trata como confirmación de persistencia.
3. Llama a la nueva función testeable `persistTaskToActiveSession(uid, taskId, taskData)`,
   que escribe únicamente en `active_sessions/{uid}/tasks/{taskId}` (`.update()`) y devuelve
   la Promise real de Firebase sin atraparla.
4. Solo muestra "Guardado Exitosamente" **después** de que esa Promise resuelva. Si
   rechaza (incluye `permission_denied`), muestra un error visible y nunca el mensaje de
   éxito; el respaldo local se conserva para reintentar.
5. Deshabilita el botón durante la operación y lo restaura siempre en `finally`; una bandera
   `isSavingTask` evita doble clic / escrituras simultáneas.

`syncActiveSessionToFirebase()` se refactorizó para:

- Devolver la Promise real de `database.ref().update(...)` (ya no la atrapa internamente de
  forma que oculte el fallo; el `.catch` de logging es una rama adicional sobre la misma
  Promise, no un reemplazo).
- Escribir cada campo de la sesión y **cada tarea del caché en su propia ruta plana**
  (`active_sessions/{uid}/tasks/{taskId}`) en vez de reemplazar el nodo `tasks` completo con
  un único objeto. Esto elimina la condición de carrera reportada (una sincronización
  periódica con un snapshot desactualizado de `taskStateCache` ya no puede borrar una tarea
  recién guardada por `persistTaskToActiveSession()`).

Recuperación al iniciar (`initApp()`, antes de `loadSchedule()`/`loadExcelTasks()`, solo para
Gestor): `fetchOwnActiveSessionTasks(currentUser.uid)` lee **únicamente**
`active_sessions/{auth.uid}/tasks` (nunca la sesión de otro usuario) y `mergeTaskCaches()`
combina ese resultado con el caché local usando `updatedAt` (gana el más reciente) antes de
que se renderice el árbol de tareas por primera vez.

`selectTask` ya no depende de `window.event`: recibe `evt` explícitamente desde el
`onclick="selectTask(decodeURIComponent('...'), event)"` en el árbol de tareas.

El cierre de turno (`handleEndShift()` / `persistShiftClosureCore()`) **no se modificó**:
sigue incluyendo `tasks: taskStateCache` en el `shiftReportObject` y sigue usando el mismo
`update()` atómico multi-ruta (`shift_reports/{id}`, `active_sessions/{uid}: null`,
`login_logs/{id}/logoutTime`) para cerrar la sesión activa.

No se tocó el flujo XLSX de carga de tareas, ni `taskCatalog`/`taskAssignments`/`taskProgress`.

## Validaciones locales ejecutadas (sin Java)

| # | Validación | Comando | Resultado |
|---|---|---|---|
| L1 | Sintaxis de `app.js` | `node --check app.js` | `PASS` |
| L2 | `database.rules.json` es JSON válido (sin cambios) | `node -e "JSON.parse(require('fs').readFileSync('database.rules.json','utf8'))"` | `PASS` |
| L3 | Sintaxis de los scripts de QA modificados (`qa_matrix.js`, `frontend_security_smoke.js`, `verify_frontend_contract.js`) | `node --check <archivo>` | `PASS` |
| L4 | `git diff --check` (sin errores de espacios en blanco) | `git diff --check --cached` | `PASS` |
| L5 | Suite estática `frontend_security_smoke.js` (incluye los 10 casos nuevos de persistencia de tareas, además de los checks existentes de XSS, roles, cierre de turno atómico y comunicados) | `cd .github/qa-infra && npm run check` | `PASS` (15/15 checks, incluye `migration_rehearsal.test.js`) |
| L6 | Contrato estático F0/F1 de `app.js` (hash pinneado) | `cd .github/qa-infra && F0_APP_GIT_REF="<PRODUCT_BASE_SHA>:app.js" F1_APP_PATH="../../app.js" node verify_frontend_contract.js` | `PASS` (`VERIFIED_EXECUTED`) |
| L7 | Revisión manual de que ningún caso de seguridad/QA existente fue eliminado o debilitado | `git diff` revisado: solo se agregó código y casos nuevos; los casos y aserciones existentes (XSS, roles, cierre de turno, comunicados, matriz R0/R1) permanecen intactos | `PASS` |

## Casos obligatorios — Frontend (`frontend_security_smoke.js`)

| # | Caso | Función de test | Resultado |
|---|---|---|---|
| F1 | Guardar sin tarea activa es rechazado | `testSaveTaskRejectsWithoutActiveTask` | `PASS` |
| F2 | Guardar sin estado es rechazado | `testSaveTaskRejectsWithoutStatus` | `PASS` |
| F3 | Guardar sin observación es rechazado | `testSaveTaskRejectsWithoutObservation` | `PASS` |
| F4 | El éxito no se muestra antes de resolver la Promise de Firebase | `testSaveTaskDoesNotShowSuccessBeforeFirebaseResolves` | `PASS` |
| F5 | Una escritura exitosa actualiza Firebase, caché local y UI | `testSaveTaskSuccessUpdatesFirebaseCacheAndUI` | `PASS` |
| F6 | `permission_denied` muestra error y nunca éxito; conserva el respaldo local | `testSaveTaskPermissionDeniedShowsErrorNotSuccess` | `PASS` |
| F7 | Un error de red deja el botón reutilizable y el reintento sí escribe en Firebase | `testSaveTaskNetworkErrorAllowsRetry` | `PASS` |
| F8 | El progreso remoto se restaura al recargar (lee solo la sesión propia, combina por `updatedAt`, se conecta antes del primer render) | `testFetchOwnActiveSessionTasksReadsOnlyOwnPath`, `testMergeTaskCachesConflictResolution`, `testRemoteTaskProgressRestoredOnReloadWiring` | `PASS` |
| F9 | `selectTask` no depende de `window.event` (ni en el código fuente ni en ejecución con un `evt` explícito) | `testSelectTaskDoesNotDependOnWindowEvent` | `PASS` |
| F10 | El cierre de turno sigue incluyendo `tasks` en `shift_reports` | `testShiftCloseStillIncludesTasksInReport` (además de `testAtomicShiftClosure`, sin cambios) | `PASS` |

## Casos obligatorios — Rules/Emulator (`qa_matrix.js`)

`database.rules.json` no cambió, así que estos casos son escrituras anidadas bajo la misma
subruta `active_sessions/$session_id` ya cubierta por la matriz F0/F1 × R0/R1 existente.
Se agregan como specs nuevos dentro de `buildSpecs()`, ejecutados en las cuatro
combinaciones de matriz igual que el resto de la suite.

| # | Caso | ID en `qa_matrix.js` | Clasificación |
|---|---|---|---|
| R1 | Gestor puede escribir una tarea en su propia `active_sessions/{uid}/tasks/{taskId}` | `gestor_own_active_session_task_write` (`MUST_ALLOW`, R0 y R1) | `PENDING CI` |
| R2 | Gestor no puede escribir una tarea en la sesión de otro Gestor | `gestor_other_active_session_task_write_denied` (permitido en R0 legado, denegado en R1 vigente) | `PENDING CI` |
| R3 | Usuario no aprobado (`QA_PENDING`) no puede escribir una tarea, ni en su propia sesión | `pending_active_session_task_write_denied` (permitido en R0 legado — sin gate de `approved` —, denegado en R1 vigente) | `PENDING CI` |
| R4 | Admin conserva la capacidad de escribir tareas en la sesión de cualquier Gestor | `admin_active_session_task_write` (`MUST_ALLOW`, R0 y R1) | `PENDING CI` |
| R5 | Gestor puede leer sus propias tareas en `active_sessions/{uid}/tasks` (necesario para la recuperación al recargar) | `gestor_own_active_session_task_read` (`MUST_ALLOW`, R0 y R1) | `PENDING CI` |
| R6 | El cierre atómico de turno sigue pasando (sin cambios) | `atomic_shift_close`, `atomic_shift_close_other_denied` (ya existentes, no modificados) | `PENDING CI` |

Nota sobre R2/R3: como `database.rules.json` no se tocó, el comportamiento R0 (línea base
permisiva, `active_sessions.write: "auth != null"`, sin gate de `approved`) se mantiene tal
cual estaba documentado para el resto del nodo `active_sessions`; lo relevante para este
hotfix es que bajo **R1 (las Rules actualmente desplegadas)** ambos casos quedan denegados,
que es el comportamiento vigente en producción.

## Comando exacto para ejecutar la suite completa cuando haya Java disponible

```bash
cd .github/qa-infra
npm ci --ignore-scripts
npx firebase setup:emulators:database

# Suite de compatibilidad Fase 1 (pinneada por SHA256 de Rules/app.js) — incluye los
# nuevos casos de persistencia de tareas dentro de la matriz F0/F1 x R0/R1:
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9199 FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9100 \
  R0_PATH=/ruta/a/r0.json R1_PATH=/ruta/a/r1.json \
  npm run qa
```

`npm run qa` ya estaba marcado como bloqueante (sin `continue-on-error`) en
`.github/workflows/phase1-compatibility-qa.yml`; no se modificó el workflow para este hotfix.

## SHA256 (app.js) — regenerado

Calculado con `crypto.createHash('sha256').update(content.replace(/\r\n/g,'\n'),'utf8')`, la
misma normalización que usan `qa_matrix.js` y `verify_frontend_contract.js`:

- Hash canónico **antes** del hotfix (`F1` previo, confirmado por el co-lead):
  `876049dfce42455256c3eae59f37a5d087fbbab24ca29f1ad09d4eba38a8b683`
- Hash canónico **después** del hotfix (`F1` nuevo, actualizado en
  `.github/qa-infra/verify_frontend_contract.js`):
  `29f9cdb7f0298fbf4e53755dba01231c76de8bfdf94cdb6ab4808c8b21914204`
- `EXPECTED_R1_SHA256` (`database.rules.json`): **sin cambios** — `database.rules.json` no
  se modificó en este hotfix.

Verificado localmente con `verify_frontend_contract.js` comparando `app.js` en este worktree
contra `app.js` en `PRODUCT_BASE_SHA` (F0): `VERIFIED_EXECUTED` (ver L6 arriba).

## Validación funcional pendiente (requiere navegador real o staging)

No se pudo ejecutar contra un proyecto Firebase real ni en un navegador (sin Java, sin
credenciales de staging en este dispositivo). Queda **PENDING CI / manual**:

- [ ] Login como Gestor: seleccionar una tarea, guardar sin observación → debe rechazar sin
      mostrar éxito. Completar observación y guardar → el botón debe mostrar "Guardando...",
      luego "Guardado Exitosamente" solo tras confirmación real; verificar en la consola de
      Firebase que `active_sessions/{uid}/tasks/{taskId}` contiene `name`, `status`,
      `observation`, `updatedAt`.
- [ ] Recargar la página durante el mismo turno: la tarea guardada debe aparecer marcada en
      el árbol y su observación/estado deben restaurarse al seleccionarla de nuevo.
- [ ] Simular `permission_denied` (por ejemplo, forzando un UID no coincidente) → debe
      mostrarse un error visible y el botón nunca debe decir "Guardado Exitosamente".
- [ ] Finalizar turno: `shift_reports` debe seguir incluyendo las tareas marcadas y
      `active_sessions/{uid}` debe eliminarse atómicamente, igual que antes del hotfix.
