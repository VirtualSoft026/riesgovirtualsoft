# Informe — Extracción "Modales, tareas extra, usuarios y permisos" (corte `modales-permisos`, paso 6)

## 1. Encabezado

- **Fecha:** 2026-10-06
- **Alcance:** las 17 funciones "No iniciada" de la sección "Modales, tareas extra, usuarios y permisos" del plan maestro (§5), más `confirmRejectPerm()` (app.js 4402), que vive en el mismo bloque contiguo (app.js 3975-4448) pero **no figura en el inventario del plan** (el bloque tiene 18 funciones). Dos grupos: modales y tarea extra (5) y aprobación de usuarios y permisos (12 + `confirmRejectPerm`).
- **Responsable:** Claude (agente del corte `modales-permisos`; el trabajo lo inició otro agente que se cortó por límite de uso, y este agente lo verificó, corrigió dos expectativas erróneas del e2e y lo completó), por encargo del responsable del producto.
- **Fase de `hoja-de-ruta.md`:** Fase 2, paso 6 (extracción por cortes) y su conexión de laboratorio (§6 bis del plan maestro).
- **Comandos** (desde `fase_2/`; salida íntegra en `2026-10-06-log-extraccion-modales-permisos.txt`):
  - Suite nueva: `node src/tests/domain/approval-policy.test.mjs` y las otras 6 listadas en la sección 2.
  - Regresión: cada `src/tests/{domain,utils,ui,controllers}/*.test.mjs` con `node` (58 suites).
  - Bundle e integración: `node /tmp/riskops-bundle.mjs /tmp/mp-bundle.js` y `node /tmp/riskops-integrate.mjs /tmp/mp-integrado.js`.
  - E2E: `node src/tests/e2e/modales-permisos-integrado.e2e.cjs /tmp/mp-integrado.js --riskops /tmp/mp-bundle.js --original /mnt/user-data/uploads/riesgovirtualsoft/app.js`.

## 2. Resumen ejecutivo

Las 17 funciones (y `confirmRejectPerm`) quedaron extraídas a módulos con inyección de dependencias, probadas con pruebas diferenciales (copia literal de `app.js` con números de línea) y **conectadas a la copia de staging del laboratorio** con un único paso de anclas únicas que reemplaza el bloque contiguo `// Modal Logic` … fin de `updatePermissionStatus()` por globales del mismo nombre y firma que delegan en `RiskOps.approvalsController`. `app.js`, `index.html` y `database.rules.json` **no se tocaron**.

| Suite (carpeta `src/tests/`) | Pruebas | Resultado |
|---|---|---|
| `domain/approval-policy.test.mjs` (política vs. reglas reales de `database.rules.json`) | 29 | 29/29 |
| `domain/permission-service.test.mjs` | 12 | 12/12 |
| `domain/user-approval-list.test.mjs` | 7 | 7/7 |
| `domain/extra-task.test.mjs` (incluye `exception-justification.js`) | 11 | 11/11 |
| `domain/firebase-approvals-repository.test.mjs` | 10 | 10/10 |
| `controllers/approvals-controller.test.mjs` (usa `approvals-fakes.mjs` y `approvals-original.mjs`) | 84 | 84/84 |
| `ui/approvals-components.test.mjs` | 22 | 22/22 |
| **Total nuevas (unitarias/diferenciales)** | **175** | **175/175** |
| Regresión completa de `src` (58 suites `domain`+`utils`+`ui`+`controllers`) | 809 | 809/809, 0 fallas |
| `e2e/modales-permisos-integrado.e2e.cjs` solo contra el original (32 escenarios) | 32 | 32/32 |
| Idem contra el app.js INTEGRADO + bundle real, con paridad contra el original | 66 | 66/66 |
| `split-shift-flag.unit.cjs --strict`, `cierre-horas-efectivas.e2e.cjs --strict`, `monitoreo-render.e2e.cjs` contra el integrado con este corte | 21 / 13 / 7 | sin fallas ni brechas |

