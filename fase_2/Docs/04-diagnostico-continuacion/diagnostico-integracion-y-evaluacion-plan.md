# Diagnóstico de Integración Fase 2 y Evaluación del Plan de Migración

**Fecha:** 2026-09-22
**Alcance:** (1) hallazgos sobre el estado actual, sin commitear, de `app.js` e `index.html`; (2) diagnóstico nuevo de todo el proyecto, más allá de lo ya documentado en `Docs/01-04`; (3) evaluación de la efectividad del plan de migración (`diagnostico-monolito.md`, `arquitectura-actual.md`, `propuesta-modular.md`, `hoja-de-ruta.md`) frente al objetivo de que el resultado final sea óptimo, escalable y modificable.
**Método:** inspección directa de archivos locales del repositorio. Sin búsquedas web, sin ejecución de la suite de QA en esta sesión, sin aplicar ningún cambio de código (regla 0 de `PROMPT_CONTINUACION_FASE2.md`).

> **Nota (2026-10-03):** este diagnóstico es un registro histórico del 2026-09-22. En esa fecha, `src/` sí vivía bajo `.github/fase_2/src/`, tal como describe el documento. El 2026-10-03 esa carpeta se movió a `fase_2/` (fuera de `.github/`, en la raíz del repositorio) para destrabar la escritura remota de archivos. Las menciones a `.github/fase_2/...` de aquí en adelante son correctas **para la fecha en que se escribieron** y no se reescriben retroactivamente; para la ubicación actual, ver `hoja-de-ruta.md` sección "5.1" y `propuesta-modular.md` §4.2.

---

## 1. Resumen ejecutivo

- El working tree tiene cambios sin commitear en `app.js` e `index.html` que **rompen la aplicación en producción tal como están** (script clásico con sintaxis `import`, más un `ReferenceError` a nivel de módulo). Se diagnostica en detalle en la sección 2. No se aplicó ningún fix; la decisión tomada en sesión fue revertir ambos archivos al último commit (`04ee93d`).
- Más allá de ese incidente puntual, el diagnóstico general del proyecto (sección 3) muestra una base de código con deuda técnica real pero **bien entendida y bien instrumentada**: existe un arnés de QA automatizado no trivial (`.github/qa-infra`) y un pipeline de despliegue con allowlist explícita y verificación de artefacto público. Esto es una fortaleza que el plan de Fase 2 puede y debe aprovechar más de lo que lo hace hoy.
- La evaluación del plan (sección 4) concluye que el diagnóstico y la arquitectura propuesta (`propuesta-modular.md`) son sólidos conceptualmente, pero **tienen una brecha crítica no resuelta**: no especifican cómo los módulos ES (`import`/`export`) van a cargar en un sitio sin build step, ni dónde debe vivir físicamente `src/` para que el pipeline de despliegue existente lo publique. El intento de integración encontrado en `app.js` (sección 2) es exactamente el síntoma de esa brecha — alguien intentó resolverla de manera improvisada y rompió la app.
- Se listan recomendaciones concretas (sección 4.3) para cerrar esa brecha antes de continuar extrayendo más código, de forma que el esfuerzo ya invertido en `.github/fase_2/src/` no se vuelva a perder.

---

## 2. Hallazgos: estado roto de `app.js` / `index.html` (sin commitear)

Confirmado con `git diff`: 246 líneas de diff en `app.js` (211 inserciones, 41 borrados), 6 líneas en `index.html`. No fue producido en esta sesión; ya estaba así en el working tree al iniciar.

### A. Bloqueante — el script que realmente carga la app no puede parsear

El `<script>` activo al final de `index.html` (línea 1473) es un script clásico:

```html
<script src="app.js?v=20260826_v1"></script>
```

`app.js` ahora empieza con `import { ... } from './.github/fase_2/src/...'` en su primera línea. `import` a nivel de módulo solo es válido dentro de un `<script type="module">`. En un script clásico esto es un `SyntaxError` fatal: **ninguna línea de `app.js` se ejecuta**, la aplicación completa queda sin arrancar.

### B. Aun arreglando el `type="module"`, hay un segundo crash inmediato

En las líneas 12-14 del `app.js` modificado quedó código huérfano a nivel de módulo:

```js
const formDataWithCc = appendFormSubmitCc(formData);
```

`formData` no existe en ese scope — es una variable local de un handler que vive ~3500 líneas más abajo. Es un `ReferenceError` que se dispara al evaluar el módulo, antes de que corra `initApp()` o cualquier otra cosa.

### C. El sitio real de uso también quedó roto

Dentro del handler real del formulario de permisos (antes línea ~3565), la edición comentó tanto la declaración como el uso:

```js
// const formData = new FormData(pForm);
// appendFormSubmitCc(formData);
```

pero el código siguiente sigue usando `formData.get("Tipo_Permiso")`, `formData.get("Especificacion_Otro")`, etc. → otro `ReferenceError`, esta vez al intentar enviar una solicitud de permiso.

### D. Problema arquitectónico de fondo: `type="module"` rompe los handlers inline del HTML

Aun resolviendo A/B/C, convertir `app.js` en módulo ES tiene una consecuencia que el intento de integración no contempló: **las declaraciones de nivel superior de un módulo no quedan colgadas de `window`**. `diagnostico-monolito.md` (sección "Contratos implícitos entre HTML, JavaScript y Firebase") ya documenta que `index.html` depende masivamente de atributos `onclick="funcion(...)"` sobre funciones globales implícitas. Si `app.js` pasa a ser `type="module"`, todos esos handlers inline dejan de funcionar (`funcion is not defined`) salvo que cada función usada desde HTML se exporte explícitamente a `window` — cientos de asignaciones, no unas pocas. Esto no es un ajuste menor: es exactamente el tipo de migración cuidadosa que `hoja-de-ruta.md` reserva para la Fase 3 ("Centralizar selectores... mantener temporalmente aliases para IDs que ya estén referenciados"), no algo para resolver de paso con un cambio de atributo.

### E. Confirmado con evidencia directa: el pipeline de despliegue nunca publicaría `.github/fase_2/src/`

`.github/workflows/deploy-pages.yml` no usa "copiar todo excepto excluir"; usa una **allowlist explícita**. Copia únicamente un conjunto fijo de archivos de raíz (`index.html`, `login.html`, `app.js`, `login.js`, `styles.css`, `login.css`, `firebase-config.js`, `CNAME`, `.nojekyll`, dos JSON puntuales) más las carpetas `js/` y `assets/`, y luego valida con un script Python que **prohíbe explícitamente cualquier ruta que contenga el segmento `.github`** (`forbidden_parts = {".git", ".github", "scratch", "tests", ...}`). Es decir: **aunque la integración de `app.js` funcionara perfectamente en local, en producción los `import` a `./.github/fase_2/src/...` darían 404**, porque esos archivos nunca llegan a `_site/`. Esto no es una sospecha ("probablemente excluido por Jekyll") — está verificado leyendo el propio workflow.

### F. Regresión silenciosa de datos — la más peligrosa de las siete, porque no truena, corrompe en silencio

`pushTimelineEvent()` fue reescrito para usar `applyTimelineEvent` de `breakState.js`, que persiste el timeline **solo** dentro de `localStorage['riskOps_breakState'].shiftTimeline`. Pero el resto de `app.js` sigue leyendo/escribiendo la clave separada `localStorage['riskOps_timeline']` directamente en varios puntos (línea 519-521 al restaurar en cada carga de página, línea 549, y un parche histórico de un solo uso en 862-873). Como la restauración al cargar la página sobreescribe incondicionalmente `breakState.shiftTimeline` con lo que encuentre en `riskOps_timeline` (que ya nadie actualiza), **cada recarga de página durante un turno activo puede descartar silenciosamente eventos de pausa/inactividad acumulados**, corrompiendo los totales que después calcula `handleEndShift()` — la función que el propio `diagnostico-monolito.md` señala como la más crítica del sistema.

### G. Cosmético — código muerto, no rompe nada

Queda una segunda declaración `function updateActivity(){}` (stub nuevo e inerte) que JavaScript ignora silenciosamente porque la declaración real más abajo (línea 728) la sobreescribe al evaluar el módulo. No es un bug funcional, pero conviene eliminarla si se retoma este camino de integración, para no confundir a quien lea el archivo.

