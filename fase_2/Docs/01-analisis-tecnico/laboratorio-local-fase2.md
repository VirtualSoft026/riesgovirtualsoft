# Laboratorio Local — Arquitectura Fase 2

**Fecha:** 2026-09-24
**Base:** el laboratorio anterior descrito en `DOCUMENTACION_TECNICA_LABORATORIO.md` (copia espejo en una carpeta personal local, fuera del repositorio) y su `Iniciar_Laboratorio_Local.bat`. Se conservan sus componentes, puertos y comportamiento de persistencia; se añade la compilación del bundle, una copia de *staging* del sitio y comprobaciones previas.

Ubicación de los archivos: `fase_2/lab/` (`Iniciar_Laboratorio_Fase2.bat`, `stage.mjs`, `preflight.mjs`, y desde 2026-10-14 `suite_pruebas.bat` con su carpeta `suite/`, ver §8). *(Nota 2026-10-03: `fase_2/` se movió de `.github/fase_2/` a la raíz del repositorio; ver la nota en `hoja-de-ruta.md` sección 0.)* No modifica ningún archivo de producción: todo lo que arma vive fuera del repositorio, en la carpeta de trabajo del laboratorio.

---

## 1. Qué reutiliza del laboratorio anterior

| Servicio | Puerto | URL | Función |
|---|---|---|---|
| Hosting | `5000` | `http://127.0.0.1:5000` | App RiskOps servida localmente |
| Emulator UI | `4000` | `http://127.0.0.1:4000` | Panel de los emuladores |
| Authentication | `9099` | `http://127.0.0.1:9099` | Usuarios de prueba |
| Realtime Database | `9000` | `http://127.0.0.1:9000` | Base de datos local |

- `firebase-config.js` ya redirige a `127.0.0.1:9099` (Auth) y `127.0.0.1:9000` (Realtime Database) cuando el host es `localhost` o `127.0.0.1`; por eso los puertos no se pueden cambiar.
- Persistencia: `--import` carga el estado guardado y `--export-on-exit` lo guarda al cerrar.
- Reglas: se usa `database.rules.json` del repositorio, de modo que el laboratorio aplica las mismas reglas que producción.
- Proyecto Firebase: el `.firebaserc` del repositorio (`riskops-75637`), igual que el laboratorio anterior. Los emuladores atienden todo localmente; no hay escritura en la nube.

## 2. Qué añade para la arquitectura nueva

`Iniciar_Laboratorio_Fase2.bat` ejecuta cuatro pasos:

1. **Compila el bundle** (`fase_2/build`, esbuild): genera `riskops.bundle.js` (script clásico, global `RiskOps`).
2. **Arma el staging** (`stage.mjs`) en una **carpeta de trabajo con ruta limpia**, por defecto `C:\riskops-lab-fase2`:
   - `site/`: copia de los mismos archivos que publica `deploy-pages.yml` (más los XLSX operativos y `kpi_operativos_seed.json`, que solo existen en local), el bundle y `smoke.html`.
   - Inyecta `<script src="riskops.bundle.js">` **antes** de `app.js` únicamente en la copia de staging de `index.html`. El `index.html` del repositorio no se toca. Así el laboratorio ejercita el orden de carga definitivo (bundle síncrono antes de `app.js`) sin modificar producción. Se desactiva con `RISKOPS_LAB_INJECT_BUNDLE=0`.
   - Copia `database.rules.json` y `.firebaserc`, y genera el `firebase.json` del laboratorio.
   - Copia la semilla (`emulator_data` del repositorio) **solo la primera vez**; el estado posterior de la sesión vive en `C:\riskops-lab-fase2\emulator_data` y la semilla del repositorio nunca se modifica.
3. **Comprobaciones previas** (`preflight.mjs`): Node ≥ 20, puertos libres (nombra al proceso que ocupa cada puerto), Java ≥ 21 y prueba real de arranque del emulador de Realtime Database, con mensaje de remediación si falla.
4. **Arranca los emuladores** con `firebase-tools@15.30.0` (la versión que generó la semilla), desde la ruta limpia.

