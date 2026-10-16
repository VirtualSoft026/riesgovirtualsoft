# Informe — Fase 3, paso 3.3: detector de inactividad (W-24 y W-25)

## 1. Encabezado

- **Fecha:** 2026-10-16
- **Rama de trabajo:** `backup/fase2-refactor-2026-10-03` (no se hizo commit, push, merge ni rebase)
- **Paso del plan:** 3.3 de `plan-fase-3.md` (sección 8): detector de inactividad, W-24 y W-25.
- **Alcance:** `app.js`, `src/` (servicios del navegador, componentes de interfaz, `entry.js` y pruebas), `build/`, `fase_2/lab/` (suite y referencia) y la documentación del paso.
- **Estado:** código y pruebas automáticas terminados y en verde. Queda pendiente el plan manual en un navegador real (sección 5), que requiere una sesión de Gestor en Firebase y lo ejecuta el responsable.
- **Log completo:** `2026-10-16-log-fase3-paso-3-3.txt`, en esta misma carpeta.

## 2. Qué se hizo

**W-24: detector de inactividad.** El detector ocupaba cinco piezas de `app.js`: el arranque (`checkAndStartIdleDetector`, `startIdleDetectorLogic`, `requestIdlePermission`), la solicitud manual (`requestIdlePermissionManual`), la decisión del respaldo por DOM (`shouldApplyDomIdleFallback`), el banner (`setIdleDetectorWarning`) y los escuchas de actividad con su intervalo de 1 s (líneas 655-663 de la versión anterior). Ahora cada pieza tiene un dueño en `src/`:

- `src/services/browser/idle-detector-adapter.js` posee el arranque, la solicitud manual, el respaldo por DOM y el espejo de `window.idleDetectorGranted` e `window.idleDetectorStarted`. Además exporta `bindIdleActivityListeners`, que registra mousemove, keydown, click, scroll y visibilitychange en el documento, y focus en la ventana. También crea un sondeo de 1 s que llama al respaldo por DOM solo cuando el adaptador lo permite.
- `src/ui/components/idle-warning.js` (nuevo) escribe el texto del banner y muestra u oculta `#idleDetectorWarning`.
- `app.js` conserva solo el cableado: `applyIdleStateChange` (traduce el cambio del detector a `__shiftActivityController().onIdleChange`), `updateActivity`, el envoltorio `window.requestIdlePermissionManual` con sus dos alertas (sin cambio de texto) y las llamadas a `initIdleDetector` y `bindIdleActivityListeners`. El desenlace de los escuchas queda en `__labIdleActivityUnbind`, para que el desmontaje real lo use en el paso 3.6.
- Se retiraron de `app.js`: `idleDetectorStartPromise`, `activeIdleDetector`, `screenLockTimer`, `setIdleDetectorWarning`, `checkAndStartIdleDetector`, `requestIdlePermission`, `startIdleDetectorLogic`, `shouldApplyDomIdleFallback`, y los escuchas y el intervalo antiguos. El archivo pasa de 2187 a 2069 líneas.

Las reglas de negocio no cambiaron. Los umbrales (3 minutos para el detector nativo, 10 segundos de gracia por bloqueo de pantalla y 5 minutos para el respaldo por DOM) siguen en `src/utils/constants.js`. Las guardas (solo Gestor, y una pausa activa no afirma inactividad) siguen en `shift-activity-controller.js`.

**W-25: un solo controlador de inactividad (DE-11).** Se queda `shift-activity-controller.js`, que es el que usa `app.js` en producción. `idle-state-controller.js` quedó huérfano: no lo importa ningún módulo de `src/` ni `entry*.js`, solo su propia prueba (`src/tests/controllers/idle-state-controller.test.mjs`). Antes de recomendar su baja se comprobó que su lógica ya está cubierta por las pruebas de `shift-activity-controller` (la verificación 1:1 de 2026-10-13 que cita esa prueba). Esta sesión no puede borrar archivos, así que la baja la hace el responsable (sección 9). Hay además una copia en `fase_2/src/controllers/`, de un árbol anterior que el laboratorio no usa; el responsable decide si también se borra.

**Otros cambios del paso.** `src/entry.js` exporta `idleWarningView` para el banner. En las pruebas, `split-shift-flag.unit.cjs` dejó de extraer `shouldApplyDomIdleFallback`, porque esa función ya no existe en `app.js`. En `tareas-integrado.e2e.cjs`, el escenario S7 (latido con respaldo por DOM) activa ahora el puente real en lugar de un stub. El resultado esperado no cambió y la paridad con el original se mantiene.

## 3. Verificación

