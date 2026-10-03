***
# Hoja de Ruta para la Refactorización

## Objetivo y reglas de seguridad

La migración transformará el frontend monolítico en módulos independientes sin cambiar primero el comportamiento observable. La implementación debe avanzar por cortes pequeños, revisables y reversibles, manteniendo `app.js`, `login.js` y las rutas Firebase como fachadas de compatibilidad hasta que cada flujo nuevo tenga cobertura suficiente.

Reglas que aplican a todas las fases:

- No mezclar refactorización estructural con cambios de negocio, diseño visual, reglas de seguridad o migraciones de datos.
- Mantener una rama o commit de rollback por cada corte funcional.
- Comparar la salida nueva contra la implementación anterior antes de retirar el código antiguo.
- No cambiar simultáneamente nombres de campos Firebase, rutas RTDB y lógica de presentación.
- No introducir dependencias nuevas en `window`, `localStorage` o variables globales sin documentarlas.
- Ejecutar las reglas de `database.rules.json` en el emulador antes de cualquier cambio en repositorios.
- Mantener los archivos públicos y los nombres de campos actuales durante la primera migración; mover fuentes operativas a una fuente autenticada queda como cambio posterior.

### Línea base antes de comenzar

1. Congelar una referencia funcional de `app.js`, `login.js`, `js/tiempos.js`, `database.rules.json` y los archivos operativos.
2. Ejecutar el arnés existente desde `.github/qa-infra`:

	```powershell
	Set-Location .github/qa-infra
	npm ci
	npm run check
	npm run qa
	npm run test:supervisor-comunicados-rules
	```

3. Ejecutar `test_motor_operativo.py` con un entorno de prueba que no use credenciales reales ni servicios de producción.
4. Registrar como baseline las salidas de cierre de turno, cálculo de tardanza/inactividad, KPIs, permisos, comunicados, autenticación y exportaciones.
5. Capturar el inventario de funciones y el diagnóstico estructural existentes antes de mover código.

Si la línea base falla, se debe corregir o documentar el fallo antes de atribuirlo a la migración.

## Fase 1: Extracción de Utilidades

### Propósito

Extraer funciones puras, constantes y helpers sin cambiar los flujos de negocio ni los contratos externos. Esta fase reduce duplicación y crea las primeras unidades probables de prueba.

### Pasos

1. Crear `src/utils/`, `src/config/` y una convención de módulos compatible con el entorno actual, sin eliminar todavía los scripts existentes.
2. Extraer constantes desde `app.js`, `login.js` y `js/tiempos.js`:
	- roles y capacidades de comunicados;
	- estados de tareas, permisos y reportes;
	- límites de pausas, inactividad y duración de turno;
	- nombres de rutas Firebase y claves de `localStorage`;
	- nombres de archivos Excel y JSON.
3. Extraer a `utils/normalize.js` las funciones `normalizeName`, `namesMatch`, limpieza de estados y comparación de gestores. Mantener un wrapper con el nombre antiguo mientras se actualizan los consumidores.
4. Extraer a `utils/date-time.js` el parsing de fechas locales, fechas seriales de Excel, turnos nocturnos y conversiones a minutos. No modificar aún las reglas de cálculo.
5. Extraer a `utils/excel.js` las conversiones comunes de fechas, validación de hojas y lectura segura de rangos.
6. Extraer `escapeHTML`, `sanitizeAnnouncementHTML`, `sanitizeAnnouncementHref` y `encodeInlineHandlerArg` a `utils/sanitization.js`, conservando sus pruebas de XSS.
7. Extraer la consolidación de eventos de `shiftTimeline` a una función pura reutilizable por el cierre de turno y los KPIs.
8. Extraer las funciones puras de resumen de tareas y cálculo elemental de tardanza/inactividad antes de tocar los renderizadores.
9. Reemplazar gradualmente los cuerpos duplicados por imports o llamadas a los helpers nuevos. Durante la transición, los wrappers deben conservar la firma pública anterior.

### Salvaguardas

