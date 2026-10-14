# Informe — Extracción "Comunicados, configuración e incidencias" (corte `comunicados`, paso 6)

## 1. Encabezado

- **Fecha:** 2026-10-06
- **Alcance:** las 26 funciones "No iniciada" de la sección "Comunicados, configuración e incidencias" del plan maestro (§5): comunicados (14), configuración de gestores y flag `hasSplitShift` (2), novedades/incidentes (3), historial de accesos (3), presencia (2), contador atómico de retiros aprobados (3) e insignia de supervisor activo (1).
- **Responsable:** Claude (agente del corte `comunicados`), por encargo del responsable del producto.
- **Fase de `hoja-de-ruta.md`:** Fase 2, paso 6 (extracción por cortes) y su conexión de laboratorio (§6 bis del plan maestro).
- **Comandos** (desde `fase_2/src`; salida íntegra en `2026-10-06-log-extraccion-comunicados.txt`):
  - Suite nueva: `node tests/domain/announcement-service.test.mjs` y las otras 9 listadas en la sección 2.
  - Regresión: cada `tests/{utils,domain,ui,controllers}/*.test.mjs` con `node`.
  - Integración: `node /tmp/riskops-integrate.mjs /tmp/comunicados-integrado.js` y `node /tmp/riskops-bundle.mjs /tmp/comunicados-bundle.js`.
  - E2E: `node tests/e2e/comunicados-integrado.e2e.cjs /tmp/comunicados-integrado.js --riskops /tmp/comunicados-bundle.js`.

## 2. Resumen ejecutivo

Las 26 funciones quedaron extraídas a módulos con inyección de dependencias, probadas con pruebas diferenciales (copia literal de `app.js` con sus números de línea) y **conectadas a la copia de staging del laboratorio** (6 pasos, anclas únicas, sin solape). `app.js`, `index.html` y `database.rules.json` **no se tocaron**. Se documentan 5 hallazgos de seguridad/reglas y varias funciones muertas o inoperantes.

| Suite (carpeta `src/tests/`) | Pruebas | Resultado |
|---|---|---|
| `domain/announcement-service.test.mjs` | 25 | 25/25 |
| `domain/gestor-config.test.mjs` | 13 | 13/13 |
| `domain/incident-service.test.mjs` (incluye `ui/views/incidents-view.js`) | 8 | 8/8 |
| `domain/login-history.test.mjs` | 12 | 12/12 |
| `domain/active-supervisors.test.mjs` | 7 | 7/7 |
| `domain/presence-and-counter.test.mjs` | 16 | 16/16 |
| `controllers/announcements-controller.test.mjs` | 27 | 27/27 |
| `controllers/config-gestores-controller.test.mjs` | 11 | 11/11 |
| `controllers/incidents-controller.test.mjs` | 9 | 9/9 |
| `controllers/login-history-controller.test.mjs` | 6 | 6/6 |
| **Total nuevas** | **134** | **134/134** |
| Regresión completa de `src` (58 suites) | 809 | 808/809: la única falla es `ui/kpi-chart-configs.test.mjs`, del corte KPIs (otro agente, en curso); no toca archivos de este corte |
| `e2e/comunicados-integrado.e2e.cjs` (original vs integrado + bundle real) | 15 | 15/15 |
| `split-shift-flag.unit.cjs --strict`, `cierre-horas-efectivas.e2e.cjs --strict`, `monitoreo-render.e2e.cjs` contra el integrado con este corte | 23 / 13 / 7 | sin regresión |

Tabla función → estado → módulo → pruebas → laboratorio:

| Función de `app.js` | Estado | Módulo(s) | Pruebas | Lab |
|---|---|---|---|---|
| `updateActiveSupervisorBadge` | Hecha + probada | `domain/schedules/active-supervisors.js`, `controllers/supervisor-badge-controller.js` | `active-supervisors.test` (diferencial 600 casos) | sí (paso 4) |
| `openLoginHistoryModal` | Hecha + probada | `domain/auth/login-history.js` (`buildLoginHistoryRecords`), `services/firebase/firebase-login-history-repository.js`, `controllers/login-history-controller.js` | `login-history.test` (diferencial fijo + 300 aleatorios), `login-history-controller.test` | sí (paso 5) |
| `renderLoginHistoryTable` | Hecha + probada | `login-history.js` (`buildLoginHistoryTableHtml`, `computeLoginDelay`) | diferencial byte a byte (200 aleatorios) | sí |
| `filterLoginHistoryTable` | Hecha + probada | `login-history.js` (`filterLoginHistoryRecords`, `now` por parámetro) | diferencial (300 aleatorios) | sí |
| `setupUserPresence` | Hecha + probada (código muerto en `app.js`) | `services/firebase/presence-service.js` | base simulada con desconexiones; diferencial de la secuencia de escrituras | sí (paso 6; no se invoca hoy) |
| `startMonitoringPresence` | Hecha + probada (código muerto) | `presence-service.js` | idem | sí |
| `incrementApprovedWithdrawal` | Hecha + probada (código muerto; inoperante por reglas) | `domain/analytics/approved-counter.js`, `services/firebase/approved-counter-service.js` | transacción simulada (intento con `null` y reintento), diferencial | sí |
| `initAtomicApprovedCounterListener` | Hecha + probada (inoperante por reglas) | `approved-counter-service.js` | diferencial | sí |
| `updateApprovedCountUI` | Hecha + probada | `ui/views/approved-count-view.js` | diferencial 30 combinaciones | sí |
| `handleNewIncidentSubmit` | Hecha + probada | `domain/incidents/incident-service.js`, `services/firebase/firebase-incident-repository.js`, `controllers/incidents-controller.js` | `incident-service.test`, `incidents-controller.test` | sí |
| `startIncidentsRealtimeListener` | Hecha + probada | `incident-service.js` (`snapshotToIncidents`), repositorio de incidentes, controlador | límite 50, orden, lectura por rol | sí |
| `renderIncidentsTable` | Hecha + probada | `ui/views/incidents-view.js` | diferencial byte a byte (300 aleatorios) + XSS | sí |
| `initComunicadosListener` | Hecha + probada | `services/firebase/firebase-announcement-repository.js`, `controllers/announcements-controller.js` | `announcements-controller.test` | sí (paso 1) |
| `openNewComunicadoModal` | Hecha + probada (DOM en el controlador; regla de rol importada) | controlador + `announcement-capabilities.js` | controlador | sí |
| `saveNewComunicado` | Hecha + probada | `domain/announcements/announcement-service.js` (`parseNewAnnouncementForm`, `buildAnnouncementPayload`), controlador | payload vs regla de creación del Supervisor, XSS, fallos | sí |
| `updateUnreadBadge` | Hecha + probada | `announcement-service.js` (`computeUnreadBadge`) | diferencial (fijo + 300) | sí |
| `renderGestorComunicados` | Hecha + probada | `announcement-service.js` (`buildGestorComunicadosHtml`) | diferencial byte a byte (300) + XSS | sí |
| `markComunicadoAsRead` | Hecha + probada | `announcement-service.js` (`buildReadReceipt`), repositorio, controlador | idempotencia, regla de escritura única | sí |
| `checkUnreadUrgentAnnouncements` | Hecha + probada | `announcement-service.js` (`findNextUnreadUrgent`) | diferencial (300), cola | sí |
| `markUrgentComunicadoAsRead` | Hecha + probada | controlador | botón "Registrando...", 500 ms, fallo | sí |
| `renderConfigGestores` | Hecha + probada | `domain/users/gestor-config.js`, `services/firebase/firebase-config-repository.js`, `controllers/config-gestores-controller.js` | diferencial de selección y fila; controlador vs copia literal | sí (paso 2) |
| `toggleGestorSplitShift` | Hecha + probada | `gestor-config.js` (`canWriteHasSplitShift`, mensaje), controlador | reglas reales evaluadas, rechazo, cancelación | sí |
| `renderAdminComunicados` | Hecha + probada | `announcement-service.js` (`buildAdminComunicadosRowsHtml`) | diferencial (300) | sí (paso 3) |
| `viewComunicadoContent` | Hecha + probada | `announcement-service.js` (`buildAnnouncementView`) | XSS | sí |
| `viewComunicadoLecturas` | Hecha + probada | `announcement-service.js` (`buildReadersListHtml`, `buildUnreadersListHtml`) | diferencial (200 aleatorios) | sí |
| `deleteComunicado` (+ manejador `#confirmDeleteBtn`) | Hecha + probada | controlador (`requestDelete`, `confirmDelete`) | permisos, fallo, restauración del botón | sí |

