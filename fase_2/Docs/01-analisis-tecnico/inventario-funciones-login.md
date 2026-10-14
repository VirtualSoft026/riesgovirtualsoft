***
# Inventario y Desglose de Funciones — `login.js`

## 1. Módulo / Archivo Analizado

- **Ruta del archivo:** `login.js`
- **Propósito general:** lógica de la página de autenticación (`login.html`): registro de nuevos usuarios, inicio de sesión, recuperación de contraseña y la regla de negocio que cierra el acceso a un Gestor cuyo turno ya terminó. No usa módulos ES ni build step; se carga como script clásico junto a los SDKs de Firebase y SheetJS.
- **Alcance del inventario:** 439 líneas; **2 funciones nombradas** en el ámbito superior (`switchPanel`, `checkShiftExpirationOnLogin`) y **4 manejadores de evento anónimos** registrados dentro de un único `DOMContentLoaded`, que concentran casi toda la lógica de negocio del archivo. Se catalogan también estos últimos, con su ubicación y firma efectiva, porque dejarlos fuera dejaría el inventario casi vacío de contenido útil — mismo criterio que usa `inventario-funciones.md` para los callbacks de `app.js`, pero aquí los callbacks SÍ llevan la mayor parte de la lógica, no son efectos secundarios menores.
- **Nota de alcance cerrada (2026-10-03):** este inventario responde al vacío señalado en `../03-plan-migracion/plan-maestro-ejecucion.md` §2 y §4 punto 5 ("scope incompleto en `login.js`"). No se modificó `login.js` para producir este documento.

## 2. Detalle de Funciones

### Funciones nombradas

----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `switchPanel(panelId)` (línea 2)
- **Firma / Parámetros de entrada:** `(panelId: string)`; id del panel (`.auth-panel`) a mostrar.
- **Salida / Retorno:** `undefined`; muta el DOM (oculta todos los `.auth-panel`, muestra el indicado, resetea formularios y oculta mensajes de error).
- **Comportamiento esperado vs. Real:** Debería cambiar entre los paneles de login/registro/recuperación; realmente también limpia el estado visual de todos los formularios y mensajes de error de la página, no solo el panel activo — efecto colateral correcto para esta UI, pero no implícito en el nombre.
- **Nivel de Relevancia:** Secundaria.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** `checkShiftExpirationOnLogin(dbUser)` (línea 17)
- **Firma / Parámetros de entrada:** `(dbUser: {role?: string, name?: string, ...})` — perfil leído de `users/{uid}` en Realtime Database.
- **Salida / Retorno:** `Promise<{expired: boolean, shiftStr?: string, shiftEndTime?: Date}>`.
- **Comportamiento esperado vs. Real:** Debería decidir si el turno asignado de un Gestor ya terminó hoy, para bloquear el login; realmente descarga y parsea en cada intento de login el archivo `Horario/Horario 2026.xlsx` completo vía `fetch` + SheetJS, busca la columna del día actual por fecha, busca la fila del usuario por nombre normalizado (sin tildes), parsea el rango de horas con una expresión regular y compara contra la hora actual, con reglas distintas para turnos que cruzan la medianoche. Es exactamente la función que `diagnostico-monolito.md` cataloga como "función Dios" de este archivo: mezcla I/O de red, parseo de Excel, normalización de texto y una regla de negocio horaria en una sola función de 110 líneas, sin pruebas. Nunca se ejecuta para `Admin`/`Supervisor` (retorno temprano). Cualquier excepción en el camino (red, formato de Excel, usuario no encontrado en la hoja) se traga en un `catch` general y devuelve `{ expired: false }` — es decir, **el fallo seguro es dejar entrar**, no bloquear; una falla de red o un cambio de formato en el Excel no impide el login, solo deja de aplicar la regla de turno vencido.

  **Hallazgo adicional de esta sesión (verificado, no solo inferido):** la parte final de esta función — parsear el rango `"8am - 4pm"` y decidir si ya venció, líneas 91-123 — **ya está migrada y es un 1:1 verificado** con `fase_2/src/domain/auth/shift-expiration.js#evaluateShiftExpiration(shiftStr, now)`, apoyada en `fase_2/src/utils/date-time.js#parseShiftRange/parseClockTime`. Se confirmó carácter por carácter: mismo patrón `CLOCK_TIME_PATTERN` (`/(\d{1,2})(?::(\d{2}))?\s*([ap]\.?\s*m\.?)?/i`), misma conversión am/pm, mismo conjunto `{'', 'Descansa', 'Por Asignar'}` de turnos no laborables, misma regla de cruce de medianoche (`end.h < start.h` ⇒ +1 día), y la misma forma de retorno `{expired, shiftStr, shiftEndTime}`. **Lo que NO está migrado** es todo lo anterior a eso: la descarga y el parseo del Excel, la búsqueda de columna por fecha y de fila por nombre — esa parte sigue siendo exclusiva de `login.js`, sin ningún archivo correspondiente en `fase_2/src/` todavía (sería candidata a `fase_2/src/services/files/xlsx-schedule-adapter.js`, ya previsto en `propuesta-modular.md` pero sin crear). Este archivo no estaba en la tabla maestra de 164 funciones de `app.js` — es un hallazgo propio de este inventario de `login.js`, documentado aquí por primera vez.