| Comprobación | Resultado |
|---|---|
| `build/build.mjs` | BUNDLE_OK, 126 módulos |
| `build/verify-bundle.mjs` | PASS, 71 comprobaciones |
| Suite de laboratorio (`suite-pruebas.mjs`) | TODO EN VERDE |
| Unitarias | 86 archivos, 1398 pruebas, 0 fallas |
| Integración | 1 archivo, 1 prueba, 0 fallas |
| E2E (paridad con el original y prueba diferencial) | 13 archivos, 646 pruebas, 0 fallas |
| Motor operativo (`test_motor_operativo.py`) | 4/4 |
| Intentos de red bloqueados durante la suite | 0 |

Las pruebas nuevas son estas. El adaptador pasa de 15 a 23 pruebas, con 8 nuevas para `bindIdleActivityListeners` (registro, periodo por defecto y personalizado, desenlace, sondeo con y sin actividad reciente, ausencia de `onDomFallback` y validación de `onActivity`). El banner tiene un archivo nuevo, `src/tests/ui/idle-warning.test.mjs`, con 6 pruebas.

El arnés nuevo, `src/tests/e2e/inactividad-integrado.e2e.cjs`, ejecuta el bloque de inactividad del `app.js` real dentro de un contexto `vm`, con reloj falso, `IdleDetector` falso, Permissions API falsa, documento falso y base de datos falsa. Cubre 11 escenarios (P1 a P11, descritos en la sección 5) y, para cada uno, compara lo observable con el `app.js` previo al paso (`fase_2/lab/referencia/app.pre-paso-3-3-inactividad.js`). Son 22 comprobaciones: 11 de comportamiento esperado y 11 de paridad. Todo lo observable coincide: escrituras de estado, línea de tiempo, texto y visibilidad del banner, alertas, banderas `window.idleDetector*`, número de escuchas registrados y temporizadores activos.

En la primera corrida fallaron los 11 escenarios por el propio arnés, no por el código: el prelude declaraba `shiftTimeline`, que el bloque ya declara, y leía `currentUser` como propiedad del contexto, cuando es una variable de script. Además dos expectativas estaban mal escritas: la línea de tiempo guarda intervalos con `start` y `end` (no eventos `start`/`end`), y en P8 el bloqueo corto se cancela y el bloqueo de 10 segundos escribe una sola vez. Al corregir el arnés la paridad estaba en verde desde el principio, de modo que ninguna corrección cambió el comportamiento del código.

## 4. Diferencias aceptadas

No hay diferencias de comportamiento. Lo observable en los 11 escenarios coincide con el `app.js` previo al paso. Lo que cambia es la estructura: los escuchas de actividad y su intervalo pasan del `app.js` al adaptador, y el número de escuchas y temporizadores registrados es el mismo.

El arnés es un modelo del navegador, con reloj y detector falsos. No sustituye al plan manual de la sección 5.

## 5. Plan manual de inactividad (pendiente del responsable, navegador real)

**Preparación.** Chrome o Edge de escritorio, sesión de un Gestor activo y sin pausa, RiskOps en primer plano, consola de desarrollo abierta para leer `window.idleDetectorGranted` e `window.idleDetectorStarted`, y la vista de Monitoreo de un Supervisor o Admin para ver el estado en `active_sessions`. El botón del banner se llama «Habilitar Permiso».

