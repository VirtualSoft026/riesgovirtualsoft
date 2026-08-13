# Risk Manager — Historial de remediación y guía operativa

Fecha de corte: 2026-08-13  
Audiencia: equipo técnico, responsables operativos y usuarios no técnicos  
Estado: candidato limpio `phase1-security-release` listo para publicar como rama; producción aún no actualizada

## 1. Cómo leer este documento

La [guía end-to-end y modelo de delegación](RISK_MANAGER_GUIA_END_TO_END_Y_DELEGACION_2026-08-13.md) es el documento de entrada y contiene el mapa completo de repositorios, entornos, fases y responsables.

En este inventario:

- `CORREGIDO EN CANDIDATO LOCAL`: el cambio existe en `phase1-security-release`; no implica que la rama esté publicada, que exista PR o que esté desplegado.
- `VALIDADO EN EMULATOR`: pasó pruebas aisladas con datos sintéticos y sin red productiva.
- `PUBLICADO/VALIDADO EN STAGING`: está en el repositorio independiente `daniel-puentes109/riskmanager-security-staging`; no implica que esté en el `main` productivo.
- `PENDIENTE PRODUCTIVO`: requiere un merge, publicación, migración o despliegue expresamente autorizado.
- `DESPLEGADO EN PRODUCCIÓN`: sólo puede usarse después de ejecutar y verificar la acción aplicable en `VirtualSoft026/riesgovirtualsoft/main`, Pages productivo o Firebase real.
- `RIESGO ACEPTADO`: no se corrige en Fase 1 y queda documentado.
- `DEUDA DE FASE POSTERIOR`: se realizará en la fase indicada.

Cuando una corrección tenga más de un estado, se enumeran por separado. Por ejemplo, `CORREGIDO EN CANDIDATO LOCAL; VALIDADO EN EMULATOR; PENDIENTE PRODUCTIVO`.

## 2. Resumen ejecutivo

Las correcciones principales reducen accesos indebidos entre usuarios, Stored XSS, exposición accidental de archivos y fallas de persistencia al finalizar turno. El mayor riesgo de transición no es una nueva vulnerabilidad: es la compatibilidad de datos históricos sin UID con las reglas R1.

Se preparó y ensayó un PATCH privado para 687 asignaciones UID-only y se excluyeron siete registros sin evidencia suficiente. El ensayo confirmó idempotencia y rollback exacto. No se ha escrito en Firebase real ni se ha actualizado el `main` productivo.

## 3. Inventario de fallas y correcciones

