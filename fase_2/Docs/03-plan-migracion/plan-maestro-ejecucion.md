# Plan Maestro de Ejecución — Fase 2 (Refactorización de Risk Manager)

**Fecha:** 2026-10-03
**Propósito:** consolidar en un solo documento todo lo necesario para ejecutar el resto de la Fase 1 y la Fase 2 de `hoja-de-ruta.md` de una sola pasada, sin sesgos y con impacto bajo en producción, cerrando los vacíos detectados en `04-diagnostico-continuacion/diagnostico-integracion-y-evaluacion-plan.md` (2026-09-22) y en la revisión de hoy. Este documento no reemplaza a `hoja-de-ruta.md`, `propuesta-modular.md` ni `inventario-funciones.md` — los cita y los cruza contra el estado real del código.

---

## 0. Cómo usar este documento

Antes de ejecutar cualquier paso de este plan en una sola sesión continua, hay que resolver, en este orden, las secciones 1 a 4. Son prerrequisitos, no parte del trabajo de refactorización en sí — ejecutar la Fase 2 sin resolverlos primero es exactamente lo que causó el incidente del 2026-09-22 documentado en `04-diagnostico-continuacion/`.

---

## 1. Estado de respaldo en git (bloqueante, resolver primero)

Revisado hoy leyendo directamente `.git/HEAD`, `.git/logs/HEAD`, `.git/refs/*` y `.git/config` del equipo del usuario (no se pudo ejecutar `git` directamente — este equipo no tiene `device_bash`; se leyeron como archivos).

- La rama local actualmente abierta, `feature/Fase_2`, está parada en el commit `d5830b2` (2026-09-29, "fix(tasks): evitar tareas fantasma que bloquean el cierre de turno") — **por detrás** de `origin/feature/Fase_2` (`caa64da`) y de `origin/main` (más reciente, actualizado el 2026-10-02).
- Los dos hotfixes de producción de identidad de tareas (documentados en la sección 6 de `diagnostico-integracion-y-evaluacion-plan.md`) **sí se commitearon y subieron a GitHub**, pero desde ramas temporales (`push-task-fix`, `update-contract-hash`, etc. — patrón ya usado en este proyecto para evitar el problema del carácter `&` en la ruta de Windows) que nunca se fusionaron de vuelta a la rama local `feature/Fase_2`.
- **Ningún commit, en todo el historial de `.git/logs/HEAD`, menciona `fase_2/`, `Docs/`, `src/`, `utils` o pruebas.** `fase_2/` no está en `.gitignore`. Con la evidencia disponible, los 11 días de trabajo de esta fase (diagnóstico, arquitectura, ~26 archivos de `src/` con código real, el prototipo del bundle en `build/`, las pruebas de `utils/`) existen **solo como archivos locales sin commitear**, en un único equipo.

**Acción pendiente, a confirmar por el usuario con `git status` y `git log --oneline -5` antes de continuar:** si se confirma lo anterior, el primer paso de ejecución real — antes de tocar una sola función más — es commitear todo `fase_2/` en una rama propia (no en `feature/Fase_2` directamente, para no mezclarlo con los hotfixes ya fusionados en remoto) y empujarla a GitHub como respaldo. Sin esto, cualquier ejecución posterior corre sobre una base sin red de seguridad real.


## 2. Resumen ejecutivo del estado real del código

`inventario-funciones.md` cataloga **164 funciones de `app.js`** (el documento dice "~161"; el recuento exacto por marcador da 164 — diferencia menor, no material). Cruzando ese inventario contra el contenido real de `fase_2/src/` hoy:

| Estado | Cantidad | Qué significa |
|---|---|---|
| Hecha + probada | 13 | Extraída a `utils/`, con prueba unitaria real, verificada hoy (74/74). |
| Migrada, sin prueba | 35 | El archivo destino ya tiene la función con el mismo nombre y (a simple vista) la misma firma, pero no tiene ningún test — incluye `saveBreakState()` y `loadBreakState()`, el área del hallazgo más peligroso del diagnóstico de 2026-09-22. |
| Posible lógica equivalente, verificar 1:1 | 8 | Existe código en el destino que *parece* cubrir la función original, pero con otro nombre o descompuesto en varias piezas — no se puede dar por migrada sin comparar manualmente contra el original. Incluye `updateActivity()`, la función que el diagnóstico de 2026-09-22 marcó con una declaración duplicada e inerte en `app.js`. |
| No iniciada | 108 | Sigue solo en `app.js`, sin ningún código correspondiente en `src/`. |

**Nota de alcance:** este inventario de 164 funciones cubre únicamente `app.js`. `diagnostico-monolito.md` también señala una función crítica en `login.js` (`checkShiftExpirationOnLogin()`) y una en `motor_operativo.py` (`MicroStrategyConnector.fetch_retiros_data()`), pero ninguna de las dos tiene un inventario función-por-función como el de `app.js` — es un vacío menor, no bloqueante para continuar con `app.js`, pero debe completarse antes de dar por cerrada la Fase 1 en esos dos archivos.


## 3. Las 6 recomendaciones del diagnóstico de 2026-09-22 — estado hoy

