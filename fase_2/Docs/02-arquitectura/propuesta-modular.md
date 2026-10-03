@@
# Propuesta de Arquitectura Modular (TO-BE)

La arquitectura objetivo conserva la aplicación web vanilla y Firebase como decisiones de bajo riesgo, pero reemplaza el núcleo global por módulos con contratos explícitos. La migración debe ser incremental: cada módulo nuevo puede convivir temporalmente con `app.js`, siempre que la nueva lógica no vuelva a introducir dependencias globales.

## 1. Estructura de Carpetas Propuesta

```text
src/
├── app/
│   ├── bootstrap.js                 # Punto único de arranque de la aplicación
│   ├── app-router.js                # Cambio de vistas y ciclo de vida
│   ├── app-state.js                 # Estado observable mínimo de sesión y UI
│   └── event-bus.js                 # Eventos internos tipados/nominados
│
├── config/
│   ├── environment.js               # URLs, emuladores y configuración pública
│   ├── firebase.js                  # Inicialización aislada del SDK
│   ├── roles.js                     # Roles y capacidades de interfaz
│   ├── routes.js                     # Rutas de datos centralizadas
│   └── doc-links.js                  # Mapas estáticos de URLs de documentos/manuales
│
├── entities/
│   ├── user.js                      # Perfil, rol y estado de aprobación
│   ├── session.js                   # Sesión activa, presencia y login log
│   ├── task.js                      # Tarea, estado, observación y asignación
│   ├── shift.js                     # Turno, pausas, timeline y cierre
│   ├── permission.js                # Solicitud y estado de permiso
│   ├── announcement.js              # Comunicado y lectura
│   ├── operational-report.js        # Reporte de turno normalizado
│   └── kpi.js                       # Métricas operativas y retiros
│
├── domain/
│   ├── auth/
│   │   ├── auth-service.js          # Casos de uso de login/logout/registro
│   │   ├── approval-policy.js       # Reglas de aprobación y roles
│   │   └── shift-expiration.js      # Decide si un turno ya terminó
│   ├── shifts/
│   │   ├── shift-service.js         # Iniciar, pausar y cerrar turno
│   │   ├── shift-calculator.js      # Duración, pausas y penalidades
│   │   ├── timeline-service.js      # Consolidación de eventos superpuestos
│   │   └── shift-report-builder.js  # Construcción del reporte persistible
│   ├── tasks/
│   │   ├── task-service.js          # Cambios de estado y progreso
│   │   ├── task-reconciler.js       # Compatibilidad entre catálogo y legacy
│   │   └── task-report.js           # Resumen de tareas del turno
│   ├── schedules/
│   │   ├── schedule-service.js      # Turno asignado por fecha y gestor
│   │   ├── schedule-parser.js       # Parser de hojas de horario
│   │   ├── cronogram-parser.js      # Parser de cronogramas de tareas
│   │   └── name-matcher.js          # Normalización y resolución de nombres
│   ├── permissions/
│   │   └── permission-service.js    # Crear, aprobar y consultar permisos
│   ├── announcements/
│   │   ├── announcement-service.js # Publicar, leer y eliminar comunicados
│   │   └── announcement-capabilities.js # Roles autorizados a publicar/ver/eliminar
│   └── analytics/
│       ├── kpi-service.js           # Orquestación de fuentes de KPI
│       ├── metrics-calculator.js    # Cálculos puros de actividad y conectividad
│       ├── withdrawal-metrics.js    # Métricas de retiros
│       └── time-metrics.js          # Tardanza e inactividad
│
├── services/
│   ├── contracts/
│   │   ├── auth-provider.js         # Contrato de autenticación
│   │   ├── user-repository.js       # Contrato de usuarios
│   │   ├── shift-repository.js      # Contrato de reportes/sesiones
│   │   ├── permission-repository.js # Contrato de permisos
│   │   ├── announcement-repository.js
│   │   ├── schedule-provider.js     # Contrato de horarios y Excel
│   │   ├── kpi-provider.js          # Contrato de datos operativos
│   │   └── notification-provider.js # Contrato de correo/notificación
│   ├── firebase/
│   │   ├── firebase-auth-adapter.js
│   │   ├── firebase-user-repository.js
│   │   ├── firebase-shift-repository.js
│   │   ├── firebase-permission-repository.js
│   │   ├── firebase-announcement-repository.js
│   │   └── firebase-kpi-provider.js
│   ├── files/
│   │   ├── xlsx-schedule-adapter.js # SheetJS detrás del contrato de horarios
│   │   ├── xlsx-task-adapter.js
│   │   └── json-kpi-adapter.js
│   ├── external/
│   │   ├── formsubmit-notification-adapter.js
│   │   └── microstrategy-adapter.js # Si el pipeline se expone como servicio
│   ├── storage/
│   │   └── local-session-storage.js # localStorage con claves centralizadas
│   ├── browser/
│   │   └── idle-detector-adapter.js # IdleDetector API, visibilitychange y foco
│   └── observability/
│       ├── logger.js
│       └── error-reporter.js
│
├── controllers/
│   ├── auth-controller.js            # Traduce eventos de login a casos de uso
│   ├── shift-controller.js           # Acciones de turno desde la UI
│   ├── task-controller.js
│   ├── schedule-controller.js        # Edición de horarios/cronogramas/teletrabajo por Supervisor
│   ├── permission-controller.js
│   ├── announcement-controller.js
│   ├── monitoring-controller.js
│   └── analytics-controller.js
│
├── ui/
│   ├── components/
│   │   ├── modal.js
│   │   ├── multi-select.js
│   │   ├── notification.js
│   │   ├── task-tree.js
│   │   ├── shift-timer.js
│   │   └── kpi-card.js
│   ├── views/
│   │   ├── login-view.js
│   │   ├── workspace-view.js
│   │   ├── schedule-view.js
│   │   ├── permissions-view.js
│   │   ├── monitoring-view.js
│   │   ├── announcements-view.js
│   │   ├── operational-control-view.js
│   │   └── time-control-view.js
│   ├── dom/
│   │   ├── elements.js                # Selectores centralizados
│   │   └── renderer.js                # Actualizaciones DOM controladas
│   └── charts/
│       ├── operational-charts.js
│       └── time-charts.js
│
├── utils/
│   ├── date-time.js                   # Parsing y zonas horarias
│   ├── excel.js                       # Fechas seriales y validaciones comunes
│   ├── normalize.js                   # Texto, nombres y estados
│   ├── validation.js                  # Validación de entradas y esquemas
│   ├── sanitization.js                # Escape y sanitización HTML/URLs
│   ├── result.js                      # Resultado uniforme de éxito/error
│   └── constants.js                   # Estados, límites y nombres de campos
│
└── tests/
	├── unit/
	│   ├── domain/
	│   ├── services/
	│   └── utils/
	├── integration/
	│   ├── auth-flow.test.js
	│   ├── shift-closure.test.js
	│   └── kpi-pipeline.test.js
	└── fixtures/
		├── schedules/
		├── shift-reports/
		└── kpis/
```

