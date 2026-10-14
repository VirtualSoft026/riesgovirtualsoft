# Informe de pruebas — coherencia `riskOps_breakState` / `riskOps_timeline`

## 1. Encabezado

- **Fecha:** 2026-10-03
- **Alcance:** `fase_2/src/services/storage/local-session-storage.js`, `fase_2/src/domain/shifts/shift-calculator.js` y, de forma complementaria, `fase_2/src/domain/shifts/timeline-service.js`.
- **Responsable:** Luis Fuentes (ejecución y revisión).
- **Fase de `../03-plan-migracion/hoja-de-ruta.md` que cubre:** Fase 2 ("Desacoplamiento Lógico"), paso 4 de sus Pasos ("Encapsular `localStorage` en `local-session-storage.js`... claves literales como `riskOps_currentUser` o `riskOps_timeline`") y recomendación 4 del diagnóstico de 2026-09-22 (`../04-diagnostico-continuacion/diagnostico-integracion-y-evaluacion-plan.md`).
- **Comando exacto usado:**
  ```
  node fase_2/src/tests/domain/break-state-timeline-coherence.test.mjs
  ```
  Log completo: [`2026-10-03-log-pruebas-coherencia-breakstate-timeline.txt`](2026-10-03-log-pruebas-coherencia-breakstate-timeline.txt).

## 2. Resumen ejecutivo

| Archivo | Pruebas | Pasaron | Fallaron |
|---|---|---|---|
| `break-state-timeline-coherence.test.mjs` | 12 | 12 | 0 |

**Resultado global: 12/12, código de salida 0.**

Esto **no** significa que el riesgo esté resuelto. Las 12 pruebas pasan porque, en su mayoría (sección B), están escritas para **confirmar y documentar con evidencia reproducible** el comportamiento actual — que es exactamente el riesgo que `plan-maestro-ejecucion.md` §4 punto 2 pedía caracterizar antes de seguir. El detalle está en la sección 6 de este informe.

## 3. Finalidad de las pruebas

`saveBreakState()` y `loadBreakState()` ya están migradas a `fase_2/src/services/storage/local-session-storage.js` sin ninguna prueba (estado "Migrada, sin prueba" en `plan-maestro-ejecucion.md` §2). Son, además, el área del hallazgo más peligroso del diagnóstico de 2026-09-22: una divergencia silenciosa entre `riskOps_timeline` y el estado de pausas ya causó un incidente real de integración.

El riesgo de negocio concreto: si alguien conecta `local-session-storage.js` a `app.js` sin haber verificado primero cómo se relacionan sus formas de datos, un Gestor con una sesión real en curso (turno empezado, pausas y eventos de inactividad ya registrados por el `app.js` de hoy) podría ver su línea de tiempo del turno **vaciarse en silencio** la primera vez que el código nuevo la cargue — sin ningún error visible, sin ninguna advertencia, y con un reporte de cierre de turno que ya no reflejaría sus pausas reales. Es el mismo patrón de fondo que el incidente de 2026-09-22 (código nuevo y código viejo manejando el mismo estado de formas incompatibles), aplicado a un dato distinto.

Estas pruebas existen para que esa pérdida de datos, si llega a ocurrir, ocurra primero contra una prueba automatizada en un entorno aislado — no contra el turno real de un Gestor.

## 4. Metodología

Mismo arnés que el resto de `fase_2/src/tests/` (`createRunner`/`assert` de `test-harness.mjs`, `node:assert/strict`, sin dependencias nuevas). Como Node no expone `localStorage` por defecto, la suite define un mock mínimo en memoria (`Map`) que se instala en `globalThis.localStorage` antes de cada prueba; ni `local-session-storage.js` ni `shift-calculator.js` se modificaron para hacer esto posible — ambos ya funcionan sobre cualquier objeto que implemente `getItem`/`setItem`/`removeItem`.

Antes de ejecutar, se descargó una copia fresca y se comparó **byte a byte** (`diff`, sin diferencias) contra la copia ya revisada en esta sesión de `local-session-storage.js`, `shift-calculator.js`, `timeline-service.js` y `test-harness.mjs`.

## 5. Detalle por módulo probado

### `fase_2/src/domain/shifts/shift-calculator.js` (`defaultState`, `normalizeState`)

Definen la forma por defecto y la sanitización del objeto de estado de pausas. Hoy los llama únicamente `local-session-storage.js`; cuando se conecte, los llamará el futuro `ShiftService`/`ShiftCalculator` de la Fase 2 (`hoja-de-ruta.md`, Pasos 5). Pruebas A1-A3: forma por defecto completa (los 9 campos de pausas más `shiftTimeline: []`), saneamiento de valores inválidos (booleanos no estrictos, números no finitos, arreglo ausente o corrupto) y copia por valor de `shiftTimeline` (no por referencia, para que mutar el resultado no corrompa el original).

### `fase_2/src/services/storage/local-session-storage.js` (`saveBreakState`, `loadBreakState`)

Encapsulan la llave `riskOps_breakState` de `localStorage`. Hoy no las llama nada en `app.js` (aún no están conectadas); son el destino final del `saveBreakState()`/`loadBreakState()` que hoy vive en `app.js` líneas 315-339. Pruebas A4-A7: *round-trip* fiel guardando y cargando un estado completo con `shiftTimeline`, valor por defecto cuando la llave no existe, valor por defecto (sin lanzar) cuando el JSON guardado está corrupto, y contención del error cuando `localStorage.setItem` lanza (p. ej. cuota excedida).

### Riesgo crítico de coherencia (pruebas B1-B3)

