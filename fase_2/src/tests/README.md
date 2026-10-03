# Pruebas unitarias de `src/`

Primer contenido real de la carpeta `tests/` prevista en `propuesta-modular.md`. Por ahora cubre
los 7 archivos de `src/utils/`, que es el pendiente de pruebas unitarias de la Fase 1 (ver
`hoja-de-ruta.md`, sección 0 y "Fase 1: Extracción de Utilidades").

## Cómo correrlas

```powershell
cd fase_2/src
node tests/run-utils-tests.mjs
```

También se puede correr una sola suite:

```powershell
node tests/utils/sanitization.test.mjs
```

## Por qué hay un `package.json` nuevo en `src/`

Los archivos de `src/` usan `export`/`import` (son módulos ES), pero no tenían declarado
`"type": "module"` en ningún `package.json` de la carpeta. Sin esa declaración, Node intenta leer
estos `.js` como CommonJS y falla al encontrar `export`. El `package.json` nuevo en `src/` solo
agrega ese campo para que `node` pueda ejecutar las pruebas directamente con `import`.

Esto **no afecta el build de esbuild** (`fase_2/build/build.mjs`): esbuild detecta el
formato de cada archivo por su sintaxis, no por este `package.json`. Tampoco afecta a `app.js` ni
a `login.js`, que siguen fuera de `src/` y cargándose como scripts clásicos.

## Qué cubre cada suite

No usan ningún framework de pruebas (Jest, Mocha, etc.) para no introducir una dependencia nueva:
usan `node:assert/strict`, que ya viene con Node, con un runner mínimo propio
(`test-harness.mjs`) en el mismo estilo de `[PASS]`/`[FAIL]` que ya usa `.github/qa-infra`.

- **`constants.js`**: valores y claves esperadas (`STORAGE_KEYS`, `TASK_STATUS`, etc.) y que los
  catálogos sigan `Object.freeze()`.
- **`date-time.js`**: formatos de hora con y sin acentos ("p. m."), las convenciones históricas de
  SET/Tarde/Mañana, el envoltorio de medianoche en `minutesBetweenWrappingMidnight`, y el caso
  límite documentado de `parseClockTime(0)` (el `0` numérico se trata como vacío por ser "falsy"
  en JS).
- **`excel.js`**: conversión de seriales de Excel (usa la constante conocida 25569 = 1-ene-1970
  como ancla verificable), y dos límites reales encontrados al escribir las pruebas:
  `excelToJSDate(0)`/`parseExcelDate(0)` devuelven `null` (mismo motivo: `0` es "falsy"), y
  `parseExcelDate('15/01/2026')` también devuelve `null` porque JS interpreta `DD/MM/YYYY` como
  `MM/DD/YYYY` y 15 no es un mes válido.
- **`normalize.js`**: acentos, la regla difusa de `taskNamesMatch` (longitud ≥ 15 y diferencia ≤
  6 caracteres), y la excepción de negocio explícita en el código "Daniel" nunca hace match contra
  un nombre que contenga "Josue".
- **`result.js`**: forma y congelamiento (`Object.freeze`) de `ok()`/`fail()`.
- **`sanitization.js`**: casos de XSS (`<script>`, `javascript:`, `//evil.com`), alias de etiquetas
  y un **hallazgo real** documentado en la prueba: `sanitizeAnnouncementHTML` quita la etiqueta
  `<script>` pero el texto que queda *dentro* de ella se cuela como texto plano visible (escapado,
  no ejecutable, pero visible) en vez de desaparecer por completo. No es una vulnerabilidad de XSS
  (el texto nunca queda dentro de un `<script>` real en la salida), pero si la intención era que el
  contenido completo desapareciera, es un punto a revisar cuando esta lógica se conecte a
  producción.
- **`validation.js`**: cada validador con un caso válido y uno inválido, incluido `isOneOf` con
  `Set` y `findMissingFields` con origen `null`.

## Qué falta (fuera del alcance de este corte)

- Snapshots de entrada/salida contra las funciones equivalentes de `app.js` (pide la sección de
  Salvaguardas de la Fase 1; requiere decidir cómo extraer esas funciones del `app.js` real sin
  tocarlo).
- Pruebas para el resto de `src/` (dominio, servicios, UI) — quedan para cuando esos módulos
  avancen según la Fase 2.
- Conectar esta suite a `npm run check` de `.github/qa-infra` o a un workflow de CI propio.
