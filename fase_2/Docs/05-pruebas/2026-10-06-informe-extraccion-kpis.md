# Extracción del corte "KPIs, analítica y gráficas" (paso 6, Fase 2)

## 1. Encabezado

| Campo | Valor |
|---|---|
| Fecha | 2026-10-06 |
| Alcance | 18 funciones de la subsección "KPIs, analítica y gráficas" de `../03-plan-migracion/plan-maestro-ejecucion.md` (sección 5) |
| Responsable | Agente `kpis` (continuación de un agente anterior que se cortó por límite de uso sin entregar informe; este informe cubre el trabajo de ambos) |
| Fase | Fase 2 de `../03-plan-migracion/hoja-de-ruta.md` (extracción incremental a `fase_2/src/`), integración SOLO de laboratorio |
| Producción | `app.js`, `index.html` y demás archivos del repo **sin tocar**; la integración se aplica únicamente a la copia de staging |
| Comando de las pruebas del corte | `node src/tests/domain/kpi-service.test.mjs` (y las otras 5 suites, ver sección 2) |
| Comando de bundle | `node /tmp/riskops-bundle.mjs /tmp/kpis-bundle.js` |
| Comando de integración | `node /tmp/riskops-integrate.mjs /tmp/kpis-integrado.js` |
| Comando e2e | `node src/tests/e2e/kpis-integrado.e2e.cjs /tmp/kpis-integrado.js --riskops /tmp/kpis-bundle.js` |
| Regresión | las 59 suites de `src/tests/{domain,utils,ui,controllers}`, una por proceso |
| Log | [`2026-10-06-log-extraccion-kpis.txt`](2026-10-06-log-extraccion-kpis.txt) |

Qué se encontró al retomar el trabajo: los módulos, las pruebas y el controlador ya existían. Esta sesión comprobó el estado de todo, corrigió **un defecto de orden de operaciones** en el controlador (ver sección 6, H-12), añadió la suite faltante del controlador (`kpi-controller.test.mjs`, 18 pruebas), escribió el paso de laboratorio y la prueba e2e, y corrió la regresión completa.

## 2. Resumen ejecutivo

Las 18 funciones quedan **extraídas y probadas con pruebas diferenciales** contra copias literales de `app.js`. Las 17 funciones globales y el cierre local `parseTime` **están conectadas al laboratorio** (11 pasos en `lab/integracion/pasos/kpis.mjs`). El `app.js` integrado se comporta igual que el original en 13 escenarios e2e y no rompe las e2e de los otros cuatro cortes.

| Archivo de pruebas | Pasaron | Fallaron |
|---|---:|---:|
| `src/tests/domain/kpi-metrics-calculator.test.mjs` | 31 | 0 |
| `src/tests/domain/kpi-service.test.mjs` | 16 | 0 |
| `src/tests/domain/kpi-operativo-analysis.test.mjs` | 14 | 0 |
| `src/tests/domain/kpi-data-sources.test.mjs` | 12 | 0 |
| `src/tests/ui/kpi-chart-configs.test.mjs` | 19 | 0 |
| `src/tests/controllers/kpi-controller.test.mjs` (nueva en esta sesión) | 18 | 0 |
| **Subtotal suites del corte** | **110** | **0** |
| `src/tests/e2e/kpis-integrado.e2e.cjs` (app.js integrado vs original) | 15 | 0 |
| Regresión de `src/tests/{domain,utils,ui,controllers}` (59 suites, incluye las 6 de arriba y las de los otros cortes en curso) | 827 | 0 |

Resultado global: **sin fallas**. El bundle compila (`BUNDLE_OK`) y `riskops-integrate` aplica los 58 pasos sin colisión de anclas y valida la sintaxis.

Estado de las 18 funciones: 18 "Hecha + probada" y 18 conectadas al laboratorio. `calcularIndicadores()` (también en la sección del plan, pero perteneciente al corte `time-metrics`) **no** es parte de este corte y no se tocó, salvo su cierre local `parseTime`.

## 3. Finalidad de las pruebas

