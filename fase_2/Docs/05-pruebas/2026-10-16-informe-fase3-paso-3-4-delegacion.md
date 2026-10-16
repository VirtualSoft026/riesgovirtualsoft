# Informe — Fase 3, paso 3.4 (tramo de delegación): manejadores en línea

**Fecha:** 2026-10-16
**Rama:** `backup/fase2-refactor-2026-10-03` (sin commit, push, merge ni rebase; el commit lo hace el responsable)
**Log detallado:** `2026-10-16-log-fase3-paso-3-4-delegacion.txt`
**Entrega al dispositivo:** 34 archivos existentes escritos con `expectedMtimeMs` y 8 archivos nuevos; los 42 se leyeron de nuevo del dispositivo y coinciden byte a byte con la copia de trabajo.

## Estado del paso

El paso 3.4 no está cerrado. Con este tramo quedan terminados el retiro de los manejadores en línea de `index.html` y `login.html` (W-54 b y c), la migración de los generados por JavaScript (W-54 b, DE-5 = a, W-50), el puente `legacy-bridge.js` (W-03), la unificación de Control de Tiempos y del login que ya estaban entregados, y la actualización del plan. Quedan abiertos los validadores y claves restantes (W-47 y W-48), la comprobación de DE-20 y la guardia de auditoría de 3.4. La eliminación de `app.js` (W-54 a) va en el paso 3.6 y el CSP (W-54 d) en el 3.5.

## Delegación por `data-action`

Los manejadores en línea de `index.html` (68 atributos `on*` en el marcado) pasaron así: 58 manejadores de `onclick`, `onchange`, `oninput` y `onsubmit` se convirtieron en `data-action` con sus `data-*`; 6 atributos de hover se sustituyeron por reglas `:hover` en `interaction-states.css`; y 4 atributos `onclick="toggleMultiSelectDropdown(...)"` se retiraron porque esa función no está definida en ningún archivo y el componente multi-select ya abre y cierra su desplegable con su propio listener. En `login.html` los cuatro cambios de panel pasaron a `data-action="switch-panel"` y la detección de navegador se movió a `index-browser-guard.js`, de modo que `index.html` ya no tiene scripts en línea. Ningún atributo `on*=` queda en el marcado ni en las plantillas de `src/` (auditado por `src/tests/ui/inline-handlers-audit.test.mjs`).

Las plantillas de JavaScript tenían 32 manejadores más (30 en `src/` y `app.js` según el inventario, y 2 en las hojas de horario y teletrabajo que la búsqueda estricta encontró después). Todos pasaron a `data-action`. Los valores que iban dentro de un `decodeURIComponent('…')` ahora van escapados en su atributo (`data-user-id`, `data-fb-id`, `data-key`, `data-uid`, `data-task-id`), lo que cierra también el riesgo de que una clave con comillas rompiera el atributo.

El registro es `src/ui/actions/action-registry.js`. Tiene una tabla de 53 acciones; cada entrada indica en qué eventos se ejecuta y llama a la misma función global, con los mismos argumentos, que llamaba el atributo original. Un solo listener por tipo de evento (`click`, `change`, `input`, `submit`) se enlaza en el documento y busca el elemento más cercano con `data-action`. Enlazar de nuevo sustituye al enlace anterior, así que nunca hay dos ejecuciones. El enlace se hace desde `index-actions-init.js`, un script clásico que se carga después del bundle y de `app.js`, y no desde `bootstrap.js`, que todavía no existe en el código de trabajo. Es una desviación de la propuesta que se anota aquí para revisarla en el paso 3.6. Las acciones de la delegación de W-50 del paso 3.2 (`approve-user`, `toggle-tree`) y la de `switch-panel` mantienen su propio enlace por nombre (`utils/action-delegation.js`), de modo que no se ejecutan dos veces.

Hay dos casos que se tuvieron que tratar con cuidado. El primero es el botón Finalizar Turno: para Admin y Supervisor `app.js` sustituía su manejador por «Cerrar Sesión». Con la delegación, el botón seguía llevando `data-action="end-shift"` y el registro habría ejecutado también el cierre de turno; por eso `app.js` ahora retira ese atributo en la misma sustitución, y la auditoría tiene una prueba que lo exige. El segundo es que el original `closeMonitoreoModalBtn` ya no tiene escucha en `app.js`, así que solo queda la acción `close-modal`.

Quedan como manejadores de propiedad de JavaScript, que no son atributos y no entran en la auditoría: `kpi-controller` (`tr.onmouseover`, `tr.onmouseout`, `tr.onclick`), `app.js` (`endShiftBtn.onclick`, `avatarEl.onerror`), `shift-reports-controller` (`exportPdfModalBtn.onclick`), `announcements-controller` (`btnUrgentUnderstand.onclick`) y `monitoring-controller` (`avatarEl.onerror`). Se dejan para revisarlos en 3.5 y 3.6.

## Pruebas de paridad y de la delegación