| ID | Falla encontrada | Riesgo o mecánica afectada | Corrección aplicada | Estado actual |
|---|---|---|---|---|
| RM-01 | Credencial MicroStrategy embebida en código | Exposición de acceso al robot/proceso de reportes | Variables de entorno, `.env` fuera de Git y dependencias declaradas | CORREGIDO EN CANDIDATO LOCAL; rotación antigua pendiente en Fase 1.5 |
| RM-02 | Rules permitían lecturas demasiado amplias en usuarios, permisos, reportes, sesiones y logs | Un Gestor podía intentar consultar información de otras personas directamente en Firebase | Reglas deny-by-default, propiedad por `auth.uid` y facultades por rol | CORREGIDO EN CANDIDATO LOCAL; VALIDADO EN EMULATOR; R1 PENDIENTE PRODUCTIVO |
| RM-03 | Rol y aprobación dependían parcialmente del cliente | Riesgo de autoaprobación o escalamiento manipulando peticiones | Rol consultado desde `/users/{auth.uid}` y validaciones en Rules | CORREGIDO EN CANDIDATO LOCAL; VALIDADO EN EMULATOR; PENDIENTE PRODUCTIVO |
| RM-04 | Operaciones usaban UID proveniente de `localStorage` | Referencias controladas por cliente podían apuntar a otro usuario | Rules comparan rutas y payload con `auth.uid` | CORREGIDO EN CANDIDATO LOCAL; VALIDADO EN EMULATOR; PENDIENTE PRODUCTIVO |
| RM-05 | `/permissions` y `/logs` no aplicaban propiedad consistente | Exposición o modificación de solicitudes/incidentes ajenos | UID obligatorio, consultas del Gestor filtradas y writes por propietario | CORREGIDO EN CANDIDATO LOCAL; VALIDADO EN EMULATOR; migración histórica PENDIENTE PRODUCTIVO |
| RM-06 | `/shift_reports` y `/active_sessions` tenían lectura global autenticada | Exposición de actividad y reportes | Lectura global sólo para Supervisor/Admin; propietario conserva acceso puntual requerido | CORREGIDO EN CANDIDATO LOCAL; VALIDADO EN EMULATOR; PENDIENTE PRODUCTIVO |
| RM-07 | Primeras pruebas de Rules no eran pruebas reales de Emulator | Falsa sensación de cobertura | Suite con Firebase Emulator, `@firebase/rules-unit-testing` y GitHub Actions aislado | VALIDADO EN EMULATOR; arnés incorporado al candidato limpio; CI PENDIENTE tras publicar rama |
| RM-08 | Múltiples datos dinámicos llegaban a `innerHTML` | Stored XSS desde logs, XLSX, tareas, horarios, historial y métricas | `escapeHTML`, `textContent` y correcciones dirigidas en sinks | CORREGIDO EN CANDIDATO LOCAL; VALIDADO EN EMULATOR; PENDIENTE PRODUCTIVO |
| RM-09 | El hardening XSS eliminó el formato legítimo de comunicados | Comunicados mostraban etiquetas como texto | Sanitizador allowlist para formato seguro y bloqueo de scripts, eventos y protocolos peligrosos | CORREGIDO EN CANDIDATO LOCAL; VALIDADO EN EMULATOR; PENDIENTE PRODUCTIVO |
| RM-10 | Finalizar turno dependía del correo y lanzaba escrituras sin esperar | El usuario podía salir sin comprobar que reporte/sesión quedaron guardados | Update atómico, espera de confirmación y correo como notificación secundaria | CORREGIDO EN CANDIDATO LOCAL; VALIDADO EN EMULATOR; PENDIENTE PRODUCTIVO |
| RM-11 | Supervisor veía controles que Rules reservaban a Admin | Confusión operativa y errores de permiso | UI alineada: usuarios/comunicados sólo Admin; permisos y monitoreo según rol | CORREGIDO EN CANDIDATO LOCAL; VALIDADO EN QA de staging; PENDIENTE PRODUCTIVO |
| RM-12 | Monitoreo y controles administrativos no estaban alineados por rol | Acciones visibles pero bloqueadas o exposición innecesaria | Separación de navegación y controles Admin/Supervisor/Gestor | CORREGIDO EN CANDIDATO LOCAL; VALIDADO EN QA de staging; PENDIENTE PRODUCTIVO |
| RM-13 | PDFs y archivos internos podían entrar al artefacto público | Descarga no autorizada si se conocía la URL | PDFs privados retirados; Pages publica por allowlist | PUBLICADO/VALIDADO EN STAGING; PENDIENTE PRODUCTIVO |
| RM-14 | Primer workflow estricto excluyó XLSX necesarios | Mis Tareas, Horario y Teletrabajo dejaron de funcionar | Allowlist explícita de siete XLSX operativos requeridos | PUBLICADO/VALIDADO EN STAGING; PENDIENTE PRODUCTIVO |
| RM-15 | Fixtures sintéticos y abstracción temprana no reproducían datos reales | Tareas vacías y semanas sin información | Se revirtió la abstracción para Fase 1 y se restauró el consumo XLSX actual | CORREGIDO; rediseño movido a Fase 2 |
| RM-16 | Error en precarga de cronograma y conexión de vista de monitoreo | Fallo de carga o vista incompleta | Corrección puntual en frontend | CORREGIDO EN CANDIDATO LOCAL; PENDIENTE PRODUCTIVO |
| RM-17 | Temporales, dumps, `.pyc` y automatizaciones podían agregarse accidentalmente | Exposición pública o commits contaminados | `.gitignore`, scripts más estrictos y artefacto Pages allowlist | CORREGIDO EN GRAN PARTE |
| RM-18 | Configuración Firebase Web fue marcada como secreto | Riesgo de eliminar configuración necesaria sin resolver la seguridad real | Clasificada como configuración pública; seguridad ubicada en Rules | ESPERADO; restricciones de API key pendientes de revisión admin |
| RM-19 | JavaScript del cliente es públicamente visible | Suposición incorrecta de seguridad por ocultamiento | Se asume observable y se protege backend/Rules | ESPERADO POR DISEÑO |
| RM-20 | Frontend prácticamente no responsive | Uso difícil en móvil | No se amplió alcance para evitar regresiones | DEUDA DE FASE 1.1; escritorio recomendado |
| RM-21 | XLSX con asignaciones, horarios y teletrabajo siguen siendo descargables | Exposición de información operativa/PII | No hay solución segura sin fuente autenticada | RIESGO ACEPTADO FASE 1; migrar en Fase 2 |
| RM-22 | Secretos pueden persistir en historia Git aunque no estén en HEAD | Recuperación desde commits o ramas antiguas | Inventario, rotación y futura reescritura coordinada | PENDIENTE FASE 1.5 |
| RM-23 | Permisos y `login_logs` históricos no tienen UID | R1 oculta historial propio y bloquea cierre de logs heredados | PATCH UID-only conservador, sin overwrite, ensayado con rollback | PENDIENTE PRODUCTIVO: 687 base y 7 excluidos |
| RM-24 | Correlación inicial de logs abiertos era demasiado permisiva | Podía asociar un log antiguo a una sesión actual | Ventana temporal `loginTime`–`lastActive` con tolerancia limitada | CORREGIDO EN PLANIFICADOR |
| RM-25 | `active_sessions` no conserva `loginLogId` en payload | Obliga a correlación heurística para datos heredados | No cambiado en producción; candidato conserva flujo actual | DEUDA FUTURA |
| RM-26 | Staging Pages usa el Firebase real | Las pruebas de interfaz generan datos productivos | Suite automática aislada; pruebas web mutantes suspendidas | RESTRICCIÓN OPERATIVA ACEPTADA POR TIEMPO |
| RM-27 | Rama candidata acumuló archivos experimentales | Riesgo de llevar material no relacionado a producción | Release nuevo desde `origin/main` y portado por allowlist | CORREGIDO EN `phase1-security-release`; publicación aislada autorizada |
| RM-28 | Caché podía mostrar una versión anterior después del deploy | Usuarios veían comportamientos inconsistentes | Verificación por hash y recarga forzada | CONTROL OPERATIVO |
| RM-29 | `favicon.ico` ausente | 404 cosmético | Sin corrección en Fase 1 | NO BLOQUEANTE |
| RM-30 | Advertencia de índice en permisos | Rendimiento, no autorización | R1 incluye índice UID | CORREGIDO EN CANDIDATO LOCAL; VALIDADO EN EMULATOR; R1 PENDIENTE PRODUCTIVO |
| RM-31 | Una cuenta de Auth pendiente o rechazada podía conservar acceso a datos y cambiar su propio estado | Entrada antes de aprobación o autoactivación | Todas las rutas operativas exigen `approved === true`; el usuario pendiente sólo puede leer su perfil | CORREGIDO EN CANDIDATO LOCAL; VALIDADO EN EMULATOR; R1 PENDIENTE PRODUCTIVO |
| RM-32 | Confirmar lectura escribía sobre el comunicado completo | Un usuario aprobado podía intentar alterar título o contenido junto con `readBy` | Usuarios sólo crean `readBy/{auth.uid}`; crear, editar y borrar contenido queda reservado a Admin | CORREGIDO EN CANDIDATO LOCAL; VALIDADO EN EMULATOR; R1 PENDIENTE PRODUCTIVO |
| RM-33 | Identificadores y nombres dinámicos llegaban a atributos y manejadores JavaScript | Stored XSS por ruptura de contexto en `onclick` o avatar | Codificación específica de argumentos y asignación de avatar mediante propiedades DOM | CORREGIDO EN CANDIDATO LOCAL; VALIDADO CON SMOKE FOCALIZADO; PENDIENTE PRODUCTIVO |
| RM-34 | Un `push` de la rama de release podía confundirse con una publicación productiva | Riesgo operativo de desplegar antes del PR/merge | Workflow Pages despliega sólo por `push` a `main`; en PR únicamente construye y valida el artefacto | CONTROL VERIFICADO EN CANDIDATO; publicación de rama no despliega |
| RM-35 | `main` versionaba dependencias, cachés, temporales, PDF internos y scripts ad hoc/directos a Firebase | Exposición innecesaria, revisión inmanejable y riesgo de ejecutar escrituras productivas fuera del runbook | Se retiraron 20.530 archivos; el índice del candidato pasó de 20.607 a 77 archivos | CORREGIDO EN CANDIDATO; MAIN E HISTORIA GIT PENDIENTES |
| RM-36 | Avatares identificables y XLSX operativos continúan dentro del artefacto público | Exposición de información operativa y personal necesaria para las mecánicas actuales | Se conservaron para evitar regresión; reemplazo por recursos genéricos/fuente autenticada | RIESGO ACEPTADO FASE 1; PENDIENTE FASE 2 |

