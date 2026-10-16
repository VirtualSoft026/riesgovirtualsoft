# Informe — Fase 3, paso 3.2: verticales de tareas, turno y cierre, monitoreo, KPIs y navegación/modales

## 1. Encabezado

- **Fecha:** 2026-10-16
- **Rama de trabajo:** `backup/fase2-refactor-2026-10-03` (no se hizo commit, push, merge ni rebase)
- **Paso del plan:** 3.2 de `plan-fase-3.md` (sección 8), con las cinco verticales que el responsable cerró en el chat: tareas (W-19); turno y cierre (W-17, W-21); monitoreo (W-18, W-42, W-50); KPIs (W-16); navegación y modales (W-20, W-22, W-23).
- **Alcance autorizado:** `app.js`, `src/`, `build/`, `fase_2/lab/` (referencias congeladas y suite) y la documentación del paso.
- **Estado:** trabajo técnico terminado y verificado. Los cambios están escritos en la carpeta del equipo con verificación de fecha de modificación (ver sección 7). Quedan pendientes los planes manuales por vertical (sección 5).
- **Log completo:** `2026-10-16-log-fase3-paso-3-2.txt`, en esta misma carpeta.

## 2. Qué se hizo

El paso se hizo en el orden del plan: tareas, turno y cierre, monitoreo, KPIs y navegación. Cada vertical movió su lógica a `src/` y dejó en `app.js` solo envoltorios hacia el controlador correspondiente. Después del balance, el responsable autorizó dos ajustes que se hicieron en la misma vertical: la delegación de `approveUser` y `toggleTree` (W-50) y la corrección del redondeo «1h 60m».

**Tareas (W-19).** El latido de la sesión activa (`syncActiveSessionToFirebase`) usa ahora `createSessionSyncController` con el repositorio de tareas. El payload no incluye `tasks`. Se retiró `migrateLocalTasksToActiveSession` de `app.js`, porque no tenía llamadas: la migración la ejecuta el controlador. La prueba `tareas-integrado` pasa 238/238 con paridad frente al original.

**Turno y cierre (W-17, W-21).** `handleEndShift` (validación de tareas y SET, limpieza de `localStorage`, `signOut`, envío por FormSubmit y redirección) vive en `src/controllers/shift-closure-controller.js`. Las tres pausas (`toggleBreakfastBreak`, `toggleLunchBreak`, `toggleSplitShiftBreak`) son envoltorios hacia el controlador de turno. Pruebas: `cierre-turno-integrado` 40/40, `cierre-horas-efectivas` 19/19, `split-shift-flag` 23/23 sin brechas abiertas.

**Monitoreo (W-18, W-42, W-50).** `renderActiveSessionsDashboard` y `viewTimelineInMonitoreo` pasaron a `monitoringController`. Se borraron los dos cuerpos de respaldo y `SUPERVISORES_NOMBRES`, que pasa a la regla D9b. El listener de `active_sessions` es único, se desuscribe con `stopActiveSessionsListener` y no se duplica al reiniciarse. Las escrituras de la tarjeta, la bitácora y el detalle escapan el HTML. En W-42, la tardanza de Monitoreo tiene una sola copia en `app.js` (`calculateShiftDelay` retirado; el badge ya estaba comparado con 0 diferencias). En W-50 se quitó el `addEventListener` duplicado de `closeMonitoreoModalBtn`. Pruebas: `monitoreo-render` 7/7, `monitoring-controller` 15/15.

**KPIs (W-16).** `calcularIndicadores` vive en `kpi-controller.js`. Se retiraron siete funciones de gráficas que quedaron sin llamadas y el cierre `parseTime` inline. Las horas efectivas usan una sola fórmula, `computeShiftDurations` (D1): duración menos almuerzo, desayuno, Pausa de Turno e inactividad; la penalidad de conectividad es informativa. La prueba diferencial `kpi-calculo-diferencial` compara 637 casos contra la referencia pre-KPI y no encuentra diferencias. La regla de gestor de `calcularIndicadores` y la de Control Operativo siguen separadas (DE-15, sin decidir).

