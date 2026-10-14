# Informe de verificación 1:1 — detector de inactividad y KPIs (`calcularIndicadores`)

## 1. Encabezado

- **Fecha:** 2026-10-03
- **Alcance:** las 8 funciones marcadas "Posible lógica equivalente ya escrita, con otro nombre — verificar 1:1" en `plan-maestro-ejecucion.md` §5: `setIdleDetectorWarning()`, `checkAndStartIdleDetector()`, `requestIdlePermission()`, `startIdleDetectorLogic()`, `applyIdleStateChange()`, `updateActivity()` (todas en `app.js` vs. `fase_2/src/services/browser/idle-detector-adapter.js`) y `calculateShiftDelay()`, `calcularIndicadores()` (en `app.js` vs. `fase_2/src/domain/analytics/time-metrics.js`).
- **Responsable:** Luis Fuentes.
- **Fase de `hoja-de-ruta.md` que cubre:** Fase 1 ("Extracción de Utilidades"), criterio de salida — ninguna de estas 8 funciones puede darse por migrada sin esta verificación.
- **Método:** no es una corrida automatizada; es lectura manual lado a lado de `app.js` (copia descargada el 2026-10-03, ya revisada en la sesión anterior para confirmar que no quedan referencias al incidente del 2026-09-22) contra `idle-detector-adapter.js` y `time-metrics.js`, citando números de línea exactos de ambos lados. No se escribieron pruebas automatizadas nuevas en este informe — ver sección 8 para la prueba pendiente que esta verificación deja identificada.

## 2. Resumen ejecutivo

| Función (`app.js`) | Veredicto |
|---|---|
| `checkAndStartIdleDetector()` | **Equivalente**, confirmado 1:1 |
| `startIdleDetectorLogic()` | **Equivalente** para el resultado observable; 1 divergencia menor confirmada (mejora, no bug) |
| `requestIdlePermission()` | **Equivalente** (cubierta por `requestIdlePermissionManual()` del adaptador); 1 divergencia menor confirmada (texto de advertencia en un caso borde) |
| `setIdleDetectorWarning()` | **Parcial**: la lógica de decisión está repartida correctamente, pero no existe como una sola función — ver hallazgo 1 |
| `calculateShiftDelay()` | **Parcial**: el cálculo numérico es equivalente 1:1 (verificado contra constantes); el renderizado HTML/badge no está migrado |
| `calcularIndicadores()` | **Parcial**: 3 de las 4 piezas que el plan atribuye a esta función sí están extraídas 1:1, con 1 divergencia confirmada y 1 pieza (`getTardiness()`) de origen no confirmado — ver hallazgo 4 |
| `applyIdleStateChange()` | **NO migrada** — corrige la suposición del plan maestro, ver hallazgo 2 |
| `updateActivity()` | **NO migrada** — corrige la suposición del plan maestro, ver hallazgo 3 (la función más sensible, la del incidente de 2026-09-22) |

**Conclusión:** de las 8, 3 están confirmadas como equivalentes (con matices menores ya documentados), 2 son equivalentes solo en parte (cálculo sí, presentación no), y **2 — justamente las dos marcadas "Crítica" relacionadas con el incidente de 2026-09-22 (`applyIdleStateChange`, `updateActivity`) — no tienen ningún código equivalente en `fase_2/src/` hoy.** Ninguna de las 8 puede pasar de "verificar 1:1" a "migrada" todavía; las dos críticas, en particular, necesitan escribirse desde cero antes de que `idle-detector-adapter.js` se conecte a producción.

## 3. Finalidad de esta verificación

El diagnóstico de 2026-09-22 encontró una segunda declaración de `updateActivity()`, inerte, en un intento previo de integración — exactamente el patrón de "código nuevo y código viejo manejando el mismo estado de formas distintas" que ya causó un incidente real. `plan-maestro-ejecucion.md` §4 punto 3 pedía verificar estas 8 funciones **antes de tocar sus originales en `app.js`**, precisamente para no repetir ese patrón. El riesgo de negocio es el mismo que motivó el informe anterior de esta carpeta (coherencia `riskOps_timeline`): conectar un adaptador que parece cubrir el detector de inactividad, sin haber confirmado qué parte de la lógica de negocio (cambios de estado Activo/Inactivo de un Gestor, escritura a Firebase, línea de tiempo) realmente migró, puede dejar esa lógica sin ejecutarse en absoluto — no una pérdida de datos silenciosa como la anterior, sino una **pérdida de comportamiento silenciosa**: el Gestor seguiría usando la app con normalidad, pero sus cambios de estado Activo/Inactivo simplemente dejarían de registrarse.