Variables opcionales: `RISKOPS_LAB_ROOT`, `RISKOPS_LAB_SERVICES` (por defecto `hosting,auth,database,ui`), `RISKOPS_FIREBASE_TOOLS`, `RISKOPS_JAVA_HOME`, `RISKOPS_LAB_INJECT_BUNDLE`.

### Por qué una ruta de trabajo aparte

La ruta real del repositorio contiene un `&` (`...VIRTUALSOFT SERVICIOS & SOFTWARE S.A.S...`), y `firebase-tools` invoca subprocesos vía `cmd.exe`, donde `&` separa comandos y trunca la ruta. Un *junction* no lo resuelve; una carpeta separada con ruta limpia sí. Por eso `stage.mjs` se niega a usar una ruta con `&`, `%`, `^` o `!`.

## 3. Datos semilla

*(Nota 2026-10-03: los correos de esta sección y el nombre completo en la ruta de la sección "Base" (arriba) se enmascararon — `gxxxxxx@xxxxx.xxx`, `Lxxx Axxxxx Fxxxxxx` — antes de subir `fase_2/` a GitHub como respaldo. Los correos son cuentas semilla del emulador local, no credenciales de producción, pero se enmascaran igual por tratarse de direcciones reales del dominio de la empresa. El código fuente de `fase_2/src/` no se tocó: la constante `FORM_SUBMIT_CC` de `services/external/formsubmit-notification-adapter.js` debe seguir siendo idéntica a la de `app.js` para que la comparación de snapshots de la Fase 1 siga siendo válida.)*

La semilla actual (`emulator_data/`, ignorada por git) contiene:

| Rol en DB | Correo (Auth) | Aprobado |
|---|---|---|
| Gestor (`luis gestor`) | `gxxxxxx@xxxxx.xxx` | sí |
| Supervisor (`luis admin`) | `axxxxxx@xxxxx.xxx` | sí |
| Gestor (`oriana borja`, semilla sin cuenta Auth) | — | sí |

Además incluye 15 reportes de turno, 32 registros de acceso, 1 comunicado y 1 sesión activa. El laboratorio anterior documentaba otros usuarios (`axxxxxx@xxxxx.xxx` y `gxxxxxx@xxxxx.xxx`, UID `LAB_*`); si se necesitan, se crean desde la Emulator UI o el registro de la app.

Regla de seguridad que ya causó errores: `approved` debe ser el booleano `true` en `/users/{uid}/approved`; un texto como `"Aprobado"` hace que `database.rules.json` responda `PERMISSION_DENIED`.

## 4. Qué probar aquí para la arquitectura nueva

Lista de verificación manual (Chrome, `http://127.0.0.1:5000`):

1. `smoke.html`: el bundle carga y `RiskOps` expone sus 25 espacios de nombres.
2. Inicio de sesión como Gestor con el bundle inyectado: la app arranca igual que sin él, sin errores nuevos en consola (el bundle solo añade el global `RiskOps`).
3. Permiso de inactividad concedido: al dejar la pestaña sin actividad y trabajar en otra aplicación, la bitácora registra inactividad. Referencia de comportamiento actual (`app.js` líneas ~2394-2398): con `window.idleDetectorGranted` verdadero manda `globalIdleState`; sin él actúa el fallback DOM a los 5 min.
4. Pausas (almuerzo, desayuno, pausa de turno) y cierre de turno: comparar el reporte generado con el de una ejecución sin bundle.

Al conectar los módulos (paso 9 de la Fase 1 y Fase 3), este laboratorio es el lugar previsto para la verificación en Chrome antes de cada corte, junto con `npm run check`.

## 5. Limitaciones conocidas de este equipo