**Decisión tomada en sesión:** revertir `app.js` e `index.html` al commit `04ee93d` (`git checkout -- app.js index.html`), pendiente de confirmación final antes de ejecutarse, por ser una acción destructiva sobre archivos de producción.

---

## 3. Diagnóstico nuevo de todo el proyecto

### 3.1 Frontend estático (`app.js`, `index.html`, `login.js`, `login.html`, `js/tiempos.js`, `styles.css`)

- Confirmado: `login.js` y `login.html` **no** tienen el mismo problema de imports — están limpios. El incidente de la sección 2 está aislado a `app.js`/`index.html`.
- `js/tiempos.js` tiene 587 líneas; según `arquitectura-actual.md` depende de símbolos globales de `app.js` (acoplamiento ya documentado, no se reexploró en detalle aquí).
- No hay ningún `package.json` en la raíz del repositorio: el frontend es 100% script plano sin build step, tal como documenta `README.md` ("sin framework ni build step"). Esto es una restricción de diseño deliberada, no un descuido — cualquier estrategia de modularización tiene que respetarla o proponer explícitamente cambiarla.

### 3.2 Backend / Firebase (`database.rules.json`, `firebase.json`, `firebase-config.js`)

- `database.rules.json` es la fuente real de autorización (confirmado leyendo las reglas de `users`: valida rol, aprobación y protege campos sensibles como `role`/`approved`/`email` con `.validate` explícitos por campo). Coincide con lo documentado: "el frontend no debe asumirse como capa de seguridad".
- `firebase.json` tiene su propia sección `hosting.ignore` con `"**/.*"` (excluye cualquier ruta con punto) — coherente con el hallazgo E de la sección 2, aunque el despliegue real de producción es vía GitHub Pages (workflow `deploy-pages.yml`), no vía `firebase deploy` de hosting.

### 3.3 Automatización de datos (`motor_operativo.py`, `backend.py`, `build_docs.py`, `build_retiros.py`)

Ya diagnosticados en profundidad por `diagnostico-monolito.md` (paginación MicroStrategy, autenticación superficial de `backend.py` por presencia de token, efectos secundarios al importar `motor_operativo.py`). No se re-exploró código aquí; el diagnóstico existente se considera vigente y preciso.

### 3.4 Calidad / QA — activo importante que el plan subestima

`.github/qa-infra/` no es un esqueleto: tiene `package.json` propio con dependencias reales (`@firebase/rules-unit-testing`, `firebase-admin`, `firebase-tools`) y **9 archivos de prueba/verificación ya escritos**, no solo planeados:

| Archivo | Tamaño | Propósito aparente |
|---|---|---|
| `qa_matrix.js` | 42.7 KB | Matriz de casos QA contra el emulador |
| `frontend_security_smoke.js` | 79.3 KB | Smoke test de seguridad frontend |
| `inactivity_timeline.test.js` | 13.9 KB | Prueba de consolidación de timeline/inactividad |
| `end_shift_smoke.js` | 8.0 KB | Smoke test de cierre de turno |
| `supervisor_comunicados_rules.spec.js` | 9.1 KB | Reglas de comunicados por rol |
| `cronograma_cross_month.test.js` | 4.3 KB | Cronograma cruzando meses |
| `migration_rehearsal.js` / `.test.js` | 5.9 / 2.9 KB | Ensayo de migración de datos UID |
| `verify_frontend_contract.js` | 5.9 KB | Verificación de contrato frontend |
| `network_guard.cjs` | 1.8 KB | Guardia de red (probablemente evita llamadas no autorizadas en pruebas) |

Los scripts de `package.json` (`check`, `qa`, `test:supervisor-comunicados-rules`) ya están alineados con lo que `hoja-de-ruta.md` pide ejecutar como línea base. **Esto es una ventaja competitiva real para la Fase 2**: la mayoría de los proyectos que migran un monolito no tienen ya una matriz de regresión escrita. El plan actual la menciona como prerrequisito, pero no la aprovecha activamente (por ejemplo, no propone extender `inactivity_timeline.test.js` o `end_shift_smoke.js` para cubrir específicamente el hallazgo F de la sección 2).

### 3.5 CI/CD (`.github/workflows/`)