- No leer ni escribir DOM, Firebase, `localStorage` ni `window` dentro de `utils/`.
- Probar valores nulos, formatos históricos, acentos, medianoche, permisos y eventos superpuestos.
- Mantener snapshots de entrada/salida para comparar la utilidad nueva con la función antigua.
- Si una utilidad necesita acceso externo, no se extrae como utilidad pura: se reserva para la Fase 2 como servicio o adapter.

### Criterio de salida

- Los helpers extraídos tienen pruebas unitarias y no producen efectos secundarios.
- `npm run check` sigue pasando y no cambia la salida funcional del sistema.
- No quedan copias divergentes de normalización, parsing de fechas o sanitización en los flujos migrados.
- El rollback consiste en restaurar los wrappers anteriores sin modificar datos de Firebase.

### Nota de avance (2026-10-03): primer informe de pruebas y decisiones derivadas

Con el primer informe de pruebas de esta fase (`../05-pruebas/2026-10-03-informe-pruebas-utils.md`, 74/74 pruebas de `src/utils/`) se tomaron las siguientes decisiones:

1. **Snapshots de entrada/salida contra `app.js`** (Salvaguardas de esta fase, línea "Mantener snapshots de entrada/salida..."): no es viable fragmentar `app.js` función por función de forma incremental. El enfoque acordado es extraer (copiar/clonar) cada función ya migrada a `src/utils/` tal como sigue viviendo hoy en `app.js`, y dejar en su lugar original solo un comentario que indique que esa lógica fue extraída a `src/utils/<archivo>.js` para pruebas, sin alterar su comportamiento. Esto habilita comparar snapshots de entrada/salida entre ambas copias sin tocar el flujo que corre hoy en producción. **Pendiente de ejecución**: esto implica escribir comentarios dentro de `app.js`, que sigue siendo un archivo de producción — se hace función por función, solo con autorización explícita del usuario en el momento de hacerlo, como el resto de cambios a `app.js`.
2. **Pruebas para el resto de `src/`** (dominio, servicios, UI): avanzan junto con la Fase 2, cada corte con su propio informe nuevo en `../05-pruebas/` (mismo formato que el de `utils/`).
3. **Hallazgo de `sanitizeAnnouncementHTML`** (sección 6 del informe): se corrige después de conectar `sanitization.js` a producción, no antes. Queda pendiente confirmar primero si algún flujo ya depende del comportamiento actual (el texto suelto que queda visible tras quitar `<script>`) antes de cambiarlo.
4. **`npm run check` + la nueva suite de `utils/`**: verificados juntos el 2026-10-03, ambos en verde (detalle abajo). Queda pendiente de autorización agregar `node ../../fase_2/src/tests/run-utils-tests.mjs` al script `check` de `.github/qa-infra` — y por lo tanto al workflow `phase1-compatibility-qa.yml`, que ya corre `npm run check` como puerta obligatoria (ver Fase 4, sección "Pruebas de integración con Firebase Emulator"). El cambio ya se probó de punta a punta y está listo para escribirse en cuanto se confirme.

Verificación de `npm run check` (`.github/qa-infra`) el 2026-10-03, contra una copia de `app.js` y de los 7 archivos de `fase_2/src/utils/` idéntica a la del equipo del usuario (mismo tamaño y fecha de modificación):

- `node --check qa_matrix.js`, `node --check migration_rehearsal.js`, `node --check frontend_security_smoke.js`: sin errores de sintaxis.
- `node migration_rehearsal.test.js` → `MIGRATION_UNIT_TESTS=PASS`.
- `node frontend_security_smoke.js` → `FRONTEND_SECURITY_SMOKE=PASS` y el resto de sus 26 verificaciones, todas `PASS`.
- `node cronograma_cross_month.test.js` → 5 passed, 0 failed.
- `node end_shift_smoke.js` → `END_SHIFT_SMOKE=PASS`.
- `node inactivity_timeline.test.js` → 9 passed, 0 failed.

