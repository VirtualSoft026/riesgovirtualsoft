# Informe: extracción "Historial, perfil, navegación y monitoreo" (corte `historial-navegacion`)

## 1. Encabezado

| Campo | Valor |
|---|---|
| Fecha | 2026-10-06 |
| Alcance | 17 funciones de `app.js` de la sección "Historial, perfil, navegación y monitoreo" del plan maestro (todas "No iniciada") |
| Responsable | Agente de extracción (corte `historial-navegacion`) |
| Fase | Fase 2 de `hoja-de-ruta.md` (paso 6: extracción por cortes) |
| Producción | `app.js`, `index.html`, `login.js`, `database.rules.json` **sin tocar** (referencia de solo lectura) |
| Comandos | Ver más abajo; log completo en `2026-10-06-log-extraccion-historial-navegacion.txt` |

```
cd fase_2/src
node tests/domain/auth-service.test.mjs
node tests/domain/shift-report-view.test.mjs
node tests/domain/monitoring-view.test.mjs
node tests/domain/historial-repositories.test.mjs
node tests/ui/shift-reports-view.test.mjs
node tests/controllers/app-router.test.mjs
node tests/controllers/monitoring-controller.test.mjs
node tests/controllers/shift-reports-controller.test.mjs
node tests/controllers/profile-notifications-controller.test.mjs
node /tmp/riskops-bundle.mjs /tmp/historial-bundle.js          # compila src/entry.js (incluye entry-historial-navegacion.js)
node /tmp/riskops-integrate.mjs /tmp/historial-integrado.js    # aplica TODOS los pasos del laboratorio y valida la sintaxis
node tests/e2e/historial-navegacion-integrado.e2e.cjs <app.js original> /tmp/historial-integrado.js /tmp/historial-bundle.js
```

## 2. Resumen ejecutivo

| Archivo | Pruebas | Resultado |
|---|---|---|
| `tests/domain/auth-service.test.mjs` | 16 | 16 / 0 |
| `tests/domain/shift-report-view.test.mjs` | 13 | 13 / 0 |
| `tests/domain/monitoring-view.test.mjs` | 14 | 14 / 0 |
| `tests/domain/historial-repositories.test.mjs` | 7 | 7 / 0 |
| `tests/ui/shift-reports-view.test.mjs` | 7 | 7 / 0 |
| `tests/controllers/app-router.test.mjs` | 9 | 9 / 0 |
| `tests/controllers/monitoring-controller.test.mjs` | 10 | 10 / 0 |
| `tests/controllers/shift-reports-controller.test.mjs` | 10 | 10 / 0 |
| `tests/controllers/profile-notifications-controller.test.mjs` | 9 | 9 / 0 |
| **Unitarias nuevas** | **95** | **95 / 0** |
| `tests/e2e/historial-navegacion-integrado.e2e.cjs` (original vs integrado, 49 escenarios) | 49 | 49 / 0 |

Verificaciones del laboratorio con el app.js **integrado** (todos los pasos de `lab/integracion/pasos/`): `split-shift-flag.unit.cjs --strict` 23/23, `cierre-horas-efectivas.e2e.cjs --strict` 13/13, `monitoreo-render.e2e.cjs` 7/7, `tareas-integrado.e2e.cjs` 234/234.

Regresión de todas las suites de `src/tests/{domain,utils,ui,controllers}`: ver el log (sección "Regresión completa"). Una suite ajena a este corte falla en el momento de la corrida (ver hallazgo H11).

## 3. Finalidad de las pruebas

- **Permisos y navegación (riesgo de seguridad/operación):** que cada rol vea exactamente las pestañas que hoy ve (Admin ve Configuración de Gestores y la aprobación de usuarios; el Supervisor no; el Gestor no ve Administración) y en el mismo orden. Un error aquí expone u oculta funciones administrativas.
- **Contraseña (riesgo de seguridad):** que el cambio de contraseña use la autenticación inyectada, no registre ni devuelva la contraseña y conserve los mensajes de error de Firebase.
- **Monitoreo (riesgo operativo):** el supervisor decide con estas tarjetas quién está en línea, en pausa o inactivo. Se verifica que el estado (incluida la corrección de "En Pausa de Turno"), los filtros, la tardanza, el avance de tareas y la bitácora sean idénticos a producción.
- **Historial de turnos (riesgo de datos):** filtros, orden, ventana de 2 días, modal "Ver Todo" y PDF salen de los mismos reportes guardados; cualquier diferencia cambiaría lo que el supervisor audita.
- **Tiempo efectivo del panel:** dejar documentado y probado qué resta hoy el panel (la Pausa de Turno sí; la penalidad de conectividad no), sin decidir por el negocio.