- `phase1-compatibility-qa.yml`: corre en cada PR contra `main`, ejecuta el arnés de `.github/qa-infra` contra el emulador Firebase. Es la puerta de calidad real.
- `deploy-pages.yml`: solo se dispara con `push`/`workflow_dispatch` a `main`, **no** en la rama `feature/Fase_2`. Esto significa que el estado roto descrito en la sección 2, aunque se hubiera commiteado en esta rama, **no se habría desplegado automáticamente** — hay una red de seguridad real por la separación de ramas. Sí se habría corrido la QA de compatibilidad si se hubiera abierto un PR, lo cual probablemente habría fallado y detectado el problema antes de llegar a `main`. Esto matiza (sin eliminar) la urgencia del hallazgo de la sección 2: es grave para tu working tree local, pero no hay evidencia de que haya llegado a estar en riesgo la producción real.
- Como se documentó en el hallazgo E: el paso `build-public-artifact` de `deploy-pages.yml` usa una allowlist de archivos codificada a mano, con validación posterior que prohíbe explícitamente `.github` en cualquier ruta del artefacto público.

### 3.6 Higiene del repositorio

- `.gitignore` está bien construido: cubre secretos, artefactos Python/Node, logs, dumps, archivos temporales, caché de Firebase/emulador, y explícitamente excluye del repo los XLSX operativos con PII (`Cronograma de Tareas/*.xlsx`, `Horario/*.xlsx`, etc.) y `uid_mapping.json`. Los archivos `temp_app_3277706.js` y `temp_app_9eb3458.js` presentes en el directorio de trabajo (nombrados según hashes de commits reales: `3277706` = "fix: correct idle tracking and sanitize documentation (#10)", `9eb3458` = "Feature/fase 2 (#9)") **no están trackeados por git** — son backups locales manuales, coherente con buena práctica, no un descuido.
- No hay `package.json` en la raíz — coherente con el punto 3.1, pero significa que cualquier herramienta de build/lint/format que se quiera introducir en Fase 2 (por ejemplo, para producir un bundle de `src/`) tiene que decidirse explícitamente; hoy no existe ningún punto de entrada npm a nivel de proyecto completo, solo dentro de `.github/qa-infra`.
- Documentación dispersa en tres lugares con distinto nivel de actualización: `README.md` (dice Fase 2 "Sin iniciar"), `release-docs/` (historial de Fase 1, cerrado), y `.github/fase_2/Docs/` (el diagnóstico y plan detallado de Fase 2, más avanzado y específico que lo que refleja el README). **El README no se ha actualizado para reflejar que Fase 2 ya tiene diagnóstico, arquitectura propuesta y ~8 archivos con código real** — riesgo menor de que alguien confíe en el README y asuma que no hay nada empezado.

### 3.7 Estado real de la migración Fase 2 (`.github/fase_2/src/`)

Verificado de nuevo en esta sesión (no solo heredado del diagnóstico anterior): de 46 archivos bajo `src/`, **38 siguen en 0 bytes** y 8 tienen contenido real. Se leyeron los 8 completos en esta sesión para poder proponer su reubicación con precisión (ver detalle de mapeo función-por-función más abajo, sección 4.3). Confirmado también, mediante `grep`, que **ninguno de esos 8 archivos es importado desde ningún otro lugar del proyecto salvo el propio `app.js`** (ni desde `js/tiempos.js`, ni desde `.github/qa-infra`, ni desde `login.js`) — el acoplamiento nuevo está contenido a un solo punto de entrada, lo cual simplifica el revert de la sección 2.

---

## 4. Evaluación de la efectividad del plan de migración

### 4.1 Fortalezas del plan actual

- **Diagnóstico preciso y verificable.** Se contrastó `diagnostico-monolito.md` contra el código real de `app.js` durante esta sesión (por ejemplo, la descripción de `handleEndShift()` y su dependencia de `shiftTimeline`/`localStorage` coincide exactamente con lo encontrado en el hallazgo F). No es un documento genérico — refleja el código real.
- **Principios de arquitectura correctos para este tipo de aplicación**: inversión de dependencias vía contratos, separación `domain`/`services`/`controllers`/`ui`, prohibición de que `domain/` conozca DOM/Firebase/SDKs externos. Es el diseño adecuado para reducir el acoplamiento que el propio diagnóstico describe.
- **Hoja de ruta con salvaguardas explícitas y migración incremental** (fachada de compatibilidad, comparación lado a lado, no mezclar refactor con cambios de negocio). Es un plan de riesgo bajo *en el papel*.
- **Ya aprovecha (aunque de forma pasiva) un arnés de QA real**, como se documentó en 3.4.

