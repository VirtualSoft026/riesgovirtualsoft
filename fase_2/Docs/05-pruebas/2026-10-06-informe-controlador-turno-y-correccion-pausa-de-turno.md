# Informe — Controlador de turno y corrección de la Pausa de Turno (integración solo-laboratorio)

**Fecha:** 2026-10-06
**Alcance:** `fase_2/src/controllers/shift-controller.js` (nuevo) y módulos de apoyo (`ui/components/break-button.js`, `domain/shifts/break-state-ownership.js`, `domain/shifts/active-session-payload.js`); paso de integración del laboratorio (`fase_2/lab/integracion/aplicar-integracion.mjs`, `fase_2/lab/stage.mjs`); bundle (`src/entry.js`, `build/verify-bundle.mjs`).
**Responsable:** Luis Fuentes.
**Fase de `hoja-de-ruta.md`:** Fase 2, paso 6 del plan maestro (corte 2 "Pausas y cierre de turno": el controlador que faltaba) y paso 7 en su versión de laboratorio.
**Comando:** ver el log (`2026-10-06-log-controlador-turno-y-correccion-pausa-de-turno.txt`).

## 1. Resumen ejecutivo

El controlador de turno que el corte 2 dejó pendiente quedó escrito y probado, y con él se cierran en `fase_2/src/` el bug de la Pausa de Turno y los 7 requisitos de la revisión externa. **Producción (`app.js`, `index.html`) no se modificó.** Para probarlo, `stage.mjs` aplica 14 sustituciones sobre la **copia de staging** de `app.js` del laboratorio (`C:\riskops-lab-fase2\site\app.js`), exigiendo que cada ancla coincida exactamente una vez.

| Prueba | Resultado |
|---|---|
| `shift-controller.test.mjs` (nueva, navegador simulado) | 20/20 |
| `break-button.test.mjs` (nueva, diferencial vs estilos literales de app.js) | 9/9 |
| `break-state-ownership.test.mjs` (nueva) | 10/10 |
| `active-session-payload.test.mjs` (nueva, diferencial 32 combinaciones vs app.js) | 6/6 |
| Resto de `fase_2/src` (`domain/` y `utils/`) | 190/190 (sin regresiones) |
| **Total `fase_2/src`** | **235/235** |
| `split-shift-flag.unit.cjs` contra el `app.js` INTEGRADO + bundle real, `--strict` | **23/23** (contra el app.js actual: 19 + 4 brechas abiertas) |
| `cierre-horas-efectivas.e2e.cjs` contra el `app.js` INTEGRADO, `--strict` | **13/13** (contra el actual: 7 + 6 brechas abiertas) |
| `monitoreo-render.e2e.cjs` contra el integrado | 7/7 |
| `verify-bundle.mjs` (esbuild, 9 espacios de nombres nuevos + paridad) | PASS, 70 comprobaciones |

## 2. Finalidad de las pruebas

Que el bug y sus bordes queden resueltos en el código que sí llegará a producción (el refactor), con pruebas que fallan si se reintroduce cualquiera: iniciar la pausa sin permiso del supervisor, perder el botón "Retomar Turno", heredar las pausas de otro usuario, ocultar fallos de sincronización o inflar las horas efectivas con el tiempo de pausa.

## 3. Metodología

El controlador no toca DOM, localStorage ni Firebase: recibe todo por inyección (`getUser`, `getState`, `applyState`, `timeline`, `storage`, `sync`, `ui`…), así se prueba en Node con un navegador simulado. La prueba decisiva es de integración: las MISMAS suites que se escribieron contra `app.js` real (`split-shift-flag`, `cierre-horas-efectivas`, `monitoreo-render`) se ejecutan contra la copia integrada con el bundle real compilado por esbuild, en modo `--strict`.

## 4. Detalle por módulo y cómo cierra cada requisito