## 4. Metodología

- Arnés propio `tests/test-harness.mjs` (sin frameworks nuevos); pruebas asíncronas con `testAsync` y `await summarizeAsync()`.
- **Diferenciales:** cada prueba con lógica no trivial contiene una **copia literal** del algoritmo de `app.js` (con números de línea) comparada con el módulo nuevo sobre entradas fijas y aleatorias con semilla (mulberry32): filtros de reportes (400 casos), bitácora (200), tiempo efectivo (600), insignia de retraso (1500), filtro de sesiones (1200), avance de tareas (800), lista de tareas (600), bitácora de Monitoreo (800), detalle de tareas (700) y el ordenamiento de la barra lateral por rol (con cada elemento ausente por separado). Las pruebas pasan también con `TZ=America/Bogota`.
- **Plantillas HTML:** son copia literal de `app.js` generada por extracción; su paridad se demuestra en la e2e (HTML completo de tarjetas, tablas, modales y PDF, original contra integrado).
- **e2e integrada:** se extrae de cada `app.js` el tramo contiguo `// Exportar Reporte a PDF` … `// --- Lógica del Portal de Indicadores` y se ejecuta en un `vm` (con el bundle real `RiskOps` para el integrado), con DOM, Firebase, reloj y `window.html2pdf` simulados; cada escenario corre contra ambas versiones y se compara todo el estado observable (HTML, estilos, clases, alertas, errores, lecturas/escrituras en Firebase, temporizadores). Se verificó que la prueba **detecta** diferencias (mutando el bundle: 7 escenarios fallan).
- Valores de contraseña: solo ficticios.

## 5. Detalle por módulo probado

Función → estado → módulo → pruebas → conexión al laboratorio:

| Función de `app.js` | Estado | Módulo(s) | Pruebas | Conectada al lab |
|---|---|---|---|---|
| `exportShiftReport` | Hecha + probada | `domain/shifts/shift-report-view.js` (nombre de archivo, opciones PDF, bitácora), `ui/views/shift-reports-view.js` (HTML del PDF), `controllers/shift-reports-controller.js` | shift-report-view, shift-reports-view, shift-reports-controller, e2e | Sí (bloque A) |
| `renderShiftReports` | Hecha + probada | `controllers/shift-reports-controller.js`, `services/firebase/firebase-shift-reports-repository.js`, `shift-report-view.js` (`collectGestorOptions`) | controller, repositorios, e2e | Sí (A) |
| `applyShiftReportsFilters` | Hecha + probada | `shift-report-view.js` (`filterShiftReports`, mensajes), `shift-reports-view.js` (fila), controlador | diferencial 400 casos, controller, e2e | Sí (A) |
| `openShiftDetailModal` | Hecha + probada | `shift-reports-view.js` (`buildShiftDetailHtml`), controlador | shift-reports-view, controller, e2e | Sí (A); ver H1 |
| `toggleNotifications` | Hecha + probada | `controllers/notifications-controller.js` | profile-notifications, e2e | Sí (A) |
| `markAllAsRead` | Hecha + probada | `domain/auth/notification-rules.js`, `services/firebase/firebase-notifications-repository.js`, controlador | auth-service, repositorios, controller, e2e (Admin/Supervisor/Gestor, uid de Auth, sin uid) | Sí (A) |
| `openProfileModal` | Hecha + probada | `controllers/profile-controller.js` | profile-notifications, e2e | Sí (A) |
| `toggleProfilePassword` | Hecha + probada | `controllers/profile-controller.js` | profile-notifications, e2e | Sí (A) |
| `changePassword` | Hecha + probada | `domain/auth/auth-service.js` (reglas, mensajes, `changeUserPassword` con auth inyectada), `profile-controller.js` | auth-service (incluye "el resultado nunca contiene la contraseña"), controller, e2e (vacío, éxito, sin sesión, 3 errores) | Sí (A) |
| `alignAdministrativeControlsByRole` | Hecha + probada | `auth-service.js` (`buildAdministrativeControlsPolicy`), `app/app-router.js` | diferencial vs original (4 roles + sin usuario), e2e | Sí (B) |
| `setupSidebar` | **Parcial** | `auth-service.js` (`buildSidebarPolicy`, `buildBreakButtonsPolicy`), `app/app-router.js` (`applyRoleNavigation`, `applyBreakButtonsVisibility`). Queda en `app.js`: fusión Horario/Teletrabajo (DOM propio) y el bloque del botón de Pausa de Turno (controlador de turno) | diferencial del orden (todos los roles, elementos ausentes), e2e con la función real completa | Sí (C y D) sin tocar el ancla del controlador de turno |
| `updateNavigation` | **Parcial: extraída, no conectada** | `app-router.js` (`updateNavigation({refreshSplitShiftButton, setupSidebar})`) | app-router, e2e (llamada a la función real) | No: son 7 líneas y la primera sentencia es el ancla del controlador de turno (`toggleSplitShiftBtn`) |
| `startActiveSessionsListener` | Hecha + probada | `services/firebase/firebase-monitoring-repository.js`, `controllers/monitoring-controller.js` | repositorios, controller, e2e (datos, vacío, error) | Sí (E) |
| `renderActiveSessionsDashboard` | Hecha + probada (usa `active-session-status.js` sin modificarlo) | `domain/analytics/monitoring-view.js` (filtros, tarjeta, avance, tareas, tardanza), controlador | 5 diferenciales + controller + e2e (14 escenarios de filtros × cronograma) | Sí, **delegación con respaldo** (F): ver nota |
| `viewTimelineInMonitoreo` | Hecha + probada | `monitoring-view.js` (`buildVisibleTimeline`, filas), controlador | diferencial 800 sesiones, controller, e2e | Sí, delegación con respaldo (G) |
| `openMonitoreoDetails` | Hecha + probada | `monitoring-view.js` (`buildDetailDisplayTasks`, tarjeta de tarea), controlador | diferencial 700 sesiones, controller, e2e | Sí (H) |
| `populateGestoresDropdown` | Hecha + probada | `firebase-monitoring-repository.js` (`extractApprovedGestorNames`), controlador | repositorios, controller, e2e | Sí (H) |

