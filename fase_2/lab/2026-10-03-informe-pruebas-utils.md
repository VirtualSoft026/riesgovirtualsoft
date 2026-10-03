# Informe de Pruebas — `src/utils/` (Fase 1: Extracción de Utilidades)

**Fecha:** 2026-10-03
**Alcance:** los 7 archivos de `fase_2/src/utils/` (`constants.js`, `date-time.js`, `excel.js`,
`normalize.js`, `result.js`, `sanitization.js`, `validation.js`).
**Responsable:** Luis Fuentes (ejecución y revisión), con asistencia de Claude para la escritura
y corrida inicial de las pruebas.
**Fase de `../03-plan-migracion/hoja-de-ruta.md` que cubre:** Fase 1, pendiente "pruebas
unitarias para los 7 archivos de `utils/`".
**Comando exacto usado:**

```powershell
cd fase_2/src
node tests/run-utils-tests.mjs
```

**Log completo:** [`ultimo-resultado-pruebas.txt`](ultimo-resultado-pruebas.txt) (anexo,
sección 7).

---

## 1. Resumen ejecutivo

| Archivo probado | Pruebas | Pasaron | Fallaron |
|---|---|---|---|
| `constants.js` | 6 | 6 | 0 |
| `date-time.js` | 15 | 15 | 0 |
| `excel.js` | 13 | 13 | 0 |
| `normalize.js` | 14 | 14 | 0 |
| `result.js` | 5 | 5 | 0 |
| `sanitization.js` | 14 | 14 | 0 |
| `validation.js` | 7 | 7 | 0 |
| **Total** | **74** | **74** | **0** |

**Resultado global: todas las suites pasaron** (código de salida del proceso: `0`).

No es un resultado "a la primera": al escribir la prueba de `sanitizeAnnouncementHTML` contra
código con `<script>`, la primera versión de la prueba asumía un comportamiento que el código
real no tiene (ver sección 6, Hallazgos). La prueba se corrigió para reflejar el comportamiento
verificado, no el esperado — ese es justamente el valor de este ejercicio: no solo confirma que
el código ya hace lo correcto, también encuentra los puntos donde no hace lo que su nombre o su
comentario sugieren.

## 2. Finalidad de las pruebas

Estos 7 archivos son la primera extracción de lógica fuera de `app.js`/`login.js` (un archivo de
447 KB sin módulos) hacia funciones puras, aisladas y con una sola responsabilidad. El riesgo que
esta fase busca evitar es doble:

- **Riesgo de regresión silenciosa.** Al mover una función de `app.js` a `utils/`, lo único que
  garantiza que el comportamiento no cambió es comparar entradas y salidas contra algo escrito,
  no contra la memoria de quien hizo el movimiento. Sin estas pruebas, cualquier ajuste posterior
  a estas funciones (y vendrán varios, porque todavía falta conectarlas a `app.js` en el paso 9)
  puede romper un caso borde sin que nadie lo note hasta que un Gestor o Supervisor lo reporte en
  producción — exactamente el tipo de problema que ya ocurrió con el bug de cierre de turno.
- **Riesgo de que el criterio de salida de la Fase 1 quede en "confío en que funciona" en vez de
  "está verificado".** El propio `hoja-de-ruta.md` exige, para cerrar la Fase 1: *"Los helpers
  extraídos tienen pruebas unitarias y no producen efectos secundarios"*. Este informe es la
  evidencia de que esa condición ya se cumple para los 7 archivos de `utils/`.

Dicho de otra forma: estas pruebas no buscan demostrar que el código es perfecto — varias de
ellas documentan explícitamente límites reales del código actual (el `0` tratado como vacío, el
formato `DD/MM/YYYY` que puede fallar). Buscan dejar un registro verificable de **qué hace** cada
función hoy, para que cualquier cambio futuro — propio o de otra sesión de Claude — se pueda
comparar contra algo concreto en vez de against la intención original.

## 3. Metodología

- **Sin frameworks nuevos.** Se usa `node:assert/strict`, incluido en Node, con un runner propio
  mínimo (`test-harness.mjs`) que imprime `[PASS]`/`[FAIL]` por caso y un resumen por archivo —
  mismo estilo que ya usa `.github/qa-infra` (`[PASS]`/`[FAIL]` con contador), para no introducir
  una dependencia que el resto del proyecto no tiene.