`04-diagnostico-continuacion/diagnostico-integracion-y-evaluacion-plan.md` dejó 6 recomendaciones explícitas tras el incidente de integración rota de `app.js`. Estado real, verificado hoy contra el código y los documentos:

| # | Recomendación | Estado |
|---|---|---|
| 1 | Decidir la estrategia de carga de módulos antes de escribir más código en `src/` | **Resuelta.** `propuesta-modular.md` §4.1: bundle con esbuild, decidido el 2026-09-23, con prototipo verificado (53 puntos, `build/verify-bundle.mjs`). |
| 2 | Definir el punto de corte para mover `src/` a la raíz y actualizar `deploy-pages.yml` | **Sin aplicar.** `propuesta-modular.md` §4.2 ya dice qué hacer, pero no está como paso explícito en la Fase 3 de `hoja-de-ruta.md` (ver sección 6 de este documento). |
| 3 | Resolver el hueco de taxonomía para APIs de navegador (idle/presencia) | **Resuelta.** `services/browser/idle-detector-adapter.js` ya existe con código real. |
| 4 | Prueba de regresión específica para la divergencia `riskOps_timeline` / `riskOps_breakState` | **Sin aplicar.** Ni `inactivity_timeline.test.js` ni `end_shift_smoke.js` cubren hoy esa coherencia — y es más urgente que el 2026-09-22, porque `saveBreakState()`/`loadBreakState()` ya están migradas (sin prueba) a `local-session-storage.js`. |
| 5 | Referenciar `PROMPT_CONTINUACION_FASE2.md` desde `Docs/` | **Sin aplicar.** Sigue fuera del repositorio, sin ningún enlace desde `Docs/`. |
| 6 | Actualizar la tabla de estado de `README.md` | **Sin aplicar.** El README sigue diciendo que la Fase 2 está "Sin iniciar". |


## 4. Riesgos a resolver antes de continuar extrayendo código

En orden de urgencia:

1. **Respaldo en git** (sección 1). Bloqueante para todo lo demás — no tiene sentido seguir produciendo código que puede perderse.
2. **Prueba de regresión `riskOps_timeline` / `riskOps_breakState`** (recomendación 4, sección 3). Debe escribirse — y pasar — antes de que `breakState.js`/`local-session-storage.js` se conecte alguna vez a `app.js`, porque hoy ya existe código real para `saveBreakState()`/`loadBreakState()` sin ninguna prueba que detecte la divergencia silenciosa que causó el incidente de 2026-09-22. Destino natural: extender `inactivity_timeline.test.js` o crear un caso dedicado en `fase_2/src/tests/`.
3. **Verificar una por una las 8 funciones marcadas "posible lógica equivalente, verificar 1:1"** (tabla de la sección 5) antes de asumir que están migradas y antes de tocar sus originales en `app.js`. La más sensible es `updateActivity()`: el diagnóstico de 2026-09-22 ya encontró una segunda declaración de esta función, inerte, en un intento previo de integración — cualquier ambigüedad aquí es exactamente el patrón que ya causó un incidente.
4. **Hueco de taxonomía — "incidencias" no tiene carpeta propia** en `propuesta-modular.md` (ver tabla de la sección 5, grupo "Comunicados, configuración e incidencias"). `handleNewIncidentSubmit()`, `startIncidentsRealtimeListener()` y `renderIncidentsTable()` no encajan limpiamente en `domain/announcements/`. Antes de migrarlas hay que decidir si viven en una carpeta `domain/incidents/` nueva o en otro lugar — no son comunicados ni tareas ni turnos.
5. **Scope incompleto en `login.js` y `motor_operativo.py`** (nota de alcance, sección 2). Menor, pero debe cerrarse antes de declarar la Fase 1 completa en esos dos archivos.


## 5. Tabla maestra de las 164 funciones de `app.js`

Agrupada por las mismas 9 secciones de `inventario-funciones.md`, para poder cruzarla línea por línea con ese documento.

#### Seguridad, sanitización y capacidades

| Función | Relevancia | Estado | Destino actual / propuesto |
|---|---|---|---|
| `appendFormSubmitCc()` | Secundaria | Migrada, sin prueba | fase_2/src/services/external/formsubmit-notification-adapter.js |
| `escapeHTML()` | Crítica | Hecha + probada (74/74, 2026-10-03) | fase_2/src/utils/{sanitization,normalize,excel}.js |
| `encodeInlineHandlerArg()` | Secundaria | Hecha + probada (74/74, 2026-10-03) | fase_2/src/utils/{sanitization,normalize,excel}.js |
| `sanitizeAnnouncementHref()` | Crítica | Hecha + probada (74/74, 2026-10-03) | fase_2/src/utils/{sanitization,normalize,excel}.js |
| `sanitizeAnnouncementHTML()` | Crítica | Hecha + probada (74/74, 2026-10-03) | fase_2/src/utils/{sanitization,normalize,excel}.js |
| `appendSanitizedNode()` | Crítica | Hecha + probada (74/74, 2026-10-03) | fase_2/src/utils/{sanitization,normalize,excel}.js |
| `canPublishComunicados()` | Crítica | Migrada, sin prueba | fase_2/src/domain/announcements/announcement-capabilities.js |
| `canViewComunicadoLecturas()` | Secundaria | Migrada, sin prueba | fase_2/src/domain/announcements/announcement-capabilities.js |
| `canDeleteComunicados()` | Crítica | Migrada, sin prueba | fase_2/src/domain/announcements/announcement-capabilities.js |
| `canManageComunicados()` | Secundaria | Migrada, sin prueba | fase_2/src/domain/announcements/announcement-capabilities.js |