Resultado: código de salida 0 en toda la cadena, igual que como `npm run check` la ejecuta en CI. Corrida en conjunto con `node ../../fase_2/src/tests/run-utils-tests.mjs` desde `.github/qa-infra` (la misma ruta relativa que tendría dentro del script `check`): también código de salida 0; además se verificó que esa misma llamada falla con código 1 si una sola prueba de `utils/` se rompe, confirmando que, de integrarse, bloquearía el CI correctamente en vez de pasar en falso.

## Fase 2: Desacoplamiento Lógico

### Propósito

Separar reglas de negocio y acceso a servicios de la interfaz, introduciendo entidades, casos de uso y contratos sin exigir todavía el traslado físico completo de todos los archivos.

### Pasos

1. Definir entidades normalizadas para `User`, `Session`, `Task`, `Shift`, `Permission`, `Announcement`, `OperationalReport` y `Kpi`.
2. Definir contratos en `src/services/contracts/` para autenticación, usuarios, turnos, permisos, comunicados, horarios, KPIs y notificaciones.
3. Implementar adapters mínimos alrededor de Firebase:
	- `FirebaseAuthAdapter` para login, registro, logout y errores normalizados;
	- repositorios para `users`, `active_sessions`, `shift_reports`, `permissions`, `announcements` y logs;
	- suscripciones con función de limpieza para reemplazar `.on(...)` sin teardown.
4. Encapsular `localStorage` en `local-session-storage.js`. Ningún controlador nuevo debe conocer claves literales como `riskOps_currentUser` o `riskOps_timeline`.
5. Separar el cierre de turno en el siguiente flujo:
	- `ShiftController` recibe la acción de UI;
	- `ShiftService` valida condiciones del turno;
	- `ShiftCalculator` calcula pausas y penalidades;
	- `TimelineService` consolida eventos;
	- `ShiftReportBuilder` crea la entidad persistible;
	- `ShiftRepository` ejecuta la escritura atómica;
	- `NotificationProvider` envía el correo best-effort.
6. Encapsular horarios y cronogramas detrás de `ScheduleProvider` y `TaskProvider`. `login.js` y `app.js` deben recibir turnos normalizados, no matrices SheetJS.
7. Separar KPIs en adquisición, normalización, cálculo y presentación:
	- adapters leen JSON/Firebase;
	- `KpiService` fusiona las fuentes;
	- `MetricsCalculator` calcula resultados puros;
	- controladores convierten filtros del DOM en comandos;
	- vistas renderizan tablas, tarjetas y gráficas.
8. Crear una fachada de compatibilidad en `app.js` que delegue al controlador nuevo mediante una bandera controlada por entorno o configuración local.
9. Migrar un flujo vertical por vez: autenticación, tareas/horarios, cierre de turno, permisos/comunicados, monitoreo y finalmente KPIs/reportes.

### Salvaguardas

- Los repositorios nuevos deben usar las mismas rutas, campos y reglas Firebase antes de introducir versiones nuevas.
- En modo sombra, el servicio nuevo calcula el resultado sin publicarlo y se compara con el resultado de la implementación antigua.
- Para cierres de turno, publicar solo una escritura; no ejecutar en paralelo dos implementaciones que puedan duplicar reportes.
- Los listeners nuevos deben tener `dispose()` y reemplazar explícitamente los listeners anteriores.
- Las reglas de autorización siguen siendo `database.rules.json`; la UI no puede convertirse en fuente de seguridad.

### Criterio de salida

- Los controladores no importan SDKs, DOM ni `localStorage` directamente.
- Los cálculos de cierre, tardanza, inactividad y KPIs se prueban sin red.
- Cada servicio externo tiene un fake para pruebas y un adapter real para producción.
- El modo nuevo puede desactivarse sin perder datos ni dejar listeners activos.

## Fase 3: Reorganización de Archivos

### Propósito

Mover el código ya desacoplado a la estructura definida en `propuesta-modular.md`, evitando que el movimiento de archivos cambie rutas públicas, orden de carga o contratos existentes.

### Pasos

