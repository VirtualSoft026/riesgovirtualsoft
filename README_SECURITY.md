# Risk Manager — remediación de seguridad de Fase 1

Estado: candidato de release en preparación; producción no modificada.

## Repositorios y ramas

- `VirtualSoft026/riesgovirtualsoft/main`: fuente productiva y base del release.
- `phase1-security-release`: candidato limpio construido desde el `main` productivo vigente.
- rama local `staging-qa`: fuente acumulada de correcciones; no se fusiona completa.
- `daniel-puentes109/riskmanager-security-staging`: laboratorio y evidencia QA; no es el `main` productivo.

La web publicada desde staging apunta al Firebase real. No debe utilizarse para crear permisos, sesiones, aprobaciones o cierres exploratorios. Las pruebas automáticas mutantes se ejecutan únicamente con Firebase Emulator y datos sintéticos.

## Función de staging en el plan

Staging sirve para conservar las herramientas y la evidencia de QA, ensayar el proceso de migración y comprobar el mismo candidato que se propondrá a producción. No es una segunda fuente del producto ni una rama que se fusione completa sobre `main`.

El recorrido de una entrega es:

1. partir del SHA vigente de `VirtualSoft026/riesgovirtualsoft/main`;
2. portar únicamente las correcciones aprobadas a `phase1-security-release`;
3. ejecutar comprobaciones locales y con Firebase Emulator, sin datos reales;
4. presentar al Lead el diff, los resultados y el rollback;
5. crear el commit y el PR únicamente después de la autorización del Lead;
6. tras aprobar el PR, aplicar migración y Rules en una ventana controlada y validar las mecánicas críticas.

Publicar esta rama por sí sola no modifica `main`, no cambia Firebase y no despliega GitHub Pages. El workflow productivo sólo despliega en un `push` a `main` o mediante una ejecución manual autorizada; durante un PR se limita a construir y validar el artefacto.

## Qué significa cada fase

- **Fase 1 — cierre actual:** secretos fuera del código, Rules con UID/rol/aprobación, mitigación XSS, cierre de turno seguro, artefacto público controlado y preparación de migración. Es el alcance de este candidato.
- **Fase 1.1 — experiencia:** ajustes responsive y de usabilidad que no bloquean la protección frente a ataques externos.
- **Fase 1.5 — higiene:** rotación coordinada de secretos y saneamiento de historia Git. Se ejecuta separadamente para no mezclarlo con el cambio funcional.
- **Fase 2 — arquitectura:** sacar los XLSX y demás información operativa del sitio público y servirla desde una fuente autenticada.

## Correcciones incluidas

- credenciales MicroStrategy leídas desde variables de entorno;
- Firebase Rules endurecidas por autenticación, UID y rol;
- mitigación de Stored XSS en contenido dinámico;
- cierre de turno con persistencia confirmada y correo no bloqueante;
- controles de Admin, Supervisor y Gestor alineados con las Rules;
- artefacto Pages construido mediante allowlist;
- soporte para la migración UID-only de permisos y logs históricos.

## Limpieza del candidato

La rama heredó 20.607 archivos del `main` productivo. La limpieza autorizada retiró 20.530 archivos del candidato y dejó 77 archivos versionados:

- 20.427 archivos de `node_modules` sin manifiesto Node en la raíz;
- cuatro cachés generados de Firebase y Python;
- siete PDF operativos trasladados fuera del repositorio público;
- 60 temporales, dumps y scripts de diagnóstico sin dependencia operativa;
- 32 pruebas ad hoc, parches de una sola vez o scripts con acceso directo al Firebase real.

Se conservaron los 18 archivos obligatorios y el archivo opcional (`Retiros/retiros_data.json`) de la allowlist de Pages, los assets usados por la interfaz, los XLSX operativos aceptados para Fase 1, el backend local documentado, los generadores de documentación y la automatización existente. Eliminar archivos del HEAD no elimina copias de la historia Git; ese saneamiento y la rotación asociada continúan en Fase 1.5.

## Retiro de documentación técnica obsoleta (2026-08-14)

Se retiraron tres artefactos de documentación técnica obsoleta que contenían referencias internas y fragmentos desactualizados. El detalle de seguridad se conserva en el registro confidencial local.