### Límites de dependencia

- `ui/` puede llamar a `controllers/`, pero no a Firebase, FormSubmit, SheetJS ni `localStorage` directamente.
- `controllers/` orquesta casos de uso de `domain/` y traduce eventos de interfaz; no contiene cálculos complejos ni HTML extenso.
- `domain/` trabaja con entidades y contratos. No conoce IDs del DOM ni SDKs externos.
- `services/` implementa los contratos y concentra todas las llamadas de infraestructura.
- `utils/` debe ser agnóstico de Firebase, DOM y estado global.
- `config/` es el único lugar permitido para rutas, configuración de emuladores, nombres de colecciones y capacidades.
- `tests/` debe poder ejecutar la mayor parte de dominio y utilidades sin navegador ni red.

Durante la transición, `app.js` puede actuar como fachada de compatibilidad, delegando cada vez más en `controllers/`. Las funciones globales existentes se mantienen solo como adaptadores temporales y se eliminan cuando HTML y pruebas utilicen los controladores nuevos.

## 2. Principios de Diseño

### Responsabilidad Única (SRP)

Cada módulo debe tener una razón principal para cambiar. La separación propuesta para las funciones monolíticas es:

| Función actual | Extracción propuesta | Resultado esperado |
|---|---|---|
| `handleEndShift()` | `shift-controller`, `shift-calculator`, `timeline-service`, `shift-report-builder`, `shift-repository` y `notification-provider` | El controlador coordina; cada servicio calcula o persiste una sola cosa. |
| `calcularIndicadores()` | `kpi-provider`, `time-metrics`, `metrics-calculator`, `task-report` y `operational-control-view` | Los cálculos devuelven datos; la vista solo renderiza. |
| `loadControlOperativoData()` | Adaptadores de fuentes, `name-matcher`, `kpi-service` y `analytics-controller` | La fusión de Firebase/JSON queda fuera del DOM. |
| `renderControlOperativoFiltered()` | `metrics-calculator`, `filter-state`, `operational-control-view` y `operational-charts` | Filtrar/agregar y renderizar dejan de ser la misma operación. |
| `loadSchedule()` / `loadExcelTasks()` | Adaptadores XLSX, parsers de dominio, repositorio de asignaciones y vistas | El formato de Excel no contamina la UI. |
| `checkShiftExpirationOnLogin()` | `xlsx-schedule-adapter` y `shift-expiration` | La autenticación recibe una decisión de dominio, no parsea hojas. |
| `fetch_retiros_data()` | `microstrategy-adapter`, `withdrawal-mapper` y `withdrawal-metrics` | Transporte, mapeo y reglas de negocio quedan separados. |

