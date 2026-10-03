@@
# Diagnóstico de Complejidad y Deuda Técnica

## 1. Funciones "Dios" (Overloaded Functions)

### `handleEndShift()` en `app.js` (aprox. líneas 3635-3915)

Es el caso más crítico del frontend. La función coordina confirmación de interfaz, lectura de sesión desde `localStorage`, validación de tareas pendientes, cierre de pausas, cálculo de tiempos y penalidades, normalización de la bitácora, construcción del correo, construcción del reporte de turno, persistencia atómica en Firebase, limpieza de cachés, cierre de Firebase Auth, envío de correo externo y navegación al login.

Las responsabilidades mezcladas son:

- Validación de reglas de negocio para finalizar un turno.
- Cálculo de métricas temporales y penalidades.
- Consolidación de eventos superpuestos de la bitácora.
- Serialización de datos para dos destinos distintos: Firebase y FormSubmit.
- Gestión de estado local y autenticación.
- Recuperación de errores y mensajes de UI.

Un cambio en el modelo del reporte, en la política de pausas o en el envío de correo puede afectar simultáneamente la persistencia, la sesión y la interfaz. La función debería delegar en servicios separados para validación, cálculo, construcción del reporte, persistencia y notificación.

### `calcularIndicadores()` en `app.js` (aprox. líneas 5716-6350)

Combina lectura de filtros del DOM, consulta de `shift_reports`, normalización de nombres, filtrado por periodos, cálculo de duración de turnos, reconstrucción de tareas históricas, generación de HTML de bitácora, cálculo de inactividad, cálculo de conectividad, lectura de datos de retiros, actualización de tarjetas KPI y mutación de variables globales como `window.kpiTaskLists`, `window.kpiBitacoraHTML` y `window.isFilteredByGestor`.

Las responsabilidades mezcladas son:

- Adquisición de datos desde Firebase y del estado de filtros.
- Compatibilidad con varios formatos históricos de fechas, nombres y tareas.
- Cálculo de métricas operativas.
- Construcción de HTML para modales y tarjetas.
- Actualización directa de widgets y estado global.

La misma función contiene reglas de negocio, parsing de datos heredados y presentación. Esto dificulta probar los cálculos sin navegador y aumenta el riesgo de modificar una métrica al cambiar el HTML del dashboard.

### `loadControlOperativoData()` en `app.js` (aprox. líneas 7231-7415)

Carga el JSON histórico de KPIs, consulta usuarios y reportes de turnos en Firebase, cruza nombres entre fuentes con normalización por acentos y coincidencias parciales, crea fechas faltantes, calcula inactividad y tardanza, impone topes de tiempo, muta `window.controlOperativoRawData`, configura filtros y dispara el renderizado.

Las responsabilidades mezcladas son:

- Carga de fuentes heterogéneas.
- Resolución de identidad de gestores entre Firebase y el histórico.
- Reglas de agregación y límites de negocio.
- Preparación de estado global.
- Inicialización de controles y presentación.

El acoplamiento entre la forma del JSON histórico, la estructura de Firebase y los IDs del DOM impide sustituir una fuente de datos sin modificar la función completa.

### `renderControlOperativoFiltered()` en `app.js` (aprox. líneas 7420-7675)

Realiza filtrado temporal, comparación flexible de nombres, agregación global y filtrada, cálculo de indicadores derivados, construcción de filas HTML, actualización de widgets, preparación de datos para gráficas y una llamada recursiva indirecta a `calcularIndicadores()`.

La función no es únicamente un renderer: contiene lógica de consulta, agregación, selección de alcance global, interacción de filas y coordinación de gráficas. Además, depende de `window.controlOperativoRawData`, de los filtros del DOM y de `SUPERVISORES_NOMBRES` definido en el ámbito global.

### `loadSchedule()` y `loadExcelTasks()` en `app.js` (aprox. líneas 1343-1715)

Ambas funciones leen archivos XLSX, interpretan estructuras de hojas, resuelven fechas y turnos, cruzan nombres y asignaciones, construyen estructuras de tareas, escriben en `localStorage`, crean controles del DOM y registran listeners. `loadSchedule()` también contiene funciones internas de renderizado y sincroniza cambios de turno con Firebase.

El sistema de tareas y el de horarios no tienen una frontera clara entre parsing, dominio, caché y UI. Un cambio en el formato de Excel puede romper tanto la carga de datos como la interacción de la aplicación.

### `checkShiftExpirationOnLogin()` en `login.js` (aprox. líneas 12-112)