- **Riesgo de negocio.** El Control Operativo y los KPIs alimentan decisiones del supervisor (ranking de tardanzas, inactividad, retiros aprobados/rechazados, informe ejecutivo). Un cambio silencioso de cálculo (redondeos, periodos, exclusión de supervisores, fusión de `shift_reports`) cambiaría cifras que se usan para evaluar personas. Por eso cada cálculo se compara contra el algoritmo original, no contra una expectativa escrita a mano.
- **Riesgo técnico.** `app.js` es un monolito de scripts clásicos con globales; mover estas funciones sin red de seguridad puede romper `onclick` del HTML, el registro de gráficas (`controlOperativoCharts`) o el orden de efectos (destruir antes de crear una gráfica, recalcular los anillos de KPIs al cambiar el filtro). La prueba e2e ejecuta las funciones reales de `app.js` integrado y detecta divergencias de efectos, no solo de resultados.
- **Falsos verdes.** Las e2e afirman también resultados absolutos (p. ej. "se dibujaron las 6 gráficas en el mismo registro de app.js") y se verificó con 3 mutaciones del `app.js` integrado que la prueba falla cuando algo se desvía (sección 4).

## 4. Metodología

- **Arnés:** `src/tests/test-harness.mjs` (`createRunner`, `testAsync`, `summarizeAsync`), sin frameworks nuevos. Node 22.
- **Copia literal del original:** `src/tests/helpers/kpi-legacy-app.mjs` contiene las 17 funciones de `app.js` con sus números de línea. En esta sesión se **verificó automáticamente** que cada función de la copia es idéntica (línea a línea, ignorando solo la sangría) a la de `app.js` (17/17 IGUAL). Las funciones dependientes de globales reciben `window`, `document`, `Chart`, `Date`, `database`, `fetch`, etc. por una fábrica.
- **Entorno simulado:** reloj fijo (`FixedDate`), DOM mínimo que registra lo escrito (`kpi-test-env.mjs`), `Chart` simulado que captura la configuración (las funciones de formato/callbacks se comparan por lo que devuelven con 17 valores de prueba), Firebase simulado (`once('value')`), `fetch` simulado.
- **Comparación:** `observe()` captura DOM, filas de la tabla, gráficas creadas y su configuración, registro de operaciones de Chart (new/destroy), logs de consola, alertas, impresión, scroll, selección, estado global y archivos pedidos a `fetch`. Original y nuevo deben coincidir en todo, incluido el error lanzado.
- **Datos aleatorios con semilla:** `makeRng` (mulberry32), 3000 cadenas para `parseTime`, 60 reportes x 8 semillas para la fusión, 25 conjuntos x 8 periodos x 5 selecciones para el análisis, 40 combinaciones para las gráficas.
- **e2e:** `kpis-integrado.e2e.cjs` extrae del `app.js` original y del integrado las regiones reales (5670-5775, 6418-6477, 7001-8330 y el cierre `parseTime`), las ejecuta en un `vm` (el integrado con el bundle real `RiskOps`) y exige trazas idénticas en 13 escenarios, más dos comprobaciones previas (declaración/delegación de las funciones y espacios de nombres del bundle).
- **Prueba de que la e2e muerde:** 3 mutaciones del integrado (sumar 1 a `parseTime`, intercambiar color de fondo/borde en `drawChart`, hacer que `toggleOperativoCustomDates` llame a otra función) producen `HAY FALLAS` en 1-2 pruebas cada una (log, sección 3).
- **Coexistencia:** las e2e de `tareas`, `comunicados`, `modales-permisos` e `historial-navegacion` se corrieron contra el MISMO `app.js` integrado (con `kpis.mjs` aplicado): 234/234, 15/15, 34/34 y 49/49. Además se comprobó que ninguna línea marcada `[LAB-INTEGRACION]` de otros pasos desaparece al agregar `kpis.mjs` (0 de 96).

## 5. Detalle por módulo probado

### Tabla función -> estado -> módulo -> pruebas

