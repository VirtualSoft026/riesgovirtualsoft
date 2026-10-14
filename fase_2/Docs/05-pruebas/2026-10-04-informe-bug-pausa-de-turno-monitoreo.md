# Informe de análisis de bug — la Pausa de Turno no se refleja en la vista del supervisor

## 1. Encabezado

- **Fecha:** 2026-10-04
- **Alcance:** flujo de estado de pausas e inactividad desde el Gestor (`toggleSplitShiftBreak`, `pushTimelineEvent`, `syncActiveSessionToFirebase`) hasta el panel de Monitoreo del supervisor (`startActiveSessionsListener`, `renderActiveSessionsDashboard`, `viewTimelineInMonitoreo`, `openLoginHistoryModal`), más `database.rules.json` (solo lectura).
- **Responsable:** Luis Fuentes (ejecución y revisión).
- **Tipo:** corrección de bug en producción, fuera del plan de extracción (paréntesis del paso 6).
- **Archivos tocados:** al diagnosticar, solo archivos nuevos (`fase_2/src/domain/analytics/active-session-status.js`, su prueba y este informe); `app.js`, `index.html` y `database.rules.json` solo se leyeron. **Actualización 2026-10-04: con tu autorización explícita ("Aplica los hallazgos del informe"), el parche de la sección 6 se aplicó a `app.js` — ver sección 8.** `index.html`, `login.js` y `database.rules.json` siguen sin modificarse. No se hizo ninguna operación de git.
- **Comando exacto usado:** `node fase_2/src/tests/domain/active-session-status.test.mjs` — log: [`2026-10-04-log-bug-pausa-de-turno-monitoreo.txt`](2026-10-04-log-bug-pausa-de-turno-monitoreo.txt).

## 2. Resumen ejecutivo

**Causa confirmada:** la vista del supervisor nunca contempló el estado `"En Pausa de Turno"`. El Gestor sí lo publica en Firebase (`app.js` 2426-2427), pero `renderActiveSessionsDashboard()` solo reconoce `En Almuerzo`, `En Desayuno`, `Inactivo` y `En Línea`. Como el estado de pausa no entra en ninguna rama especial, el supervisor ve **"En Línea"** mientras el latido (cada 30 s) esté vigente (< 2 min). Esto explica exactamente lo observado: en la consola del Gestor el inicio y el fin de la pausa aparecen bien, y el supervisor sigue viendo "En Línea".

Está reproducido con una prueba automatizada (6/6): copia literal de la lógica actual + versión corregida; para los demás estados el resultado es idéntico, solo cambia la Pausa de Turno.

**Sobre "inactivo":** el código del supervisor sí muestra `Inactivo` cuando el Gestor lo publica; no encontré en el código un defecto equivalente. Hay dos explicaciones posibles que no son un error de la vista, y que conviene verificar con las comprobaciones de la sección 5.

## 3. Finalidad

Los Gestores con turno partido dependen de este botón: el supervisor decide con el panel de Monitoreo si alguien está disponible. Mostrar "En Línea" a alguien en pausa lleva a asignarle trabajo que no atenderá, y además enmascara que su pausa está en curso.

## 4. Metodología

Lectura de `app.js` siguiendo el dato de punta a punta, con número de línea:

1. **Botón** (`toggleSplitShiftBreak`, 3621-3659): pone `isSplitShiftBreak`, registra `pushTimelineEvent('Pausa de Turno', ...)`, guarda el estado y llama `syncActiveSessionToFirebase()`. **Correcto.**
2. **Publicación** (`syncActiveSessionToFirebase`, 2386-2472): `loadBreakState()` y luego prioridad de estados: `Pausa de Turno` > `Almuerzo` > `Desayuno` > `Inactivo` > `En Línea` (2426-2436); escribe `status` y `timeline` en `active_sessions/{uid}` con un `update`. **Correcto.** Latido cada 30 s desde un Web Worker (2833-2842).
3. **Reglas de Firebase** (`database.rules.json`, `active_sessions`): no validan el valor de `status`, así que el estado de pausa **no es rechazado**. Descartado como causa.
4. **Escucha del supervisor** (`startActiveSessionsListener`, 5162-5173): recibe todo `active_sessions` y re-renderiza. **Correcto.**
5. **Render del supervisor** (`renderActiveSessionsDashboard`, 5215-5310): **aquí está el defecto** (sección 6).

## 5. Hallazgos

