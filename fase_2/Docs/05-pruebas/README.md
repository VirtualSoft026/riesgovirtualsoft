# 05. Informes de Pruebas

Carpeta para los informes de cada corte de pruebas que se ejecute sobre `src/` (en la raíz del
repositorio desde la reorganización del 2026-10-14; los informes anteriores dicen `fase_2/src/`) y,
más adelante, sobre los flujos ya conectados a producción. Es la contraparte documental de la
Fase 4 ("Pruebas de Regresión") de `../03-plan-migracion/hoja-de-ruta.md`.

## Convención de nombres

```
AAAA-MM-DD-informe-pruebas-<alcance>.md
```

Ejemplo: `2026-10-03-informe-pruebas-utils.md` (primer informe, cubre `src/utils/`).

Un informe nuevo por cada corte de pruebas con alcance propio (un módulo, una fase, un
hallazgo puntual que se vuelve a verificar). No se edita un informe ya publicado para
agregarle una corrida posterior — se crea uno nuevo y, si corresponde, el nuevo informe
enlaza al anterior.

## Estructura de un informe

Cada informe de esta carpeta sigue las mismas ocho secciones, en este orden:

1. **Encabezado** — fecha, alcance, responsable, fase de `hoja-de-ruta.md` que cubre, comando
   exacto usado para correr las pruebas.
2. **Resumen ejecutivo** — tabla con el total de pruebas por archivo (pasaron/fallaron) y el
   resultado global.
3. **Finalidad de las pruebas** — qué riesgo de negocio o técnico se busca mitigar al probar
   este código (no "qué hace la prueba", sino "por qué importa que esto no se rompa").
4. **Metodología** — entorno, arnés usado, y por qué (sin frameworks nuevos, mismo estilo que
   `.github/qa-infra`, etc.).
5. **Detalle por módulo probado** — para cada archivo: qué funciones se probaron, qué hace
   cada una, **para qué se usa dentro de Risk Manager** (de dónde la llama `app.js`/`login.js`
   hoy, o de dónde la llamará tras el paso 9), y qué casos cubrieron las pruebas.
6. **Hallazgos** — cualquier comportamiento real descubierto al escribir o correr las pruebas
   que no es simplemente "la prueba pasó": límites conocidos, casos borde documentados,
   diferencias con lo esperado. Si no hay ninguno, se dice explícitamente "sin hallazgos".
7. **Log completo** — la salida real de la corrida, íntegra, como anexo (archivo `.txt`
   hermano del informe, enlazado, no pegado completo dentro del `.md` si es muy largo).
8. **Estado frente al criterio de salida y próximos pasos** — qué parte del criterio de salida
   de la fase correspondiente (`hoja-de-ruta.md`) queda cubierta por este corte, y qué sigue
   pendiente.

## Informes publicados