## 4. Metodología

Lectura manual, lado a lado, con número de línea citado de cada lado. Para `calcularIndicadores()` (642 líneas, `app.js` 5772-6413) se priorizó el bloque que el plan señala como ya parcialmente extraído (líneas 6059-6172, cálculo de penalidad de conectividad e inactividad) en vez de leer la función completa; el resto de la función (construcción de HTML, lectura de Retiros vía MicroStrategy, mutación de `window.kpiTaskLists`) se confirma como no migrado por inspección de encabezados, no línea por línea, porque el propio plan ya lo daba por "No iniciada" y esta verificación no encontró nada que lo contradiga.

## 5. Detalle por función

### `checkAndStartIdleDetector()` — Equivalente

`app.js` 416-438 ↔ `idle-detector-adapter.js` 178-245 (función interna del mismo nombre, invocada por el export `initIdleDetector()`). Mismas tres ramas (sin soporte de `IdleDetector`, permiso ya concedido, permiso pendiente/denegado) con los mismos textos de advertencia, carácter por carácter. El adaptador agrega una comprobación defensiva extra (`navigator.permissions` inexistente) que en `app.js` simplemente cae en el mismo `catch` con el mismo mensaje — mismo resultado observable, camino de código distinto.

### `startIdleDetectorLogic()` — Equivalente (1 divergencia menor, es una mejora)

`app.js` 466-515 ↔ adaptador 118-170. Mismo umbral (`NATIVE_IDLE_THRESHOLD_MS` = 3 min), misma promesa compartida para evitar arranques concurrentes, mismo manejo de `screenState`/`userState`.

**Divergencia confirmada:** en la rama `isIdle` del handler de cambio, el adaptador llama `clearScreenLockTimer()` antes de notificar (línea 104 del adaptador); `app.js` (línea 484-486) **no** cancela el `screenLockTimer` pendiente en esa misma rama. En la práctica esto es inofensivo (si el timer de `app.js` llega a dispararse después, `applyIdleStateChange()` ya encontraría el estado en `Inactivo` y no haría nada), pero es una diferencia de comportamiento real, no cosmética, y el adaptador es estrictamente más correcto que el original. Documentarlo aquí para que, si se compara bit a bit contra `app.js`, no se interprete como un defecto de la migración.

### `requestIdlePermission()` — Equivalente, cubierta por `requestIdlePermissionManual()` del adaptador (1 divergencia menor)

**Importante para no confundir nombres:** `app.js` tiene dos funciones distintas con esta responsabilidad: `requestIdlePermission()` (440-464, la lógica async) y `window.requestIdlePermissionManual` (541-554, un envoltorio de UI que deshabilita un botón y muestra `alert()`). El adaptador exporta una sola función, `requestIdlePermissionManual()` (276-339), cuyo cuerpo corresponde al `requestIdlePermission()` **interno** de `app.js`, no al envoltorio de UI. El envoltorio de UI (deshabilitar botón, `alert()`) **no existe en ningún archivo de `fase_2/src/` todavía** — queda pendiente para la capa de integración/controlador que aún no se ha escrito.

**Divergencia confirmada:** si `window.IdleDetector.requestPermission` no es una función, `app.js` deja que la llamada lance una excepción y cae en su `catch` genérico, mostrando "No fue posible activar el permiso de inactividad...". El adaptador detecta este caso **antes** de llamar (líneas 289-299) y muestra un mensaje distinto: "Tu navegador no permite solicitar el permiso de inactividad...". Es un caso borde (un navegador con la clase `IdleDetector` pero sin ese método estático es, hoy, prácticamente inexistente), pero el texto que vería un usuario real sí cambiaría en ese escenario.

### `setIdleDetectorWarning()` — Parcial (hallazgo 1)

