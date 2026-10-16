# Criterios de finalización de la refactorización

- **Fecha:** 2026-10-15
- **Rama:** `backup/fase2-refactor-2026-10-03`
- **Responsable:** Luis Fuentes
- **Relación con otros documentos:**
  - Este documento es la **fuente de verdad** para dar por terminada la refactorización.
  - El plan de ejecución es `plan-fase-3.md`, con los ítems W-xx y las decisiones DE-xx.
  - Si el criterio de salida del plan (sección 8) contradice este documento, rige este.
- **Cómo se modifica:** solo con una entrada en el registro de cambios (sección 10), fecha y decisión del responsable. Un criterio no se relaja durante la ejecución para poder cerrar. Los **factores infranqueables** (sección 2) solo pueden endurecerse, nunca relajarse.

## 1. Cómo se usa

Cada criterio (CF-x.y) tiene cinco partes:

- **Requisito:** qué tiene que ser cierto.
- **Verificación:** cómo se comprueba. Siempre es un comando, una prueba o una revisión con evidencia, nunca una opinión.
- **Estado al 2026-10-15:** la línea base medida.
- **Ítems del plan:** dónde se hace el trabajo.
- **Compuerta:** cuándo se exige el criterio.
  - **F3:** para cerrar la Fase 3 en la rama.
  - **MAIN:** para integrar la rama en `main` y publicar.

La refactorización está terminada, y la declaración de conformidad (sección 2.4) se puede firmar, cuando se cumplen **los 8 factores infranqueables** (sección 2) y **todos** los criterios F3 y MAIN están en "cumple", cada uno con su evidencia guardada:

- salida de `fase_2/lab/auditoria-duplicados/ejecutar-auditoria.cmd`;
- resultado de la suite;
- plan de prueba manual firmado por el responsable.

## 2. Factores infranqueables de cierre

Un factor infranqueable no admite excepción, aplazamiento ni cumplimiento parcial. Si uno no se cumple, la refactorización **no se cierra y no entra a `main`**, aunque todo lo demás esté listo. Las reglas son cuatro:

- Ninguna fecha de entrega, ninguna urgencia operativa y ningún "se corrige después" justifican cerrar con un factor incumplido.
- Un factor se da por cumplido solo cuando **todos** sus criterios CF tienen evidencia (salida de la herramienta, prueba o firma del plan manual).
- Si un criterio resulta técnicamente imposible, no se marca como cumplido. Se registra el límite en la sección 6 y el responsable decide **antes** de ejecutar un criterio equivalente que cierre el mismo riesgo, con entrada en la sección 10.
- Los factores solo pueden endurecerse.

### 2.1 Ataques que se previenen, con su alcance real

El alcance de cada fila se verificó contra el código del 2026-10-15. Donde la propuesta prometía más de lo que el cambio logra, la fila lo dice y nombra el control adicional que cubre la diferencia. Ese control también es infranqueable.

| Ataque | Cómo se previene | Alcance real verificado | Factor |
|---|---|---|---|
| **XSS persistente** | `sanitizeAnnouncementHTML` corregida y probada contra cargas maliciosas (comunicados). **Además**, se escapa todo texto libre que se pinte (nombres, motivos, títulos). Como segunda barrera, CSP sin `'unsafe-inline'`. | El sanitizador **hoy no deja pasar XSS**: 0 de 34 cargas peligrosas en las dos copias. Su defecto es de corrección (contenido de `<script>` como texto y doble codificación de `&nbsp;`). El vector explotable que existe es el **nombre de usuario**, en 3 vistas de producción (sección 3). Sin escape de texto libre, corregir solo el sanitizador no cierra el riesgo. | FI-1 |
| **XSS reflejado** | Ningún dato de la URL ni de otra ventana se pinta sin escapar. | Hoy no hay fuente: la app no lee `location.search`, `location.hash`, `URLSearchParams` ni mensajes `postMessage` externos. El factor exige que siga así, o que lo que se lea se escape. | FI-1 |
| **Manipulación de la lógica de negocio y escalada de privilegios local** | Sin funciones de la app en `window` ni `onclick` en el HTML; el rol se lee del servidor; las reglas de Firebase hacen cumplir los permisos. | Quitar los globales reduce lo que un atacante o un XSS puede invocar, y es requisito de la CSP. **No impide** que alguien con la consola abierta y una sesión válida use el SDK `firebase`, que sigue siendo global, para leer o escribir lo que las reglas le permitan. Lo que impide la escalada es: rol leído del servidor (CF-4.1), sin decisiones de permisos en `localStorage`, y reglas D3/D7 (CF-4.7). Por eso esos tres criterios son parte del factor. | FI-2, FI-3 |
| **Explotación de código obsoleto** | Se borran `app.js`, `riskops.bundle.js`, el parche de junio, los respaldos `[Fase 2]` y los módulos huérfanos. Se publica solo una lista blanca de archivos. | En un sitio estático, cualquier archivo publicado se puede pedir por URL aunque ninguna página lo cargue: un bundle viejo, un archivo semilla o un respaldo siguen expuestos. Por eso el factor exige borrar el código **y** publicar solo la lista blanca (CF-5.4 y CF-6.3). | FI-5 |
| **Corrupción de datos y bypass de controles de cálculo** | Sin stubs; contratos verificados con `tsc`; validación de esquema en la entrada de datos; una sola implementación por cálculo, fijada con prueba diferencial (W-42). | Elimina errores lógicos y diferencias entre implementaciones. **No impide** que un usuario envíe datos alterados con su propia sesión, porque los cálculos corren en su navegador. Hacerlos verificables requiere el servidor (sección 6). Sobre "abuso de bonos": este repositorio no contiene lógica de detección de abuso de bonos (esa vive en otro proyecto). Los cálculos protegidos aquí son horas efectivas, tardanza, inactividad, puntajes de Tiempos y métricas de retiros. | FI-4 |
| **Fallas de autenticación y control de acceso** | El login corrige sus dos defectos; la sesión se revalida contra el servidor; al salir se borra todo. | Un usuario rechazado no recibe `signOut` (`login.js:301`, **también en producción**). `evaluateLoginAccess` de `src/` dejaría entrar a un rechazado. El rol se toma de `localStorage`. | FI-2 |
| **Componentes de terceros comprometidos o vulnerables** | Versión exacta, `integrity` (SRI) y `crossorigin` en cada script de CDN; 0 librerías con vulnerabilidades conocidas al cerrar. | Ningún script de CDN tiene `integrity`, y Chart.js se carga **sin versión**. Hay avisos públicos para dos librerías cargadas, ambos de denegación de servicio en el navegador, no de ejecución de código: `xlsx` 0.20.0 (CVE-2024-22363, ReDoS, corregido en 0.20.2) y `jspdf` 2.5.1 (CVE-2025-29907 y CVE-2025-57810, corregidos en la rama 3.0.x). Se confirman en el inventario de cierre (CF-6.7). | FI-6 |

### 2.2 Controles de referencia y evidencia

**Declaración de conformidad.** Al cerrar la refactorización, con los 8 factores infranqueables cumplidos y su evidencia archivada, el responsable firma como ingeniero especialista que la aplicación **cumple** los controles de esta tabla. La declaración (sección 2.4) se apoya en la evidencia de los criterios CF. Para que resista una revisión externa:

- Cada control declarado cumplido debe tener su evidencia en la columna "Evidencia".
- **ISO/IEC 27001:** la declaración cubre los controles del Anexo A que aplican a la aplicación (A.8.25 a A.8.33, A.8.8, A.8.9, A.5.15 y A.8.3). La **certificación** ISO/IEC 27001 la otorga un organismo acreditado sobre el sistema de gestión de la organización. Si la organización tiene o busca esa certificación, esta declaración y su evidencia son el insumo de la aplicación para ese proceso.
- **OWASP:** el Top 10 es una lista de riesgos. Si se quiere una verificación formal de la aplicación, el estándar de OWASP para eso es **ASVS** (Application Security Verification Standard), y estos criterios se pueden mapear a sus requisitos.
- **NIST:** el CSF se usa como marco de referencia y SP 800-53 como catálogo de controles.
- Las referencias que la propuesta original asignaba a otro control quedan corregidas en la columna "Nota".