**Navegación y modales (W-20, W-22, W-23 parcial).** `setupSidebar` completo y la fusión Horario/Teletrabajo viven en `src/app/app-router.js`. El cierre de modales por fondo y Escape vive en `ui/components/modal.js` (`bindModalDismissal`, que devuelve la función para retirar sus listeners). El filtro por responsable vive en `task-tree-view.js`. Se retiró la rama de `permisoModal`, porque ese id no existe en `index.html` y nunca se ejecutaba. Se retiraron 16 funciones de `app.js` sin llamadas en el propio archivo, en el HTML ni en `onclick`. Pruebas: `historial-navegacion-integrado` 51/51, `navigation-dismissal` 5/5, `app-router` 9/9.

**Delegación de manejadores (W-50, ajuste posterior).** `approveUser` (el botón Aprobar de la tabla de usuarios, en filas pendientes y rechazadas) y `toggleTree` (los encabezados del árbol) dejan de llevar `onclick`. Usan `data-action` y un listener único en el documento (`src/utils/action-delegation.js`). Se retiraron sus envoltorios de `app.js`. Esto reduce el número de manejadores en línea que dependen de globales y prepara la política de CSP sin scripts en línea.

**Redondeo (W-16, ajuste posterior).** `computeAvgShiftDuration` y `formatInactividadLabel` acarrean a la hora los minutos que redondean a 60: 119.6 minutos se muestran como «2h 0m» y no como «1h 60m». Sin acarreo los valores no cambian.

## 3. Verificación

| Comprobación | Resultado |
|---|---|
| `build/build.mjs` | BUNDLE_OK, 125 módulos (124 del balance de navegación más `utils/action-delegation.js`) |
| `build/verify-bundle.mjs` | PASS, 71 comprobaciones |
| Suite de laboratorio (`suite-pruebas.mjs`) | TODO EN VERDE |
| Unitarias | 85 archivos, 1384 pruebas, 0 fallas |
| Integración | 1 archivo, 1 prueba, 0 fallas |
| E2E (paridad con el original y prueba diferencial) | 12 archivos, 624 pruebas, 0 fallas |
| Motor operativo (`test_motor_operativo.py`) | 4/4 |
| Intentos de red bloqueados durante la suite | 0 |
| Verificación de bytes en el equipo | 20 de 20 archivos iguales a los paquetes |

El log de la corrida final es `lab-root/pruebas/resultado-2026-10-16-17-27-44.txt`. Las pruebas E2E por archivo fueron: split-shift-flag 23, cierre-horas-efectivas 19, cierre-turno-integrado 40, monitoreo-render 7, tareas-integrado 238, modales-permisos-integrado 80, historial-navegacion-integrado 51, kpis-integrado 22, kpi-calculo-diferencial 91, comunicados-integrado 18, turno-avance-panel-horas-efectivas 9, parche-pausa-turno 26.

## 4. Diferencias aceptadas (requieren confirmación del responsable)

- **Redondeo de tiempos.** Antes, 119.6 minutos aparecían como «1h 60m»; ahora «2h 0m». Es un cambio visible para el usuario en el indicador de inactividad y en el promedio de duración de turno. Ninguna comparación de las pruebas diferenciales cae en el acarreo, así que no hay números verificados que cambien.
- **Errores de aprobación.** Antes, un error al aprobar un usuario desde el `onclick` quedaba como promesa sin capturar. Ahora pasa por `fireAndLog` y queda registrado en consola. El aviso al usuario no cambia.
- **Doble manejador de Monitoreo.** `closeMonitoreoModalBtn` ejecutaba dos veces el mismo cierre (uno en el HTML y otro en JS). Ahora ejecuta uno. El resultado visible no cambia.
- **Rama de `permisoModal`.** Se retiró porque nunca se ejecutaba.
- **Duplicados de tardanza e inactividad.** No se tocaron; siguen en W-42 (sección 5).