`app.js` 409-414 es una sola función `(visible, message)` que muestra u oculta el banner. El adaptador no tiene ninguna función equivalente de una sola pieza: la ruta "mostrar" se canaliza por `showWarning(message)` (línea 72-74, siempre llama `onWarning(true, message)`), y la ruta "ocultar" se hace con una llamada directa a `onWarning(false)` en el único punto donde el detector arranca con éxito (línea 150). La decisión de **cuándo** mostrar y con qué texto está correctamente portada (ver verificación de los mensajes en `checkAndStartIdleDetector`/`requestIdlePermissionManual` arriba); lo que no existe es una función `setIdleDetectorWarning`-equivalente que la capa de integración pueda llamar directamente — en vez de eso, debe implementar el callback `onWarning(visible, message)` ella misma. No es un defecto: es el patrón de inyección de dependencias que el adaptador eligió a propósito (ver su comentario de diseño, línea 250-251). Se documenta para que quien conecte esta pieza sepa que debe escribir ese callback, no buscar una función ya hecha con este nombre.

### `applyIdleStateChange()` — NO migrada (hallazgo 2, corrige al plan maestro)

`plan-maestro-ejecucion.md` §5 especulaba: *"`handleDetectorChange()` interno parece cubrir esto; verificar"*. Verificado: **no la cubre.** `handleDetectorChange()` (adaptador, líneas 81-111) solo traduce el evento nativo `change` del `IdleDetector` (bloqueado/inactivo/activo) a una llamada `onIdleChange(true|false)` — es la contraparte de la lógica que en `app.js` vive **dentro** del `addEventListener('change', ...)` de `startIdleDetectorLogic()` (líneas 473-495), no de `applyIdleStateChange()`.

`applyIdleStateChange()` (`app.js` 517-537) es una función **distinta**, llamada desde dentro de ese handler, que hace el trabajo de negocio real: comprueba que el usuario sea Gestor y no esté en ninguna pausa, cambia `currentUser.status` entre `'Activo'`/`'Inactivo'`, llama `pushTimelineEvent()`, escribe `database.ref('users/.../status').set(...)`, actualiza la UI y sincroniza la sesión activa a Firebase. **Ninguna línea de este comportamiento existe hoy en `fase_2/src/`.** El adaptador deliberadamente no la llama (ver su propio comentario: *"does not call application functions such as applyIdleStateChange"*), dejando el hueco abierto a propósito para que la integración lo llene — pero hoy nadie lo ha llenado.

### `updateActivity()` — NO migrada (hallazgo 3, el más importante — es la función del incidente de 2026-09-22)

El plan maestro especulaba: *"hay helpers internos nuevos — handleDetectorChange, setDetectorStatus — que podrían cubrir parte de esto"*. Verificado con la misma lectura: **no la cubren.** Ni `handleDetectorChange()` ni `setDetectorStatus()` (que solo guarda `idleDetectorGranted`/`idleDetectorStarted`) tocan `lastLocalActivityTimestamp`, ni escuchan eventos DOM (`mousemove`, `keydown`, `click`, `scroll`, `visibilitychange`, `focus` — `app.js` 588-593), ni cambian `currentUser.status` de vuelta a `'Activo'`, ni llaman `pushTimelineEvent('Inactividad', 'end')`, ni escriben a Firebase, ni sincronizan la sesión activa (`app.js` 564-587). El adaptador sí expone un punto de inyección para esto (`getLastActivityTimestamp`, un callback que el futuro integrador debe implementar — ver `shouldApplyDomIdleFallback()`, que sí está migrada y probada como función pura), pero **la función que efectivamente actualiza ese timestamp y revierte el estado del Gestor a Activo no existe en ningún archivo de `fase_2/src/` hoy.**

Esta es la función exacta que el diagnóstico de 2026-09-22 encontró duplicada e inerte. Confirmar que hoy, en el intento de migración actual, simplemente **no está** — ni correcta ni duplicada — es la diferencia entre "ya se intentó y hay un riesgo de duplicación" (lo que decía el diagnóstico sobre el intento anterior) y "no se ha intentado todavía" (lo que es cierto hoy). Es una posición más segura que la de 2026-09-22, pero sigue siendo un vacío real que debe cerrarse — con su propia prueba de regresión, igual que `riskOps_timeline` — antes de conectar `idle-detector-adapter.js` a `app.js`.

