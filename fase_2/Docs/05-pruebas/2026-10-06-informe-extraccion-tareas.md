# Informe de pruebas: extracción del corte "Tareas, persistencia y ciclo de aplicación"

## 1. Encabezado

| Campo | Valor |
|---|---|
| Fecha | 2026-10-06 |
| Alcance | 21 funciones de `app.js` marcadas "No iniciada" en la subsección "Tareas, persistencia y ciclo de aplicación" del plan maestro (sección 5), más la lógica pura que contienen. Módulos nuevos en `src/domain/tasks/`, `src/services/firebase/`, `src/controllers/` y `src/ui/{views,components}/`. |
| Responsable | Agente del corte `tareas` (Claude), bajo la coordinación indicada en `/tmp/agent-common.md` |
| Fase de la hoja de ruta | Fase 2, paso 6 del plan (extracción de las funciones "no iniciadas"); integración SOLO-laboratorio sobre la copia de staging de `app.js` |
| Producción | `app.js`, `index.html`, `login.*`, `database.rules.json` y el resto del repo **sin tocar**. La integración solo existe en la copia de staging. |
| Comandos | Ver el bloque siguiente. El log íntegro está en [`2026-10-06-log-extraccion-tareas.txt`](2026-10-06-log-extraccion-tareas.txt). |

```
cd fase_2
node src/tests/domain/task-pure-rules.test.mjs
node src/tests/domain/task-repository.test.mjs
node src/tests/ui/task-views.test.mjs
node src/tests/controllers/task-controller.test.mjs
node src/tests/controllers/task-loaders-controller.test.mjs
for f in src/tests/{domain,utils,ui,controllers}/*.test.mjs; do node $f; done          # regresión de src
node /tmp/riskops-bundle.mjs /tmp/tareas-bundle.js                                        # bundle real RiskOps
node /tmp/riskops-integrate.mjs /tmp/tareas-integrado.js                                  # app.js integrado (turno + pasos/*.mjs)
node src/tests/e2e/tareas-integrado.e2e.cjs /tmp/tareas-integrado.js \
     --riskops /tmp/tareas-bundle.js --original /mnt/user-data/uploads/riesgovirtualsoft/app.js
```

## 2. Resumen ejecutivo

| Prueba | Pasaron | Fallaron |
|---|---|---|
| `src/tests/domain/task-pure-rules.test.mjs` (reglas puras: reloj, progreso, latido, recuperación, guardado, selección, catálogo, documentos, arranque) | 21 | 0 |
| `src/tests/domain/task-repository.test.mjs` (`firebase-task-repository.js`) | 21 | 0 |
| `src/tests/ui/task-views.test.mjs` (árbol, KPI, documentos, notificaciones, permisos) | 10 | 0 |
| `src/tests/controllers/task-controller.test.mjs` (recuperación, latido, guardado, selección, arranque) | 18 | 0 |
| `src/tests/controllers/task-loaders-controller.test.mjs` (Excel, horario, teletrabajo, permisos) | 8 | 0 |
| **Suites nuevas del corte** | **78** | **0** |
| `src/tests/e2e/tareas-integrado.e2e.cjs` contra el `app.js` original | 115 | 0 |
| `src/tests/e2e/tareas-integrado.e2e.cjs` contra el `app.js` INTEGRADO + bundle real, con paridad contra el original | **234** | **0** |
| Regresión de `src/tests/{domain,utils,ui,controllers}` | 55 suites, 775 pruebas pasan | 5 fallan en 2 suites ajenas al corte (ver sección 6, H8) |

Resultado: el corte queda **verde**. `node /tmp/riskops-integrate.mjs /tmp/tareas-integrado.js` aplica 33 pasos (15 previos + 18 de este corte) y valida la sintaxis. Las 2 suites en rojo de la regresión (`kpi-chart-configs`, `monitoring-controller`) no importan ningún módulo de este corte y no se tocaron.

## 3. Finalidad de las pruebas

Este corte contiene el camino por el que el progreso del Gestor llega a Firebase y vuelve a su pantalla. Los riesgos que se buscan mitigar son de **pérdida o pisado de datos** y de **dinero/operación**, no de estética:

1. **Una tarea guardada nunca debe pisarse.** El latido de sesión se ejecuta cada pocos segundos con un instantáneo del DOM; si algún día incluyera `tasks`, borraría tareas recién guardadas desde otra pestaña. Las pruebas exigen que el latido use `update()` solo con metadatos (jamás `tasks`) y que `persistTaskToActiveSession` escriba únicamente `active_sessions/{uid}/tasks/{taskId}`.
2. **Un fallo de lectura no puede disfrazarse de "no hay tareas remotas".** Si `fetchOwnActiveSessionTasks` devolviera `{}` ante un error, la migración re-escribiría con datos viejos tareas que sí existen. Se exige `ok:false` y que `recoverGestorTaskProgress` haga **cero** escrituras remotas (y cero en localStorage) en ese caso.
3. **Una versión remota más reciente gana siempre.** La transacción de `persistTaskIfNotNewerRemote` debe abortar si el servidor tiene un `updatedAt` estrictamente mayor, incluso cuando otra pestaña escribe a mitad de la migración.
4. **El respaldo local va antes del intento remoto**, para que el trabajo del Gestor sobreviva a una caída de red; y un fallo individual no aborta el resto ni se reporta como éxito.
5. **La identidad se revalida justo antes de escribir** (`IDENTITY_MISMATCH` => cero escrituras remotas).
6. **El Gestor ve lo que le corresponde**: cronograma, turno del día, filtros, historial de permisos propio (privacidad por rol) y HTML escapado (nombres con comillas o `<b>`).

## 4. Metodología

- **Arnés**: `src/tests/test-harness.mjs` (`createRunner`, `testAsync`, `summarizeAsync`), sin frameworks nuevos. Node 22.
- **Pruebas diferenciales con copia LITERAL.** Cada suite pega, con los números de línea de `app.js` en el comentario, el algoritmo original (sin modificar) en el ámbito del módulo de prueba, rodeado de globales simulados (`document`, `database`, `localStorage`, `Date` fijo, `console`, `alert`, `firebase`, `window`, `fetch`, `XLSX`). Se ejecuta lado a lado con el módulo nuevo y se comparan los resultados y lo que quedó escrito (DOM simulado, base simulada, caché local, alertas, orden de efectos). Entradas fijas más escenarios aleatorios con semilla (mulberry32): 150 de `loadExcelTasks`, 120 de `loadSchedule`, 120 de `loadTeletrabajo`, 150 de `loadPermisos`, 250 de recuperación, 300 de latido, 300 de migración, 200 de `renderTree`, 200 de notificaciones.
- **Ayudante de prueba** `src/tests/controllers/tareas-fake-dom.mjs` (no es una suite): DOM simulado con `snapshotDocument`, generador con semilla y **base Realtime simulada con la semántica que importa**: `update()` solo reemplaza las llaves recibidas; `transaction()` llama primero a `fn` con una suposición local y luego con el valor real y aborta si devuelve `undefined`; rutas que fallan (`failPaths`); gancho `beforeTransaction` que simula otra pestaña escribiendo justo antes; rechaza `undefined` como Firebase. Las pruebas asíncronas que comparten estado global simulado se serializan (`createSerialTestAsync`).
- **Sensibilidad**: durante el desarrollo se comprobó con mutaciones que las suites unitarias detectan regresiones; para el e2e se aplican 3 mutaciones deliberadas al `app.js` integrado (la recuperación deja de respaldar en localStorage, el latido envía `tasks`, la recuperación deja de verificar la identidad) y el e2e las detecta (9, 25 y 7 verificaciones en FAIL; sección 5 del log).
- **Integración de laboratorio** (`lab/integracion/pasos/tareas.mjs`, 18 pasos): sustituye cuerpos de funciones de la copia de staging por llamadas a `RiskOps.*` conservando nombre, firma y orden de efectos; anclas únicas, sin solaparse con el controlador de turno ni con `modales-permisos.mjs`; todo lo agregado lleva `[LAB-INTEGRACION]`.
- **e2e `tareas-integrado.e2e.cjs`**: extrae las funciones REALES de `app.js` (original e integrado) a un `vm` con el bundle real `RiskOps` y ejecuta 115 escenarios sobre ambos. Con `--original` exige que TODO lo observable sea idéntico y en el mismo orden: alertas, errores de consola, lecturas y escrituras a Firebase con su carga, escrituras a localStorage, llamadas a `fetch`, DOM antes y después de los temporizadores, estado global y errores. Además comprueba propiedades de seguridad por escenario (latido sin `tasks`, cero escrituras remotas ante lectura fallida o identidad distinta, respaldo local antes del remoto).