`node /tmp/riskops-integrate.mjs /tmp/mp-integrado.js` → `INTEGRADO /tmp/mp-integrado.js 47 pasos` (los pasos de los 5 cortes y del controlador de turno aplican juntos, sin colisión de anclas; la sintaxis resultante valida). `node /tmp/riskops-bundle.mjs /tmp/mp-bundle.js` → `BUNDLE_OK`.

| Función de `app.js` | Estado | Módulo(s) | Pruebas | Lab |
|---|---|---|---|---|
| `openExceptionModal` (3976) | Hecha + probada | `ui/components/modal.js` (`openExceptionModal`), `controllers/approvals-controller.js` (`createModalsController`) | `approvals-components.test`, `approvals-controller.test` (incl. `TypeError` idéntico sin el botón) | sí |
| `closeModal` (3994) | Hecha + probada | `modal.js` (`closeModal`), controlador | ídem (id inexistente no falla) | sí |
| `confirmException` (4001) | Hecha + probada | `domain/tasks/exception-justification.js` (`validateExceptionInput`, `buildExceptionObservation`), controlador | `extra-task.test`, controlador, e2e M1 | sí |
| `openExtraTaskModal` (4021) | Hecha + probada | `modal.js` (`openExtraTaskModal`), `domain/tasks/extra-task.js`, controlador | `approvals-components.test`, controlador, e2e E1 | sí |
| `saveExtraTask` (4033) | Hecha + probada | `domain/tasks/extra-task.js` (validaciones, llave `extra_<ms>`, registro, clasificación del error), controlador | `extra-task.test` (200 casos con semilla), controlador (reintento reutiliza llave, doble clic, permiso denegado, localStorage lleno), e2e E2-E8 | sí |
| `renderPendingUsers` (4111) | Hecha + probada | `domain/permissions/user-approval-list.js`, `ui/components/pending-users-table.js`, `ui/components/list-notice.js`, `services/firebase/firebase-approvals-repository.js`, controlador | diferencial fijo + 80 conjuntos aleatorios (HTML idéntico), e2e U1-U4 | sí |
| `approveUser` (4221) | Hecha + probada | `domain/auth/approval-policy.js` (payload), repositorio, controlador | controlador, repositorio, e2e U5-U7 | sí |
| `showUserRejectBox` (4236) | Hecha + probada (presentación) | `ui/components/approval-boxes.js` (utilidad parametrizada por tipo de caja), controlador | `approvals-components.test`, controlador | sí |
| `cancelRejectUser` (4241) | Hecha + probada (relevancia "Redundante": la misma utilidad) | `approval-boxes.js`, controlador | ídem | sí |
| `confirmRejectUser` (4247) | Hecha + probada | `approval-policy.js` (`validateRejectionReason`, payload `{approved:"Rechazado", rejectionReason}`), repositorio, controlador | controlador, e2e U8-U9 | sí |
| `renderPendingPermissions` (4267) | Hecha + probada | `domain/permissions/permission-service.js`, `ui/components/pending-permissions-table.js`, `list-notice.js`, repositorio, controlador | diferencial fijo + 80 aleatorios, e2e P1-P4 | sí |
| `showPermRejectBox` (4391) | Hecha + probada (presentación) | `approval-boxes.js`, controlador | `approvals-components.test`, e2e P9 | sí |
| `cancelRejectPerm` (4396 y duplicada en 4422) | Hecha + probada (Redundante: definición duplicada) | `approval-boxes.js`, controlador | ídem | sí |
| `showPermApproveBox` (4411) | Hecha + probada (presentación) | `approval-boxes.js`, controlador | ídem | sí |
| `cancelApprovePerm` (4416) | Hecha + probada (Redundante) | `approval-boxes.js`, controlador | ídem | sí |
| `confirmApprovePerm` (4428) | Hecha + probada | `permission-service.js` (`buildApproveDecision`), controlador | controlador, e2e P5 | sí |
| `updatePermissionStatus` (4433) | Hecha + probada | `permission-service.js` (payload y mensaje), `approval-policy.js`, repositorio, controlador | controlador, repositorio, e2e P7-P8 | sí |
| `confirmRejectPerm` (4402, fuera del inventario del plan) | Hecha + probada | `permission-service.js` (`buildRejectDecision`), controlador | controlador, e2e P6, P10 | sí |