El retiro reduce la exposición en el HEAD del candidato, pero no la elimina por completo: el cierre definitivo depende de una fase posterior de saneamiento de historial, prevista junto con la rotación de Fase 1.5.

El candidato queda con 74 archivos versionados (antes 77): 20.533 eliminaciones acumuladas sobre los 20.607 archivos heredados de `main` (20.530 de RM-35 más 3 de RM-37).

## Registro resumido de fallas

| Falla observada | Riesgo o mecánica afectada | Corrección en el candidato |
|---|---|---|
| Credenciales MicroStrategy escritas en el script | exposición de acceso externo | variables de entorno y ejemplo sin secretos |
| Rules basadas principalmente en autenticación o nombre | lectura/escritura entre usuarios | aprobación, rol y UID exigidos por ruta |
| Cuenta pendiente con sesión de Auth válida | acceso a datos antes de aprobación y posible autoactivación | solo puede leer su propio perfil; los datos de la app permanecen bloqueados |
| Confirmación de lectura escribía sobre el comunicado completo | un usuario podía intentar alterar título o contenido | escritura limitada a `readBy/{uid}`; contenido reservado a Admin |
| Datos dinámicos insertados como HTML o argumento JavaScript | Stored XSS en paneles, reportes y comunicados | escape por contexto, sanitizador allowlist y avatar configurado por DOM |
| Cierre de turno dividido en varias escrituras | sesión cerrada parcialmente o informe perdido | actualización raíz atómica antes de limpiar la sesión local |
| Publicación de Pages copiaba el repositorio completo | exposición accidental de archivos internos | artefacto construido mediante allowlist y validado también en PR |
| Históricos asociados únicamente por nombre | incompatibilidad con Rules UID-only | migración previa, repetible y con rollback preparado |
| Dependencias, temporales y scripts directos a producción versionados | exposición del repositorio, revisión inmanejable y escrituras accidentales | poda controlada de 20.530 archivos sin alterar la allowlist operativa |
| Documentación técnica obsoleta con referencias internas y fragmentos desactualizados | exposición de contenido interno no necesario para la operación del candidato | retiro de Documentacion_Tecnica.md/.docx y de su generador; saneamiento de historial pendiente de Fase 1.5 |

## Mecánicas visibles para usuarios no técnicos

- **Ingreso:** una cuenta registrada pero pendiente o rechazada puede autenticarse en Firebase, pero no entra a los datos ni puede autoactivarse. Debe esperar aprobación de un Administrador.
- **Permisos:** el Gestor continúa creando y consultando sus solicitudes; Supervisor/Admin conservan la revisión autorizada. La asociación interna pasa de nombre a UID, sin cambiar el flujo visible.
- **Comunicados:** todos los usuarios aprobados pueden leer y confirmar lectura; solo Admin puede crear, editar o eliminar contenido. Confirmar lectura ya no permite modificar el comunicado.
- **Cierre de turno:** primero se guardan informe, cierre de sesión y hora de salida de forma conjunta. Un fallo del correo no anula el cierre; un fallo de Firebase sí mantiene la sesión para reintento.
- **Paneles administrativos:** Gestor no ve controles de Admin; Supervisor conserva únicamente las funciones autorizadas por Rules.

## Riesgos aceptados de Fase 1

Los XLSX de Tareas, Cronograma, Horario y Teletrabajo continúan en el artefacto público porque la aplicación productiva depende de ellos. Su reemplazo por una fuente autenticada corresponde a Fase 2.

El soporte responsive completo corresponde a Fase 1.1. La rotación coordinada y el saneamiento de historia Git corresponden a Fase 1.5.

## Condiciones antes del PR

- cambios separados por propósito: commit de remediación y commit de limpieza del repositorio;
- ninguna carpeta `scratch/`, export, backup, PATCH privado o fixture real;
- matriz UID/roles, XSS, cierre de turno y artefacto Pages aprobados;
- SHA del candidato y hashes de `app.js` y Rules registrados;
- plan de migración y rollback preparado;
- guía operativa actualizada.

## Límites de autorización

Preparar o aprobar este candidato no autoriza:

- fusionar el PR productivo;
- aplicar el PATCH en Firebase real;
- desplegar Rules R1;
- ejecutar un rollback material.