#### Multi-select, sesión local y presencia

| Función | Relevancia | Estado | Destino actual / propuesto |
|---|---|---|---|
| `setupCustomMultiSelect()` | Secundaria | Migrada, sin prueba | fase_2/src/ui/components/multi-select.js |
| `updateLabel()` | Secundaria | Migrada, sin prueba | fase_2/src/ui/components/multi-select.js |
| `renderOptions()` | Secundaria | Migrada, sin prueba | fase_2/src/ui/components/multi-select.js |
| `getSelectedMultiSelectValues()` | Secundaria | Migrada, sin prueba | fase_2/src/ui/components/multi-select.js |
| `resetCustomMultiSelect()` | Secundaria | Migrada, sin prueba | fase_2/src/ui/components/multi-select.js |
| `setCustomMultiSelectValues()` | Secundaria | Migrada, sin prueba | fase_2/src/ui/components/multi-select.js |
| `saveBreakState()` | Crítica | Migrada, sin prueba | fase_2/src/services/storage/local-session-storage.js |
| `loadBreakState()` | Crítica | Migrada, sin prueba | fase_2/src/services/storage/local-session-storage.js |
| `pushTimelineEvent()` | Crítica | Migrada, sin prueba | fase_2/src/domain/shifts/timeline-service.js |
| `setIdleDetectorWarning()` | Secundaria | Posible lógica equivalente ya escrita, con otro nombre — verificar 1:1 | fase_2/src/services/browser/idle-detector-adapter.js (showWarning() interno parece cubrir esto; verificar) |
| `checkAndStartIdleDetector()` | Crítica | Posible lógica equivalente ya escrita, con otro nombre — verificar 1:1 | fase_2/src/services/browser/idle-detector-adapter.js (initIdleDetector() parece ser la versión renombrada; verificar equivalencia 1:1 antes de retirar la original) |
| `requestIdlePermission()` | Secundaria | Posible lógica equivalente ya escrita, con otro nombre — verificar 1:1 | fase_2/src/services/browser/idle-detector-adapter.js (distinta de requestIdlePermissionManual(), que sí está hecha; verificar si esta variante también se cubrió) |
| `startIdleDetectorLogic()` | Crítica | Posible lógica equivalente ya escrita, con otro nombre — verificar 1:1 | fase_2/src/services/browser/idle-detector-adapter.js (ver initIdleDetector(); verificar) |
| `applyIdleStateChange()` | Crítica | Posible lógica equivalente ya escrita, con otro nombre — verificar 1:1 | fase_2/src/services/browser/idle-detector-adapter.js (handleDetectorChange() interno parece cubrir esto; verificar) |
| `requestIdlePermissionManual()` | Secundaria | Migrada, sin prueba | fase_2/src/services/browser/idle-detector-adapter.js |
| `shouldApplyDomIdleFallback()` | Crítica | Migrada, sin prueba | fase_2/src/services/browser/idle-detector-adapter.js |
| `updateActivity()` | Crítica | Posible lógica equivalente ya escrita, con otro nombre — verificar 1:1 | fase_2/src/services/browser/idle-detector-adapter.js (hay helpers internos nuevos — handleDetectorChange, setDetectorStatus — que podrían cubrir parte de esto; NO hay función exportada con este nombre: verificar con cuidado, es la función que el diagnóstico de 2026-09-22 marcó con una declaración duplicada inerte en app.js) |

#### Normalización, calendarios y cronogramas

