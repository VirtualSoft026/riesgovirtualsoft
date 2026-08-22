# Risk Manager — plan de implementación

Fecha de corte: 2026-08-13  
Objetivo inmediato: llevar la remediación de Fase 1 a producción con el menor cambio posible y sin interrumpir las mecánicas principales  
Estado actual: `PRODUCCIÓN NO MODIFICADA; PUBLICACIÓN AISLADA DE RAMA AUTORIZADA`

Este plan convierte la [guía end-to-end](RISK_MANAGER_GUIA_END_TO_END_Y_DELEGACION_2026-08-13.md) en una secuencia ejecutable. Está diseñado para delegar trabajo desde ahora sin conceder permisos implícitos sobre `main` o Firebase real.

## 1. Resultado esperado

Al terminar Fase 1 deben cumplirse simultáneamente estas condiciones:

- el código aprobado está en `VirtualSoft026/riesgovirtualsoft/main`;
- GitHub Pages productivo sirve exactamente el artefacto aprobado;
- los registros históricos legítimos requeridos por R1 tienen UID;
- Firebase Rules R1 está desplegado y bloquea acceso entre usuarios;
- Gestor, Supervisor y Admin conservan sus operaciones legítimas;
- Stored XSS, publicación accidental de archivos y credenciales embebidas están mitigados;
- existe evidencia sanitizada y un rollback probado;
- no quedan incidentes críticos abiertos después de la observación.

No se intentará resolver responsive, reescritura de historia Git ni migración completa de XLSX dentro de este release.

## 2. Principio de ejecución

Se trabajará en cuatro carriles coordinados:

| Carril | Propósito | Puede avanzar ahora | Toca producción |
|---|---|---:|---:|
| A — Release | construir el candidato mínimo desde el `main` productivo | sí | no durante la preparación |
| B — QA y seguridad | validar ataques externos y mecánicas críticas | sí; preparar desde hoy | no; usa Emulator |
| C — Datos y Firebase | preparar migración, respaldos, R0/R1 y rollback | parcialmente | sólo durante ventana autorizada |
| D — Operación | preparar PR, comunicaciones, smoke y observación | sí | sólo durante ventana autorizada |

Los carriles convergen antes del merge productivo. Ningún carril puede autorizar por sí solo el siguiente paso material.

### 2.1 Función del repositorio de staging

`daniel-puentes109/riskmanager-security-staging` es el laboratorio reutilizable de QA y el archivo de evidencias de la remediación. Su función concreta es:

- conservar el arnés endurecido de Emulator, matriz por roles, guardia de red, ensayo de migración y reportes sanitizados;
- servir como referencia para ejecutar esas pruebas contra el candidato limpio de producción;
- permitir revisión visual controlada de Pages sin tratarlo como un Firebase aislado;
- preservar evidencia histórica sin mezclarla con el código productivo.

No es:

- la base de la rama productiva;
- una rama que deba fusionarse con `VirtualSoft026/riesgovirtualsoft/main`;
- un entorno seguro para escrituras exploratorias, porque su Pages apunta al Firebase real;
- una aprobación automática del futuro PR productivo.

La validación decisiva se ejecuta sobre el SHA exacto de `phase1-security-release`. El arnés puede ejecutarse desde staging contra una copia local del candidato o mediante CI del futuro PR; sus resultados siempre deben identificar el SHA probado.

Publicar `phase1-security-release` es una operación Git aislada: no actualiza `main`, no modifica Firebase y no despliega GitHub Pages. El workflow de Pages sólo despliega por `push` a `main` o por una ejecución manual que requiere autorización separada; en un PR sólo construye y valida el artefacto.

## 3. Camino crítico

```text
IMP-00 Congelar alcance y base
  → IMP-01 Crear rama limpia
  → IMP-02 Portar correcciones mínimas
  → IMP-03 Empaquetar y excluir material privado
  → IMP-04 Ejecutar QA sobre el SHA limpio
  → IMP-05 Revisar PR productivo
  → IMP-08 Recalcular PATCH con export fresco
  → IMP-09 Aplicar PATCH UID
  → IMP-10 Merge + Pages
  → IMP-11 Desplegar Rules R1
  → IMP-12 Smoke, observación y cierre
```