Ninguna función quedó "Parcial" ni "No extraíble": la parte de DOM de cada una vive en `ui/components/` y en el controlador, que sí están probados con un DOM simulado.

## 3. Finalidad de las pruebas

- Que aprobar o rechazar usuarios y permisos escriba exactamente los mismos nodos y payloads (`users/<id>`, `permissions/<id>`) con los mismos estados (`true`, `"Rechazado"`, `Aprobado`, `Rechazado`) y que el gestor reciba los mismos mensajes: es el flujo que decide quién puede iniciar sesión y quién tiene un permiso concedido.
- Que la interfaz no prometa lo que las reglas de Firebase prohíben: la política de roles del cliente (`approval-policy.js`) se contrasta contra la evaluación de las expresiones reales de `database.rules.json` para Admin/Supervisor/Gestor aprobados y no aprobados.
- Que la **tarea extra** (`saveExtraTask`, crítica) no pierda ni duplique trabajo: llave `extra_<ms>` reutilizada al reintentar tras un fallo, respaldo local best-effort, clasificación del error de permiso, botón "Guardando..." restaurado y guarda anti doble clic.
- Que el HTML de las tablas y los `id`/`onclick` (que dependen de funciones globales de `app.js`) sigan siendo byte a byte idénticos, porque los manejadores en línea fallan en silencio si cambia un nombre.
- Que sacar la lógica a un módulo no cambie ningún comportamiento observable, incluidos los fallos (los `TypeError` por elementos ausentes se conservan, no se enmascaran).

## 4. Metodología

- **Arnés:** `src/tests/test-harness.mjs` (`createRunner`; async con `testAsync` y `await summarizeAsync()`). Sin frameworks nuevos.
- **Diferencial:** `src/tests/controllers/approvals-original.mjs` contiene la copia LITERAL de las funciones de `app.js` 3975-4448 (con números de línea) y `approvals-fakes.mjs` un DOM y una base simulados; el controlador nuevo y la copia se ejecutan con las mismas entradas y se comparan alertas, confirmaciones, lecturas/escrituras, HTML y temporizadores. Entradas fijas y aleatorias con semilla (80 conjuntos por vista).
- **Reglas reales:** `approval-policy.test.mjs` evalúa las expresiones `.write`/`.read` de `users/$uid` y `permissions/$perm_id` de `database.rules.json` (solo lectura) y las compara con `canApproveUsers`, `canManagePermissionApprovals` y `canReadUsersList` sobre todas las combinaciones rol x aprobado.
- **Inyección de dependencias:** el controlador recibe `doc`, `repository`, `alert`, `confirm`, `now`, `schedule`, `logger`, `getUser`, `getAuthUser`, `persistTask`, `getTaskCache`, `storage`, `updateKPI` y `onPermissionUpdated`. Nada toca `window`, `localStorage`, `firebase` ni `alert` directamente.
- **E2E (`modales-permisos-integrado.e2e.cjs`):** extrae el bloque REAL 3975-4448 del `app.js` recibido y lo ejecuta en un `vm` con DOM, Firebase, `alert/confirm`, reloj y temporizadores simulados. Con el app.js integrado carga además el bundle real (`--riskops`) y, con `--original`, ejecuta cada escenario TAMBIÉN contra el original y exige igualdad de todo lo observable (alertas y confirmaciones en orden, llamadas a Firebase, DOM antes y después de los temporizadores de 100 ms, caché local y errores).
- **Zona horaria:** las fechas de aprobación se comparan con `now` fijo; sin dependencia de la zona.

## 5. Detalle por módulo probado

**`domain/auth/approval-policy.js`.** Política de aprobaciones: quién aprueba/rechaza usuarios (solo Admin aprobado) y permisos (Admin o Supervisor aprobados), quién ve la vista Aprobaciones y la sección de usuarios, estado de la cuenta (pendiente / aprobada / `"Rechazado"`), textos de la interfaz y payloads. Se usa en el controlador (opción `enforcePolicy`) y como documentación ejecutable de las reglas.