### `calculateShiftDelay()` — Parcial (cálculo sí, presentación no)

`app.js` 5175-5213 ↔ `evaluateReportLateness()` (`time-metrics.js` 201-241). El álgebra de fecha/hora (regex de turno, conversión am/pm, ajuste de ±12h por cruce de día) es idéntica carácter por carácter. Los umbrales de decisión se verificaron contra las constantes reales en `fase_2/src/utils/constants.js`: `OUT_OF_SCHEDULE_MINUTES = 240` (línea 73) y `MIN_REPORTED_TARDINESS_MINUTES = 5` (línea 74) — exactamente los mismos números que `app.js` tiene escritos literalmente (`> 240`, `<= 5`). Las tres ramas de `app.js` ("A tiempo", "Fuera de Horario", "+Nm Tarde") se corresponden 1:1 con las combinaciones de `{isOutOfSchedule, tardinessMins}` que devuelve `evaluateReportLateness()`.

**Lo que falta:** `app.js` devuelve una cadena HTML lista para insertar en el DOM (con colores, `padding`, `title` con la hora esperada formateada). `evaluateReportLateness()` devuelve un objeto de datos puro — correcto para separar cálculo de presentación, pero significa que **el renderizado del badge no está migrado en ningún lado todavía**, y que la hora esperada (`expected`) ni siquiera se devuelve en el objeto — habrá que agregarla si la presentación futura necesita mostrarla en el tooltip como hace `app.js` hoy.

### `calcularIndicadores()` — Parcial, con 1 divergencia confirmada y 1 pieza sin origen confirmado (hallazgo 4)

Verificado el bloque de penalidad de conectividad e inactividad (`app.js` 6059-6172) contra las 3 piezas que el plan atribuye aquí:

- **`parseReportStartDate()`** (`time-metrics.js` 154-188) ↔ reconstrucción de fecha desde `horaInicio` (`app.js` 6068-6080): idéntica, carácter por carácter (mismo `split`, mismo intercambio día/mes si mes > 12, mismo reemplazo de "a.m."/"p.m."). Confirmado 1:1.
- **El cálculo de `isFueraDeHorario`** (`app.js` 6082-6094) ↔ `evaluateReportLateness()`: idéntico — mismo regex, misma conversión horaria, mismo ajuste ±720 min, mismo umbral `> 240`. Confirmado 1:1 (y consistente con la verificación de `calculateShiftDelay()` arriba: ambos puntos de `app.js` usan exactamente el mismo algoritmo, hoy unificado en una sola función en `time-metrics.js`).
- **`sumInactivityMinutesWithinShiftWindow()`** (`time-metrics.js` 111-142) ↔ el bloque de limpieza y suma de inactividad con ventana de 10h (`app.js` 6107-6165): el algoritmo de ventana (recortar a `loginDate + 10h`, ignorar eventos que empiezan después) es idéntico. **Divergencia confirmada:** el `cleanTimeline` previo en `app.js`, en este punto exacto de la función, solo trata `'Desayuno'` y `'Almuerzo'` como pausas que excluyen inactividad superpuesta (línea 6110) — **no** incluye `'Pausa de Turno'`, a diferencia de `consolidateTimeline()` (`timeline-service.js`), cuyo valor por defecto sí incluye los 3 tipos. Si en el futuro se usa `consolidateTimeline()` para reemplazar este bloque, hay que llamarla con `breakTypes: [BREAKFAST, LUNCH]` explícito (sin `SHIFT_BREAK`) para no cambiar el resultado en este punto — usar el valor por defecto de la función cambiaría silenciosamente el cálculo de inactividad de los reportes históricos. También queda sin trasladar el límite superior de `480` minutos que `app.js` aplica *después* de sumar (`Math.min(fallbackMins, 480)`, línea 6165) — no está dentro de `sumInactivityMinutesWithinShiftWindow()`, es responsabilidad del futuro punto de integración.
- **`getTardiness()`** (`time-metrics.js` 28-76): **no se encontró ningún código dentro de `calcularIndicadores()` que use `permisos`/`horaFin`/los tipos de permiso de día completo** (`Vacaciones`, `Falta Justificada`, `Calamidad`) que esta función usa. Una búsqueda en todo `app.js` por esos literales tampoco encontró coincidencias. **No se pudo confirmar de qué función original de `app.js` se extrajo esta pieza** en el tiempo disponible para esta verificación — es posible que venga de `loadControlOperativoData()` o `renderControlOperativoFiltered()` (ambas "No iniciada", relacionadas con KPIs de puntualidad), pero esto queda como pregunta abierta, no como hallazgo confirmado. Quien la use en una integración futura debe ubicar primero su origen real y verificarla contra él, no asumir que ya está verificada por este informe.