| Función | Relevancia | Estado | Destino actual / propuesto |
|---|---|---|---|
| `normalizeName()` | Crítica | Hecha + probada (74/74, 2026-10-03) | fase_2/src/utils/{sanitization,normalize,excel}.js |
| `namesMatch()` | Crítica | Hecha + probada (74/74, 2026-10-03) | fase_2/src/utils/{sanitization,normalize,excel}.js |
| `excelToJSDate()` | Crítica | Hecha + probada (74/74, 2026-10-03) | fase_2/src/utils/{sanitization,normalize,excel}.js |
| `isSameDate()` | Crítica | Hecha + probada (74/74, 2026-10-03) | fase_2/src/utils/{sanitization,normalize,excel}.js |
| `getShiftCategory()` | Secundaria | No iniciada | fase_2/src/domain/schedules/{schedule-parser.js,name-matcher.js} o services/files/xlsx-schedule-adapter.js (propuesto, no existe aún) |
| `cleanText()` | Secundaria | Hecha + probada (74/74, 2026-10-03) | fase_2/src/utils/{sanitization,normalize,excel}.js |
| `normalizeTaskName()` | Crítica | Hecha + probada (74/74, 2026-10-03) | fase_2/src/utils/{sanitization,normalize,excel}.js |
| `taskNamesMatch()` | Crítica | Hecha + probada (74/74, 2026-10-03) | fase_2/src/utils/{sanitization,normalize,excel}.js |
| `setNamesMatch()` | Secundaria | Hecha + probada (74/74, 2026-10-03) | fase_2/src/utils/{sanitization,normalize,excel}.js |
| `parseSheetRange()` | Crítica | Migrada, sin prueba | fase_2/src/domain/schedules/cronogram-parser.js |
| `getWeekSheet()` | Crítica | Migrada, sin prueba | fase_2/src/domain/schedules/cronogram-parser.js |
| `fetchCronogramaRowsForDate()` | Crítica | Migrada, sin prueba | fase_2/src/domain/schedules/cronogram-parser.js |
| `getCronogramaColumnsForToday()` | Crítica | Migrada, sin prueba | fase_2/src/domain/schedules/cronogram-parser.js |
| `preloadCronograma()` | Secundaria | Migrada, sin prueba | fase_2/src/domain/schedules/cronogram-parser.js |
| `getAssignedTasksForGestor()` | Crítica | Migrada, sin prueba | fase_2/src/domain/schedules/cronogram-parser.js |
| `loadCronogramaAssignments()` | Crítica | Migrada, sin prueba | fase_2/src/domain/schedules/cronogram-parser.js |
| `getScheduledGestoresCountForShift()` | Secundaria | Migrada, sin prueba | fase_2/src/domain/schedules/schedule-service.js |
| `getShiftForDate()` | Crítica | Migrada, sin prueba | fase_2/src/domain/schedules/schedule-service.js |
| `getDocUrl()` | Secundaria | Migrada, sin prueba | fase_2/src/config/doc-links.js |
| `getManualUrl()` | Secundaria | Migrada, sin prueba | fase_2/src/config/doc-links.js |

#### Tareas, persistencia y ciclo de aplicación

| Función | Relevancia | Estado | Destino actual / propuesto |
|---|---|---|---|
| `updateClock()` | Secundaria | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `loadExcelTasks()` | Crítica | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `formatExcelDate()` | Secundaria | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `loadSchedule()` | Crítica | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `renderScheduleBlock()` | Crítica | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `loadTeletrabajo()` | Secundaria | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `renderTeletrabajoBlock()` | Secundaria | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `loadPermisos()` | Crítica | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `openPermisoDetailModal()` | Secundaria | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `renderTree()` | Crítica | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `canonicalTaskId()` | Crítica | Migrada, sin prueba | fase_2/src/domain/tasks/task-report.js |
| `isLegacyGenericTaskName()` | Secundaria | Migrada, sin prueba | fase_2/src/domain/tasks/task-report.js |
| `resolveTaskDisplayName()` | Crítica | Migrada, sin prueba | fase_2/src/domain/tasks/task-report.js |
| `reconcileScheduledTaskWithSession()` | Crítica | Migrada, sin prueba | fase_2/src/domain/tasks/task-reconciler.js |
| `buildTaskReportSummaryText()` | Crítica | Migrada, sin prueba | fase_2/src/domain/tasks/task-report.js |
| `persistTaskToActiveSession()` | Crítica | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `fetchOwnActiveSessionTasks()` | Crítica | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `mergeTaskCaches()` | Crítica | Migrada, sin prueba | fase_2/src/domain/tasks/task-reconciler.js |
| `computeLocalTaskMigrations()` | Crítica | Migrada, sin prueba | fase_2/src/domain/tasks/task-reconciler.js |
| `persistTaskIfNotNewerRemote()` | Crítica | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `migrateLocalTasksToActiveSession()` | Crítica | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `syncActiveSessionToFirebase()` | Crítica | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `updateKPI()` | Crítica | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `toggleTree()` | Secundaria | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `renderQuickDocs()` | Secundaria | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `selectTask()` | Crítica | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `recoverGestorTaskProgress()` | Crítica | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |
| `initApp()` | Crítica | No iniciada | fase_2/src/domain/tasks/task-service.js o services/firebase/firebase-shift-repository.js (propuesto, no existe aún) o app/bootstrap.js |

#### Pausas y cierre de turno