Piezas extra de este corte: `calculateShiftDelay` (la insignia HTML) quedó portada en `monitoring-view.js` (`buildShiftDelayBadgeHtml`, diferencial 1500 casos) y `computeReportEffectiveMinutes`/`parseShiftReportTime` (panel de reportes, ver H2) en `shift-report-view.js` (no conectadas; viven dentro de `calcularIndicadores`, del corte de KPIs).

**Nota de la delegación con respaldo (F/G):** las suites existentes (`split-shift-flag`, `monitoreo-render`, `parche-pausa-turno`) extraen el *texto* de `renderActiveSessionsDashboard`/`viewTimelineInMonitoreo` y lo ejecutan en un `vm` sin el bundle. Por eso el paso inserta al inicio `if (typeof RiskOps !== 'undefined' && typeof __histNav === 'function') return …` y deja el cuerpo original como respaldo; con el bundle cargado (laboratorio) siempre se usa el controlador (la e2e lo demuestra: mutar el bundle rompe los escenarios). Al terminar la Fase 3 el cuerpo de respaldo puede borrarse.

**Archivos de código nuevos** (rutas relativas a `fase_2/`): `src/domain/auth/auth-service.js`, `src/domain/auth/notification-rules.js`, `src/domain/shifts/shift-report-view.js`, `src/domain/analytics/monitoring-view.js`, `src/services/firebase/firebase-{notifications,shift-reports,monitoring}-repository.js`, `src/ui/views/shift-reports-view.js`, `src/app/app-router.js`, `src/controllers/{monitoring,shift-reports,profile,notifications}-controller.js`, `src/entry-historial-navegacion.js` (13 espacios de nombres: `authService`, `notificationRules`, `shiftReportView`, `monitoringView`, `notificationsRepository`, `shiftReportsRepository`, `monitoringRepository`, `shiftReportsHtml`, `appRouter`, `monitoringController`, `shiftReportsController`, `profileController`, `notificationsController`).

## 6. Hallazgos