- **JDK 21 impide arrancar el emulador de Realtime Database** (`Unable to establish loopback connection`, Netty/NIO de Windows). `preflight.mjs` lo detecta y explica las opciones (firewall/antivirus para `java.exe`, JDK posterior a 21 con `RISKOPS_JAVA_HOME`, Docker/WSL2, o arrancar sin base de datos con `RISKOPS_LAB_SERVICES=hosting,auth,ui`).
- **Puerto 9000 ocupado** el 2026-09-23 por un kernel de Jupyter de VS Code (`ipykernel_launcher`). Hay que cerrarlo antes de arrancar el laboratorio.
- `firebase-tools` avisa que Node 26 no es una versión soportada (soportadas: 20, 22 y 24); funciona, pero conviene usar Node 22 o 24 si aparecen fallos raros.

## 6. Estado de verificación (2026-09-24)

Verificado:
- `stage.mjs` arma `C:\riskops-lab-fase2` completo; el bundle queda antes de `app.js` solo en la copia de staging; `git status` del repositorio queda limpio para `app.js` e `index.html`.
- Hosting y Auth arrancan desde la ruta limpia y sirven `index.html`, `login.html`, `smoke.html`, `riskops.bundle.js`, `firebase-config.js` y los XLSX.
- `preflight.mjs` detecta correctamente el fallo de Java 21 y el puerto 9000 ocupado.

Sin verificar:
- El arranque completo con Realtime Database y el inicio de sesión (bloqueado por Java 21).
- Un ciclo real de inactividad en Chrome con el permiso concedido.
- El `.bat` de extremo a extremo (se validaron sus pasos por separado con Node y `npx`).

## 7. Reversión

Borrar `C:\riskops-lab-fase2` elimina todo el laboratorio; el repositorio no se ve afectado. `stage.mjs` solo regenera `site/` en cada arranque y conserva `emulator_data/`.

## 8. Suite de pruebas automatizada (`suite_pruebas.bat`, 2026-10-14)

`Iniciar_Laboratorio_Fase2.bat` arranca la app para la prueba **manual** en Chrome. `suite_pruebas.bat` es su pareja **automática**: corre todas las pruebas sobre el código actual de la rama, sin emuladores ni navegador, y dice qué tan lejos está el cierre del refactor. El flujo de trabajo queda así:

```
editar local  →  Iniciar_Laboratorio_Fase2.bat (corre la suite + muestra el plan + arranca el lab)  →  prueba manual  →  commit/push a la rama refactor
```

Desde 2026-10-14 `Iniciar_Laboratorio_Fase2.bat` corre la suite **en cada inicio** y muestra el plan de prueba manual antes de arrancar los emuladores (pasos 2 y 3 de 6, ver abajo). `suite_pruebas.bat` sigue existiendo para correr solo la suite, sin levantar el laboratorio.

### Integración con `Iniciar_Laboratorio_Fase2.bat`

| Paso | Qué hace |
|---|---|
| 1/6 | Compila el bundle (igual que antes). |
| 2/6 | Corre la suite completa (`suite/suite-pruebas.mjs`) sobre el código actual de la rama y muestra el resultado. Prepara antes el Python aislado con `suite/preparar-python.cmd`. Si hay fallas **no** bloquea el arranque: avisa. |
| 3/6 | `suite/plan-prueba-manual.mjs` cruza el resultado con las 11 áreas funcionales (arranque, sesión y roles, tareas, pausas, monitoreo, aprobaciones, reportes, KPIs, comunicados, cierre de turno, motor operativo) y lista qué probar a mano, **ordenado por prioridad** (primero FALLA y OMITIDA). También lista las líneas de `app.js` marcadas `[Fase 2]` (código delegado al bundle) para recorrerlas en Chrome. Si la integración falló, avisa que `stage.mjs` se detendrá y ofrece `RISKOPS_LAB_INTEGRATE=0`. Espera una tecla antes de seguir. |
| 4/6 a 6/6 | `stage.mjs`, `preflight.mjs` y emuladores (igual que antes). |

El plan queda en `C:\riskops-lab-fase2\pruebas\plan-prueba-manual.txt` para tenerlo abierto mientras se prueba. Variables: `RISKOPS_LAB_SUITE=0` omite la suite (el plan sale sin datos automáticos) y `RISKOPS_LAB_PAUSA_PLAN=0` no espera tecla.