| Función | Relevancia | Estado | Destino actual / propuesto |
|---|---|---|---|
| `toggleBreakfastBreak()` | Crítica | No iniciada | fase_2/src/domain/shifts/{shift-service.js,shift-report-builder.js} o controllers/shift-controller.js (propuesto, no existe aún) |
| `toggleLunchBreak()` | Crítica | No iniciada | fase_2/src/domain/shifts/{shift-service.js,shift-report-builder.js} o controllers/shift-controller.js (propuesto, no existe aún) |
| `persistShiftClosureCore()` | Crítica | No iniciada | fase_2/src/domain/shifts/{shift-service.js,shift-report-builder.js} o controllers/shift-controller.js (propuesto, no existe aún) |
| `hasRealSetOptions()` | Secundaria | No iniciada | fase_2/src/domain/shifts/{shift-service.js,shift-report-builder.js} o controllers/shift-controller.js (propuesto, no existe aún) |
| `requiresSpecificSetSelection()` | Crítica | No iniciada | fase_2/src/domain/shifts/{shift-service.js,shift-report-builder.js} o controllers/shift-controller.js (propuesto, no existe aún) |
| `restoreEndShiftButton()` | Secundaria | No iniciada | fase_2/src/domain/shifts/{shift-service.js,shift-report-builder.js} o controllers/shift-controller.js (propuesto, no existe aún) |
| `toggleSplitShiftBreak()` | Crítica | No iniciada | fase_2/src/domain/shifts/{shift-service.js,shift-report-builder.js} o controllers/shift-controller.js (propuesto, no existe aún) |
| `handleEndShift()` | Crítica | No iniciada | fase_2/src/domain/shifts/{shift-service.js,shift-report-builder.js} o controllers/shift-controller.js (propuesto, no existe aún) |

#### Modales, tareas extra, usuarios y permisos

| Función | Relevancia | Estado | Destino actual / propuesto |
|---|---|---|---|
| `openExceptionModal()` | Secundaria | No iniciada | fase_2/src/domain/{permissions/permission-service.js,auth/approval-policy.js} o ui/components/modal.js (propuesto, no existe aún) |
| `closeModal()` | Secundaria | No iniciada | fase_2/src/domain/{permissions/permission-service.js,auth/approval-policy.js} o ui/components/modal.js (propuesto, no existe aún) |
| `confirmException()` | Secundaria | No iniciada | fase_2/src/domain/{permissions/permission-service.js,auth/approval-policy.js} o ui/components/modal.js (propuesto, no existe aún) |
| `openExtraTaskModal()` | Secundaria | No iniciada | fase_2/src/domain/{permissions/permission-service.js,auth/approval-policy.js} o ui/components/modal.js (propuesto, no existe aún) |
| `saveExtraTask()` | Crítica | No iniciada | fase_2/src/domain/{permissions/permission-service.js,auth/approval-policy.js} o ui/components/modal.js (propuesto, no existe aún) |
| `renderPendingUsers()` | Crítica | No iniciada | fase_2/src/domain/{permissions/permission-service.js,auth/approval-policy.js} o ui/components/modal.js (propuesto, no existe aún) |
| `approveUser()` | Crítica | No iniciada | fase_2/src/domain/{permissions/permission-service.js,auth/approval-policy.js} o ui/components/modal.js (propuesto, no existe aún) |
| `showUserRejectBox()` | Secundaria | No iniciada | fase_2/src/domain/{permissions/permission-service.js,auth/approval-policy.js} o ui/components/modal.js (propuesto, no existe aún) |
| `cancelRejectUser()` | Redundante | No iniciada | fase_2/src/domain/{permissions/permission-service.js,auth/approval-policy.js} o ui/components/modal.js (propuesto, no existe aún) |
| `confirmRejectUser()` | Crítica | No iniciada | fase_2/src/domain/{permissions/permission-service.js,auth/approval-policy.js} o ui/components/modal.js (propuesto, no existe aún) |
| `renderPendingPermissions()` | Crítica | No iniciada | fase_2/src/domain/{permissions/permission-service.js,auth/approval-policy.js} o ui/components/modal.js (propuesto, no existe aún) |
| `showPermRejectBox()` | Secundaria | No iniciada | fase_2/src/domain/{permissions/permission-service.js,auth/approval-policy.js} o ui/components/modal.js (propuesto, no existe aún) |
| `cancelRejectPerm()` | Redundante | No iniciada | fase_2/src/domain/{permissions/permission-service.js,auth/approval-policy.js} o ui/components/modal.js (propuesto, no existe aún) |
| `cancelApprovePerm()` | Redundante | No iniciada | fase_2/src/domain/{permissions/permission-service.js,auth/approval-policy.js} o ui/components/modal.js (propuesto, no existe aún) |
| `showPermApproveBox()` | Secundaria | No iniciada | fase_2/src/domain/{permissions/permission-service.js,auth/approval-policy.js} o ui/components/modal.js (propuesto, no existe aún) |
| `confirmApprovePerm()` | Crítica | No iniciada | fase_2/src/domain/{permissions/permission-service.js,auth/approval-policy.js} o ui/components/modal.js (propuesto, no existe aún) |
| `updatePermissionStatus()` | Crítica | No iniciada | fase_2/src/domain/{permissions/permission-service.js,auth/approval-policy.js} o ui/components/modal.js (propuesto, no existe aún) |

#### Historial, perfil, navegación y monitoreo