1. **Defecto principal (confirmado, reproducido).** Dónde falta `En Pausa de Turno`: filtro de estado (5245), "forzar a Inactivo sin latido" (5287), rama de la tarjeta (5296-5310), detalle de línea de tiempo (5478) e historial de accesos (8431).
2. **Efecto secundario en el mismo defecto:** si un Gestor en Pausa de Turno deja de enviar latidos por más de 2 minutos (cierra la tapa, suspende el equipo), la línea 5287 le cambia el estado a `Inactivo`, y la 5478 agrega al detalle un bloque falso de "Inactividad en curso" porque solo excluye Almuerzo y Desayuno.
3. **Menor:** la tabla de línea de tiempo del supervisor (5503-5505) no tiene ícono para `Pausa de Turno`; usa el reloj genérico.
4. **Sobre la inactividad no reflejada (hipótesis, no confirmada por código):** (a) `shouldApplyDomIdleFallback()` (557-562) solo marca inactividad cuando la pestaña está visible **y** enfocada, y solo si el permiso nativo de inactividad no fue concedido; un Gestor que cambia de pestaña o ventana sin ese permiso nunca pasa a `Inactivo`, y sus latidos lo mantienen "En Línea". (b) Durante una pausa la inactividad se ignora por diseño (`applyIdleStateChange`, 520). Comprobaciones en la consola (F12) del Gestor: `window.idleDetectorGranted` (si es `false`, aplica (a)); `JSON.parse(localStorage.riskOps_breakState).isSplitShiftBreak`; y en la pestaña Network/consola, que no aparezca `Error syncing active session via SDK`.

   **Resultado de la comprobación (2026-10-04): `window.idleDetectorGranted` devolvió `false`.** El detector nativo NO está activo en ese equipo; la inactividad depende solo del respaldo por eventos del navegador (`shouldApplyDomIdleFallback`, 557-562; ciclo de 1 s en 596-619), que tiene tres límites que explican que el supervisor siga viendo "En Línea": (i) exige **5 minutos** sin mouse, teclado, clic ni scroll (`DOM_IDLE_FALLBACK_THRESHOLD_MS`; el comentario de la línea 595 dice "10s" y está desactualizado); (ii) solo cuenta si la pestaña está **visible y con foco** — si el Gestor cambia de pestaña o de ventana, o bloquea la pantalla, nunca se marca inactivo y los latidos del Web Worker (cada 30 s) lo mantienen "En Línea"; (iii) al probar con F12 abierto, hacer clic dentro de las herramientas de desarrollo puede quitarle el foco a la página y el respaldo no se activa. La comprobación de `isSplitShiftBreak` no se pudo realizar; se sustituye por leer `active_sessions/{uid}` directamente. **Causa de que el detector no esté activo: sin determinar** — el texto del aviso amarillo (`idleDetectorWarning`) lo distingue (navegador sin soporte, permiso pendiente/denegado, o permiso otorgado pero el detector no arrancó).
5. **Observación (ya conocida, fuera de este bug):** hay dos vocabularios de estado: `Activo/Inactivo` en `users/{uid}/status` y `En Línea/Inactivo/En Almuerzo...` en `active_sessions/{uid}/status`. El panel de Monitoreo solo usa el segundo.

## 6. Parche para `app.js` (APLICADO el 2026-10-04 — ver sección 8)

Mínimo y sin cambiar nada más:

| Línea | Cambio |
|---|---|
| 5245 | Agregar `\|\| session.status === 'En Pausa de Turno'` a la condición. |
| 5287 | Agregar `&& session.status !== 'En Pausa de Turno'`. |
| tras 5303 | Nueva rama: `else if (session.status === 'En Pausa de Turno') { displayStatus = 'En Pausa de Turno ⏸️'; statusDot = '<div style="width: 8px; height: 8px; border-radius: 50%; background: #8b5cf6; margin-right: 6px;"></div>'; }` (morado, igual que el botón). |
| 5478 | Agregar `&& session.status !== 'En Pausa de Turno'`. |
| 5505 | Opcional: `if (ev.type === 'Pausa de Turno') icon = "<i class='bx bx-pause-circle' style='color: #8b5cf6'></i>";`. |
| 8431 | Agregar `\|\| s.status === 'En Pausa de Turno'`. |

La lógica equivalente ya está escrita y probada en `fase_2/src/domain/analytics/active-session-status.js` (para la refactorización final). Mientras no se conecte la refactorización, el parche de arriba es lo que corrige producción.

**Nota de riesgo:** `index.html` 475-479 ofrece solo "En Línea / Inactivos" como filtro; con el parche, una Pausa de Turno cae en "Inactivos", igual que Almuerzo y Desayuno hoy. Si prefieres un filtro "En pausa", es un cambio aparte.

## 7. Estado y próximos pasos