**`domain/permissions/permission-service.js`.** Filtra pendientes, ordena, limita a 5, arma el historial y la hora de solicitud; decisiones de aprobar (observación por omisión "Aprobado sin observaciones adicionales", recortada) y rechazar (motivo obligatorio); payload `{status, notified:false, rejectionReason?}` y mensaje "Permiso <estado> exitosamente.".

**`domain/permissions/user-approval-list.js`.** Clasificación pendientes/aprobados, orden por fecha de registro, filtros de búsqueda (con acentos) y estado, recorte a 5 filas y textos de fecha (con fecha, sin fecha, inválida).

**`domain/tasks/extra-task.js` y `exception-justification.js`.** Validación (nombre y luego observación; razón y luego detalle), llave `extra_<ms>` reutilizable, registro con prefijo `[EXTRA] `, validación de identidad contra la sesión de Firebase, clasificación del error de guardado y observación `Excepción: <razón> - <detalle>`.

**`services/firebase/firebase-approvals-repository.js`.** `fetchUsers`, `fetchPermissions`, `approveUser`, `rejectUser`, `updatePermissionStatus` con la base inyectada y los errores propagados al controlador. Una llave vacía se rechaza antes de tocar Firebase (ver hallazgo 4).

**`controllers/approvals-controller.js`.** Dos fábricas: `createApprovalsController` (usuarios y permisos) y `createModalsController` (excepción y tarea extra), porque el corte tiene un solo archivo de controlador asignado. Opciones EXPLÍCITAS apagadas por defecto (= comportamiento original): `preventDuplicates`, `enforcePolicy` + `getUser`, `escapeRole`.

**`ui/components/{approval-boxes,modal,pending-users-table,pending-permissions-table,list-notice}.js`.** Cajas de acción en línea (una utilidad parametrizada reemplaza seis funciones casi iguales), utilidades de modal, HTML de las filas con los mismos ids y `onclick` y aviso "Mostrando los 5 más recientes" con id fijo.

**`entry-modales-permisos.js`.** Registra 12 espacios de nombres en el bundle: `approvalPolicy`, `permissionService`, `userApprovalList`, `extraTask`, `exceptionJustification`, `approvalsRepository`, `approvalsController`, `approvalBoxes`, `listNotice`, `modalView`, `pendingUsersTable`, `pendingPermissionsTable`.

**`lab/integracion/pasos/modales-permisos.mjs`.** Un paso (ancla de inicio `// Modal Logic\nfunction openExceptionModal() {`, fin inclusive en las últimas líneas de `updatePermissionStatus`) delimitado por `[LAB-INTEGRACION:MODALES-PERMISOS:INICIO/FIN]`, distintos de los del controlador de turno. Los `onclick` generados y los de `index.html` siguen resolviendo a globales con el mismo nombre. Las variables `pendingExtraTaskId` e `isSavingExtraTask` (1318-1319) quedan declaradas pero sin uso (el estado vive en el controlador).

## 6. Hallazgos

Convención: nada se corrigió en silencio; lo corregible es una opción explícita, apagada por defecto, con su prueba.