- **Nivel de Relevancia:** Crítica.
----------------------------------------------------------------------------------------------------

### Manejadores de evento anónimos (registrados en `DOMContentLoaded`, línea 137)

Ninguno de los siguientes tiene nombre propio en el código; se catalogan por su selector/evento porque concentran la lógica que un inventario de `login.js` no puede omitir.

----------------------------------------------------------------------------------------------------
- **Nombre de la función:** *(anónima)* — alternar visibilidad de contraseña, `click` en `.toggle-password` (línea 144)
- **Firma / Parámetros de entrada:** `(this: HTMLElement)` vía `addEventListener`; usa `this.previousElementSibling` como el campo de contraseña asociado.
- **Salida / Retorno:** `undefined`; alterna `type` entre `password`/`text` y las clases de ícono `bx-show`/`bx-hide`.
- **Comportamiento esperado vs. Real:** Hace exactamente lo que su nombre de evento sugiere; sin sorpresas. Se repite igual para cada ícono `.toggle-password` de la página (registro, login).
- **Nivel de Relevancia:** Secundaria.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** *(anónima)* — registro de usuario, `submit` en `#registerForm` (línea 164)
- **Firma / Parámetros de entrada:** `(e: SubmitEvent)`; lee `#regName`, `#regEmail`, `#regPassword`, `#regConfirmPassword`, `#regRole` del DOM.
- **Salida / Retorno:** `Promise<void>`; crea un usuario en Firebase Auth, escribe su perfil en `users/{uid}` con `approved: false`, dispara una notificación por correo al supervisor vía un formulario oculto a `https://formsubmit.co/maria.sanchez@virtualsoft.tech`, y redirige al panel de login tras 2 segundos.
- **Comportamiento esperado vs. Real:** Debería registrar y dejar pendiente de aprobación; realmente valida que las contraseñas coincidan y que el nombre tenga al menos dos palabras **antes** de llamar a Firebase, pero no valida la fortaleza de la contraseña en el cliente (delega en el mensaje de error de Firebase, `auth/weak-password`). El rol solicitado solo puede terminar en `'Supervisor'` o `'Gestor'` — cualquier otro valor del `<select>` cae a `'Gestor'` (línea 195, `role === 'Supervisor' ? 'Supervisor' : 'Gestor'`). La notificación por correo usa un dato sensible (dirección de un supervisor real) codificado como literal — mismo patrón que `FORM_SUBMIT_CC` en `app.js`, ya conocido y fuera de alcance de enmascaramiento según la decisión tomada para `formsubmit-notification-adapter.js`.
- **Nivel de Relevancia:** Crítica.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** *(anónima)* — inicio de sesión, `submit` en `#loginForm` (línea 276)
- **Firma / Parámetros de entrada:** `(e: SubmitEvent)`; lee `#loginEmail`, `#loginPassword`.
- **Salida / Retorno:** `Promise<void>`; autentica contra Firebase Auth, lee el perfil `users/{uid}`, aplica las reglas de aprobación/rechazo, llama a `checkShiftExpirationOnLogin()`, recupera o crea `loginTime`, escribe un registro en `login_logs`, guarda `riskOps_currentUser` en `localStorage` y redirige a `index.html`.
- **Comportamiento esperado vs. Real:** Es la función más sensible de `login.js` desde el punto de vista de seguridad/datos — concentra 5 decisiones distintas en una sola función: (1) cuenta rechazada → mensaje con el motivo (saneado con `escapeHTML`, que viene de `app.js` cargado antes de este script — dependencia implícita de orden de carga, no declarada); (2) cuenta pendiente → bloquea con mensaje genérico; (3) turno vencido → bloquea y limpia `riskOps_currentUser` (pero **no** limpia `riskOps_breakState` ni `riskOps_timeline`, a diferencia de la limpieza completa que sí hace `app.js` en su propio chequeo de "sesión de otro día", líneas 632-636); (4) recuperación de `loginTime` existente, para que un refresco de página o una caída de red no reinicie el cronómetro del turno — busca primero en `reports_{fecha}/{uid}`, luego en `active_sessions/{uid}` con validación de que sea del mismo día; (5) registro en `login_logs` envuelto en su propio `try/catch` que **no aborta el login si falla** — si Firebase rechaza la escritura del log, el usuario entra igual, pero sin `loginLogId`, lo que más adelante en `app.js` (línea 669-676) hace que el `onDisconnect()` de limpieza de `logoutTime` nunca se registre para esa sesión.
- **Nivel de Relevancia:** Crítica.
----------------------------------------------------------------------------------------------------
- **Nombre de la función:** *(anónima)* — recuperar contraseña, `submit` en `#forgotForm` (línea 405)
- **Firma / Parámetros de entrada:** `(e: SubmitEvent)`; lee `#forgotEmail`.
- **Salida / Retorno:** `Promise<void>`; llama `firebase.auth().sendPasswordResetEmail()`.
- **Comportamiento esperado vs. Real:** Decisión de seguridad explícita y correcta: salvo un error de formato de correo, **siempre** muestra el mismo mensaje de éxito genérico ("si el correo está registrado, recibirás un enlace"), exista o no la cuenta — evita que un atacante use este formulario para enumerar correos registrados. El error real de Firebase solo se registra con `console.warn`, nunca se expone al usuario.
- **Nivel de Relevancia:** Secundaria.
----------------------------------------------------------------------------------------------------

### Notas sobre callbacks y duplicación

No se encontró ninguna función duplicada ni declaración inerte en `login.js` (a diferencia del hallazgo de `cancelRejectPerm()` en `app.js`). El archivo depende de `escapeHTML()`, que no define ni importa — asume que `app.js` ya se cargó antes en la página; en `login.html` esto debe verificarse por orden de `<script>`, no por ningún mecanismo explícito.

### Conclusión del inventario

`login.js` es pequeño pero concentra dos de los riesgos más altos de todo el sistema: `checkShiftExpirationOnLogin()` (descarga y parseo de Excel en cada login, con "fallo seguro = dejar entrar") y el manejador de `#loginForm` (5 decisiones de negocio encadenadas, con un `try/catch` interno que permite continuar el login aunque falle el registro de auditoría). De la primera, la mitad ya está migrada y verificada 1:1 (`evaluateShiftExpiration()`); la otra mitad (Excel) y la totalidad del manejador de `#loginForm` siguen sin ningún código en `fase_2/src/` y sin ninguna prueba. La candidata natural para lo que falta del login es `domain/auth/auth-service.js`, ya prevista en `propuesta-modular.md`.
