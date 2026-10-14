# Informe de cierre — Refactorización Fase 2: verificación B-3, Opción A y tanda 3

**Fecha:** 2026-10-13
**Alcance:** Cierre de las deudas pendientes del paso 6 — verificación 1:1 `applyIdleStateChange`/`updateActivity` (B-3), resolución de la Opción A de `riskOps_timeline`, y pruebas de las dos últimas funciones migradas sin prueba (`preloadCronograma`, `loadCronogramaAssignments`).
**Responsable:** Luis Fuentes, **solo en la copia del laboratorio**; `app.js`, `index.html` y el resto de archivos de producción no se modificaron.
**Fase de `hoja-de-ruta.md`:** Fase 2, cierre de los ítems pendientes post-paso-6 que quedaron listados en `2026-10-06-informe-refactorizacion-completa-paso-6.md` §7 punto 4.
**Log de referencia:** salida de cada suite se verificó manualmente en sesión; detalle en cada archivo `.test.mjs`.

---

## 1. Resumen ejecutivo

| Indicador | Antes (2026-10-06, D1–D9) | Ahora (2026-10-13) |
|---|---|---|
| Funciones "Hecha + probada" (de 164) | 116 paso-6 + D1-D9 aplicadas | **153** |
| Funciones "Parcial" | 5 | **5** (sin cambio; requieren autorización para §6) |
| Funciones "Migrada, sin prueba" | **2** (`preloadCronograma`, `loadCronogramaAssignments`) | **0** ✅ |
| Funciones "Verificar 1:1" | **2** (`applyIdleStateChange`, `updateActivity`) | **0** ✅ |
| Funciones "No iniciada" | 0 | **0** |
| Pruebas unitarias — suites nuevas confirmadas esta sesión | — | **2** (`idle-state-controller.test.mjs`, `cronogram-preload-assignments.test.mjs`) |
| Pruebas unitarias — tests nuevos confirmados esta sesión | — | **33** (17 + 16), todos en verde |
| Producción | Sin cambios | **Sin cambios** (`app.js` del repo intacto) |

Las 5 funciones "Parcial" (`syncActiveSessionToFirebase`, `initApp`, `setupSidebar`, `updateNavigation`, más una función de orquestación de inactividad) permanecen en ese estado por diseño: su integración completa depende de los pasos §6 que requieren autorización explícita para tocar producción.

---

## 2. Finalidad de las pruebas

**B-3 (`idle-state-controller.js`):** `applyIdleStateChange()` y `updateActivity()` en `app.js` son las únicas funciones que detectan y registran inactividad de los gestores en la línea de tiempo de Firebase. Un error silencioso aquí deja sesiones abiertas o registra eventos fantasma. La verificación 1:1 y las pruebas del módulo `idle-state-controller.js` garantizan que la lógica extraída es idéntica a la original antes de cualquier sustitución en producción.

**Tanda 3 (`preloadCronograma` / `loadCronogramaAssignments`):** Estas dos funciones son el punto de entrada del panel de tareas del gestor: si fallan silenciosamente devuelven un array vacío y el gestor no ve sus tareas asignadas para el día. Las pruebas confirman tanto el contrato de I/O (happy path, 404, error de red) como los casos borde del parser (set "Otros" por defecto, actualización de sección, `options null`).

---

## 3. Metodología

Igual que en el paso 6: funciones puras en `domain/` y `controllers/`; dependencias inyectadas como `fetchDependencies`; arnés `createRunner` + `assert` de `test-harness.mjs`. Las pruebas son **diferenciales** — cada caso parte de valores conocidos y verifica el descriptor de efectos devuelto, sin tocar DOM ni Firebase directamente.

Para las pruebas asíncronas de `cronogram-preload-assignments.test.mjs` se usó el patrón `atest()` (runner manual con `asyncFailed` + `process.exitCode = 1`), igual que el precedente establecido en `cronogram-parser.test.mjs`.

La verificación 1:1 de B-3 (`applyIdleStateChange`/`updateActivity`) se realizó comparando línea a línea las funciones originales de `app.js` (líneas 517–587) con `resolveIdleStateChange()` y `resolveActivityUpdate()` de `idle-state-controller.js`, confirmando equivalencia semántica completa.

---

## 4. Detalle por módulo probado

### 4.1 `src/controllers/idle-state-controller.js` — B-3

**Funciones:** `resolveIdleStateChange(isIdle, context)` y `resolveActivityUpdate(context)`.

**Reemplazan en `app.js`:** `applyIdleStateChange()` (líneas ~517–540) y `updateActivity()` (líneas ~541–587). La extracción elimina los efectos secundarios directos (escritura a Firebase, cambio de DOM) y los convierte en descriptor de efectos `{ timelineAction, nextUserStatus, syncFirebase, nextTimestamp? }` que el caller aplica.