| Fecha | Alcance | Resultado | Informe |
|---|---|---|---|
| 2026-10-03 | `src/utils/` (7 archivos, Fase 1) | 74/74 pruebas pasaron | [`2026-10-03-informe-pruebas-utils.md`](2026-10-03-informe-pruebas-utils.md) |
| 2026-10-03 | Coherencia `riskOps_breakState` / `riskOps_timeline` (`local-session-storage.js`, `shift-calculator.js`, Fase 2) | 12/12 pruebas pasaron — **riesgo crítico documentado, no resuelto** (ver informe, sección 6 y 8) | [`2026-10-03-informe-pruebas-coherencia-breakstate-timeline.md`](2026-10-03-informe-pruebas-coherencia-breakstate-timeline.md) |
| 2026-10-03 | Verificación 1:1 de 8 funciones (detector de inactividad + KPIs) contra `app.js` | Verificación manual, no automatizada — 3 equivalentes, 2 parciales, **2 NO migradas** (`applyIdleStateChange`, `updateActivity`) | [`2026-10-03-informe-verificacion-1a1-idle-detector-y-kpis.md`](2026-10-03-informe-verificacion-1a1-idle-detector-y-kpis.md) |
| 2026-10-03 | Extracción `getShiftCategory()` — primer corte de las 108 funciones "no iniciada" (`domain/schedules/schedule-parser.js`, Fase 1) | 11/11 pruebas pasaron | [`2026-10-03-informe-extraccion-getshiftcategory.md`](2026-10-03-informe-extraccion-getshiftcategory.md) |
| 2026-10-04 | Extracción "Pausas y cierre de turno" — corte 2 del paso 6, 8 funciones (`domain/shifts/`, `services/firebase/`, `ui/components/`, Fase 2) | 53/53 pruebas nuevas pasaron (150/150 acumuladas) — 4 funciones hechas + probadas, 4 parciales a la espera del controlador de turno | [`2026-10-04-informe-extraccion-pausas-y-cierre-de-turno.md`](2026-10-04-informe-extraccion-pausas-y-cierre-de-turno.md) |
| 2026-10-04 | Bug: la Pausa de Turno no se refleja en Monitoreo del supervisor (`active-session-status.js`) | Causa confirmada y reproducida; 6/6 pruebas + 7/7 extremo a extremo; **parche aplicado a `app.js` (2026-10-04), sin commit** | [`2026-10-04-informe-bug-pausa-de-turno-monitoreo.md`](2026-10-04-informe-bug-pausa-de-turno-monitoreo.md) |
| 2026-10-05 | Pruebas unitarias del parche "Pausa de Turno" en `app.js` (6 ediciones, funciones reales en `vm`) | 21/21 + 5/5 integridad; 8 pruebas [BUG] fallan en el original; regresión de `fase_2/src` 8/8 suites sin fallas | [`2026-10-05-informe-pruebas-unitarias-parche-pausa-de-turno.md`](2026-10-05-informe-pruebas-unitarias-parche-pausa-de-turno.md) |
| 2026-10-06 | Flag `hasSplitShift` y Pausa de Turno: visibilidad del botón, cambio de estado y reflejo en Monitoreo (`split-shift-flag.unit.cjs`) | Flujo normal cumple los 3 requisitos (19 pruebas); **4 brechas abiertas** (B1–B4); parche candidato 23/23 estricto, **no aplicado** (requiere autorización) | [`2026-10-06-informe-pruebas-flag-hassplitshift.md`](2026-10-06-informe-pruebas-flag-hassplitshift.md) |
| 2026-10-06 | Horas efectivas al cierre con Pausa de Turno (regla confirmada: la pausa no es tiempo trabajado) — `cierre-horas-efectivas.e2e.cjs`, `shift-effective-hours-split.test.mjs` | Defecto reproducido (9,50 h vs 6,50 h); candidato 13/13 estricto + 7/7; combinado con hasSplitShift sin regresiones; `shift-calculator.js` ampliado (retrocompatible); **candidato en `app.js` no aplicado** | [`2026-10-06-informe-candidato-horas-efectivas-pausa-de-turno.md`](2026-10-06-informe-candidato-horas-efectivas-pausa-de-turno.md) |
| 2026-10-06 | Incorporación al refactor de las reglas `hasSplitShift` (RN-1..RN-3) y "la Pausa de Turno no es tiempo trabajado" (RN-4) — `split-shift-policy.js`, `break-transitions.js`, `shift-calculator.js`, `shift-report-builder.js` | 190/190 pruebas de `fase_2/src` en verde (27 nuevas: 8 + 12 + 7; las pruebas por tipo de pausa de `break-transitions` se ajustaron para pasar el flag); `app.js` de producción **sin tocar** | [`2026-10-06-informe-incorporacion-reglas-pausa-de-turno-al-refactor.md`](2026-10-06-informe-incorporacion-reglas-pausa-de-turno-al-refactor.md) |
| 2026-10-06 | Controlador de turno (`controllers/shift-controller.js`) y corrección de la Pausa de Turno, con integración SOLO-laboratorio sobre la copia de staging de `app.js` | 235/235 en `fase_2/src`; suites de `app.js` contra el integrado en `--strict`: 23/23 y 13/13; bundle verificado (70); `app.js` del repo **sin tocar** | [`2026-10-06-informe-controlador-turno-y-correccion-pausa-de-turno.md`](2026-10-06-informe-controlador-turno-y-correccion-pausa-de-turno.md) |
| 2026-10-06 | Extracción "Tareas, persistencia y ciclo de aplicación" (21 funciones) | 78 pruebas + e2e 234/234 con paridad contra `app.js`; 2 parciales | [`2026-10-06-informe-extraccion-tareas.md`](2026-10-06-informe-extraccion-tareas.md) |
| 2026-10-06 | Extracción "Modales, tareas extra, usuarios y permisos" (17 funciones) | 175 pruebas + e2e 66/66; opciones correctivas apagadas (XSS, doble clic, política de rol) | [`2026-10-06-informe-extraccion-modales-permisos.md`](2026-10-06-informe-extraccion-modales-permisos.md) |
| 2026-10-06 | Extracción "Historial, perfil, navegación y monitoreo" (17 funciones) | 95 pruebas + e2e 49/49 con paridad; decisión abierta de penalidad en el panel | [`2026-10-06-informe-extraccion-historial-navegacion.md`](2026-10-06-informe-extraccion-historial-navegacion.md) |
| 2026-10-06 | Extracción "KPIs, analítica y gráficas" (18 funciones) | 110 pruebas + e2e 15/15; opciones `corregirBugs`/`fechaLocal` apagadas | [`2026-10-06-informe-extraccion-kpis.md`](2026-10-06-informe-extraccion-kpis.md) |
| 2026-10-06 | Extracción "Comunicados, configuración e incidencias" (26 funciones) | 134 pruebas + e2e 15/15; 2 XSS y brecha de reglas documentados | [`2026-10-06-informe-extraccion-comunicados.md`](2026-10-06-informe-extraccion-comunicados.md) |
| 2026-10-06 | **Consolidado: refactorización completa del paso 6** (99 funciones, 58 pasos de laboratorio, bundle de 108 espacios) | 827/827 en 59 suites; 8 e2e en verde; `app.js` de producción **sin tocar** | [`2026-10-06-informe-refactorizacion-completa-paso-6.md`](2026-10-06-informe-refactorizacion-completa-paso-6.md) |
| 2026-10-06 | **Aplicación de las decisiones D1–D9** (horas efectivas únicas, XSS, modal urgente, KPIs/fechas locales, presencia inactiva, doble clic/rol, avance, rechazados, supervisores por rol) | 953/953 en 62 suites; 10 e2e en verde; integración de 59 pasos; reglas D3/D7 solo como propuesta; producción **sin tocar** | [`2026-10-06-informe-aplicacion-decisiones-d1-d9.md`](2026-10-06-informe-aplicacion-decisiones-d1-d9.md) |
| 2026-10-13 | **Cierre Fase 2: B-3, Opción A y tanda 3** — verificación 1:1 `applyIdleStateChange`/`updateActivity`, resolución Opción A `riskOps_timeline`, pruebas `preloadCronograma`/`loadCronogramaAssignments` | 33 tests nuevos (17 + 16) en verde; **0 Migrada-sin-prueba, 0 Verificar-1:1**; 153/164 Hecha+probadas; producción **sin tocar** | [`2026-10-13-informe-cierre-refactorizacion-fase2.md`](2026-10-13-informe-cierre-refactorizacion-fase2.md) |
| 2026-10-14 | **Conexión de `app.js` de la rama a `src/`** (bundle antes de `app.js`, parche de la Pausa de Turno restaurado, 62 pasos de integración) | Bundle 71, unitarias 1279 en 78 archivos, e2e 487 en 10 archivos, motor operativo 4: todo en verde; prueba manual aprobada por el responsable | [`2026-10-14-informe-conexion-app-js-fase2.md`](2026-10-14-informe-conexion-app-js-fase2.md) |
| 2026-10-15 | **Funciones duplicadas entre `app.js` y `src/`** (prueba diferencial de las 56 funciones con lógica propia) | 41 equivalentes, 6 con resultado distinto, 6 no intercambiables (detector de inactividad), 3 sin par; decisiones NOTA_1 a NOTA_4 | [`2026-10-15-informe-duplicados-app-js-vs-src.md`](2026-10-15-informe-duplicados-app-js-vs-src.md) |
| 2026-10-15 | **Fase 3, paso 3.0**: `bootstrap.js` compila, sesión y rol desde `users/{uid}`, ids estables y purga de huérfanas de `main` | Compuerta cumplida: `riskops.app.js` compila; sesión 17/17; 80/80 archivos de pruebas unitarias en verde; `tsc` 159 → 148 | [`2026-10-15-informe-fase3-paso-3-0.md`](2026-10-15-informe-fase3-paso-3-0.md) |

## Criterios de cierre de la refactorización

Los criterios para dar por terminada la refactorización (factores infranqueables FI-1 a FI-8 y criterios CF-0 a CF-6) están en [`../03-plan-migracion/criterios-de-finalizacion.md`](../03-plan-migracion/criterios-de-finalizacion.md). La evidencia de cierre (salida de la auditoría, suite y plan manual firmado) se archiva en esta carpeta.
