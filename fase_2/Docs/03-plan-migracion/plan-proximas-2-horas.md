# Plan de Próximos Pasos — Bloque de 2 Horas (2026-10-02)

**Punto de partida verificado:** 26 de 97 archivos de `src/` con código real (~27%). Fase 1 completa salvo el paso 9 (conexión real a `app.js`, bloqueado por decisión pendiente de aplicar, no de tomar — ver `02-arquitectura/propuesta-modular.md` §4.1). Fase 2 (desacoplamiento lógico) sin iniciar dentro de `src/`: ninguna carpeta de `entities/`, `controllers/`, `services/contracts/`, `services/firebase/` existe aún con contenido.

**Criterio de alcance para este bloque:** seguir en `fase_2/src/`, sin tocar `app.js` ni ningún archivo de producción — el mismo patrón de todo este trabajo hasta ahora (aislado, verificado con pruebas de comportamiento real antes de dar nada por hecho, sin conectar nada a producción todavía). Orden de prioridad: Fase 5.2 (mayor a menor responsabilidad), empezando por lo que alimenta a `handleEndShift()`, la función más crítica.

---

## Bloque 1 (0:00–0:40) — Entidades (`entities/`)

Las 8 entidades son la base que todo lo demás de Fase 2 va a importar; son funciones puras de forma/validación de datos, bajo riesgo, y desbloquean el resto del bloque.

| Archivo | Contenido mínimo |
|---|---|
| `entities/user.js` | Forma normalizada de usuario: `uid`, `name`, `role`, `approved`, `shift`, `status`. Función `createUser(raw)` que aplica los mismos defaults que ya usa `app.js` (`role \|\| 'Gestor'`, `shift \|\| 'Por Asignar'`). |
| `entities/session.js` | Forma de `active_sessions/{uid}`: `loginTime`, `lastActive`, `status`, contadores de tareas, `timeline`. |
| `entities/task.js` | Forma de una entrada de `taskStateCache`: `id` (canónico), `name`, `status`, `observation`, `updatedAt`, `isExtra`. |
| `entities/shift.js` | Forma de `shift_reports/{id}`: campos ya vistos en `shiftReportObject` dentro de `handleEndShift()` (horaInicio, horaFin, turnoProgramado, tasks, timeline, penalidadConectividadMins, etc.). |
| `entities/permission.js` | Forma de una solicitud de permiso (`permissions/{id}`): tipo, horaFin/Hora_Fin, estado. |
| `entities/announcement.js` | Forma de un comunicado: título, contenido, autor, lecturas. |
| `entities/operational-report.js` | Forma normalizada de un registro de `kpi_operativos_v2.json` / fusión de KPIs. |
| `entities/kpi.js` | Forma de una métrica agregada (minutos de inactividad, tardanza, conectividad). |

**Verificación:** sintaxis ESM (`node --check` vía `--input-type=module`) y, donde haya normalización no trivial (ej. defaults de `user.js`), una prueba diferencial corta contra el fragmento real de `app.js` que hoy arma ese objeto — mismo método usado en todo este trabajo.

## Bloque 2 (0:40–1:40) — Dominio de cierre de turno (`domain/shifts/shift-service.js`, `shift-report-builder.js`)

Es el primer elemento real de Fase 2 (no solo utilidades) y el de mayor prioridad según 5.2, porque `handleEndShift()` es la función más crítica del sistema.

- `domain/shifts/shift-report-builder.js`: construir el objeto `shiftReportObject` completo (hoy armado inline en `handleEndShift()`, líneas ~3715-3832) a partir de: `shift-calculator.js` (ya existe, penalidad/horas efectivas), `timeline-service.js` (ya existe, consolidación), `task-report.js`/`task-service.js` (ya existen, resumen y tareas sin gestionar) y la entidad `shift.js` del Bloque 1. Función pura: recibe datos ya calculados, devuelve el objeto a persistir — sin tocar Firebase ni el DOM.
- `domain/shifts/shift-service.js`: orquesta la **decisión** de si el turno puede cerrarse (SET seleccionado, tareas gestionadas — reutilizando `findUnmanagedTasks` de `task-service.js`) y delega el cálculo a `shift-calculator.js`/`shift-report-builder.js`. Todavía NO incluye la escritura a Firebase (eso es `services/firebase/firebase-shift-repository.js`, fuera de este bloque) ni el DOM/`alert()`.

**Verificación:** prueba de comportamiento real extrayendo el bloque equivalente de `handleEndShift()` en `app.js` (igual que en los hotfixes de tareas) y comparando contra el resultado de `shift-report-builder.js` + `shift-service.js` con los mismos datos de entrada, para varios casos (turno normal, con pausas, con tareas extra, con penalidad).

## Bloque 3 (1:40–2:00) — Cierre y registro

- Actualizar el conteo de `src/` (archivos reales) en `hoja-de-ruta.md` §5.1 con el resultado real del bloque.
- Dejar en este documento (sección "Resultado", abajo) qué quedó hecho, qué pruebas pasaron, y qué sigue para el próximo bloque: lo más probable, `services/contracts/` (los contratos que `shift-service.js` ya empieza a necesitar) y `services/firebase/firebase-shift-repository.js`.
- No commitear nada de `src/` a git todavía salvo que se pida explícitamente — sigue siendo trabajo aislado sin conectar a producción.

---

## Fuera de alcance de este bloque (explícito)

- Conectar nada de `src/` a `app.js` (paso 9 / Fase 3) — requiere la aprobación de diff que ya se explicó, no es trabajo de "avanzar la refactorización" sin supervisión.
- Las tareas de Fase 5.3/5.4 (centralizar horarios en Firebase, MicroStrategy → Firebase) — explícitamente pospuestas hasta cerrar la Fase 4, por acuerdo ya registrado.
- Resolver la divergencia de la rama local con `origin/feature/Fase_2` — no afecta a este trabajo (que no se commitea en este bloque) y queda pendiente para cuando el usuario lo pida.
- Mergear el PR pendiente del hash F1 (`caa64da`) a `main` — es parte de la pista de producción, no de este bloque.

## Resultado (completar al cierre del bloque)

_Pendiente de completar al terminar los 3 bloques._