### Archivos

| Archivo | Función |
|---|---|
| `fase_2/lab/suite_pruebas.bat` | Punto de entrada (doble clic). Compila el bundle, prepara Python aislado y lanza la suite. |
| `fase_2/lab/suite/suite-pruebas.mjs` | Orquestador: ejecuta cada grupo, resume y guarda el log. |
| `fase_2/lab/suite/bloqueo-red.cjs` | Se precarga en cada proceso de Node (`--require`): cualquier conexión de red falla con `ERIESGO_RED`. |
| `fase_2/lab/suite/motor_operativo_aislado.py` | Corre `test_motor_operativo.py` (raíz del repo) en entorno hermético y agrega un contrato de seguridad del motor. |
| `fase_2/lab/suite/preparar-python.cmd` | Crea/reutiliza `C:\riskops-lab-fase2\venv-motor` y define `RISKOPS_PYTHON` (lo usan los dos `.bat`). |
| `fase_2/lab/suite/plan-prueba-manual.mjs` | Genera el plan de prueba manual de cada inicio a partir del último resultado. |

### Qué ejecuta

| Paso | Contenido | Equivale a |
|---|---|---|
| 1. Bundle | `build/verify-bundle.mjs` (71 comprobaciones de `window.RiskOps`) | `npm run verify` |
| 2. Unitarias | Todos los `*.test.mjs` de `fase_2/src/tests` salvo `e2e/` y `helpers/` (78 archivos al 2026-10-14) | `src/tests/README.md` |
| 3. Integración | Aplica `integracion/aplicar-integracion.mjs` + `integracion/pasos/` al `app.js` de la rama y escribe `app.integrado.js` **fuera del repo** | lo que hace `stage.mjs` |
| 4. E2E | Las 9 pruebas de `src/tests/e2e` contra el `app.js` original e integrado con el bundle real (`--strict` donde aplica) | log del paso 6 |
| 5. Motor operativo | `test_motor_operativo.py` + 3 pruebas de seguridad (import sin red H-P4, credenciales del `.env` no se cargan, `authenticate()` sin credenciales no sale a la red) | `hoja-de-ruta.md` §0 paso 3 |

Nota: la prueba del motor operativo es el script `test_motor_operativo.py` (unittest). No existe un cuaderno Jupyter del motor en el repositorio; el único rastro de Jupyter en el laboratorio es el kernel que ocupó el puerto 9000 (§5).

### Controles de seguridad

- **No escribe en el repositorio.** Resultados, `app.integrado.js` y el entorno de Python quedan en `%RISKOPS_LAB_ROOT%` (por defecto `C:\riskops-lab-fase2\pruebas` y `...\venv-motor`). La suite se niega a correr si `RISKOPS_LAB_ROOT` apunta dentro del repo.
- **Red bloqueada** en cada proceso de prueba (Node y Python). Un intento de conexión hace fallar la prueba y se cuenta en el resumen.
- **Sin secretos en el entorno de las pruebas.** Se eliminan variables con `PASSWORD`, `TOKEN`, `SECRET`, `API_KEY`, `MSTR_*`, `FIREBASE_*`, `GITHUB_*`, etc. En Python, las `MSTR_*` se fuerzan a vacío antes de importar el motor: `load_dotenv()` no sobrescribe variables existentes, así que las credenciales del `.env` real no llegan a la prueba (verificado con un `.env` falso con contraseña).
- **Sin shell ni bytecode.** Los procesos se lanzan con `spawnSync` sin `shell` (rutas con espacios o `&` no se interpretan), con tiempo límite (180 s por archivo) y Python en modo `-I` sin `__pycache__`.

### Uso

```bat
fase_2\lab\suite_pruebas.bat                    &rem todo
fase_2\lab\suite_pruebas.bat --solo-unitarias   &rem solo bundle + unitarias
fase_2\lab\suite_pruebas.bat --sin-motor        &rem sin la parte de Python
```