### Dominio independiente de infraestructura

Las reglas de negocio deben recibir datos normalizados y devolver valores deterministas. Por ejemplo, calcular una penalidad de conectividad no debe saber si el timeline proviene de Firebase, `localStorage` o un fixture de prueba. El acceso a esos orígenes se resuelve antes, mediante repositorios o proveedores.

### Inversión de dependencias

Los casos de uso dependerán de contratos pequeños, no de `firebase.database()`, `fetch`, SheetJS o `document`. La composición concreta se realizará en `bootstrap.js`:

```js
const dependencies = {
	authProvider: new FirebaseAuthAdapter(firebase.auth()),
	shiftRepository: new FirebaseShiftRepository(database),
	scheduleProvider: new XlsxScheduleAdapter(xlsxParser),
	notificationProvider: new FormSubmitNotificationAdapter(fetch)
};

const shiftController = createShiftController(dependencies);
```

El ejemplo es conceptual: el objetivo es que el dominio pueda probarse con dobles (`FakeShiftRepository`, `FakeScheduleProvider`) sin cargar Firebase ni el DOM.

### Estado explícito y ciclo de vida controlado

El estado de sesión, turno, tareas y filtros debe vivir en un objeto de estado controlado o stores pequeños por dominio. Las vistas se suscriben a cambios y devuelven una función `dispose()` que elimina listeners DOM, listeners Firebase, intervalos y workers.

La migración debe eliminar escrituras directas dispersas en `window.*` y reemplazarlas por:

- Estado privado por módulo.
- Eventos de dominio con nombres explícitos.
- Selectores centralizados en `ui/dom/elements.js`.
- Persistencia local encapsulada en `local-session-storage.js`.

### Funciones puras para cálculos críticos

Parsing de fechas, normalización de nombres, consolidación de timelines, cálculo de tardanza, penalidades y agregación de KPIs deben ser funciones puras siempre que sea posible. Sus entradas y salidas deben usar entidades normalizadas y no HTML.

Esto permite cubrir con pruebas unitarias los casos de turnos nocturnos, fechas Excel, permisos aprobados, inactividad superpuesta, nombres con acentos y datos históricos incompletos.