- **Un proceso de Node por archivo.** `run-utils-tests.mjs` corre cada suite (`utils/*.test.mjs`)
  en un proceso hijo separado (`node:child_process`), igual que el `package.json` de
  `.github/qa-infra` encadena sus propias pruebas con `&&`. Así una suite que fallara no detiene
  la ejecución de las demás, y el código de salida final sí refleja si hubo al menos una falla.
- **Sin mocks de librerías externas salvo cuando el propio archivo los necesita.** `excel.js`
  recibe la API de SheetJS (`xlsx.utils.sheet_to_json`) como parámetro inyectado — la prueba pasa
  una versión falsa mínima que solo registra con qué argumentos se le llamó, sin necesidad de
  cargar la librería real.
- **Cero cambios a los 7 archivos probados.** Las pruebas se escribieron y ajustaron contra el
  código tal como está hoy; ningún hallazgo de esta corrida implicó modificar `utils/` — eso
  queda para cuando se decida corregir algo, con autorización explícita, como con cualquier otro
  cambio a este proyecto.
- **Entorno:** Node v22 (coincide con el `"engines": {"node": "22.x"}` que ya exige
  `.github/qa-infra/package.json`). Se agregó `fase_2/src/package.json` con `"type": "module"`
  — necesario porque estos archivos usan `export`/`import` y, sin esa declaración, Node los
  interpreta como CommonJS y falla; no afecta al build de esbuild (que detecta el formato por
  sintaxis) ni a ningún archivo de producción.

## 4. Detalle por módulo probado

### 4.1 `constants.js` — 6 pruebas

| Función / export | Qué hace | Para qué sirve en Risk Manager |
|---|---|---|
| `STORAGE_KEYS` | Catálogo congelado de las claves de `localStorage` (`riskOps_currentUser`, `riskOps_cache`, `riskOps_breakState`, `riskOps_timeline`, etc.) | Hoy `app.js` repite estos strings literales en decenas de lugares; una sola fuente de verdad evita el tipo de desincronización que causó el bug de cierre de turno (dos claves de timeline que podían divergir) |
| `USER_STATUS`, `PERMISSION_STATUS`, `TASK_STATUS` | Catálogos de los valores de estado ("Activo"/"Inactivo", "Pendiente"/"Aprobado"/"Rechazado", "Pendiente"/"En Proceso"/"Finalizada"/"No Realizada") | Son los valores que decide si una tarea cuenta como gestionada al cerrar turno, si un permiso está aprobado, etc. — centralizarlos evita errores de tipeo que silenciosamente dejan una comparación sin efecto |
| `TIMELINE_EVENT` | Tipos de evento de la bitácora de turno (Inactividad, Almuerzo, Desayuno, Pausa de Turno) | Usado por el cálculo de tiempo efectivo de turno y por los reportes de KPI de inactividad |
| Umbrales de tiempo (`NATIVE_IDLE_THRESHOLD_MS`, `MAX_SHIFT_DURATION_MS`, etc.) | Límites numéricos de inactividad, pausas y duración de turno | Son las reglas de negocio que hoy están dispersas como números "mágicos" en `app.js`; moverlas aquí es el primer paso para poder probarlas y documentarlas en un solo lugar |

**Qué verificaron las pruebas:** que los valores coinciden exactamente con lo que usa `app.js`
hoy (no una versión "mejorada" o reinterpretada), que los catálogos están congelados
(`Object.freeze`) y que intentar mutarlos de hecho falla (no solo "no debería cambiar" sino
"no puede cambiarse").

### 4.2 `date-time.js` — 15 pruebas

