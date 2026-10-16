# Informe — Funciones duplicadas entre `app.js` y `src/`

## 1. Encabezado

- **Fecha:** 2026-10-15
- **Rama:** `backup/fase2-refactor-2026-10-03` (árbol de trabajo con `src/` y `build/` en la raíz).
- **Alcance:** las funciones de nivel superior de `app.js` (4.491 líneas) que tienen un equivalente en `src/`. Se revisan los datos que consume cada copia y el resultado que devuelve.
- **Responsable:** Luis Fuentes.
- **Archivos leídos (solo lectura):** `app.js`, `index.html`, `js/tiempos.js`, `src/**`, `fase_2/Docs/03-plan-migracion/plan-maestro-ejecucion.md`, `fase_2/Docs/01-analisis-tecnico/inventario-funciones.md` y el `app.js` de `origin/main`, solo para comparar datos.
- **Archivos modificados:** ninguno de la app. Se agregan este informe, su log (`2026-10-15-log-auditoria-duplicados.txt`) y los scripts de la auditoría (`fase_2/lab/auditoria-duplicados/`).
- **Comando:** `fase_2\lab\auditoria-duplicados\ejecutar-auditoria.cmd`. Instala `acorn` y `jsdom` en esa carpeta la primera vez y deja el resultado en `salida-completa.txt`.

## 2. Resumen ejecutivo

`app.js` tiene 179 funciones de nivel superior. 123 ya delegan en `RiskOps` (el bundle de `src/`) y no se tocan aquí. Las 56 restantes tienen lógica propia:

| Grupo | Funciones | Qué significa |
|---|---|---|
| **A. Equivalentes verificadas** | 41 | Con las mismas entradas, la copia de `app.js` y la de `src/` dan el mismo resultado. Se puede quitar la copia de `app.js` y dejar una línea que delegue en `RiskOps`. |
| **B. Mismo nombre, resultado distinto** | 6 | La prueba encontró diferencias. Antes de quitar una copia hay que decidir cuál comportamiento es el correcto. |
| **C. No intercambiables tal cual** | 6 | El detector de inactividad: la copia de `src/` guarda su propio estado y no lee el de `app.js`. Solo se puede migrar en bloque. |
| **Sin par en `src/`** | 3 | Se quedan en `app.js`. |

Además hay 5 bloques `[Fase 2]` con código de respaldo, que solo corre si el bundle no carga. Como el bundle ya es obligatorio, ese código nunca se ejecuta y duplica a los módulos (sección 8).

**Lo más importante:**

1. `sanitizeAnnouncementHTML` (comunicados) **no es equivalente**, aunque el plan maestro la da por "Hecha + probada". La copia de `src/` muestra como texto el contenido de `<script>` y `<style>` y codifica dos veces entidades como `&nbsp;`; también se come el carácter `<` suelto. Hoy los comunicados usan la de `app.js`, que se pasa al controlador como `helpers`. Si se quita esa copia, los comunicados con `&nbsp;` se verían mal.
**NOTA_1:** ya que la que funciona es la de app.js, entonces tomarla como fuente de verdad y usarla como parche en en src. teniendo en cuenta que el riesgo actual es que sin la version de app.js src mostraria mal los comunicados.
2. **Enlaces de manuales:** `src/config/doc-links.js` tiene 2 URLs con un carácter de menos (PragmaticplaySlot y Redrakegaming), que no coinciden ni con `app.js` ni con `main`. A su vez, `main` ya tiene 4 enlaces nuevos (Belatra, Egt, Evolution y Playson) que no están en la rama.
**NOTA_2:** Se mantendra la version del main, para concervar los 4 enlaces nuevos y tambien la version correcta de los URLs mal tipeados. 
3. `appendFormSubmitCc` tiene **otro contrato**: en `app.js` modifica el formulario que recibe; en `src/` devuelve una copia nueva y deja el original igual. Cambiarla sin ajustar quien la llama haría que los correos salieran **sin copia** a supervisión. *(Resuelto por NOTA_3: el módulo vuelve a mutar el mismo `FormData`; ver sección 11.)*
**NOTA_3:** Adaptar la función de src/ para que vuelva a mutar el objeto original, esto evitara cambiar todo el sistema.
4. Hay dependencias de fuera de `app.js` que obligan a conservar algunos nombres globales. `js/tiempos.js` llama a `getShiftForDate`, `index.html` llama a `requestIdlePermissionManual` desde un `onclick`, y varias funciones están expuestas en `window`. Al delegar, esos nombres tienen que seguir existiendo.
**NOTA_4:** el problema es que mientras no se refactorice también el index.HTML y los scripts externos adyacentes, estare obligado a mantener un puente de compatibilidad exponiendo explícitamente esas funciones en el objeto global (ej. window.getShiftForDate = ...) para que la aplicación no muera en runtime. 
Qué significa: se intenta modularizar el código, pero el ecosistema que lo rodea sigue dependiendo de malas prácticas legadas: archivos externos como js/tiempos.js llaman a funciones internas, y el HTML (index.html) ejecuta funciones directamente en atributos onclick.
El riesgo: Si se encapsula todo estrictamente en módulos modernos (por ejemplo, usando export sin exponer nada al exterior), el navegador arrojará errores de que getShiftForDate o requestIdlePermissionManual no están definidas.