## 5. Detalle por módulo probado

### 5.1 Tabla función → estado → módulo → pruebas

Leyenda de estado: **Hecha+probada** = extraída 1:1 y con prueba diferencial en verde; **Parcial** = parte extraída y probada, el resto queda en `app.js` con motivo; **No extraíble** = orquestador sin lógica propia que extraer más allá de lo ya extraído.

| Función (`app.js`) | Estado | Módulo(s) | Pruebas | Conectada al lab |
|---|---|---|---|---|
| `updateClock()` | Hecha+probada | `domain/tasks/clock-format.js` (`formatClockTime`); también `createTaskWorkspaceController().updateClock` | `task-pure-rules` (500 instantes), `task-controller` | Sí (paso 1) |
| `formatExcelDate()` (anidada en `loadSchedule`) | Hecha+probada | `domain/tasks/schedule-sheet.js` | `task-pure-rules` (1000 seriales aleatorios) | Sí, vía `loadSchedule` |
| `persistTaskToActiveSession()` | Hecha+probada | `services/firebase/firebase-task-repository.js` | `task-repository`, e2e R1-R3 | Sí (paso 8) |
| `fetchOwnActiveSessionTasks()` | Hecha+probada | idem | `task-repository`, e2e F1-F4 | Sí (paso 8) |
| `persistTaskIfNotNewerRemote()` | Hecha+probada | idem (`resolveTaskTransaction`) | `task-repository`, e2e N1-N3 | Sí (paso 9) |
| `migrateLocalTasksToActiveSession()` | Hecha+probada | idem (usa `computeLocalTaskMigrations` de `task-reconciler.js`) | `task-repository` (300 escenarios), e2e M1-M5 | Sí (paso 10) |
| `recoverGestorTaskProgress()` | Hecha+probada | `controllers/task-controller.js` (`createTaskRecoveryController`) + `domain/tasks/task-recovery.js` | `task-controller` (250 escenarios), `task-pure-rules`, e2e V1-V7 | Sí (paso 16) |
| `updateKPI()` | Hecha+probada | `createTaskWorkspaceController().updateKPI` + `domain/tasks/task-progress.js` + `ui/views/task-tree-view.js` | `task-views` (todas las combinaciones 0..12), `task-pure-rules`, e2e K1-K6 | Sí (paso 14) |
| `toggleTree()` | Hecha+probada | `ui/components/tree-toggle.js` | `task-views`, e2e T1 | Sí (paso 14) |
| `renderQuickDocs()` | Hecha+probada | `domain/tasks/quick-docs.js` + `ui/views/quick-docs-view.js` | `task-pure-rules`, `task-views`, e2e D1-D2 | Sí (paso 14) |
| `renderTree()` | Hecha+probada | `ui/views/task-tree-view.js` + workspace controller | `task-views` (200 escenarios), e2e A1-A4 | Sí (paso 7) |
| `selectTask()` | Hecha+probada (efectos en controlador) | workspace controller + `domain/tasks/task-selection.js` | `task-controller`, `task-pure-rules`, e2e X1-X6 | Sí (paso 15) |
| `loadExcelTasks()` | Hecha+probada (efectos en controlador) | `controllers/task-loaders-controller.js` + `domain/tasks/task-catalog.js` | `task-loaders-controller` (150 escenarios), `task-pure-rules`, e2e L1-L6 | Sí (paso 2) |
| `loadSchedule()` | Hecha+probada (efectos en controlador) | loaders controller + `domain/tasks/schedule-sheet.js` | `task-loaders-controller` (120 escenarios), e2e H1-H12 | Sí (paso 3) |
| `renderScheduleBlock()` (anidada) | Hecha+probada | `schedule-sheet.js` (`buildScheduleHeadHTML`, `buildScheduleRowsHTML`, ...) + loaders controller | idem | Sí, vía `loadSchedule` |
| `loadTeletrabajo()` | Hecha+probada (efectos en controlador) | loaders controller + `domain/tasks/teletrabajo-sheet.js` | `task-loaders-controller` (120 escenarios), e2e W1-W9 | Sí (paso 4) |
| `renderTeletrabajoBlock()` (anidada) | Hecha+probada | `teletrabajo-sheet.js` + loaders controller | idem | Sí, vía `loadTeletrabajo` |
| `loadPermisos()` | Hecha+probada (efectos en controlador) | loaders controller + `ui/views/permission-history-view.js` | `task-loaders-controller` (150 escenarios), `task-views`, e2e P1-P8 | Sí (paso 5) |
| `openPermisoDetailModal()` | Hecha+probada (efectos en controlador) | loaders controller + `permission-history-view.js` (`buildPermissionDetailHTML`) | `task-loaders-controller`, `task-views`, e2e P9 | Sí (paso 6) |
| `syncActiveSessionToFirebase()` | **Parcial** | `domain/tasks/task-session-sync.js`, `task-progress.js`, repositorio (`syncSessionMetadata`), `createSessionSyncController` (versión completa) | `task-controller` (300 escenarios), `task-pure-rules`, `task-repository`, e2e S1-S10 | Parcial (pasos 11-13): contadores y porcentaje, transición de Inactividad y cola del payload. El estado/campos de Pausa de Turno y el `update()` los conserva el controlador de turno |
| `initApp()` | **Parcial / No extraíble** (orquestador) | `runStartupDataSequence`, `createTaskRecoveryController.runStartupRecovery`, `createTaskSaveController`, `domain/tasks/app-init-rules.js`, builders de notificaciones | `task-controller`, `task-pure-rules`, `task-views`, e2e I1-I6 y G1-G9 | Parcial (pasos 17-18): secuencia de arranque de datos y listener de `#saveTaskBtn` |