## 4. Mecánicas que no deben cambiar para el usuario

Estas funciones mantienen el flujo productivo conocido:

- selección de SET y ejecución de tareas;
- lectura de Cronograma, Horario y Teletrabajo desde XLSX;
- registro de pausas, desayuno, almuerzo e inactividad;
- creación de solicitudes de permiso;
- consulta de documentación operativa autorizada.

Si alguna deja de funcionar después del release, se considera regresión y activa revisión o rollback.

## 5. Guía para usuarios no técnicos

Esta sección sólo explica mecánicas afectadas por las correcciones.

### 5.1 Inicio de sesión

Use las mismas credenciales habituales. Después del cambio, la aplicación relacionará permisos, logs y sesiones con la identidad autenticada y no sólo con datos guardados en el navegador.

Si aparece un mensaje de cuenta pendiente o rechazada, no intente crear otra cuenta: contacte al Admin para revisar la solicitud.

### 5.2 Historial y solicitudes de permiso

- El Gestor verá únicamente sus solicitudes.
- Supervisor y Admin podrán revisar y procesar las solicitudes según su función.
- Si falta una solicitud histórica, no cree un duplicado inmediatamente. Informe al Supervisor/Admin indicando fecha y tipo de permiso; puede corresponder a uno de los registros heredados sin identidad confirmada.

