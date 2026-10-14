# Informe de extracción — `getShiftCategory()` (primer corte de funciones "no iniciada")

## 1. Encabezado

- **Fecha:** 2026-10-03
- **Alcance:** nueva extracción `fase_2/src/domain/schedules/schedule-parser.js` (función `getShiftCategory()`) y su prueba `fase_2/src/tests/domain/schedule-parser.test.mjs`. Original: `app.js` líneas 772-798.
- **Responsable:** Luis Fuentes
- **Comando exacto usado:**
  ```
  node fase_2/src/tests/domain/schedule-parser.test.mjs
  ```
  Log completo: [`2026-10-03-log-extraccion-getshiftcategory.txt`](2026-10-03-log-extraccion-getshiftcategory.txt).
- **Archivos tocados:** solo nuevos, dentro de `fase_2/src/`. **`app.js` no se leyó más allá de confirmar el texto exacto de `getShiftCategory()` (línea 772-798) y no se modificó.**

## 2. Resumen ejecutivo

| Archivo | Pruebas | Pasaron | Fallaron |
|---|---|---|---|
| `schedule-parser.test.mjs` | 11 | 11 | 0 |

**Resultado global: 11/11, código de salida 0.** Es un puerto 1:1 verificado carácter por carácter, sin cambios de comportamiento ni siquiera en los casos borde. La función queda lista para ser inyectada en `getScheduledGestoresCountForShift()` (`fase_2/src/domain/schedules/schedule-service.js`), que ya la recibe como parámetro (`getShiftCategory`) desde que se migró, sin tener hasta hoy ninguna implementación real que pasarle.

## 3. Por qué esta función, y por qué primero

`plan-maestro-ejecucion.md` §9 paso 6 pide continuar extrayendo las 108 funciones "no iniciada" en el orden de las propias secciones del inventario, escribiendo prueba e informe por cada corte. Dentro de la sección "Normalización, calendarios y cronogramas", `getShiftCategory()` es la única función que seguía "No iniciada" — las otras 19 de esa sección ya estaban "Hecha + probada" o "Migrada, sin prueba". Se eligió como primer corte del paso 6 por tres razones:

1. **Aislada y pura.** Toma un string y devuelve un string; no toca DOM, Firebase, ni ningún otro módulo (ni siquiera `utils/normalize.js` — usa su propia normalización mínima, `.trim().toLowerCase()`, sin remover tildes, a propósito: el propio código original compara explícitamente `"manana"` y `"mañana"` como dos literales distintos en vez de depender de `normalizeName()`).
2. **Ya tiene un punto de inyección esperándola.** `schedule-service.js#getScheduledGestoresCountForShift()` (migrada el 2026-10-03 en una sesión anterior) ya recibe `getShiftCategory` como parámetro de función, sin ninguna implementación real en `fase_2/src/` hasta hoy — es decir, no se trata de crear un hueco de integración nuevo, sino de llenar uno que el propio código migrado ya dejó preparado.
3. **Bajo riesgo, alto valor de ejemplo.** Al ser pequeña permite dejar en este informe, sin recortar nada, el patrón completo que se repetirá en los próximos cortes (función aislada → prueba → informe → actualización del plan), antes de abordar funciones más grandes y con más dependencias (Firebase, DOM) de las secciones "Pausas y cierre de turno" o "Tareas, persistencia y ciclo de aplicación".

## 4. Metodología

Se confirmó el texto exacto de `getShiftCategory()` leyendo `app.js` líneas 770-799 en la copia ya usada en esta sesión (nunca modificada). El puerto a `schedule-parser.js` es literal: mismas palabras clave, mismo orden de comprobación (categorías con nombre antes que rangos de hora), misma expresión regular `^(\d+)\s*(am|pm)/i`, mismas conversiones de 12h a 24h, mismos umbrales de hora (`6-14` Mañana, `14-22` Tarde, cualquier otra Noche). El único cambio de forma (no de comportamiento) es envolver `shiftText` en `String(...)` antes de `.trim()`, por si se le pasa un valor no-string desde una celda de Excel ya parseada como número — `app.js` no lo hace, pero tampoco lo necesita porque siempre lo llama con el resultado de `row[col] || 'Descansa'`, que ya es string; se deja documentado aquí en vez de omitido en silencio.