### Contratos y validación en fronteras

Cada entrada externa debe validarse y convertirse antes de entrar al dominio:

- Firebase: mapear snapshots a entidades y validar campos obligatorios.
- Excel: validar hojas, encabezados, columnas y tipos antes de iterar.
- JSON histórico: validar versión y forma del documento.
- FormSubmit y MicroStrategy: normalizar respuestas y representar errores explícitamente.
- DOM: convertir valores de formularios a comandos tipados y validados.

Los estados textuales como `Pendiente`, `Finalizada` y `Aprobado` deben centralizarse en constantes o enumeraciones, evitando literales duplicados entre UI, dominio y reglas.

### Migración incremental y compatibilidad

1. Crear `src/config`, `src/utils` y adaptadores sin cambiar el comportamiento observable.
2. Extraer autenticación y almacenamiento de sesión; conservar `login.js` como fachada.
3. Extraer horarios, tareas y `js/tiempos.js` usando contratos de proveedores.
4. Extraer cierre de turno y probar persistencia atómica en el emulador Firebase.
5. Extraer KPIs y reportes, primero con el mismo modelo de datos y después con entidades versionadas.
6. Migrar vistas por dominio y reducir `app.js` a composición temporal.
7. Eliminar variables globales y funciones inline cuando no existan referencias restantes.

Cada etapa debe preservar las reglas de seguridad y acompañarse de pruebas de regresión para los flujos existentes.

## 3. Abstracción de Servicios

### Criterio general

Una llamada a un sistema externo debe estar detrás de una interfaz cuando cumple al menos una de estas condiciones:

- Tiene efectos de red, escritura, autenticación, temporización o dependencia del navegador.
- Su proveedor puede cambiar, como Firebase, FormSubmit, MicroStrategy o un archivo XLSX.
- Su respuesta requiere mapeo, normalización o compatibilidad histórica.
- La lógica que la consume debe probarse sin red, navegador o archivos reales.

Los contratos deben expresar operaciones del negocio y no detalles del SDK. Por ejemplo, es preferible `shiftRepository.saveClosure(closure)` a exponer `database.ref().update(updates)` en un controlador.

### Repository para persistencia de dominio

Los repositorios encapsulan rutas, queries, snapshots, transacciones, `onDisconnect()` y mapeo de entidades:

```js
// Contrato conceptual
export function createShiftRepository() {
	return {
		saveClosure: async (closure) => {},
		getById: async (reportId) => {},
		subscribeActiveSession: (uid, onChange) => () => {}
	};
}
```

Implementaciones iniciales:

- `FirebaseShiftRepository` para `shift_reports`, `active_sessions` y `login_logs`.
- `FirebaseUserRepository` para perfiles, aprobación y roles.
- `FirebasePermissionRepository` para solicitudes y estados.
- `FirebaseAnnouncementRepository` para comunicados y `readBy`.

Ningún controlador debe conocer rutas como `active_sessions/${uid}` ni decidir cómo se construye una actualización multi-ruta.

### Adapter para proveedores externos

Los adapters convierten APIs o formatos externos a modelos internos:

- `FirebaseAuthAdapter`: transforma errores y credenciales del SDK en resultados de autenticación del dominio.
- `XlsxScheduleAdapter`: usa SheetJS, valida la hoja y devuelve `ScheduleEntry[]` normalizados.
- `XlsxTaskAdapter`: convierte filas de cronogramas y catálogos en `TaskAssignment[]`.
- `JsonKpiAdapter`: valida la versión del JSON y devuelve métricas históricas.
- `MicrostrategyAdapter`: encapsula login, paginación, extracción del árbol y errores HTTP.
- `FormSubmitNotificationAdapter`: recibe un comando de notificación, construye el formulario o `fetch` y devuelve estado de entrega.

El dominio no debe recibir respuestas crudas de Firebase, índices posicionales de Excel ni objetos de MicroStrategy.