| Marco | Control | Qué cubre en este proyecto | Evidencia (criterios) | Nota |
|---|---|---|---|---|
| OWASP Top 10:2021 | **A01 Control de acceso roto** | Permisos decididos con `localStorage`; login que no expulsa a un rechazado; reglas. | CF-4.1, CF-4.3, CF-4.6, CF-4.7 | No estaba en la propuesta; es el más directo para este código. |
| OWASP Top 10:2021 | **A03 Inyección (incluye XSS)** | Sanitizador de comunicados, escape de texto libre y CSP. | CF-1.1 a CF-1.5, CF-2.4 | — |
| OWASP Top 10:2021 | **A04 Diseño inseguro** | Arquitectura modular, contratos verificados, validación de esquema en la entrada de datos, límites declarados. | CF-0.1, CF-2.5, CF-3.2, CF-3.3, sección 6 | — |
| OWASP Top 10:2021 | **A05 Configuración de seguridad incorrecta** | CSP ausente; datos de laboratorio publicados; despliegue sin lista blanca. | CF-2.4, CF-5.4, CF-6.3 | La propuesta ponía el archivo semilla en A06; corresponde a A05. |
| OWASP Top 10:2021 | **A06 Componentes vulnerables y desactualizados** | Librerías de terceros con avisos conocidos y Chart.js sin versión. | CF-6.5, CF-6.7 | La propuesta ponía aquí borrar `app.js`. `app.js` es código propio: su eliminación va en A04 y A05 (superficie), no en A06. |
| OWASP Top 10:2021 | **A07 Fallas de identificación y autenticación** | Rechazado sin `signOut`; limpieza de sesión; persistencia de la sesión. | CF-4.4, CF-4.5, CF-4.6 | No estaba en la propuesta. |
| OWASP Top 10:2021 | **A08 Fallas de integridad de software y datos** | SRI y versiones fijas; candados de CI; pruebas diferenciales; `appendFormSubmitCc` idempotente. | CF-3.4, CF-6.1, CF-6.2, CF-6.5 | `appendFormSubmitCc` **no es inmutable**: según NOTA_3 modifica el `FormData` original y lo devuelve, sin duplicar `_cc`. Lo que se garantiza es la **idempotencia**. |
| NIST CSF 2.0 | **PR.PS-06** Prácticas de desarrollo seguro integradas al ciclo de vida | Compuertas automáticas, tipado y baterías de seguridad. | CF-3.2, CF-6.1, sección 8 | La propuesta citaba PR.PT-1 (CSF 1.1). Ese control trata de registros de auditoría (logs), no de arquitectura. El de mínima funcionalidad en CSF 1.1 era PR.PT-3. |
| NIST CSF 2.0 | **PR.PS-01** Gestión de configuración | CSP, despliegue con lista blanca y versiones fijas. | CF-2.4, CF-5.4, CF-6.3, CF-6.5 | Reemplaza a PR.IP-1 (CSF 1.1). |
| NIST CSF 2.0 | **PR.PS-02** Software mantenido, reemplazado o retirado según el riesgo | Retiro de `app.js` y del código muerto; actualización de librerías vulnerables. | CF-5.1 a CF-5.3, CF-6.7 | — |
| NIST CSF 2.0 | **PR.AA-05** Permisos aplicados con mínimo privilegio | Rol leído del servidor y reglas. | CF-4.1, CF-4.7 | No estaba en la propuesta. |
| NIST CSF 2.0 | **PR.DS-01 / PR.DS-10** Integridad de los datos almacenados y en uso | Validación de esquema en la entrada de datos y revalidación del caché. | CF-3.3, CF-4.3 | Con el límite de la sección 6: la integridad de los cálculos frente al propio usuario requiere el servidor. |
| NIST SP 800-53 r5 | SI-10 (validación de entradas), SI-15 (filtrado de salidas) | Validadores de entrada; escape y sanitizador. | CF-1, CF-3.3 | — |
| NIST SP 800-53 r5 | CM-7 (mínima funcionalidad), SC-18 (código móvil) | Sin globales, sin manejadores en línea, CSP. | CF-2 | — |
| NIST SP 800-53 r5 | AC-3 (aplicación del control de acceso) | Rol desde el servidor y reglas. | CF-4.1, CF-4.7 | — |
| NIST SP 800-53 r5 | SI-7 (integridad de software), RA-5 (escaneo de vulnerabilidades), SA-11 (pruebas del desarrollador) | SRI, inventario de avisos, suites y baterías. | CF-0.2, CF-6.5, CF-6.7, sección 8 | — |
| NIST SP 800-53 r5 | CM-2 (configuración base), CM-3 (control de cambios) | Lista blanca de despliegue, candados de CI, un commit por corte y squash a `main`. | CF-6.1 a CF-6.6 | — |
| ISO/IEC 27001:2022 | **A.8.25** Ciclo de vida de desarrollo seguro | Este documento, las compuertas y el proceso de cortes. | CF-6.1, CF-6.6 | — |
| ISO/IEC 27001:2022 | **A.8.26** Requisitos de seguridad de las aplicaciones | Los requisitos CF de este documento. | Todo el documento | No estaba en la propuesta. |
| ISO/IEC 27001:2022 | **A.8.27** Arquitectura y principios de ingeniería seguros | Arquitectura modular, contratos y mínima superficie. | CF-0.1, CF-2, CF-3 | — |
| ISO/IEC 27001:2022 | **A.8.28** Codificación segura | Escape, sanitizador, sin globales y sin manejadores en línea. | CF-1, CF-2 | — |
| ISO/IEC 27001:2022 | **A.8.29** Pruebas de seguridad en desarrollo y aceptación | `cmp-xss`, `cmp-sumideros`, `cmp-interpolaciones` y plan manual con casos maliciosos. | CF-1.2, CF-1.4, CF-0.2 | No estaba en la propuesta. |
| ISO/IEC 27001:2022 | **A.8.31** Separación de entornos de desarrollo, prueba y producción | Archivo semilla y laboratorio fuera de lo publicado. | CF-5.4 | La propuesta ponía esto en A.8.9; el control específico es A.8.31 (y A.8.33, información de prueba). |
| ISO/IEC 27001:2022 | **A.8.9** Gestión de la configuración | CSP, versiones fijas y lista blanca de despliegue. | CF-2.4, CF-6.3, CF-6.5 | — |
| ISO/IEC 27001:2022 | **A.8.8** Gestión de vulnerabilidades técnicas | Inventario de avisos y actualización de librerías. | CF-6.7 | No estaba en la propuesta. |
| ISO/IEC 27001:2022 | **A.8.32** Gestión de cambios | Un commit por corte en la rama, un solo commit a `main`, candados. | CF-6.1, CF-6.6 | — |
| ISO/IEC 27001:2022 | **A.5.15 / A.8.3** Control y restricción de acceso | Rol desde el servidor y reglas. | CF-4.1, CF-4.7 | No estaba en la propuesta. |

### 2.3 Los 8 factores

