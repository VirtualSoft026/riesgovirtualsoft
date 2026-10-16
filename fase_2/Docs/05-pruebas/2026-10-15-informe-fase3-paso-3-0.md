# Informe — Fase 3, paso 3.0: punto de entrada, sesión y rol, y cambios de `main`

## 1. Encabezado

- **Fecha:** 2026-10-15
- **Alcance:** paso 3.0 de `../03-plan-migracion/plan-fase-3.md` (§8): W-01, W-02, W-53 (a) y (b), W-55 (a) y W-26. W-27 está retirado.
- **Responsable:** Luis Fuentes. Ejecución preparada con Claude.
- **Rama:** `backup/fase2-refactor-2026-10-03`. **Sin commit**: el responsable hace los commits (DE-14).
- **Comando de verificación:** `node build/build-app.mjs`, `node build/build.mjs && node build/verify-bundle.mjs` y cada `src/tests/**/*.test.mjs` con `node`. Log completo: `2026-10-15-log-fase3-paso-3-0.txt`.
- **Archivos de producción tocados:** ninguno. No se tocaron `app.js`, `index.html`, `login.*`, las reglas ni `.github/`.

## 2. Resumen ejecutivo

| Compuerta del paso 3.0 | Resultado |
|---|---|
| `esbuild src/app/bootstrap.js` compila | **Sí**: `build/dist/riskops.app.js` (8 módulos, global `RiskOpsApp` con `initApp`) |
| Pruebas de sesión en verde | **17/17** (`src/tests/app/session.test.mjs`) |
| Suites unitarias de `src/tests` | **80/80 archivos en verde** (78 antes del paso, más 2 nuevos) |
| Bundle actual (`riskops.bundle.js`) | Compila y `verify-bundle` da PASS (71 comprobaciones) |
| `tsc --checkJs` (no estricto) | 159 → **148** errores en todo `src/`; **0** en los archivos tocados por el paso |

## 3. Qué se hizo

| Ítem | Cambio | Archivos |
|---|---|---|
| **W-01** | `bootstrap.js` reescrito: compila, ya no importa `createFormSubmitAdapter` (no existe) y no tiene código comentado que llame métodos inexistentes. Tiene 106 líneas (meta: menos de 500). No expone nada en `window`. Nuevo script `build/build-app.mjs`, que compila el punto de entrada de la Fase 3 sin reemplazar el bundle actual. | `src/app/bootstrap.js`, `build/build-app.mjs` |
| **W-02 + W-55 (a)** | Nuevo módulo de sesión. El rol y la aprobación se leen de `users/{uid}` con `onAuthStateChanged` y se escuchan durante toda la sesión. El caché de `localStorage` ya no decide permisos: si dice "Admin" y el servidor dice "Gestor", rige Gestor y el caché se reescribe. Un usuario rechazado, borrado, pendiente o con rol inválido durante la sesión es expulsado: `signOut`, borrado de todas las claves de sesión salvo el tema, y vuelta al login. Se conservan de `app.js`: sin sesión → login; Gestor con sesión de otro día → limpieza y login; `logoutTime` y `onDisconnect` del `login_log`; aviso en tiempo real de `hasSplitShift` (solo Gestor); bloqueo móvil del Gestor y scroll para Admin/Supervisor. Se retira el parche de junio (DE-12). | `src/app/session.js`, `src/app/app-router.js` (`applyMobileAccess`), `src/domain/auth/auth-service.js` (`buildMobileAccessPolicy`) |
| **W-53 (a)** | No había stubs en `bootstrap.js`; el comentario de `shift-activity-controller.js` que decía lo contrario se corrigió. Búsqueda de "stub" en `src/` sin `src/tests`: 0. | `src/controllers/shift-activity-controller.js` |
| **W-53 (b)** | `tsc --checkJs` en 0 para los archivos del paso; total de `src/` 159 → 148. La meta de 0 en todo `src/` es CF-3.2, al cierre. | varios (solo anotaciones JSDoc) |
| **W-53 (c), adelanto** | Validador del perfil en la frontera de datos: `approved` debe ser el booleano `true`, `'Rechazado'` se reconoce como rechazo y el rol debe estar en el catálogo `ROLES`. | `src/domain/auth/user-profile.js` |
| **W-26** | De `main`: (1) **ids estables de tareas** por Set + Tarea (rango 0-9999), en vez del índice de la fila; (2) **purga de tareas huérfanas también en Firebase** (`active_sessions/{uid}/tasks`), en una sola escritura multirruta y best-effort. Pruebas diferenciales contra la copia literal de `main` (6ddef16). La lista de manuales de `main` es W-12 (paso 3.1). | `src/domain/tasks/task-catalog.js`, `src/services/firebase/firebase-task-repository.js`, `src/controllers/task-loaders-controller.js` |