### 4.2 Brechas del plan — lo que permitió que ocurriera el incidente de la sección 2

1. **Brecha crítica — no resuelta en ningún documento: ¿cómo cargan los módulos ES sin build step?**
   `propuesta-modular.md` usa `export function` / `import` en todos los ejemplos, asumiendo módulos ES nativos del navegador. Pero ni ese documento ni `hoja-de-ruta.md` dicen explícitamente:
   - Que el `<script>` que cargue el punto de entrada (`app.js` o `src/app/bootstrap.js`) debe declararse `type="module"`.
   - Cómo reconciliar eso con el hallazgo D (los handlers inline `onclick` dependen de globals de `window`, que un módulo no crea automáticamente).
   - Si la alternativa es introducir un bundler (rompiendo la restricción "sin build step" documentada en `README.md` y `arquitectura-actual.md`) o resolverlo con módulos nativos + exportación manual a `window`.

   El intento de integración diagnosticado en la sección 2 es la evidencia directa de esta brecha: alguien (una sesión anterior sin este contexto, o edición manual) intentó resolverla sobre la marcha, sin documentarlo como decisión de diseño, y el resultado rompió la aplicación de cuatro maneras distintas (A, B, C, D).

2. **Brecha crítica — no resuelta: ¿dónde vive físicamente `src/` para que el pipeline de despliegue lo publique?**
   `propuesta-modular.md` dibuja el árbol como `src/app/...`, `src/domain/...`, es decir, en la **raíz** del repositorio. La sesión anterior que empezó a crear los archivos lo hizo bajo `.github/fase_2/src/...` — razonablemente, para mantenerlo fuera de producción mientras es trabajo en progreso (coincide con el espíritu de la regla 2 de `PROMPT_CONTINUACION_FASE2.md`). Pero **ningún documento del plan dice en qué momento y cómo ese árbol debe moverse a la raíz**, ni que `deploy-pages.yml` necesitará actualizar su allowlist (`ALLOWED_ROOT_FILES` y el set `allowed` del script Python) para incluir `src/**` cuando llegue ese momento. Sin ese paso explícito, un día de Fase 3 alguien va a mover archivos a `src/` en la raíz, mergear a `main`, y el despliegue **fallará por la validación estricta del workflow** (que hoy solo conoce una lista fija de archivos) — o peor, pasará silenciosamente si alguien afloja la validación sin entender por qué existe.

3. **El plan no asigna un lugar explícito a "presencia / detección de inactividad del navegador".**
   `propuesta-modular.md` no tiene una carpeta para algo como `idleDetector.js` (usa `window.IdleDetector`, `navigator.permissions`, `document.visibilityState` — APIs de navegador, no de dominio de negocio). El `PROMPT_CONTINUACION_FASE2.md` (sección 3, punto 3) pide redistribuir `breakState.js`, `cronograma.js` e `idleDetector.js` entre `domain/shifts/`, `domain/schedules/` y `utils/` — pero `idleDetector.js` viola la regla explícita de `propuesta-modular.md` de que `domain/` "no conoce... SDKs externos" si se fuerza ahí. Es un hueco real en la taxonomía de carpetas, no solo un detalle de nomenclatura.

4. **No hay una prueba de regresión específica para el riesgo más caro (hallazgo F).**
   `hoja-de-ruta.md` pide "snapshots de entrada/salida" y "no quedan copias divergentes de... parsing de fechas o sanitización", pero no identifica el riesgo concreto de que dos claves de `localStorage` (`riskOps_timeline` y `riskOps_breakState`) puedan divergir durante una extracción parcial. Ese riesgo se materializó exactamente en el incidente de la sección 2. `inactivity_timeline.test.js` ya existe (3.4) y sería el lugar natural para cubrir este caso específico antes de reintentar la integración de `breakState.js`.

