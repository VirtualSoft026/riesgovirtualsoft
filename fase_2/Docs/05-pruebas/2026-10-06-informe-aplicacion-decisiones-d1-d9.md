# Informe — Aplicación de las decisiones D1–D9 al refactor (paso 6)

## 1. Encabezado

**Fecha:** 2026-10-06.
**Alcance:** `fase_2/src/` (dominio, controladores, servicios, vistas y pruebas) y la integración del laboratorio (`lab/integracion/aplicar-integracion.mjs`, `lab/integracion/pasos/*.mjs`, `lab/integracion/turno-avance-paso-panel-d1.mjs`). Propuesta de reglas para producción en `2026-10-06-propuesta-reglas-d3-d7.md` (no aplicada).
**Responsable:** Luis Fuentes.
**Fase:** plan maestro §9, paso 6 (cierre de hallazgos antes de conectar a producción).
**Comando:** `/tmp/run-all.sh` (ver sección 4). Producción (`app.js`, `index.html`, `login.js`, `database.rules.json`) **sin tocar**.

## 2. Resumen ejecutivo

| Verificación | Resultado |
|---|---|
| Suites de `src/tests/{controllers,domain,ui,utils}` | **62 suites, 953 pasaron, 0 fallaron** (antes 59 suites / 827) |
| Bundle `RiskOps` | `BUNDLE_VERIFY=PASS` (71 comprobaciones), 110 espacios de nombres, 462,0 KB |
| Integración del laboratorio sobre copia del `app.js` del repo | **59 pasos** aplicados (58 + paso D1 del panel), sintaxis válida |
| `split-shift-flag.unit.cjs --strict` (integrado) | 23/23 |
| `cierre-horas-efectivas.e2e.cjs --strict` (integrado) | 19/19 |
| `monitoreo-render.e2e.cjs` | 7/7 |
| `tareas-integrado.e2e.cjs` | 236/236 |
| `modales-permisos-integrado.e2e.cjs` | 78/78 |
| `historial-navegacion-integrado.e2e.cjs` | 51/51 |
| `kpis-integrado.e2e.cjs` | 20/20 (4 escenarios con diferencia intencional D5/D9b) |
| `comunicados-integrado.e2e.cjs` | 18/18 (diferencias intencionales D2/D4/D6 afirmadas) |
| `turno-avance-panel-horas-efectivas.e2e.cjs` (nueva) | 9/9, panel CONECTADO |
| `parche-pausa-turno.unit.cjs` contra el `app.js` del repo | 5/5 integridad, 21/21 |

## 3. Finalidad de las pruebas

Que cada decisión del responsable sea el **comportamiento predeterminado** del refactor y del laboratorio, sin regresiones en lo que no se decidió cambiar. Las pruebas diferenciales contra copias literales de `app.js` se conservan pasando de forma explícita la opción "legacy"; las e2e integradas que afirmaban paridad en un punto decidido ahora afirman el comportamiento nuevo y documentan la diferencia como intencional (Dx). Se hizo además una contraprueba: reintroducir el comportamiento viejo en el integrado hace fallar las e2e (KPIs 10 escenarios, historial 6, comunicados 6), así que detectan una regresión.

## 4. Metodología

Node 22, arnés propio `src/tests/test-harness.mjs` (`createRunner`, `testAsync`), sin frameworks nuevos. Cuatro frentes en paralelo con zonas de archivos disjuntas (turno-avance: D1/D8; aprobaciones: D2/D7/D9a + propuesta D3/D7; comunicados: D2/D4/D6/D9c; kpis-supervisores: D5/D9b), cada uno con su log; luego integración y regresión completa en un solo script (`/tmp/run-all.sh`): todas las suites, build + `verify-bundle.mjs` en un entorno aislado, `riskops-integrate` sobre una copia del `app.js` del repo y las 10 pruebas e2e/unitarias de `app.js`. Las zonas horarias se fijan inyectando `timeZone` o con `process.env.TZ` en un proceso hijo.

## 5. Detalle por decisión