| Función | Qué hace | Para qué sirve en Risk Manager |
|---|---|---|
| `normalizeMeridiem` | Reduce "p. m.", "AM", "a.m." a `'am'`/`'pm'`/`null` | Paso interno de todo el parseo de horas; absorbe la inconsistencia de cómo Excel y las personas escriben el meridiano |
| `to24Hour` | Convierte una hora de 12 horas + meridiano a 24 horas | Base para comparar horas de inicio/fin de turno sin ambigüedad AM/PM |
| `parseClockTime` | Interpreta "8", "8:30", "10:15 p. m." como `{h, min}` | Lee la hora de inicio/fin de un turno desde el texto de una celda de horario |
| `parseTimeFromLocaleString` | Extrae la hora de un string tipo "16/6/2026, 14:05:00" | Usado al leer marcas de tiempo que vienen como texto localizado (no como objeto `Date`) |
| `parseShiftStart` | Infiere la hora de inicio de un turno desde texto como "Tarde Set 1" o un horario explícito | Es la función que decide a qué hora empieza el turno de un Gestor cuando el horario no trae una hora explícita, usando las convenciones históricas de SET |
| `parseShiftRange` | Separa "8:00 am - 5:00 pm" en inicio y fin | Usado para calcular la duración programada de un turno |
| `toMinutesOfDay` | `{h, min}` → minutos desde medianoche | Unidad común para comparar y sumar horarios |
| `minutesBetweenWrappingMidnight` | Minutos entre dos timestamps, sumando un día si el turno cruza medianoche | Necesario para los turnos nocturnos (si no se envolviera, un turno que cruza medianoche daría una duración negativa) |
| `parseTimeToMs` | Convierte una hora o fecha de texto a milisegundos epoch sobre una fecha base | Usado para anclar una hora suelta ("2:15 PM") a un día concreto, por ejemplo al reconstruir un evento de la bitácora |

**Qué verificaron las pruebas:** los formatos con acentos ("p. m."), las siete convenciones
históricas de SET (Tarde/Mañana/Sábado/Domingo + Set 1-4/Soporte 1-2), el envoltorio correcto de
medianoche, y dos casos límite reales: `parseClockTime(0)` y, en general, cualquier valor `0`
tratado como vacío porque `0` es "falsy" en JavaScript — documentado como comportamiento real,
no corregido en esta corrida.

### 4.3 `excel.js` — 13 pruebas

| Función | Qué hace | Para qué sirve en Risk Manager |
|---|---|---|
| `excelToJSDate` | Convierte un número serial de Excel a `Date` de JavaScript | Los XLSX de Horario/Cronograma/Teletrabajo guardan fechas como números seriales; esta función es la que las vuelve fechas reales |
| `parseExcelDate` | Interpreta una celda como fecha, sea texto ISO/slash o serial numérico | Punto de entrada único para leer "¿qué fecha dice esta celda?" sin que cada lugar del código decida por su cuenta |
| `readFirstSheetRows` | Lee la primera hoja de un libro como filas u objetos, inyectando la API de SheetJS | Usado al cargar Cronograma/Horario/Tareas Riesgo, sin acoplar la función a una versión específica de la librería XLSX |
| `hasMinimumRows` | Verifica que una matriz de filas tenga al menos N filas | Guarda de sanidad antes de intentar leer un Excel que podría estar vacío o mal formado |
| `getCell` | Lee una celda por fila/columna con un valor de respaldo si no existe | Evita errores "undefined is not an object" al leer Excel con filas de distinto largo |
| `isSameDate` | Compara una fecha de Excel (UTC) con una fecha de JavaScript (local) | Usado para saber si una fila del cronograma corresponde al día que se está consultando |

**Qué verificaron las pruebas:** la conversión exacta usando la constante matemáticamente
verificable 25569 = 1-enero-1970 (ancla conocida de la conversión Excel↔Unix), y dos límites
reales encontrados al escribir las pruebas (ver sección 6): el serial `0` y el formato de fecha
`DD/MM/YYYY` con día > 12.

### 4.4 `normalize.js` — 14 pruebas

| Función | Qué hace | Para qué sirve en Risk Manager |
|---|---|---|
| `normalizeName` | Quita acentos, espacios y pasa a minúsculas | Base de toda comparación de nombres de persona en el sistema |
| `namesMatch` | Compara dos nombres por tokens, tolerando nombre parcial | Usado para cruzar el nombre de un Gestor en el cronograma con su registro en el catálogo de usuarios, aun si están escritos distinto |
| `cleanText` | Normaliza texto libre quitando acentos/puntuación y colapsando espacios | Paso compartido por la normalización de nombres y de nombres de tarea |
| `normalizeTaskName` | Reconoce variantes históricas de nombres de tarea ("Revisión de Billetera" → forma canónica) | Permite que el cronograma y el catálogo maestro de tareas coincidan aunque la tarea se haya escrito con distintas palabras a lo largo del tiempo |
| `taskNamesMatch` | Compara dos nombres de tarea, exacto o por tolerancia difusa | Es la función que usa el **Monitoreo del Supervisor** para hacer coincidir una tarea programada con la sesión del Gestor por nombre, no por ID — la razón por la que ese reporte no sufre el bug que sí afecta el cierre de turno del Gestor |
| `setNamesMatch` | Compara nombres de SET por contención de texto | Usado al cruzar el SET de un horario con el SET de una asignación de cronograma |