| Factor | Enunciado | Se cumple cuando cumplen | Controles |
|---|---|---|---|
| **FI-1** | Ningún vector de XSS: ni en comunicados, ni en texto libre, ni reflejado. Además, CSP sin `'unsafe-inline'` como segunda barrera. | CF-1.1 a CF-1.5, CF-2.4 | A03, SI-10, SI-15, A.8.28, A.8.29 |
| **FI-2** | Ningún permiso se decide en el cliente, y las reglas del servidor hacen cumplir el acceso. | CF-4.1, CF-4.3, CF-4.4, CF-4.6, CF-4.7 | A01, A07, PR.AA-05, AC-3, A.5.15 |
| **FI-3** | Superficie mínima: 0 funciones de la app en `window`, 0 manejadores en línea, 0 scripts en línea y sin puente de compatibilidad. | CF-2.1 a CF-2.5 | CM-7, SC-18, A.8.27, A.8.28 |
| **FI-4** | Contratos cerrados e integridad de cálculo: 0 stubs, `tsc` en 0, esquemas validados en la entrada de datos y una sola implementación por cálculo. | CF-3.1 a CF-3.5 | A04, A08, PR.DS-01, SI-10 |
| **FI-5** | Sin código legado ni artefactos de laboratorio publicados. | CF-5.1 a CF-5.6 | A04, A05, PR.PS-02, A.8.31 |
| **FI-6** | Componentes de terceros con versión exacta, SRI y 0 vulnerabilidades conocidas. | CF-6.5, CF-6.7 | A06, A08, SI-7, RA-5, A.8.8 |
| **FI-7** | Candados automáticos e integración atómica: nada llega a `main` sin pasar las compuertas, y entra en un solo commit. | CF-6.1 a CF-6.4, CF-6.6, CF-6.8 | PR.PS-06, CM-3, A.8.25, A.8.32 |
| **FI-8** | La seguridad no rompe la operación: flujo web completo sin regresiones. | CF-0.1 a CF-0.4 | A.8.29, SA-11 |

**Producción:** FI-1 y FI-2 incluyen defectos que ya están en producción (sección 3 y `login.js:301`). Que estos factores se cumplan en la rama no corrige producción. La refactorización es en la práctica un **proyecto nuevo** que reemplaza a la versión actual (plan, sección 9). Esos defectos se corrigen en el proyecto nuevo y, hasta su salida a producción, aplica el riesgo aceptado de §3.4.

### 2.4 Declaración de conformidad (se firma al cierre)

> Yo, Luis Fuentes, como ingeniero especialista y responsable de la refactorización de RiskOps, declaro que, a la fecha indicada, la aplicación publicada desde el commit `________` de `main`:
>
> 1. cumple los factores infranqueables FI-1 a FI-8 de este documento, con la evidencia archivada en `________`;
> 2. cumple, según mi evaluación técnica, los controles de la sección 2.2: OWASP Top 10:2021 (A01, A03 a A08), NIST CSF 2.0 (PR.PS-01, PR.PS-02, PR.PS-06, PR.AA-05, PR.DS-01, PR.DS-10), NIST SP 800-53 r5 (SI-10, SI-15, CM-7, SC-18, AC-3, SI-7, RA-5, SA-11, CM-2, CM-3) e ISO/IEC 27001:2022 Anexo A (A.5.15, A.8.3, A.8.8, A.8.9, A.8.25 a A.8.29, A.8.31, A.8.32);
> 3. mantiene los límites declarados en la sección 6, que no forman parte de esta declaración.
>
> Fecha: ________ Firma: ________

La declaración no se firma mientras algún factor tenga un criterio sin evidencia.


## 3. Análisis: XSS a través del nombre de usuario (producción)

### 3.1 Hallazgo

| Punto | Producción (`main`) | Rama del refactor | Quién ve la vista |
|---|---|---|---|
| Configuración de gestores: `u.name` sin escapar (`u.role` y `u.email` también, pero las reglas los restringen a `'Gestor'` y a un correo con caracteres seguros) | `app.js` l. 6837-6841 | Corregido por D2 (`buildGestorConfigRowHtml` escapa por defecto). Queda la opción `escapeUserFields: false`, que reproduce el defecto. | Admin |
| Bitácora de KPIs: `report.gestor` sin escapar | `app.js` l. 5992 | `app.js:3677` (`src/ui/views/kpi-indicators-view.js` no es el sumidero: escapa `horaInicio` y `horaFin` en las líneas 92-93) | Admin y Supervisor |
| Tabla de Tiempos: `m.gestor` sin escapar | `js/tiempos.js:563` | El mismo archivo, idéntico en las dos ramas | Admin y Supervisor |

**Cómo llega el dato:**

1. El nombre se escribe libre en el registro (`login.js:169`, solo `trim()`) y se guarda en `users/{uid}/name`.
2. `database.rules.json` valida el rol, `approved`, el correo y el estado, pero **no el nombre**.
3. La regla de escritura permite que cada usuario cree su propio nodo **una sola vez** (`!data.exists()`). El nombre malicioso entra en el registro y después solo un Admin puede cambiarlo.
4. Al cerrar turno, el nombre se copia a `shift_reports` como `gestor: localUser.name` (`main` l. 3914). Desde ahí lo leen KPIs y Tiempos.

**Quién puede explotarlo:**

- **Configuración de gestores:** cualquiera que se registre. Esa vista lista a todos los usuarios con rol `Gestor`, incluidos los pendientes de aprobación (`main` l. 6809), y el correo `@virtualsoft.tech` se valida por formato, no contra la cuenta.
- **KPIs y Tiempos:** hace falta un usuario aprobado que haya cerrado al menos un turno.
- **Qué puede hacer el código inyectado:** corre con la sesión del Admin o Supervisor que abre la vista. Puede hacer todo lo que esa sesión puede hacer en Firebase, por ejemplo aprobar usuarios o cambiar roles.

**Lo que no está afectado:** el resto de las vistas que muestran nombres ya escapan, por ejemplo:

- historial de login (`escapeHTML(r.name)`);
- incidentes (`escapeHTML(inc.title)` y `escapeHTML(inc.reportedBy)`);
- tablas de cronograma (`escapeHTML(gestorName)`).

Se verificó con `cmp-sumideros.mjs` sobre `app.js` de `main`, `js/tiempos.js` y `login.js`. La única otra coincidencia es `${user.role}` en la tabla de usuarios pendientes, y las reglas restringen ese valor a `'Gestor'` cuando lo escribe el propio usuario.

**Lo que no se sabe:** si ya hay nombres maliciosos guardados. Hay que revisarlo con una consulta de solo lectura (opción G).

### 3.2 Opciones

| Opción | Qué hace | Qué cierra | Riesgo para el flujo web | Cuándo y dónde |
|---|---|---|---|---|
| **A. Escapar en la salida** | `escapeHTML(...)` en los 3 puntos, con la función que ya existe en `app.js` (global, l. 10 de `main`), visible desde `js/tiempos.js` porque se carga después. | Datos existentes **y** futuros, en esas vistas. | Mínimo. Un nombre normal se ve igual. Uno con `&`, `<`, `>`, `"` o `'` se ve literal, que es lo correcto. No toca datos ni rutas. | En el proyecto nuevo (W-52), en las 3 vistas. |
| B. Construir con DOM | `textContent` y `createElement` en lugar de `innerHTML` en esas vistas. | Igual que A, sin depender de recordar escapar. | Medio: cambia más código por vista. | Fase 3 (W-52), en las vistas que se migran. |
| C. Validar en el registro | `login.js` rechaza nombres con `< > " ' \` { }` y muestra un mensaje. | Solo los registros que pasan por el formulario. Se puede evitar escribiendo directo con el SDK. | Bajo, si la lista permite tildes, ñ, ü, apóstrofo y guion. | Fase 3 (W-29). No reemplaza a A ni a D. |
| **D. Regla `.validate` en `users/$uid/name`** | Por ejemplo: texto de 2 a 80 caracteres, solo letras (con tildes), espacios, punto, apóstrofo y guion. | **Todos** los registros nuevos, venga de donde venga la escritura. | Medio: hay que comprobar en el emulador que los nombres actuales cumplen, porque si no, las escrituras de Admin sobre ese nodo fallan. | Corte de reglas D3/D7, **antes de `main`** (CF-4.7). Archivo protegido: requiere autorización. |
| E. CSP sin `'unsafe-inline'` | El navegador no ejecuta manejadores en línea (`onerror=`, `onclick=`) ni scripts en línea, aunque se inyecten. | Segunda barrera para cualquier inyección de HTML. | No aplicable hoy: la app tiene 104 manejadores en línea y dejaría de funcionar. | Fase 3, después de W-54 (CF-2.4). |
| F. Trusted Types | Chrome obliga a que todo `innerHTML` pase por una política de saneamiento. | Toda la clase de errores de inserción de HTML. | Alto: hay 134 asignaciones `innerHTML` que adaptar. Viable porque la app solo admite Chrome. | Después de la Fase 3 (sección 6). |
| **G. Revisar los datos existentes** | Exportar `users` y `shift_reports` desde la consola de Firebase (solo lectura) y buscar `<`, `>`, `"` y `on…=`. | Saber si ya se explotó, y limpiar si hace falta. | Ninguno: es solo lectura. | Ya, mientras el proyecto nuevo no esté en producción. Lo hace el responsable con su acceso de Admin. |