| Función | Relevancia | Estado | Destino actual / propuesto |
|---|---|---|---|
| `exportShiftReport()` | Crítica | No iniciada | fase_2/src/domain/auth/auth-service.js o app/app-router.js o controllers/monitoring-controller.js (propuestos, no existen aún) |
| `renderShiftReports()` | Crítica | No iniciada | fase_2/src/domain/auth/auth-service.js o app/app-router.js o controllers/monitoring-controller.js (propuestos, no existen aún) |
| `applyShiftReportsFilters()` | Secundaria | No iniciada | fase_2/src/domain/auth/auth-service.js o app/app-router.js o controllers/monitoring-controller.js (propuestos, no existen aún) |
| `openShiftDetailModal()` | Secundaria | No iniciada | fase_2/src/domain/auth/auth-service.js o app/app-router.js o controllers/monitoring-controller.js (propuestos, no existen aún) |
| `toggleNotifications()` | Secundaria | No iniciada | fase_2/src/domain/auth/auth-service.js o app/app-router.js o controllers/monitoring-controller.js (propuestos, no existen aún) |
| `markAllAsRead()` | Secundaria | No iniciada | fase_2/src/domain/auth/auth-service.js o app/app-router.js o controllers/monitoring-controller.js (propuestos, no existen aún) |
| `openProfileModal()` | Secundaria | No iniciada | fase_2/src/domain/auth/auth-service.js o app/app-router.js o controllers/monitoring-controller.js (propuestos, no existen aún) |
| `toggleProfilePassword()` | Secundaria | No iniciada | fase_2/src/domain/auth/auth-service.js o app/app-router.js o controllers/monitoring-controller.js (propuestos, no existen aún) |
| `changePassword()` | Crítica | No iniciada | fase_2/src/domain/auth/auth-service.js o app/app-router.js o controllers/monitoring-controller.js (propuestos, no existen aún) |
| `alignAdministrativeControlsByRole()` | Crítica | No iniciada | fase_2/src/domain/auth/auth-service.js o app/app-router.js o controllers/monitoring-controller.js (propuestos, no existen aún) |
| `setupSidebar()` | Crítica | No iniciada | fase_2/src/domain/auth/auth-service.js o app/app-router.js o controllers/monitoring-controller.js (propuestos, no existen aún) |
| `updateNavigation()` | Crítica | No iniciada | fase_2/src/domain/auth/auth-service.js o app/app-router.js o controllers/monitoring-controller.js (propuestos, no existen aún) |
| `startActiveSessionsListener()` | Crítica | No iniciada | fase_2/src/domain/auth/auth-service.js o app/app-router.js o controllers/monitoring-controller.js (propuestos, no existen aún) |
| `calculateShiftDelay()` | Secundaria | Posible lógica equivalente ya escrita, con otro nombre — verificar 1:1 | fase_2/src/domain/analytics/time-metrics.js (posible solape con evaluateReportLateness/getTardiness — verificar antes de retirar la original) |
| `renderActiveSessionsDashboard()` | Crítica | No iniciada | fase_2/src/domain/auth/auth-service.js o app/app-router.js o controllers/monitoring-controller.js (propuestos, no existen aún) |
| `viewTimelineInMonitoreo()` | Secundaria | No iniciada | fase_2/src/domain/auth/auth-service.js o app/app-router.js o controllers/monitoring-controller.js (propuestos, no existen aún) |
| `openMonitoreoDetails()` | Crítica | No iniciada | fase_2/src/domain/auth/auth-service.js o app/app-router.js o controllers/monitoring-controller.js (propuestos, no existen aún) |
| `populateGestoresDropdown()` | Secundaria | No iniciada | fase_2/src/domain/auth/auth-service.js o app/app-router.js o controllers/monitoring-controller.js (propuestos, no existen aún) |

#### KPIs, analítica y gráficas