`IMP-06`, `IMP-07` y los trabajos futuros pueden prepararse en paralelo, pero no alteran este orden.

## 4. Qué podemos adelantar inmediatamente

Sin autorización productiva pueden comenzar hoy:

1. congelar el alcance de archivos y fallas de Fase 1;
2. crear una rama de release desde el `origin/main` vigente;
3. portar y revisar las correcciones mínimas;
4. preparar la matriz QA y ejecutar todo lo que use Emulator;
5. redactar el PR productivo sin fusionarlo;
6. preparar checklist, comunicación, smoke y rollback;
7. verificar el planificador UID con datos sintéticos o exports ya autorizados para lectura;
8. inventariar responsive, secretos y requisitos de Fase 2 en documentos separados.

Debe esperar una autorización específica:

- leer un export nuevo de Firebase real, si el acceso no estaba ya autorizado;
- aplicar el PATCH UID;
- fusionar el PR productivo;
- desplegar Rules R1;
- ejecutar rollback material;
- rotar credenciales o reescribir historia Git.

## 5. Plan por olas

Las duraciones son esfuerzo orientativo, no compromisos de calendario. Con responsables distintos, varias tareas pueden ejecutarse en paralelo.

### Ola 0 — preparación y asignación

Duración orientativa: medio día.

| ID | Actividad | Responsable sugerido | Entregable | Criterio de terminado |
|---|---|---|---|---|
| IMP-00 | Congelar alcance y SHA base | Release Manager | acta corta con SHA base, RM-ID incluidos y excluidos | no hay cambios de Fase 1 sin justificación |
| IMP-00A | Asignar responsables | dueño de producto | nombres para Release, Desarrollo, QA, Firebase, Negocio y Soporte | cada paso productivo tiene ejecutor y validador distintos |
| IMP-00B | Definir canal y ventana tentativa | Operaciones | canal de incidentes y dos opciones de baja actividad | todos conocen condiciones de pausa y rollback |

Entrada verificada para el corte:

```text
REPOSITORIO_PRODUCTIVO = VirtualSoft026/riesgovirtualsoft
RAMA_PRODUCTIVA        = main
SHA_BASE_VERIFICADO    = 43537a043dc9548d4066aca670f26209b9e77430
RAMA_CANDIDATA_LOCAL   = phase1-security-release
SHA_BASE_CANDIDATO     = 43537a043dc9548d4066aca670f26209b9e77430
ESTADO_CANDIDATO       = COMMIT_Y_PUSH_DE_RAMA_AUTORIZADOS; MAIN_SIN_CAMBIOS
```

Antes de crear la rama limpia se actualiza `origin/main`. Si cambió el SHA, se registra la nueva base y se revisa el delta; no se continúa usando ciegamente el SHA histórico.

### Ola 1 — candidato productivo limpio

Duración orientativa: uno a dos días de desarrollo/revisión.

#### IMP-01 — crear la rama de release

Responsable: Desarrollo.  
Dependencia: IMP-00.  
Acción productiva: no.

Pasos:

1. actualizar referencias remotas;
2. crear la rama `phase1-security-release` desde `origin/main`;
3. confirmar que la rama comienza sin los 57 archivos acumulados de `staging-qa`;
4. registrar SHA base.

Entregable: rama limpia y registro de SHA.

Estado al corte: `COMPLETADO Y AUTORIZADO PARA PUBLICACIÓN AISLADA`. Debe verificarse el SHA remoto después del `push`.

#### IMP-02 — portar las correcciones mínimas

Responsable: Desarrollo.  
Validador: revisor técnico.  
Dependencia: IMP-01.

Conjunto esperado para revisión, no para agregado automático:

| Grupo | Archivos candidatos | Propósito |
|---|---|---|
| Frontend | `app.js`, `login.js` | UID, XSS, cierre de turno y roles |
| Firebase | `database.rules.json`, `firebase.json` | autorización R1 y configuración controlada |
| Publicación | `.github/workflows/deploy-pages.yml`, `.gitignore` | artefacto público por allowlist |
| QA | `.github/workflows/phase1-compatibility-qa.yml`, `.github/qa-infra/*` | Emulator y controles aislados |
| Credenciales de automatización | `motor_operativo.py`, `.env.example`, `requirements.txt` | retirar credenciales embebidas |
| Documentación | `README_SECURITY.md` y `release-docs/*` aprobados | operación y trazabilidad |

