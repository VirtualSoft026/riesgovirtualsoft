# Resumen Ejecutivo de Arquitectura

## 1. Visión General

Risk Manager es una aplicación web estática construida con HTML, CSS y JavaScript vanilla. La interfaz principal concentra gran parte de la lógica en `app.js`, que actualmente combina presentación, reglas de negocio, estado de sesión, acceso a Firebase, lectura de archivos Excel, cálculo de indicadores, monitoreo y generación de reportes.

Firebase Authentication y Realtime Database son los servicios principales de identidad, autorización y persistencia. El sistema también depende de archivos XLSX y JSON para datos operativos, FormSubmit para notificaciones por correo, Chart.js y html2pdf para visualización y exportación, y un pipeline Python que obtiene y transforma datos de MicroStrategy.

El objetivo de la reestructuración no es una reescritura inmediata, sino una migración progresiva hacia módulos con responsabilidades explícitas. La arquitectura futura debe aislar dominio, interfaz e infraestructura, reducir el estado global, centralizar contratos de datos y permitir pruebas sin depender del navegador, la red o archivos de producción.

## 2. Diagnóstico Resumido

### Principales riesgos estructurales

- **Monolito frontend:** `app.js` funciona como punto de entrada, controlador, servicio, repositorio y renderer al mismo tiempo.
- **Estado global compartido:** variables como `currentUser`, `shiftTimeline`, `taskStateCache`, `window.controlOperativoRawData` y `window.kpiTaskLists` son modificadas y consumidas por múltiples flujos sin contratos explícitos.
- **Acoplamiento con la interfaz:** los cálculos y reglas de negocio dependen directamente de IDs del DOM, estilos, `innerHTML`, listeners y handlers inline.
- **Acoplamiento con infraestructura:** las funciones acceden directamente a `firebase`, `database.ref(...)`, `localStorage`, SheetJS, FormSubmit y APIs del navegador.
- **Contratos implícitos:** roles, estados, nombres de campos, rutas RTDB y formatos de Excel se repiten como literales en distintos archivos.
- **Fuentes heterogéneas:** los KPIs fusionan JSON histórico, reportes Firebase, permisos y nombres normalizados mediante heurísticas y excepciones.
- **Ciclo de vida débil:** listeners Firebase, listeners DOM, intervalos y workers se registran desde el código global sin una estrategia uniforme de desmontaje.

### Funciones y flujos críticos

- `handleEndShift()` concentra validación, cálculo de pausas e inactividad, consolidación de timeline, persistencia atómica, limpieza de sesión, logout y notificación por correo.
- `calcularIndicadores()` mezcla consultas, compatibilidad histórica, cálculos de métricas, generación de HTML y mutación de estado global.
- `loadControlOperativoData()` fusiona fuentes externas, resuelve identidades, calcula tardanza/inactividad y activa el renderizado.
- `renderControlOperativoFiltered()` combina filtros, agregación, cálculo de indicadores, actualización de tablas y coordinación de gráficas.
- `loadSchedule()` y `loadExcelTasks()` acoplan parsing de Excel, asignación de tareas, caché y UI.
- `checkShiftExpirationOnLogin()` acopla la autenticación al formato físico de `Horario/Horario 2026.xlsx`.
- `MicroStrategyConnector.fetch_retiros_data()` combina transporte HTTP, paginación, parsing posicional, normalización y reglas de retiros.

Estos puntos concentran el mayor riesgo de regresión: un cambio pequeño en formatos de datos, campos Firebase, reglas de pausas, IDs HTML o nombres de gestores puede afectar varios flujos simultáneamente.

## 3. Arquitectura Propuesta

La arquitectura objetivo conserva el frontend vanilla y Firebase durante la transición, pero establece límites de dependencia claros:

```text
UI / Views
    -> Controllers
        -> Domain Services / Use Cases
            -> Entities y funciones puras
            -> Contracts
                -> Firebase Repositories
                -> XLSX/JSON Adapters
                -> FormSubmit/MicroStrategy Providers
```

La estructura modular se organiza en `src/` mediante:

- `ui/`: vistas, componentes, renderizadores y gráficas; no accede directamente a SDKs ni almacenamiento.
- `controllers/`: traduce eventos de UI a casos de uso y coordina resultados.
- `domain/`: contiene reglas de negocio para autenticación, turnos, tareas, permisos, comunicados y analytics.
- `entities/`: define modelos normalizados de usuario, sesión, tarea, turno, reporte y KPI.
- `services/contracts/`: establece interfaces para autenticación, repositorios, proveedores de horarios, KPIs y notificaciones.
- `services/`: implementa adapters para Firebase, archivos XLSX/JSON, FormSubmit y MicroStrategy.
- `utils/`: agrupa parsing, normalización, sanitización, validación, fechas y constantes puras.
- `tests/`: separa pruebas unitarias, integración, fixtures y escenarios de regresión.

El cierre de turno, por ejemplo, deberá dividirse en validación, cálculo, consolidación del timeline, construcción del reporte, persistencia y notificación. Los KPIs deberán separar adquisición de datos, normalización, cálculo y presentación. Ningún cálculo de dominio deberá depender del DOM, Firebase, `localStorage` o un formato específico de Excel.

Los repositorios encapsularán rutas y transacciones de Firebase; los adapters traducirán respuestas externas a entidades internas; y los providers permitirán sustituir FormSubmit, MicroStrategy o un eventual modelo de IA sin modificar el dominio. `app.js` y `login.js` permanecerán temporalmente como fachadas de compatibilidad hasta completar la migración.

## 4. Plan de Acción

### Fase 1: Extracción de Utilidades

Extraer constantes, normalización de nombres, parsing de fechas y Excel, sanitización HTML, consolidación de timelines y cálculos puros. Mantener wrappers con las firmas existentes y verificar equivalencia mediante pruebas unitarias y snapshots de entrada/salida.

### Fase 2: Desacoplamiento Lógico

Definir entidades y contratos; encapsular Firebase, `localStorage`, archivos y notificaciones; separar los casos de uso de cierre de turno, horarios, tareas y KPIs de la UI. Activar la implementación nueva mediante fachada o modo sombra antes de publicar escrituras reales.

### Fase 3: Reorganización de Archivos

Mover progresivamente el código desacoplado a la estructura `src/` de la arquitectura modular. Mantener los entrypoints actuales, aliases de funciones globales y rutas de datos durante la transición; retirar segmentos antiguos solo después de validar imports, despliegue y ausencia de dependencias circulares.

### Fase 4: Pruebas de Regresión

Combinar pruebas unitarias de dominio, pruebas de adapters, Firebase Emulator, smoke tests frontend y comparación lado a lado entre implementación antigua y nueva. Las puertas actuales incluyen `npm run check`, `npm run qa`, pruebas de reglas de comunicados, escenarios de inactividad, cierre de turno, migraciones y `test_motor_operativo.py`.

Cada fase debe finalizar con un criterio de salida verificable, un punto de rollback y una revisión de seguridad. El rollback debe desactivar la nueva fachada o restaurar el wrapper anterior sin revertir datos válidos ni ejecutar migraciones destructivas.

La documentación detallada se encuentra en:

- [`diagnostico-monolito.md`](../01-analisis-tecnico/diagnostico-monolito.md)
- [`arquitectura-actual.md`](../02-arquitectura/arquitectura-actual.md)
- [`propuesta-modular.md`](../02-arquitectura/propuesta-modular.md)
- [`hoja-de-ruta.md`](hoja-de-ruta.md)