### 3.3 Condiciones para no romper el flujo web (aplican a cualquier opción)

1. **Escapar solo al pintar.** Nunca se escapa el dato guardado ni el que se usa para comparar.
   - `js/tiempos.js` usa `m.gestor` como clave (l. 311-393, l. 443) y compara `p.gestor === gestorName` (l. 181). Si se escapa antes, esas coincidencias fallan con nombres que tengan `&` o `'`.
   - Por lo mismo, `namesMatch`, los filtros por gestor y las claves de `shift_reports` no se tocan.
2. **Nombres normales sin cambio visual.** Prueba con "María José Peña", "Ana-María", "O'Neil" y "Pérez & Cía". Las tildes, la ñ y el apóstrofo deben verse igual que antes.
3. **Nombre malicioso como texto.** Con `<img src=x onerror=alert(1)>` se ve el texto literal y no se ejecuta nada (en la consola no aparece `alert` ni errores).
4. **Las acciones de cada fila siguen funcionando.** Usan el `uid`, no el nombre:
   - interruptor de turno partido;
   - filtro de KPIs por gestor;
   - desglose por gestor en Tiempos;
   - exportar e imprimir.
5. **Sin cambios de rutas RTDB ni de reglas al corregir las vistas.** Las reglas van en su propio corte (opción D).
6. **Cache busting.** Al publicar, `index.html` sube la versión de los scripts, para que ningún navegador siga usando la copia vieja.

### 3.4 Recomendación

| Momento | Qué | Criterio que lo exige |
|---|---|---|
| Ya | G (revisión de solo lectura de los nombres guardados) | §3.4, riesgo aceptado |
| Fase 3 | A y B en todas las vistas migradas; C en el login; quitar `escapeUserFields: false`; E cuando no queden manejadores en línea | CF-1.4, CF-2.4 y CF-4.6 |
| Antes de `main` | D, junto con D3/D7 | CF-4.7 |
| Después | F | Sección 6 |

**Riesgo aceptado (DE-21, 2026-10-15).** El XSS por nombres se corrige en el proyecto nuevo, con la Fase 3. La misma política aplica a todo defecto de la versión actual (plan, sección 9), incluido `login.js:301`. Hasta que el refactor llegue a `main`, producción sigue expuesta en las 3 vistas. Mientras tanto:

- Hacer la revisión G (exportar `users` y `shift_reports` y buscar `<`, `>`, `"` y `on…=`), y repetirla si entran registros nuevos.
- Antes de aprobar un registro nuevo, revisar que el nombre no tenga caracteres de HTML. Esto no protege la vista de configuración de gestores, que lista también a los pendientes.
- Si aparece un nombre sospechoso, no abrir esas vistas y corregir el nombre desde la consola de Firebase.

Esta decisión no relaja FI-1: la refactorización no cierra sin A en las 3 vistas.


## 4. Criterios

### CF-0. El flujo web sigue funcionando (paridad funcional)

| ID | Requisito | Verificación | Estado al 2026-10-15 | Ítems | Compuerta |
|---|---|---|---|---|---|
| CF-0.1 | `src/app/bootstrap.js` es el único punto de entrada (más el de login si DE-3 = a) y tiene menos de 500 líneas. | `esbuild` compila `bootstrap.js`; conteo de líneas; `index.html` carga solo `riskops.app.js`. | `bootstrap.js` no compila (`createFormSubmitAdapter`); `app.js` tiene 4.491 líneas y sigue siendo el que arranca. | W-01, W-04, W-05 | F3 |
| CF-0.2 | Ninguna regresión funcional. | Suite completa en verde, más el plan manual completo firmado. El plan cubre: login, registro y aprobación; inicio y fin de turno; desayuno, almuerzo y Pausa de Turno; tareas y SET; permisos; monitoreo; KPIs; Tiempos; comunicados; incidentes; historial de login; configuración de gestores; exportar e imprimir. **Obligatorio**: con la actualización de jsPDF de la versión 2 a la 3 (CF-6.7), exportar e imprimir se prueban en todas las vistas que generan PDF. | La suite del laboratorio está en verde contra `app.js`; falta rehacerla contra `riskops.app.js`. | W-30, W-31 | F3 |
| CF-0.3 | Rutas RTDB sin cambios. Datos y sesiones abiertas en producción siguen funcionando: los nombres de las claves de `localStorage` no cambian. | Diff de rutas usadas antes y después; prueba con una sesión creada por la versión anterior. | — | W-48 | F3 |
| CF-0.4 | La rama tiene todo lo que la versión en producción (`main`) tiene y la rama no: IDs estables de tareas (hash de Set + Tarea), purga de tareas huérfanas en Firebase y la lista de manuales de `main` (18 entradas, con Belatra, Egt y Evolution corregidos, Playson agregado y sin los 2 enlaces rotos de `doc-links.js`). | Inventario de diferencias funcionales entre `main` y la rama: 0 faltantes. Pruebas de IDs estables y de purga. `cmp-capas.mjs`: 0 enlaces distintos. | Faltan los tres. | W-12, W-26 | F3 |

### CF-1. Blindaje contra inyecciones y saneamiento estricto