Cada archivo debe relacionarse con uno o más RM-ID. Si un cambio no puede explicarse mediante una falla, una prueba o una necesidad de despliegue, queda fuera.

No portar:

- `scratch/`;
- imports y JSON de prototipo de Fase 2;
- temporales, dumps, exports o backups;
- PATCH o rollback con datos reales;
- fixtures con identidades;
- binarios y archivos `__pycache__`;
- scripts `.bat` modificados sin revisión explícita de su necesidad y secretos.

Entregable: manifiesto `archivo → RM-ID → prueba`.

Estado al corte: `COMPLETADO`. Las correcciones mínimas y el QA requerido están listas para el commit autorizado de la rama candidata.

Limpieza adicional autorizada: el candidato retiró 20.530 archivos heredados que no forman parte de la aplicación desplegable. La poda se registra en un commit separado del hardening para que la revisión distinga cambios funcionales de eliminación de dependencias, cachés, temporales y material privado.

Criterio de terminado: diff mínimo, explicado y sin mecánicas nuevas.

#### IMP-03 — construir el artefacto seguro

Responsable: Desarrollo/DevOps.  
Validador: QA.

Controles:

- Pages incluye HTML, JS, CSS, imágenes y los siete XLSX operativos requeridos;
- Pages excluye Rules, scripts, documentación interna, QA, `.env`, backups y privados;
- `firebase.json` no convierte el repositorio completo en artefacto público;
- no hay credenciales operativas en HEAD;
- se registran hashes de `app.js` y Rules R1.

Entregable: inventario del artefacto y hashes.

### Ola 2 — QA proporcional al riesgo

Duración orientativa: medio día a un día después de recibir el SHA limpio.

El objetivo no es demostrar que cada píxel es perfecto. La puerta se concentra en ataques externos y mecánicas cuya ruptura produciría una caída operativa.

#### IMP-04 — matriz de seguridad mínima obligatoria

Responsable: QA de seguridad.  
Dependencia: IMP-02 e IMP-03.  
Entorno: Firebase Emulator y datos sintéticos.

| Área | Prueba mínima | Resultado requerido |
|---|---|---|
| Autenticación | usuario no autenticado intenta leer/escribir | denegado |
| BOLA/IDOR | Gestor intenta leer o modificar otro UID | denegado |
| Propiedad | Gestor usa sus propios permisos, sesión y reporte | permitido según flujo |
| Roles | Supervisor/Admin ejecutan sólo facultades previstas | permitido/denegado según matriz |
| Stored XSS | payloads en campos renderizados y comunicados | no se ejecutan scripts/eventos/URLs peligrosas |
| Cierre de turno | reporte, sesión y `logoutTime` | persisten juntos; correo no invalida cierre |
| Publicación | búsqueda de privados y secretos en artefacto | ausentes |
| Red | suite intenta resolver Firebase real | bloqueado |

Bloqueantes:

- acceso exitoso a datos de otro UID;
- escritura sin autenticación o con rol insuficiente;
- Stored XSS reproducible;
- archivo privado o credencial en Pages;
- cierre de turno que pierde el reporte o la sesión;
- suite automática conectándose a producción.

No bloqueantes por sí solos:

- `favicon.ico` 404;
- diferencias cosméticas;
- responsive incompleto;
- warning de índice sin fallo funcional;
- correo no enviado después de persistencia confirmada.

Entregable: `APTO PARA PR`, `NO APTO` o `APTO CON RIESGO ACEPTADO`, siempre asociado al SHA probado.

#### IMP-05 — regresión funcional focalizada

Responsable: QA funcional o usuario de negocio.  
Entorno: local/Emulator; no realizar escrituras libres desde Pages de staging.

Flujos:

- login por rol;
- carga de Tareas;
- consulta de Horario y Teletrabajo;
- creación/consulta de permiso propio con datos sintéticos;
- monitoreo de Supervisor/Admin;
- cierre de turno sintético;
- comunicado con formato permitido.

Entregable: checklist con evidencia breve. Sólo se abre una investigación extensa si un flujo crítico falla.

### Ola 3 — PR y preparación operativa