5. **Documentación de continuidad no referenciada desde `Docs/`.**
   `PROMPT_CONTINUACION_FASE2.md` (con los límites obligatorios de la sección 0) vive fuera del repositorio (`Fase2/PROMPT_CONTINUACION_FASE2.md`, un nivel arriba de `riesgovirtualsoft/`), no dentro de `.github/fase_2/Docs/`. Nada en `Docs/` apunta a él. Cualquier persona (o sesión de IA) que abra el repo y lea solo `Docs/` no se entera de que existen esas reglas de límites — depende de que el prompt se pegue manualmente cada vez, como de hecho instruye su propio encabezado.

### 4.3 Recomendaciones concretas

Para que el resultado final sea óptimo, escalable y modificable, en orden de prioridad:

1. **Decidir y documentar la estrategia de carga de módulos antes de escribir más código en `src/`.** Es la madre de las brechas 1 y 2. Dos caminos razonables, a elegir explícitamente (no de forma implícita como ocurrió):
   - **(a) Módulos ES nativos + exportación manual a `window`:** mantener `type="module"` en el entrypoint, y en `bootstrap.js` asignar explícitamente a `window` cada función que el HTML siga invocando por `onclick` inline, migrando esos handlers a `addEventListener` gradualmente (coincide con lo que ya insinúa la Fase 3 de `hoja-de-ruta.md`, solo que hay que decirlo explícitamente para `src/`).
   - **(b) Introducir un paso de build mínimo** (p. ej. un bundle único con `esbuild`, sin dependencias de runtime) que compile `src/` a un `app.bundle.js` clásico, preservando compatibilidad total con `onclick` inline sin tocar el HTML. Cambia la restricción "sin build step", así que requiere tu aprobación explícita antes de adoptarse.
2. **Agregar una sección a `hoja-de-ruta.md` (o a `propuesta-modular.md`) que defina explícitamente el punto de corte para mover `src/` de `.github/fase_2/src/` a la raíz, y el cambio correspondiente en `deploy-pages.yml`.** Sin esto, el trabajo ya hecho en `.github/fase_2/src/` es, en la práctica, indesplegable indefinidamente.
3. **Resolver el hueco de taxonomía para APIs de navegador (presencia/idle detection).** Añadir explícitamente a `propuesta-modular.md` un lugar para esto — por ejemplo una nueva carpeta `services/browser/` (adapters de APIs del navegador, mismo nivel que `services/firebase/` o `services/files/`) — en vez de forzarlo dentro de `domain/`.
4. **Extender `inactivity_timeline.test.js` o `end_shift_smoke.js` para cubrir explícitamente la coherencia entre `riskOps_timeline` y `riskOps_breakState.shiftTimeline`** antes de reintentar cualquier integración de `breakState.js`, dado que ya se demostró que es un punto real de divergencia silenciosa.
5. **Mover o referenciar `PROMPT_CONTINUACION_FASE2.md` dentro de `.github/fase_2/Docs/`** (aunque sea como copia o enlace), para que las reglas de límites viajen con el repositorio y no dependan de pegarse manualmente en cada sesión.
6. **Actualizar la tabla de estado de `README.md`** para reflejar que Fase 2 tiene diagnóstico, arquitectura y ~8 archivos de código ya escritos — evita que alguien asuma "Sin iniciar" y repita trabajo o tome decisiones con información desactualizada.

Ninguna de estas recomendaciones se aplicó — quedan como propuesta para tu revisión y autorización, igual que la reubicación de los 8 archivos de `src/` pendiente de la conversación.

---

## 6. Actualización de estado (2026-10-02): hotfixes de producción y versiones actuales

> Esta sección cubre una pista de trabajo distinta a la refactorización de `src/`: entre el 2026-09-29 y el 2026-10-02 se diagnosticaron y corrigieron directamente en `app.js` dos bugs reales de producción (identidad de tareas), reportados por el usuario con acceso a una cuenta de Gestor real. Se documentan aquí porque surgieron de este mismo diagnóstico y porque dejan un pendiente concreto sobre el candado de seguridad de Fase 1.

### 6.1 Verificación de versiones (comprobado el 2026-10-02)