Funciones ya "Migradas, sin prueba" del mismo bloque (`canonicalTaskId`, `isLegacyGenericTaskName`, `resolveTaskDisplayName`, `reconcileScheduledTaskWithSession`, `buildTaskReportSummaryText`, `mergeTaskCaches`, `computeLocalTaskMigrations`): este corte las **usa** (el e2e ejecuta sus copias reales en `app.js` y el repositorio importa `computeLocalTaskMigrations`) pero no las modifica ni las prueba por sí mismas.

### 5.2 Para qué sirve cada módulo dentro de Risk Manager

- **`domain/tasks/clock-format.js`**: formato HH:MM:SS del reloj de la cabecera (`updateClock`, una vez por segundo). Pruebas: horas límite y 500 instantes aleatorios contra el literal.
- **`domain/tasks/task-progress.js`**: contadores y porcentajes. `computeSyncPercentage` alimenta el latido que ve el supervisor; `computeKpiFigures` alimenta la tarjeta KPI del Gestor. Todas las combinaciones 0..30 contra el literal. Conserva la diferencia de redondeo (H1).
- **`domain/tasks/task-session-sync.js`**: reglas del latido (¿corresponde sincronizar?, ¿sesión cerrada en otra pestaña?, hora de login de respaldo, inactividad por detector o por DOM, transición de la bitácora, payload y su cola). `buildSessionMetadata` **nunca** incluye `tasks`.
- **`domain/tasks/task-recovery.js`**: estados y alertas de la recuperación del arranque (`REMOTE_READ_FAILED`, migraciones fallidas), con los mismos textos visibles.
- **`domain/tasks/task-save-rules.js`**: validación del guardado de progreso en orden original, construcción del registro, clase visual por botón y mensaje de error (permiso denegado o red).
- **`domain/tasks/task-catalog.js`**: asignación de ids del maestro, turno del Gestor, filas del Gestor según cronograma con tareas mock deterministas (mismos ids, incluidas colisiones), agrupación por Set, purga de huérfanas (`reconcileGestorTaskCache`, muta in situ como el original), selector de Set, URL del Excel.
- **`domain/tasks/schedule-sheet.js` / `teletrabajo-sheet.js`**: bloques de semanas, gestores, cabeceras, filas y clases de turno del Horario Personal y del Teletrabajo, con el mismo HTML.
- **`domain/tasks/task-selection.js`, `quick-docs.js`, `app-init-rules.js`**: selección por id canónico (0 y "0" coinciden), documento sugerido por palabra clave (las dos copias de `app.js`), avatares, tema y worker de ping.
- **`ui/views/task-tree-view.js`, `quick-docs-view.js`, `permission-history-view.js`, `ui/components/tree-toggle.js`**: HTML del árbol, KPI, documentos, historial y detalle de permisos y notificaciones; plantillas copiadas literalmente por script.
- **`services/firebase/firebase-task-repository.js`**: rutas y garantías de persistencia (sección 3).
- **`controllers/task-controller.js`**: recuperación, latido (versión completa con DI), guardado, espacio de trabajo (reloj, KPI, árbol, documentos, selección) y secuencia de arranque.
- **`controllers/task-loaders-controller.js`**: cargadores con `fetch`, SheetJS, DOM y Firebase inyectados.