Aunque es menor que los casos de `app.js`, concentra descarga de Excel, parsing de fechas seriales, detección del bloque de fecha, búsqueda del gestor, parsing de horarios, cálculo de turnos nocturnos y decisión de expiración. La autenticación queda acoplada al formato físico de `Horario/Horario 2026.xlsx` y a la representación textual de los turnos.

### `MicroStrategyConnector.fetch_retiros_data()` en `motor_operativo.py` (aprox. líneas 119-255)

Gestiona paginación HTTP, extracción recursiva del árbol de MicroStrategy, parsing posicional de columnas, conversión de fechas, normalización de estados, filtrado de gestores y construcción del modelo de retiros. El método conoce simultáneamente el protocolo externo, el esquema de columnas y las reglas de negocio internas.

## 2. Acoplamiento y Dependencias Cruzadas

### Estado global compartido en el frontend

`app.js` funciona como un módulo global único. Entre los principales puntos de acoplamiento están:

- `currentUser`, `currentTaskRef` y `activeSessionRef`, usados por navegación, presencia, tareas, permisos y cierre de turno.
- `shiftTimeline`, `taskStateCache`, `totalLunchTimeMs`, `totalBreakfastTimeMs` y `totalSplitShiftTimeMs`, mutados desde handlers de UI y consumidos por `handleEndShift()`.
- `window.controlOperativoRawData`, `window.kpiUsersData`, `window.kpiTaskLists`, `window.kpiBitacoraHTML` y `window.retirosGlobalData`, compartidos por carga, filtros, tarjetas y gráficas.
- Funciones expuestas manualmente en `window`, como `selectTask`, `exportShiftReport`, `updateNavigation` y `viewTimelineInMonitoreo`, que crean una API implícita para HTML y handlers inline.

Este diseño permite que cualquier función cambie estado que otras funciones leen sin contrato explícito. También hace difícil ejecutar una vista de forma aislada o probarla sin inicializar la aplicación completa.

### Dependencia directa de DOM, Firebase y almacenamiento local

Muchas funciones de `app.js` leen y mutan directamente elementos mediante `document.getElementById`, `querySelector`, `innerHTML`, `style` y listeners. En paralelo escriben en `database.ref(...)`, `localStorage` y `firebase.auth()`. La misma operación de usuario puede tener efectos en cuatro capas distintas: DOM, memoria global, almacenamiento local y Firebase.

El flujo de inactividad es especialmente cruzado: listeners de `mousemove`, `keydown`, `click`, `scroll`, `visibilitychange` y `focus` llaman a `updateActivity()`; un `setInterval()` mantiene el fallback; `startIdleDetectorLogic()` usa la Idle Detector API; y los cambios terminan escribiendo el estado del usuario en Firebase. La corrección depende de temporizadores, foco de ventana, permisos del navegador y sesión activa.

### Listeners y temporizadores registrados a nivel de módulo

El archivo registra listeners globales y temporizadores durante la carga, incluyendo `document.addEventListener`, `window.addEventListener`, `setInterval`, listeners Firebase `.on(...)` y `onDisconnect()`. No existe una estrategia central visible de desmontaje para vistas o sesiones.

Esto genera riesgos de:

- Listeners duplicados si una inicialización se ejecuta más de una vez.
- Actualizaciones sobre elementos que ya no corresponden a la vista activa.
- Escrituras repetidas o carreras entre actividad, cierre de turno y logout.
- Fugas de memoria y dificultad para reproducir errores dependientes del orden.

### Contratos implícitos entre HTML, JavaScript y Firebase

La aplicación depende de IDs concretos del HTML, nombres de campos de Firebase y valores textuales como `Gestor`, `Supervisor`, `Admin`, `Pendiente`, `Finalizada`, `No Realizada` y `Aprobado`. Estos contratos están distribuidos en `index.html`, `login.html`, `app.js`, `login.js` y `database.rules.json`, sin tipos compartidos ni validadores centrales.

La autorización se replica parcialmente en la interfaz mediante `canPublishComunicados`, `canViewComunicadoLecturas` y `canDeleteComunicados`, mientras el control efectivo vive en las reglas RTDB. Un cambio de rol o estado debe mantenerse sincronizado entre UI, rutas Firebase y reglas; una discrepancia produce botones visibles que fallan o, peor, flujos incompletos.

### Dependencias cruzadas de fuentes operativas