| Caso | Pasos | Resultado esperado |
|---|---|---|
| P1. Permiso concedido | Poner el permiso de detección de inactividad del sitio en «Permitir». Recargar. Dejar el equipo inactivo más de 3 minutos. Volver a mover el ratón. | Durante la inactividad, el estado pasa a «Inactivo» y la línea de tiempo registra una Inactividad abierta. Al volver, pasa a «Activo» y la inactividad se cierra. El banner está oculto. Las dos banderas valen `true`. |
| P2. Permiso denegado | Poner el permiso en «Bloquear». Recargar. Con la pestaña visible y con foco, no tocar el equipo 5 minutos. Luego mover el ratón. | Al arrancar, el banner muestra «Permiso de inactividad pendiente o denegado…». Tras 5 minutos sin actividad, el estado pasa a «Inactivo». Al mover el ratón vuelve a «Activo». El banner sigue visible. |
| P3. Pestaña sin foco | Con el permiso denegado, enfocar otra ventana (por ejemplo, el explorador) durante 10 minutos, con la pestaña de RiskOps visible. | No hay cambio de estado ni entrada en la línea de tiempo. |
| P4. Pestaña oculta | Con el permiso denegado, cambiar a otra pestaña durante 10 minutos. | No hay cambio de estado. |
| P5. Pausa activa | Iniciar Almuerzo (o Desayuno, o Pausa de Turno). Dejar el equipo inactivo 3 minutos. | No se registra Inactividad mientras la pausa esté activa. |
| P6. Solicitud manual concedida | Con el permiso en «Preguntar», pulsar «Habilitar Permiso» y aceptar en el navegador. | Alerta: «¡Permiso otorgado! RiskOps ahora podrá registrar tu inactividad correctamente.». El banner se oculta. |
| P7. Solicitud manual denegada | Pulsar «Habilitar Permiso» y elegir «Bloquear». | Alerta: «El permiso no pudo activarse. Revisa los permisos del sitio en el navegador. Esto no impide finalizar tu turno.». El banner dice «Permiso de inactividad denegado. Esto no impide finalizar el turno.». |
| P8. Bloqueo de pantalla | Con el permiso concedido, bloquear Windows (Win+L) durante 5 segundos y volver: no debe haber cambio. Repetir con 11 segundos: debe pasar a «Inactivo». Al desbloquear y mover el ratón, vuelve a «Activo». | Un bloqueo corto se cancela. Un bloqueo de más de 10 segundos registra Inactividad. |
| P9. Rol Admin | Iniciar sesión como Admin y dejar el equipo inactivo 3 minutos. | No cambia el estado de ningún usuario. |
| P10. Navegador sin IdleDetector (por ejemplo, Firefox) | Abrir RiskOps y dejar la pestaña visible y con foco 5 minutos sin tocar el equipo. | El banner dice «Tu navegador no admite el permiso de inactividad. Esto no impide finalizar el turno.». Tras 5 minutos sin actividad, el estado pasa a «Inactivo». |
| P11. Arranque fallido | Caso cubierto por el arnés: no se reproduce fácilmente a mano. | El banner pide reintentar con el botón. Las banderas valen `false`. |

El responsable anota el resultado de cada caso en este informe, con la fecha, el navegador y la versión del archivo (`riskops.bundle.js`). Si un caso no se cumple, se abre una corrección antes de dar el paso por cerrado.

## 6. Cambios visibles para el usuario

No se esperan cambios visibles. Los mensajes del banner y de las alertas son los mismos, los umbrales son los mismos y las escrituras de estado son las mismas. El cambio es interno: el aviso y la solicitud manual pasan por código de `src/`.

## 7. Archivos

Los archivos existentes del paso son `app.js`, `riskops.bundle.js`, `build/dist/riskops.bundle.js`, `src/entry.js`, `src/services/browser/idle-detector-adapter.js`, `src/tests/services/browser/idle-detector-adapter.test.mjs`, `src/tests/e2e/split-shift-flag.unit.cjs`, `src/tests/e2e/tareas-integrado.e2e.cjs`, `fase_2/lab/suite/suite-pruebas.mjs` y `fase_2/Docs/03-plan-migracion/plan-fase-3.md`.

Los archivos nuevos son `src/ui/components/idle-warning.js`, `src/tests/ui/idle-warning.test.mjs`, `src/tests/e2e/inactividad-integrado.e2e.cjs`, `fase_2/lab/referencia/app.pre-paso-3-3-inactividad.js`, este informe y el log.

Las escrituras en el equipo siguen el mismo método que en los pasos anteriores: primero se leen las versiones actuales con `device_stage_files` para confirmar que coinciden con la base del paso, luego se escriben con `device_commit_files` usando `expectedMtimeMs` en los archivos existentes, y los archivos nuevos se crean sin esa comparación. Después se verifica byte a byte cada archivo.

## 8. Lo que no se hizo

No hubo commit, push, merge ni rebase. No se tocaron `presence-service.js` (congelado, D6) ni la rama `shift_break`. No se borró ningún archivo: `idle-state-controller.js` y su prueba quedan para que el responsable los elimine a mano. No se ejecutó el plan manual de la sección 5 en un navegador real.

El desmontaje real de los escuchas (`__labIdleActivityUnbind`) y del temporizador del detector queda para el paso 3.6, junto con `initApp` y `shutdown`.

## 9. Decisiones abiertas para el responsable

1. Confirmar la baja de `src/controllers/idle-state-controller.js` y de `src/tests/controllers/idle-state-controller.test.mjs`. Si también se quiere limpiar el árbol `fase_2/src/`, se incluye su copia de `idle-state-controller.js`.
2. Ejecutar el plan manual de la sección 5 en un navegador real y anotar el resultado de cada caso.
3. Aceptar el cierre del paso 3.3 con el plan manual pendiente, o mantenerlo abierto hasta tener ese resultado.