### 5.3 Finalizar turno

Al finalizar turno pueden aparecer tres resultados:

1. `Turno finalizado correctamente y reporte enviado`: cierre y correo confirmados.
2. `Turno finalizado correctamente. No fue posible enviar la notificación por correo`: el cierre sí quedó guardado; no lo repita. Avise al Supervisor por el canal habitual si necesita confirmar el reporte.
3. `No fue posible finalizar el turno porque ... no quedó guardado`: la sesión se conserva. No cierre la página; intente nuevamente una vez y, si continúa, contacte soporte.

El fallo del correo ya no debe interpretarse como pérdida del turno.

### 5.4 Supervisor

- Puede monitorear sesiones y actividad autorizada.
- Puede consultar reportes y tramitar permisos según el diseño actual.
- No administra roles ni cuentas de usuario.
- No gestiona comunicados administrativos si el control está reservado a Admin.

Que un control administrativo deje de aparecer para Supervisor es un cambio esperado, no una falla.

### 5.5 Admin

- Mantiene aprobación y gestión de usuarios.
- Conserva administración de roles y comunicados.
- Puede revisar sesiones, logs, reportes y permisos globales.

### 5.6 Comunicados

El formato básico seguirá disponible: párrafos, negrita, cursiva, listas y enlaces seguros. La aplicación eliminará scripts, estilos, iframes, eventos y enlaces peligrosos. Si un contenido inseguro desaparece, es comportamiento esperado.

### 5.7 Documentos privados

Los documentos retirados de Pages pueden requerir acceso al repositorio privado correspondiente. Si aparece 404 o solicitud de inicio de sesión, confirme primero que su cuenta tiene permiso; no solicite republicar el archivo en la web abierta.

### 5.8 Después del despliegue

Si la pantalla parece conservar la versión anterior:

1. guarde cualquier trabajo en curso;
2. cierre sesión;
3. use `Ctrl + F5`;
4. vuelva a ingresar;
5. si persiste, envíe a soporte una captura y la hora del error, sin incluir contraseña.

### 5.9 Dispositivos móviles

La Fase 1 está orientada a escritorio. Si una tabla o menú no se visualiza correctamente en móvil, use un computador; responsive queda para una fase posterior.

## 6. Qué debe reportarse inmediatamente

```text
no es posible iniciar sesión
se muestran datos de otra persona
un Gestor ve controles administrativos
una solicitud propia desaparece sin ser histórica
el cierre de turno no queda guardado
la aplicación muestra código o etiquetas ejecutables
un documento privado abre sin autenticación
la pantalla queda inutilizable después de Ctrl+F5
```

Al reportar, incluya rol, hora, pantalla y mensaje visible. No incluya contraseña, token, UID, exports ni datos personales de terceros.

## 7. Pendientes antes de producción

- crear un release limpio desde el `main` productivo vigente;
- recalcular el PATCH con exports frescos;
- resolver o aceptar formalmente los siete registros excluidos;
- preparar respaldo R0, rollback de datos y `git revert`;
- revisar el diff del PR productivo;
- acordar ventana corta sin nuevas escrituras;
- ejecutar merge, Pages y R1 con autorizaciones separadas;
- realizar smoke mínimo con transacciones reales previamente acordadas;
- observar el primer flujo completo posterior al release.

## 8. Riesgos aceptados y trabajo futuro

```text
XLSX públicos                         = ACCEPTED_RISK_PHASE_1
Responsive                           = PHASE_1_1
Rotación/limpieza histórica secretos = PHASE_1_5
Datos operativos autenticados        = PHASE_2
Modularización frontend              = PHASE_2
```

Aceptar estos riesgos no modifica la exigencia de proteger Firebase mediante Rules ni permite publicar secretos, exports o documentación privada.