| Función | Relevancia | Estado | Destino actual / propuesto |
|---|---|---|---|
| `fetchKpiOperativosData()` | Crítica | No iniciada | fase_2/src/domain/analytics/{kpi-service.js,metrics-calculator.js} o ui/charts/ (propuestos, no existen aún) |
| `loadRetirosData()` | Crítica | No iniciada | fase_2/src/domain/analytics/{kpi-service.js,metrics-calculator.js} o ui/charts/ (propuestos, no existen aún) |
| `loadGestoresForKPIs()` | Secundaria | No iniciada | fase_2/src/domain/analytics/{kpi-service.js,metrics-calculator.js} o ui/charts/ (propuestos, no existen aún) |
| `calcularIndicadores()` | Crítica | Posible lógica equivalente ya escrita, con otro nombre — verificar 1:1 | fase_2/src/domain/analytics/time-metrics.js (parcial: getTardiness, sumInactivityMinutes*, parseReportStartDate, evaluateReportLateness ya separan piezas; falta verificar cobertura 1:1 y el resto de la función — agregación, HTML, mutación de window.*) |
| `parseTime()` | Crítica | No iniciada | fase_2/src/domain/analytics/{kpi-service.js,metrics-calculator.js} o ui/charts/ (propuestos, no existen aún) |
| `openKpiTaskDetails()` | Secundaria | No iniciada | fase_2/src/domain/analytics/{kpi-service.js,metrics-calculator.js} o ui/charts/ (propuestos, no existen aún) |
| `closeKpiTaskDetails()` | Redundante | No iniciada | fase_2/src/domain/analytics/{kpi-service.js,metrics-calculator.js} o ui/charts/ (propuestos, no existen aún) |
| `destroyChart()` | Secundaria | No iniciada | fase_2/src/domain/analytics/{kpi-service.js,metrics-calculator.js} o ui/charts/ (propuestos, no existen aún) |
| `toggleOperativoCustomDates()` | Secundaria | No iniciada | fase_2/src/domain/analytics/{kpi-service.js,metrics-calculator.js} o ui/charts/ (propuestos, no existen aún) |
| `generarAnalisisTextual()` | Crítica | No iniciada | fase_2/src/domain/analytics/{kpi-service.js,metrics-calculator.js} o ui/charts/ (propuestos, no existen aún) |
| `generarReporteEjecutivoPDF()` | Crítica | No iniciada | fase_2/src/domain/analytics/{kpi-service.js,metrics-calculator.js} o ui/charts/ (propuestos, no existen aún) |
| `loadControlOperativoData()` | Crítica | No iniciada | fase_2/src/domain/analytics/{kpi-service.js,metrics-calculator.js} o ui/charts/ (propuestos, no existen aún) |
| `renderControlOperativoFiltered()` | Crítica | No iniciada | fase_2/src/domain/analytics/{kpi-service.js,metrics-calculator.js} o ui/charts/ (propuestos, no existen aún) |
| `renderControlOperativoCharts()` | Crítica | No iniciada | fase_2/src/domain/analytics/{kpi-service.js,metrics-calculator.js} o ui/charts/ (propuestos, no existen aún) |
| `drawPunctualDatesChart()` | Secundaria | No iniciada | fase_2/src/domain/analytics/{kpi-service.js,metrics-calculator.js} o ui/charts/ (propuestos, no existen aún) |
| `drawChart()` | Secundaria | No iniciada | fase_2/src/domain/analytics/{kpi-service.js,metrics-calculator.js} o ui/charts/ (propuestos, no existen aún) |
| `drawCombinedChart()` | Secundaria | No iniciada | fase_2/src/domain/analytics/{kpi-service.js,metrics-calculator.js} o ui/charts/ (propuestos, no existen aún) |
| `drawCombinedChartDaily()` | Secundaria | No iniciada | fase_2/src/domain/analytics/{kpi-service.js,metrics-calculator.js} o ui/charts/ (propuestos, no existen aún) |
| `drawScatterMatriz()` | Secundaria | No iniciada | fase_2/src/domain/analytics/{kpi-service.js,metrics-calculator.js} o ui/charts/ (propuestos, no existen aún) |

#### Comunicados, configuración e incidencias

| Función | Relevancia | Estado | Destino actual / propuesto |
|---|---|---|---|
| `updateActiveSupervisorBadge()` | Secundaria | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `openLoginHistoryModal()` | Crítica | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `renderLoginHistoryTable()` | Secundaria | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `filterLoginHistoryTable()` | Secundaria | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `calculateEffectiveApprovalTime()` | Crítica | Migrada, sin prueba | fase_2/src/domain/analytics/withdrawal-metrics.js |
| `setupUserPresence()` | Crítica | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `startMonitoringPresence()` | Crítica | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `incrementApprovedWithdrawal()` | Secundaria | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `initAtomicApprovedCounterListener()` | Secundaria | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `updateApprovedCountUI()` | Secundaria | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `handleNewIncidentSubmit()` | Crítica | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `startIncidentsRealtimeListener()` | Crítica | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `renderIncidentsTable()` | Secundaria | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `initComunicadosListener()` | Crítica | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `openNewComunicadoModal()` | Secundaria | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `saveNewComunicado()` | Crítica | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `updateUnreadBadge()` | Secundaria | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `renderGestorComunicados()` | Crítica | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `markComunicadoAsRead()` | Crítica | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `checkUnreadUrgentAnnouncements()` | Secundaria | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `markUrgentComunicadoAsRead()` | Secundaria | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `renderConfigGestores()` | Crítica | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `toggleGestorSplitShift()` | Crítica | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `renderAdminComunicados()` | Crítica | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `viewComunicadoContent()` | Secundaria | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `viewComunicadoLecturas()` | Crítica | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
| `deleteComunicado()` | Crítica | No iniciada | fase_2/src/domain/announcements/announcement-service.js — SIN CARPETA PROPIA para "incidencias" (hueco de taxonomía, ver nota) |
## 6. Pasos operativos de carga y despliegue (incorporados explícitamente desde `propuesta-modular.md` §4.1/§4.2)

Estos pasos ya están decididos y documentados en `propuesta-modular.md`, pero no estaban como pasos explícitos dentro de `hoja-de-ruta.md`. Se incorporan aquí para que la ejecución no dependa de cruzar ambos documentos de memoria:

**Para el paso 9 de la Fase 1 y los primeros pasos de la Fase 3 (conectar `src/` a `app.js` por primera vez):**