1. Crear el árbol `src/` por lotes pequeños: primero `config`, `utils`, `entities` y `services/contracts`; luego dominio, servicios concretos, controladores y UI.
2. Mantener `app.js` y `login.js` como puntos de entrada del sitio. Cada uno importará o invocará `src/app/bootstrap.js` mediante el mecanismo compatible con el despliegue actual.
3. Mover primero módulos sin efectos secundarios: utilidades, entidades, parsers y calculadoras.
4. Mover después adapters y repositorios, dejando `firebase-config.js` como único inicializador concreto del SDK durante la transición.
5. Mover los casos de uso por vertical funcional:
	- `domain/auth` y `auth-controller`;
	- `domain/schedules` y tareas;
	- `domain/shifts` y cierre;
	- permisos y comunicados;
	- analytics, tiempos y reportes.
6. Sustituir progresivamente los accesos directos del HTML a funciones globales por listeners registrados en `ui/views/` y `controllers/`.
7. Centralizar selectores en `ui/dom/elements.js`, pero mantener temporalmente aliases para IDs que ya estén referenciados en `index.html`.
8. Tras cada movimiento, actualizar referencias, orden de carga, versiones de cache busting y scripts de despliegue. No borrar el archivo antiguo hasta completar la regresión del flujo.
9. Retirar `app.js` por segmentos, no como una reescritura total. Cuando quede como composición, renombrarlo o conservarlo como entrypoint delgado documentado.
10. Alinear el pipeline Python con contratos versionados de salida (`kpi_operativos_v2.json`) sin mezclar en esta fase la migración del origen MicroStrategy.

### Salvaguardas

- Cada movimiento debe ser un cambio mecánico aislado y revisable.
- No cambiar simultáneamente la ubicación y el comportamiento de una función crítica.
- Conservar aliases de exportación para `window.selectTask`, `window.exportShiftReport`, `window.updateNavigation` y otras APIs temporales hasta eliminar sus usos.
- Validar que Pages/Firebase Hosting publiquen todos los módulos necesarios y no expongan archivos de trabajo nuevos.
- Usar la allowlist de despliegue existente para evitar publicar fixtures, secretos o artefactos de pruebas.

### Criterio de salida

- La aplicación arranca con la estructura `src/` y mantiene los mismos flujos de usuario.
- No hay imports circulares ni módulos de dominio que dependan de la UI.
- Las rutas de datos y reglas RTDB no cambiaron accidentalmente.
- `app.js` y `login.js` contienen solo composición, compatibilidad o delegación explícita.

## Fase 4: Pruebas de Regresión

### Propósito

Demostrar que cada extracción conserva las salidas funcionales y los efectos de seguridad esperados, cubriendo tanto unidades puras como integración con Firebase Emulator y pruebas de navegador cuando corresponda.

### Estrategia por niveles

#### 1. Pruebas unitarias

Cubrir sin red ni DOM:

- normalización y coincidencia de nombres;
- fechas seriales de Excel y turnos que cruzan medianoche;
- cálculo de tardanza con permisos;
- consolidación de timelines y eliminación de solapamientos;
- duración efectiva, pausas y penalidades;
- estados y resumen de tareas;
- agregación de KPIs y métricas de retiros;
- mapeo de respuestas MicroStrategy;
- validación de entidades y errores normalizados.

Cada caso debe incluir fixtures de datos actuales, históricos, incompletos y ambiguos.

#### 2. Pruebas de adapters y contratos

Usar dobles para verificar que:

- Firebase snapshots se convierten a entidades sin perder UID ni rol.
- Las escrituras atómicas generan exactamente las rutas esperadas.
- Los repositorios devuelven errores diferenciados y no silencian fallos.
- El adapter XLSX rechaza hojas incompatibles y conserva fechas válidas.
- FormSubmit y el proveedor de IA no reciben secretos ni datos fuera de su contrato.
- El provider JSON mantiene compatibilidad de versión con `kpi_operativos_v2.json`.

#### 3. Pruebas de integración con Firebase Emulator

Ejecutar como mínimo:

- autenticación de usuario aprobado, pendiente y no autorizado;
- lectura/escritura por rol en `database.rules.json`;
- creación, aprobación y actualización de permisos;
- publicación, lectura y confirmación de comunicados;
- cierre atómico de turno, sesión activa y `logoutTime`;
- migración UID-only y su idempotencia;
- suscripción y limpieza de sesiones activas.

El arnés existente en `.github/qa-infra` debe permanecer como puerta obligatoria: `npm run qa`, `npm run test:supervisor-comunicados-rules` y `npm run check`.

#### 4. Pruebas de flujo frontend

Verificar en navegador o smoke tests:

- login, registro y recuperación;
- carga de horario, cronograma y tareas;
- cambio de estado de tarea y persistencia;
- pausas, inactividad y recuperación de foco;
- cierre de turno con correo exitoso y fallido;
- permisos y comunicados por rol;
- filtros de KPIs, gráficas y exportación PDF;
- ausencia de errores JavaScript, listeners duplicados y solicitudes inesperadas.

#### 5. Comparación lado a lado

Durante la migración, ejecutar la implementación antigua y la nueva sobre el mismo fixture, sin duplicar escrituras reales. Comparar:

- entidades normalizadas;
- métricas y redondeos;
- rutas y payloads de persistencia;
- estados finales del usuario;
- HTML esencial y cantidades mostradas;
- errores esperados y códigos de resultado.

Las diferencias deben clasificarse como equivalencia, corrección aprobada o regresión. No se debe aceptar una diferencia silenciosa.

### Matriz mínima de regresión

| Área | Entrada crítica | Salida esperada | Prueba de referencia |
|---|---|---|---|
| Autenticación | Usuario aprobado/pendiente y rol | Acceso o bloqueo correcto | `qa_matrix.js`, smoke frontend |
| Horarios | Excel con fechas seriales y turnos nocturnos | Turno y expiración correctos | `cronograma_cross_month.test.js` |
| Tareas | Estados legacy y actuales | Resumen y progreso equivalentes | fixtures de tareas |
| Inactividad | Eventos superpuestos, pausas y foco | Minutos consolidados sin duplicar | `inactivity_timeline.test.js` |
| Cierre | Reporte, timeline y fallo de correo | Persistencia atómica y sesión cerrada | `end_shift_smoke.js` |
| Migración de datos | UID ambiguo, único y ya migrado | Selección conservadora e idempotente | `migration_rehearsal.test.js` |
| Comunicados | Gestor, supervisor y admin | Capacidades y reglas alineadas | `supervisor_comunicados_rules.spec.js` |
| Seguridad frontend | HTML/URL malicioso | Salida sanitizada | `frontend_security_smoke.js` |
| Motor operativo | Árbol paginado de MicroStrategy | Filas completas sin mutación | `test_motor_operativo.py` |

### Puertas de promoción y rollback

Antes de promover cada fase:

1. Pasar validación estática/sintáctica y pruebas unitarias.
2. Pasar `npm run check` y los escenarios Firebase Emulator aplicables.
3. Revisar diff de rutas, reglas, payloads y artefacto publicado.
4. Ejecutar smoke de los flujos afectados en un entorno aislado.
5. Activar la nueva implementación mediante bandera o composición controlada.
6. Observar errores, tiempos, fallos de persistencia y diferencias de métricas.
7. Mantener disponible el wrapper anterior hasta cerrar el periodo de observación.

El rollback debe consistir en desactivar la bandera o restaurar la fachada anterior, sin revertir datos válidos ni ejecutar migraciones destructivas. Si una fase cambia el esquema de datos, debe incluir antes un plan de compatibilidad de lectura y una operación de rollback probada en el emulador.

## Fase 5: Backlog del Usuario (pendiente, posterior a la refactorización)