La primera vez crea `C:\riskops-lab-fase2\venv-motor` e instala `requirements.txt` (necesita internet solo esa vez). Para usar otro Python: `set RISKOPS_PYTHON=C:\ruta\python.exe`. Código de salida: `0` todo en verde, `1` hay fallas, `2` la suite no pudo prepararse.

Salida: resumen en consola y `C:\riskops-lab-fase2\pruebas\ultimo-resultado.txt` (+ `.json` y un `resultado-<fecha>.txt` por corrida).

### Primera corrida de referencia (2026-10-14, código de la rama con las 6 delegaciones de ese día)

| Grupo | Archivos OK / total | Pruebas OK | Pruebas falla |
|---|---|---|---|
| Bundle | 1 / 1 | 71 | 0 |
| Unitarias | 75 / 78 | 1274 | 5 |
| Integración | 0 / 1 | — | 1 |
| E2E | 0 / 9 (omitidas por la integración) | — | — |
| Motor operativo | 1 / 1 | 4 | 0 |

Fallas encontradas (pendientes de corregir antes del cierre):

1. ~~**Integración rota por la delegación de `syncActiveSessionToFirebase()`**~~ — **corregido el 2026-10-14** en `integracion/aplicar-integracion.mjs`: el paso `latido: payload con splitShiftStartTime y total` ahora agrega los dos campos al objeto `sessionMetadata` ya construido (cubre la ruta delegada y la de respaldo), y el paso `cierre: campos de tiempos del correo` sustituye el bloque `[Fase 2]` de `buildClosureEmailTimeFields` por `__closure.emailFields`. La integración aplica 62 pasos y `stage.mjs` vuelve a funcionar.
2. `domain/presence-and-counter.test.mjs` — D6 aislamiento estático: `src/app/bootstrap.js` crea los servicios de presencia/contador, y la regla D6 dice que solo el bundle los expone.
3. `controllers/announcements-controller.test.mjs` — 3 casos D4 (duplicidad de lectura con reglas reales y `PERMISSION_DENIED`).
4. `controllers/shift-activity-controller.test.mjs` — `onIdleChange(false)`: la pausa no debe bloquear la restauración a Activo.

Las fallas 2–4 se reproducen igual sin el bloqueo de red: son del código, no de la suite.

### Corrida tras corregir la integración (2026-10-14)

Integración 62/62 pasos. E2E: 4 de 9 en verde (`cierre-horas-efectivas` 19/19, `modales-permisos-integrado` 78/78, `kpis-integrado` 20/20, `turno-avance-panel-horas-efectivas` 9/9). Las otras 5 fallan por causas **ajenas** a la corrección del paso:

5. **`app.js` perdió el parche de la Pausa de Turno del 2026-10-04** (`renderActiveSessionsDashboard`, `viewTimelineInMonitoreo`, `openLoginHistoryModal`): `parche-pausa-turno.unit.cjs` da `Integridad 2/5` y `monitoreo-render.e2e.cjs` falla incluso contra el `app.js` del repo sin integrar. El 2026-10-06 el mismo archivo daba `PARCHE VERIFICADO`. El reflog de git muestra un `reset: moving to HEAD~1` el 2026-10-13 y la rama activa es `backup/fase2-refactor-2026-10-03`. Arrastra `split-shift-flag` R3.1/R3.4 y las tarjetas de Monitoreo de `historial-navegacion-integrado`.
6. **Paso `integracion/pasos/inactividad-shift-activity.mjs` (2026-10-09)**: usa `__shiftActivityController`, que los arneses de `split-shift-flag.unit.cjs` no definen (`__shiftActivityController is not defined` en R2.5, R3.2, R3.3). Sin ese paso esas 3 pruebas pasan.
7. `tareas-integrado` S6 (inactividad por IdleDetector: el integrado reporta `En Línea` donde el original reporta `Inactivo`) y `comunicados-integrado` C1b (D4) — pendientes de diagnóstico.