Documentado en detalle en la sección 6. En resumen: se simuló la forma **exacta** que escribe `app.js` hoy (`riskOps_breakState` **sin** `shiftTimeline`, más una llave separada `riskOps_timeline` con eventos reales) y se verificó qué hace `loadBreakState()` con esos datos, y qué le pasa a `riskOps_timeline` cuando se llama a `saveBreakState()`.

### `fase_2/src/domain/shifts/timeline-service.js` (`pushTimelineEvent`) — pruebas C1-C2

No sustituyen la verificación 1:1 pendiente contra el `pushTimelineEvent()` de `app.js` (líneas 388-405), prevista en `plan-maestro-ejecucion.md` §9 paso 3. Son solo *smoke tests*: confirman que abrir un evento cierra cualquier evento previo sin fin, que cerrar un evento busca el último abierto de ese tipo, y que la función no muta el arreglo recibido (devuelve uno nuevo).

## 6. Hallazgos

**Hallazgo único, pero crítico — confirma y agrava la recomendación 4 del diagnóstico de 2026-09-22.**

En producción (`app.js`), la línea de tiempo del turno vive en una llave de `localStorage` **independiente**, `riskOps_timeline` (líneas 349-404). `riskOps_breakState` (líneas 315-339) **nunca** contiene esa línea de tiempo — solo los 9 campos de pausas.

En la migración de Fase 2, `shift-calculator.js` agrega un campo `shiftTimeline` **dentro** del objeto de estado de pausas (`defaultState()`/`normalizeState()`, confirmado en la prueba A1), y `local-session-storage.js` persiste ese objeto completo bajo la **única** llave `riskOps_breakState`. Ningún archivo de `fase_2/src/` lee ni escribe la llave `riskOps_timeline` — ni siquiera `timeline-service.js`, que solo opera sobre un arreglo recibido por parámetro.

Esto es una incompatibilidad de **forma de datos**, no solo de nombres. Las pruebas B1-B3 lo demuestran con datos construidos exactamente como los escribiría `app.js` hoy:

- **B1:** con `riskOps_breakState` (sin `shiftTimeline`) y `riskOps_timeline` (con eventos reales) ambos presentes, `loadBreakState()` devuelve `shiftTimeline: []` — la línea de tiempo real desaparece, sin ningún error ni advertencia.
- **B2:** `saveBreakState()` nunca lee ni escribe `riskOps_timeline`; guardar un estado con su propio `shiftTimeline` deja esa llave exactamente como estaba.
- **B3:** fotografía literal de los 9 campos que escribe `app.js` en `riskOps_breakState` hoy, para que esta suite se note obsoleta (y se actualice) el día en que `app.js` cambie esa forma.

Esto coincide, con evidencia directa, con lo que la propia Fase 2 de `hoja-de-ruta.md` (Pasos, punto 4) ya pedía: *"Ningún controlador nuevo debe conocer claves literales como `riskOps_currentUser` o `riskOps_timeline`"* — hoy, efectivamente, ninguno la conoce, y por eso un dato real se perdería si se conectara tal cual.

**Importante sobre cómo leer el resultado "12/12 pasaron":** las pruebas B1-B3 están escritas para pasar **mientras el riesgo exista** (documentan el comportamiento actual, no una corrección). Si en una corrida futura cualquiera de las tres empieza a **fallar**, es señal de que alguien ya cambió este comportamiento — antes de aceptar ese cambio sin revisarlo, hay que: (1) confirmar que ahora sí hay compatibilidad real con `riskOps_timeline`, (2) actualizar esta suite para que refleje el nuevo comportamiento correcto, y (3) marcar este riesgo como resuelto en `plan-maestro-ejecucion.md` §4.

## 7. Log completo

Ver [`2026-10-03-log-pruebas-coherencia-breakstate-timeline.txt`](2026-10-03-log-pruebas-coherencia-breakstate-timeline.txt).

## 8. Estado frente al criterio de salida y próximos pasos

`plan-maestro-ejecucion.md` §4 punto 2 pedía: *"Debe escribirse — y pasar — antes de que `breakState.js`/`local-session-storage.js` se conecte alguna vez a `app.js`"*. La prueba está escrita y pasa (12/12). **El riesgo queda documentado y caracterizado con evidencia reproducible, no resuelto.** `local-session-storage.js` sigue sin conectarse a `app.js` (correcto: hoy no lo está, y esta sesión no lo cambia).

**Decisión pendiente antes del paso operativo de conexión (sección 6/7 de `plan-maestro-ejecucion.md`)** — dos opciones evaluadas, ninguna aplicada:

- **Opción A (recomendada):** adaptar `local-session-storage.js` para que maneje `riskOps_timeline` como llave separada, igual que `app.js` hoy, y dejar de anidar `shiftTimeline` dentro de `riskOps_breakState`. Mantiene paridad de comportamiento 1:1 con producción y es lo que ya pedía `hoja-de-ruta.md` (Fase 2, Pasos, punto 4) desde antes de esta prueba. No requiere migrar datos de usuarios ya en curso.
- **Opción B:** mantener la forma nueva (`shiftTimeline` anidado) y, al momento de conectar, escribir una migración de datos de una sola vez que lea `riskOps_timeline` real, lo copie dentro de `riskOps_breakState.shiftTimeline`, y decida si retira la llave vieja. Exige probar aparte una migración de datos reales de localStorage de usuarios activos — mayor riesgo, sin ventaja clara sobre la Opción A.

Cualquiera de las dos opciones necesita su propio diseño, su propia prueba (que reemplace o extienda las B1-B3 de esta suite para que pasen por el motivo correcto). Mientras eso no ocurra, `plan-maestro-ejecucion.md` §9 sigue bloqueando el paso 3 (verificación 1:1 de las 8 funciones) solo en lo que dependa de esta área; el resto del paso 3 no depende de esta decisión y puede avanzar en paralelo.
