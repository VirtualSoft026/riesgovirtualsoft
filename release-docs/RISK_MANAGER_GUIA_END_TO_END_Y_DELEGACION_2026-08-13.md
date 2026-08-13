# Risk Manager — guía end-to-end y modelo de delegación

Fecha de corte: 2026-08-13  
Audiencia: dirección, responsable de producto, equipo técnico, QA, operaciones y soporte  
Estado general: `PUBLICACIÓN DE RAMA DE FASE 1 AUTORIZADA; PRODUCCIÓN NO MODIFICADA`

Esta es la puerta de entrada a la remediación de seguridad de Risk Manager. Explica qué repositorio corresponde a cada entorno, qué significa cada estado, cómo se componen las fases y qué puede delegarse sin otorgar permisos productivos implícitos.

Documentos complementarios:

- [Runbook de promoción controlada](RISK_MANAGER_RUNBOOK_PROMOCION_CONTROLADA_PRODUCCION_2026-08-13.md): comandos, orden de despliegue, validaciones y rollback de Fase 1.
- [Historial de remediación y guía operativa](RISK_MANAGER_HISTORIAL_REMEDIACION_Y_GUIA_OPERATIVA_2026-08-13.md): fallas, correcciones y cambios visibles para usuarios no técnicos.

## 1. Resumen en una página

Risk Manager tiene un repositorio productivo, un repositorio independiente de staging y dos destinos Firebase distintos desde el punto de vista de riesgo: el Firebase real y el Emulator aislado.

```text
VirtualSoft026/riesgovirtualsoft/main
        │
        │ base de la aplicación actualmente productiva
        ▼
rama de release limpia y revisada
        │
        │ merge autorizado + GitHub Pages
        ▼
aplicación web productiva ───────────────► Firebase real
                                                ▲
                                                │ PATCH UID y Rules R1,
                                                │ cada uno con autorización propia

daniel-puentes109/riskmanager-security-staging
        │
        ├── arnés y evidencias QA ─────────────► Firebase Emulator aislado
        │
        └── Pages de staging ──────────────────► Firebase real
              (no usar para pruebas mutantes libres)
```

La rama local `staging-qa` conserva el candidato acumulado y material de trabajo histórico, pero no es una rama lista para fusionar completa. El candidato limpio actual es `phase1-security-release`, creado directamente desde `VirtualSoft026/riesgovirtualsoft/main` y con únicamente los cambios seleccionados.

El orden compatible de Fase 1 es:

```text
release limpio → QA aislado → PR productivo revisado → ventana controlada
→ PATCH UID fresco → merge/frontend Pages → Rules R1 → smoke → observación
```

El PATCH debe preceder a R1 para que los registros históricos legítimos tengan UID. El frontend debe preceder a R1 para que los registros nuevos ya nazcan compatibles con las reglas reforzadas.

## 2. Mapa exacto de repositorios, ramas y entornos

### 2.1 Repositorio productivo

| Campo | Valor |
|---|---|
| Repositorio | `VirtualSoft026/riesgovirtualsoft` |
| Rama que representa producción | `main` |
| SHA verificado en este corte | `43537a043dc9548d4066aca670f26209b9e77430` |
| Función | Fuente oficial de la aplicación que usan los usuarios |
| Estado | No contiene todavía la remediación completa de Fase 1 |

Un cambio sólo está en producción cuando se cumplen las operaciones que correspondan:

1. el cambio aprobado fue fusionado en `VirtualSoft026/riesgovirtualsoft/main`;
2. GitHub Pages publicó correctamente el artefacto, si es frontend;
3. Firebase Rules R1 fue desplegado en el proyecto real, si es una regla;
4. el PATCH fue aplicado en Firebase real, si es una migración de datos.

Un merge de código no despliega por sí mismo una regla ni migra datos.

### 2.2 Candidato limpio de remediación

| Campo | Valor |
|---|---|
| Repositorio base | clon local de `VirtualSoft026/riesgovirtualsoft` |
| Rama | `phase1-security-release` |
| SHA base | `43537a043dc9548d4066aca670f26209b9e77430` |
| Función | candidato mínimo, revisable y futuro origen del PR productivo |
| Estado Git | autorizado para un único commit y `push` aislado de esta rama; verificar SHA remoto al terminar |
| Restricción | publicar la rama no autoriza PR, merge, Pages ni cambios en Firebase real |