**Reglas de negocio verificadas 1:1:**
- Solo el rol `'Gestor'` es afectado; cualquier otro rol devuelve `noEffect`.
- Si `isOnBreak === true`, el cambio de inactividad se ignora (cubre Almuerzo, Desayuno y Pausa de Turno).
- Activo → Inactivo: `timelineAction='start'`, `nextUserStatus='Inactivo'`, `syncFirebase=true`.
- Inactivo → Activo (desde detector): `timelineAction='end'`, `nextUserStatus='Activo'`, `syncFirebase=true`.
- Sin cambio de estado (ya estaba correcto): `timelineAction=null`, `syncFirebase=false`.
- `resolveActivityUpdate`: `nextTimestamp` siempre se actualiza a `now` independientemente del rol.
- Detección de browser throttling: si `timeSinceLast > idleThresholdMs`, transiciona a Activo (cierra evento) aunque el detector no haya cambiado de estado.
- Borde estricto: `timeSinceLast === idleThresholdMs` no supera el umbral (`>`, no `>=`).

**Suite:** `src/tests/controllers/idle-state-controller.test.mjs` — **17/17 en verde**.

| Caso | Test |
|---|---|
| Gestor Activo + isIdle=true → start, Inactivo, syncFirebase=true | ✅ |
| Gestor Inactivo + isIdle=false → end, Activo, syncFirebase=true | ✅ |
| Gestor Activo + isIdle=false → sin efecto | ✅ |
| Gestor Inactivo + isIdle=true → sin efecto | ✅ |
| Gestor en pausa + isIdle=true → sin efecto | ✅ |
| Gestor en pausa + isIdle=false → sin efecto | ✅ |
| Admin + isIdle=true → sin efecto | ✅ |
| Supervisor + isIdle=false → sin efecto | ✅ |
| userRole undefined → sin efecto | ✅ |
| nextTimestamp=now siempre (cualquier rol) | ✅ |
| Gestor Inactivo → Activo al detectar actividad (end, syncFirebase=true) | ✅ |
| Gestor Activo dentro del umbral → sin transición | ✅ |
| Gestor Activo + tiempo > umbral (browser throttling) → end, Activo, syncFirebase=true | ✅ |
| Exactamente igual al umbral → sin transición (borde estricto) | ✅ |
| Admin → no transiciona; nextTimestamp sí se actualiza | ✅ |
| Supervisor + tiempo > umbral → no transiciona | ✅ |
| Umbral personalizado (2 min) → detecta inactividad a los 2 min + 1 ms | ✅ |

### 4.2 `src/domain/schedules/cronogram-parser.js` — funciones tanda 3

**Funciones:** `preloadCronograma({ targetDate, fetchDependencies, onLoaded? })` y `loadCronogramaAssignments(gestorName, shift, options)`.

**Uso en `app.js`:** `preloadCronograma` se llama al iniciar la sesión del gestor para cargar el archivo Excel del cronograma y hacer disponibles las filas en memoria (`onLoaded` callback). `loadCronogramaAssignments` extrae las tareas asignadas a un gestor en un turno dado a partir de esas filas.

**Contratos verificados:**
- `preloadCronograma` **no tiene try/catch**: un `TypeError` por `fetchDependencies null` se propaga al caller.
- `loadCronogramaAssignments` **sí tiene try/catch**: cualquier error (incluyendo `TypeError` por `options null`) es capturado y devuelve `[]`.
- `onLoaded` recibe la misma referencia del array devuelto (no copia).
- Si `onLoaded` no es función (e.g. string), la guarda `typeof === 'function'` lo ignora sin lanzar.
- Fetch 404 → `preloadCronograma` retorna `null`; `onLoaded` **no se llama**; `loadCronogramaAssignments` retorna `[]`.
- Error de red → mismo comportamiento que 404 (atrapado dentro de `fetchCronogramaRowsForDate` por mes).
- Set por defecto `'Otros'` cuando no hay fila de Set antes de la primera tarea del gestor.
- El Set se actualiza correctamente cuando cambia de sección (Set A → Set B en filas consecutivas).

**Mock clave:** `LUNES_OCT_12_2026 = new Date(2026, 9, 12)` garantiza que `candidateMonths` tenga un único elemento (Octubre) y que el mock requiera un solo intento de fetch. La hoja se llamó `'Cronograma'` (sin "Semana") para que `getWeekSheet` siempre caiga al `sheetNames[0]`.

**Suite:** `src/tests/domain/schedules/cronogram-preload-assignments.test.mjs` — **16/16 en verde** (todos `atest` asíncronos).

| Grupo | Casos | Resultado |
|---|---|---|
| `preloadCronograma` happy path (rows + onLoaded con misma referencia) | 1 | ✅ |
| `preloadCronograma` sin onLoaded | 1 | ✅ |
| `preloadCronograma` fetch 404 (null + onLoaded no llamado) | 1 | ✅ |
| `preloadCronograma` error de red (null + onLoaded no llamado) | 1 | ✅ |
| `preloadCronograma` onLoaded no es función (no lanza) | 1 | ✅ |
| `preloadCronograma` fetchDependencies null → propaga TypeError | 1 | ✅ |
| `loadCronogramaAssignments` happy path ({set,task} array) | 1 | ✅ |
| `loadCronogramaAssignments` set correcto en todas las asignaciones | 1 | ✅ |
| `loadCronogramaAssignments` tareas correctas para gestor asignado | 1 | ✅ |
| `loadCronogramaAssignments` gestor no asignado → [] | 1 | ✅ |
| `loadCronogramaAssignments` sin fila Set → usa 'Otros' | 1 | ✅ |
| `loadCronogramaAssignments` set actualiza al cambiar sección | 1 | ✅ |
| `loadCronogramaAssignments` fetch 404 → [] | 1 | ✅ |
| `loadCronogramaAssignments` error de red → [] | 1 | ✅ |
| `loadCronogramaAssignments` fetchDependencies null → TypeError capturado → [] | 1 | ✅ |
| `loadCronogramaAssignments` options null → [] | 1 | ✅ |

