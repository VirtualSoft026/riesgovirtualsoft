# Informe — Horas efectivas al cierre con Pausa de Turno (candidato, no aplicado)

**Fecha:** 2026-10-06 · **Responsable:** Luis Fuentes · **Fase de `hoja-de-ruta.md`:** Fase 4 (Pruebas de Regresión)
**Regla de negocio confirmada:** la Pausa de Turno NO cuenta como tiempo trabajado.
**Log completo:** [`2026-10-06-log-pruebas-horas-efectivas-pausa-de-turno.txt`](2026-10-06-log-pruebas-horas-efectivas-pausa-de-turno.txt) · **Diff del candidato:** [`2026-10-06-parche-candidato-horas-efectivas.diff`](2026-10-06-parche-candidato-horas-efectivas.diff)

## 1. El defecto

En `handleEndShift()` de `app.js` (líneas 3766–3769) las `Horas_Efectivas_Trabajadas` del correo de cierre restan almuerzo, desayuno y penalidad, pero **no** `totalSplitShiftTimeMs`. El correo tampoco informa cuánto duró la pausa. El panel de reportes (línea 5942) sí la resta, así que ambos números no coinciden.

Ejemplo: turno 08:00–18:00, almuerzo 30 min, pausa 180 min. Cierre/correo: **9,50 h**. Correcto: **6,50 h** (el panel ya mostraba 6,50 h).

## 2. Resultado de las pruebas

| Bloque | `app.js` actual | Candidato de horas | Candidato combinado (hasSplitShift + horas) |
|---|---|---|---|
| `cierre-horas-efectivas.e2e.cjs` (bloque REAL de `handleEndShift`, 13 pruebas) | 7 pasan, **6 brechas** (H3, H4, H6, H7, H8, H11), 0 fallos | **13/13** estricto | **13/13** estricto |
| `split-shift-flag.unit.cjs` (23) | — | — | 23/23 estricto |
| `parche-pausa-turno.unit.cjs` | — | — | 5/5 integridad, 21/21 |
| `monitoreo-render.e2e.cjs` | — | — | 7/7 |
| `fase_2/src` (10 suites, incluida la nueva `shift-effective-hours-split` 7/7) | 0 suites con fallas | | |

Sin regresión en el cálculo sin pausa (H1, H2, H5, H9, H10): con `totalSplitShiftTimeMs = 0` el resultado es idéntico al actual, y la penalidad de conectividad no cambia.

## 3. Qué cambia el candidato (3 puntos en `app.js`, +4 líneas netas)

1. Resta `totalSplitShiftTimeMs` en `effectiveShiftMs`. Comentario actualizado.
2. Calcula `splitShiftMinutes`.
3. Agrega al correo `Tiempo_Pausa_Turno_Descontado` **solo si hubo pausa** (los demás gestores no ven un campo nuevo en 0).

Además, en `fase_2/src/domain/shifts/shift-calculator.js`: `calculateEffectiveHours` acepta `splitShiftMs` opcional (por defecto 0, retrocompatible). Ese archivo no es de producción y ya quedó escrito; las 200 combinaciones del test diferencial anterior siguen idénticas.

## 4. Decisiones tomadas y límites

- **La pausa no genera penalidad.** Solo se descuenta del tiempo; la penalidad sigue siendo exceso de almuerzo/desayuno más inactividad.
- **Una pausa abierta al finalizar** se cierra antes del cálculo (`if (isSplitShiftBreak) toggleSplitShiftBreak();`, línea 3734), así que el acumulado incluye el último tramo (prueba H12).
- **Diferencia que persiste, ajena a la pausa:** el correo resta además la penalidad de conectividad y el panel de reportes (5942) no. Con penalidad 0 coinciden (H11). No se tocó.
- **No se agrega `horasEfectivas` a `shift_reports`:** cambiaría el esquema. El panel sigue calculándolo desde `tiempoPausaTurnoMins`, que ya se guarda.
- **Reportes antiguos:** los correos ya enviados con la pausa sin descontar no se corrigen; el panel sí los mostraba bien.
- Pruebas con tiempos y `FormData` simulados; falta validar en el laboratorio un cierre real con una pausa.

## 5. Estado

Candidato **no aplicado**; requiere autorización explícita sobre `app.js`. El candidato combinado con el parche de `hasSplitShift` pasa todas las suites que ejecutan `app.js`. Commit, despliegue y versión `?v=` de `index.html` siguen siendo del responsable.