Duración orientativa: medio día. Puede redactarse mientras termina QA.

#### IMP-06 — preparar PR productivo

Responsable: Release Manager.  
Dependencias para abrir como listo: IMP-04 e IMP-05.

El PR debe contener:

- SHA base y SHA candidato;
- manifiesto de archivos y RM-ID;
- resultados QA;
- riesgos aceptados de Fase 1;
- orden de despliegue;
- criterios de parada;
- rollback;
- guía de cambios visibles para usuarios.

Abrir el PR no autoriza el merge.

#### IMP-07 — preparar operación y soporte

Responsables: Operaciones y Soporte.  
Puede iniciar: ahora.

Entregables:

- mensaje de ventana para usuarios;
- cuentas autorizadas de smoke para Gestor, Supervisor y Admin;
- transacciones reales mínimas previamente acordadas;
- formato de bitácora con hora, rol, pantalla y resultado;
- canal único de decisión `CONTINUAR` o `ROLLBACK`;
- recordatorio de no compartir contraseñas, UID, tokens ni datos de terceros.

### Ola 4 — preparación de datos y ventana productiva

Duración orientativa: preparación de medio día y ventana técnica de 30–60 minutos. El tiempo real depende del tamaño del export y de Pages.

#### IMP-08 — recalcular PATCH UID con estado fresco

Responsable: Operador Firebase/datos.  
Validador: segundo operador o QA.  
Acción: lectura real y generación privada; no escritura.

Pasos:

1. iniciar la pausa acordada de nuevas sesiones, permisos y cierres;
2. obtener export privado fresco;
3. respaldar Rules R0 y registrar su hash;
4. recalcular el PATCH y rollback;
5. explicar diferencias frente a la línea base de 687 seleccionados y 7 excluidos;
6. confirmar allowlist exclusiva `permissions/*/uid` y `login_logs/*/uid`;
7. rechazar overwrites y asociaciones ambiguas.

Entregable: hashes, conteos y resultado sanitizado. Los archivos privados permanecen fuera de Git.

#### IMP-09 — aplicar PATCH UID

Responsable: Operador Firebase.  
Validador: segundo operador.  
Dependencia: IMP-08 aprobado.  
Autorización: específica para escritura en Firebase real.

Terminado cuando:

- se aplicó exactamente el hash autorizado;
- no hubo rutas adicionales ni overwrites;
- el segundo plan produce cero cambios sobre el mismo estado;
- se registró hora, conteo y resultado.

#### IMP-10 — fusionar y publicar frontend

Responsable: Operador Git/Pages.  
Dependencias: IMP-06 aprobado e IMP-09 correcto.  
Autorización: específica para merge productivo.

Pasos:

1. confirmar que el PR no cambió desde la aprobación;
2. fusionar a `VirtualSoft026/riesgovirtualsoft/main`;
3. esperar Pages;
4. comparar hash público con el candidato;
5. ejecutar smoke mínimo antes de R1.

Si Pages no sirve el artefacto aprobado o rompe un flujo crítico, detenerse y revertir el frontend sin desplegar R1.

#### IMP-11 — desplegar Rules R1

Responsable: Operador Firebase Rules.  
Validador: QA y negocio.  
Dependencia: IMP-10 y smoke correctos.  
Autorización: específica para Rules R1.

Validaciones inmediatas:

- Gestor accede a sus propios datos y no a otro UID;
- Supervisor mantiene permisos y monitoreo requeridos;
- Admin mantiene usuarios, roles y comunicados;
- cierre de turno persiste;
- no aparece una ola de `PERMISSION_DENIED` en operaciones legítimas.

### Ola 5 — observación y cierre

#### IMP-12 — observar y decidir

Duración mínima: 30 minutos y el primer flujo operativo completo disponible.

Responsables: Soporte/observabilidad y validador de negocio.  
Decisor: Release Manager.

Resultados posibles:

- `CONTINUAR`: no hay bloqueantes; se cierra la ventana;
- `OBSERVAR`: incidencia no crítica con dueño y plazo;
- `ROLLBACK`: activador confirmado; se sigue el runbook.

El orden de rollback es R1 → R0, luego frontend mediante `git revert`. Los UID agregados se conservan salvo evidencia de asociación incorrecta.