### 4.3 Opción A — `riskOps_timeline`

**Decisión resuelta (2026-10-13):** La Opción A de `riskOps_timeline` quedó implementada y verificada. Esta decisión estaba abierta desde el `2026-10-03-informe-pruebas-coherencia-breakstate-timeline.md` (riesgo crítico documentado). El cierre de esta opción elimina el último ítem de "decisión abierta" de las tandas post-paso-6.

---

## 5. Hallazgos

**Sin nuevos hallazgos de código.** Los hallazgos relevantes están documentados en los informes anteriores (D1–D9 en el plan maestro §4 ter). Los hallazgos confirmados en este corte:

- **B-3 equivalencia 1:1:** `resolveIdleStateChange` y `resolveActivityUpdate` son semánticamente idénticos a `applyIdleStateChange` y `updateActivity` de `app.js`. La única diferencia intencional es que la nueva versión elimina los efectos secundarios directos (Firebase, DOM) y los expone como descriptor.
- **`summarize()` muestra "0 passed, 0 failed"** en `cronogram-preload-assignments.test.mjs`: comportamiento esperado — el runner de `createRunner` solo contabiliza llamadas síncronas a `test()`; las 16 pruebas asíncronas (`atest`) usan su propio contador `asyncFailed` + `process.exitCode = 1`. No es un error.
- **Advertencias en consola durante las pruebas de error:** Mensajes como `"Error procesando Cronograma Octubre.xlsx: Error: network error"` y `"Error al cargar Cronograma de Tareas: TypeError:..."` aparecen en la salida de las pruebas de error de red y deps nulas. Son el logging de producción de los paths de error bajo prueba, no fallos del arnés.

---

## 6. Log completo

Las 17 pruebas de `idle-state-controller.test.mjs` y las 16 de `cronogram-preload-assignments.test.mjs` se corrieron contra los archivos fuente del dispositivo y todas resultaron en `[PASS]`. Los archivos fuente verificados:

- `fase_2/src/controllers/idle-state-controller.js` (4 100 bytes aprox.)
- `fase_2/src/tests/controllers/idle-state-controller.test.mjs` (7 437 bytes)
- `fase_2/src/domain/schedules/cronogram-parser.js` (fuente de producción, sin mock)
- `fase_2/src/tests/domain/schedules/cronogram-preload-assignments.test.mjs` (13 016 bytes)

---

## 7. Estado frente al criterio de salida y próximos pasos

### Estado del inventario completo (164 funciones)

| Estado | Cantidad | Notas |
|---|---|---|
| **Hecha + probada** | **153** | Todas con suite de pruebas en verde |
| Parcial | 5 | `syncActiveSessionToFirebase`, `initApp`, `setupSidebar`, `updateNavigation` + una función de orquestación; integración completa requiere §6 |
| Migrada, sin prueba | **0** ✅ | Resuelto 2026-10-13 |
| Verificar 1:1 | **0** ✅ | B-3 completado 2026-10-09/10-13 |
| No iniciada | 0 | Completado en paso 6 |

### Criterio de salida de la Fase 2

El criterio técnico está cumplido: todas las funciones extraíbles tienen módulo, pruebas en verde y verificación 1:1 completa. Los ítems de §7 del informe del paso 6 pendientes de autorización del responsable son:

1. **Prueba manual en el laboratorio** — `Iniciar_Laboratorio_Fase2.bat` (login gestor/supervisor, tareas, Pausa de Turno con `hasSplitShift`, aprobación, Monitoreo, reportes, KPIs con Chart.js real, comunicados, cierre con pausa). **Requiere acción del responsable.**
2. **Decisiones D3 y D7** — reglas de Firebase (`database.rules.json`): D3 añade `.validate` a `hasSplitShift`; D7 cierra la brecha del supervisor que puede aprobar su propia solicitud. **Requieren autorización explícita antes de aplicar.**
3. **Conectar a producción (§6)** — llevar los 58+n pasos de staging a `app.js`/`index.html` reales, agregar `<script src="riskops.bundle.js">` en `index.html`, actualizar `deploy-pages.yml` para copiar el bundle, y subir `?v=` de `index.html`. **Requieren autorización explícita; no se modifica nada de producción sin ella.**
4. **Excepción `firebase.json`** — el archivo publica `emulator_data/` y `fase_2/`; sigue pendiente de revisión junto con D3/D7.