| Función (app.js) | Estado | Módulo(s) | Pruebas | Conectada al laboratorio |
|---|---|---|---|---|
| `fetchKpiOperativosData()` (5676) | Hecha + probada | `services/external/kpi-operativos-source.js` | `kpi-data-sources` (12, diferencial) + e2e K1 | Sí (paso 2, directo a `RiskOps.kpiOperativosSource`) |
| `loadRetirosData()` (5704) | Hecha + probada | `domain/analytics/kpi-service.js` + controlador | `kpi-service`, `kpi-controller`, e2e K2 | Sí (paso 3) |
| `loadGestoresForKPIs()` (5716) | Hecha + probada | `kpi-service.js` (`selectKpiGestores`, `KPI_TARGET_GESTORES`), `firebase-kpi-repository.js`, controlador | `kpi-service`, `kpi-controller`, e2e K3 | Sí (paso 3) |
| `parseTime()` (cierre en 5910, dentro de `calcularIndicadores`) | Hecha + probada | `domain/analytics/metrics-calculator.js` | `kpi-metrics-calculator` (diferencial con 12x4x10 combinaciones y 3000 cadenas aleatorias), e2e K4 (4011 entradas) | Sí (paso 4: solo el cierre de una línea; el resto de `calcularIndicadores` no se toca) |
| `openKpiTaskDetails()` (6419) | Hecha + probada | `ui/components/kpi-task-details.js` + controlador | `kpi-controller` (diferencial), e2e K5 | Sí (paso 5) |
| `closeKpiTaskDetails()` (6475) | Hecha + probada (trivial; el plan la marcaba "Redundante": se conserva por los `onclick` del HTML) | controlador | `kpi-controller`, e2e K5 | Sí (paso 5) |
| `destroyChart()` (7003) | Hecha + probada | controlador (registro inyectado = el mismo `controlOperativoCharts` de app.js) | `kpi-chart-configs`, e2e K6 | Sí (paso 6) |
| `toggleOperativoCustomDates()` (7012) | Hecha + probada | controlador | `kpi-controller`, e2e K6 | Sí (paso 7) |
| `generarAnalisisTextual()` (7025) | Hecha + probada | `domain/analytics/operativo-analysis.js` + `ui/views/operativo-analysis-view.js` + controlador | `kpi-operativo-analysis` (14, diferencial), `kpi-controller`, e2e K9 | Sí (paso 8) |
| `generarReporteEjecutivoPDF()` (7216) | Hecha + probada | `domain/analytics/executive-report.js` + controlador | `kpi-controller`, e2e K10 | Sí (paso 9) |
| `loadControlOperativoData()` (7292) | Hecha + probada | `kpi-service.js` (`buildKpiUsersMap`, `mergeShiftReportsIntoOperativoData`), `firebase-kpi-repository.js`, controlador | `kpi-service` (fusión: 60 reportes x 8 semillas), `kpi-controller`, e2e K11 | Sí (paso 10) |
| `renderControlOperativoFiltered()` (7481) | Hecha + probada | `metrics-calculator.js` (`aggregateOperativoData`, `summarizeOperativoRows`, `selectGlobalForCharts`), `ui/views/operativo-table-view.js`, controlador | `kpi-metrics-calculator` (7 fechas "ahora" x 9 periodos x 6 selecciones), `kpi-controller`, e2e K7-K8 | Sí (paso 11) |
| `renderControlOperativoCharts()` (7737) | Hecha + probada | `ui/charts/operativo-chart-plan.js` + `operativo-chart-configs.js` + controlador | `kpi-chart-configs` (incluye 40 combinaciones aleatorias), e2e K13 | Sí (paso 11) |
| `drawPunctualDatesChart()` (7972) | Hecha + probada | `operativo-chart-configs.js` (`buildPunctualDatesChartConfig`) | `kpi-chart-configs`, e2e K12 | Sí (paso 11) |
| `drawChart()` (8033) | Hecha + probada | `operativo-chart-configs.js` (`buildBarChartConfig`) | `kpi-chart-configs`, e2e K12 | Sí (paso 11) |
| `drawCombinedChart()` (8085) | Hecha + probada | `operativo-chart-configs.js` (`buildCombinedChartConfig`) | `kpi-chart-configs`, e2e K12 | Sí (paso 11) |
| `drawCombinedChartDaily()` (8152) | Hecha + probada | `operativo-chart-configs.js` (`buildCombinedChartDailyConfig`) | `kpi-chart-configs`, e2e K12 | Sí (paso 11) |
| `drawScatterMatriz()` (8218) | Hecha + probada | `operativo-chart-configs.js` (`buildScatterMatrizConfig`) | `kpi-chart-configs`, e2e K12 | Sí (paso 11) |

Todas las funciones de la subsección están por tanto en estado "Hecha + probada y conectada al laboratorio"; ninguna queda "Parcial", "Redundante" ni "No extraíble".

### Módulos (qué hace cada uno y para qué se usa en Risk Manager)