## 3. Finalidad

Dejar una sola fuente de verdad por regla de negocio. Mientras existan dos copias, una corrección en una no llega a la otra. El caso de los enlaces de manuales muestra que eso ya está pasando.

## 4. Metodología

1. **Inventario** (`inventario.mjs`): se analiza `app.js` con un parser de JavaScript (acorn). Para cada función de nivel superior se registra si delega en `RiskOps` o en un controlador `__xxx()`, y se cruza con los `export` de `src/`, primero por nombre y luego con los comentarios "Puerto de `app.js` …" de cada módulo.
2. **Documentación:** el estado de cada función se toma de la tabla del `plan-maestro-ejecucion.md`, sin modificarlo.
3. **Prueba diferencial** (`comparar.mjs`, `cmp-*.mjs`): la función **real** se extrae de `app.js` con todas las funciones y constantes de las que depende y se ejecuta en un entorno aislado de Node (`vm`). El DOM se simula con jsdom y Firebase, `fetch` y XLSX con versiones falsas. A la de `src/` se le dan **las mismas entradas** y se comparan los resultados. Las entradas son casos límite (vacío, `null`, números, acentos, HTML malicioso, fechas límite) más cadenas generadas con una semilla fija, así que la prueba es repetible.
4. **Datos de entrada que cambian de lugar:** cuando la copia de `app.js` lee una variable global (`allTasks`, `globalCronogramaData`, `globalScheduleRows`) y la de `src/` la recibe como parámetro, se carga el mismo dato en ambos lados. La columna "Adaptador" de la tabla A lo indica.
5. **Usos** (`usos.mjs`): para cada función se cuentan las llamadas dentro de `app.js`, las veces que se inyecta en un controlador y los usos en `index.html` y `js/tiempos.js`.
6. **Lectura de código:** se usa solo donde la ejecución depende de APIs del navegador que no se pueden simular con fidelidad (IdleDetector).

## 5. Grupo A — Equivalentes verificadas (41)

Resultado idéntico en todos los casos. La columna "Delegar en" indica el espacio de nombres del bundle. "Fuera del bundle" significa que hay que agregar el módulo a `src/entry.js` antes de delegar.