Las pruebas diferenciales comparan el original con el integrado sobre el mismo DOM falso. Como el original lleva `onclick` en línea, su HTML se lleva a la forma delegada con un normalizador (`src/tests/helpers/legacy-action-migration.mjs`) que reescribe solo los manejadores de la aplicación con la misma correspondencia que aplicó la migración. Cualquier manejador sin correspondencia lanza un error, para que una función nueva no pase en silencio. En las trazas de los comunicados, donde el contenido lo escribe el usuario y puede llevar cualquier `onclick`, el normalizador se usa en modo no estricto: esos manejadores se dejan iguales en ambos lados y la comparación sigue siendo exacta.

Para que las pruebas no se relajen, en cada prueba se cambió solo la forma esperada del atributo (por ejemplo, `onclick="revertRejectedUser(decodeURIComponent('u%201'))"` pasó a `data-action="revert-rejected-user" data-user-id="u 1"`), y las comprobaciones que buscaban la ausencia de la función en el HTML se cambiaron por la de `data-action` o por la de `onclick=`. Las pruebas nuevas son `src/tests/ui/action-registry.test.mjs` (13 pruebas: cada acción llama a la misma función con los mismos argumentos, las acciones desconocidas y los eventos que no les corresponden no hacen nada, el enlace repetido no duplica, el retiro limpia el documento, `exec-command` distingue `null` de cadena vacía, el envío pasa el evento y la navegación de notificaciones) y `src/tests/ui/inline-handlers-audit.test.mjs` (6 pruebas: sensibilidad del patrón, cero atributos `on*` en el marcado y en `src/`, cero scripts en línea en `index.html` y `login.html`, cada `data-action` declarado existe en la tabla o tiene enlace propio, cada entrada de la tabla se usa, y la sustitución de Finalizar Turno).

Dos archivos de la suite cambiaron de forma y no de contenido: las rutas de `src/tests/helpers/w50-delegation.mjs` siguen existiendo, pero ahora delegan en el normalizador general, y los cuatro E2E que comparan con el original (`tareas`, `modales-permisos`, `historial-navegacion` y `comunicados`) aplican el mismo normalizador al lado original.

## Verificación

La suite del laboratorio pasa completa: bundle 71 de 71, unitarias 92 archivos con 1.458 pruebas, integración 1, E2E 14 archivos con 677 pruebas, motor 4 de 4, y cero intentos de red bloqueados. Antes de este tramo fallaban 16 archivos. Se revisaron uno a uno: todos los fallos venían de la forma del marcado (pruebas que esperaban el `onclick` antiguo o un original sin normalizar), no de la conducta de la aplicación. El bundle se reconstruyó y se verificó (136 módulos, 71 comprobaciones, `BUNDLE_VERIFY=PASS`), y los archivos de arranque clásicos pasan `node --check`.

La entrega al dispositivo se hizo con marcas de tiempo. Antes de escribir se verificó la base: `index.html`, `app.js`, `login.html`, ambos bundles, `src/entry.js` y los demás archivos existentes coinciden con la entrega anterior del paso 3.4; las pruebas se revisaron archivo por archivo con `diff` contra la copia del dispositivo y solo muestran los cambios previstos. Hubo que corregir un defecto de fin de línea: al editar algunos archivos de prueba con un script se habían pasado a LF, y se restauró CRLF antes de entregarlos. Los 34 archivos existentes se escribieron con su `expectedMtimeMs` (34 aceptados, 0 rechazados) y los 8 nuevos sin marca de tiempo. Después se leyeron los 42 del dispositivo y se compararon con la copia de trabajo: 42 coinciden.

## Lo que queda para el responsable

Primero, la prueba manual en el navegador real de los flujos que tocan los nuevos manejadores. La suite no reemplaza el navegador: conviene revisar al menos Finalizar Turno (Gestor, y también Admin y Supervisor, que deben ver solo «Cerrar Sesión»), las pausas, el menú de notificaciones y su navegación, el cierre de modales, las aprobaciones de usuarios y permisos, el envío del formulario de incidencias, los comunicados (leer, marcar, eliminar), el interruptor de Pausa de Turno de la configuración de gestores y las hojas de horario y teletrabajo.

Segundo, borrar a mano los cinco archivos autorizados, porque esta sesión no puede borrar: `login.js`, `js/tiempos.js`, `src/controllers/idle-state-controller.js`, `src/tests/controllers/idle-state-controller.test.mjs` y `fase_2/src/controllers/idle-state-controller.js`.

Tercero, decidir qué hacer con las propiedades `onclick` y `onerror` que quedaron en JavaScript. Y retirar el parámetro `encodeArg` que todavía pasan `task-controller.js` y `task-loaders-controller.js` a las vistas de tareas: ya no se usa, es un resto de la migración y se puede quitar en el paso 3.6.

## Lo que no se hizo en este tramo

No hubo commit, push, merge ni rebase. No se corrigió ningún defecto fuera del alcance: el registro de `login_logs` y el desglose por día conservan su comportamiento original por paridad, como se decidió. No se tocó `presence-service.js` (congelado, D6) ni la rama `shift_break`.