- **`domain/analytics/metrics-calculator.js`** (sin DOM ni Firebase; `now` por parámetro). `parseTime` interpreta horas "H:MM" con AM/PM en todas las escrituras es-CO/en-US (la usa `calcularIndicadores` al calcular la duración de un turno desde `horaInicio`/`horaFin`). `resolveOperativoRanges`, `isFechaInRange`, `matchesGestorSelection`, `aggregateOperativoData`, `finalizeGestorMetrics`, `summarizeOperativoRows`, `selectGlobalForCharts`, `resolveSelectedGestorLabel` agregan el JSON operativo por gestor/periodo para la tabla "Resumen de Retiros por Gestor", las tarjetas y las gráficas. Casos probados: periodos (hoy, ayer, 7, 30, mes, mes anterior, personalizado con fechas vacías/invertidas), gestores sin días, días con campos faltantes, división segura entre cero, redondeo a 2 decimales, exclusión de supervisores (incluida "Sara Santamar").
- **`domain/analytics/kpi-service.js`**. `mergeShiftReportsIntoOperativoData` fusiona inactividad/tardanza de `shift_reports` en el JSON operativo (topes de 480 min por turno y 10 h de ventana, eventos abiertos corren hasta "ahora"); `selectKpiGestores` y `buildKpiUsersMap` arman el selector de gestores y el mapa email->nombre; `loadRetirosData` publica la carga automática en el estado.
- **`domain/analytics/operativo-analysis.js`** + **`ui/views/operativo-analysis-view.js`**: estadísticas y HTML del "Análisis Textual" (un gestor / equipo, avisos de ART, cuello de botella).
- **`domain/analytics/executive-report.js`**: textos del informe (gestor, periodo, metadatos), orden de las 5 gráficas capturadas, título de la tabla y la espera de 800 ms antes de `window.print()`. La función original **no genera un PDF**: rellena un bloque de impresión y llama a `window.print()`.
- **`services/external/kpi-operativos-source.js`**: elige el archivo de datos (`kpi_operativos_seed.json` solo en localhost/127.0.0.1/`file:`, con caída al estándar `kpi_operativos_v2.json`; producción ignora la semilla) con `?v=<ms>` anti-caché.
- **`services/firebase/firebase-kpi-repository.js`**: lecturas de `users` y `shift_reports` con la base inyectada.
- **`ui/components/kpi-task-details.js`**, **`ui/views/operativo-table-view.js`**: HTML del modal de detalle de tareas (con `escapeHTML`) y de la fila/tarjeta ART de la tabla.
- **`ui/charts/operativo-chart-configs.js`** y **`operativo-chart-plan.js`**: configuraciones de Chart.js (barras, fechas puntuales, combinada global y diaria, matriz de riesgo, evolución diaria) y el plan ordenado de las 6 gráficas con sus títulos y colores por umbral (inactividad >45 rojo, >20 ámbar; % de rechazos >5 rojo, >2 ámbar).
- **`controllers/kpi-controller.js`**: orquesta datos, DOM y gráficas con dependencias inyectadas (`getEl`, `state`, `chartRegistry`, `ChartClass`, `fetchKpiData`, `database`, multi-select, `now`, `alert`, `print`, `setTimeout`, `logger`). Tiene 17 funciones públicas con los mismos nombres y firmas que `app.js`.
- **`src/entry-kpis.js`**: registra los 12 espacios de nombres `kpiMetrics`, `kpiService`, `kpiOperativoAnalysis`, `kpiExecutiveReport`, `kpiOperativosSource`, `kpiRepository`, `kpiTaskDetails`, `kpiAnalysisView`, `kpiOperativoTableView`, `kpiChartConfigs`, `kpiChartPlan`, `kpiController` (el bundle los expone, comprobado en la e2e).

### Paso de laboratorio `lab/integracion/pasos/kpis.mjs` (11 pasos, todos con la marca `[LAB-INTEGRACION]`)

1. Puente `__kpiController()`: crea el controlador la primera vez que se usa, con `state: window`, `chartRegistry: controlOperativoCharts` (el MISMO objeto de app.js), `ChartClass: Chart`, el plugin `ChartDataLabels` si existe y las funciones globales de app.js (`getSelectedMultiSelectValues`, `setCustomMultiSelectValues`, `setupCustomMultiSelect`, `calcularIndicadores`, `SUPERVISORES_NOMBRES`). Ancla: las dos líneas `window.retirosGlobalData = null; ...` + `window.kpiTaskLists = ...` (la segunda sola aparece dos veces).
2. `fetchKpiOperativosData`; 3. `loadRetirosData` + `loadGestoresForKPIs`; 4. cierre `parseTime`; 5. modal de tareas; 6. `destroyChart`; 7. `toggleOperativoCustomDates`; 8. `generarAnalisisTextual`; 9. `generarReporteEjecutivoPDF`; 10. `loadControlOperativoData`; 11. `renderControlOperativoFiltered`, `renderControlOperativoCharts` y las 5 `draw*`.