## 4. Pruebas

| Archivo | Qué cubre | Resultado |
|---|---|---|
| `src/tests/app/session.test.mjs` (nuevo) | Validación del perfil, mezcla caché/servidor, misma fecha, política móvil, 10 escenarios de sesión (sin sesión, caché corrupto, otro día, sin Auth, uid distinto, rol alterado en `localStorage`, rechazado durante la sesión, perfil borrado/pendiente/rol inválido, error de lectura, cambio de rol y `hasSplitShift`, logout y shutdown) y `initApp` con DOM mínimo | 17/17 |
| `src/tests/domain/task-catalog-main-sync.test.mjs` (nuevo) | Ids iguales a `main` en 500 maestros aleatorios; el id no cambia al insertar o reordenar filas; ids purgados iguales a `main` en 300 escenarios; escritura multirruta y errores | 5/5 |
| `src/tests/controllers/task-loaders-controller.test.mjs` | La referencia diferencial pasa a ser `loadExcelTasks()` de `main` (antes, el `app.js` de la rama): DOM, caché y escrituras en Firebase iguales en 150 escenarios | 8/8 |
| `src/tests/domain/task-pure-rules.test.mjs` | Ajuste a los ids estables y a `purgedTaskIds` | 23/23 |

## 5. Hallazgos

1. **Las e2e del laboratorio que comparan con `app.pre-integracion.js` van a marcar diferencias en los ids de tareas**, porque esa referencia congelada usa el índice de la fila y la rama ahora usa el id estable de `main`. Es el cambio buscado (W-26). La referencia se jubila en W-30 (paso 3.5); hasta entonces esa diferencia es esperada. El laboratorio no se corrió en este paso, por decisión del responsable.
2. **Efecto en datos existentes:** al cambiar los ids, el progreso guardado con ids por índice no coincide con los nuevos y se purga como huérfano la primera vez. `main` ya pasó por esta transición en producción, así que la rama se alinea con lo que producción ya hace.
3. **`app.js` todavía no usa `session.js`.** `index.html` sigue cargando `app.js` y el bundle actual hasta el paso 3.6 (W-04 y W-05). El riesgo del rol tomado de `localStorage` sigue presente en la versión que se ejecuta hoy. CF-4.1 se cumple cuando `bootstrap.js` sea el punto de entrada.

## 6. Estado frente al criterio de salida y próximos pasos

- Compuerta del paso 3.0: **cumplida**.
- Criterios de `criterios-de-finalizacion.md` que avanzan: CF-0.1 (bootstrap compila, 106 líneas), CF-0.4 (ids estables y purga de `main`; falta la lista de manuales en 3.1), CF-3.1 (sin stubs), CF-3.2 (148 errores restantes), CF-3.3 (validador de `users/{uid}`), CF-4.1 y CF-4.3 (implementados; rigen cuando bootstrap sea el punto de entrada) y CF-4.4 (borrado de claves en la nueva sesión).
- **Siguiente paso: 3.1.** Primero seguridad (W-11 sanitizador, W-52 escape de texto libre, W-55 b y c, W-56 librerías); después el retiro de duplicados (W-07 a W-14, W-40, W-41, W-44, W-48 y W-49 a y b).