Mismo arnés que el resto de `fase_2/src/tests/` (`createRunner`/`assert` de `test-harness.mjs`, sin dependencias nuevas, pruebas 100% sincrónicas).

## 5. Detalle de la prueba

11 casos, agrupados así:

- Valores vacíos (`''`, `null`, `undefined`) → `''`.
- Las 4 palabras clave de categoría (`Mañana` con y sin tilde, `Tarde`, `Noche`, `Master`), incluida la coincidencia por substring (`"Turno Master 2"` → `"Master"`), no por palabra completa.
- Los 3 rangos de hora de ejemplo que trae el propio comentario original de `app.js` (`"8am - 4pm"`, `"3pm - 11pm"`, `"10pm - 6am"`), más casos de borde horario: 12am/12pm (medianoche/mediodía) y la franja 12pm-1pm que cae dentro de "Mañana" por quedar antes de las 14h, aunque sea literalmente después del mediodía — se documenta explícitamente como comportamiento heredado, no intuitivo pero correcto frente al original.
- Un caso que no matchea ninguna regla (`"Descansa"`, `"Por Asignar"`, `"Vacaciones"`) → `''`.

## 6. Hallazgo documentado (no es un bug nuevo, es una característica heredada)

La prueba `"getShiftCategory clasifica como 'Noche' cualquier hora de inicio fuera de Mañana/Tarde"` deja constancia expresa de que `app.js` no tiene una cuarta rama explícita para "Noche": cualquier hora de inicio que no caiga en `[6,14)` ni en `[14,22)` cae al `return "Noche"` final, sin distinguir, por ejemplo, un turno que empiece a medianoche de uno que empiece a las 4am. Es el comportamiento real y verificado del original — se documenta aquí, con prueba que lo fija, para que si algún día alguien "corrige" esto creyendo que es un bug, la prueba falle y obligue a revisar la decisión antes de aceptar el cambio (mismo patrón de "característica test" usado en los informes anteriores de esta carpeta).

## 7. Log completo

Ver [`2026-10-03-log-extraccion-getshiftcategory.txt`](2026-10-03-log-extraccion-getshiftcategory.txt).

## 8. Estado frente al plan y próximos pasos

`getShiftCategory()` pasa de "No iniciada" a **"Hecha + probada (11/11, 2026-10-03)"** en `plan-maestro-ejecucion.md` §5. No se conectó a ningún archivo de producción ni se modificó `schedule-service.js`: la inyección real de `schedule-parser.js#getShiftCategory` en `getScheduledGestoresCountForShift()` queda para el paso operativo de integración (sección 6/7 del plan maestro), igual que el resto de funciones ya migradas de esta sesión.

Este es el primer corte del paso 6 del plan maestro (extracción de las 108 funciones "no iniciada"). Quedan 107. El siguiente corte natural, siguiendo el orden de secciones del inventario, es la sección "Pausas y cierre de turno" (8 funciones, todas "No iniciada": `toggleBreakfastBreak()`, `toggleLunchBreak()`, `persistShiftClosureCore()`, `hasRealSetOptions()`, `requiresSpecificSetSelection()`, `restoreEndShiftButton()`, `toggleSplitShiftBreak()`, `handleEndShift()`) — con la salvedad de que, a diferencia de `getShiftCategory()`, esas ocho funciones leen y escriben Firebase y el DOM directamente, por lo que su extracción requerirá separar explícitamente la lógica de negocio pura (fácil de probar) de los efectos secundarios (Firebase/DOM), en vez de portar la función completa tal cual — se recomienda abordarlas en un corte dedicado, no en el mismo informe que funciones puras como esta.
