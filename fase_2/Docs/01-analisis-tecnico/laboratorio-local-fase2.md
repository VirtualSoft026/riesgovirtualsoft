# Laboratorio Local — Arquitectura Fase 2

**Fecha:** 2026-09-24
**Base:** el laboratorio anterior descrito en `DOCUMENTACION_TECNICA_LABORATORIO.md` (copia espejo: `C:\Users\Luis Alfredo Fuentes\Lucho\riesgovirtualsoft-feature-Fase_2 (1)\fase_2\Docs\01-analisis-tecnico\`) y su `Iniciar_Laboratorio_Local.bat`. Se conservan sus componentes, puertos y comportamiento de persistencia; se añade la compilación del bundle, una copia de *staging* del sitio y comprobaciones previas.

Ubicación de los archivos: `fase_2/lab/` (`Iniciar_Laboratorio_Fase2.bat`, `stage.mjs`, `preflight.mjs`). *(Nota 2026-10-03: `fase_2/` se movió de `.github/fase_2/` a la raíz del repositorio; ver la nota en `hoja-de-ruta.md` sección 0.)* No modifica ningún archivo de producción: todo lo que arma vive fuera del repositorio, en la carpeta de trabajo del laboratorio.

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

La semilla actual (`emulator_data/`, ignorada por git) contiene:

| Rol en DB | Correo (Auth) | Aprobado |
|---|---|---|
| Gestor (`luis gestor`) | `gestor@virtualsoft.tech` | sí |
| Supervisor (`luis admin`) | `admin@virtualsoft.tech` | sí |
| Gestor (`oriana borja`, semilla sin cuenta Auth) | — | sí |

Además incluye 15 reportes de turno, 32 registros de acceso, 1 comunicado y 1 sesión activa. El laboratorio anterior documentaba otros usuarios (`admin.lab@` y `gestor.lab@virtualsoft.tech`, UID `LAB_*`); si se necesitan, se crean desde la Emulator UI o el registro de la app.

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
