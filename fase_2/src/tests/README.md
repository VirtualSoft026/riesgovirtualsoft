# Pruebas unitarias de `src/`

Primer contenido real de la carpeta `tests/` prevista en `propuesta-modular.md`. Por ahora cubre
los 7 archivos de `src/utils/`, que es el pendiente de pruebas unitarias de la Fase 1 (ver
`hoja-de-ruta.md`, sección 0 y "Fase 1: Extracción de Utilidades").

## Correr toda la suite de una vez (recomendado, desde 2026-10-14)

Doble clic en `fase_2/lab/suite_pruebas.bat`. Compila el bundle y corre, sobre el código actual de la
rama: la verificación del bundle, todos los `*.test.mjs` de esta carpeta, la integración del laboratorio,
las 9 e2e de `tests/e2e/` y `test_motor_operativo.py` (raíz del repo) en entorno hermético. La red queda
bloqueada y nada se escribe dentro del repo; el log queda en `C:\riskops-lab-fase2\pruebas\ultimo-resultado.txt`.
Detalle, controles de seguridad y primera corrida de referencia: `fase_2/Docs/01-analisis-tecnico/laboratorio-local-fase2.md` §8.

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

## Suites de dominio y de `app.js` real (agregadas desde 2026-10-04)

Además de `utils/`, hay suites en `tests/domain/` (módulos puros de `src/domain`, `src/services`, `src/ui`) y en `tests/e2e/` (extraen funciones **reales** de `app.js` y las ejecutan en un `vm` con DOM/Firebase simulados). Cada corte tiene su informe en `fase_2/Docs/05-pruebas/`.

```powershell
cd fase_2/src
# Dominio (cada archivo es una suite independiente)
Get-ChildItem tests/domain/*.mjs | ForEach-Object { node $_.FullName }

# app.js real (requieren la ruta de app.js; --strict hace fallar las [BRECHA])
node tests/e2e/parche-pausa-turno.unit.cjs ../../app.js
node tests/e2e/split-shift-flag.unit.cjs ../../app.js --index ../../index.html --rules ../../database.rules.json
node tests/e2e/cierre-horas-efectivas.e2e.cjs ../../app.js
```

Reglas de la Pausa de Turno (2026-10-06, plan maestro sección 4 bis):

- **`domain/split-shift-policy.test.mjs`** (8): RN-1/RN-2/RN-3 — visibilidad del botón y permiso de alternar según `hasSplitShift` y estado de pausa activa; coherencia con `toggleBreak`.
- **`domain/break-transitions.test.mjs`** (22): incluye iniciar la pausa sin flag (`blockedReason: 'SPLIT_SHIFT_NOT_ENABLED'`), retomar sin flag, y que almuerzo/desayuno no dependen del flag.
- **`domain/shift-closure-times-split.test.mjs`** (12) y **`domain/shift-effective-hours-split.test.mjs`** (7): RN-4 — la Pausa de Turno se resta de las horas efectivas y se informa en el correo solo si hubo pausa. Los valores esperados son los mismos de `e2e/cierre-horas-efectivas.e2e.cjs`.
- **Las [BRECHA] de `e2e/*` contra el `app.js` actual son esperadas**: documentan defectos que NO se corrigen en producción y que el refactor ya cubre. Se cumplen en modo `--strict` contra el candidato (no aplicado).

Controlador de turno (2026-10-06):

- **`controllers/shift-controller.test.mjs`** (20): el controlador con un navegador simulado (RN-1..RN-4, evento `storage`, fallo de sincronización, cierre con pausa).
- **`ui/break-button.test.mjs`** (9), **`domain/break-state-ownership.test.mjs`** (10), **`domain/active-session-payload.test.mjs`** (6).
- Contra el `app.js` integrado del laboratorio (generado con `fase_2/lab/integracion/aplicar-integracion.mjs`; hace falta el bundle: `cd fase_2/build ; npm run build`):

```powershell
node tests/e2e/split-shift-flag.unit.cjs <app.integrado.js> --strict --riskops ../build/dist/riskops.bundle.js --index ../../index.html --rules ../../database.rules.json
node tests/e2e/cierre-horas-efectivas.e2e.cjs <app.integrado.js> --strict --riskops ../build/dist/riskops.bundle.js
```

- `test-harness.mjs` ahora ofrece `testAsync()` y `await summarizeAsync()`: `test()` no espera promesas, una prueba `async` pasada a `test()` nunca fallaría de verdad.

## Cortes del paso 6 (2026-10-06): suites y e2e integradas

Hay 59 suites en `tests/{controllers,domain,ui,utils}` (827 pruebas) y ayudantes en `tests/helpers/` (DOM y bases simuladas). Correr todo:

```powershell
cd fase_2/src
Get-ChildItem tests/controllers,tests/domain,tests/ui,tests/utils -Filter *.test.mjs -Recurse | ForEach-Object { node $_.FullName }
```

Las e2e `tests/e2e/*-integrado.e2e.cjs` ejecutan las funciones reales de `app.js` original e integrado en un `vm` con el bundle real y comparan el comportamiento. Se necesita el `app.js` integrado (se obtiene aplicando `fase_2/lab/integracion/aplicar-integracion.mjs` y los pasos de `lab/integracion/pasos/` sobre el `app.js` del repo; `stage.mjs` lo hace dentro del laboratorio, en `C:\riskops-lab-fase2\site\app.js`) y el bundle (`cd fase_2/build ; npm run build`, genera `dist/riskops.bundle.js`):

```powershell
node tests/e2e/tareas-integrado.e2e.cjs <integrado.js> --riskops <bundle.js> --original ../../app.js
node tests/e2e/modales-permisos-integrado.e2e.cjs <integrado.js> --riskops <bundle.js> --original ../../app.js
node tests/e2e/historial-navegacion-integrado.e2e.cjs ../../app.js <integrado.js> <bundle.js>
node tests/e2e/kpis-integrado.e2e.cjs <integrado.js> --riskops <bundle.js> --original ../../app.js
node tests/e2e/comunicados-integrado.e2e.cjs <integrado.js> --riskops <bundle.js> --original ../../app.js
```