1. Mantener `src/entry.js` como el único punto que reexporta todo bajo namespaces; compilar con `build/build.mjs` a `dist/riskops.bundle.js` (IIFE global `RiskOps`, ya prototipado y verificado con 53 puntos).
2. En `index.html`, agregar `<script src="riskops.bundle.js?v=...">` **clásico, antes de `app.js`** — nunca `type="module"` (rompe los `onclick` inline, ver hallazgo D del diagnóstico de 2026-09-22). *(Toca un archivo de producción — requiere autorización explícita en el momento, ver sección 7.)*
3. Actualizar `ALLOWED_ROOT_FILES` y el set `allowed` del script Python en `.github/workflows/deploy-pages.yml` para incluir el bundle — decidir si se compila en CI (`npm ci && npm run build` antes de `_site/`, recomendado por `propuesta-modular.md`) o si se versiona el archivo generado. *(Toca el pipeline de despliegue — requiere autorización explícita, ver sección 7.)*
4. Espejar en `window` las banderas que `app.js` y `.github/qa-infra` ya leen (`window.idleDetectorGranted`, `window.idleDetectorStarted`) desde el adaptador nuevo, para no romper el comportamiento existente.
5. Actualizar `frontend_security_smoke.js`, `end_shift_smoke.js` e `inactivity_timeline.test.js` (que hoy leen el **texto** de `app.js` en una VM) para que también carguen el bundle y ajusten sus comprobaciones estáticas — con `npm run check` en verde antes y después de cada corte.
6. Cada función de `app.js` reemplazada por una llamada a `RiskOps.*` conserva su nombre y firma públicos (wrapper), para no romper los `onclick` inline ni el arnés de QA.

**Para cuando la Fase 3 mueva `src/` a su ubicación final (hoy vive en `fase_2/src/`, no en la raíz):**

1. Mover `fase_2/src/` a `src/` en la raíz del repositorio (segundo movimiento — el primero, sacarlo de `.github/`, ya se hizo el 2026-10-03).
2. Actualizar `ALLOWED_ROOT_FILES` y el set `allowed` del script Python en `deploy-pages.yml` para incluir `src/**`.
3. Verificar que `phase1-compatibility-qa.yml` siga pasando con la nueva ubicación antes de fusionar a `main`.

## 7. Checkpoints de autorización explícita durante la ejecución

Para que una sola sesión pueda avanzar de corrido por el mayor tiempo posible sin detenerse a cada paso, estos son los puntos **exactos** donde sí hay que pausar y pedir confirmación en el momento — todos los demás (escribir en `fase_2/src/`, `fase_2/Docs/`, `fase_2/build/`, `fase_2/src/tests/`) pueden avanzar sin pausa, como se ha venido haciendo:

- Cualquier edición de `app.js`, `index.html`, `login.js`, `login.html` o `database.rules.json` (incluidos los comentarios de extracción decididos hoy para las Salvaguardas de Fase 1).
- Cualquier edición de `.github/workflows/deploy-pages.yml` o `.github/qa-infra/package.json` (CI compartido).
- Cualquier `git commit`, `git push`, fusión de rama o apertura de PR.
- Retirar o reemplazar cualquiera de las 8 funciones marcadas "verificar 1:1" (sección 4, punto 3) en su versión original de `app.js`.
- Cualquier cambio a `firebase.json`, `firebase-config.js` o a los scripts `.bat` de despliegue.

## 8. Cierre de los puntos 5 y 6 del diagnóstico (documentación, no código de producción)

- **README.md**: actualizar la fila de la Fase 2 en la tabla de estado (hoy dice "Sin iniciar") para reflejar que ya tiene diagnóstico, arquitectura, un prototipo de bundle verificado y ~48 funciones con código real (13 probadas + 35 migradas). No toca lógica de producción, pero sí es un archivo de la raíz — confirmar antes de escribir.
- **PROMPT_CONTINUACION_FASE2.md**: agregar una copia o un enlace desde `fase_2/Docs/` (por ejemplo en un nuevo `00-contexto/` o referenciado desde este mismo plan maestro), para que las reglas de límites no dependan de pegarse a mano en cada sesión.

## 9. Orden de ejecución recomendado para una sola pasada

1. Confirmar y resolver la sección 1 (respaldo en git).
2. Escribir y verificar la prueba de regresión de la sección 4.2 (`riskOps_timeline`/`breakState`).
3. Verificar una por una las 8 funciones "verificar 1:1" de la sección 4.3 contra su original en `app.js`, documentando el resultado en un informe nuevo de `05-pruebas/`.
4. Decidir la taxonomía de "incidencias" (sección 4.4) y actualizar `propuesta-modular.md` en consecuencia.
5. Completar el inventario de `login.js` y `motor_operativo.py` (sección 4.5).
6. Continuar extrayendo las 108 funciones "no iniciadas" de la tabla de la sección 5, en el orden de las propias secciones del inventario (ya agrupadas por área funcional), escribiendo prueba y entrada en `05-pruebas/` por cada corte — igual que se hizo con `utils/`.
7. Solo cuando el conjunto de una Fase esté migrado y probado: ejecutar los pasos operativos de la sección 6 (carga del bundle, actualización de `deploy-pages.yml`), cada uno con el checkpoint de autorización de la sección 7.
8. Cerrar la sección 8 (README y referencia al prompt de continuación) en paralelo, sin que bloquee lo anterior.