Los horarios, cronogramas, teletrabajo y tareas se leen desde archivos XLSX públicos o locales con parsers propios. El histórico de retiros llega desde `kpi_operativos_v2.json` y se fusiona con `shift_reports` de Firebase. Los nombres de gestores se emparejan mediante normalización, fragmentos de nombre y excepciones manuales.

Esto crea una dependencia frágil entre:

- Formato de hojas Excel y posiciones de columnas.
- Convenciones de nombres de personas.
- Campos históricos y campos actuales de Firebase.
- Fechas locales, fechas seriales de Excel y timestamps.
- Filtros de la interfaz y agregaciones de backend.

### Backend local y motor operativo con responsabilidades concentradas

`backend.py` combina servidor HTTP, CORS, autenticación superficial por presencia de un token, routing, lectura/escritura de JSON y lógica CRUD de usuarios y permisos dentro de `APIHandler`. `verify_token()` únicamente comprueba que exista un valor después de `Bearer`, por lo que el handler queda acoplado a una política de seguridad incompleta y a un almacenamiento de archivo local.

`motor_operativo.py` ejecuta efectos secundarios al importar el módulo: carga variables de entorno, consulta Firebase mediante HTTP y construye `GESTORES_PERMITIDOS`. Esto hace que importar clases o ejecutar pruebas dependa de red, configuración externa y disponibilidad del servicio.

## 3. Riesgos de Mantenibilidad

### Cambios en el cierre de turno

Un cambio en campos del reporte, pausas, timeline o reglas de cierre puede romper la transacción atómica, el resumen enviado, la limpieza local o la salida de Firebase Auth. El flujo tiene varios estados parcialmente completados y rutas de error distintas, por lo que requiere pruebas de integración para cada combinación de persistencia, logout y correo.

### Cambios en el esquema de datos

La aplicación tolera múltiples formatos históricos mediante heurísticas dispersas: fechas en strings y timestamps, nombres con o sin acentos, tareas nuevas y legacy, y campos alternativos como `horaFin`/`Hora_Fin`. Agregar o renombrar un campo sin actualizar todos los parsers puede producir métricas silenciosamente incorrectas, no solo errores visibles.

### Cambios en el HTML o en los IDs de vistas

La lógica depende de numerosos selectores y construye HTML con estilos inline. Renombrar un ID, mover un panel o cambiar una clase puede provocar `null`, renderizado incompleto o listeners que dejan de operar. Como cálculo y presentación están mezclados, no hay una capa intermedia donde detectar el fallo con pruebas unitarias.

### Duplicación de reglas de cálculo

El cálculo de inactividad, tardanza, duración de turnos, normalización de nombres y limpieza de timelines aparece en más de un flujo: cierre de turno, KPIs, control operativo y control de tiempos. Las implementaciones aplican límites y formatos parecidos, pero no necesariamente idénticos; una corrección en una vista puede dejar resultados divergentes en otra.

### Dependencia de archivos operativos versionados y públicos

La disponibilidad y estructura de `Horario`, `Cronograma de Tareas`, `Teletrabajo` y `Tareas Riesgo` afecta directamente la operación. Un cambio de nombre, hoja, columna o fecha requiere cambios coordinados en varios parsers; además, la propia documentación del repositorio identifica como deuda de Fase 2 sacar estos datos del sitio público y llevarlos a una fuente autenticada.

### Riesgo de regresiones por inicialización global

`initApp()` se invoca desde `app.js` y configura navegación, listeners Firebase, presencia, carga de tareas, sesiones y vistas. La inicialización no está encapsulada por módulo ni ciclo de vida de vista. Una nueva pantalla puede heredar listeners o estado de otra, y una modificación del orden de carga puede generar carreras entre Firebase, Excel, caché y DOM.

### Seguridad y mantenibilidad del backend local

El servidor local mezcla serving de archivos y API en una clase, usa `except` amplios, no valida esquemas de entrada y persiste JSON directamente. La autorización se basa en un token no verificado criptográficamente y las operaciones CRUD responden con éxito genérico incluso cuando el registro solicitado no existe. Un cambio funcional puede ocultar errores de integridad o ampliar accidentalmente una superficie ya difícil de auditar.

### Pruebas insuficientes para la complejidad real

La mayor parte de la lógica crítica vive en funciones que requieren DOM, Firebase, `localStorage`, temporizadores o archivos externos. Esto eleva el costo de las pruebas y favorece validaciones manuales. Las áreas de mayor riesgo que necesitan pruebas automatizadas aisladas y de integración son cierre de turno, reglas de roles, fusión de KPIs, cálculo de inactividad/tardanza, parsing de Excel y persistencia atómica.