| ID | Requisito | Verificación | Estado al 2026-10-15 | Ítems | Compuerta |
|---|---|---|---|---|---|
| CF-1.1 | `sanitizeAnnouncementHTML` (la única copia, en `src/`) se comporta igual que la de `app.js`. Descarta el contenido de `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, `<template>` y `<noscript>`, y no codifica dos veces `&nbsp;`, `&lt;` ni `&amp;`. | Prueba diferencial de `comparar.mjs`: 0 diferencias en 40 casos. | 8 de 40 casos difieren. Ejemplos: `<script>alert(1)</script>ok` da `alert(1)ok`; `<p>a &nbsp; b</p>` da `&amp;nbsp;`. | W-11 | F3 |
| CF-1.2 | Ninguna carga maliciosa produce código ejecutable al insertarse en el DOM. | `cmp-xss.mjs`: 0 de 34 cargas peligrosas. Las cargas cubren `<script>`, `onerror`, `javascript:` (mayúsculas, tabuladores, entidades), `data:`, `vbscript:`, SVG/MathML, mXSS, `<base>`, `<meta refresh>`, `<form action>` y `style` con `url(javascript:)`. La batería solo crece: no se quitan casos. | 0 peligrosas en las dos copias. **El sanitizador hoy no deja pasar XSS**: la diferencia de CF-1.1 es de corrección, no de ejecución. | W-11, W-52 | F3 |
| CF-1.3 | Lista blanca estricta: solo `p`, `br`, `strong`, `em`, `ul`, `ol`, `li` y `a`. El único atributo permitido es `href`, y solo con `http`, `https` o `mailto`. Ningún `style` ni `on*`. | Pruebas del módulo con atributos `style`, `on*` y esquemas no permitidos. | Cumple en las dos copias (verificado con `<p style>` y `<a style>`). | W-11 | F3 |
| CF-1.4 | Todo dato que viene de Firebase, del Excel o del usuario se escapa al insertarse como HTML, en cualquier capa. | `cmp-sumideros.mjs`: 0 en el código publicado. `cmp-interpolaciones.mjs`: 0 interpolaciones sin revisar. Prueba en navegador con un nombre malicioso (sección 3.3). | **Producción: 3 puntos explotables** (sección 3). Rama: 2 puntos (`app.js:3677` y `js/tiempos.js:563`), más `horaInicio` y `horaFin` en `kpi-indicators-view.js` (líneas 92-93, corregido en el paso 3.1: `kpi-indicators-view.js:76` no es un sumidero). Paso 3.1: 107 interpolaciones revisadas (89 expresiones), 0 sin revisar. | W-52 | F3 |
| CF-1.5 | `target="_blank"` siempre lleva `rel="noopener noreferrer"`. | Búsqueda en plantillas y en el HTML. | Sin medir. | W-52 | F3 |

### CF-2. Cero exposición en el ámbito global

| ID | Requisito | Verificación | Estado al 2026-10-15 | Ítems | Compuerta |
|---|---|---|---|---|---|
| CF-2.1 | Ninguna función propia de la app (negocio, autenticación, riesgo) queda en `window`. | En el laboratorio, comparar las propiedades de `window` antes y después de cargar la app. Solo se permiten las librerías de terceros: `firebase`, `XLSX`, `Chart`, `ChartDataLabels`, `jspdf` y `html2pdf`. | `app.js` es un script clásico: sus 172 funciones de nivel superior son globales, y además hace 32 asignaciones `window.x =`. El bundle publica `window.RiskOps` con todos los módulos. | W-03, W-04, W-54 | F3 |
| CF-2.2 | 0 atributos `on*` en `index.html` y `login.html`, y 0 manejadores en línea generados en plantillas JS. | Inventario automático (`cmp-capas.mjs`, sección 7). | 70 en el HTML y 34 en plantillas (4 en `app.js` y 30 en `src/`). | W-54 (DE-5 = a) | F3 |
| CF-2.3 | Todos los eventos se registran con `addEventListener` o con delegación (`data-action`) desde los módulos. Los manejadores llevan tipos JSDoc que verifica `tsc`. Un elemento tiene **una** sola vía de manejo. | `tsc --checkJs` (CF-3.2); inventario de elementos con manejador doble en 0. | `closeMonitoreoModalBtn` ejecuta dos manejadores; en `endShiftBtn` el JS reemplaza al HTML según el rol. | W-50, W-54 | F3 |
| CF-2.4 | 0 scripts en línea. CSP con `script-src` sin `'unsafe-inline'`, `object-src 'none'` y `base-uri 'self'`. | Revisión del `<meta>` CSP; 0 violaciones de CSP en la consola durante el plan manual completo. | No hay CSP. 2 scripts en línea (detector de navegador en `index.html:41` y `login.html:33`). | W-54 | F3 |
| CF-2.5 | `legacy-bridge.js` no existe al cerrar. Mientras exista: nombres fijos, propiedades no reescribibles, objeto congelado y sin acceso a repositorios ni a Firebase. | El archivo no está en el build final. | No existe todavía. | W-03 | F3 |

**Límite declarado:** el SDK de Firebase 8 se carga por CDN y queda como global `firebase`. Con él, quien tenga la consola abierta y una sesión válida puede leer y escribir **lo que las reglas le permitan**, con o sin funciones de la app en `window`. CF-2 reduce lo que un ataque puede aprovechar y permite la CSP. El control de acceso real son las reglas (CF-4.7).

### CF-3. Integridad de datos y cierre de contratos

| ID | Requisito | Verificación | Estado al 2026-10-15 | Ítems | Compuerta |
|---|---|---|---|---|---|
| CF-3.1 | 0 stubs, retornos simulados o dependencias vacías en el código publicado. | Búsqueda de `TRANSITIONAL`, `stub` y funciones vacías inyectadas en `bootstrap.js`; marcas `[LAB-INTEGRACION]` y `[Laboratorio Local]` en 0. | 3 stubs en `bootstrap.js` (`pushTimelineEvent`, `onStatusDisplay` y `syncSession`); 120 marcas en `app.js`; 2 en `src/` (`kpi-operativos-source.js`). | W-01, W-19, W-49, W-53 | F3 |
| CF-3.2 | Los contratos entre módulos se verifican con tipos. | `tsc --checkJs --noEmit` con `tsconfig.checkjs.json`: 0 errores (modo no estricto). | 159 errores. Incluye la rotura de `bootstrap.js` (`createFormSubmitAdapter` no existe y hay dependencias sin declarar). | W-53 | F3 |
| CF-3.3 | Los datos que entran desde Firebase (`users/{uid}`, estado de pausa, `shift_reports`, `permissions`) pasan por un validador de esquema **antes** del dominio. Lo que está fuera de catálogo se rechaza o se normaliza. | Pruebas con datos inválidos: rol desconocido, `approved` no booleano, horas negativas, campos faltantes. | No existen validadores de frontera. | W-53 | F3 |
| CF-3.4 | Una sola implementación, con prueba diferencial, para cada cálculo crítico: horas efectivas, tardanza, inactividad, puntajes y umbrales de Tiempos, y métricas de retiros. | Inventario de implementaciones en 1 por cálculo; prueba diferencial que fija el resultado. | Tardanza: 7 implementaciones. Inactividad: 5 sumadores. Horas efectivas: rige la regla formal de DE-13 (abajo), que confirma D1; la fórmula del correo de `main` se descarta. Los umbrales de Tiempos (`Score_Tardanza` y `Score_Inactividad`) están escritos dos veces en `js/tiempos.js` (l. 245-251 y 502 en adelante) y no existen en `src/`. | W-42, W-57, W-28 | F3 |
| CF-3.5 | Ninguna diferencia entre implementaciones se acepta sin registro. | Cada caso está en DE-15, con la decisión y la evidencia. | — | DE-15 | F3 |

### Regla de negocio de horas efectivas (DE-13, 2026-10-15)

Es la única regla de cálculo de tiempo efectivo. La fórmula del correo de cierre de `main` (que restaba la penalidad y contaba dos veces el exceso de pausas) **se descarta por completo**, y la diferencia que había en `main` entre el correo y el panel queda unificada en una sola función del dominio: `computeEffectiveMinutes` en `src/domain/shifts/effective-time.js`, que hoy ya implementa esta estructura (D1).

```
[Datos de turno y actividad]
        │
        ├── Penalidad de conectividad (>= 1 min) ──► Solo lectura: se muestra en el panel
        │
        ├── Inactividad (tras el umbral de 3 min) ─► Descuenta de horas efectivas (KPI) + alerta a supervisión
        │
        └── Exceso de almuerzo o desayuno (1 vez) ─► Descuenta de horas efectivas (KPI)