- **H1. `openShiftDetailModal` está anidada dentro de `applyShiftReportsFilters`** (app.js 4730): una llave sin cerrar la deja asignada a `window` solo tras un filtrado *con filas*. En producción funciona porque los botones "Ver Todo" solo existen cuando hay filas. Se porta como método normal del controlador (existe siempre). Sin efecto visible. Conviene corregir la estructura al migrar.
- **H2. Panel de reportes — tiempo efectivo (decisión de negocio ABIERTA, no decidida aquí).** `calcularIndicadores()` (app.js 5927-5948) **sí resta `tiempoPausaTurnoMins`** (regla "la Pausa de Turno no es tiempo trabajado" cumplida) pero **no resta la penalidad de conectividad**, mientras que el correo de cierre (`calculateShiftClosureTimes`) sí. Ejemplo probado: 10 h, almuerzo 75, desayuno 20, pausa 120, penalidad 30 → panel 385 min (6,42 h) frente a correo 355 min (5,92 h). `computeReportEffectiveMinutes(report, { subtractConnectivityPenalty })` ofrece ambas variantes (por defecto, la actual, fiel a app.js). Observación adicional: la penalidad ya incluye el exceso de almuerzo/desayuno que a la vez se resta completo, por lo que el correo cuenta ese exceso dos veces; también es una decisión de negocio.
- **H3. Lista de supervisores excluidos por subcadena:** `SUPERVISORES_NOMBRES` incluye `Sara`, `Maria`, `Camilo`, `Oriana` y se compara con `includes`; cualquier gestor cuyo nombre contenga esas letras (p. ej. "Mariana", "María José") se oculta de Monitoreo. Portado fiel y cubierto por una prueba que lo documenta.
- **H4. Rol "Auditor":** no existe en `app.js` ni en `index.html`. Cualquier rol distinto de Admin/Supervisor cae en la rama Gestor (`else`); la prueba lo fija.
- **H5. `exportShiftReport`:** si el motor de PDF falla, el contenedor temporal queda en el `body` (no hay `finally`). Portado fiel; documentado en la prueba.
- **H6. Sin escapar:** `${ev.type}` en la bitácora de Monitoreo (valores internos, bajo riesgo) y, en la rama KPI, `report.gestor`. El primero se porta fiel.
- **H7. Mutación eliminada:** el original ponía `session.status = 'Inactivo'` en el objeto compartido al renderizar sesiones sin latido; el nuevo calcula el estado sin mutar. Sin efecto visible (el estado se recalcula en cada render y la bitácora trata igual "En Línea" e "Inactivo").
- **H8. Código muerto no portado:** `lastActiveTime`, `statusBadge` y `statusDot` de la tarjeta se calculaban y no se usaban.
- **H9. Rendimiento:** `tbody.innerHTML +=` por fila (cuadrático) pasa a una sola asignación; el DOM final es el mismo.
- **H10. Robustez:** si falta `adminNavGroup`, el original lanzaba `TypeError` al anexar Monitoreo; el router lo omite (única diferencia de comportamiento de la navegación, probada). Además `AVAILABLE_AVATARS` es una copia de la lista de `app.js` (hay otra copia local en app.js 2795): conviene unificar en la Fase 3.
- **H11. Fallas ajenas al corte detectadas durante la regresión (no tocadas):** `tests/ui/operativo-chart-configs.test.mjs` ("diferencial vs app.js 8085-8150 (drawCombinedChart)"; corte de KPIs, en curso) y `tests/e2e/modales-permisos-integrado.e2e.cjs` (U5 y P9 fallan también **sin** el paso de este corte aplicado: se comprobó integrando solo los pasos del controlador de turno y de modales/permisos).
- **H12. Texto original con errata conservada:** "…historial antiguo complete." (app.js 4838); se conserva para no cambiar textos visibles.

## 7. Log completo

`2026-10-06-log-extraccion-historial-navegacion.txt` (suites nuevas, regresión de `src/tests/{domain,utils,ui,controllers}`, integración de laboratorio, e2e propia y suites del laboratorio contra el integrado).

## 8. Estado frente al criterio de salida y próximos pasos

- Las 17 funciones quedan extraídas con pruebas: 15 "Hecha + probada", 2 "Parcial" (`setupSidebar`: el resto es DOM de la página y el botón de Pausa de Turno; `updateNavigation`: extraída, no conectada).
- **Laboratorio:** paso `lab/integracion/pasos/historial-navegacion.mjs` con 8 anclas (bloque A: historial/notificaciones/perfil; B: `alignAdministrativeControlsByRole`; C/D: orden por rol y botones de Almuerzo/Desayuno dentro de `setupSidebar`, sin tocar el bloque de `toggleSplitShiftBtn`; E: listener; F/G: render y bitácora con respaldo; H: detalle y desplegable). `node /tmp/riskops-integrate.mjs` aplica todos los pasos (41 en el momento de la corrida) sin colisiones y valida la sintaxis.
- Pendiente: (1) decisión de negocio H2; (2) al pasar a Fase 3, borrar los cuerpos de respaldo de F/G y unificar `availableAvatars`/`SUPERVISORES_NOMBRES` en `src/config`; (3) corregir H3 si el negocio lo confirma (comparar por nombre completo); (4) conectar `computeReportEffectiveMinutes` cuando el corte de KPIs migre `calcularIndicadores()`.