Cada acción requiere autorización separada del Lead.

## Actualización posterior — Comunicados: Supervisor habilitado para publicar y consultar lecturas (2026-08-24)

Este apartado no reemplaza el registro de Fase 1 anterior (líneas "Comunicados" en el Registro resumido de fallas y en Mecánicas visibles); lo complementa con un cambio de política solicitado con posterioridad al cierre de Fase 1.

- **Qué decía Fase 1:** "todos los usuarios aprobados pueden leer y confirmar lectura; solo Admin puede crear, editar o eliminar contenido" (ver línea 85 de este documento, sin modificar).
- **Qué cambia ahora:** Supervisor se habilita adicionalmente para **crear/publicar** comunicados nuevos y para **consultar el listado de lecturas** (quién leyó / quién no) de cualquier comunicado. Esto se implementó en `app.js` mediante capacidades explícitas y separadas — `canPublishComunicados(role)`, `canViewComunicadoLecturas(role)` (ambas Admin, Supervisor) y `canDeleteComunicados(role)` (solo Admin) — usadas tanto en la visibilidad de navegación/vista como en `openNewComunicadoModal()`, `saveNewComunicado()`, `viewComunicadoLecturas()` y `deleteComunicado()`.
- **Qué NO cambia:** Supervisor sigue sin poder editar/sobrescribir un comunicado existente ni eliminarlo — solo Admin conserva esas dos facultades. Supervisor tampoco adquiere acceso a administración de usuarios, roles u otras funciones exclusivas de Admin (panel de Aprobaciones de usuarios, `navConfigGestores`, etc., que permanecen condicionadas a `role === 'Admin'`).
- **Firebase Rules — DESPLEGADAS (2026-08-24):** el co-lead publicó las Rules correspondientes en `riskops-75637`. `database.rules.json` en este repositorio contiene el texto **literal** de la cláusula `.write` desplegada (confirmado por el co-lead tras comparar contra `riskops-75637`) — no una reconstrucción. La rama `Supervisor` de esa cláusula `.write` (no una regla `.validate` separada) exige, todo en un mismo condicional: registro nuevo (`!data.exists() && newData.exists()`), ausencia de `readBy`, los campos `title`/`content`/`date`/`author`/`authorUid` presentes como strings, y `authorUid === auth.uid`; Admin conserva escritura completa (crear, actualizar y eliminar) sin restricciones adicionales de forma. `readBy/$reader_uid` no se tocó. Ver `.github/qa-infra/supervisor_comunicados_rules.spec.js` y los casos añadidos en `.github/qa-infra/qa_matrix.js` (`supervisor_valid_announcement_create`, `supervisor_cannot_prefab_readby_on_create`, `supervisor_cannot_spoof_authorUid_on_create`, `supervisor_cannot_update_existing_announcement`, `supervisor_cannot_delete_existing_announcement`).
- **`authorUid` y atribución de autor:** `saveNewComunicado()` ahora envía `authorUid: firebase.auth().currentUser.uid` (requerido y validado por las Rules) y ya no usa `'Admin'` como fallback del nombre mostrado — el fallback pasa a `currentUser.name || currentUser.email || currentUser.role || 'Usuario'`, para que un Supervisor nunca quede atribuido como Admin.
- La sanitización de contenido (`sanitizeAnnouncementHTML`, allowlist de etiquetas, `sanitizeAnnouncementHref`) introducida en Fase 1 no se modificó ni se debilitó; sigue envolviendo los mismos cuatro puntos de guardado/renderizado.
- **Estado de las pruebas de Firebase Emulator:** el dispositivo usado para implementar este cambio no tiene Java instalado, por lo que ninguna prueba contra el Realtime Database Emulator pudo ejecutarse localmente (clasificación `NOT EXECUTED – JAVA UNAVAILABLE`). El paso "Run Supervisor comunicados rules cases" en `phase1-compatibility-qa.yml` ya es bloqueante (sin `continue-on-error`) y debe ejecutarse en CI o en un entorno con Java antes de fusionar (`PENDING CI`). Detalle completo en `release-docs/RISK_MANAGER_QA_MATRIZ_COMUNICADOS_SUPERVISOR_2026-08-24.md`.