Ninguna función quedó "Parcial", "Redundante" ni "No extraíble". `src/entities/` no se creó: no había entidades que valieran más que las funciones.

## 3. Finalidad de las pruebas

- Que el módulo de comunicados (lectura obligatoria de avisos urgentes) siga mostrando el mismo contenido, a las mismas personas, sin abrir un hueco de XSS: es el único texto rico de la aplicación y lo escriben usuarios.
- Que el interruptor de la Pausa de Turno (origen del flag `hasSplitShift`, RN-1..RN-3) escriba solo cuando la base lo permite y que, si no lo permite, el interruptor vuelva a su estado previo en vez de mostrar un permiso que no existe.
- Que lecturas y urgentes sean idempotentes (doble clic o doble lectura no duplican al lector ni dejan al gestor atrapado en el modal).
- Que presencia, contador atómico, historial de accesos e incidentes se puedan probar sin Firebase real, con una base simulada que reproduce transacciones, desconexiones y reglas de lectura/escritura.

## 4. Metodología

- **Arnés:** `src/tests/test-harness.mjs` (`createRunner`; pruebas asíncronas con `testAsync` y `await summarizeAsync()`). Sin frameworks nuevos.
- **Diferencial:** cada algoritmo se copió LITERAL de `app.js` (con números de línea en el comentario) y se compara contra el módulo con entradas fijas y aleatorias con semilla (LCG) en cada archivo de prueba. El HTML se compara byte a byte.
- **Base simulada:** `tests/helpers/fake-rtdb-comunicados.mjs` (set/update/remove/push, `once`/`on`/`off`, `transaction` con primer intento `null` y reintento, `onDisconnect`, `.info/connected`, `orderByChild().limitToLast()`, snapshots con `forEach` que se detiene con `true`, reglas inyectables) y `tests/helpers/fake-dom-comunicados.mjs`.
- **Reglas reales:** `gestor-config.test.mjs` evalúa la expresión `.write` de `users/$uid` de `database.rules.json` (solo lectura) sobre 96 combinaciones y la compara con `canWriteHasSplitShift`; el resto de reglas (`announcements`, `logs`, `readBy`) se reproducen como funciones en las pruebas de controlador y en el e2e.
- **Inyección de dependencias:** los controladores reciben `document`, `repository`, `getUser`, `getAuthUser`, `now`, `alert`/`confirm`, `closeModal`, `setTimeout`, `logger` y `helpers` (`escapeHTML`, `encodeInlineHandlerArg`, `sanitizeAnnouncementHTML`). En el laboratorio `app.js` pasa SUS propios ayudantes (el sanitizador de `app.js` usa el DOM), así el HTML es idéntico.
- **E2E (`comunicados-integrado.e2e.cjs`):** ejecuta las 26 funciones reales en un `vm` DOS veces (app.js original del repo y app.js integrado + bundle real) con 13 escenarios (gestor, supervisor, admin, errores de reglas, XSS) y exige traza idéntica (escrituras, árbol final, `alert`/`confirm`/`console`, estado de cada elemento del DOM, temporizadores) más resultados absolutos por escenario. Se verificó con una mutación del integrado (se rompió la regla de panel filtrado) que el e2e la detecta.
- **Zona horaria:** las pruebas de historial usan hora local; se corrieron con `TZ=America/Bogota`. Las comparaciones diferenciales no dependen de la zona (misma máquina para original y módulo).