1. **Usuarios rechazados desaparecen de la tabla (medio, decisión de negocio).** Un usuario con `approved === "Rechazado"` no entra ni en pendientes ni en aprobados: la rama "Rechazado" del HTML de acciones es código muerto y quien rechaza no puede revertirlo desde la pantalla. Se porta fiel y queda documentado en `user-approval-list.js`.
2. **Llave vacía escribe el nodo raíz `users` (alto, solo con entradas inválidas).** `approveUser('')` o `confirmRejectUser('')` en `app.js` actualizan `'users/' + ''`, es decir el nodo raíz. El repositorio nuevo rechaza la llave vacía o no textual ANTES de llamar a Firebase (diferencia deliberada solo para entradas inválidas; cubierta por prueba, con una prueba de referencia que documenta el riesgo).
3. **Rol sin escapar en la insignia de la tabla de usuarios (medio, XSS almacenado potencial).** `renderPendingUsers` inserta `user.role` sin escapar. Opción `escapeRole` (apagada) la corrige; probada en ambos modos.
4. **Doble clic duplica escrituras y alertas (bajo).** `approveUser` y `confirmRejectPerm` no tienen guarda: dos clics producen dos confirmaciones/escrituras/alertas (`saveExtraTask` sí tiene la suya). Opción `preventDuplicates` (apagada) la evita por usuario/permiso y libera la clave aunque falle la escritura.
5. **El estado de la tarea extra no se valida (bajo).** El estado viaja tal cual del selector; un DOM manipulado podría enviar cualquier texto. `isKnownExtraTaskStatus` lo expone sin aplicarlo.
6. **Desajuste de roles (informativo).** Las reglas dejan a un Supervisor LEER `users`, pero la interfaz no le muestra ni le deja escribir la sección de usuarios (solo Admin). Además, un Supervisor puede aprobar SU PROPIA solicitud de permiso (ninguna regla lo impide) y un Admin puede escribir `approved: "Rechazado"` (el `.validate` lo permite). Decisión de negocio: ¿se quiere una regla contra la autoaprobación?
7. **Sin pendientes, el historial no se pinta.** `renderPendingPermissions` retorna tras "No hay permisos pendientes de aprobación." y no rellena el historial de permisos resueltos. Se porta fiel.
8. **`cancelRejectPerm` está definida dos veces en `app.js`** (4396 y 4422, idénticas) y `confirmRejectPerm` no figura en el inventario del plan (el bloque tiene 18 funciones, no 17). El plan debería listar `confirmRejectPerm` y marcar la duplicada como Redundante.
9. **Errores de lectura silenciados.** Si falla la lectura de `users` o `permissions`, `app.js` solo registra el error y deja la tabla vacía con "No hay usuarios que coincidan..." (que parece "sin datos" cuando en realidad fue un fallo). Se porta fiel; el controlador registra el error por `logger`.
10. **Dos expectativas erróneas del e2e heredado, corregidas en este corte.** Fallaban también contra el `app.js` original (no eran defectos del controlador): U5 esperaba 2 lecturas de `users` cuando el escenario solo dispara la recarga posterior (1), y P9 esperaba que el campo de aprobación conservara el texto tras `cancelApprovePerm`, que lo vacía por diseño (4419). Con ambas corregidas: 32/32 contra el original y 66/66 integrado.
11. **Para el responsable:** ningún cambio en módulos de otros cortes fue necesario. `permission-history-view.js` es del corte `tareas` (lo importa `task-loaders-controller.js`); no se tocó.

## 7. Log completo

`2026-10-06-log-extraccion-modales-permisos.txt` (hermano de este informe): salida de las 7 suites nuevas, de las 58 de la regresión (809/809), de bundle e integración, del e2e solo contra el original, del e2e integrado con paridad y de las suites e2e del controlador de turno contra el integrado.

## 8. Estado frente al criterio de salida y próximos pasos

- **Cubierto:** las 17 funciones del plan (y `confirmRejectPerm`) tienen módulo, prueba diferencial o de comportamiento y conexión de laboratorio demostrada idéntica al original con el app.js integrado y el bundle real. Entregables propios: `src/entry-modales-permisos.js` (12 espacios de nombres) y `lab/integracion/pasos/modales-permisos.mjs` (1 paso).
- **Pendiente (decisión del responsable):** activar o no las opciones `preventDuplicates`, `enforcePolicy` y `escapeRole` al pasar a producción; qué hacer con los usuarios rechazados (hallazgo 1); regla contra la autoaprobación de permisos (hallazgo 6).
- **Pendiente técnico:** actualizar en el plan maestro (§5) el estado y destino de las 17 filas (los destinos reales son `domain/auth/approval-policy.js`, `domain/permissions/*`, `domain/tasks/{extra-task,exception-justification}.js`, `services/firebase/firebase-approvals-repository.js`, `controllers/approvals-controller.js` y `ui/components/*`), añadir `confirmRejectPerm` al inventario y llevar el paso a `app.js` real solo con autorización (§7 del plan).