La rama fue creada desde el `main` productivo vigente y recibió únicamente el frontend, Rules, configuración, automatización, QA y documentación requeridos para Fase 1. El material acumulado de `staging-qa`, que incluye experimentos, fixtures y temporales, permanece fuera del candidato.

Antes del commit se verificaron sintaxis, JSON, migración determinista, controles XSS, límites visuales por rol y cierre de turno atómico. La matriz de Firebase Emulator ya ejecutada se conserva como evidencia; no se requieren pruebas de carga para publicar esta rama.

### 2.3 Repositorio independiente de staging

| Campo | Valor |
|---|---|
| Repositorio | `daniel-puentes109/riskmanager-security-staging` |
| Rama consolidada | `main` |
| Rama de trabajo del PR #1 | `qa-matrix` |
| Referencia de integración registrada | `fd95875176ee769519fe2059cb7e34dcfe3bd70e` |
| Función | pruebas, arnés QA, evidencia sanitizada y publicación previa |
| URL | `https://daniel-puentes109.github.io/riskmanager-security-staging/` |

El PR #1 de staging fue autorizado y fusionado. Esto consolidó infraestructura y evidencia de QA en el repositorio de staging; no autorizó ni ejecutó un merge en `VirtualSoft026/riesgovirtualsoft/main`.

Importante: la web publicada en staging usa actualmente el Firebase real. Sirve para revisar carga estática y comportamiento visual controlado, pero no para crear permisos, cerrar turnos, aprobar usuarios ni realizar otras escrituras exploratorias.

### 2.4 Firebase real y Firebase Emulator

| Destino | Datos | Uso permitido | Riesgo |
|---|---|---|---|
| Firebase real | datos productivos | operación normal y pasos de release expresamente autorizados | una escritura afecta usuarios reales |
| Firebase Emulator | datos sintéticos y desechables | pruebas automatizadas de reglas, roles, XSS, cierres y migración | aislado; no debe abrir red hacia producción |

El staging web y el Emulator no son equivalentes. “Probado en staging” debe indicar si fue una prueba visual contra Pages o una prueba automatizada aislada en Emulator.

### 2.5 Artefactos privados de migración

Los exports, el PATCH UID-only, su rollback y cualquier evidencia con identidades permanecen fuera de los repositorios. En documentación pública sólo se registran conteos, hashes y resultados sanitizados.

El paquete ensayado de este corte es una línea base, no un archivo listo para ejecutar semanas después. En la ventana productiva se recalcula con exports frescos porque el frontend actual puede seguir creando registros sin UID.

## 3. Diccionario de estados

Desde este documento se evitan los estados ambiguos `CORREGIDO EN CANDIDATO` y `CORREGIDO EN STAGING` sin calificadores.

| Estado oficial | Significado | No significa |
|---|---|---|
| `CORREGIDO EN CANDIDATO LOCAL` | el cambio existe en `phase1-security-release` o, si se identifica expresamente como histórico, en `staging-qa` | que esté publicado, en PR o en producción |
| `VALIDADO EN EMULATOR` | pasó pruebas aisladas con datos sintéticos y red productiva bloqueada | que haya sido probado con datos reales |
| `PUBLICADO/VALIDADO EN STAGING` | el cambio o arnés está en `daniel-puentes109/riskmanager-security-staging`; se debe especificar si fue Pages o Emulator | que esté aprobado para producción |
| `LISTO PARA PR PRODUCTIVO` | fue portado a una rama limpia desde `VirtualSoft026/riesgovirtualsoft/main`, pasó controles y está listo para revisión | que el PR esté fusionado |
| `PENDIENTE PRODUCTIVO` | falta una acción autorizada en el repositorio productivo o Firebase real | que la corrección sea inexistente |
| `DESPLEGADO EN PRODUCCIÓN` | la acción aplicable se ejecutó y fue verificada en el entorno real | que haya terminado el periodo de observación |
| `RIESGO ACEPTADO` | el riesgo se conoce y su postergación tiene una decisión explícita | que deje de monitorearse |
| `DEUDA DE FASE POSTERIOR` | el trabajo fue asignado a una fase futura con alcance definido | que deba mezclarse con el release inmediato |

Ejemplos:

- La mitigación XSS está `CORREGIDA EN CANDIDATO LOCAL` y `VALIDADA EN EMULATOR`; continúa `PENDIENTE PRODUCTIVO` hasta el merge y la publicación de Pages productivos.
- La allowlist de Pages está `PUBLICADA/VALIDADA EN STAGING`; continúa `PENDIENTE PRODUCTIVO` porque el repositorio de staging no reemplaza a `VirtualSoft026/riesgovirtualsoft`.
- Rules R1 puede estar `VALIDADA EN EMULATOR` y seguir `PENDIENTE PRODUCTIVO` hasta que una persona autorizada la despliegue en Firebase real.

## 4. Qué compone cada fase

Las fases agrupan objetivos y riesgos; no son ramas Git ni entornos. Una tarea puede prepararse en paralelo, pero su despliegue respeta las dependencias descritas aquí.

### 4.1 Fase 1 — cerrar exposición externa inmediata sin rediseñar el producto

Objetivo: reducir los ataques externos de mayor impacto conservando las mecánicas actuales y preparando una promoción controlada a producción.

Incluye:

- autorización Firebase por UID y rol, deny-by-default y protección BOLA/IDOR;
- mitigación de Stored XSS y sanitización segura de comunicados;
- cierre de turno con persistencia confirmada y correo no bloqueante;
- alineación de controles Admin, Supervisor y Gestor;
- retiro de credenciales embebidas y prevención de publicación accidental;
- artefacto Pages por allowlist, conservando los XLSX operativos indispensables;
- migración conservadora de permisos y logs históricos a UID;
- release limpio, pruebas aisladas, ventana productiva, smoke y rollback.

No incluye:

- rediseñar todo el frontend;
- hacer responsive completo;
- reescribir la historia Git;
- reemplazar los XLSX públicos por un backend autenticado.

Definición de terminado: cambios mínimos fusionados y publicados en producción, PATCH UID fresco aplicado, Rules R1 desplegado, smoke de roles exitoso, periodo de observación cerrado y evidencia sanitizada archivada.

Estado actual: candidato productivo limpio construido y validado con alcance focalizado; PR de staging consolidado y producción sin actualizar. Falta autorizar su commit, publicar la rama, revisar CI/PR y ejecutar la ventana productiva.

### 4.2 Fase 1.1 — adaptación responsive incremental

Objetivo: mejorar el uso en pantallas pequeñas después de estabilizar la seguridad de Fase 1.

Incluye:

- inventario de pantallas, tablas, menús y modales problemáticos;
- breakpoints y estilos responsive incrementales;
- pruebas visuales por rol y flujos críticos;
- despliegues pequeños y reversibles.

No cambia el modelo de autorización ni la fuente de datos. No bloquea Fase 1 porque la recomendación temporal es usar escritorio.

Definición de terminado: flujos priorizados utilizables en tamaños acordados, sin regresión de escritorio y con evidencia visual aprobada.

### 4.3 Fase 1.5 — saneamiento coordinado de secretos e historia

Objetivo: invalidar secretos antiguos y reducir la posibilidad de recuperarlos desde la historia Git.

Incluye:

- inventario de credenciales y dueños;
- rotación o revocación en los proveedores reales;
- confirmación de que la aplicación usa los reemplazos;
- reescritura coordinada con `git-filter-repo` cuando sea necesaria;
- limpieza de referencias y procedimiento para actualizar clones.

Esta fase se separa del release inmediato porque una reescritura de historia afecta ramas, clones, automatizaciones y coordinación del equipo. Rotar o revocar el secreto tiene prioridad sobre ocultar el commit antiguo.

Definición de terminado: secretos antiguos inválidos, historia y referencias saneadas según alcance, colaboradores sincronizados y escaneo final sin hallazgos críticos vigentes.

### 4.4 Fase 2 — rediseño de datos y arquitectura

Objetivo: eliminar las limitaciones estructurales que Fase 1 sólo puede contener.

Incluye:

- mover asignaciones, tareas, horarios y teletrabajo desde XLSX públicos a una fuente autenticada;
- modelar datos por UID y rol;
- crear importadores y validaciones de calidad;
- separar catálogo, asignación, progreso, horarios y teletrabajo;
- modularizar el frontend y reducir dependencias globales;
- eliminar correlaciones heurísticas heredadas, incluida la dependencia de logs sin vínculo estable.

Definición de terminado: datos operativos no descargables de forma anónima, reglas y API con mínima exposición, migración verificada y frontend modular con pruebas de regresión.

## 5. Flujo end-to-end de Fase 1

### Paso 0 — gobernar el cambio

Responsable principal: Por asignar.

Entradas:

- esta guía;
- inventario de fallas;
- `main` productivo vigente;
- ventana tentativa y responsables disponibles.