- Hecho: diagnóstico, reproducción automatizada, versión corregida con pruebas (6/6), parche propuesto línea por línea.
- Parche aplicado a `app.js` con tu autorización (sección 8). Pendiente: que lo subas (commit/push/despliegue, que no hago yo), subir la versión `?v=` de `app.js` en `index.html` (ver sección 8) y, para la inactividad, el tema del permiso nativo (hallazgo 4).
- `plan-maestro-ejecucion.md`: `renderActiveSessionsDashboard()` queda anotada con este hallazgo para que la extracción futura use la versión corregida.

## 8. Aplicación de los hallazgos (2026-10-04)

**Autorización:** instrucción del usuario en el chat, *"Aplica los hallazgos del informe"*, interpretada como autorización para aplicar el parche de la sección 6 (hallazgos 1, 2 y 3). Es el único cambio hecho en `app.js`.

**Qué se cambió:** 6 puntos, +5 líneas netas, sin tocar nada más. Diff completo: [`2026-10-04-parche-app-js-pausa-de-turno.diff`](2026-10-04-parche-app-js-pausa-de-turno.diff). El archivo conserva su codificación (UTF-8) y sus finales de línea (CRLF): se editó a nivel de bytes, y las 8841 líneas (8836 + 5) terminan en CRLF.

| Línea original | Cambio |
|---|---|
| 5245 | `En Pausa de Turno` sale del conteo "En Línea" del filtro. |
| 5287 | Una Pausa de Turno sin latido ya no se fuerza a `Inactivo`. |
| tras 5303 | Rama nueva de la tarjeta: texto "En Pausa de Turno ⏸️". (Corrección 2026-10-05: la rama también asigna `statusBadge`/`statusDot` morados, pero la tarjeta no pinta esas dos variables —igual que en Almuerzo y Desayuno—, por lo que el supervisor ve el texto y el indicador estándar, no un punto morado. Ver el informe de pruebas unitarias del parche.) |
| 5478 | Ya no se inyecta una "Inactividad en curso" falsa en el detalle de un Gestor en pausa. |
| 5505 | Ícono de pausa (`bx-pause-circle`, morado) en la tabla de la bitácora. |
| 8431 | Historial de accesos: la pausa no cuenta como "en línea". |

**Verificación (log completo: [`2026-10-04-log-aplicacion-parche-pausa-de-turno.txt`](2026-10-04-log-aplicacion-parche-pausa-de-turno.txt)):**

1. **Prueba de extremo a extremo con la función real.** `fase_2/src/tests/e2e/monitoreo-render.e2e.cjs` extrae `renderActiveSessionsDashboard()` del propio `app.js` y la ejecuta con un DOM simulado. Con el `app.js` original falla exactamente en los dos casos de Pausa de Turno ("En Línea" con latido reciente; "Inactivo" sin latido). Con el parchado pasa 7/7, y Almuerzo, Desayuno, Inactivo y En Línea dan el mismo resultado que antes.
2. **Sintaxis:** `node --check app.js` correcto.
3. **Infra QA del repositorio** (`migration_rehearsal`, `frontend_security_smoke`, `cronograma_cross_month`, `end_shift_smoke`, `inactivity_timeline`): resultados idénticos con el original y con el parchado (salvo rutas y marcas de tiempo).
4. **Regresión de `fase_2/src`:** todas las suites en verde (utils 74/74 y las suites de `domain/`).

**Limitaciones honestas de esta verificación:** no se probó en un navegador real contra Firebase; la prueba de extremo a extremo usa un DOM simulado y la infra QA se corrió sobre una copia temporal sin `npm install`, así que `npm run check` completo y la matriz con emulador (`npm run qa`) no se ejecutaron. Conviene una prueba manual con un Gestor de turno partido: pulsar "Pausa de Turno" y confirmar en la vista del supervisor.

**Pasos que NO hice (te corresponden o requieren tu autorización aparte):**
- **Subir el cambio.** Está en tu carpeta local, sin commit ni push. Tampoco se toca el despliegue.
- **Invalidar la caché del navegador.** `index.html` carga `app.js?v=20260826_v1` (línea 1467). Con la misma versión, los navegadores que ya tienen `app.js` en caché pueden seguir mostrando el comportamiento viejo. Recomiendo cambiar ese número al desplegar; es un cambio en `index.html`, que no toqué.
- **Inactividad (hallazgo 4):** no tiene parche de código; depende de activar el permiso nativo en cada equipo de Gestor (o de decidir si el respaldo por eventos debe mejorarse). Queda como decisión aparte.

**Cómo revertir:** el diff está completo y es inverso-aplicable; con git, `git checkout -- app.js` devuelve la versión anterior mientras el cambio no esté confirmado.
