# Informe de extracción — Pausas y cierre de turno (corte 2 del paso 6)

## 1. Encabezado

- **Fecha:** 2026-10-04
- **Alcance:** las 8 funciones de la sección "Pausas y cierre de turno" de `plan-maestro-ejecucion.md` §5: `toggleBreakfastBreak()`, `toggleLunchBreak()`, `persistShiftClosureCore()`, `hasRealSetOptions()`, `requiresSpecificSetSelection()`, `restoreEndShiftButton()`, `toggleSplitShiftBreak()` y `handleEndShift()` (`app.js` 3505-3970).
- **Responsable:** Luis Fuentes (ejecución y revisión).
- **Fase de `../03-plan-migracion/hoja-de-ruta.md` que cubre:** Fase 2 ("Desacoplamiento Lógico"), la parte de dominio de turnos; criterio de salida de la Fase 1/2 para estas funciones.
- **Comandos exactos usados** (desde la raíz del repositorio):
  ```
  node fase_2/src/tests/domain/break-transitions.test.mjs
  node fase_2/src/tests/domain/shift-closure-rules.test.mjs
  node fase_2/src/tests/domain/shift-report-builder.test.mjs
  node fase_2/src/tests/domain/firebase-shift-repository.test.mjs
  node fase_2/src/tests/domain/shift-closure-calculations.test.mjs
  ```
  Log completo: [`2026-10-04-log-extraccion-pausas-y-cierre-de-turno.txt`](2026-10-04-log-extraccion-pausas-y-cierre-de-turno.txt).
- **Archivos tocados:** solo nuevos, dentro de `fase_2/src/` y `fase_2/Docs/`. `app.js` solo se leyó (líneas 3495-4025); no se modificó, ni `index.html`, `login.js` ni ninguna regla de Firebase. No se hizo ninguna operación de git.

## 2. Resumen ejecutivo

| Archivo de prueba | Pruebas | Pasaron | Fallaron |
|---|---|---|---|
| `break-transitions.test.mjs` | 15 | 15 | 0 |
| `shift-closure-rules.test.mjs` | 11 | 11 | 0 |
| `shift-report-builder.test.mjs` | 10 | 10 | 0 |
| `firebase-shift-repository.test.mjs` (incluye `end-shift-button.js`) | 9 | 9 | 0 |
| `shift-closure-calculations.test.mjs` (diferencial contra `app.js`) | 8 | 8 | 0 |
| **Total del corte** | **53** | **53** | **0** |

Regresión de las suites anteriores en la misma corrida: `utils/` 74/74, coherencia `breakState`/`timeline` 12/12, `schedule-parser` 11/11. **Total acumulado: 150 pruebas, 150 en verde.**

Estado de las 8 funciones después de este corte:

| Función | Estado nuevo |
|---|---|
| `hasRealSetOptions()` | Hecha + probada |
| `requiresSpecificSetSelection()` | Hecha + probada |
| `restoreEndShiftButton()` | Hecha + probada |
| `persistShiftClosureCore()` | Hecha + probada (con base de datos simulada) |
| `toggleBreakfastBreak()` | **Parcial** — transición de estado extraída y probada; botón, `alert()` y efectos quedan para el controlador |
| `toggleLunchBreak()` | **Parcial** — igual |
| `toggleSplitShiftBreak()` | **Parcial** — igual |
| `handleEndShift()` | **Parcial** — reglas de validación, cálculos y reporte extraídos y probados; la orquestación (`confirm`, `alert`, `FormData`, `fetch` del correo, `signOut`, redirección) queda para el controlador |

## 3. Finalidad de las pruebas

`handleEndShift()` es la función que cierra el turno del Gestor: decide si puede cerrar, calcula penalidades y horas efectivas, arma el reporte que ve el supervisor, lo guarda en Firebase y limpia la sesión. Un error aquí no se nota al instante: un cálculo mal portado produce un reporte con horas o penalidades equivocadas que el supervisor lee como verdaderas, y una escritura parcial puede dejar un reporte guardado sin cerrar la sesión (o al revés). Por eso se priorizó probar (a) que los cálculos coinciden exactamente con los de producción, y (b) que la escritura de cierre es una sola operación atómica.

## 4. Metodología

Se ejecutó en cuatro fases, cada una con su resultado:

**Fase A — Lectura y mapeo.** Se leyó `app.js` 3495-4025 completo. Hallazgo clave: parte de la lógica de `handleEndShift()` **ya estaba migrada** en archivos de fases anteriores, aunque el plan maestro no la asociaba a esta función: `calculateConnectivityPenalty()` y `calculateEffectiveHours()` (`shift-calculator.js`) y `consolidateTimeline()` (`timeline-service.js`). No se reescribieron; se probaron (Fase C).