Cada función global conserva nombre, firma y orden de llamada (los `onclick` de `index.html` y los demás bloques de app.js siguen resolviendo a ellas; `drawPunctualDatesChart` conserva sus 4 parámetros aunque el original ignora los dos últimos). No se solapan con las anclas del controlador de turno ni de los otros cuatro cortes (comprobado: 0 líneas marcadas ajenas desaparecen y las e2e ajenas siguen en verde).

### Escenarios de la e2e (`kpis-integrado.e2e.cjs`)

K1 `fetchKpiOperativosData` (7 entornos: producción, localhost con semilla, 127.0.0.1, semilla vacía, sin semilla, semilla que falla, error del estándar); K2 `loadRetirosData`; K3 `loadGestoresForKPIs` (5 variantes, devuelve `undefined` como el original); K4 `parseTime` (4011 entradas); K5 modal de tareas; K6 `toggleOperativoCustomDates` y `destroyChart`; K7 `renderControlOperativoFiltered` (7 periodos x 5 selecciones + personalizado + sin datos); K8 clic y hover de filas; K9 análisis textual (incluye el TypeError heredado de "Varios"); K10 informe ejecutivo (6 variantes, imprime a 800 ms); K11 `loadControlOperativoData` (7 variantes); K12 las 5 funciones `draw*` con y sin `ChartDataLabels`; K13 `renderControlOperativoCharts` directo.

## 6. Hallazgos

Los hallazgos de comportamiento de producción se **portaron fieles** (no se corrigieron en silencio); donde la corrección es obvia y de bajo riesgo existe una opción apagada por defecto con su prueba.

| # | Hallazgo | Dónde | Tratamiento |
|---|---|---|---|
| H-1 | **Bug:** con 2 o más gestores seleccionados ("Varios") `generarAnalisisTextual()` lanza `TypeError` y el modal **no se abre** (el supervisor no ve nada ni recibe aviso). | app.js 7025-7211 | Portado fiel (la e2e K9 y `kpi-operativo-analysis` lo afirman). Corrección opcional `corregirBugs: true` en `computeAnalysisStats`/`buildAnalysisHtml` (resumen del equipo seleccionado, con nombre escapado), con prueba. El controlador y el laboratorio usan el comportamiento de producción. |
| H-2 | **Bug:** "mes anterior" en el análisis textual desborda cuando hoy es 29/30/31 (31-mar -> 3-mar) y cuenta marzo en vez de febrero. En la tabla (`renderControlOperativoFiltered`) NO ocurre porque usa el día 1. | app.js 7025+ | Portado fiel; opción `corregirBugs:true` usa el mes calendario anterior; prueba incluida. |
| H-3 | **Riesgo:** la fecha de un reporte de `shift_reports` se calcula en **UTC** (`toISOString`); un turno nocturno en hora de Colombia puede caer en el día siguiente. | app.js 7312-7447 | Portado fiel; opción `fechaLocal: true` en `mergeShiftReportsIntoOperativoData`, con prueba. |
| H-4 | Un `timestamp` inválido en un reporte lanza `RangeError` y **aborta el resto de reportes** (queda un estado parcial; solo se registra "Error fetching shift_reports..."). | app.js 7312-7447 | Portado fiel con prueba de estado parcial idéntico. |
| H-5 | Un usuario Gestor aprobado **sin nombre** hace que `loadGestoresForKPIs` no pinte ninguna opción (TypeError atrapado por el `.catch`). | app.js 5716-5775 | Portado fiel; `selectKpiGestores` propaga el error igual. Decisión pendiente: validar el nombre al crear usuarios. |
| H-6 | `generarReporteEjecutivoPDF()` **no genera un PDF**: llena el bloque de impresión y llama a `window.print()` a los 800 ms (el usuario debe elegir "Guardar como PDF"). El nombre es engañoso. | app.js 7216-7290 | Documentado; comportamiento idéntico. Decisión de negocio: renombrar o generar PDF real. |
| H-7 | En `drawCombinedChartDaily` la serie "Aprobaciones del Día" repite exactamente los Aprobados (la serie de tasa es copia de aprobados). | app.js 8152-8216 | Portado fiel con prueba. |
| H-8 | `drawChart` **muta** el `extraOptions` recibido (le agrega `plugins.datalabels`). | app.js 8033-8083 | El nuevo no lo muta (prueba). Ningún llamador de app.js reutiliza ese objeto: diferencia inocua y documentada en el paso. |
| H-9 | `parseTime`: con "d/m/aaaa, HH:MM" y día > 12 cae a la rama manual y toma la fecha **base** (no la fecha escrita); "p.m" sin punto final no se reconoce como PM; horas fuera de rango no se validan; difiere de `parseClockTime` de `utils/date-time.js` (no se unifican). | app.js 5910-5929 | Portado fiel; diferencias con `parseClockTime` documentadas en una prueba. Las dos funciones no deben fusionarse sin decisión. |
| H-10 | `loadRetirosData` sobrescribe `window.controlOperativoRawData` con los datos del JSON (descarta la fusión de `shift_reports` hecha antes por `loadControlOperativoData`) cada vez que se llama. Se llama en `DOMContentLoaded`, antes de cualquier fusión, así que hoy no se manifiesta. | app.js 5704, 6482 | Portado fiel; riesgo a vigilar si cambia el orden de arranque. |
| H-11 | `loadGestoresForKPIs` original no devuelve nada; el controlador devuelve una Promesa. | app.js 5716 | El puente del laboratorio descarta la Promesa para conservar `undefined` (comprobado en e2e K3). |
| H-12 | **Defecto corregido en el controlador (esta sesión):** `createChart` calculaba la configuración antes de pedir el contexto del canvas, y `generarAnalisisTextual` construía el HTML después de tocar `analysisModalBody`. El original hace lo contrario (contexto primero, DOM al final); con datos incompletos la secuencia de lecturas del DOM difería. Se cambió `createChart` a recibir una función de configuración y se construyó el HTML antes de escribir el DOM; las 2 pruebas diferenciales que fallaban pasan. | `controllers/kpi-controller.js` | Corregido y probado. |