## 5. Detalle por módulo probado

**`domain/announcements/announcement-service.js`** (importa `announcement-capabilities.js` y `utils/sanitization.js` sin modificarlos). Orden por fecha, "no leído" por UID (usuario local > sesión de Firebase > `'unknown'`), insignia (Admin/Supervisor nunca), cola de urgentes (más antiguo primero), recibo de lectura, formulario nuevo (recorte + sanitización), autor (nombre > correo > rol > "Usuario", nunca otro rol), payload que cumple la regla de creación del Supervisor, HTML de lista del gestor y de tabla del admin (con o sin botón eliminar), vista de lectura, listas de lectores/pendientes (deduplica cuentas viejas por nombre). Lo usa `app.js` desde `initComunicadosListener()` (6559) hasta `deleteComunicado()` (6961).

**`services/firebase/firebase-announcement-repository.js` + `controllers/announcements-controller.js`.** Suscripción en vivo cancelable, publicar (`push`+`set`), `readBy/{uid}`, eliminar, leer `users`. El controlador conserva el orden de efectos y los textos de cada `alert`. Opciones correctivas apagadas por defecto: `skipIfAlreadyRead`, `keepUrgentModalOpenOnFailure`.

**`domain/users/gestor-config.js`, `firebase-config-repository.js`, `controllers/config-gestores-controller.js`.** Selección (solo Gestores, sin correos "pruebas", deduplicado por correo con `loginTime` más reciente, orden alfabético), fila con el interruptor (texto, estilos y `onchange="toggleGestorSplitShift('uid', this.checked)"` idénticos; flag estricto `=== true`), mensaje de confirmación, y la política `canWriteHasSplitShift`/`canUseSplitShiftConfig`. Cobertura de fallo: Supervisor, Gestor y Admin no aprobado reciben el rechazo de la base, se avisa "Hubo un error al guardar. Intenta de nuevo." y la tabla se repinta con el estado previo. Importa `isSplitShiftEnabled` de `split-shift-policy.js` (no se modifica).

**`domain/incidents/incident-service.js`, `ui/views/incidents-view.js`, repositorio y controlador de incidentes.** Formulario (tipo por omisión "Novedad Operativa", responsable por omisión = nombre del usuario), payload (cumple `uid === auth.uid` de la regla de `logs`), conversión de snapshot (más reciente primero, tope 50), tabla con todo escapado.

**`domain/auth/login-history.js` + repositorio + controlador.** Unión de tres fuentes con prioridad (en vivo > historial > bitácora) y clave `nombre_aaaa-mm-ddThh:mm`, "En Línea" (< 2 min y estado distinto de pausas/inactivo), insignia de puntualidad (A tiempo / +Nm / Fuera de Horario / Descanso, con cruce de medianoche), tabla y filtros. Hora actual por parámetro; no usa `auth-service.js`.

**`services/firebase/presence-service.js`.** `onDisconnect().update({status:'offline',lastHeartbeat})` + `status:'online'`, y escucha de `active_sessions`; ambas devuelven la función de cancelación.

**`domain/analytics/approved-counter.js`, `services/firebase/approved-counter-service.js`, `ui/views/approved-count-view.js`.** Transacción (`(actual||0)+monto`), listener y pintado con animación de 300 ms; el panel filtrado por gestor no se pisa. No se tocó `withdrawal-metrics.js`.

