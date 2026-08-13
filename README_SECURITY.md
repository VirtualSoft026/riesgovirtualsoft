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

- diff mínimo respecto a `VirtualSoft026/riesgovirtualsoft/main`;
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