| Función (`app.js` l.) | Módulo en `src/` | Casos / dif. | Usos en `app.js` | Adaptador al delegar | Delegar en |
|---|---|---|---|---|---|
| `escapeHTML` (10) | `utils/sanitization.js` | 250 / 0 | 26, inyectada, `window.*` | — | `RiskOps.sanitization` |
| `encodeInlineHandlerArg` (23) | `utils/sanitization.js` | 250 / 0 | 5, inyectada | — | `RiskOps.sanitization` |
| `sanitizeAnnouncementHref` (32) | `utils/sanitization.js` | 250 / 0 | 1 | — | `RiskOps.sanitization` |
| `canPublishComunicados` (95) | `domain/announcements/announcement-capabilities.js` | 13 / 0 | 2, `window.*` | — | `RiskOps.announcementCapabilities` |
| `canViewComunicadoLecturas` (99) | ídem | 13 / 0 | 2, `window.*` | — | ídem |
| `canDeleteComunicados` (103) | ídem | 13 / 0 | 2, `window.*` | — | ídem |
| `canManageComunicados` (109) | ídem | 13 / 0 | 1, `window.*` | — | ídem |
| `setupCustomMultiSelect` (129) | `ui/components/multi-select.js` | 12 pasos / 0* | 4, inyectada | — | `RiskOps.multiSelect` |
| `getSelectedMultiSelectValues` (274) | ídem | (mismo escenario) | 5, inyectada | — | ídem |
| `resetCustomMultiSelect` (280) | ídem | (mismo escenario) | 1 | — | ídem |
| `setCustomMultiSelectValues` (288) | ídem | (mismo escenario) | 1, inyectada | — | ídem |
| `pushTimelineEvent` (457) | `domain/shifts/timeline-service.js` | 6 / 0 | 5, inyectada | El módulo no muta ni guarda: `shiftTimeline = RiskOps.timelineService.pushTimelineEvent(shiftTimeline, type, action); localStorage.setItem('riskOps_timeline', …)` | `RiskOps.timelineService` |
| `cleanText` (840) | `utils/normalize.js` | 250 / 0 | 3 | — | `RiskOps.normalize` |
| `normalizeTaskName` (849) | `utils/normalize.js` | 250 / 0 | 2 | — | `RiskOps.normalize` |
| `namesMatch` (769) | `utils/normalize.js` | 1.861 / 0 | 8, inyectada | — | `RiskOps.normalize` |
| `taskNamesMatch` (863) | `utils/normalize.js` | 1.089 / 0 | 6, inyectada | — | `RiskOps.normalize` |
| `setNamesMatch` (879) | `utils/normalize.js` | 1.089 / 0 | 2, inyectada | — | `RiskOps.normalize` |
| `excelToJSDate` (798) | `utils/excel.js` | 17 / 0 | 2 | — | `RiskOps.excel` |
| `isSameDate` (804) | `utils/excel.js` | 85 / 0 | 2 | — | `RiskOps.excel` |
| `parseSheetRange` (901) | `domain/schedules/cronogram-parser.js` | 84 / 0 | 1 | — | `RiskOps.cronogramParser` |
| `getWeekSheet` (951) | ídem | 32 / 0 | 1 | — | ídem |
| `fetchCronogramaRowsForDate` (979) | ídem | 15 / 0 | 2 | `{ baseUrl: 'Cronograma de Tareas/', fetchImpl: fetch, xlsx: XLSX }` | ídem |
| `getCronogramaColumnsForToday` (1021) | ídem | 150 / 0 | 2 | — | ídem |
| `preloadCronograma` (1062) | ídem | lectura de código | 2 | `onLoaded: (rows) => { globalCronogramaData = rows; …re-render de Monitoreo }` | ídem |
| `getAssignedTasksForGestor` (1081) | ídem | 30 / 0 | 4, inyectada | Pasar `globalCronogramaData` y `new Date()` | ídem |
| `loadCronogramaAssignments` (1110) | ídem | 6 / 0 | 2, inyectada | Asignar el resultado: `gestorCronogramaAssignments = await …` | ídem |
| `getScheduledGestoresCountForShift` (1164) | `domain/schedules/schedule-service.js` | 50 / 0 | **0 (código muerto)** | — | Se puede borrar sin delegar |
| `getShiftForDate` (1224) | ídem | 83 / 0 | 5, inyectada, **la usa `js/tiempos.js`** | Mantener el nombre global | `RiskOps.scheduleService` |
| `canonicalTaskId` (1490) | `domain/tasks/task-report.js` | 250 / 0 | 4 | — | `RiskOps.taskReport` |
| `isLegacyGenericTaskName` (1498) | ídem | 256 / 0 | 3 | — | ídem |
| `resolveTaskDisplayName` (1513) | ídem | 200 / 0 | 7, inyectada | `catalog \|\| allTasks`, `onWarn: console.warn` | ídem |
| `buildTaskReportSummaryText` (1558) | ídem | 9 / 0 | 2, inyectada | `{ catalog: allTasks, onWarn: console.warn }` | ídem |
| `reconcileScheduledTaskWithSession` (1537) | `domain/tasks/task-reconciler.js` | 36 / 0 | 2, inyectada | `catalog \|\| allTasks` | `RiskOps.taskReconciler` |
| `mergeTaskCaches` (1624) | ídem | 9 / 0 | 3 | — | ídem |
| `computeLocalTaskMigrations` (1652) | ídem | 9 / 0 | 1 | — | ídem |
| `hasRealSetOptions` (2487) | `domain/shifts/shift-closure-rules.js` | 11 / 0 | 1 | — | `RiskOps.shiftClosureRules` |
| `requiresSpecificSetSelection` (2494) | ídem | 11 / 0 | 1 | — | ídem |
| `restoreEndShiftButton` (2499) | `ui/components/end-shift-button.js` | 6 / 0 | 2 | — | **Fuera del bundle** |
| `persistShiftClosureCore` (2471) | `services/firebase/firebase-shift-repository.js` | 5 / 0 | 1 | `createShiftRepository({ database, serverTimestamp: firebase.database.ServerValue.TIMESTAMP })` | **Fuera del bundle** |
| `calculateShiftDelay` (3105) | `domain/analytics/monitoring-view.js` → `buildShiftDelayBadgeHtml` | 3.456 / 0 | 1 | Cambia el nombre | `RiskOps.monitoringView` |
| `calculateEffectiveApprovalTime` (4369) | `domain/analytics/withdrawal-metrics.js` | 676 / 0 | 1, `window.*` | — | `RiskOps.withdrawalMetrics` |