**`domain/schedules/active-supervisors.js` + `controllers/supervisor-badge-controller.js`.** Reglas de turno (horas enteras, 12am/12pm, cruce de medianoche, "turno" sin horas) y texto "A", "A y B", "A, B y C".

## 6. Hallazgos

Convención: lo reproducido está cubierto por una prueba marcada HALLAZGO. Nada se corrigió en silencio: lo corregible va como opción explícita, apagada por defecto.

1. **Stored XSS en "Configuración de gestores" (alto).** `renderConfigGestores` inserta `u.name`, `u.role` y `u.email` SIN escapar (solo el `aria-label` escapa el nombre). El nombre lo escribe el propio usuario al registrarse; el Admin lo vería ejecutarse. Opción: `escapeUserFields: true` (en `buildGestorConfigRowHtml` y en el controlador). Recomendado activarla al llevar el refactor a producción.
2. **Stored XSS en "Historial de accesos" (alto).** Si `loginTime` no es una fecha válida se inserta crudo en la celda. Cualquier gestor aprobado puede escribir su propio registro en `login_history` y `shift_reports` (reglas), de modo que un `loginTime` malicioso se ejecutaría en el navegador de un Supervisor/Admin. Opción: `escapeRawLoginTime: true`.
3. **Lecturas: la regla permite escribir `readBy/{uid}` una sola vez, pero `app.js` usa `set` (medio).** Una segunda lectura (doble clic antes de que llegue el refresco, o el botón del modal urgente de un comunicado ya leído) falla en la base y el usuario ve "Error al marcar como leído.". Además `markComunicadoAsRead` traga el error, así que `markUrgentComunicadoAsRead` cierra el modal igual y este reaparece a los 500 ms. Opciones: `skipIfAlreadyRead` y `keepUrgentModalOpenOnFailure`. Sin nombre (`currentUser.name` indefinido) el SDK rechaza el `set` y la lectura nunca se registra.
4. **Reglas: brecha en `hasSplitShift` (medio, decisión de negocio/seguridad).** `users/$uid.write` permite escribir el flag solo a un Admin aprobado (`canWriteHasSplitShift`, evaluado contra la regla real), pero su segunda rama (`auth.uid === $uid && !data.exists() && newData.exists()`) deja que un usuario cuyo nodo aún no existe cree el suyo con `hasSplitShift: true`, porque el campo no tiene `.validate` (sí lo tienen `role`, `approved`, `email` y `status`). Quedaría habilitado para la Pausa de Turno al ser aprobado. Sugerencia (no aplicada; `database.rules.json` es solo lectura): validar `hasSplitShift` como `role Admin || newData.val() === false`. Un Supervisor no puede escribir el flag (el menú y la vista son solo de Admin: coherente).
5. **Contador de retiros aprobados inoperante.** `database.rules.json` no define el nodo `metrics`: la base lo deniega por omisión, así que ni la transacción ni el listener de `metrics/approvedCount` funcionan (cubierto en prueba y en el e2e C11). Además `incrementApprovedWithdrawal` no se invoca en ningún lado de `app.js`.
6. **Presencia: código muerto con riesgos si se activara.** `setupUserPresence` y `startMonitoringPresence` solo se exponen en `window`. Si se activaran: (a) escriben `status` 'online'/'offline', vocabulario que Monitoreo no entiende, y pisarían "En Pausa de Turno" en cada reconexión; (b) el `onDisconnect().update` recrearía `active_sessions/{uid}` como sesión fantasma después de que `handleEndShift()` la borra, salvo que se cancele al cerrar el turno; (c) el `.then` no tiene `.catch` (el servicio acepta `onError`).
7. **Novedades: lectura restringida y sin manejo de error.** `logs` solo lo leen Admin y Supervisor, pero `startIncidentsRealtimeListener()` se registra en `DOMContentLoaded` para todos los roles y sin callback de error: un Gestor recibe `permission_denied` (el listener queda cancelado), y si el registro ocurre antes de que la sesión de Firebase esté lista puede quedar cancelado también para Admin/Supervisor sin reintento tras el login (a verificar en el laboratorio). El repositorio acepta `onError` opcional.
8. **Historial de accesos: filtros.** "Hoy" compara el día UTC (después de las 19:00 en Colombia el registro de hoy ya no es "hoy"); una fecha inválida hace lanzar `RangeError` al filtrar por fecha (opción `tolerateInvalidDates`).
9. **Urgentes también para Admin/Supervisor.** `checkUnreadUrgentAnnouncements` no excluye roles (la insignia sí); Admin y Supervisor reciben el modal urgente de todo comunicado que no hayan leído. A confirmar si es intencional.
10. **Menores:** la insignia de supervisor solo entiende horas enteras ("7:30am" cae en la rama de "turno") y no incluye a Camilo; sin nodo `users`, "Cargando usuarios..." queda para siempre en Lecturas; `checkUnreadUrgentAnnouncements` lanza `TypeError` si falta `#urgentAnnouncementModal`; `toLocaleString('es-CO')` depende del ICU/zona del navegador.
11. **Corrección de destino del plan:** las filas de login/presencia/contador pedían `auth-service.js`/`withdrawal-metrics.js`; por la asignación de cortes se crearon `domain/auth/login-history.js`, `services/firebase/presence-service.js` y `domain/analytics/approved-counter.js` sin modificar los existentes. La nota "SIN CARPETA PROPIA" de las 14 filas de comunicados queda resuelta: `domain/announcements/announcement-service.js` (y `domain/users/gestor-config.js` para configuración).
12. **Fuera del corte:** `tests/ui/kpi-chart-configs.test.mjs` (corte KPIs, en curso) falla 1 prueba en la regresión; no depende de este corte.