Entregables:

- bitácora sanitizada;
- resultado final por SHA/hash;
- incidentes y responsables;
- actualización del historial de remediación;
- comunicación de cierre a usuarios.

## 6. Trabajo paralelo de fases posteriores

Este trabajo puede adelantarse siempre que use documentos o ramas separadas y no entre al PR de Fase 1.

### Fase 1.1 — responsive

Iniciar ahora:

- inventario de pantallas críticas por rol;
- matriz de resoluciones y problemas visibles;
- priorización de login, tareas, permisos y cierre de turno;
- propuesta de cambios pequeños.

Esperar a que Fase 1 esté estable para implementar y desplegar estilos.

### Fase 1.5 — secretos

Iniciar ahora:

- inventario de secretos por proveedor, dueño y estado;
- localizar referencias en ramas e historia;
- diseñar orden de rotación y actualización de consumidores;
- identificar clones y automatizaciones afectados por una reescritura.

No rotar, revocar ni reescribir historia como parte del PR de Fase 1 sin coordinación específica.

### Fase 2 — datos autenticados y arquitectura

Iniciar ahora:

- inventario de los siete XLSX operativos y sus consumidores;
- definición de propietarios y frecuencia de actualización;
- esquema objetivo por UID;
- requisitos de importación, auditoría y rollback;
- mapa de módulos frontend que deben separarse.

No integrar los importadores ni JSON prototipo actuales en el release de Fase 1.

## 7. Tablero inicial para delegación

| Orden | ID | Estado inicial | Puede asignarse ya | Dependencia principal |
|---:|---|---|---:|---|
| 1 | IMP-00 | LISTO | sí | ninguna |
| 2 | IMP-01 | LISTO AL CONGELAR BASE | sí | IMP-00 |
| 3 | IMP-02 | PENDIENTE | sí | IMP-01 |
| 4 | IMP-03 | PENDIENTE | sí | IMP-02 parcial |
| 5 | IMP-04 | PREPARABLE | sí | ejecutar tras IMP-02/03 |
| 6 | IMP-05 | PREPARABLE | sí | ejecutar tras IMP-02/03 |
| 7 | IMP-06 | PREPARABLE | sí | finalizar tras IMP-04/05 |
| 8 | IMP-07 | LISTO | sí | ninguna |
| 9 | IMP-08 | PROCEDIMIENTO LISTO | preparar sí; ejecutar en ventana | PR aprobado y pausa |
| 10 | IMP-09 | BLOQUEADO POR AUTORIZACIÓN | no ejecutar aún | IMP-08 |
| 11 | IMP-10 | BLOQUEADO POR AUTORIZACIÓN | no ejecutar aún | IMP-06 e IMP-09 |
| 12 | IMP-11 | BLOQUEADO POR AUTORIZACIÓN | no ejecutar aún | IMP-10 |
| 13 | IMP-12 | PREPARABLE | sí | ejecutar después de IMP-11 |

## 8. Reglas de gestión del plan

- Una tarea se mueve a `TERMINADA` sólo con entregable y criterio de aceptación verificable.
- Todo informe técnico debe nombrar el SHA o hash probado.
- Un verde de staging no se transfiere automáticamente al release productivo limpio.
- Un hallazgo nuevo se clasifica como bloqueante, riesgo aceptado de Fase 1 o deuda de fase posterior.
- Sólo bloquean el release las fallas de seguridad externa alta/crítica, pérdida de datos, caída de mecánica central o imposibilidad de rollback.
- Cambios cosméticos y mejoras no críticas se separan para evitar ampliar el diff.
- Las autorizaciones para PATCH, merge y Rules son independientes.

## 9. Próxima acción recomendada

Asignar `IMP-00` e `IMP-01` y producir una rama limpia desde el `origin/main` vigente. Hasta que exista ese SHA, continuar probando la rama acumulada aporta evidencia, pero no reduce el principal riesgo de integración: llevar archivos experimentales o no relacionados a producción.

El primer hito medible será:

```text
RAMA_RELEASE_CREADA
SHA_BASE_REGISTRADO
DIFF_MINIMO_EXPLICADO
SIN_PRIVADOS_NI_EXPERIMENTOS
LISTA_PARA_QA = SÍ
```