Salidas:

- alcance congelado de Fase 1;
- matriz de responsables;
- canal de incidentes;
- lista de autorizadores.

Criterio de salida: cada actividad tiene una persona responsable y otra que valida; no hay una misma persona autoaprobando todos los pasos productivos.

### Paso 1 — construir un release limpio

Responsable principal: Por asignar.

1. Crear una rama nueva desde el `origin/main` productivo actualizado.
2. Portar sólo las correcciones aprobadas desde el candidato.
3. Excluir `scratch/`, exports, backups, PATCH, fixtures reales y material de laboratorio.
4. Documentar cada archivo y la falla que corrige.

Salida: rama de release limpia y manifiesto de cambios.

Criterio de salida: el diff sólo contiene archivos justificados y no incluye datos privados ni cambios experimentales.

### Paso 2 — validar sin tocar producción

Responsable principal: Por asignar.

Controles mínimos:

- sintaxis y carga del frontend;
- suite Firebase Emulator por roles y propiedad UID;
- Stored XSS y comunicados;
- contrato de cierre de turno;
- guardia de red que impide llamadas al Firebase real;
- auditoría de secretos y artefacto Pages allowlist;
- regresión de Tareas, Horario, Teletrabajo y permisos.

Salida: informe sanitizado con resultados, fallas bloqueantes y riesgos aceptados.

Criterio de salida: cero vulnerabilidades críticas/altas conocidas sin decisión y cero conexiones productivas desde la suite automática.

### Paso 3 — revisar el PR productivo, sin desplegar

Responsables: Por asignarr.

El PR apunta a `VirtualSoft026/riesgovirtualsoft/main`. Abrirlo no autoriza fusionarlo.

Debe registrar:

- SHA base y SHA candidato;
- relación archivo → falla corregida;
- pruebas ejecutadas;
- riesgos aceptados;
- plan de rollback;
- cambios de uso para público no técnico.

Criterio de salida: aprobación técnica y operativa, controles verdes y ventana confirmada.

### Paso 4 — preparar la ventana productiva

Responsables: Por asignar.

1. Informar la pausa breve de nuevas sesiones, permisos y cierres.
2. Respaldar Rules R0 y estado necesario de datos.
3. Registrar el SHA y artefacto Pages productivos.
4. Recalcular PATCH y rollback con exports frescos.
5. Confirmar comandos y accesos de reversión.

Criterio de salida: respaldos verificables, delta UID-only sin ambigüedades y dos personas disponibles para ejecución/validación.

### Paso 5 — aplicar la compatibilidad de datos

Responsable principal: Por asignar.

Acción: aplicar sólo el PATCH fresco permitido sobre `permissions/*/uid` y `login_logs/*/uid`.

Validación independiente:

- no sobrescribe UID;
- no modifica nombres, correos, roles, estados ni timestamps;
- conserva excluidos ambiguos;
- segunda ejecución del planificador produce cero cambios;
- rollback exacto disponible.

Puerta de autorización: aplicar el PATCH real requiere aprobación explícita separada.

### Paso 6 — publicar el frontend compatible

Responsable principal: Operador Git/Pages.

1. Fusionar el PR productivo autorizado.
2. Esperar el workflow de Pages.
3. Comparar el hash público de `app.js` con el candidato.
4. Ejecutar smoke real mínimo con transacciones previamente acordadas.

Puerta de autorización: el permiso para abrir o aprobar el PR no equivale al permiso para fusionarlo.

### Paso 7 — desplegar Rules R1

Responsable principal: Operador Firebase Rules.

1. Confirmar proyecto objetivo y hash de R1.
2. Desplegar R1 con autorización explícita.
3. Validar Gestor, Supervisor y Admin.
4. Verificar que un Gestor no puede leer ni escribir datos de otro UID.

Puerta de autorización: el merge del frontend no autoriza el despliegue de Rules.

### Paso 8 — observar, cerrar o revertir

Responsables: Por asignar.

Observar como mínimo el primer flujo operativo completo disponible y 30 minutos sin errores críticos. Registrar `PERMISSION_DENIED`, errores JavaScript, carga de tareas, permisos, monitoreo y cierre de turno.

Si aparece un activador confirmado, ejecutar el orden de rollback del runbook. Si no aparece, cerrar el release y publicar una nota sanitizada de resultado.

## 6. Paquetes de trabajo delegables

