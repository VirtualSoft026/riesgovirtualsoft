# 05. Informes de Pruebas

Carpeta para los informes de cada corte de pruebas que se ejecute sobre `fase_2/src/` (y, más
adelante, sobre los flujos ya conectados a producción). Es la contraparte documental de la
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