```

| Concepto | Papel | Efecto en horas efectivas (KPI) |
|---|---|---|
| **Penalidad de conectividad** (≥ 1 min) | Se ve en el panel de reportes, para contexto y trazabilidad de la supervisión. | **No resta.** No aplica penalización operativa ni financiera sobre la jornada. Es informativa. |
| **Inactividad** (cuenta después del umbral de 3 min) | Umbral crítico del tiempo no productivo. | **Sí resta** el tiempo registrado después del umbral, y activa las alertas y acciones en las vistas de supervisión. |
| **Exceso de pausas** (almuerzo o desayuno) | — | **Resta una sola vez.** Se elimina el doble cómputo del correo de `main`. |
| Pausa de Turno | No es tiempo trabajado (RN-4). | Resta su duración; no genera penalidad. |

**Criterios de aceptación de QA** (pruebas unitarias y diferenciales, CF-3.4):

1. Una penalidad de 1 a 4 minutos aparece en el panel, pero el total de horas efectivas **no cambia por ella**. Si la penalidad viene de un exceso de pausa, ese exceso ya resta una vez como parte de la pausa; la penalidad no agrega una segunda resta.
2. Una inactividad registrada (el tiempo posterior al umbral, en un evento de 30 segundos o más) reduce las horas efectivas exactamente en esa duración y activa la bandera de la vista de supervisión. Un evento de menos de 30 segundos no resta.
3. Un exceso de almuerzo o desayuno reduce las horas efectivas una sola vez.
4. El correo de cierre, el panel de reportes y la tarjeta "Duración Promedio" dan el mismo número para el mismo turno.

**Medición de la inactividad (DE-13b, confirmada el 2026-10-15).** Se mantiene la definición actual del código:

- El detector nativo del navegador marca inactividad a los **3 minutos** (`NATIVE_IDLE_THRESHOLD_MS`). Si el navegador no lo permite, el respaldo por eventos de la página la marca a los **5 minutos** (`DOM_IDLE_FALLBACK_THRESHOLD_MS`).
- La inactividad **cuenta después del umbral**: el evento empieza cuando el detector la marca, y lo que se descuenta es el tiempo posterior.
- La bitácora descarta los eventos de menos de **30 segundos** (`MIN_INACTIVITY_EVENT_MS`).

Estos tres valores quedan fijos en `src/utils/constants.js` como única fuente (W-41 retira las copias de `idle-detector-adapter.js`). Cambiarlos es una decisión de negocio, con entrada en la sección 10.

**Sobre "umbrales de bonos":** en este repositorio no hay lógica de bonos; la única mención es el nombre de un manual de procedimiento. Los umbrales de penalidad que sí existen son los puntajes de Tiempos, y están en CF-3.4.

**Límite declarado:** estos cálculos corren en el navegador del propio gestor y se guardan con su sesión. CF-3.4 elimina las discrepancias, pero no impide que alguien altere sus datos desde la consola. Para que un resultado sea verificable en una auditoría de cumplimiento, tiene que calcularse o validarse en el servidor (sección 6).

### CF-4. Hardening de sesiones y almacenamiento local

| ID | Requisito | Verificación | Estado al 2026-10-15 | Ítems | Compuerta |
|---|---|---|---|---|---|
| CF-4.1 | Ningún permiso se decide con datos de `localStorage`. El rol y la aprobación se leen de `users/{uid}` y se escuchan durante la sesión. | Prueba: cambiar `riskOps_currentUser.role` a `Admin` en el navegador no muestra vistas de Admin. Prueba: un usuario rechazado o inactivado durante la sesión es expulsado. | El rol sale de `riskOps_currentUser` (DE-1 = b lo cambia). | W-02, W-55 | F3 |
| CF-4.2 | `localStorage` solo guarda datos de presentación y estado de la UI, nunca tokens ni credenciales. | Inventario de claves y contenido (`cmp-capas.mjs`, sección 5). | 7 claves, ninguna con token. El token de Firebase lo guarda el SDK en IndexedDB, no la app. | W-48 | F3 |
| CF-4.3 | Integridad del caché: al iniciar y ante cada cambio, el perfil guardado se valida contra el servidor, y si difiere prevalece el servidor. | Prueba con un caché manipulado. | — | W-55 | F3 |
| CF-4.4 | Cualquier cierre de sesión borra todas las claves de sesión (todas menos `riskOps_theme`). | Prueba de los 3 caminos de salida. | `handleEndShift` borra 4; `riskOps_usersData` nunca se borra; la salida de Admin y Supervisor (`app.js:2011`) borra solo `riskOps_currentUser`. | W-55 | F3 |
| CF-4.5 | La persistencia de Firebase Auth es `SESSION` (DE-20, 2026-10-15). | Configuración revisada; prueba de que la sesión sobrevive a una recarga en medio de una pausa y de un turno, y termina al cerrar el navegador. | `LOCAL`, el valor por defecto. | DE-20 | F3 |
| CF-4.6 | El login no tiene fallas de control de acceso. | Pruebas de cuenta rechazada, pendiente e inactiva. | `login.js:301` llama a `escapeHTML`, que no existe en `login.html`, así que un rechazado no recibe `signOut` (**también en producción**). `evaluateLoginAccess` de `src/` dejaría entrar a un rechazado. | W-29 | F3 |
| CF-4.7 | Las reglas de Firebase son el control de acceso: D3/D7 y validación de `name` y de otros textos libres. | Pruebas en el emulador con un Admin en la semilla. | Pendiente (DE-8). | Corte D3/D7 | MAIN |

**Opciones evaluadas para "proteger `localStorage`" y por qué se eligieron estas:**

| Opción | Resultado |
|---|---|
| Cookies `HttpOnly`, `Secure` y `SameSite` | **No es posible:** el sitio es estático (GitHub Pages) y no hay servidor que emita la cookie. Requiere backend (sección 6). |
| Firmar o cifrar el contenido en el cliente | **Descartada:** la clave estaría en el mismo navegador que el atacante, así que no aporta integridad. |
| Guardar todo solo en memoria | No protege el token de Firebase, que el SDK guarda aparte, y obliga a entrar de nuevo en cada recarga. Equivale a DE-20 (c). |
| No confiar en el caché + revalidar contra el servidor + borrar al salir + reglas | **Elegida** (CF-4.1 a CF-4.4 y CF-4.7). Es lo que impide que una manipulación tenga efecto. |

### CF-5. Erradicación absoluta de código legado

| ID | Requisito | Verificación | Estado al 2026-10-15 | Ítems | Compuerta |
|---|---|---|---|---|---|
| CF-5.1 | `app.js` y `riskops.bundle.js` borrados del repositorio. `entry.js` queda solo para pruebas o se borra (DE-2). | El archivo no existe; 0 referencias en HTML, workflows y scripts. | Los dos existen y están en uso. | W-04 a W-06 | F3 (el borrado requiere tu autorización en el momento) |
| CF-5.2 | No hay parches tácticos ni marcas de transición. | Búsqueda de `inactivity_cleared_june17_v1`, `PATCH CLEAR`, `[LAB-INTEGRACION]` y respaldos `[Fase 2]`: 0. | El parche está en `app.js:737-747`; hay 120 marcas y 5 respaldos. | DE-12, W-10 | F3 |
| CF-5.3 | No hay código sin uso en `src/`. | 0 módulos huérfanos, 0 validadores sin uso y 0 funciones muertas. | 7 módulos huérfanos; 4 validadores sin uso. | W-10, W-47 | F3 |
| CF-5.4 | Los datos y archivos de laboratorio no se publican. `kpi_operativos_seed.json` pasa a `fase_2/lab/` y el código de producción no tiene rama de laboratorio para cargarlo; sin datos, el panel muestra el estado vacío (norma N-4 de la Fase 2). `_reorg/` y cualquier otra carpeta de trabajo temporal de la raíz, `fase_2/lab/` y `src/tests/` quedan fuera del artefacto publicado. | Lista de archivos del artefacto de despliegue, revisada uno por uno contra una lista blanca. | El archivo semilla está en la raíz (4,3 KB) y lo carga código de producción cuando `isLocal`. No se ha revisado qué publica el workflow (W-06). | DE-18, W-49, W-06 | MAIN |
| CF-5.5 | Las copias congeladas de código viejo usadas como oráculo de pruebas (`approvals-original.mjs` y `kpi-legacy-app.mjs`) se permiten solo en `src/tests/`, marcadas como congeladas. Ningún código publicado las importa. | Búsqueda de imports desde fuera de `src/tests/`: 0. | Sin marcar. | DE-19 | F3 |
| CF-5.6 | **Cero duplicados.** La auditoría completa da 0 en todas sus comparaciones: funciones entre el código viejo y `src/`, constantes, duplicados dentro de `src/` y duplicados fuera de funciones (enlaces, plantillas, claves de almacenamiento, manejadores dobles, catálogos escritos a mano en los módulos que la Fase 3 toca). | Salida de `ejecutar-auditoria.cmd`, archivada como evidencia. | 56 funciones de `app.js` con lógica propia (41 equivalentes, 6 con resultado distinto, 6 del detector de inactividad y 3 sin par) y 5 bloques `[Fase 2]`; 10 constantes; 9 duplicados dentro de `src/` más `parseTime`; capas: 8 plantillas idénticas, 5 casi idénticas, 2 manejadores dobles y 4 módulos con claves escritas a mano. | W-07 a W-14, W-33, W-40 a W-46, W-51 | F3 |

### CF-6. Trazabilidad, CI/CD y candados de QA

| ID | Requisito | Verificación | Estado al 2026-10-15 | Ítems | Compuerta |
|---|---|---|---|---|---|
| CF-6.1 | Cada PR hacia `main` corre automáticamente las verificaciones, y el PR no se puede integrar si alguna falla. Las verificaciones son: build de `bootstrap.js`, suite, `ejecutar-auditoria` (`cmp-xss`, `cmp-sumideros`, `cmp-interpolaciones`, `tsc`, inventario de `window` y `on*`) y revisión de SRI. | Un PR de prueba con una violación falla. | No existe. | W-32, W-58 | MAIN (requiere autorización: DE-9) |
| CF-6.2 | Los candados de `.github/qa-infra` están rediseñados contra `riskops.app.js`, incluido el candado de hash de `verify_frontend_contract.js`. | Los candados pasan con el artefacto nuevo y fallan con uno alterado. | Están atados al hash de `app.js`. | W-32 | MAIN (DE-9) |
| CF-6.3 | `deploy-pages.yml` publica solo la lista blanca de archivos de producción (CF-5.4). | Revisión del artefacto publicado. | Sin revisar. | W-06 | MAIN (DE-10) |
| CF-6.4 | `main` está protegida: integración solo por PR, con las verificaciones de CF-6.1 obligatorias. | Configuración de la rama en GitHub. La configura el responsable. | Sin verificar. | Responsable (configuración de GitHub) | MAIN |
| CF-6.5 | Todos los scripts de CDN tienen versión exacta, `integrity` y `crossorigin`. | Revisión automática de `index.html` y `login.html`. | 0 de 8 tienen `integrity`; Chart.js se carga sin versión. | W-56 | F3 |
| CF-6.6 | **Integración atómica.** En la rama hay un commit por corte, para poder revertir (DE-14). A `main` entra un **solo commit** con el refactor completo, por PR con squash merge. Producción no recibe cortes parciales. Los defectos de la versión actual se corrigen en el proyecto nuevo (plan, sección 9). | Historial de `main`: un commit del refactor. | — | DE-14 | MAIN (commit, push y merge los hace el responsable) |
| CF-6.7 | 0 librerías de terceros con vulnerabilidades conocidas al momento del cierre. | Inventario de cada script de CDN (nombre y versión) contrastado con la base de avisos de GitHub y OSV en la fecha de cierre. Si una actualización cambia de versión mayor (jsPDF 2 a 3), se exige el plan manual de exportar e imprimir (CF-0.2). | `xlsx` 0.20.0 (CVE-2024-22363) y `jspdf` 2.5.1 (CVE-2025-29907 y CVE-2025-57810), sin confirmar en inventario. Falta verificar qué jsPDF trae el bundle de `html2pdf.js` 0.10.1. Firebase 8.10.1 sin avisos conocidos, pero es una versión mayor antigua (sección 6). | W-56 | F3 |
| CF-6.8 | **La documentación no contradice el estado final.** `hoja-de-ruta.md`, `ARCHITECTURE.md`, `propuesta-modular.md`, `plan-maestro-ejecucion.md` y el `README.md` de pruebas reflejan la arquitectura final, las decisiones DE y las normas de la Fase 2. La estructura objetivo que no existe se crea o se retira formalmente (DE-6), y las excepciones de capas quedan documentadas (DE-7). | Revisión documento por documento contra este documento, con lista de verificación firmada por el responsable. | W-37 cerrado. W-34, W-35, W-36, W-38 y W-39 pendientes. | W-34 a W-39 | F3 |


### Trazabilidad: cada ítem del plan y el criterio que verifica

Todo ítem W de `plan-fase-3.md` cierra al menos un criterio, y todo criterio tiene al menos un ítem, una decisión o un responsable (columna "Ítems del plan" de cada tabla). Un ítem que no aparezca aquí no forma parte del cierre.

| Ítem | Criterios |
|---|---|
| W-01 | CF-0.1, CF-3.1 |
| W-02 | CF-4.1 |
| W-03 | CF-2.1, CF-2.5 |
| W-04 | CF-0.1, CF-2.1, CF-5.1 |
| W-05 | CF-0.1, CF-5.1 |
| W-06 | CF-5.1, CF-5.4, CF-6.3 |
| W-07 | CF-5.6 |
| W-08 | CF-5.6 |
| W-09 | CF-5.6, CF-2.3 |
| W-10 | CF-5.2, CF-5.3, CF-5.6 |
| W-11 | CF-1.1, CF-1.2, CF-1.3, CF-5.6 |
| W-12 | CF-0.4, CF-5.6 |
| W-13 | CF-5.6 |
| W-14 | CF-5.6 |
| W-15 | CF-5.1 |
| W-16 | CF-5.1, CF-1.4 |
| W-17 | CF-5.1, CF-4.4 |
| W-18 | CF-5.1 |
| W-19 | CF-5.1, CF-3.1 |
| W-20 | CF-5.1 |
| W-21 | CF-5.1 |
| W-22 | CF-5.1, CF-2.3 |
| W-23 | CF-5.1, CF-2.3 |
| W-24 | CF-5.1, CF-3.4 |
| W-25 | CF-5.3 |
| W-26 | CF-0.4 |
| W-27 | — (retirado) |
| W-28 | CF-1.4, CF-2.1, CF-3.4 |
| W-29 | CF-4.6 |
| W-30 | CF-0.2 |
| W-31 | CF-0.2 |
| W-32 | CF-6.1, CF-6.2 |
| W-33 | CF-5.6 |
| W-34 | CF-6.8 |
| W-35 | CF-6.8 |
| W-36 | CF-6.8 |
| W-37 | CF-6.8 (cerrado) |
| W-38 | CF-6.8 |
| W-39 | CF-6.8 |
| W-40 | CF-5.6 |
| W-41 | CF-5.6 |
| W-42 | CF-3.4 |
| W-43 | CF-5.6 |
| W-44 | CF-0.4, CF-5.6 |
| W-45 | CF-1.4, CF-5.6 |
| W-46 | CF-5.6 |
| W-47 | CF-3.3, CF-5.3 |
| W-48 | CF-0.3, CF-4.2 |
| W-49 | CF-3.1, CF-5.2, CF-5.4, CF-5.5 |
| W-50 | CF-2.3 |
| W-51 | CF-5.6 |
| W-52 | CF-1.1 a CF-1.5 |
| W-53 | CF-3.1, CF-3.2, CF-3.3 |
| W-54 | CF-2.1 a CF-2.4 |
| W-55 | CF-4.1, CF-4.3, CF-4.4, CF-4.5 |
| W-56 | CF-6.5, CF-6.7 |
| W-57 | CF-3.4 |
| W-58 | CF-6.1 |

## 5. Matriz de cumplimiento (línea base del 2026-10-15)

| Criterio | Factor | Cumple hoy | Bloqueado por |
|---|---|---|---|
| CF-0 Flujo web | FI-8 | No (bootstrap no compila; faltan los cambios de `main`) | W-01, W-12, W-26 |
| CF-1 Saneamiento | FI-1 | Parcial: CF-1.2 y CF-1.3 cumplen; **CF-1.4 tiene un defecto explotable en producción** | W-11, W-52 |
| CF-2 Global | FI-3 (y FI-1 por CF-2.4) | No | W-54 (DE-5 = a) |
| CF-3 Contratos | FI-4 | No | W-53, W-42, DE-13 |
| CF-4 Sesiones | FI-2 | No; CF-4.6 tiene un defecto en producción | W-55, W-29, DE-20, DE-8 |
| CF-5 Legado | FI-5 | No | W-07 a W-25, W-40 a W-46, DE-18 |
| CF-6 CI/CD y documentación | FI-6, FI-7 | No; CF-6.7 con 2 librerías con avisos públicos | W-32, W-34 a W-39, W-56 (DE-9 y DE-10 aprobadas) |

## 6. Lo que estos criterios no garantizan (y dónde se resolvería)

| Tema | Por qué no se cubre aquí | Dónde |
|---|---|---|
| Sesión en cookie `HttpOnly` | Requiere un servidor propio. | Fase 5, si se agrega backend. |
| Cálculos verificables (horas, tardanza, puntajes) | Corren en el navegador del usuario. Hace falta calcularlos o validarlos en el servidor (reglas o Cloud Functions). | Corte D3/D7 o Fase 5. |
| Trusted Types en todo `innerHTML` | Requiere adaptar 134 asignaciones. | Después de la Fase 3. |
| Actualizar el SDK de Firebase 8.10.1 | Cambia todas las llamadas a Firebase. | Backlog de seguridad. |
| Estilos en línea pasados a clases (permitiría quitar `'unsafe-inline'` de `style-src`) | Es diseño (regla de la hoja de ruta). | Corte de UI. |

## 7. Autorizaciones necesarias

| Acción | Archivos | Decisión | Estado (2026-10-15) |
|---|---|---|---|
| Candados de QA y workflow | `.github/qa-infra/*` y `.github/workflows/deploy-pages.yml` | DE-9 y DE-10 | Aprobado como parte del plan (FI-7). Cada edición se autoriza en el momento de hacerla. |
| Reglas | `database.rules.json` | DE-8 (corte D3/D7) | (a) confirmado: corte aparte, obligatorio antes de `main` (FI-2). |
| Borrar `app.js` y `riskops.bundle.js`, y mover `kpi_operativos_seed.json` a `fase_2/lab/` | Raíz del repositorio | En el momento de ejecutar CF-5.1 y CF-5.4 | Exigido por FI-5; se autoriza en el momento. |
| Commit, push y merge | — | Siempre el responsable | — |

## 8. Herramientas de verificación

Todas están en `fase_2/lab/auditoria-duplicados/` y corren con `ejecutar-auditoria.cmd`. Solo leen archivos y no forman parte de la app.

| Herramienta | Criterios |
|---|---|
| `comparar.mjs` (prueba diferencial) | CF-1.1, CF-3.4 |
| `cmp-xss.mjs` | CF-1.2 |
| `cmp-sumideros.mjs` | CF-1.4 |
| `cmp-interpolaciones.mjs` | CF-1.4 |
| `cmp-capas.mjs` | CF-0.4, CF-2.2, CF-2.3, CF-4.2, CF-5.2, CF-5.6 |
| `tsc -p tsconfig.checkjs.json` | CF-2.3, CF-3.2 |
| `inventario.mjs`, `cmp-constantes.mjs`, `cmp-intra-src.mjs` | CF-3.4, CF-5.3, CF-5.6 |

Faltan tres herramientas, que se agregan en W-58: el inventario de propiedades de `window` en el navegador (CF-2.1), la revisión de SRI (CF-6.5) y el inventario de librerías contra avisos de vulnerabilidad (CF-6.7).

## 9. Referencias externas consultadas

Fuentes web usadas para los avisos de vulnerabilidad (CF-6.7) y los controles NIST (sección 2.2). Son páginas públicas, no archivos del repositorio. Se vuelven a consultar en la fecha de cierre, porque los avisos cambian.

| Tema | Fuente |
|---|---|
| `xlsx` 0.20.0, CVE-2024-22363 | [NVD – CVE-2024-22363](https://nvd.nist.gov/vuln/detail/CVE-2024-22363) |
| `xlsx` 0.20.0, CVE-2024-22363 | [GitLab Advisory – xlsx CVE-2024-22363](https://advisories.gitlab.com/npm/xlsx/CVE-2024-22363/) |
| `jspdf` 2.5.1, CVE-2025-29907 | [GitLab Advisory – jsPDF CVE-2025-29907](https://advisories.gitlab.com/npm/jspdf/CVE-2025-29907/) |
| `jspdf` 2.5.1, CVE-2025-57810 | [GitLab Advisory – jsPDF CVE-2025-57810](https://advisories.gitlab.com/npm/jspdf/CVE-2025-57810/) |
| NIST CSF 2.0, PR.PS-01 | [csf.tools – PR.PS-01](https://csf.tools/reference/nist-cybersecurity-framework/v2-0/pr/pr-ps/pr-ps-01/) |
| NIST CSF 2.0, PR.PS-06 | [cyberday.ai – PR.PS-06](https://www.cyberday.ai/requirement/nist-20-pr-ps-06-secure-software-development-practices) |

## 10. Registro de cambios

| Fecha | Cambio | Decisión de |
|---|---|---|
| 2026-10-15 | Decisiones DE-6, DE-7, DE-10, DE-11, DE-16, DE-17 y DE-19 confirmadas por el responsable: la sección 7 del plan queda cerrada. | Luis Fuentes |
| 2026-10-15 | Alineación con el plan: CF-0.4 (lo que `main` tiene y la rama no), CF-5.6 (cero duplicados) y CF-6.8 (documentación); tabla de trazabilidad W → CF. El criterio de salida del plan remite a este documento. | Luis Fuentes |
| 2026-10-15 | DE-13b confirmada: la inactividad cuenta después del umbral de 3 minutos (5 en el respaldo) y la bitácora descarta eventos de menos de 30 segundos. Se quitan las referencias a correcciones separadas de la versión actual. Las reglas de usuarios, roles y datos de prueba pasan a la documentación de la Fase 2 (plan maestro §4 quater). | Luis Fuentes |
| 2026-10-15 | DE-13 con la regla formal de horas efectivas (confirma D1; se descarta la fórmula del correo de `main`) La refactorización es un proyecto nuevo: los defectos de la versión actual se corrigen en él. | Luis Fuentes |
| 2026-10-15 | Sección 2.2 y 2.4: declaración de conformidad del responsable como ingeniero especialista, con su evidencia. Sección 9: referencias externas. | Luis Fuentes |
| 2026-10-15 | Decisiones: DE-13 (reemplazada por la regla formal de la fila anterior), DE-20 (`SESSION`) y DE-21 (corrección en el proyecto nuevo; riesgo aceptado en §3.4). DE-8, DE-9 y DE-10 confirmadas. | Luis Fuentes |
| 2026-10-15 | Sección 2: factores infranqueables FI-1 a FI-8, ataques que se previenen con su alcance real y controles OWASP, NIST e ISO/IEC 27001 (con las referencias corregidas). CF-6.7 nuevo (librerías con vulnerabilidades conocidas). | Luis Fuentes |
| 2026-10-15 | Creación del documento. Línea base medida en la rama `backup/fase2-refactor-2026-10-03` y en `main` (`6ddef16`). | Luis Fuentes |