**Fase B — Extracción de lo que faltaba.** Archivos nuevos, todos puertos 1:1 que separan la lógica pura de los efectos (DOM, Firebase, `alert`):

| Archivo nuevo | Contenido |
|---|---|
| `domain/shifts/break-transitions.js` | `toggleBreak(state, kind, now)`: unifica las tres funciones de pausa (eran idénticas salvo nombres de campo, texto y colores). Devuelve el estado nuevo, si quedó bloqueada, el evento de línea de tiempo y los efectos a ejecutar. No muta el estado. |
| `domain/shifts/shift-closure-rules.js` | `hasRealSetOptions`, `requiresSpecificSetSelection`, `listUnmanagedTasks`, `shouldValidateManagedTasks` (validaciones previas al cierre). |
| `domain/shifts/shift-report-builder.js` | `sumInactivityMinutes`, `sumCleanInactivityMinutes`, `buildBitacoraText`, `buildShiftReportObject` (los 16 campos de `shift_reports`). |
| `services/firebase/firebase-shift-repository.js` | `createShiftRepository({database, serverTimestamp}).persistShiftClosureCore(...)`: escritura atómica multi-ruta, con `database` y `serverTimestamp` inyectados. |
| `ui/components/end-shift-button.js` | `restoreEndShiftButton(button, previousHtml)`. |

**Fase C — Pruebas.** Mismo arnés que el resto de `fase_2/src/tests/`. Dos técnicas nuevas respecto a cortes anteriores: (1) **prueba diferencial**: `shift-closure-calculations.test.mjs` incluye una copia literal del algoritmo original de `app.js` y compara su resultado contra el módulo migrado en 200 combinaciones de penalidad, 200 de horas efectivas y 300 líneas de tiempo aleatorias (generador determinista, siempre los mismos casos); (2) **escenarios asíncronos resueltos antes de las pruebas** (`await` de nivel superior), porque el arnés no espera promesas — el mismo problema que ya se había encontrado en el informe de coherencia.

**Fase D — Verificación.** (1) Corrida de las 5 suites nuevas y de las 3 anteriores (150/150). (2) **Prueba de sensibilidad (mutación):** se alteró a propósito una fórmula (`now - startedAt` invertida) y una regla (dejar de aceptar "No Realizada") en una copia temporal; las pruebas fallaron (6 y 1 fallas respectivamente), confirmando que detectan un cambio real y no pasan en vacío. (3) Se repuso en la copia de trabajo una versión alterada de `validation.test.mjs` (ver sección 6, hallazgo 5) y se confirmó que tu copia no la tenía.

## 5. Detalle por módulo probado

### `break-transitions.js` (15 pruebas) — origen: `toggleBreakfastBreak`, `toggleLunchBreak`, `toggleSplitShiftBreak`

Para cada una de las tres pausas: iniciar (marca activa, guarda la hora de inicio, pide el evento "start" y no pide `updateActivity`), terminar (suma el tiempo, limpia la hora de inicio, pide el evento "end" **y** `updateActivity`), bloqueo si hay otra pausa activa (sin efectos), y acumulación de dos pausas del mismo tipo. Más: no muta el estado, y un tipo desconocido lanza error.

### `shift-closure-rules.js` (11 pruebas) — origen: `hasRealSetOptions`, `requiresSpecificSetSelection`, validación de tareas de `handleEndShift`

Casos de SET ("", "Todos", deshabilitadas, opciones reales), qué roles se validan, estados "Finalizada"/"No Realizada" en cualquier formato (`no_realizada`, `FINALIZADA`), nombres de respaldo (`Tarea` → `entry.name` → id), tareas extra al final y el modo sin catálogo.

### `shift-report-builder.js` (10 pruebas) — origen: bloques de `handleEndShift` 3753-3761, 3831-3842, 3857-3867, 3871-3888

Suma de inactividad con y sin redondeo, mensaje fijo sin eventos, formato "No regresó" para eventos abiertos, y los 16 campos exactos del reporte con sus valores por defecto ("Por Asignar", "N/A", 0).

### `firebase-shift-repository.js` + `end-shift-button.js` (9 pruebas) — origen: `persistShiftClosureCore`, `restoreEndShiftButton`

Una sola escritura con las tres rutas esperadas (`shift_reports/{id}`, `active_sessions/{uid}` = null, `login_logs/{id}/logoutTime`), error sin UID, sin `loginLogId`, sin llave asignada, y error de Firebase sin escrituras parciales. Botón: restaura HTML previo, texto por defecto, y no falla con botón nulo.

### `shift-closure-calculations.test.mjs` (8 pruebas) — piezas ya migradas, ahora probadas