## 5. Pendientes del paso y observaciones

- **Planes manuales por vertical.** El criterio de salida de cada vertical exige el plan manual de esa área. No se pudo ejecutar en un navegador real porque requiere Firebase y una sesión de usuario. Quedan pendientes de ejecución por el responsable. Este informe no los da por cumplidos.
- **W-23 parcial.** El desmontaje completo (`shutdown` de `initApp`, temporizadores de `app.js`) va en el paso 3.6, cuando `app.js` deje de existir.
- **W-42 parcial.** Quedan implementaciones duplicadas de tardanza (`computeLoginDelay`, `getTardiness`, `evaluateReportLateness`, `kpi-service`) y las sumas de inactividad (ver DE-15).
- **W-50 parcial.** Siguen con `onclick` `showUserRejectBox`, `confirmRejectUser`, `cancelRejectUser`, `revertRejectedUser` y los manejadores de permisos. No estaban en la autorización.
- **app.js.** Queda con 2187 líneas, frente a 3626 al inicio de la copia de respaldo previa al borrado de cuerpos heredados. Se borra en el paso 3.6.
- **Numeración del plan.** Las filas W-16, W-20, W-22, W-23 y W-42 citaban «paso 3.3» o «paso 3.4» para trabajo que pertenece a la vertical 3.2. Se corrigieron en `plan-fase-3.md`.

## 6. Cambios visibles para el usuario

- La inactividad y la duración promedio muestran minutos acarreados a la hora (por ejemplo, «2h 0m» en lugar de «1h 60m»).
- Un error al aprobar un usuario queda registrado en consola; el aviso no cambia.
- El cierre de Monitoreo se ejecuta una sola vez.

## 7. Archivos

Paquetes por vertical (en `/mnt/user-data/outputs/`): `paso-3.2-w19` y `paso-3.2-w19-limpieza` (tareas), `paso-3.2-w17` (turno y cierre), `paso-monitoreo`, `paso-kpis`, `paso-navegacion` y `paso-w50-delegacion` (ajuste posterior de W-50 y redondeo). Los archivos tocados en el paso son `app.js`, `riskops.bundle.js`, `build/dist/riskops.bundle.js`, `src/**` de los módulos citados y sus pruebas, `src/entry.js`, `src/entry-kpis.js`, `fase_2/lab/referencia/app.pre-paso-3-2-w17.js`, `fase_2/lab/referencia/app.pre-paso-3-3-kpi.js`, `fase_2/lab/suite/suite-pruebas.mjs` y `fase_2/Docs/03-plan-migracion/plan-fase-3.md`.

Las escrituras en el equipo se hicieron con `device_stage_files` y `device_commit_files`. Los archivos existentes llevaron `expectedMtimeMs` del último estado leído, y los archivos nuevos se crearon sin esa comparación. La verificación posterior de bytes fue correcta en los 20 archivos del último paquete.

## 8. Lo que no se hizo

No hubo commit, push, merge ni rebase. No se tocó `presence-service.js` (congelado, D6) ni la rama `shift_break`. No se borró ningún código sin autorización: los retiros de funciones se hicieron después de verificar que no tenían llamadas en `app.js`, en el HTML ni en `onclick`, y el resultado de cada retiro está en el log.

## 9. Decisiones abiertas para el responsable

1. Aceptar el cambio visible del redondeo de tiempos (sección 4).
2. Ejecutar los planes manuales de las cinco verticales en un navegador real.
3. DE-15: decidir si la regla de gestor de `calcularIndicadores` y la de Control Operativo se unifican.
4. Autorizar, si procede, la delegación del resto de manejadores de usuarios y permisos (sección 5, W-50 parcial).