> Incorporado el 2026-09-22 a partir de las tareas que el usuario tenía pendientes para el proyecto. No todas son una "fase" en el sentido estricto de secuencia: 5.1 es una nota de avance, 5.2 es un criterio de orden que aplica dentro de las Fases 1-2 ya definidas, y 5.3-5.4 son ampliaciones de alcance funcional (no refactorización estructural pura) que deben esperar a que cierre el criterio de salida de la Fase 4, según la regla "no mezclar refactorización estructural con cambios de negocio" de la sección 0.

### 5.1 Avance de creación de subcarpetas de `src/`

Según indicación del usuario (2026-09-22), esta tarea estaba al 50% de avance en criterio percibido. El diagnóstico técnico de esa misma sesión medía, con otro criterio, 8 de 46 archivos con contenido real (~17%).

**Cifra verificada al 2026-10-02:** el árbol completo de `propuesta-modular.md` define **97 archivos**. Hoy existen **60 archivos creados** (stub o con contenido) y **26 con código real** (~27% del total objetivo). Avance de Fase 1 desde el 2026-09-22: de 13 → 25 → 26 archivos reales (la extracción de utilidades y el paso 7/8 de consolidación de timeline e inactividad quedaron completos). Único pendiente de Fase 1: el paso 9 (reemplazar las copias duplicadas en `app.js`/`login.js`/`tiempos.js` por imports reales), bloqueado por la decisión ya tomada de usar un bundle esbuild (`propuesta-modular.md` §4.1) pero pendiente de aplicarse — el prototipo ya existe y pasa su propia verificación en `fase_2/build/` y `fase_2/lab/`.

*(Nota 2026-10-03: `fase_2/` se movió de `.github/fase_2/` a la raíz del repositorio. Esto no cambia nada del contenido ni del avance medido arriba, pero sí destraba la escritura remota de archivos dentro de la carpeta — antes bloqueada por tratarse de una ruta `.github/...` — y hace que `fase_2/src/tests/` ya no caiga automáticamente dentro de `forbidden_parts` de `deploy-pages.yml` por el segmento `.github` [aunque esa carpeta nunca se publicaría de todas formas: `deploy-pages.yml` copia solo una allowlist explícita de archivos, no todo salvo exclusiones]. Pendiente real: decidir si `deploy-pages.yml` necesita algún ajuste cuando `src/` se mueva a su ubicación final en la raíz, tal como ya señalaba `propuesta-modular.md` §4.2.)*

Carpetas del árbol objetivo que todavía no existen ni como stub: `controllers/`, `ui/` (salvo `ui/components/multi-select.js`), `services/contracts/`, `services/firebase/`, `services/files/`, `services/observability/`. Es decir, toda la Fase 2 (desacoplamiento lógico) sigue prácticamente sin iniciar dentro de `src/`. `tests/` ya no está vacía: desde el 2026-10-03 tiene las primeras pruebas unitarias reales (los 7 archivos de `utils/`, 74 pruebas — ver `fase_2/src/tests/README.md`).

**Nota de separación de pistas de trabajo:** en paralelo a esta migración arquitectónica, entre el 2026-09-29 y el 2026-10-02 se diagnosticaron y corrigieron directamente en `app.js` (producción, fuera de `src/`) dos bugs reales de identidad de tareas ("Tarea 10003" y el mismo problema en tareas reales del catálogo como "Aprobación de retiros"/"WhatsApp"), ya fusionados a `main` vía PR. Fueron hotfixes de producción, no parte de la refactorización de Fase 2 — se documentan en `../04-diagnostico-continuacion/`.

### 5.2 Orden de extracción: de mayor a menor responsabilidad

Criterio del usuario para priorizar qué se extrae primero dentro de las Fases 1 y 2: empezar por los archivos/funciones de mayor responsabilidad y bajar progresivamente hacia los de menor responsabilidad. Esto coincide con el orden en que `diagnostico-monolito.md` ya lista las "funciones dios" por severidad de acoplamiento:

1. `handleEndShift()` — la más crítica (persistencia atómica, cierre de sesión, notificación).
2. `calcularIndicadores()`.
3. `loadControlOperativoData()`.
4. `renderControlOperativoFiltered()`.
5. `loadSchedule()` / `loadExcelTasks()`.
6. `checkShiftExpirationOnLogin()` (en `login.js`).
7. `MicroStrategyConnector.fetch_retiros_data()` (en `motor_operativo.py`).