| Referencia | Commit | Fecha | Contenido |
|---|---|---|---|
| `origin/main` (producción) | `ba5db44` | 2026-10-01 | Incluye ambos hotfixes de tareas (PR #14, merge real no-squash). Le sigue un "Add files via upload" (dato operativo, no código) encima. |
| `origin/feature/Fase_2` | `caa64da` | 2026-09-29 | 1 commit por delante de `main`: la actualización del hash F1 del candado de seguridad (ver 6.3). Pendiente de su propio PR/merge. |
| Rama local de esta sesión | `d5830b2` | 2026-09-29 | Desactualizada: muy por detrás de `origin/feature/Fase_2` (le faltan 5+ commits, incluidos ambos hotfixes). No se ha usado para ningún push — todo el trabajo se hizo desde ramas temporales basadas en el remoto real, siguiendo el patrón ya establecido para evitar el problema del `&` en la ruta. |

**Acción pendiente real:** abrir/mergear un PR de `feature/Fase_2` → `main` que contenga solo el commit `caa64da`, para que el candado de seguridad (sección 6.3) quede sincronizado con el `app.js` que ya está en producción.

### 6.2 Hotfixes de identidad de tareas (ya en `main`)

1. **IDs de tareas sintéticas volátiles** (`mockId = 10000++`): rotaban entre recargas de página, dejando huérfanas en `localStorage`/Firebase que bloqueaban `handleEndShift()` ("Tarea 10003"). Corregido con un hash determinista de `Set + Tarea`.
2. **IDs de tareas del catálogo maestro por posición** (`row.id = idx` sobre `Tareas de Riesgo.xlsx`): cualquier inserción/borrado/reordenamiento de fila cambiaba el id de todas las tareas siguientes, reproduciendo el mismo bloqueo pero en tareas reales con nombre (reportado por el usuario como "las 3 primeras", incluidas "Aprobación de retiros" y "WhatsApp"). Corregido con el mismo esquema de hash estable, en un rango numérico separado (0-9999) del de las tareas sintéticas (10000-99999).
3. Como parte del mismo trabajo: la purga de huérfanas en `loadExcelTasks()` ahora también borra la ruta correspondiente en Firebase (`active_sessions/{uid}/tasks/{id}`), no solo en el caché local — antes se acumulaban ahí indefinidamente. Verificado que esto no afecta las métricas de historial: `calcularIndicadores()` y `loadControlOperativoData()` leen exclusivamente de `shift_reports`, nunca de `active_sessions`.

Ambos hotfixes se verificaron con pruebas de comportamiento real (no solo lectura de código) contra el código extraído de `app.js`, además de la suite `npm run check` completa, antes de cada commit.

### 6.3 Candado de seguridad F0/F1 de `verify_frontend_contract.js`

Hallazgo durante este trabajo: `.github/qa-infra/verify_frontend_contract.js` fija un SHA-256 esperado de `app.js` (heredado de Fase 1) que debe actualizarse a mano, con changelog en comentarios, cada vez que el archivo cambia legítimamente — igual que `EXPECTED_R0_SHA256`/`EXPECTED_R1_SHA256` para `database.rules.json`. Es un control real, no un error de CI. El job `phase1-compatibility-qa.yml` → "Extract and verify F0/F1 static contracts" falla con `FAIL_VERIFIED_EXECUTED` si alguien fusiona un cambio a `app.js` sin actualizar este hash (como pasó con el PR #14: los hotfixes de tareas llegaron a `main` antes de que el hash se corrigiera en `caa64da`). **Recomendación para la hoja de ruta:** cuando se conecte `src/` a `app.js` en la Fase 3, este candado deberá actualizarse en el mismo corte que el cambio de `app.js`, no después.

## 7. Próximo paso acordado (registro original, 2026-09-22)

Revertir `app.js` e `index.html` al commit `04ee93d` (`git checkout -- app.js index.html`), descartando el intento de integración diagnosticado en la sección 2, para partir de una base funcional antes de continuar con la Fase 2 de forma ordenada. **Pendiente de confirmación explícita antes de ejecutarse**, por tratarse de una acción destructiva sobre archivos de producción (regla 0.3 de `PROMPT_CONTINUACION_FASE2.md`).