Cada paquete puede copiarse como una tarea independiente. “Responsable” ejecuta; “validador” comprueba; “autorizador” permite una acción material.

| ID | Paquete | Responsable sugerido | Validador | Dependencia | Acción productiva |
|---|---|---|---|---|---|
| D1 | Curar rama de release | desarrollador senior | revisor técnico | alcance F1 congelado | no |
| D2 | Ejecutar QA aislado | QA de seguridad | revisor técnico | D1 | no |
| D3 | Revisar PR y plan de cambio | Release Manager | dueño de producto | D1, D2 | abrir PR solamente |
| D4 | Recalcular migración | operador de datos | QA de seguridad | ventana y export fresco | lectura real; no escritura |
| D5 | Aplicar PATCH UID | operador de datos | segundo operador | D4 aprobado | sí; autorización propia |
| D6 | Merge y Pages productivos | operador Git/Pages | validador de negocio | D3, D5 | sí; autorización propia |
| D7 | Desplegar Rules R1 | operador Firebase | QA + negocio | D6 y smoke | sí; autorización propia |
| D8 | Observar y cerrar release | soporte/observabilidad | Release Manager | D7 | rollback sólo si autorizado o emergencia acordada |
| D9 | Diseñar responsive F1.1 | frontend/UX | usuarios piloto | F1 estabilizada | no al diseñar |
| D10 | Inventariar secretos F1.5 | seguridad/DevOps | dueños de credenciales | puede prepararse en paralelo | rotación requiere coordinación |
| D11 | Diseñar arquitectura F2 | arquitecto + producto | seguridad y operaciones | requisitos operativos | no al diseñar |

### 6.1 Contrato de delegación D1 — curar rama de release

Objetivo: producir el único candidato que podrá convertirse en PR productivo.

Puede:

- crear una rama desde el `origin/main` vigente;
- portar cambios explicados;
- ejecutar pruebas locales;
- actualizar documentación del PR.

No puede:

- fusionar `staging-qa` completa;
- incluir material privado o experimental;
- hacer merge a `main`;
- desplegar Firebase.

Entregables:

- URL o nombre de rama;
- SHA base y SHA candidato;
- diff por archivo;
- manifiesto archivo → RM-ID;
- resultados de pruebas.

Aceptación: diff mínimo, trazable, sin secretos ni PII y con mecánicas centrales preservadas.

### 6.2 Contrato de delegación D2 — QA aislado

Objetivo: demostrar que el candidato bloquea ataques externos prioritarios sin romper flujos principales.

Puede usar el Emulator y datos sintéticos. No puede usar la web de staging para escrituras exploratorias ni debilitar pruebas para obtener verde.

Entregables:

- matriz rol/operación esperada/resultado;
- versión y SHA probado;
- evidencia de guardia de red;
- hallazgos clasificados como bloqueante, aceptado o deuda;
- recomendación `APTO PARA REVISIÓN` o `NO APTO`.

Aceptación: pruebas reproducibles y evidencia sin datos reales.

### 6.3 Contrato de delegación D3 — control del PR

Objetivo: convertir evidencia técnica en una decisión de negocio reversible.

Entregables:

- descripción completa del PR;
- plan minuto a minuto;
- responsables y contactos;
- criterios de continuar/detener;
- autorizaciones pendientes;
- comunicación para usuarios.

Aceptación: cualquier persona del equipo puede saber qué cambia, qué no cambia y cómo volver atrás sin depender de contexto oral.

### 6.4 Contrato de delegación D4/D5 — migración UID

Objetivo: compatibilizar historia legítima con R1 sin reinterpretar identidades ambiguas.

D4 es preparación de solo lectura y cálculo. D5 es escritura productiva; deben registrarse como tareas separadas.

Entregables D4:

- hashes de exports y respaldos;
- conteos explicados frente a la línea base;
- PATCH delta UID-only;
- rollback exacto;
- lista sanitizada de excluidos.

Aceptación D4: ninguna ruta fuera de allowlist, ningún overwrite y ninguna asignación por aproximación.

Entregables D5:

- hora, operador, hash aplicado y conteo;
- verificación de idempotencia;
- resultado del segundo operador.

Aceptación D5: aplicación exacta o rollback ejecutado según criterio preacordado.

### 6.5 Contrato de delegación D6/D7 — despliegue

Objetivo: publicar primero el cliente compatible y después la autorización reforzada.

D6 y D7 no se combinan en una autorización genérica de “hacer deploy”. Cada una registra aprobación, ejecutor, SHA/hash, hora, validación y resultado.