### 5.3 Qué quedó conectado y qué no (lab)

Conectado (18 pasos; el `app.js` integrado, con todos los cortes presentes, pasa de 8841 a 7265 líneas y tiene 42 líneas con la marca `[LAB-INTEGRACION]`, incluidas las de otros cortes): ver la tabla. Para respetar al controlador de turno, el latido se conectó solo en tres fragmentos (contadores, transición de Inactividad, cola del payload); no se tocó el `database.ref(...).update(...)` porque el controlador de turno añade ahí su aviso de sincronización y duplicaría el registro.

**Extraído, no conectado** (con motivo):

| Pieza | Motivo |
|---|---|
| `createSessionSyncController().syncActiveSession` (latido completo) | Sustituiría líneas que el controlador de turno ya reemplaza (estado de pausas, payload, aviso). Se conecta cuando el controlador de turno y este se unifiquen. |
| `createTaskWorkspaceController().updateClock` | `updateClock` usa directamente `formatClockTime` (superficie mínima, se ejecuta al cargar). |
| `app-init-rules.js` (avatares, tema, worker de ping) y los builders de notificaciones de `permission-history-view.js` | Están dentro de `initApp()` entrelazados con listeners de Firebase y navegación de otros cortes; reescribirlos exigiría tocar muchas líneas. |
| `matchQuickDoc` en la segunda copia (botón de ayuda) | La segunda copia vive en otro bloque de `initApp()`. |
| Resto de `initApp()` (navegación, paneles de administración, formulario de permisos, inyección de manuales) | Orquestador; pertenece en parte a otros cortes. Por eso `initApp` queda **Parcial / No extraíble**. |

## 6. Hallazgos