### Provider para datos de lectura y composición de KPIs

Los KPIs requieren combinar `kpi_operativos_v2.json`, `shift_reports`, permisos y usuarios. Un `KpiProvider` puede coordinar repositorios y devolver un `OperationalDataset` ya normalizado. Después, `metrics-calculator.js` realiza cálculos puros y la vista decide cómo mostrar tarjetas y gráficas.

La composición propuesta es:

```text
KpiController
  -> KpiService
	  -> KpiProvider
		  -> JsonKpiAdapter
		  -> FirebaseShiftRepository
		  -> FirebaseUserRepository
		  -> FirebasePermissionRepository
	  -> MetricsCalculator
	  -> TimeMetrics
  -> OperationalControlView
  -> OperationalCharts
```

Esto elimina la necesidad de que `renderControlOperativoFiltered()` consulte Firebase o conozca la forma del JSON histórico.

### Notification Provider para correo y efectos secundarios

El cierre de turno debe separar el resultado obligatorio de los efectos secundarios:

1. `ShiftService` valida y calcula el cierre.
2. `ShiftReportBuilder` produce una entidad serializable.
3. `ShiftRepository` confirma la persistencia atómica.
4. `AuthProvider` cierra la sesión.
5. `NotificationProvider` intenta enviar el correo y registra el resultado sin revertir el cierre.

Así, una caída de FormSubmit no vuelve a ejecutar la persistencia ni deja ambiguo si el turno se guardó.

### Contrato para IA o análisis narrativo

Si `generarAnalisisTextual()` incorpora un modelo de IA, debe depender de una interfaz que reciba métricas estructuradas y devuelva texto validado:

```js
// Contrato conceptual
export function createNarrativeAnalysisProvider() {
	return {
		generate: async ({ metrics, period, selectedGestores }) => ({
			text: '',
			provider: 'none',
			warnings: []
		})
	};
}
```

Reglas de aislamiento:

- Nunca enviar credenciales ni datos personales innecesarios al modelo.
- Aplicar límites de tamaño, timeout, cancelación y manejo de errores.
- Validar la respuesta antes de mostrarla; tratarla como texto no confiable.
- Mantener un `DeterministicNarrativeProvider` local para pruebas y contingencia.
- No permitir que el proveedor de IA escriba directamente en Firebase o el DOM.
- Registrar proveedor, versión de prompt, periodo y advertencias sin almacenar secretos.

### Manejo uniforme de errores

Los adapters deben traducir errores técnicos a categorías de aplicación, por ejemplo `AUTH_REQUIRED`, `PERMISSION_DENIED`, `VALIDATION_ERROR`, `NETWORK_ERROR`, `SOURCE_FORMAT_ERROR` y `PERSISTENCE_ERROR`. Los controladores deciden el mensaje y la vista decide cómo presentarlo; el dominio no debe usar `alert`, `console.error` ni `document`.

### Criterios de aceptación de la modularización

- Ningún módulo de `domain/` importa Firebase, SheetJS, Chart.js, FormSubmit o APIs del DOM.
- Toda escritura RTDB pasa por un repositorio y toda API externa por un adapter/provider.
- Las funciones de cálculo de tiempo, timeline y KPIs pueden probarse con datos en memoria.
- Cada listener o temporizador creado por una vista tiene una función de limpieza.
- `app.js` deja de contener reglas de negocio y queda como fachada o punto de composición durante la transición.
- Los contratos de entidades y rutas se documentan y se validan en las fronteras.
- El emulador Firebase cubre autenticación, reglas, persistencia de cierre de turno y permisos antes de retirar la implementación antigua.

## 4. Estrategia de Carga de Módulos y Publicación de `src/`

> Sección añadida a partir del diagnóstico de integración de 2026-09-22 (`../04-diagnostico-continuacion/diagnostico-integracion-y-evaluacion-plan.md`). Documenta dos decisiones de diseño que el resto de este documento asume pero no resolvía explícitamente, y cuya ausencia causó un intento de integración fallido sobre `app.js` (imports rotos, `ReferenceError` a nivel de módulo y handlers `onclick` desconectados de `window`).