Sin otros hallazgos. No hay credenciales ni accesos a red de producción en el código ni en las pruebas.

## 7. Log completo

[`2026-10-06-log-extraccion-kpis.txt`](2026-10-06-log-extraccion-kpis.txt): salida real e íntegra de (1) las 6 suites del corte, (2) bundle e integración, (3) la e2e y las 3 mutaciones, (4) las e2e de los otros cuatro cortes contra el mismo integrado, (5) la regresión completa de las 59 suites (827 pruebas, 0 fallas). Las 4 líneas `[FAIL]` del log pertenecen a las mutaciones deliberadas de la sección 3 del log (se esperan).

## 8. Estado frente al criterio de salida y próximos pasos

**Cubierto por este corte:** las 18 funciones de la subsección están extraídas con pruebas diferenciales, registradas en `src/entry-kpis.js`, conectadas al laboratorio sin solapar anclas y verificadas con una e2e contra el `app.js` integrado y el bundle real.

**Pendiente / decisiones:**

1. **No hay conexión a producción:** `app.js` real no se modificó. El paso `kpis.mjs` es solo de laboratorio. Aplicarlo a producción requiere autorización explícita y una pasada manual en navegador con Chart.js real (las e2e usan un `Chart` simulado; la forma de la configuración está verificada, no el dibujo).
2. **Decisiones de negocio:** H-1 y H-2 (¿activar `corregirBugs`?), H-3 (¿fecha local o UTC?), H-6 (¿PDF real o renombrar?). Ninguna se aplicó.
3. **`calcularIndicadores()`** (también en la sección "KPIs" del plan) pertenece al corte `time-metrics`: solo se conectó su cierre `parseTime`; el resto (HTML, Retiros, `window.*`) sigue en `app.js`.
4. **Cambios que necesito de otros:** ninguno en `entry.js` ni en módulos de otros cortes. Cuando el plan maestro se actualice, las 18 filas de esta subsección pueden pasar a "Hecha + probada, conectada en laboratorio" (no se edita el plan desde este corte).
5. **Siguiente:** un pase de verificación en navegador de laboratorio (`stage.mjs`) con Chart.js real; después, evaluar la conexión a producción por pasos pequeños (empezando por `parseTime`, `fetchKpiOperativosData` y el modal de tareas, los de menor superficie).
