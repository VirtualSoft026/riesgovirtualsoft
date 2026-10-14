# Informe — Incorporación al refactor de las reglas de la Pausa de Turno

**Fecha:** 2026-10-06

**Alcance:** `fase_2/src/domain/shifts/` (`split-shift-policy.js` nuevo, `break-transitions.js`, `shift-calculator.js`, `shift-report-builder.js`), pruebas de `fase_2/src/tests/domain/`, plan maestro (sección 4 bis). 

**Responsable:** Luis Fuentes

**Fase de `hoja-de-ruta.md`:** Fase 2, paso 6 del plan maestro (corte 2, "Pausas y cierre de turno", funciones `toggleSplitShiftBreak()` y `handleEndShift()`).

**Comando:** `cd fase_2/src` y `node tests/domain/<suite>.test.mjs` por cada suite (log completo: `2026-10-06-log-incorporacion-reglas-pausa-de-turno-al-refactor.txt`).

## 1. Resumen ejecutivo

Los dos parches candidatos de producción (flag `hasSplitShift` y horas efectivas con la pausa descontada) **no se aplicaron a `app.js`**. Como a producción solo llegará la refactorización terminada, las reglas se llevaron a `fase_2/src/` como código puro con pruebas, y al plan maestro como requisitos (sección 4 bis).

| Suite | Pruebas | Resultado |
|---|---|---|
| `domain/split-shift-policy.test.mjs` (nueva) | 8 | Pasan |
| `domain/shift-closure-times-split.test.mjs` (nueva) | 12 | Pasan |
| `domain/break-transitions.test.mjs` (ampliada: 15 → 22) | 22 | Pasan |
| `domain/shift-effective-hours-split.test.mjs` | 7 | Pasan |
| Resto de `domain/` (7 suites) y `utils/` (7 suites) | 141 | Pasan, sin regresiones |
| **Total `fase_2/src`** | **190** | **190/190** |

`app.js` de producción: **sin cambios** en este corte (el único cambio aplicado sigue siendo el parche de monitoreo de la Pausa de Turno del 2026-10-04, sin commit).

## 2. Finalidad de las pruebas

Evitar que, al migrar `toggleSplitShiftBreak()` y `handleEndShift()`, el refactor herede dos defectos de `app.js`: (a) cualquier gestor podría iniciar una Pausa de Turno aunque el supervisor no se la haya habilitado; (b) la pausa no se descuenta de las horas efectivas, con lo que un turno de 08:00 a 18:00 con 30 min de almuerzo y 180 min de pausa se reportaría con 9,30 h en vez de 6,30 h (impacto directo en el reporte de horas trabajadas y en el correo de cierre).

## 3. Metodología

Node 22, arnés propio (`test-harness.mjs`, sin dependencias nuevas). Los módulos son puros (sin DOM ni Firebase). La equivalencia con el comportamiento del candidato se comprueba de dos maneras: los valores esperados de `shift-closure-times-split` son exactamente los de los escenarios H1–H11 de `e2e/cierre-horas-efectivas.e2e.cjs` (que ejecuta el bloque real de `app.js`), y la parte 3 del log vuelve a correr las suites de `app.js` contra el candidato combinado en modo `--strict` (13/13 y 23/23).

## 4. Detalle por módulo

**`split-shift-policy.js` (nuevo).** `isSplitShiftEnabled(user)` (estricto: solo `hasSplitShift === true`), `shouldShowSplitShiftButton(user, state)` (solo rol Gestor; visible con el flag o con una pausa activa), `canToggleSplitShiftBreak(user, state)` (retomar siempre; iniciar solo con flag) y `SPLIT_SHIFT_BLOCK_REASON`. Lo usará el controlador de turno al decidir la visibilidad del botón `toggleSplitShiftBtn` y qué hacer ante un bloqueo. Pruebas: matriz de decisión RN-1/RN-2/RN-3, rol distinto de Gestor, usuario ausente y coherencia con `toggleBreak`.

**`break-transitions.js`.** `toggleBreak(state, kind, now, options)` recibe ahora `options.splitShiftEnabled`. Iniciar `'split'` sin `=== true` devuelve `blocked: true`, `blockedReason: 'SPLIT_SHIFT_NOT_ENABLED'`, sin efectos ni cambio de estado; terminar la pausa nunca se bloquea (RN-3); almuerzo y desayuno no dependen del flag. Se agregó `blockedReason` (`'OTHER_BREAK_ACTIVE'` o `null`) a todos los resultados para que el controlador elija el mensaje. Es **seguro por omisión**: si el controlador olvida pasar la opción, no se inicia la pausa. Las pruebas por tipo de pausa se ajustaron para pasar el flag en `'split'` (12 llamadas) y se agregaron 7 pruebas nuevas.

**`shift-calculator.js`.** `calculateShiftClosureTimes({ loginMs, endMs, lunchMs, breakfastMs, splitShiftMs, inactivityMins })` compone penalidad y horas efectivas en un paso, con la pausa descontada y sin penalidad propia. `calculateEffectiveHours` ya aceptaba `splitShiftMs` (opcional, retrocompatible). Corresponde al bloque de `handleEndShift()` de `app.js` 3742–3769.

**`shift-report-builder.js`.** `buildClosureEmailTimeFields(times, totalSplitShiftTimeMs)` arma los campos de tiempos del correo en el orden de `app.js`; `Tiempo_Pausa_Turno_Descontado` solo aparece si hubo pausa.

## 5. Hallazgos

- Con el comportamiento actual de `app.js` el defecto de horas efectivas persiste (parte 2 del log: 6 [BRECHA] en `cierre-horas-efectivas`, 4 en `split-shift-flag`). Es esperado: no se aplicó el parche a producción. **Riesgo:** si la refactorización se retrasa y el equipo usa la Pausa de Turno con producción actual, las horas efectivas del correo y del reporte quedan infladas por el tiempo de pausa. El candidato listo para aplicar sigue disponible (`2026-10-06-parche-candidato-horas-efectivas.diff`) si se decide adelantarlo.
- Un solo borde de diseño: `blockedReason` da prioridad a `SPLIT_SHIFT_NOT_ENABLED` sobre `OTHER_BREAK_ACTIVE` (sin flag no se menciona otra pausa). Documentado en prueba.
- No hay hallazgos nuevos sobre `app.js`; los 7 requisitos de la revisión externa quedaron como deuda explícita para `controllers/shift-controller.js` (plan maestro, sección 4 bis).

## 6. Log completo

`2026-10-06-log-incorporacion-reglas-pausa-de-turno-al-refactor.txt` (parte 1: 190 pruebas de `src`; parte 2: suites contra `app.js` actual; parte 3: equivalencia contra el candidato en modo estricto).

## 7. Estado frente al criterio de salida y próximos pasos

Cubre el requisito de negocio de las reglas de la Pausa de Turno a nivel de dominio. Pendiente: escribir `controllers/shift-controller.js` (botones, `alert()`, sincronización, listener `storage`, clave local por `uid`), decidir la Opción A/B de `riskOps_timeline`, unificar la penalidad entre correo y panel de reportes, y el siguiente corte "Modales, tareas extra, usuarios y permisos" (17 funciones). Prueba manual en el laboratorio (activar `hasSplitShift` en el Emulator UI) sigue a cargo del responsable.