| # | Qué cambió | Antes → después | Pruebas | Laboratorio |
|---|---|---|---|---|
| D1 | Nuevo `domain/shifts/effective-time.js` (`RiskOps.effectiveTime`), única fórmula: turno − almuerzo − desayuno − Pausa de Turno − inactividad. La usan el cierre/correo (`calculateShiftClosureTimes`) y el panel (`computeReportEffectiveMinutes`, y la tarjeta "Duración Promedio" de `calcularIndicadores`). La penalidad de conectividad se sigue calculando y mostrando (`Exceso_Pausas_Penalidad`), pero ya no se resta. Inactividad: `inactividadTotalMins` del reporte; en reportes antiguos, penalidad − excesos (≥ 0). | 10 h, almuerzo 75, desayuno 20, inactividad 10: correo 7,92 h → **8,25 h** (antes el exceso se contaba dos veces). Ejemplo del plan (08:00–18:00, almuerzo 30, pausa 180): **6,50 h** sin cambio. Correo y panel coinciden en 400 cierres aleatorios. | `shift-effective-time-d1` 18 (nueva), `shift-report-view` 16, `shift-closure-times-split` 12, `shift-controller` 21; e2e cierre 19/19 y panel 9/9 | Correo: conectado (fragmento de tiempos de `handleEndShift`). Panel: conectado (paso `PANEL_D1_STEP`, importado por `pasos/kpis.mjs`) |
| D2 | Escape por defecto de `role` (usuarios pendientes), `nombre/rol/correo` y `uid` en atributos (Configuración de gestores) y `loginTime` inválido (Historial de accesos). Se revisó el resto del HTML de aprobaciones, permisos, comunicados y novedades: ya escapaba. | Datos de usuario pintados crudos → escapados (`<script>`, `<img onerror>`, comillas, `</td><svg onload>`). | `approvals-decisiones` 27 (nueva), `approvals-components` 29, `gestor-config` 14, `login-history` 13, `config-gestores-controller` 13; e2e X1 | Conectado |
| D3 | Solo propuesta de reglas con los nombres REALES: `role`, `approved` (`false`/`true`/`'Rechazado'`), `status: "pending"`, solicitante del permiso = `uid` (no existe `requestedBy`). (a) alta propia sin `hasSplitShift` ni campos extra; (b) quien decide un permiso ≠ `uid` del permiso, y `uid` inmutable; (c) rol exigido también en la validación de campos de aprobación. | — | 40 casos en un evaluador local simplificado (no sustituye al emulador) | **Producción**, no aplicada |
| D4 | Antes de escribir `readBy/{uid}` se comprueba si ya está leído; si la escritura es rechazada y la lectura ya existe, se da por leído sin aviso; si es un fallo real (red, sin lectura previa) se avisa, no se marca y el modal queda abierto con reintento. | Modal urgente en bucle cada 500 ms con "Error al marcar como leído." → se cierra una sola vez. | `announcements-controller` 37, `announcement-service` 29 (evaluador de la regla real de `database.rules.json`) | Conectado |
| D5 | `corregirBugs` y `fechaLocal` encendidos: análisis con 2+ gestores, "mes anterior" = mes calendario completo (29/30/31-mar → febrero, bisiestos, 31-ene → diciembre), día operativo = fecha LOCAL de inicio del turno (`loginTime` → `horaInicio` → cierre). Se confirmó que los KPIs ya se calculan desde el historial filtrado por rango y gestores (JSON operativo + `shift_reports` + `users`). | `TypeError` y modal sin abrir → resumen del equipo; 31-mar contaba marzo → febrero; turno 22:00–06:00 en UTC−5 ya no salta de día. | `kpi-operativo-analysis` 18, `kpi-service` 20, `kpi-controller` 23, `kpi-data-sources` 12 | Conectado |
| D6 | Presencia y contador de retiros aprobados nacen **apagados** (`enabled: false`, no-op); el JSDoc deja escrito cómo reactivarlos (reglas `metrics` primero, diseño después, `enabled: true`). | Hallazgo: `app.js` sí registraba en cada carga el listener de `metrics/approvedCount`, que la base rechaza → ahora ninguna llamada a la base. | `presence-and-counter` 20 (base espía sin llamadas; diferencial con `enabled: true`) | Conectado (inactivo) |
| D7 | Cliente: guarda "enviando" por fila y botones deshabilitados desde el primer clic (se libera si falla o se cancela); rol validado antes de escribir (usuarios: Admin; permisos: Admin o Supervisor). Reglas: ver D3(c). | Dos clics → dos escrituras → una. Sin rol → "No tienes permiso…" y sin escritura. | `approval-policy` 37, `approvals-decisiones`; e2e U12, P10, S1, S2 | Conectado (cliente); reglas = **Producción** |
| D8 | `formatProgress(current, total)` en `domain/tasks/task-progress.js` (`Math.round`, 0 si total es 0 o inválido), usado por el latido, la tarjeta KPI y la tarjeta de Monitoreo del supervisor. | La tarjeta sumaba dos porcentajes redondeados (33 + 33 = 66 %) → 67 % igual que el latido. | `task-pure-rules` 23, `task-views` 12, `monitoring-view` 16; e2e K5, K7 | Conectado |
| D9a | Filtro "Rechazados" (añadido por el controlador al selector existente, sin tocar `index.html`) con motivo y botones "Revertir" (escribe `{approved: false, rejectionReason: null}`, inverso exacto del rechazo) y "Aprobar". | Rechazados invisibles e irreversibles desde pantalla → visibles y reversibles. | `user-approval-list` 12, `firebase-approvals-repository` 12; e2e R1, R2 | Conectado (global `revertRejectedUser`) |
| D9b | Nuevo `domain/schedules/supervisor-directory.js`: supervisor = `users/{uid}/role` exactamente `'Supervisor'` o `'Admin'`; con uid decide el uid; con solo nombre, nombre completo normalizado EXACTO. `excludedNames` (lista fija) ya no se admite salvo en modo legacy explícito. | "Mariana" quedaba oculta por subcadena → visible. | `kpi-supervisor-directory` 6 (nueva), `kpi-metrics-calculator` 32, `active-supervisors` 10, `monitoring-controller` 13 | KPIs y Monitoreo: conectados. Insignia "Sup:": modo transitorio (ver §6) |
| D9c | Política explícita: Admin, Supervisor y Gestor reciben el modal urgente bloqueante con confirmación obligatoria (rol desconocido = gestor). | `app.js` ya lo hacía; ahora es regla escrita y probada. La insignia de no leídos sigue excluyendo a Admin/Supervisor. | `announcements-controller`; e2e C14 | Conectado (paridad total) |