### 4.1 Cómo cargan los módulos ES sin build step

Este documento usa `export`/`import` en todos los ejemplos, lo cual requiere módulos ES nativos del navegador (`<script type="module">`). Eso tiene una consecuencia que ningún ejemplo anterior contempla: las declaraciones de nivel superior de un módulo no cuelgan de `window` automáticamente, y la aplicación depende hoy de cientos de atributos `onclick="funcion(...)"` en el HTML que sí requieren esas funciones como globals.

Antes de conectar `src/` de vuelta a `app.js` mediante `import`/`export` reales, hay que elegir explícitamente uno de estos dos caminos:

- **(a) Módulos ES nativos + exportación manual a `window`.** El entrypoint se marca `type="module"`; `bootstrap.js` asigna explícitamente a `window` cada función que el HTML siga invocando por `onclick` inline, y esos handlers se migran a `addEventListener` de forma incremental (alineado con la Fase 3 de `hoja-de-ruta.md`: "Centralizar selectores... mantener temporalmente aliases para IDs que ya estén referenciados"). No introduce herramientas nuevas, pero exige mantener la lista de exports sincronizada mientras dure la transición.
- **(b) Paso de build mínimo.** Un bundler ligero (p. ej. `esbuild`, sin dependencias de runtime) compila `src/` a un `app.bundle.js` clásico, sin `type="module"`, preservando compatibilidad total con `onclick` inline sin tocar el HTML. Cambia la restricción "sin build step" documentada en `README.md` y `arquitectura-actual.md`, por lo que requiere aprobación explícita del usuario antes de adoptarse.

**Decisión (2026-09-23): opción (b), bundler mínimo con esbuild.** El usuario la eligió porque un script clásico conserva el orden de ejecución síncrono actual: el bundle se carga con un `<script>` normal **antes** de `app.js`, mientras que `type="module"` difiere la ejecución y cambiaría el arranque de la vigilancia de inactividad (`IdleDetector`) y de los listeners de presencia respecto a `js/tiempos.js`. La regla "sin build step" de `README.md` y `arquitectura-actual.md` queda reemplazada por: *el frontend se compila con un único paso `esbuild` (sin dependencias de runtime)*.

Estado del prototipo (sandbox `fase_2/build/`, nada de producción tocado):

- `src/entry.js` reexporta cada módulo bajo su propio espacio de nombres; `build/build.mjs` lo compila a `dist/riskops.bundle.js` (IIFE, global `RiskOps`, `es2019`, sin minificar, ≈82 KB).
- `npm run verify` (`build/verify-bundle.mjs`) carga el bundle como script clásico en un contexto de navegador simulado y comprueba 53 puntos: ausencia de `import`/`export`, los 25 espacios de nombres, paridad con los módulos ESM, saneamiento HTML, persistencia de pausas y el ciclo completo del `IdleDetector` (notificación de inactividad nativa, regreso a actividad, gracia de 10 s por pantalla bloqueada, desactivación del fallback DOM con detector concedido y activación a los 5 min sin él, y no activación con pestaña oculta o sin foco).

Condiciones para el paso 9 de la Fase 1 y la Fase 3 (aún por hacer y sujetas a aprobación de diff, por afectar archivos de producción):

