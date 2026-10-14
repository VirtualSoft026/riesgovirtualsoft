# Informe — Conexión de `app.js` de la rama a `fase_2/src` (Fase 2)

**Fecha:** 2026-10-14
**Alcance:** llevar al `app.js` real de la rama los cambios que hasta hoy solo se aplicaban a la copia del laboratorio, restaurar el parche de la Pausa de Turno y dejar la suite probando la rama tal cual.
**Responsable:** Luis Fuentes. **Autorización:** en el chat, *"autorizo modificar los archivos app.js e index.html"*.
**Rama:** `backup/fase2-refactor-2026-10-03`. Commit previo de respaldo hecho por el responsable antes de estos cambios.
**Comando:** `fase_2\lab\suite_pruebas.bat` (o `Iniciar_Laboratorio_Fase2.bat`, que corre la misma suite). Log: `2026-10-14-log-conexion-app-js-fase2.txt`.

## 1. Resumen

| Grupo | Archivos OK / total | Pruebas OK | Pruebas falla |
|---|---|---|---|
| Bundle | 1 / 1 | 71 | 0 |
| Unitarias | 78 / 78 | 1279 | 0 |
| Integración | 1 / 1 | — | 0 |
| E2E (9 + parche Pausa de Turno) | 10 / 10 | 487 | 0 |
| Motor operativo | 1 / 1 | 4 | 0 |

Resultado: **todo en verde** sobre el código de la rama, también en el equipo del responsable (Windows, Node 26.8.1, `suite_pruebas.bat`, 2026-10-14 13:05). **Prueba manual en el laboratorio: aprobada por el responsable el 2026-10-14** (`Iniciar_Laboratorio_Fase2.bat`, plan de prueba por áreas).

## 2. Qué cambió

**Producción (autorizado):**
- `app.js`: se aplicó el parche de la Pausa de Turno del 2026-10-04 (6 cambios en `renderActiveSessionsDashboard`, `viewTimelineInMonitoreo` y `openLoginHistoryModal`; nunca se había hecho commit y ya no estaba en el archivo) y luego los 62 pasos de `fase_2/lab/integracion/` (los mismos que el laboratorio aplicaba solo a su copia). Las 6 delegaciones `[Fase 2]` del 2026-10-13/14 se conservan. El archivo pasa de 8 872 a 4 491 líneas: la lógica vive en `fase_2/src` y se usa por `window.RiskOps`. Las marcas `[LAB-INTEGRACION]` se mantienen porque los arneses e2e las usan para ubicar los bloques.
- `index.html`: el bundle se carga **antes** de `app.js` y como script clásico (antes iba después y con `type="module"`, lo que dejaba a `app.js` sin `RiskOps`). Se subió la versión `?v=20261014_f2` de ambos para forzar la recarga en los navegadores.

**Código de `fase_2/src` (rama):**
- `entry.js`: faltaba exportar `shiftActivityController`; el paso de inactividad del 2026-10-09 lo usa (`RiskOps.shiftActivityController` era `undefined`: la detección de inactividad habría fallado en el navegador).
- `services/browser/idle-detector-adapter.js`: se quitó un efecto al importar (`window.idleDetectorGranted = false` al cargar el bundle) que apagaba la detección de inactividad si el bundle cargaba después de `app.js`.
- `services/firebase/firebase-announcement-repository.js`: se restauró `fetchReadReceipt()` (decisión D4: distinguir duplicidad de permiso real al marcar un comunicado como leído).