## 6. Hallazgos y puntos abiertos

1. **Insignia "Sup:" para gestores (D9b).** Las reglas no dejan a un Gestor leer `users`, así que con D9b no puede saber quién es supervisor. La insignia queda en **modo transitorio** (lista fija con nombre completo exacto, no subcadena) hasta decidir en producción, por ejemplo, un nodo público `supervisors_public`.
2. **Oriana Borja** tiene rol `Gestor` en los datos del emulador; con D9b deja de ocultarse. Si es supervisora, corregir su rol en `users`.
3. **D3 (b)**: con la regla aplicada, un Admin o Supervisor no puede resolver su propio permiso; hay que decidir quién lo resuelve (con un solo Admin y ningún Supervisor nadie podría). Los permisos antiguos sin `uid` quedan fuera de la regla. El `emulator_data` no tiene ningún Admin: crearlo para probar.
4. **Registro como "Supervisor" desde `login.js`**: ya falla hoy con las reglas actuales y deja la cuenta de Auth creada sin nodo en `users` (hallazgo de producción).
5. **D1**: la penalidad usa la inactividad tal cual se registra y la fórmula resta la inactividad limpia (sin solapes con pausas), así que la penalidad informativa puede ser mayor que lo restado; en reportes antiguos la inactividad derivada puede quedar algo alta.
6. **D8**: los dos arcos del círculo de la tarjeta KPI siguen redondeándose por separado (1 + 1 de 3 → arcos 33 + 33 con texto 67 %).
7. **D9a**: "Todos" no incluye a los rechazados (solo su filtro); "Revertir" borra `rejectionReason` y no deja historial del rechazo.
8. **D4**: un usuario sin `name` no puede registrar la lectura (el SDK rechaza `undefined`) y ahora queda con el modal abierto para reintentar; sin conexión, el SDK deja la escritura en espera y el botón queda en "Registrando...". El filtro "Hoy" de comunicados sigue comparando en UTC (`tolerateInvalidDates` apagada).
9. **D5**: `calcularIndicadores` sigue en `app.js` (sin extraer) y filtra por hora de cierre en ventanas de 7×24 h y 30×24 h: un turno nocturno puede caer en "hoy"/"ayer" del día siguiente; al extraerlo debe usar `RiskOps.kpiService.resolveOperativeDayKey`. El contador `metrics/approvedCount`, si se reactiva (D6), no debe sobrescribir la tarjeta filtrada.

## 7. Log completo

`2026-10-06-log-aplicacion-decisiones-d1-d9.txt` (regresión completa, bundle, integración y e2e). Logs por frente: `2026-10-06-log-decisiones-{turno-avance,aprobaciones,comunicados,kpis-supervisores}.txt`.

## 8. Estado frente al criterio de salida y próximos pasos

Las nueve decisiones están aplicadas en el refactor y en el laboratorio, excepto lo que vive en `database.rules.json` (D3 y las reglas de D7), que queda como propuesta exacta en `2026-10-06-propuesta-reglas-d3-d7.md`. Próximos pasos: (1) prueba manual en el laboratorio (`Iniciar_Laboratorio_Fase2.bat`), con los escenarios de la propuesta de reglas en el emulador; (2) decidir los puntos 1 y 3 de la sección 6; (3) con autorización explícita, aplicar las reglas y llevar la integración (59 pasos) a `app.js`/`index.html` según el plan §7.