\* Multiselect: se probaron 12 pasos en un DOM real (jsdom): abrir, marcar, buscar, seleccionar todos, ninguno, `setValues`, `reset` y clic fuera. Etiqueta, casillas, z-index, valores y llamadas de retorno resultaron idénticos. Solo cambian espacios dentro del HTML del botón, que no se ven, y que el módulo devuelve un objeto cuando `app.js` devuelve `undefined`; ningún llamador usa ese valor.

**Desactualizado en la documentación:** el plan maestro dice que el badge de `calculateShiftDelay` "queda en app.js". Ya está en `monitoring-view.js` y es idéntico (3.456 casos).

## 6. Grupo B — Mismo nombre, resultado distinto (6): requieren decisión

| Función | Diferencia encontrada | Impacto si se cambia a `src/` |
|---|---|---|
| `sanitizeAnnouncementHTML` (47) | 8 de 40 casos. `<script>alert(1)</script>ok`: `app.js` devuelve `ok` y `src` devuelve `alert(1)ok`. `<em>&nbsp;</em>`: `app.js` devuelve `<em>&nbsp;</em>` y `src` devuelve `<em>&amp;nbsp;</em>`. `<p>a & b < c > d</p>`: `src` pierde el `<`. También `<style>`, `<template>`, `<noscript>` y `<svg><script>`. | **Alto.** Los comunicados con espacios de no separación (los pega cualquier editor) mostrarían `&nbsp;` como texto. Ninguno de los dos casos es inseguro: el texto queda escapado. |
| `getManualUrl` (1339) | Misma lógica, **datos distintos**: 2 URLs de `src/config/doc-links.js` tienen un carácter de menos (PragmaticplaySlot `…YqQnGJ…` → `…YQnGJ…`; Redrakegaming `…KJx2dp…` → `…KJ2dp…`). | **Alto.** Esos dos manuales abrirían un enlace roto. Además, `main` ya cambió Belatra, Egt y Evolution y agregó Playson (sección 9). |
| `appendFormSubmitCc` (5) | **Contrato distinto.** `app.js` agrega `_cc` al mismo `FormData`; `src` devuelve un `FormData` nuevo y deja el original igual. | **Alto** si solo se cambia el cuerpo: los 2 llamadores (permisos y cierre de turno) seguirían usando el original y el correo saldría sin copia. Hay que usar el valor que devuelve. *(Decisión final: NOTA_3, sección 11 #3.)* |
| `getDocUrl` (1307) | Con `null` o `undefined`, `app.js` lanza un error y `src` devuelve `Procesos/null`. Con nombres válidos, igual (58 casos). | Bajo. En la app siempre llega un nombre de archivo. |
| `normalizeName` (763) | Con valores que no son texto (números, `true`, objetos, arreglos), `app.js` lanza `name.normalize is not a function` y `src` los convierte a texto. Con cadenas, `null` y `undefined`, igual (242 casos). | Bajo. El módulo es más tolerante. |
| `getShiftCategory` (812) | Con un número, `app.js` lanza un error y `src` devuelve `''`. Con textos, igual (128 casos). **El módulo (`schedule-parser.js`) no está en el bundle.** | Bajo. Primero hay que agregarlo a `src/entry.js`. |

## 7. Grupo C — No intercambiables tal cual (6): el detector de inactividad

`setIdleDetectorWarning` (478), `checkAndStartIdleDetector` (485), `requestIdlePermission` (509), `startIdleDetectorLogic` (535), `window.requestIdlePermissionManual` (625) y `shouldApplyDomIdleFallback` (641) tienen su par en `services/browser/idle-detector-adapter.js`, pero **no leen los mismos datos**:

- `shouldApplyDomIdleFallback` en `app.js` lee `window.idleDetectorGranted` y la variable `lastLocalActivityTimestamp`. La del módulo lee su **propio** estado interno y una función `getLastActivityTimestamp` que solo se configura con `initIdleDetector()`, y `app.js` nunca llama a `initIdleDetector()`. Si se delegara solo esta función, el módulo tomaría "ahora" como última actividad y **nunca marcaría inactividad por falta de uso**.
- `window.requestIdlePermissionManual` de `app.js` (botón del aviso amarillo, `onclick` en `index.html`) desactiva el botón y muestra `alert()`. La función del módulo que se llama igual equivale en realidad a `requestIdlePermission` (interna), sin alertas.
- Diferencias menores: el módulo libera el temporizador de bloqueo de pantalla al dispararse y lo cancela cuando el usuario queda inactivo. La copia de `app.js` no lo hace.

**Conclusión:** este grupo solo se puede retirar **completo**, llamando a `RiskOps.idleDetector.initIdleDetector({ onIdleChange, onWarning, getLastActivityTimestamp })` y conservando el botón del aviso como envoltorio. El plan de Fase 3 (`bootstrap.js`) ya lo contempla.

## 8. Respaldo inline `[Fase 2]` (5 bloques)

Estos bloques tienen la forma `RiskOps ? delegar : copia del código original`. Desde la conexión del 2026-10-14 `index.html` carga el bundle siempre y `app.js` falla sin él, así que la rama de respaldo **nunca se ejecuta** y duplica a estos módulos:

| `app.js` l. | Delegación | Copia de respaldo duplicada de |
|---|---|---|
| 1754 | `taskSessionSync.buildSessionMetadata` | objeto `sessionMetadata` del latido |
| 1836 | `appInitRules.resolveSavedTheme / themeIconHTML / nextTheme` | tema claro/oscuro |
| 1863 | `appInitRules.findAvatarFile / buildAvatarSrc` | lista de avatares y URL |
| 2673 | `shiftReportBuilder.buildBitacoraText` | texto de la bitácora del correo |
| 2715 | `shiftReportBuilder.buildShiftReportObject` | objeto del reporte de cierre |

Se pueden quitar dejando solo la delegación. Las pruebas de la suite ya cubren el camino delegado.

## 9. Hallazgos adicionales

1. **`main` avanzó y la rama no lo tiene:**
   - IDs estables de tareas (hash de Set + Tarea en lugar de la posición de la fila) y limpieza en Firebase de tareas huérfanas, en `loadExcelTasks`.
   - El manual de Playson.
   - Nuevos enlaces de Belatra, Egt y Evolution.

   Hay que llevarlos a `src/` (`task-catalog`, `task-loaders-controller`, `doc-links`) antes de fusionar el refactor; si no, la fusión los revertiría.
2. **Código muerto:** `getScheduledGestoresCountForShift` no se llama en ninguna parte de `app.js`, `index.html` ni `js/tiempos.js`.
3. **Nombres que deben seguir siendo globales:** `getShiftForDate` (`js/tiempos.js`), `requestIdlePermissionManual` (`onclick` de `index.html`), y las funciones expuestas en `window` (`escapeHTML`, `sanitizeAnnouncementHTML`, `canPublishComunicados`, `canViewComunicadoLecturas`, `canDeleteComunicados`, `canManageComunicados`, `calculateEffectiveApprovalTime`). Al delegar, el nombre se conserva y solo cambia el cuerpo.
4. **Módulos fuera del bundle** que habría que agregar a `src/entry.js` para delegar: `domain/schedules/schedule-parser.js`, `ui/components/end-shift-button.js` y `services/firebase/firebase-shift-repository.js`.
5. **La documentación sobrestima `sanitizeAnnouncementHTML`:** el "74/74" del 2026-10-03 prueba el módulo contra sus propias expectativas, no contra el comportamiento de `app.js` en el navegador.

## 10. Propuesta de orden para retirar copias (sujeta a tu decisión)

1. **Bloque 1, puras sin globales** (24 funciones del grupo A sin adaptador): sanitización (menos el HTML de comunicados), capacidades de comunicados, normalización de nombres, fechas Excel, hojas del cronograma, IDs y cachés de tareas, reglas del SET y KPI de retiros. Riesgo bajo.
2. **Bloque 2, con adaptador de globales:** nombres y reportes de tareas (`allTasks`), cronograma (`globalCronogramaData`), horario (`getShiftForDate`, que conserva su nombre global para `js/tiempos.js`) y bitácora (`pushTimelineEvent` + `localStorage`).
3. **Bloque 3, DOM y Firebase:** multiselect, botón de fin de turno y cierre de turno (requieren agregar módulos al bundle).
4. **Bloque 4:** borrar el código muerto y los 5 respaldos `[Fase 2]`.
5. **Después de decidir:** el grupo B. El grupo C queda para Fase 3 o para migrarlo en bloque.

Cada bloque se haría en la rama, con la suite del laboratorio y tu prueba manual antes de tu commit. En cada función, el nombre global se conserva y solo cambia el cuerpo.

## 11. Decisiones tomadas (2026-10-15)

Respuestas del responsable: las notas NOTA_1 a NOTA_4 de la sección 2 y las respuestas dadas en la sesión.

| # | Tema | Decisión | Qué implica en el código (cuando se ejecute) |
|---|---|---|---|
| 1 | `sanitizeAnnouncementHTML` | **NOTA_1:** la versión de `app.js` es la fuente de verdad; se usa para corregir `src/`. | Corregir `src/utils/sanitization.js` hasta que la prueba diferencial dé 0 diferencias: descartar el contenido de `<script>`, `<style>`, `<template>` y `<noscript>`, no codificar dos veces las entidades y conservar el `<` suelto. Solo después se retira la copia de `app.js`. |
| 2 | Enlaces de manuales | **NOTA_2:** se mantiene la versión de `main` (4 enlaces nuevos y las 2 URLs corregidas). | Copiar la lista de `main` (17 manuales) a `src/config/doc-links.js` y a la copia de `app.js` de la rama. |
| 3 | `appendFormSubmitCc` | **NOTA_3:** adaptar la función de `src/` para que vuelva a mutar el objeto original. *(Reemplaza la respuesta anterior de ajustar a los llamadores.)* | `src/services/external/formsubmit-notification-adapter.js` agrega `_cc` al mismo `FormData` y lo devuelve. Así sirve a los llamadores de `app.js` (que ignoran el valor) y a los que usen el valor devuelto. Hay que actualizar su prueba. |
| 4 | Nombres globales y `onclick` | **NOTA_4:** mientras `index.html` y `js/tiempos.js` no se refactoricen, se mantiene un puente de compatibilidad que expone explícitamente esas funciones en `window`. | Inventario actual del puente (recontado el 2026-10-15): `index.html` tiene 72 atributos `on*`, de los cuales 58 llaman a 31 funciones distintas. De esas, 28 están en `app.js`, 2 en `js/tiempos.js` (`loadTiemposMetrics` y `toggleTiemposCustomDates`), y `toggleMultiSelectDropdown` no está definida en ningún archivo: es marcado estático que `setupCustomMultiSelect` reemplaza al cargar. `app.js` asigna 35 nombres distintos en `window` (46 asignaciones). `js/tiempos.js` usa `getShiftForDate`, `globalScheduleRows`, `globalScheduleBlocks` y `loadSchedule` de `app.js`, y a su vez `app.js` llama a `loadTiemposMetrics` de `js/tiempos.js`: la dependencia va en los dos sentidos. Ninguno de esos nombres se puede encapsular hasta migrar a quienes los llaman. |
| 5 | Detector de inactividad | Se queda en `app.js` hasta la Fase 3 (respuesta en la sesión). | No se tocan las 6 funciones del grupo C; se migran en bloque con `initIdleDetector()`. |
| 6 | Entradas no válidas (`normalizeName`, `getShiftCategory`, `getDocUrl`) | Se acepta el comportamiento de `src/`, más tolerante (respuesta en la sesión). | Se delega tal cual. |

Pendiente: qué bloques de la sección 10 se ejecutan y en qué orden. No se cambia nada en `app.js` ni en `src/` sin esa confirmación.

## 12. Inicio de la Fase 3: `bootstrap.js` como único punto de entrada

Este informe cierra el inventario de lo que todavía está duplicado y sirve como punto de partida de la Fase 3.

### 12.1 Qué dice la documentación

- **`hoja-de-ruta.md`, Fase 3 "Reorganización de Archivos".** Mover el código desacoplado a la estructura de `propuesta-modular.md` sin cambiar rutas públicas, orden de carga ni contratos. Los pasos clave son:
  - Crear `src/` por lotes, empezando por lo que no tiene efectos.
  - Mover los casos de uso por vertical funcional (auth, horarios y tareas, turnos y cierre, permisos y comunicados, analítica).
  - Reemplazar los `onclick` del HTML por listeners en `ui/views/` y `controllers/`, manteniendo alias mientras existan usos.
  - Retirar `app.js` por segmentos, nunca reescribiéndolo de una vez.

  El criterio de salida exige que la app arranque desde `src/` con los mismos flujos, sin imports circulares, sin cambios accidentales en rutas RTDB ni reglas, y que los puntos de entrada contengan solo composición y compatibilidad.
- **`propuesta-modular.md` §1 y §4.1.** `src/app/bootstrap.js` es el "punto único de arranque de la aplicación". La carga se hace con esbuild a un script clásico (IIFE), que conserva el orden síncrono de arranque y la compatibilidad con los `onclick` (decisión del 2026-09-23).
- **Cabecera de `src/app/bootstrap.js`.** En la Fase 3, esbuild compila `src/app/bootstrap.js` a `riskops.app.js` (global `RiskOpsApp`), `index.html` carga solo ese script, y `app.js` y `riskops.bundle.js` desaparecen. Las responsabilidades de bootstrap son: recibir `db`, `auth`, `window` y `document` por inyección; crear repositorios y controladores; escuchar la autenticación; y, mientras dure la transición, exponer en `window` lo que el HTML llama por `onclick`.
- **Orden de fases.** En `hoja-de-ruta.md`, la Fase 3 es la última fase de cambios estructurales. La Fase 4 (pruebas de regresión y puertas de promoción a `main`) es la verificación de cierre del mismo refactor, y la Fase 5 es el backlog posterior. En la práctica, la Fase 3 es la última fase de construcción y la Fase 4 es su compuerta de salida.

### 12.2 Decisión: al final de la Fase 3 queda solo `bootstrap.js`, con menos de 500 líneas

**Decisión del responsable (2026-10-15):** el archivo que prevalece al final de la Fase 3 es `src/app/bootstrap.js`, como `main` del refactor y con **menos de 500 líneas**. `app.js` desaparece.

Esto **corrige** el paso 9 de la Fase 3 de `hoja-de-ruta.md`, que permitía conservar `app.js` como "entrypoint delgado", y su criterio de salida, que mencionaba "`app.js` y `login.js` contienen solo composición". La cabecera de `bootstrap.js` ya iba en esta dirección. Hay que actualizar la hoja de ruta para que diga lo mismo.

### 12.3 Aclaración: hoy `app.js` y `bootstrap.js` están diseñados para el mismo trabajo, pero solo uno se ejecuta

Los dos archivos tienen la **misma responsabilidad**: arrancar la app, crear los controladores con sus dependencias y exponer en `window` lo que usa el HTML. Por eso son duplicados de diseño. En ejecución, sin embargo, hoy **solo corre `app.js`**: `bootstrap.js` no está en `src/entry.js`, no se compila y `index.html` no lo carga.

| Responsabilidad | `app.js` (activo, 4.491 líneas) | `bootstrap.js` (inactivo, 362 líneas, unas 48 de código; el resto son comentarios y bloques comentados) |
|---|---|---|
| Sesión de arranque | Lee `riskOps_currentUser` de `localStorage` (lo escribe `login.js`), que incluye el rol, y redirige a `login.html` si no existe. | Usa `auth.onAuthStateChanged` y `auth.currentUser`. **Ese objeto de Firebase no trae el rol**, así que `_setupApp` no puede decidir la navegación por rol tal como está. |
| Controladores | Crea unos 20 controladores de `src/` con singletons `__xxx()` e inyecta `database`, `document` y helpers. | Ninguno activo. Todos están comentados, salvo el router. |
| Puente `window` y `onclick` | 35 nombres en `window` más las funciones de nivel superior que usan los 58 `onclick`. | Ninguno activo (todos comentados). |
| Detector de inactividad | Propio (grupo C de la sección 7). | `initIdleDetector` comentado. |
| Arranque por rol | `initApp()` (650 líneas) más `DOMContentLoaded`. | Solo `applyRoleNavigation` y la visibilidad de los botones de pausa. |
| **¿Compila?** | Sí, junto con `riskops.bundle.js`. | **No.** Importa `createFormSubmitAdapter`, que no existe; el módulo solo exporta `appendFormSubmitCc`. esbuild falla: *No matching export … for import "createFormSubmitAdapter"*. |

### 12.4 Qué hace falta para llegar a `bootstrap.js` de menos de 500 líneas

`app.js` tiene hoy 179 funciones (3.712 líneas dentro de funciones). De ellas:

- **92 son envoltorios de 3 líneas o menos.** En bootstrap pasan a ser asignaciones en `window` o listeners y no cuentan como lógica.
- **Las 41 equivalentes y las 6 del grupo B** (secciones 5 y 6) se retiran según la sección 10, con las decisiones de la sección 11.
- **10 funciones "delegan" pero siguen siendo grandes:** suman 2.193 líneas de orquestación y DOM que todavía viven en `app.js`. Las cuatro principales son `initApp` (650), `calcularIndicadores` (620), `handleEndShift` (323) y `renderActiveSessionsDashboard` (246). **Este es el trabajo principal de la Fase 3:** esa lógica pasa a sus controladores (`task-controller`, `kpi-controller`, `shift-controller`, `monitoring-controller`), y en bootstrap solo queda una línea de composición por controlador.
- **El puente de compatibilidad (NOTA_4)** no debe vivir dentro de `bootstrap.js`, o no cabe en 500 líneas. Se propone un módulo propio, `src/app/legacy-bridge.js`, que bootstrap llame una sola vez. Ese módulo se va reduciendo a medida que cada `onclick` pasa a `addEventListener`. Lo mismo aplica a la dependencia en los dos sentidos con `js/tiempos.js`, hasta que ese archivo se migre a `src/`.

### 12.5 Orden propuesto para la Fase 3 (sujeto a tu aprobación)

| Paso | Qué | Resultado verificable |
|---|---|---|
| 3.0 | Reparar `bootstrap.js` para que compile, y decidir de dónde sale la sesión: `riskOps_currentUser` (rol incluido, como hoy) o `onAuthStateChanged` más una lectura de `users/{uid}`. | `esbuild src/app/bootstrap.js` compila; prueba unitaria con autenticación simulada. |
| 3.1 | Retirar duplicados: bloques 1 a 4 de la sección 10 y decisiones de la sección 11 (sanitizador, enlaces de `main`, `appendFormSubmitCc` que muta). | Auditoría con 0 diferencias en el grupo B; suite del laboratorio en verde. |
| 3.2 | Llevar a `src/` lo que `main` tiene y la rama no (IDs estables de tareas, limpieza de huérfanas, enlaces). | Pruebas de `task-catalog` y `task-loaders` con la regla de `main`. |
| 3.3 | Extraer la orquestación de las 10 funciones grandes a sus controladores, una vertical a la vez. | Cada vertical con su prueba de integración del laboratorio y prueba manual. |
| 3.4 | Crear `src/app/legacy-bridge.js` con los 35 nombres de `window` y las 31 funciones de los `onclick`. | La auditoría confirma que cada nombre de `index.html` y `js/tiempos.js` sigue definido. |
| 3.5 | Migrar el detector de inactividad en bloque (grupo C) con `initIdleDetector()`. | Plan manual de inactividad del laboratorio. |
| 3.6 | Cambiar `index.html` para cargar `riskops.app.js` en lugar de `riskops.bundle.js` y `app.js`, ajustar `deploy-pages.yml` y borrar `app.js`. | `bootstrap.js` con menos de 500 líneas; suite completa; `phase1-compatibility-qa`; plan manual completo. |
| Fase 4 | Puertas de promoción de `hoja-de-ruta.md` antes de `main`. | Checklist de la Fase 4 aprobado. |

**Criterio de salida propuesto para la Fase 3:**

- `src/app/bootstrap.js` tiene menos de 500 líneas y es el único punto de entrada.
- `app.js` y `riskops.bundle.js` ya no existen.
- `index.html` carga `riskops.app.js` y, mientras no se migre, `js/tiempos.js`.
- Los flujos de usuario son los mismos.
- La suite y la auditoría están en verde y sin duplicados.

## 13. Cómo repetir la auditoría

```cmd
fase_2\lab\auditoria-duplicados\ejecutar-auditoria.cmd
```

Lee el `app.js`, el `index.html`, el `js\tiempos.js` y el `src\` de la rama actual, y `origin/main:app.js` con git para la comparación de enlaces. Escribe `salida-completa.txt` y los JSON en `salida\`. No modifica ningún archivo de la app. Log de esta ejecución: [`2026-10-15-log-auditoria-duplicados.txt`](2026-10-15-log-auditoria-duplicados.txt).