| Requisito (plan maestro §4 bis) | Dónde queda resuelto | Prueba |
|---|---|---|
| RN-1/RN-2/RN-3 flag `hasSplitShift` (iniciar solo con flag; retomar siempre) | `split-shift-policy.js`, `break-transitions.js`, `shift-controller.js` (`toggle`, `handleFlagChange`) | controlador, B1–B4 en integrado |
| RN-4 la pausa no es tiempo trabajado | `computeShiftClosure` → `calculateShiftClosureTimes` + `buildClosureEmailTimeFields` | H1–H13 en integrado: 6,50 h en vez de 9,50 h |
| Deuda 1 (el controlador pasa el flag) | `toggle()` pasa `splitShiftEnabled: user.hasSplitShift === true` | controlador |
| Deuda 2 (botón refrescado en login, flag en vivo, recarga, cambio de pausa y evento `storage`) | `refreshSplitShiftButton`, `handleFlagChange`, `restoreOnLoad`, `handleStorageChange`; en la integración también `setupSidebar()`/`updateNavigation()` | controlador (storage), R2.6 en integrado |
| Deuda 3 (llave global `riskOps_breakState` sin usuario) | `break-state-ownership.js` (`ownerUid` dentro del mismo objeto; la llave no cambia) | `break-state-ownership.test.mjs` |
| Deuda 4 (el latido no lleva inicio ni acumulado de la pausa) | `active-session-payload.js` → `splitShiftStartTime` y `totalSplitShiftTimeMs` en `active_sessions/{uid}` (sin cambios en reglas: no hay validación de esquema) | `active-session-payload.test.mjs` |
| Deuda 5 (fallo de sincronización silencioso) | `syncAndTrack()` + aviso visible "Sin sincronizar con el supervisor" (también para el latido) | controlador (fallo y recuperación) |
| Deuda 6 (indicador de tarjeta, variables muertas) | Sin cambio: `statusBadge`/`statusDot` no se migran; la tarjeta usa el mismo indicador que Almuerzo (ya cubierto por `active-session-status`) | `monitoreo-render` |
| Deuda 7 (penalidad correo vs panel de reportes) | **Sigue abierta**: decisión de negocio (ver §5) | — |

**Integración del laboratorio (`aplicar-integracion.mjs`).** 14 sustituciones sobre la copia de `app.js`: estado de pausas por usuario, listener `storage`, listener `hasSplitShift`, estado/payload/aviso del latido, tres botones de pausa (ahora delegan), cierre de pausas abiertas, cálculo y campos del correo de cierre, visibilidad en `setupSidebar()` y `updateNavigation()`, y restauración de botones al cargar. Todo lo agregado lleva la marca `[LAB-INTEGRACION]`. Se puede desactivar con `RISKOPS_LAB_INTEGRATE=0` (el laboratorio corre entonces el `app.js` del repo tal cual). Si `app.js` cambia y un ancla deja de coincidir, el laboratorio no arranca.

## 5. Hallazgos

- **Las pruebas de integridad de `parche-pausa-turno.unit.cjs` no aplican al app.js integrado** (cuentan literales de texto del parche de monitoreo; una escritura del estado se movió al bundle). Esa suite sigue siendo la de referencia del `app.js` del repo (21/21 y 5/5 allí); sus 21 pruebas de comportamiento también pasan en el integrado.
- **Compatibilidad del estado local:** un estado guardado por la versión actual de `app.js` (sin `ownerUid`) se acepta una vez como `LEGACY` para no perder la pausa de quien ya la tiene en curso; después se guarda con dueño.
- **Si el flag se revoca mientras hay pausa**, el gestor puede retomar y, al hacerlo, el botón se oculta; el cierre de turno también cierra la pausa abierta aunque no haya flag.
- **Deuda 7 abierta:** el correo de cierre resta la penalidad de las horas efectivas y el panel de reportes (app.js ~5942) no. Con RN-4 ambos descuentan la pausa; unificar la penalidad es una decisión de negocio.
- **Sigue sin migrarse** `applyIdleStateChange()`/`updateActivity()`: el controlador llama a `updateActivity()` de `app.js` por inyección (`onActivity`).
- **La integración es de laboratorio.** Llevarla a `app.js`/`index.html` reales exige tu autorización explícita (plan §7) y se hará con el resto del refactor.

## 6. Log completo

`2026-10-06-log-controlador-turno-y-correccion-pausa-de-turno.txt`.

## 7. Estado frente al criterio de salida y próximos pasos

Con esto el bug de la Pausa de Turno queda corregido en el código del refactor y verificado de extremo a extremo contra el `app.js` real integrado. Para que lo compruebes a mano: ejecuta `Iniciar_Laboratorio_Fase2.bat` (ya incluye la integración), activa `hasSplitShift` del gestor desde el Emulator UI (`users/<uid>/hasSplitShift = true`), entra con el gestor en una ventana y con el supervisor en otra, entra y sal de la pausa, revoca el flag con la pausa activa y cierra un turno con pausa para ver las horas efectivas del correo. Sigue: los cortes restantes del paso 6.