Aceptación D6: Pages sirve el artefacto candidato y el smoke funcional mínimo pasa.

Aceptación D7: operaciones legítimas por rol pasan y el acceso cruzado por UID falla.

### 6.6 Contrato de delegación D8 — observación

Objetivo: detectar rápidamente regresiones o exposición real y coordinar una única decisión.

Entregables:

- bitácora con hora y severidad;
- evidencia sin credenciales ni datos de terceros;
- decisión `CONTINUAR`, `OBSERVAR` o `ROLLBACK`;
- nota final de release.

Aceptación: no quedan incidentes críticos abiertos al cerrar la ventana.

## 7. Matriz RACI mínima

Leyenda: `R` ejecuta, `A` autoriza/responde por el resultado, `C` es consultado, `I` es informado.

| Actividad | Release Manager | Desarrollo | QA seguridad | Operador Firebase | Negocio/operaciones | Soporte |
|---|---|---|---|---|---|---|
| Congelar alcance | A/R | C | C | I | C | I |
| Curar release | A | R | C | I | I | I |
| QA aislado | A | C | R | C | C | I |
| Aprobar PR | A | C | C | I | C | I |
| Recalcular PATCH | A | I | C | R | I | I |
| Autorizar escritura real | A | I | C | R | C | I |
| Merge y Pages | A | R | C | I | C | I |
| Desplegar R1 | A | I | C | R | C | I |
| Smoke de negocio | A | C | C | C | R | I |
| Observar/rollback | A | C | C | R | C | R |

Una persona puede ocupar más de un rol en un equipo pequeño, pero una acción productiva debe conservar verificación independiente.

## 8. Qué se puede delegar desde ahora

Puede comenzar sin impacto productivo:

- D1: construir la rama de release limpia;
- D2: preparar y ejecutar QA aislado cuando D1 entregue un SHA;
- D3: redactar el PR y planificar la ventana, sin merge;
- D9: inventario responsive de Fase 1.1, sin mezclar cambios en Fase 1;
- D10: inventario de secretos de Fase 1.5, sin rotar ni reescribir historia todavía;
- D11: levantamiento de requisitos de Fase 2.

No debe delegarse como una tarea abierta o sin límites:

- aplicar el PATCH en Firebase real;
- fusionar a `VirtualSoft026/riesgovirtualsoft/main`;
- desplegar Rules R1;
- ejecutar pruebas mutantes libres en Pages de staging;
- borrar historia, ramas, backups o artefactos privados.

Estas acciones requieren tarea específica, objetivo, ventana, responsable, validador y autorización.

## 9. Plantilla para crear una tarea delegada

```text
TÍTULO:
FASE / PAQUETE:
OBJETIVO:

REPOSITORIO:
RAMA DE ORIGEN:
RAMA O DESTINO:
SHA BASE:

ENTRADAS:
-

ACCIONES PERMITIDAS:
-

ACCIONES NO AUTORIZADAS:
-

ENTREGABLES:
-

CRITERIOS DE ACEPTACIÓN:
-

DEPENDENCIAS:
-

RESPONSABLE:
VALIDADOR:
AUTORIZADOR PRODUCTIVO, SI APLICA:

CONDICIONES DE PARADA:
-

EVIDENCIA SANITIZADA ESPERADA:
-
```

## 10. Plantilla de entrega entre responsables

```text
PAQUETE ENTREGADO:
RESULTADO: APROBADO | APROBADO CON RIESGO | BLOQUEADO
SHA/HASH VERIFICADO:
PRUEBAS EJECUTADAS:
HALLAZGOS ABIERTOS:
RIESGOS ACEPTADOS:
SIGUIENTE PAQUETE HABILITADO:
AUTORIZACIÓN QUE AÚN FALTA:
ROLLBACK PREPARADO:
DOCUMENTACIÓN ACTUALIZADA:
```

## 11. Regla de cierre

Una fase no termina porque el código “ya esté corregido”. Termina cuando:

1. el cambio está en el repositorio y entorno correctos;
2. la validación corresponde a ese entorno;
3. las dependencias de datos y autorización están resueltas;
4. el cambio fue observado en operación;
5. el resultado y los riesgos residuales quedaron documentados.

Para Fase 1, el siguiente hito no es desplegar inmediatamente: es entregar D1, el release limpio desde el `main` productivo vigente, y usar ese SHA como única entrada de D2 y D3.