**Qué verificaron las pruebas:** incluida una regla de negocio explícita que estaba escrita en
el código sin ninguna prueba que la protegiera: el nombre corto "Daniel" nunca debe coincidir con
un nombre que contenga "Josue" — una excepción puntual que, sin una prueba fijándola, cualquier
refactor futuro de `namesMatch` podría romper sin que nadie lo note hasta que alguien con ese
nombre reciba datos de otra persona.

### 4.5 `result.js` — 5 pruebas

| Función | Qué hace | Para qué sirve en Risk Manager |
|---|---|---|
| `ok(value)` | Construye un resultado exitoso congelado `{ok: true, value}` | Parte del protocolo de errores que la Fase 2 (Desacoplamiento Lógico) necesita para que los futuros adapters de Firebase devuelvan éxito/error de forma predecible |
| `fail(code, message, cause)` | Construye un error congelado con código tipificado | Mismo protocolo, lado del error — con `ERROR_CODES` (AUTH_REQUIRED, PERMISSION_DENIED, VALIDATION_ERROR, NETWORK_ERROR, SOURCE_FORMAT_ERROR, PERSISTENCE_ERROR) en vez de mensajes de error sueltos |

**Qué verificaron las pruebas:** la forma exacta de ambos resultados, que están congelados
(`Object.freeze`, en ambos niveles para `fail()`), y los valores y el congelamiento de
`ERROR_CODES`. Este módulo todavía no tiene ningún consumidor real en `app.js` — las pruebas
dejan fijado el contrato para cuando sí lo tenga.

### 4.6 `sanitization.js` — 14 pruebas

| Función | Qué hace | Para qué sirve en Risk Manager |
|---|---|---|
| `escapeHTML` | Escapa `&`, `<`, `>`, `"`, `'` | Base de toda la sanitización; usada para que cualquier texto que un usuario escribió se muestre como texto, no como HTML |
| `encodeInlineHandlerArg` | Codifica un valor para usarlo como argumento de un `onclick` inline | Necesaria mientras `app.js` siga usando handlers `onclick` inline (toda la Fase 3 depende de no romper esto) |
| `sanitizeAnnouncementHref` | Valida que un enlace de comunicado use `http`, `https` o `mailto`, y rechaza `javascript:` y rutas `//` | Evita que un comunicado con un enlace malicioso ejecute código en el navegador de quien lo lee |
| `sanitizeAnnouncementHTML` | Sanitiza el HTML de un comunicado con una lista blanca de etiquetas (`p`, `br`, `strong`, `em`, `ul`, `ol`, `li`, `a`) | Es la defensa central contra XSS cuando un Supervisor publica un comunicado con formato — sin esto, cualquier Supervisor (o alguien que comprometa su cuenta) podría inyectar código que se ejecute en el navegador de todos los Gestores que lean el comunicado |

**Qué verificaron las pruebas:** intentos de XSS concretos (`<script>alert(1)</script>`,
`javascript:alert(1)`, `//evil.com`), que los alias de etiqueta funcionan (`b`→`strong`,
`i`→`em`, `div`→`p`), que una etiqueta no permitida se desenvuelve conservando su texto, y un
hallazgo real documentado en la sección 6.

### 4.7 `validation.js` — 7 pruebas

| Función | Qué hace | Para qué sirve en Risk Manager |
|---|---|---|
| `isNonEmptyString` | Texto no vacío tras recortar espacios | Validación de campos de formulario antes de guardar en Firebase |
| `isFiniteNumber` | Número finito real (no `NaN`, no `Infinity`, no texto) | Validación de montos, cantidades y duraciones |
| `isValidDate` | Instancia de `Date` válida | Evita guardar una fecha "Invalid Date" sin que nadie lo note hasta un reporte |
| `isOneOf` | El valor está dentro de una lista o `Set` de permitidos | Validación de campos tipo catálogo (rol, estado, tipo) |
| `findMissingFields` | Lista los campos obligatorios ausentes de un objeto | Usado para armar el mensaje de error de un formulario incompleto antes de intentar persistirlo |