**Pruebas y laboratorio:**
- `tests/e2e/split-shift-flag.unit.cjs`: el arnés ahora carga también el bloque `[LAB-INTEGRACION:ACTIVIDAD-*]`.
- `tests/controllers/shift-activity-controller.test.mjs`: la expectativa decía que en pausa sí se restaura a Activo; `app.js` (517-537) no lo hace. Se corrigió a paridad con producción.
- `tests/domain/presence-and-counter.test.mjs` (D6): ignora comentarios; `bootstrap.js` solo tenía un import comentado. Se verificó que sigue detectando un import real.
- `lab/stage.mjs`: si `app.js` ya está integrado y `index.html` ya carga el bundle, los sirve tal cual.
- `lab/suite/suite-pruebas.mjs`: prueba el `app.js` de la rama contra la referencia congelada `lab/referencia/app.pre-integracion.js` (app.js antes de conectarlo, con el parche de la Pausa de Turno) y agrega `parche-pausa-turno.unit.cjs` sobre esa referencia.
- `lab/integracion/aplicar-integracion.mjs`: pasos del latido y del correo de cierre adaptados a las delegaciones `[Fase 2]`.

## 3. Hallazgos

1. El parche de la Pausa de Turno aplicado el 2026-10-04 no estaba en ningún commit y desapareció del `app.js` de trabajo entre el 06 y el 13 de octubre. Ahora queda en la rama y la suite lo vigila en la referencia.
2. `RiskOps.shiftActivityController` no existía en el bundle (export faltante). Lo detectó una verificación nueva: todas las referencias `RiskOps.x.y` del `app.js` integrado (74) existen en el bundle.
3. `app.js` integrado **requiere** el bundle: varias llamadas a `RiskOps.*` no tienen respaldo inline. Si `riskops.bundle.js` no carga, la app no funciona.
4. **Corrección preparada (autorizada el 2026-10-14), pendiente de colocar; bloquea el paso a `main`:** `.github/workflows/deploy-pages.yml` (cambio local sin commit del 2026-10-13) compila el bundle desde `fase_2/src/app/bootstrap.js` con `esbuild@0.25`. Debe compilar `fase_2/src/entry.js` (como `fase_2/build/build.mjs`); con `bootstrap.js` el `RiskOps` publicado no tendría los espacios de nombres que usa `app.js`. La versión corregida está en `fase_2/lab/deploy-pages.yml.nuevo` (compila `entry.js` con `fase_2/build`: `npm ci`, `npm run build`, `verify-bundle.mjs`; el bundle resultante es idéntico al probado). `.github/workflows/` no se pudo escribir desde las herramientas remotas ni desde la sesión del responsable; se coloca con `Move-Item -Force fase_2\lab\deploy-pages.yml.nuevo .github\workflows\deploy-pages.yml` antes del PR a `main`. En esta rama no afecta: el despliegue solo corre con `main`.
6. **`Cronograma Octubre.xlsx` no existe en el repositorio** (`Cronograma de Tareas` llega hasta septiembre). Sin ese archivo los gestores no ven tareas del cronograma en octubre. No se agregó a la lista del despliegue porque esa lista exige que cada archivo exista.
5. Regla confirmada por el responsable: la Pausa de Turno no cuenta como tiempo trabajado pero sí entra en las métricas de KPIs (`kpi-indicators-service.js` usa `tiempoPausaTurnoMins` de los reportes guardados).

## 4. Próximos pasos

1. ~~Prueba manual~~ — aprobada el 2026-10-14.
2. Colocar `deploy-pages.yml` corregido (hallazgo 4) antes del PR a `main`.
3. Decisiones D3/D7 en `database.rules.json` (pendientes desde 2026-10-06).
4. Commit de esta conexión en la rama y, al cerrar, PR hacia `feature/Fase_2` / `main`.

## 5. Cierre en la rama (2026-10-14)

Con la suite en verde en el equipo del responsable y la prueba manual aprobada, la Fase 2 queda **cerrada en la rama `backup/fase2-refactor-2026-10-03`**. Quedan fuera de este cierre y bloquean el paso a `main`: hallazgo 4 (`deploy-pages.yml`), hallazgo 6 (`Cronograma Octubre.xlsx`) y las decisiones D3/D7 de `database.rules.json`.