1. **Carga:** añadir en `index.html`, antes de `app.js`, un `<script src="riskops.bundle.js?v=...">` clásico; `login.html` igual si `login.js` consume el bundle.
2. **Despliegue:** actualizar `ALLOWED_ROOT_FILES` y el set `allowed` de `deploy-pages.yml` con el bundle, y decidir si se compila en CI (`npm ci && npm run build` antes de armar `_site/`, recomendado) o si se versiona el archivo generado. No se debe ubicar el bundle en `assets/` para esquivar la allowlist.
3. **Compatibilidad del `IdleDetector`:** el adaptador guarda su estado en variables privadas del módulo, pero `app.js` y las pruebas de `.github/qa-infra` usan `window.idleDetectorGranted` y `window.idleDetectorStarted`. La integración debe espejar esas banderas en `window` (o mantener el wrapper actual) para no alterar el comportamiento.
4. **Arnés de QA:** `frontend_security_smoke.js`, `end_shift_smoke.js` e `inactivity_timeline.test.js` leen y evalúan el **texto** de `app.js` en una VM y hacen comprobaciones estáticas sobre sus funciones. Al sustituir cuerpos de funciones por llamadas a `RiskOps.*`, esas pruebas deben cargar también el bundle en la VM y ajustar las comprobaciones estáticas; hacerlo junto con cada corte, con la línea base (`npm run check`) en verde antes y después.
5. **Wrappers:** cada función reemplazada en `app.js` conserva su nombre y firma actuales (delegando en `RiskOps.*`) para no romper los `onclick` inline ni el arnés.

### 4.2 Dónde vive físicamente `src/` y su relación con el despliegue

El árbol de la sección 1 se dibuja en la raíz del repositorio (`src/app/...`, `src/domain/...`). Mientras dure el desarrollo de Fase 2, el código real se escribe bajo `fase_2/src/...` para mantenerlo fuera de producción, coherente con la regla de no modificar archivos de producción sin autorización explícita. Esto es correcto como estrategia temporal, pero tiene una consecuencia que hay que planear con anticipación: `.github/workflows/deploy-pages.yml` construye el artefacto público con una **allowlist explícita** de archivos y carpetas (copia únicamente los nombres fijos de `ALLOWED_ROOT_FILES` más `js/` y `assets/`, nada más). Por esa razón — y no por estar o no dentro de `.github/` — `fase_2/src/` nunca será publicado por el pipeline actual, sin importar qué tan completa esté la migración: el workflow tendría que nombrarlo explícitamente para copiarlo, y hoy no lo nombra.

*(Nota 2026-10-03: `fase_2/` se movió de `.github/fase_2/` a la raíz del repositorio, como carpeta propia `fase_2/` — todavía no es el `src/` final de la sección 1, solo cambió de estar bajo `.github/` a estar en la raíz. El motivo original de ponerlo bajo `.github/` incluía, de paso, que el script de validación de `deploy-pages.yml` también rechaza explícitamente cualquier ruta con el segmento `.github` [`forbidden_parts`] — una segunda capa de seguridad, no la principal. Esa capa adicional ya no aplica a `fase_2/`, pero la protección real sigue intacta: la allowlist descrita arriba es positiva, así que `fase_2/` sigue sin publicarse sea o no descendiente de `.github/`.)*

Antes de que la Fase 3 ("Reorganización de Archivos" de `hoja-de-ruta.md`) mueva código a su ubicación final, ese movimiento debe incluir explícitamente:

1. Mover `src/` de `fase_2/src/` a la raíz del repositorio (ya dejó de estar bajo `.github/`; falta este segundo movimiento, a la ubicación final de la sección 1).
2. Actualizar `ALLOWED_ROOT_FILES` y el set `allowed` del script Python en `deploy-pages.yml` para incluir `src/**`.
3. Verificar que el workflow `phase1-compatibility-qa.yml` siga pasando con la nueva ubicación antes de mergear a `main`.

### 4.3 Ubicación de APIs de navegador (presencia / detección de inactividad)

La estructura de la sección 1 no tenía un lugar explícito para adapters de APIs del navegador que no encajan en `domain/` (que no debe conocer DOM ni SDKs externos) ni en las subcarpetas ya definidas de `services/`. Se añadió `services/browser/idle-detector-adapter.js` (sección 1) para el código que hoy vive en `fase_2/src/services/idleDetector.js` (`IdleDetector` API, `navigator.permissions`, `document.visibilityState`/`hasFocus`).