**Qué verificaron las pruebas:** un caso válido y uno inválido por cada validador, incluido
`isOneOf` con `Set` (no solo arreglo) y `findMissingFields` con un origen `null`/`undefined`
(tratado como objeto vacío, por lo que todos los campos requeridos salen como faltantes).

## 5. Resultado de la corrida

Las 74 pruebas (6+15+13+14+5+14+7) pasaron en los 7 archivos, sin ninguna falla. Ver la tabla de
la sección 1 y el log completo en la sección 7.

## 6. Hallazgos

**Hallazgo único de este corte — `sanitizeAnnouncementHTML` y el contenido de `<script>`.**

Al escribir la prueba de XSS más obvia (`<p>Antes<script>alert(1)</script>Despues</p>`), la
primera versión de la prueba asumía que el resultado sería `<p>AntesDespues</p>` (la etiqueta
`<script>` y todo su contenido desaparecidos). El resultado real es
`<p>Antesalert(1)Despues</p>`: la etiqueta `<script>` sí se elimina, pero el texto "alert(1)" que
estaba dentro se cuela como texto plano visible.

**Causa:** el parser interno (`parseAnnouncementFragment`) trata cualquier etiqueta de
`ANNOUNCEMENT_DROP_CONTENT_TAGS` (incluida `script`) como de cierre automático — no la empuja a
la pila de etiquetas abiertas. Por eso el texto que sigue a `<script>` no queda registrado como
hijo de `<script>`, sino como hijo del elemento padre (`<p>`), y se serializa como texto normal.

**¿Es un riesgo de seguridad?** No. El texto nunca queda dentro de un `<script>` real en la
salida — se muestra como texto visible escapado, no se ejecuta. No es la vulnerabilidad de XSS
que la prueba buscaba originalmente.

**¿Es un problema de todas formas?** Si la intención de "eliminar `<script>`" era que su
contenido completo desapareciera (por ejemplo, para no mostrar código o comentarios internos que
alguien haya pegado por error dentro de una etiqueta `<script>`), este comportamiento no cumple
esa intención. Queda documentado con una prueba que fija el comportamiento real
(`sanitization.test.mjs`), para que quede registrado y se pueda decidir, con autorización
explícita, si se corrige antes de conectar esta función a producción.

No hubo otros hallazgos en este corte: el resto de las 73 pruebas confirmó el comportamiento ya
esperado, incluyendo los límites conocidos que se documentaron como tales desde el diseño de la
prueba (el `0` tratado como vacío en `date-time.js`/`excel.js`, y el formato `DD/MM/YYYY` en
`parseExcelDate`).

## 7. Log completo

Ver el archivo anexo [`2026-10-03-log-pruebas-utils.txt`](2026-10-03-log-pruebas-utils.txt),
salida íntegra y sin editar de `node tests/run-utils-tests.mjs`, generada el 2026-10-03 contra una
copia verificada como idéntica (mismo tamaño y fecha de modificación) a los 7 archivos reales de
`fase_2/src/utils/`.

## 8. Estado frente al criterio de salida y próximos pasos

El criterio de salida de la Fase 1 en `hoja-de-ruta.md` pide: *"Los helpers extraídos tienen
pruebas unitarias y no producen efectos secundarios"*. Con este corte, **ese punto queda cubierto
para los 7 archivos de `utils/`** — son, además, los únicos módulos de `src/` que no tocan DOM,
Firebase ni `localStorage` (la propia Salvaguarda de la Fase 1 lo exige), así que son los
candidatos naturales para ser los primeros 100% probados.

Pendiente, fuera del alcance de este informe:

- Snapshots de entrada/salida contra las funciones equivalentes todavía vigentes en `app.js`
  (pide la sección de Salvaguardas de la Fase 1; requiere decidir cómo extraer esas funciones del
  `app.js` real sin tocarlo, ya que hoy están duplicadas allí).
- Pruebas para el resto de `src/` (dominio, servicios, UI) — se harán con su propio informe en
  esta misma carpeta a medida que esos módulos avancen según la Fase 2.
- Decidir si se corrige el hallazgo de `sanitizeAnnouncementHTML` (sección 6) antes o después de
  conectar `sanitization.js` a producción.
- Confirmar `npm run check` en verde junto con esta suite, y considerar agregar
  `node fase_2/src/tests/run-utils-tests.mjs` como paso adicional de `.github/qa-infra` o de un
  workflow de CI propio.