El resto de `calcularIndicadores()` (construcción de HTML de bitácora, lectura de KPIs operativos/Retiros, mutación de `window.kpiTaskLists`/`window.kpiBitacoraHTML`, y todo lo que sigue después de la línea 6172 hasta 6413) se confirma como "No iniciada" por inspección de encabezados; no se encontró nada que contradiga esa clasificación del plan maestro.

## 6. Hallazgos (resumen)

1. `setIdleDetectorWarning()` no existe como función única migrada; su lógica está correctamente repartida en `showWarning()` + el callback `onWarning` que la integración debe implementar.
2. **`applyIdleStateChange()` no está migrada.** La suposición del plan maestro de que `handleDetectorChange()` la cubre es incorrecta: ese helper solo traduce el evento nativo, no ejecuta ninguna de las acciones de negocio (Firebase, timeline, UI, sincronización).
3. **`updateActivity()` no está migrada.** Es la función del incidente de 2026-09-22. No hay ningún código en `fase_2/src/` que escuche los eventos DOM de actividad ni que revierta el estado de un Gestor a Activo.
4. En `calcularIndicadores()`, el bloque de limpieza de línea de tiempo usa 2 tipos de pausa (no 3) en este punto exacto — divergencia a respetar explícitamente si se reemplaza por `consolidateTimeline()`. Además, `getTardiness()` no tiene origen confirmado dentro de esta función.
5. Dos divergencias menores, ambas inofensivas en la práctica, documentadas en el detalle de `startIdleDetectorLogic()` y `requestIdlePermission()`.

## 7. Evidencia citada

Esta verificación no generó un log de ejecución (no es una prueba automatizada). La evidencia son los números de línea citados en la sección 5, verificables releyendo directamente `app.js` y los dos archivos de `fase_2/src/` mencionados.

## 8. Estado frente al criterio de salida y próximos pasos

`plan-maestro-ejecucion.md` §4 punto 3 pedía verificar estas 8 funciones **antes de asumir que están migradas y antes de tocar sus originales en `app.js`**. Verificación hecha; no se tocó `app.js`. Resultado: **ninguna de las 8 puede marcarse "migrada" todavía.**

**Pendiente, en orden de urgencia:**

1. Escribir `applyIdleStateChange()` y `updateActivity()` desde cero en `fase_2/src/` (probablemente como parte del futuro `ShiftController`/`app/bootstrap.js` que `hoja-de-ruta.md` Fase 2 ya prevé), con su propia prueba de regresión — mismo patrón que el informe de `riskOps_timeline`: escribir primero la prueba que demuestra qué se perdería si se conectara tal cual hoy.
2. Al escribir la integración de `calcularIndicadores()`, pasar explícitamente `breakTypes: [BREAKFAST, LUNCH]` a `consolidateTimeline()` en el punto que reemplaza las líneas 6107-6165 de `app.js`, para no cambiar el resultado histórico.
3. Confirmar el origen real de `getTardiness()` antes de usarla en cualquier integración.
4. Decidir si la presentación (badge HTML de `calculateShiftDelay()`, HTML de bitácora de `calcularIndicadores()`) se escribe ahora en una capa de UI separada o se deja para cuando se conecte cada flujo — no es bloqueante, pero debe quedar como tarea explícita, no asumirse como ya resuelta por existir el cálculo puro.

No se tocó `app.js`, `index.html` ni `login.js`. No se hizo ningún commit ni push.