`calculateConnectivityPenalty` y `calculateEffectiveHours` coinciden con `app.js` en 200 combinaciones cada una, más casos fijos calculados a mano (75 min de almuerzo + 20 de desayuno + 10 de inactividad = 30 de penalidad; turno de 8 h con 45 min de pausas y 15 de penalidad = 7.00 h) y el piso en 0. `consolidateTimeline` coincide con el original en 300 líneas de tiempo aleatorias.

## 6. Hallazgos

1. **Lógica ya migrada que el plan no asociaba a `handleEndShift()`.** Tres piezas (`calculateConnectivityPenalty`, `calculateEffectiveHours`, `consolidateTimeline`) estaban en el código nuevo sin prueba. Ahora son equivalentes verificadas, sin cambios.
2. **Característica heredada (no se corrigió):** si se cierra una pausa activa que no tiene hora de inicio guardada (estado restaurado incompleto), la pausa se cierra pero **no suma tiempo** (`if (breakfastStartTime) total += ...`). Hay una prueba que lo fija; si en el futuro falla, hay que revisar el cambio antes de aceptarlo.
3. **Característica heredada: la pausa de turno no descuenta horas efectivas ni penaliza.** `handleEndShift()` resta almuerzo y desayuno y la penalidad, pero **no** `totalSplitShiftTimeMs`; solo lo reporta en `tiempoPausaTurnoMins`. Es el comportamiento real de producción; se conserva y se deja anotado por si es una decisión de negocio que conviene confirmar.
4. **Divergencias menores y deliberadas del puerto:** (a) `app.js` calcula `horaFin` y `timestamp` con un `new Date()`/`Date.now()` nuevo (milisegundos después de `endDate`); el puerto recibe un único `now` — diferencia de milisegundos, sin efecto práctico. (b) `app.js` usa `Date.now()` para cerrar inactividad abierta en el primer cálculo y `endDate` en el segundo; el puerto recibe el límite como parámetro y el controlador debe pasar el mismo valor en ambos para mantener el comportamiento.
5. **Incidente de mi propia copia de trabajo (resuelto, sin efecto en tu equipo):** al correr la regresión, `validation.test.mjs` falló al cargar por una importación `isFiniteNumberXXX`. Era una alteración presente solo en la copia de trabajo de la sesión (origen no determinado; compatible con el resto de una prueba de mutación anterior); se contrastó con tu archivo actual (sin la alteración), se repuso mi copia y las 74 pruebas de `utils/` volvieron a pasar. No se subió nada a tu carpeta por este motivo.
6. **Dependencia que sigue abierta (riesgo ya documentado):** `break-transitions.js` devuelve el evento de línea de tiempo como descriptor (`{type, action}`) y **no** toca `riskOps_timeline` ni `shiftTimeline` a propósito, para no agravar el riesgo de coherencia documentado en `2026-10-03-informe-pruebas-coherencia-breakstate-timeline.md`. La decisión entre la Opción A y B sigue pendiente y debe resolverse antes de conectar nada.

## 7. Log completo

Ver [`2026-10-04-log-extraccion-pausas-y-cierre-de-turno.txt`](2026-10-04-log-extraccion-pausas-y-cierre-de-turno.txt).

## 8. Estado frente al plan y próximos pasos

- **Pendiente para el controlador de turno** (`controllers/shift-controller.js`, aún no escrito), porque es DOM/Firebase/red y no lógica de negocio: la guarda `if (!currentUser) return;`; los `alert()` ("Debes volver del descanso actual primero", validaciones obligatorias del cierre); el estilo de los tres botones de pausa; el `confirm()` inicial; el armado de `FormData` con `appendFormSubmitCc`; el `fetch` del correo a `formsubmit.co` (hoy con la dirección del supervisor escrita en el código); `signOut` y las redirecciones; el orden exacto de operaciones y el manejo de errores del bloque `try/catch` (incluida la rama "turno guardado pero falló la salida"). Ese orden es crítico y debe portarse con su propia prueba al escribir el controlador.
- **Las llamadas a `updateActivity()`** al terminar cada pausa siguen dependiendo de `updateActivity()`, que **no está migrada** (ver `2026-10-03-informe-verificacion-1a1-idle-detector-y-kpis.md`). Este corte la deja expresada como efecto (`effects.updateActivity`), no resuelta.
- `plan-maestro-ejecucion.md` §2, §5 y §9 se actualizaron con estos resultados. Quedan 99 funciones "no iniciada". El siguiente corte natural, siguiendo el orden de secciones, es "Modales, tareas extra, usuarios y permisos" (17 funciones).
- Nada de esto se conecta a producción: según tu indicación, solo se cargará la refactorización terminada completa.