Se adopta este orden como guía de priorización para los pasos 2-8 de la Fase 1 y el paso 9 de la Fase 2 ("Migrar un flujo vertical por vez"), en vez de un orden arbitrario por archivo.

### 5.3 Centralizar datos operativos (tareas, horarios, teletrabajo) en Firebase, editables por el Supervisor desde Risk Manager

Objetivo: que el Supervisor pueda crear/modificar horarios, cronogramas de tareas y teletrabajo directamente desde Risk Manager, eliminando la dependencia de editar los archivos XLSX públicos (`Horario/`, `Cronograma de Tareas/`, `Teletrabajo/`). Coincide con la deuda que el propio `README.md` ya identifica para la Fase 2 ("Mover datos operativos... a una fuente autenticada") y con lo señalado en `diagnostico-monolito.md` sobre la fragilidad de depender de archivos Excel públicos versionados en el repositorio.

Encaje con la arquitectura de `propuesta-modular.md`:

- Nuevo repositorio `FirebaseScheduleRepository` en `services/firebase/`, detrás del contrato `schedule-provider.js` ya previsto en `services/contracts/`.
- Nuevo `controllers/schedule-controller.js` (agregado a la sección 1 de `propuesta-modular.md` en esta misma actualización) que traduzca acciones de edición de la UI a casos de uso de `domain/schedules/`.
- Vista de edición en `ui/views/schedule-view.js` (ya prevista), con visibilidad restringida a roles `Supervisor`/`Admin`.
- Requiere ampliar `database.rules.json` con nuevas rutas (p. ej. `schedules/`, `task_catalog/`, `teletrabajo/`) y sus reglas de lectura/escritura por rol. Por la advertencia explícita de `README.md` ("Ningún cambio a `database.rules.json`... sin revisar [`release-docs/`] primero"), este paso debe planearse como su propio corte, con revisión de seguridad dedicada, no como parte incidental de la reorganización de `src/`.
- Los archivos XLSX pueden mantenerse como fuente de lectura de respaldo (`XlsxScheduleAdapter`) durante una transición con comparación lado a lado, antes de retirarlos, siguiendo el mismo patrón de fachada de compatibilidad que el resto del plan.

### 5.4 Persistir la salida del conector MicroStrategy en Firebase para que los KPIs se consulten desde la base de datos

Objetivo: que `MicroStrategyConnector`/`MotorOperativo` (en `motor_operativo.py`) escriban los datos de retiros/KPIs directamente en Firebase Realtime Database, en vez de (o además de) generar `kpi_operativos_v2.json`, para que el frontend los consulte desde la base de datos en lugar de mediante `fetch` a un archivo estático.

Encaje con la arquitectura ya prevista: `propuesta-modular.md` ya incluye `services/firebase/firebase-kpi-provider.js` en su árbol de carpetas — esta tarea es, en gran parte, completar el lado que falta: hoy `motor_operativo.py` ya consulta Firebase vía REST (para `GESTORES_PERMITIDOS`, según `arquitectura-actual.md`) pero no escribe en ella; falta el paso de escritura para que `firebase-kpi-provider.js` tenga una fuente real que leer. Debe planearse junto con:

- Definir el esquema de la ruta Firebase destino (p. ej. `kpi_operativos/{periodo}`) con versión de documento, replicando la validación de compatibilidad que hoy tiene `JsonKpiAdapter` para `kpi_operativos_v2.json`.
- Mantener `kpi_operativos_v2.json` como salida en paralelo durante la transición (comparación lado a lado, criterio ya establecido en la Fase 4 de este documento) antes de retirarlo.
- Revisar `database.rules.json` para las nuevas rutas de escritura desde el pipeline Python (credenciales de servicio, no las del usuario final) — mismo criterio de revisión de seguridad dedicada que 5.3.