- **H1 (portado fiel, no corregido). Dos porcentajes distintos.** El supervisor recibe `round(finalizadas/total*100)`; la tarjeta KPI del Gestor muestra `round(realizadas/total*100) + round(no realizadas/total*100)`. Con 1 realizada + 1 no realizada de 3 tareas: supervisor 67 %, KPI 66 %. Probado en `task-pure-rules` y en e2e K5. Decisión de negocio pendiente: ¿unificar?
- **H2. El e2e encontró una diferencia real que las pruebas unitarias no veían.** El controlador de cargadores leía `firebase.auth()` de forma ansiosa en `loadPermisos`, mientras el original solo lo consulta cuando el usuario filtrable no trae `uid` (y un Admin/Supervisor nunca). Con `firebase.auth()` lanzando, el original seguía y el integrado fallaba. **Corregido** en el propio corte: `resolvePermissionsQueryUid` acepta una función y la evalúa solo si hace falta; se amplió su prueba en `task-views`. Tras el cambio, 234/234.
- **H3. Duplicado en `renderQuickDocs`.** La condición `taskNameLower.includes('jineteo') || taskNameLower.includes('jineteo')` repite el mismo término (probable intención: variantes ortográficas). Portado fiel.
- **H4. Dos copias de la lógica de documentos sugeridos** en `app.js` (`renderQuickDocs` y el botón de ayuda): cualquier cambio de palabras clave debe hacerse en ambas. `matchQuickDoc` está probada contra las dos copias.
- **H5. `persistTaskToActiveSession` rechaza un `taskId` falsy.** Un id numérico `0` daría `MISSING_TASK_ID`. No ocurre hoy porque los ids pasan por `canonicalTaskId` (cadena `"0"`, truthy); se deja constancia como riesgo si algún llamador futuro pasara un número.
- **H6. Diferencias documentadas e inocuas** (excluidas de la comparación): `app.js` pide `#scheduleGestorFilter` y no lo usa (variable muerta); escribe `console.log('current user matched = true')` por fila del usuario. El controlador no las reproduce.
- **H7. `allLoadedPermissions` ya no es global** en el `app.js` integrado: vive dentro del controlador de cargadores (`window.openPermisoDetailModal` lo usa desde ahí). Ningún otro bloque de `app.js` lo leía (verificado con búsqueda).
- **H8. Regresión de `src`: 2 suites ajenas fallan** (775 pruebas pasan, 5 fallan): `ui/kpi-chart-configs.test.mjs` (`drawCombinedChart`, 1 fallo) y `controllers/monitoring-controller.test.mjs` (4 fallos). No importan ningún módulo de este corte (usan `domain/analytics/*` y `ui/charts/*`), se modificaron por última vez antes de este trabajo y no se tocaron. Además `modales-permisos-integrado.e2e.cjs` (otro corte) falla U5 y P9 **también contra el `app.js` original** (expectativas de esa prueba, no una regresión de este corte). Ambos puntos se reportan para que los revise el dueño de cada corte.
- **H9. Acoplamiento entre cortes resuelto.** `modales-permisos-integrado.e2e.cjs` extrae `persistTaskToActiveSession` de `app.js` por su cabecera hasta la primera llave de cierre. Por eso el paso 8 la deja **autocontenida** (solo usa `database` y `RiskOps`); con una versión de una línea esa prueba rompía con `__tareasRepo is not defined`. Queda comentado en el paso.
- **H10. Evaluación ansiosa menor, no observable en producción.** `createTaskSaveController` consulta `getAuthUser()` antes de validar el resto, mientras el original lo hace tras las validaciones previas. Solo difiere si `firebase.auth()` lanzara; no se reproduce en el e2e (G1-G9 idénticos). Se deja anotado.

Sin bugs de pérdida de datos nuevos en `app.js`: los comentarios del original sobre el latido, la lectura fail-safe y la transacción condicional se cumplen tal como están escritos.

## 7. Log completo

[`2026-10-06-log-extraccion-tareas.txt`](2026-10-06-log-extraccion-tareas.txt): salida real e íntegra de (1) las 5 suites nuevas, (2) la regresión de las 55 suites de `src` (última línea de cada una y detalle de los fallos ajenos), (3) bundle e integración, (4) el e2e contra el original y contra el integrado con paridad, (5) la sensibilidad del e2e ante 3 mutaciones, (6) las otras pruebas e2e/unitarias sobre el `app.js` integrado.

## 8. Estado frente al criterio de salida y próximos pasos

- **Cubierto por este corte:** las 21 funciones "No iniciadas" tienen destino, extracción 1:1 y prueba diferencial en verde (19 hechas+probadas, `syncActiveSessionToFirebase` parcial, `initApp` parcial/no extraíble); integración de laboratorio verificada (`riskops-integrate` aplica 33 pasos y valida sintaxis); 234/234 en el e2e con paridad contra el original; `app.js` de producción sin tocar.
- **Pendiente:**
  1. Unificar el latido completo (`createSessionSyncController`) con el controlador de turno para retirar los tres fragmentos parciales.
  2. Extraer del resto de `initApp()` lo que no pertenece a otros cortes (avatar, tema, ping, notificaciones) y conectarlo.
  3. Decidir H1 (un solo porcentaje) y revisar H3 (duplicado de `jineteo`).
  4. Que los dueños de `kpi-chart-configs`, `monitoring-controller` y de `modales-permisos-integrado.e2e.cjs` (U5, P9) revisen sus fallos (H8).
  5. Actualizar el estado de estas 21 funciones en el plan maestro y añadir esta fila a la tabla de informes del README de `05-pruebas` (no se editaron por las reglas del corte).
- **Antes de pasar a producción** (fuera de este corte): validar con el Gestor real, en el entorno de pruebas de Firebase, el guardado de tareas, la recuperación tras recargar y el latido; el e2e usa una base simulada con la semántica documentada, no el SDK real.