## 7. Log completo

`2026-10-06-log-extraccion-comunicados.txt` (hermano de este informe): salida de las 10 suites nuevas, de las 58 de la regresión, de la integración de laboratorio, del e2e del corte y de las suites e2e del controlador de turno contra el integrado.

Resultado de la integración: `INTEGRADO /tmp/comunicados-integrado.js 47 pasos` (los 6 de este corte aplicados a continuación de los del controlador de turno y de los otros cortes, sin colisión de anclas; el JavaScript resultante pasa la validación de sintaxis) y `BUNDLE_OK` con los 19 espacios de nombres nuevos (el e2e comprueba 14 de ellos).

## 8. Estado frente al criterio de salida y próximos pasos

- **Cubierto:** las 26 funciones tienen módulo, prueba diferencial/de comportamiento y conexión de laboratorio demostrada idéntica (e2e original vs integrado). Entregables propios: `src/entry-comunicados.js` (19 espacios de nombres: `announcementService`, `announcementRepository`, `announcementsController`, `incidentService`, `incidentRepository`, `incidentsView`, `incidentsController`, `gestorConfig`, `configRepository`, `configGestoresController`, `loginHistory`, `loginHistoryRepository`, `loginHistoryController`, `presenceService`, `approvedCounter`, `approvedCounterService`, `approvedCountView`, `activeSupervisors`, `supervisorBadgeController`) y `lab/integracion/pasos/comunicados.mjs`.
- **Pendiente (decisión del responsable):** activar (o no) las opciones correctivas de los hallazgos 1, 2, 3 y 8 al pasar a producción; corregir/validar `hasSplitShift` en `database.rules.json` (hallazgo 4); decidir si el contador de retiros aprobados se habilita (regla `metrics`) o se retira, y si presencia se elimina o se rediseña (5 y 6); aclarar la política de urgentes para Admin/Supervisor (9).
- **Pendiente técnico:** actualizar la tabla de la sección 5 del plan maestro (estado y destino de las 26 filas); llevar los pasos a `app.js` real solo con autorización (§7 del plan).
