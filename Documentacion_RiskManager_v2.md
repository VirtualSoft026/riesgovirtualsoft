# 📋 Risk Manager — Documentación Técnica y Funcional
### Versión Actualizada: 30 de Julio 2026
**Proyecto:** `riskops-75637` · **URL:** [riskops-75637.web.app](https://riskops-75637.web.app) · **Repositorio:** [GitHub](https://github.com/VirtualSoft026/riesgovirtualsoft)

---

## 1. Descripción General

**Risk Manager** es una aplicación web de página única (SPA) diseñada para la gestión operativa de equipos de gestores de riesgo en VirtualSoft. Permite el control de turnos, seguimiento de tareas, monitoreo en tiempo real, análisis de desempeño operativo y generación de informes ejecutivos.

### Stack Tecnológico

| Componente | Tecnología |
|:---|:---|
| Frontend | HTML5, CSS3 (Glassmorphism Dark Mode), JavaScript Vanilla |
| Backend/DB | Firebase Realtime Database |
| Autenticación | Firebase Authentication (Email/Password) |
| Hosting | Firebase Hosting |
| Gráficas | Chart.js + chartjs-plugin-datalabels |
| PDF Export | html2pdf.js (individual) + window.print() (ejecutivo) |
| Excel Parsing | SheetJS (xlsx-0.20.0) |
| Íconos | Boxicons v2.1.4 |
| Tipografía | Google Fonts (Inter) |
| Notificaciones Email | FormSubmit.co |

---

## 2. Estructura de Archivos del Proyecto

```
📁 Indicadores y Pagina WEB/
├── 📄 index.html                    # App principal SPA (~186 KB, 1368 líneas)
├── 📄 app.js                        # Lógica principal (~356 KB, 7193 líneas)
├── 📄 styles.css                    # Hoja de estilos global (~32 KB)
├── 📄 login.html                    # Portal de autenticación
├── 📄 login.js                      # Lógica de login/registro
├── 📄 login.css                     # Estilos del login
├── 📄 firebase-config.js            # Configuración Firebase SDK
├── 📄 firebase.json                 # Config de Firebase Hosting
├── 📄 .firebaserc                   # Proyecto Firebase target
├── 📄 database.rules.json           # Reglas de seguridad RTDB
├── 📄 kpi_operativos_v2.json        # Datos históricos operativos (~235 KB)
├── 📄 procesos_list.json            # Índice de documentación de procesos
├── 📁 js/
│   └── 📄 tiempos.js                # Módulo Control de Tiempos (~26.5 KB)
├── 📁 Procesos/                     # PDFs, guías HTML, videos MP4
├── 📁 Cronograma de Tareas/         # Cronogramas mensuales .xlsx
├── 📁 Horario/                      # Horario 2026.xlsx
├── 📁 Teletrabajo/                  # Teletrabajo.xlsx
└── 📁 Tareas Riesgo/                # Catálogo maestro de tareas .xlsx
```

---

## 3. Módulos y Vistas de la Aplicación

### Vistas para Gestores

| Vista | ID del Panel | Descripción |
|:---|:---|:---|
| **Mis Tareas** | `view-workspace` | Espacio de trabajo principal. Árbol de SETs/Procesos, detalle de tarea actual, botones de estado (Pendiente, En Proceso, Finalizada, No Realizada), notas técnicas, tareas extra, anillo de progreso del turno. |
| **Comunicados** | `view-comunicados` | Lista de comunicados generales y urgentes con badge de no leídos. |
| **Horario Semanal** | `view-horario` | Tabla interactiva de horarios semanales filtrada por semana y gestor. |
| **Teletrabajo** | `view-teletrabajo` | Matriz calendario de teletrabajo por semana y gestor. |
| **Biblioteca de Procesos** | `view-docs` | Repositorio de SOPs (PDF, guías HTML, tutoriales MP4 embebidos). |
| **Historial de Permisos** | `view-permisos` | Formulario de solicitudes de permisos (Vacaciones, Médico, Llegada Tarde, etc.) con notificación email automática y tracking de historial. |

### Vistas para Supervisores / Admin

| Vista | ID del Panel | Descripción |
|:---|:---|:---|
| **Gestión Comunicados** | `view-gestion-comunicados` | Redacción de comunicados rich-text, urgencia, auditoría de lectura por gestor. |
| **Historial de Turnos** | `view-turnos` | Tabla global de turnos finalizados. Filtros por gestor/fecha, bitácora de timeline, exportación PDF individual. |
| **Aprobaciones** | `view-aprobaciones` | Panel de gestión de usuarios: aprobar/rechazar registros pendientes y solicitudes de permisos. |
| **Monitoreo** | `view-monitoreo` | Grid en tiempo real: sesiones activas, estado online/offline, tarea activa, timers de pausa, detector de inactividad, logs de login. |
| **Eficiencia Operativa** | `view-eficiencia-operativa` | Dashboard de Control Operativo: multi-select de gestores, filtros de fecha, 3 anillos KPI (Actividades, Conectividad, Retiros), gráficas Chart.js, tabla resumen, análisis narrativo IA, y exportación PDF ejecutivo. |
| **Control de Tiempos** | `view-tiempos` | Leaderboard de cumplimiento: minutos de tardanza, promedios de inactividad, gráficas top temprano/tarde, matriz de cuadrantes. |

---

## 4. Firebase — Configuración y Servicios

### Configuración
```javascript
// firebase-config.js
apiKey: "AIzaSyBj...",
authDomain: "riskops-75637.firebaseapp.com",
databaseURL: "https://riskops-75637-default-rtdb.firebaseio.com",
projectId: "riskops-75637",
appId: "1:874205588056:web:95eb04536fd4586e26b82d"
```

### Rutas de Base de Datos (Realtime DB)

| Ruta | Descripción |
|:---|:---|
| `users/{uid}` | Perfil: `name`, `email`, `role`, `shift`, `approved`, `status`, `registrationDate` |
| `active_sessions/{uid}` | Heartbeat en vivo: `status`, `loginTime`, `lastHeartbeat`, `currentTask`, `breakState`, `idleTimeMins`, `activeShiftSet` |
| `shift_reports/{id}` | Reportes de turno finalizados: `gestor`, `rol`, `setTrabajado`, `horaInicio`, `horaFin`, `tiempoAlmuerzoMins`, `tiempoDesayunoMins`, `inactividadTotalMins`, `reporte` (bitácora) |
| `permissions/{id}` | Solicitudes de permisos y estados de aprobación |
| `announcements/{id}` | Comunicados y confirmaciones de lectura |
| `login_logs` / `login_history` | Logs de auditoría de sesiones |

---

## 5. Funcionalidades Clave

### 5.1 Dashboard y Control de Turno
- Reloj en vivo y badge de turno activo
- Cálculo automático de progreso del turno
- Toggles de pausas para comidas (Desayuno / Almuerzo-Cena)
- Integración con **Idle Detector API** del navegador para detectar inactividad y bloqueo de pantalla
- Al finalizar turno (`handleEndShift()`): compila tareas completadas/pendientes/no realizadas, observaciones, duraciones de pausas y tiempos de inactividad

### 5.2 Control Operativo y Análisis de Retiros
- Fusiona datos históricos JSON (`kpi_operativos_v2.json`) con `shift_reports` de Firebase
- **3 Anillos KPI maestros:** Actividades, Conectividad, Retiros
- **Gráficas Chart.js interactivas:**
  - Top Alerta Tardanzas (Peores)
  - Top Excelencia Puntualidad (Mejores)
  - Promedio Inactividad Diaria
  - Eficiencia y Volumen de Retiros
  - Evolución Diaria de Retiros
- **Análisis narrativo automatizado** (`generarAnalisisTextual()`): genera reportes textuales con métricas, rankings y recomendaciones
- **Tabla de métricas resumen:** Total Retiros Procesados, Aprobados, Rechazados, Tiempo Promedio de Resolución (ART)

### 5.3 Monitoreo en Tiempo Real
- Grid de gestores conectados con estado online/offline
- Inspección de tarea activa, timers de pausa
- Detector de inactividad por pestaña/bloqueo de pantalla
- Logs completos de auditoría de login

### 5.4 Control de Tiempos (`js/tiempos.js`)
- Cruza horarios de `Horario 2026.xlsx` con timestamps de login y permisos aprobados
- Calcula minutos exactos de tardanza
- Leaderboard de cumplimiento
- Gráficas top puntualidad/tardanza
- Matriz scatter de cuadrantes

---

## 6. Exportación a PDF

### 6.1 Reporte Individual de Turno
> **Función:** `exportShiftReport(fb_id)` en `app.js`

| Aspecto | Detalle |
|:---|:---|
| Librería | `html2pdf.js` (jsPDF + html2canvas) |
| Proceso | Crea contenedor HTML temporal → renderiza con inline CSS → genera PDF descargable |
| Archivo | `Reporte_Turno_[gestor]_[fecha].pdf` |
| Contenido | Header "RISK MANAGER", datos del gestor, set trabajado, horarios, pausas, inactividad, bitácora de tiempos, resumen de tareas |

### 6.2 Reporte Ejecutivo Operativo (Informe)
> **Función:** `generarReporteEjecutivoPDF()` en `app.js`

| Aspecto | Detalle |
|:---|:---|
| Método | `window.print()` (motor de impresión del navegador → PDF vía Chrome) |
| Contenedor | `#printReportContainer` en `index.html` |
| Membrete | Imagen base64 fija como fondo de página completa (`#printMembreteImg`) |
| Espaciado | `<thead height="150px">` para header del membrete, `<tfoot height="120px">` para pie |

#### Orden de secciones del informe (actualizado v2):
1. **Encabezado:** "Reporte de Desempeño Operativo" + metadata (fecha, gestores, periodo)
2. **Top Alerta Tardanzas (Peores)** — `printChart5`
3. **Top Excelencia Puntualidad (Mejores)** — `printChart1`
4. **Promedio Inactividad Diaria (Min)** — `printChart3`
5. **Eficiencia y Volumen de Retiros** — `printChart4`
6. **Evolución Diaria de Retiros** — `printChart2`
7. **Resumen de Retiros por Gestor** — `printTableContainer` (tabla)
8. **Análisis de IA** — `printAnalysisText` (incluye tabla de métricas: Total Retiros, Aprobados, Rechazados, ART)

#### CSS de Impresión (`styles.css` — `@media print`)
- Oculta sidebar, top-nav, botones, filtros
- Muestra `#printReportContainer` a ancho completo
- Imagen de membrete `position: fixed` cubriendo toda la página
- Contenido con `z-index: 1` sobre el membrete (`z-index: 0`)
- Tablas con estilo formal Times New Roman

---

## 7. Fuentes de Datos

| Fuente | Tipo | Contenido |
|:---|:---|:---|
| `kpi_operativos_v2.json` | JSON estático | Métricas operativas históricas de retiros (aprobaciones, rechazos, tiempos, totales diarios) |
| `procesos_list.json` | JSON estático | Índice de documentos de procesos |
| `Cronograma de Tareas/*.xlsx` | Excel | Cronogramas mensuales de tareas por gestor y SET |
| `Horario/Horario 2026.xlsx` | Excel | Horario maestro de turnos por semana y fecha |
| `Teletrabajo/Teletrabajo.xlsx` | Excel | Programación de teletrabajo |
| `Tareas Riesgo/Tareas de Riesgo.xlsx` | Excel | Catálogo maestro de tareas y jerarquía de SETs |
| Firebase Realtime Database | En tiempo real | Perfiles, sesiones activas, reportes de turno, permisos, comunicados, logs |

---

## 8. Librerías Externas (CDN)

| Librería | Versión | Uso |
|:---|:---|:---|
| Google Fonts (Inter) | — | Tipografía principal |
| Boxicons | v2.1.4 | Iconografía UI |
| SheetJS | v0.20.0 | Lectura de archivos Excel (.xlsx) en el navegador |
| jsPDF + html2pdf.js | v2.5.1 / v0.10.1 | Generación de PDFs individuales |
| Chart.js | Latest | Visualización de datos (gráficas de barras, líneas, scatter) |
| chartjs-plugin-datalabels | v2.0.0 | Etiquetas sobre puntos de datos en gráficas |
| Firebase JS SDK | v8.10.1 | App, Auth, Realtime Database |
| FormSubmit.co | — | Envío de emails (registro pendiente, recuperación de contraseña) |

---

## 9. Autenticación y Roles

### Flujo de Autenticación
1. Usuario se registra en `login.html` con email, nombre, contraseña y rol solicitado
2. Se crea cuenta con `approved: false` → se envía email a supervisores vía FormSubmit.co
3. Supervisor aprueba en panel de **Aprobaciones** → `approved: true`
4. Usuario puede iniciar sesión → se cargan datos de perfil desde `users/{uid}`

### Roles y Permisos

| Rol | Acceso |
|:---|:---|
| **Gestor** | Mis Tareas, Comunicados (solo lectura y confirmación de su propia lectura), Horario, Teletrabajo, Biblioteca de Procesos, Permisos |
| **Supervisor** | Todo lo del Gestor + Aprobaciones, Monitoreo, Eficiencia Operativa, Control de Tiempos, Historial de Turnos, Gestión Comunicados (crear/publicar, leer contenido, consultar lecturas — **no** puede editar ni eliminar comunicados existentes; no adquiere administración de usuarios/roles) |
| **Admin** | Acceso completo, incluida la administración de usuarios/roles y la única facultad de eliminar comunicados. Se aprueba automáticamente al registrarse. |

> Nota (2026-08-24): Fase 1 había restringido la gestión de comunicados exclusivamente a Admin. Un requerimiento posterior habilitó a Supervisor para crear/publicar comunicados y consultar lecturas; eliminación y edición de comunicados existentes permanecen exclusivas de Admin. Detalle en `README_SECURITY.md` ("Actualización posterior — Comunicados").

### Detección de Inactividad
- **Idle Detector API**: Detecta bloqueo de pantalla y cambio de pestaña > 5 minutos
- Actualiza estado en `active_sessions/{uid}` (`Activo` vs `Inactivo`)
- Los tiempos de inactividad se registran en la bitácora del turno

---

## 10. Despliegue

### Firebase Hosting
```bash
# Desplegar cambios
npx firebase-tools deploy --only hosting

# Proyecto: riskops-75637
# URL: https://riskops-75637.web.app
```

### GitHub
```bash
# Repositorio: https://github.com/VirtualSoft026/riesgovirtualsoft.git
# Branch: main

git add .
git commit -m "descripción del cambio"
git push origin main
```

> [!IMPORTANT]
> Los cambios en archivos locales **NO se reflejan** en la app hasta ejecutar `firebase deploy`. GitHub solo almacena el código fuente; Firebase Hosting es quien sirve la app.

---

## 11. Último Cambio Registrado (30 Jul 2026)

**Commit:** `ba48545` — *"fix: reducir espacio excesivo en PDF y reordenar secciones del informe operativo"*

### Cambios realizados:
- **`styles.css`**: Reducido `padding-top` de `150px` a `0px` en `#printReportContainer` dentro de `@media print` para eliminar espacio duplicado al inicio del informe exportado
- **`index.html`**: 
  - Reorganizado el orden de secciones del contenedor de impresión: gráficas y tabla de resumen ahora aparecen **antes** del análisis de IA
  - Renombrado "Aprobaciones por Día" → "Evolución Diaria de Retiros"
